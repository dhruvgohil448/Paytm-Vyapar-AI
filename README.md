# Paytm Vyapar AI

Hackathon MVP for a kirana flywheel: sugar stock radar, a ₹15,000 distributor loan, a Paytm-only WhatsApp offer, and a 15/85 split on each settlement.

The API is FastAPI. PostgreSQL holds merchants, inventory, loans, campaigns, and the settlement ledger. Redis caches Paytm Soundbox state on MQTT-shaped keys (`soundbox/{device_id}/state`) and remembers deep-link nonces. Paytm, WhatsApp, and the NBFC are sandbox adapters that speak the same JSON contracts.

The Expo app in `mobile/` runs the Ramesh Kirana demo on iOS and Android.

## Run the API

PostgreSQL 16 and Redis 7 must be listening on localhost. With Docker:

```bash
cd backend
docker compose up -d
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Copy `backend/.env.example` to `backend/.env` to change the database URL or the HMAC secret. Seeded merchant id: `11111111-1111-4111-8111-111111111111`. OpenAPI files are in `backend/openapi/` and are also served at `/specs/inventory.yaml`, `/specs/whatsapp.yaml`, `/specs/nbfc.yaml`, and `/specs/payments.yaml`.

## Tests and load

PyTest resets the database and Redis, then re-seeds. Run it before a demo, and seed again afterwards.

```bash
cd backend
source .venv/bin/activate
pytest
python -m app.seed
locust -f locustfile.py --headless -u 200 -r 40 -t 30s --host http://127.0.0.1:8000
```

Locust mixes a light morning forecast user with an evening peak of inventory reads, ₹160 repayments, and signed Paytm checkouts against the load-test merchant. Read the error rate and the response-time percentiles Locust prints. That report is the load result. A clean UI is not a separate pass.

## Mobile demo

```bash
cd mobile
npm install
npx expo start
```

iOS Simulator uses `http://localhost:8000`. The Android emulator uses `http://10.0.2.2:8000`. Override either with `EXPO_PUBLIC_API_BASE`.

On Merchant: sugar is red, accept the ₹15,000 restock loan, then send the WhatsApp offer. On Customer: pay ₹200 with Paytm (₹100 of it is sugar) and the payable amount is ₹160, with ₹24 going to the loan. Pay again with PhonePe and the price stays ₹200.
