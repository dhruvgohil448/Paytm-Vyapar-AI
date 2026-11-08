import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.models import Loan, SettlementEntry
from app.money import D, money
from app.schemas import Ledger, LedgerEntry, RepaymentResult

OPEN_FOR_REPAYMENT = ("DISBURSED", "REPAYING")


def post_repayment(db: Session, loan_id: uuid.UUID, gross_amount: str, payment_reference: str) -> RepaymentResult:
    gross = D(gross_amount)
    if gross <= 0:
        raise DomainError(422, "gross_amount must be positive")
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).with_for_update().one_or_none()
    if loan is None:
        raise DomainError(404, "Loan not found")
    if loan.status not in OPEN_FOR_REPAYMENT:
        raise DomainError(409, "Loan is not open for repayment")
    existing = (
        db.query(SettlementEntry)
        .filter(SettlementEntry.payment_reference == payment_reference)
        .one_or_none()
    )
    if existing is not None:
        raise DomainError(409, "Payment reference already posted")

    split = D(loan.split_deduction_percentage)
    deduction = D(gross * split / D("100"))
    outstanding = D(loan.outstanding_balance)
    if deduction > outstanding:
        deduction = outstanding
    net = D(gross - deduction)
    outstanding = D(outstanding - deduction)
    loan.outstanding_balance = outstanding
    loan.status = "SETTLED" if outstanding == 0 else "REPAYING"
    entry = SettlementEntry(
        entry_id=uuid.uuid4(),
        loan_id=loan.loan_id,
        merchant_id=loan.merchant_id,
        gross_amount=gross,
        loan_deduction=deduction,
        merchant_net=net,
        payment_reference=payment_reference,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    try:
        db.flush()
    except IntegrityError as exc:
        raise DomainError(409, "Payment reference already posted") from exc
    return RepaymentResult(
        entry_id=entry.entry_id,
        loan_id=loan.loan_id,
        gross_amount=money(gross),
        loan_deduction=money(deduction),
        merchant_net=money(net),
        outstanding_balance=money(outstanding),
        status=loan.status,  # type: ignore[arg-type]
        payment_reference=payment_reference,
    )


def get_ledger(db: Session, loan_id: uuid.UUID) -> Ledger:
    loan = db.get(Loan, loan_id)
    if loan is None:
        raise DomainError(404, "Loan not found")
    rows = (
        db.query(SettlementEntry)
        .filter(SettlementEntry.loan_id == loan_id)
        .order_by(SettlementEntry.created_at.asc())
        .all()
    )
    return Ledger(
        loan_id=loan.loan_id,
        merchant_id=loan.merchant_id,
        outstanding_balance=money(loan.outstanding_balance),
        status=loan.status,  # type: ignore[arg-type]
        split_deduction_percentage=money(loan.split_deduction_percentage),
        entries=[
            LedgerEntry(
                entry_id=row.entry_id,
                gross_amount=money(row.gross_amount),
                loan_deduction=money(row.loan_deduction),
                merchant_net=money(row.merchant_net),
                payment_reference=row.payment_reference,
                created_at=row.created_at,
            )
            for row in rows
        ],
    )
