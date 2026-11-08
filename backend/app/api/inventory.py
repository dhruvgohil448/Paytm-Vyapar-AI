from uuid import UUID

from fastapi import APIRouter

from app.api.deps import raise_domain, session_scope
from app.errors import DomainError
from app.schemas import ForecastItem, ForecastRequest, InventoryList
from app.services.forecast import forecast_sku, list_inventory

router = APIRouter(tags=["inventory"])


@router.post("/v1/inventory/forecast", response_model=ForecastItem)
def post_forecast(body: ForecastRequest) -> ForecastItem:
    try:
        with session_scope() as db:
            return forecast_sku(db, body.merchant_id, body.sku_name)
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/merchants/{merchant_id}/inventory", response_model=InventoryList)
def get_inventory(merchant_id: UUID) -> InventoryList:
    try:
        with session_scope() as db:
            return list_inventory(db, merchant_id)
    except DomainError as exc:
        raise_domain(exc)
