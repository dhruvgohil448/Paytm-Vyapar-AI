import time
from decimal import Decimal
from uuid import UUID

from app.demo_ids import RAMESH_DEVICE_ID, RAMESH_MERCHANT_ID, SUGAR_SKU
from app.services.deeplink import canonical, sign_canonical

MERCHANT = RAMESH_MERCHANT_ID


def campaign(client, sku: str = "Sugar") -> dict:
    response = client.post(
        "/v1/campaigns",
        json={
            "merchant_id": MERCHANT,
            "featured_sku": sku,
            "discount_percentage": "40.00",
            "minimum_order_value": "200.00",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def deep_link(client, voucher: str, amount: str = "200.00") -> dict:
    response = client.post(
        "/v1/payments/deep-links",
        json={"merchant_id": MERCHANT, "amount": amount, "voucher": voucher},
    )
    assert response.status_code == 200, response.text
    return response.json()


def validate(client, voucher: str, link: dict, **overrides) -> dict:
    body = {
        "merchant_id": MERCHANT,
        "bill_amount": "200.00",
        "featured_sku_amount": "100.00",
        "voucher": voucher,
        "payment_source": "PAYTM_CONSUMER_APP",
        "ts": link["ts"],
        "nonce": link["nonce"],
        "sig": link["sig"],
    }
    body.update(overrides)
    response = client.post("/v1/payments/validate", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_rejects_unknown_json_fields(client):
    response = client.post(
        "/v1/inventory/forecast",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU, "unexpected": True},
    )
    assert response.status_code == 422


def test_sugar_forecast_is_red(client):
    response = client.post(
        "/v1/inventory/forecast",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["alert"] == "RED"
    assert Decimal(body["runway_hours"]) < Decimal("24")
    radar = client.get(f"/v1/merchants/{MERCHANT}/inventory")
    assert radar.status_code == 200
    items = radar.json()["items"]
    assert len(items) == 15
    sugar = next(item for item in items if item["sku_name"] == SUGAR_SKU)
    assert sugar["alert"] == "RED"
    assert {item["alert"] for item in items} == {"RED", "YELLOW", "GREEN"}


def test_restock_adds_units_and_clears_the_red_alert(client):
    before = client.post(
        "/v1/inventory/forecast",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU},
    )
    assert before.status_code == 200, before.text
    starting = Decimal(before.json()["estimated_units_remaining"])
    added = Decimal("200.00")
    response = client.post(
        "/v1/inventory/restock",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU, "units": "200.00"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert Decimal(body["estimated_units_remaining"]) == starting + added
    assert body["alert"] == "GREEN"
    assert Decimal(body["runway_hours"]) >= Decimal("48")
    radar = client.get(f"/v1/merchants/{MERCHANT}/inventory")
    sugar = next(item for item in radar.json()["items"] if item["sku_name"] == SUGAR_SKU)
    assert sugar["alert"] == "GREEN"
    assert Decimal(sugar["estimated_units_remaining"]) == starting + added


def _daily_interest(principal: str) -> str:
    value = (Decimal(principal) * Decimal("58.40") / Decimal("100") / Decimal("365")).quantize(Decimal("0.01"))
    return f"{value:.2f}"


def test_credit_quote_uses_sales_assets_and_purchase(client):
    forecast = client.post(
        "/v1/inventory/forecast",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU},
    )
    assert forecast.status_code == 200, forecast.text
    quote = client.post("/v1/credit/quote", json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU})
    assert quote.status_code == 200, quote.text
    body = quote.json()
    assert body["sales_30d"] == "120000.00"
    assert body["sales_limit"] == "18000.00"
    assert body["preapproved_limit"] == "15000.00"
    assert body["purchase_amount"] == forecast.json()["reorder"]["cost"]
    assert Decimal(body["asset_value"]) > 0
    suggested = min(
        Decimal(body["purchase_amount"]),
        Decimal(body["asset_value"]),
        Decimal(body["sales_limit"]),
        Decimal(body["preapproved_limit"]),
    )
    assert Decimal(body["suggested_amount"]) == suggested
    small = client.post(
        "/v1/credit/quote",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU, "purchase_amount": "400.00"},
    )
    assert small.status_code == 200, small.text
    assert small.json()["suggested_amount"] == "400.00"
    assert small.json()["limiting_factor"] == "purchase"
    offer = client.post(
        "/v1/credit/offers",
        json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU, "purchase_amount": "400.00"},
    )
    assert offer.status_code == 200, offer.text
    assert offer.json()["principal_amount"] == "400.00"
    again = client.post(
        "/v1/credit/offers",
        json={"merchant_id": MERCHANT, "sku_name": "Tea", "purchase_amount": "9000.00"},
    )
    assert again.json()["principal_amount"] == "400.00"
    assert again.json()["loan_id"] == offer.json()["loan_id"]


def test_accept_loan_disburses_to_distributor(client):
    offer = client.post("/v1/credit/offers", json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU})
    assert offer.status_code == 200, offer.text
    offered = offer.json()
    assert Decimal(offered["principal_amount"]) > 0
    assert offered["interest_per_day"] == _daily_interest(offered["principal_amount"])
    assert offered["status"] == "PENDING"
    accepted = client.post(
        f"/v1/credit/loans/{offered['loan_id']}/accept",
        json={"merchant_id": MERCHANT},
    )
    assert accepted.status_code == 200, accepted.text
    body = accepted.json()
    assert body["status"] == "DISBURSED"
    assert body["distributor_id"] == "DIST-DADAR-SUPER"
    assert body["distributor_name"] == "Dadar Super Stockist"
    assert body["escrow_reference"].startswith("ESC-")
    assert Decimal(body["escrow_balance"]) >= Decimal(offered["principal_amount"])
    assert body["outstanding_balance"] == offered["principal_amount"]


def test_split_settlement_is_fifteen_eighty_five(client):
    offer = client.post("/v1/credit/offers", json={"merchant_id": MERCHANT, "sku_name": SUGAR_SKU}).json()
    assert client.post(
        f"/v1/credit/loans/{offer['loan_id']}/accept",
        json={"merchant_id": MERCHANT},
    ).status_code == 200
    posted = client.post(
        "/v1/nbfc/repayments",
        json={"loan_id": offer["loan_id"], "gross_amount": "160.00", "payment_reference": "pay-demo-1"},
    )
    assert posted.status_code == 200, posted.text
    body = posted.json()
    assert body["loan_deduction"] == "24.00"
    assert body["merchant_net"] == "136.00"
    assert body["outstanding_balance"] == f"{(Decimal(offer['principal_amount']) - Decimal('24.00')):.2f}"
    assert body["status"] == "REPAYING"
    ledger = client.get(f"/v1/loans/{offer['loan_id']}/ledger")
    assert ledger.status_code == 200
    entry = ledger.json()["entries"][0]
    assert entry["loan_deduction"] == "24.00"
    assert entry["merchant_net"] == "136.00"


def test_paytm_deep_link_applies_sugar_discount(client):
    created = campaign(client)
    link = deep_link(client, created["redemption_passcode"])
    assert link["expires_in_seconds"] == 120
    assert link["amount_paise"] == 20000
    assert "sig=" in link["url"]
    result = validate(client, created["redemption_passcode"], link)
    assert result["is_discount_applied"] is True
    assert result["reason"] == "APPLIED"
    assert result["discount_amount"] == "40.00"
    assert result["payable_amount"] == "160.00"
    assert "chaalis rupaye" in result["announcement"]
    soundbox = client.get(f"/v1/soundbox/{RAMESH_DEVICE_ID}/state")
    assert soundbox.status_code == 200
    assert "chaalis rupaye" in soundbox.json()["last_announcement"]


def test_expired_timestamp_is_rejected(client):
    created = campaign(client)
    voucher = created["redemption_passcode"]
    merchant_id = UUID(MERCHANT)
    now = int(time.time())
    for offset, nonce in ((-121, "expirednonce0001"), (121, "future0nonce0001")):
        ts = now + offset
        signature = sign_canonical(canonical(merchant_id, 20000, voucher, ts, nonce))
        result = validate(client, voucher, {"ts": ts, "nonce": nonce, "sig": signature})
        assert result["is_discount_applied"] is False
        assert result["reason"] == "SIGNATURE_EXPIRED"
        assert result["payable_amount"] == "200.00"


def test_bad_signature_is_rejected(client):
    created = campaign(client)
    link = deep_link(client, created["redemption_passcode"])
    last = "0" if link["sig"][-1] != "0" else "1"
    result = validate(client, created["redemption_passcode"], link, sig=link["sig"][:-1] + last)
    assert result["is_discount_applied"] is False
    assert result["reason"] == "BAD_SIGNATURE"


def test_replayed_nonce_is_rejected(client):
    created = campaign(client)
    voucher = created["redemption_passcode"]
    link = deep_link(client, voucher)
    first = validate(client, voucher, link)
    second = validate(client, voucher, link)
    assert first["reason"] == "APPLIED"
    assert second["is_discount_applied"] is False
    assert second["reason"] == "REPLAYED"
    stored = client.get(f"/v1/campaigns/{created['campaign_id']}")
    assert stored.json()["total_redemptions"] == 1


def test_phonepe_pays_full_price(client):
    created = campaign(client)
    voucher = created["redemption_passcode"]
    link = deep_link(client, voucher)
    result = validate(client, voucher, link, payment_source="PHONEPE")
    assert result["is_discount_applied"] is False
    assert result["reason"] == "WRONG_SOURCE"
    assert result["discount_amount"] == "0.00"
    assert result["payable_amount"] == "200.00"


def test_third_weekly_broadcast_is_rejected(client):
    created = campaign(client)
    url = f"/v1/campaigns/{created['campaign_id']}/broadcast"
    assert client.post(url, json={"confirm": True}).status_code == 200
    second = client.post(url, json={"confirm": True})
    assert second.status_code == 200, second.text
    assert second.json()["recipient_count"] == 120
    third = client.post(url, json={"confirm": True})
    assert third.status_code == 429


def test_merchant_profile_lists_the_shop(client):
    response = client.get(f"/v1/merchants/{MERCHANT}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["business_name"] == "Ramesh Kirana"
    assert body["phone_number"] == "919876543210"
    assert body["pincode"] == "400028"
    assert body["slug"] == "ramesh-kirana"
    assert body["soundbox_device_id"] == RAMESH_DEVICE_ID
    assert body["credit_tier"] == "STANDARD"
    assert body["max_preapproved_limit"] == "15000.00"
    assert body["recent_gmv_30d"] == "120000.00"
    assert body["customer_count"] == 120
    assert body["sku_count"] >= 1
    missing = client.get("/v1/merchants/99999999-9999-4999-8999-999999999999")
    assert missing.status_code == 404


def test_whatsapp_webhook_accepts_stock_note(client):
    response = client.post(
        "/v1/webhooks/whatsapp",
        json={
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "waba-demo",
                    "changes": [
                        {
                            "field": "messages",
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "919876543210",
                                    "phone_number_id": "1001",
                                },
                                "messages": [
                                    {
                                        "from": "919876543210",
                                        "id": "wamid.demo1",
                                        "timestamp": "1730000000",
                                        "type": "text",
                                        "text": {"body": "Aaj shakar ka stock kam hai"},
                                    }
                                ],
                            },
                        }
                    ],
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["interpretation"] == "stock_alert"
