import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Merchant(Base):
    __tablename__ = "merchants"

    merchant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    soundbox_device_id: Mapped[str | None] = mapped_column(String(50))
    credit_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="STANDARD")
    max_preapproved_limit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    recent_gmv_30d: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Distributor(Base):
    __tablename__ = "distributors"

    distributor_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    escrow_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)


class InventoryItem(Base):
    __tablename__ = "merchant_inventory"

    inventory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    sku_name: Mapped[str] = mapped_column(String(100), nullable=False)
    estimated_units_remaining: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    burn_rate_units_per_day: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    projected_stockout_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    restock_cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)


class Loan(Base):
    __tablename__ = "merchant_loans"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'DISBURSED', 'REPAYING', 'SETTLED')",
            name="ck_loan_status",
        ),
    )

    loan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    interest_rate_annual: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    distributor_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("distributors.distributor_id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    split_deduction_percentage: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=15)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Campaign(Base):
    __tablename__ = "localized_campaigns"

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    featured_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    discount_percentage: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    minimum_order_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    whatsapp_broadcast_message: Mapped[str] = mapped_column(Text, nullable=False)
    redemption_passcode: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    active_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_redemptions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("merchant_id", "phone_number", name="uq_customer_phone"),)

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    phone_number: Mapped[str] = mapped_column(String(15), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    opted_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SettlementEntry(Base):
    __tablename__ = "settlement_entries"

    entry_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchant_loans.loan_id", ondelete="CASCADE"), nullable=False
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    loan_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    merchant_net: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_reference: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Broadcast(Base):
    __tablename__ = "broadcasts"

    broadcast_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("localized_campaigns.campaign_id", ondelete="CASCADE"), nullable=False
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    recipient_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SoundboxDevice(Base):
    __tablename__ = "soundbox_devices"

    device_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="CASCADE"), nullable=False
    )
    last_announcement: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
