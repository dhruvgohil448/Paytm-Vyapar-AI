from uuid import UUID

from fastapi import APIRouter

from app.api.deps import raise_domain, session_scope
from app.errors import DomainError
from app.redis_client import redis_client
from app.schemas import BroadcastRequest, BroadcastResult, CampaignCreate, CampaignOut, WebhookAck, WhatsAppWebhook
from app.services.campaigns import broadcast_campaign, create_campaign, get_campaign, interpret, latest_campaign

router = APIRouter(tags=["whatsapp"])


@router.post("/v1/webhooks/whatsapp", response_model=WebhookAck)
def ingest_webhook(body: WhatsAppWebhook) -> WebhookAck:
    message = body.entry[0].changes[0].value.messages[0]
    text = message.text.body if message.text else None
    return WebhookAck(
        status="accepted",
        message_id=message.id,
        from_phone=message.from_phone,
        kind=message.type,
        interpretation=interpret(message.type, text),  # type: ignore[arg-type]
    )


@router.post("/v1/campaigns", response_model=CampaignOut)
def post_campaign(body: CampaignCreate) -> CampaignOut:
    try:
        with session_scope() as db:
            return create_campaign(
                db,
                body.merchant_id,
                body.featured_sku,
                body.discount_percentage,
                body.minimum_order_value,
            )
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/campaigns/{campaign_id}", response_model=CampaignOut)
def read_campaign(campaign_id: UUID) -> CampaignOut:
    try:
        with session_scope() as db:
            return get_campaign(db, campaign_id)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/campaigns/{campaign_id}/broadcast", response_model=BroadcastResult)
def post_broadcast(campaign_id: UUID, body: BroadcastRequest) -> BroadcastResult:
    del body
    try:
        with session_scope() as db:
            return broadcast_campaign(db, redis_client, campaign_id)
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/merchants/{merchant_id}/campaigns/latest", response_model=CampaignOut)
def read_latest(merchant_id: UUID) -> CampaignOut:
    try:
        with session_scope() as db:
            return latest_campaign(db, merchant_id)
    except DomainError as exc:
        raise_domain(exc)
