import json
import urllib.request
from decimal import Decimal

from app.config import get_settings

_LOCAL_NAMES = {
    "sugar": "Shakar",
    "edible oil": "Tel",
    "oil": "Tel",
    "tea": "Chai",
    "rice": "Chawal",
}


def template_message(
    merchant_name: str,
    sku: str,
    discount: Decimal,
    minimum: Decimal,
    voucher: str,
) -> str:
    label = _LOCAL_NAMES.get(sku.lower(), sku)
    percent = int(discount)
    floor = int(minimum)
    return (
        f"{label} pe {percent}% chhoot! {merchant_name}. "
        f"Koi bhi kharidari ₹{floor} se upar. "
        f"Sirf Paytm App par. Voucher: {voucher}"
    )


def generate_copy(
    merchant_name: str,
    sku: str,
    discount: Decimal,
    minimum: Decimal,
    voucher: str,
) -> str:
    fallback = template_message(merchant_name, sku, discount, minimum, voucher)
    api_key = get_settings().gemini_api_key
    if not api_key:
        return fallback
    prompt = (
        "Write one Hindi-Hinglish WhatsApp line for a kirana offer. "
        f"Shop: {merchant_name}. SKU: {sku}. Discount: {int(discount)} percent. "
        f"Minimum basket: ₹{int(minimum)}. Voucher: {voucher}. "
        "Say the discount works only on the Paytm app. One sentence. No hashtags."
    )
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 80, "temperature": 0.4},
        }
    ).encode()
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        f"?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=4) as response:
            payload = json.loads(response.read().decode())
        text = payload["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text or fallback
    except Exception:
        return fallback
