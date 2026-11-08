from decimal import Decimal, ROUND_HALF_UP

TWOPLACES = Decimal("0.01")
PAISE = Decimal("1")


def D(value: Decimal | str | int) -> Decimal:
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def money(value: Decimal | str | int) -> str:
    return f"{D(value):.2f}"


def paise(value: Decimal | str | int) -> int:
    quantized = (D(value) * 100).quantize(PAISE, rounding=ROUND_HALF_UP)
    return int(quantized)
