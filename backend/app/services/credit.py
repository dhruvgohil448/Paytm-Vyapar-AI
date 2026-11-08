import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.adapters.nbfc_sandbox import credit_escrow, escrow_reference
from app.demo_ids import DISTRIBUTOR_ID
from app.errors import DomainError
from app.models import Distributor, InventoryItem, Loan, Merchant, SettlementEntry
from app.money import D, money
from app.schemas import CreditOffer, CreditQuote, Disbursement
from app.services.forecast import week_restock_cost
from app.shelf import SHELF_PRICE

ANNUAL_RATE = Decimal("58.40")
DEFAULT_SPLIT = Decimal("15.00")
GMV_FRACTION = Decimal("0.15")
ACTIVE = ("PENDING", "DISBURSED", "REPAYING")


def interest_per_day(principal: Decimal, annual_rate: Decimal) -> Decimal:
    return D(D(principal) * D(annual_rate) / Decimal(100) / Decimal(365))


def _offer_from_loan(loan: Loan, distributor: Distributor, sku_name: str) -> CreditOffer:
    return CreditOffer(
        loan_id=loan.loan_id,
        merchant_id=loan.merchant_id,
        sku_name=sku_name,
        principal_amount=money(loan.principal_amount),
        interest_rate_annual=money(loan.interest_rate_annual),
        interest_per_day=money(interest_per_day(loan.principal_amount, loan.interest_rate_annual)),
        distributor_id=distributor.distributor_id,
        distributor_name=distributor.name,
        split_deduction_percentage=money(loan.split_deduction_percentage),
        status=loan.status,  # type: ignore[arg-type]
        outstanding_balance=money(loan.outstanding_balance),
    )


def _sales_30d(db: Session, merchant: Merchant) -> Decimal:
    collected = (
        db.query(func.coalesce(func.sum(SettlementEntry.gross_amount), 0))
        .filter(SettlementEntry.merchant_id == merchant.merchant_id)
        .scalar()
    )
    return D(D(merchant.recent_gmv_30d) + D(collected))


def _shelf_assets(db: Session, merchant_id: uuid.UUID) -> Decimal:
    items = db.query(InventoryItem).filter(InventoryItem.merchant_id == merchant_id).all()
    total = Decimal("0")
    for item in items:
        price = SHELF_PRICE.get(item.sku_name, D(item.restock_cost_per_unit))
        total += D(item.estimated_units_remaining) * D(price)
    return D(total)


def quote_credit(
    db: Session,
    merchant_id: uuid.UUID,
    sku_name: str,
    purchase_amount: str | None = None,
) -> CreditQuote:
    """Size a Paytm restock loan from sales, shelf assets, and this purchase."""
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

    if purchase_amount is None:
        purchase = week_restock_cost(db, merchant_id, sku_name)
    else:
        purchase = D(purchase_amount)
        if purchase <= 0:
            raise DomainError(422, "Purchase amount must be greater than zero")

    sales = _sales_30d(db, merchant)
    sales_limit = D(sales * GMV_FRACTION)
    assets = _shelf_assets(db, merchant_id)
    preapproved = D(merchant.max_preapproved_limit)
    limits = (
        ("purchase", purchase),
        ("assets", assets),
        ("sales", sales_limit),
        ("preapproved", preapproved),
    )
    factor, suggested = min(limits, key=lambda pair: pair[1])
    return CreditQuote(
        merchant_id=merchant.merchant_id,
        sku_name=sku_name,
        sales_30d=money(sales),
        sales_limit=money(sales_limit),
        asset_value=money(assets),
        purchase_amount=money(purchase),
        preapproved_limit=money(preapproved),
        suggested_amount=money(suggested),
        limiting_factor=factor,  # type: ignore[arg-type]
    )


def create_offer(
    db: Session,
    merchant_id: uuid.UUID,
    sku_name: str,
    purchase_amount: str | None = None,
) -> CreditOffer:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    existing = (
        db.query(Loan)
        .filter(Loan.merchant_id == merchant_id, Loan.status.in_(ACTIVE))
        .order_by(Loan.created_at.desc())
        .first()
    )
    if existing is not None:
        distributor = db.get(Distributor, existing.distributor_id)
        if distributor is None:
            raise DomainError(404, "Distributor not found")
        return _offer_from_loan(existing, distributor, sku_name)
    distributor = db.get(Distributor, DISTRIBUTOR_ID)
    if distributor is None:
        raise DomainError(404, "Distributor not found")

    assessed = quote_credit(db, merchant_id, sku_name, purchase_amount)
    principal = D(assessed.suggested_amount)
    if principal <= 0:
        raise DomainError(422, "No pre-approved limit is available")
    now = datetime.now(timezone.utc)
    loan = Loan(
        loan_id=uuid.uuid4(),
        merchant_id=merchant.merchant_id,
        principal_amount=principal,
        interest_rate_annual=ANNUAL_RATE,
        distributor_id=distributor.distributor_id,
        status="PENDING",
        split_deduction_percentage=DEFAULT_SPLIT,
        outstanding_balance=principal,
        disbursed_at=None,
        created_at=now,
    )
    db.add(loan)
    db.flush()
    return _offer_from_loan(loan, distributor, sku_name)


def accept_loan(db: Session, loan_id: uuid.UUID, merchant_id: uuid.UUID) -> Disbursement:
    loan = db.get(Loan, loan_id)
    if loan is None:
        raise DomainError(404, "Loan not found")
    if loan.merchant_id != merchant_id:
        raise DomainError(409, "Loan does not belong to this merchant")
    if loan.status != "PENDING":
        raise DomainError(409, "Loan is not pending")
    distributor = db.get(Distributor, loan.distributor_id)
    if distributor is None:
        raise DomainError(404, "Distributor not found")
    now = datetime.now(timezone.utc)
    reference = credit_escrow(distributor, loan.loan_id, D(loan.principal_amount))
    loan.status = "DISBURSED"
    loan.disbursed_at = now
    loan.outstanding_balance = D(loan.principal_amount)
    db.flush()
    return Disbursement(
        loan_id=loan.loan_id,
        status="DISBURSED",
        distributor_id=distributor.distributor_id,
        distributor_name=distributor.name,
        escrow_reference=reference,
        escrow_balance=money(distributor.escrow_balance),
        outstanding_balance=money(loan.outstanding_balance),
        disbursed_at=now,
    )


def reference_for(loan_id: uuid.UUID) -> str:
    return escrow_reference(loan_id)
