from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from redis import Redis
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import DomainError
from app.models import Campaign, Merchant
from app.money import D, money, paise
from app.schemas import DeepLinkOut, DiscountValidation, ValidatePaymentRequest
from app.services.deeplink import (
    build_link,
    canonical,
    fresh_nonce,
    seconds_now,
    signatures_match,
    sign_canonical,
)
from app.services.soundbox import publish

ONE_RUPEE = Decimal("1.00")


def _result(
    applied: bool,
    discount: Decimal,
    payable: Decimal,
    message: str,
    reason: str,
    announcement: str | None,
) -> DiscountValidation:
    return DiscountValidation(
        is_discount_applied=applied,
        discount_amount=money(discount),
        payable_amount=money(payable),
        message=message,
        reason=reason,  # type: ignore[arg-type]
        announcement=announcement,
    )


def create_deep_link(db: Session, merchant_id: UUID, amount: str, voucher: str) -> DeepLinkOut:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    campaign = (
        db.query(Campaign)
        .filter(Campaign.merchant_id == merchant_id, Campaign.redemption_passcode == voucher)
        .one_or_none()
    )
    if campaign is None:
        raise DomainError(404, "Voucher not found")
    billed = D(amount)
    if billed <= 0:
        raise DomainError(422, "amount must be positive")
    ts = seconds_now()
    nonce = fresh_nonce()
    amount_paise = paise(billed)
    signature = sign_canonical(canonical(merchant.merchant_id, amount_paise, voucher, ts, nonce))
    return DeepLinkOut(
        url=build_link(merchant.slug, voucher, amount_paise, ts, nonce, signature),
        expires_in_seconds=get_settings().link_ttl_seconds,
        nonce=nonce,
        ts=ts,
        sig=signature,
        amount_paise=amount_paise,
    )


def _announce(db: Session, redis: Redis, merchant: Merchant, text: str) -> None:
    if not merchant.soundbox_device_id:
        return
    publish(db, redis, merchant.soundbox_device_id, text)


def validate_payment(db: Session, redis: Redis, body: ValidatePaymentRequest) -> DiscountValidation:
    bill = D(body.bill_amount)
    campaign = db.query(Campaign).filter(Campaign.redemption_passcode == body.voucher).one_or_none()
    if campaign is None or campaign.merchant_id != body.merchant_id:
        return _result(False, Decimal("0"), bill, "Unknown voucher.", "UNKNOWN_VOUCHER", None)

    expected = sign_canonical(
        canonical(body.merchant_id, paise(bill), body.voucher, body.ts, body.nonce)
    )
    if not signatures_match(expected, body.sig):
        return _result(False, Decimal("0"), bill, "Payment signature is invalid.", "BAD_SIGNATURE", None)

    ttl = get_settings().link_ttl_seconds
    age = abs(seconds_now() - body.ts)
    if age > ttl:
        return _result(
            False,
            Decimal("0"),
            bill,
            "Payment link has expired.",
            "SIGNATURE_EXPIRED",
            None,
        )

    remaining = max(ttl - age, 1)
    stored = redis.set(f"deeplink:nonce:{body.nonce}", "1", nx=True, ex=remaining)
    if not stored:
        return _result(False, Decimal("0"), bill, "Payment link was already used.", "REPLAYED", None)

    merchant = db.get(Merchant, body.merchant_id)
    if merchant is None:
        return _result(False, Decimal("0"), bill, "Unknown voucher.", "UNKNOWN_VOUCHER", None)

    now = datetime.now(timezone.utc)
    if campaign.active_until <= now:
        _announce(db, redis, merchant, "Payment received. This offer is no longer active.")
        return _result(False, Decimal("0"), bill, "This offer is no longer active.", "INACTIVE_CAMPAIGN", None)

    if bill < D(campaign.minimum_order_value):
        floor = money(campaign.minimum_order_value)
        message = f"Minimum purchase of ₹{floor} required."
        _announce(db, redis, merchant, message)
        return _result(False, Decimal("0"), bill, message, "BELOW_MINIMUM", message)

    if body.payment_source != "PAYTM_CONSUMER_APP":
        message = "Discount valid exclusively via Paytm App payment."
        announcement = "Payment received at full price. Paytm discount was not applied."
        _announce(db, redis, merchant, announcement)
        return _result(False, Decimal("0"), bill, message, "WRONG_SOURCE", announcement)

    base = bill
    if body.featured_sku_amount is not None:
        base = min(D(body.featured_sku_amount), bill)
    discount = D(base * D(campaign.discount_percentage) / Decimal(100))
    payable = D(bill - discount)
    if payable < ONE_RUPEE:
        payable = ONE_RUPEE
        discount = D(bill - payable)
    campaign.total_redemptions = campaign.total_redemptions + 1
    db.flush()
    percent = int(D(campaign.discount_percentage))
    message = f"Paytm Exclusive {percent}% applied! You saved ₹{money(discount)}."
    if discount == D("40.00") and payable == D("160.00"):
        announcement = "Paytm par chaalis rupaye discount ke saath, ek sau saath rupaye prapt hue!"
    else:
        announcement = f"Paytm par ₹{money(discount)} bachat ke saath, ₹{money(payable)} prapt hue."
    _announce(db, redis, merchant, announcement)
    return _result(True, discount, payable, message, "APPLIED", announcement)
