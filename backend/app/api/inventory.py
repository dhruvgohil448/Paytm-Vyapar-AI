from uuid import UUID

from fastapi import APIRouter

from app.api.deps import raise_domain, session_scope
from app.errors import DomainError
from app.schemas import ForecastItem, ForecastRequest, InventoryList, RestockRequest
from app.services.forecast import forecast_sku, list_inventory, receive_stock

router = APIRouter(tags=["inventory"])


@router.post("/v1/inventory/forecast", response_model=ForecastItem)
def post_forecast(body: ForecastRequest) -> ForecastItem:
    try:
        with session_scope() as db:
            return forecast_sku(db, body.merchant_id, body.sku_name)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/inventory/restock", response_model=ForecastItem)
def post_restock(body: RestockRequest) -> ForecastItem:
    try:
        with session_scope() as db:
            return receive_stock(db, body.merchant_id, body.sku_name, body.units)
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/merchants/{merchant_id}/inventory", response_model=InventoryList)
def get_inventory(merchant_id: UUID) -> InventoryList:
    try:
        with session_scope() as db:
            return list_inventory(db, merchant_id)
    except DomainError as exc:
        raise_domain(exc)
