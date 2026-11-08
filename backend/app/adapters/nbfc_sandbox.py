from decimal import Decimal

from app.models import Distributor
from app.money import D


def escrow_reference(loan_id) -> str:
    return f"ESC-{loan_id.hex[:12].upper()}"


def credit_escrow(distributor: Distributor, loan_id, amount: Decimal) -> str:
    """Sandbox NBFC disbursement. Funds land in the distributor escrow, not the merchant wallet."""
    distributor.escrow_balance = D(D(distributor.escrow_balance) + D(amount))
    return escrow_reference(loan_id)
