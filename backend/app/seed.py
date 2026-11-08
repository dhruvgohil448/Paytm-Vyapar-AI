"""Reset and load the Ramesh Kirana demo plus a disbursed loan for Locust."""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.demo_ids import (
    DISTRIBUTOR_ID,
    LOAD_CAMPAIGN_ID,
    LOAD_DEVICE_ID,
    LOAD_LOAN_ID,
    LOAD_MERCHANT_ID,
    LOAD_PHONE,
    LOAD_SKU,
    LOAD_SLUG,
    LOAD_VOUCHER,
    RAMESH_DEVICE_ID,
    RAMESH_MERCHANT_ID,
    RAMESH_PHONE,
    RAMESH_SLUG,
)
from app.models import (
    Broadcast,
    Campaign,
    Customer,
    Distributor,
    InventoryItem,
    Loan,
    Merchant,
    SettlementEntry,
    SoundboxDevice,
)
from app.money import D
from app.redis_client import redis_client
from app.services.forecast import units_for_runway
from app.services.soundbox import publish

DEMO_MERCHANTS = (uuid.UUID(RAMESH_MERCHANT_ID), uuid.UUID(LOAD_MERCHANT_ID))
ANNUAL = Decimal("58.40")

# name, burn per day, runway hours, restock cost. Hours are the forecast target
# after weekend and festival multipliers, so the alert stays stable.
RAMESH_CATALOG: tuple[tuple[str, str, str, str], ...] = (
    ("Sugar", "12", "18", "300.00"),
    ("Mustard oil", "4", "20", "180.00"),
    ("Tea", "3", "16", "90.00"),
    ("Milk powder", "2", "22", "220.00"),
    ("Turmeric", "1", "14", "80.00"),
    ("Toor dal", "5", "30", "140.00"),
    ("Rice", "8", "40", "60.00"),
    ("Maggi", "10", "36", "14.00"),
    ("Sunflower oil", "3", "44", "160.00"),
    ("Wheat flour", "6", "55", "40.00"),
    ("Salt", "2", "80", "20.00"),
    ("Soap", "4", "70", "30.00"),
    ("Biscuits", "8", "96", "10.00"),
    ("Chana dal", "3", "72", "70.00"),
    ("Poha", "4", "60", "35.00"),
)


def _wipe(db: Session) -> None:
    db.query(SettlementEntry).filter(SettlementEntry.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(Broadcast).filter(Broadcast.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(Campaign).filter(Campaign.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(Loan).filter(Loan.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(InventoryItem).filter(InventoryItem.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(Customer).filter(Customer.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(SoundboxDevice).filter(SoundboxDevice.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)
    db.query(Merchant).filter(Merchant.merchant_id.in_(DEMO_MERCHANTS)).delete(synchronize_session=False)


def seed(db: Session, redis=None) -> None:
    cache = redis if redis is not None else redis_client
    now = datetime.now(timezone.utc)
    on = now.date()
    _wipe(db)

    distributor = db.get(Distributor, DISTRIBUTOR_ID)
    if distributor is None:
        distributor = Distributor(distributor_id=DISTRIBUTOR_ID, name="Dadar Super Stockist", escrow_balance=D("0"))
        db.add(distributor)
    distributor.name = "Dadar Super Stockist"
    distributor.escrow_balance = D("10000000.00")

    ramesh_id = uuid.UUID(RAMESH_MERCHANT_ID)
    load_id = uuid.UUID(LOAD_MERCHANT_ID)
    db.add(
        Merchant(
            merchant_id=ramesh_id,
            business_name="Ramesh Kirana",
            phone_number=RAMESH_PHONE,
            pincode="400028",
            slug=RAMESH_SLUG,
            soundbox_device_id=RAMESH_DEVICE_ID,
            credit_tier="STANDARD",
            max_preapproved_limit=D("15000.00"),
            recent_gmv_30d=D("120000.00"),
            created_at=now,
        )
    )
    db.add(
        Merchant(
            merchant_id=load_id,
            business_name="Load Test Kirana",
            phone_number=LOAD_PHONE,
            pincode="400028",
            slug=LOAD_SLUG,
            soundbox_device_id=LOAD_DEVICE_ID,
            credit_tier="STANDARD",
            max_preapproved_limit=D("10000000.00"),
            recent_gmv_30d=D("5000000.00"),
            created_at=now,
        )
    )
    db.flush()

    for name, burn, hours, cost in RAMESH_CATALOG:
        runway = Decimal(hours)
        db.add(
            InventoryItem(
                inventory_id=uuid.uuid4(),
                merchant_id=ramesh_id,
                sku_name=name,
                estimated_units_remaining=units_for_runway(Decimal(burn), runway, on),
                burn_rate_units_per_day=D(burn),
                projected_stockout_timestamp=now + timedelta(hours=int(runway)),
                restock_cost_per_unit=D(cost),
            )
        )
    db.add(
        InventoryItem(
            inventory_id=uuid.uuid4(),
            merchant_id=load_id,
            sku_name=LOAD_SKU,
            estimated_units_remaining=D("500.00"),
            burn_rate_units_per_day=D("2.00"),
            projected_stockout_timestamp=now + timedelta(days=30),
            restock_cost_per_unit=D("80.00"),
        )
    )

    db.add(
        Loan(
            loan_id=uuid.UUID(LOAD_LOAN_ID),
            merchant_id=load_id,
            principal_amount=D("10000000.00"),
            interest_rate_annual=ANNUAL,
            distributor_id=DISTRIBUTOR_ID,
            status="DISBURSED",
            split_deduction_percentage=D("15.00"),
            outstanding_balance=D("10000000.00"),
            disbursed_at=now,
            created_at=now,
        )
    )
    db.add(
        Campaign(
            campaign_id=uuid.UUID(LOAD_CAMPAIGN_ID),
            merchant_id=load_id,
            featured_sku=LOAD_SKU,
            discount_percentage=D("40.00"),
            minimum_order_value=D("200.00"),
            whatsapp_broadcast_message="Chawal pe 40% chhoot! Load Test Kirana. Sirf Paytm App par. Voucher: LOAD40",
            redemption_passcode=LOAD_VOUCHER,
            active_until=now + timedelta(days=30),
            total_redemptions=0,
            created_at=now,
        )
    )

    customers = [
        Customer(
            customer_id=uuid.uuid4(),
            merchant_id=ramesh_id,
            phone_number=f"9188{index:08d}",
            display_name=f"Neighbour {index}",
            opted_in=True,
            created_at=now,
        )
        for index in range(1, 121)
    ]
    db.add_all(customers)
    db.add(
        SoundboxDevice(
            device_id=RAMESH_DEVICE_ID,
            merchant_id=ramesh_id,
            last_announcement="Namaste Ramesh ji! Sugar ka stock 18 ghante mein khatam ho sakta hai.",
            updated_at=now,
        )
    )
    db.add(
        SoundboxDevice(
            device_id=LOAD_DEVICE_ID,
            merchant_id=load_id,
            last_announcement="Load test soundbox online.",
            updated_at=now,
        )
    )
    db.commit()
    publish(
        db,
        cache,
        RAMESH_DEVICE_ID,
        "Namaste Ramesh ji! Sugar ka stock 18 ghante mein khatam ho sakta hai.",
        now,
    )
    publish(db, cache, LOAD_DEVICE_ID, "Load test soundbox online.", now)
    db.commit()


def main() -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    print("Seeded Ramesh Kirana and the load-test merchant.")


if __name__ == "__main__":
    main()
