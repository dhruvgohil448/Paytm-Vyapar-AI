import hashlib
import hmac
import secrets
import time
from urllib.parse import urlencode
from uuid import UUID

from app.config import get_settings


def canonical(merchant_id: UUID, amount_paise: int, voucher: str, ts: int, nonce: str) -> str:
    return f"{merchant_id}|{amount_paise}|{voucher}|{ts}|{nonce}"


def sign_canonical(payload: str, secret: str | None = None) -> str:
    key = (secret if secret is not None else get_settings().paytm_link_secret).encode()
    return hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()


def signatures_match(expected: str, provided: str) -> bool:
    if len(expected) != len(provided):
        return False
    return hmac.compare_digest(expected, provided)


def fresh_nonce() -> str:
    return secrets.token_hex(16)


def build_link(slug: str, voucher: str, amount_paise: int, ts: int, nonce: str, sig: str) -> str:
    query = urlencode(
        {
            "voucher": voucher,
            "amount": str(amount_paise),
            "ts": str(ts),
            "nonce": nonce,
            "sig": sig,
        }
    )
    return f"https://paytm.local/pay/{slug}?{query}"


def seconds_now() -> int:
    return int(time.time())
