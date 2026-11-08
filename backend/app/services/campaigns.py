import re
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from redis import Redis
from sqlalchemy.orm import Session

from app.adapters.llm_sandbox import generate_copy
from app.adapters.whatsapp_sandbox import build_broadcast
from app.errors import DomainError
from app.models import Broadcast, Campaign, Customer, Merchant
from app.money import D, money, paise
from app.schemas import BroadcastResult, CampaignOut
from app.services.deeplink import build_link, canonical, fresh_nonce, seconds_now, sign_canonical

CAP = 2
WINDOW = timedelta(days=7)
STOCK_WORDS = ("stock", "khatam", "shakar", "sugar", "tel", "oil", "kam")


def campaign_out(campaign: Campaign) -> CampaignOut:
    return CampaignOut(
        campaign_id=campaign.campaign_id,
        merchant_id=campaign.merchant_id,
        featured_sku=campaign.featured_sku,
        discount_percentage=money(campaign.discount_percentage),
        minimum_order_value=money(campaign.minimum_order_value),
        whatsapp_broadcast_message=campaign.whatsapp_broadcast_message,
        redemption_passcode=campaign.redemption_passcode,
        active_until=campaign.active_until,
        total_redemptions=campaign.total_redemptions,
    )


def interpret(kind: str, text: str | None) -> str:
    if kind != "text" or not text:
        return "note"
    lowered = text.lower()
    if any(word in lowered for word in STOCK_WORDS):
        return "stock_alert"
    return "note"


def _passcode(db: Session, sku: str, discount: Decimal) -> str:
    stem = re.sub(r"[^A-Z0-9]", "", sku.upper())[:12] or "OFFER"
    percent = int(D(discount).to_integral_value())
    base = f"{stem}{percent}"[:32]
    candidate = base
    suffix = 2
    while db.query(Campaign).filter(Campaign.redemption_passcode == candidate).first():
        extra = str(suffix)
        candidate = f"{base[: 32 - len(extra)]}{extra}"
        suffix += 1
    return candidate


def create_campaign(
    db: Session,
    merchant_id: uuid.UUID,
    featured_sku: str,
    discount_percentage: str,
    minimum_order_value: str,
) -> CampaignOut:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    discount = D(discount_percentage)
    minimum = D(minimum_order_value)
    if discount <= 0 or discount > Decimal("90"):
        raise DomainError(422, "discount_percentage must be between 0.01 and 90.00")
    voucher = _passcode(db, featured_sku, discount)
    now = datetime.now(timezone.utc)
    message = generate_copy(merchant.business_name, featured_sku, discount, minimum, voucher)
    campaign = Campaign(
        campaign_id=uuid.uuid4(),
        merchant_id=merchant.merchant_id,
        featured_sku=featured_sku,
        discount_percentage=discount,
        minimum_order_value=minimum,
        whatsapp_broadcast_message=message,
        redemption_passcode=voucher,
        active_until=now + WINDOW,
        total_redemptions=0,
        created_at=now,
    )
    db.add(campaign)
    db.flush()
    return campaign_out(campaign)


def get_campaign(db: Session, campaign_id: uuid.UUID) -> CampaignOut:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise DomainError(404, "Campaign not found")
    return campaign_out(campaign)


def latest_campaign(db: Session, merchant_id: uuid.UUID) -> CampaignOut:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    campaign = (
        db.query(Campaign)
        .filter(Campaign.merchant_id == merchant_id)
        .order_by(Campaign.created_at.desc())
        .first()
    )
    if campaign is None:
        raise DomainError(404, "Campaign not found")
    return campaign_out(campaign)


def broadcast_campaign(db: Session, redis: Redis, campaign_id: uuid.UUID) -> BroadcastResult:
    campaign = db.query(Campaign).filter(Campaign.campaign_id == campaign_id).with_for_update().one_or_none()
    if campaign is None:
        raise DomainError(404, "Campaign not found")
    merchant = db.get(Merchant, campaign.merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    since = datetime.now(timezone.utc) - WINDOW
    sent = (
        db.query(Broadcast)
        .filter(Broadcast.merchant_id == merchant.merchant_id, Broadcast.sent_at >= since)
        .count()
    )
    if sent >= CAP:
        raise DomainError(429, "Broadcast frequency cap reached: 2 per 7 days")
    phones = [
        row.phone_number
        for row in db.query(Customer)
        .filter(Customer.merchant_id == merchant.merchant_id, Customer.opted_in.is_(True))
        .all()
    ]
    if not phones:
        raise DomainError(409, "No opted-in customers")
    now = datetime.now(timezone.utc)
    ts = seconds_now()
    nonce = fresh_nonce()
    amount_paise = paise(campaign.minimum_order_value)
    signature = sign_canonical(canonical(merchant.merchant_id, amount_paise, campaign.redemption_passcode, ts, nonce))
    link = build_link(merchant.slug, campaign.redemption_passcode, amount_paise, ts, nonce, signature)
    payload = build_broadcast(phones, campaign.whatsapp_broadcast_message, link)
    # The sandbox payload is the message that would be posted to Meta. Keep the
    # signed link in Redis for a short trace without calling the live API.
    redis.set(f"whatsapp:broadcast:{campaign.campaign_id}:{ts}", payload["text"]["body"], ex=3600)
    row = Broadcast(
        broadcast_id=uuid.uuid4(),
        campaign_id=campaign.campaign_id,
        merchant_id=merchant.merchant_id,
        recipient_count=payload["recipient_count"],
        sent_at=now,
    )
    db.add(row)
    db.flush()
    return BroadcastResult(
        broadcast_id=row.broadcast_id,
        campaign_id=campaign.campaign_id,
        recipient_count=row.recipient_count,
        whatsapp_broadcast_message=campaign.whatsapp_broadcast_message,
        pay_link=link,
        sent_at=now,
    )
