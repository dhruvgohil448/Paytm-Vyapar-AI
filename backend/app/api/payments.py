from fastapi import APIRouter

from app.api.deps import raise_domain, session_scope
from app.errors import DomainError
from app.redis_client import redis_client
from app.schemas import DeepLinkOut, DeepLinkRequest, DiscountValidation, SoundboxState, ValidatePaymentRequest
from app.services.payments import create_deep_link, validate_payment
from app.services.soundbox import read_state

router = APIRouter(tags=["payments"])


@router.post("/v1/payments/deep-links", response_model=DeepLinkOut)
def post_deep_link(body: DeepLinkRequest) -> DeepLinkOut:
    try:
        with session_scope() as db:
            return create_deep_link(db, body.merchant_id, body.amount, body.voucher)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/payments/validate", response_model=DiscountValidation)
def post_validate(body: ValidatePaymentRequest) -> DiscountValidation:
    try:
        with session_scope() as db:
            return validate_payment(db, redis_client, body)
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/soundbox/{device_id}/state", response_model=SoundboxState)
def get_soundbox(device_id: str) -> SoundboxState:
    try:
        with session_scope() as db:
            return read_state(db, redis_client, device_id)
    except DomainError as exc:
        raise_domain(exc)
