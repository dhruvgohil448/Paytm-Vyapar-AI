"""Evening kirana peak, plus a lighter morning forecast pass.

Run against a seeded API:

    locust -f locustfile.py --headless -u 200 -r 40 -t 30s --host http://127.0.0.1:8000
"""

import uuid

from locust import HttpUser, between, task

from app.demo_ids import LOAD_LOAN_ID, LOAD_MERCHANT_ID, LOAD_SKU, LOAD_VOUCHER


class MorningForecastUser(HttpUser):
    weight = 1
    wait_time = between(0.5, 1.5)

    @task
    def forecast(self) -> None:
        self.client.post(
            "/v1/inventory/forecast",
            json={"merchant_id": LOAD_MERCHANT_ID, "sku_name": LOAD_SKU},
            name="/v1/inventory/forecast",
        )


class EveningPeakUser(HttpUser):
    """Checkout-heavy mix: inventory reads, split repayments, and signed payments."""

    weight = 5
    wait_time = between(0.05, 0.3)

    @task(5)
    def inventory(self) -> None:
        self.client.get(
            f"/v1/merchants/{LOAD_MERCHANT_ID}/inventory",
            name="/v1/merchants/:id/inventory",
        )

    @task(3)
    def repay(self) -> None:
        self.client.post(
            "/v1/nbfc/repayments",
            json={
                "loan_id": LOAD_LOAN_ID,
                "gross_amount": "160.00",
                "payment_reference": f"locust-{uuid.uuid4()}",
            },
            name="/v1/nbfc/repayments",
        )

    @task(3)
    def checkout(self) -> None:
        link = self.client.post(
            "/v1/payments/deep-links",
            json={
                "merchant_id": LOAD_MERCHANT_ID,
                "amount": "200.00",
                "voucher": LOAD_VOUCHER,
            },
            name="/v1/payments/deep-links",
        )
        if link.status_code != 200:
            return
        signed = link.json()
        self.client.post(
            "/v1/payments/validate",
            json={
                "merchant_id": LOAD_MERCHANT_ID,
                "bill_amount": "200.00",
                "featured_sku_amount": "100.00",
                "voucher": LOAD_VOUCHER,
                "payment_source": "PAYTM_CONSUMER_APP",
                "ts": signed["ts"],
                "nonce": signed["nonce"],
                "sig": signed["sig"],
            },
            name="/v1/payments/validate",
        )
