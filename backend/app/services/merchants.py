import uuid

from sqlalchemy.orm import Session

from app.errors import DomainError
from app.models import Customer, InventoryItem, Merchant
from app.money import money
from app.schemas import MerchantProfile


def merchant_profile(db: Session, merchant_id: uuid.UUID) -> MerchantProfile:
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise DomainError(404, "Merchant not found")
    customers = db.query(Customer).filter(Customer.merchant_id == merchant_id).count()
    skus = db.query(InventoryItem).filter(InventoryItem.merchant_id == merchant_id).count()
    return MerchantProfile(
        merchant_id=merchant.merchant_id,
        business_name=merchant.business_name,
        phone_number=merchant.phone_number,
        pincode=merchant.pincode,
        slug=merchant.slug,
        soundbox_device_id=merchant.soundbox_device_id,
        credit_tier=merchant.credit_tier,
        max_preapproved_limit=money(merchant.max_preapproved_limit),
        recent_gmv_30d=money(merchant.recent_gmv_30d),
        customer_count=customers,
        sku_count=skus,
        created_at=merchant.created_at,
    )
