from uuid import UUID

from fastapi import APIRouter

from app.api.deps import raise_domain, session_scope
from app.errors import DomainError
from app.schemas import (
    AcceptLoanRequest,
    CreditOffer,
    CreditQuote,
    Disbursement,
    Ledger,
    OfferRequest,
    RepaymentRequest,
    RepaymentResult,
)
from app.services.credit import accept_loan, create_offer, quote_credit
from app.services.settlement import get_ledger, post_repayment

router = APIRouter(tags=["nbfc"])


@router.post("/v1/credit/quote", response_model=CreditQuote)
def post_quote(body: OfferRequest) -> CreditQuote:
    try:
        with session_scope() as db:
            return quote_credit(db, body.merchant_id, body.sku_name, body.purchase_amount)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/credit/offers", response_model=CreditOffer)
def post_offer(body: OfferRequest) -> CreditOffer:
    try:
        with session_scope() as db:
            return create_offer(db, body.merchant_id, body.sku_name, body.purchase_amount)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/credit/loans/{loan_id}/accept", response_model=Disbursement)
def post_accept(loan_id: UUID, body: AcceptLoanRequest) -> Disbursement:
    try:
        with session_scope() as db:
            return accept_loan(db, loan_id, body.merchant_id)
    except DomainError as exc:
        raise_domain(exc)


@router.post("/v1/nbfc/repayments", response_model=RepaymentResult)
def post_split(body: RepaymentRequest) -> RepaymentResult:
    try:
        with session_scope() as db:
            return post_repayment(db, body.loan_id, body.gross_amount, body.payment_reference)
    except DomainError as exc:
        raise_domain(exc)


@router.get("/v1/loans/{loan_id}/ledger", response_model=Ledger)
def read_ledger(loan_id: UUID) -> Ledger:
    try:
        with session_scope() as db:
            return get_ledger(db, loan_id)
    except DomainError as exc:
        raise_domain(exc)
