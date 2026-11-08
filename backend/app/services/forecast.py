from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.errors import DomainError
from app.models import InventoryItem, Merchant
from app.money import D, money
from app.schemas import ForecastItem, InventoryList, ReorderSuggestion

# Saturday and Sunday lift staple demand. Named dates add a second lift.
WEEKEND_MULTIPLIER = Decimal("1.20")
FESTIVALS: dict[date, tuple[str, Decimal]] = {
    date(2026, 3, 4): ("Holi", Decimal("1.15")),
    date(2026, 3, 21): ("Eid", Decimal("1.15")),
    date(2026, 8, 26): ("Janmashtami", Decimal("1.10")),
    date(2026, 10, 20): ("Dussehra", Decimal("1.15")),
    date(2026, 11, 8): ("Diwali", Decimal("1.25")),
    date(2026, 11, 15): ("Chhath", Decimal("1.10")),
}


def demand_context(on: date) -> tuple[Decimal, list[str]]:
    multiplier = Decimal("1")
    factors: list[str] = []
    if on.weekday() >= 5:
        multiplier *= WEEKEND_MULTIPLIER
        factors.append("weekend")
    festival = FESTIVALS.get(on)
    if festival:
        multiplier *= festival[1]
        factors.append(festival[0])
    if not factors:
        factors.append("baseline")
    return multiplier, factors


def units_for_runway(burn_per_day: Decimal, hours: Decimal, on: date) -> Decimal:
    """Units on hand that produce `hours` of runway after demand multipliers."""
    multiplier, _ = demand_context(on)
    return D(hours / Decimal(24) * burn_per_day * multiplier)


def alert_for(hours: Decimal) -> str:
    if hours < Decimal("24"):
        return "RED"
    if hours < Decimal("48"):
        return "YELLOW"
    return "GREEN"


def _project(item: InventoryItem, now: datetime, *, persist: bool) -> ForecastItem:
    on = now.astimezone(timezone.utc).date()
    multiplier, factors = demand_context(on)
    burn = D(item.burn_rate_units_per_day)
    units = D(item.estimated_units_remaining)
    effective = D(burn * multiplier)
    if effective == 0:
        hours = D("9999")
    else:
        hours = D(units / (burn * multiplier) * Decimal(24))
    seconds = int((hours * Decimal(3600)).to_integral_value())
    stockout = now + timedelta(seconds=seconds)
    if persist:
        item.projected_stockout_timestamp = stockout
    reorder_units = D(effective * Decimal(7))
    reorder_cost = D(reorder_units * D(item.restock_cost_per_unit))
    return ForecastItem(
        inventory_id=item.inventory_id,
        merchant_id=item.merchant_id,
        sku_name=item.sku_name,
        estimated_units_remaining=money(units),
        burn_rate_units_per_day=money(burn),
        effective_burn_rate_units_per_day=money(effective),
        runway_hours=money(hours),
        alert=alert_for(hours),  # type: ignore[arg-type]
        projected_stockout_timestamp=stockout,
        restock_cost_per_unit=money(item.restock_cost_per_unit),
        demand_factors=factors,
        reorder=ReorderSuggestion(sku_name=item.sku_name, units=money(reorder_units), cost=money(reorder_cost)),
    )


def receive_stock(db: Session, merchant_id, sku_name: str, units: str, now: datetime | None = None) -> ForecastItem:
    """Add delivered units and forecast again so the runway and alert move with the shelf."""
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    item = (
        db.query(InventoryItem)
        .filter(InventoryItem.merchant_id == merchant_id, InventoryItem.sku_name == sku_name)
        .one_or_none()
    )
    if item is None:
        raise DomainError(404, "SKU not found")
    added = D(units)
    if added <= 0:
        raise DomainError(400, "Restock units must be greater than zero")
    item.estimated_units_remaining = D(item.estimated_units_remaining + added)
    return _project(item, now or datetime.now(timezone.utc), persist=True)


def forecast_sku(db: Session, merchant_id, sku_name: str, now: datetime | None = None) -> ForecastItem:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    item = (
        db.query(InventoryItem)
        .filter(InventoryItem.merchant_id == merchant_id, InventoryItem.sku_name == sku_name)
        .one_or_none()
    )
    if item is None:
        raise DomainError(404, "SKU not found")
    return _project(item, now or datetime.now(timezone.utc), persist=True)


def list_inventory(db: Session, merchant_id, now: datetime | None = None) -> InventoryList:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    moment = now or datetime.now(timezone.utc)
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.merchant_id == merchant_id)
        .order_by(InventoryItem.sku_name)
        .all()
    )
    return InventoryList(
        merchant_id=merchant_id,
        items=[_project(item, moment, persist=False) for item in items],
    )


def week_restock_cost(db: Session, merchant_id, sku_name: str, now: datetime | None = None) -> Decimal:
    projected = forecast_sku(db, merchant_id, sku_name, now)
    return D(projected.reorder.cost)
