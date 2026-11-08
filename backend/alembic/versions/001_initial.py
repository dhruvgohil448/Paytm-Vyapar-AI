"""Initial Paytm Vyapar AI schema."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "merchants",
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("phone_number", sa.String(15), nullable=False, unique=True),
        sa.Column("pincode", sa.String(10), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("soundbox_device_id", sa.String(50)),
        sa.Column("credit_tier", sa.String(20), nullable=False, server_default="STANDARD"),
        sa.Column("max_preapproved_limit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("recent_gmv_30d", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "distributors",
        sa.Column("distributor_id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("escrow_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )
    op.create_table(
        "merchant_inventory",
        sa.Column("inventory_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sku_name", sa.String(100), nullable=False),
        sa.Column("estimated_units_remaining", sa.Numeric(8, 2), nullable=False),
        sa.Column("burn_rate_units_per_day", sa.Numeric(8, 2), nullable=False),
        sa.Column("projected_stockout_timestamp", sa.DateTime(timezone=True)),
        sa.Column("restock_cost_per_unit", sa.Numeric(10, 2), nullable=False),
    )
    op.create_index("ix_inventory_merchant", "merchant_inventory", ["merchant_id"])
    op.create_table(
        "merchant_loans",
        sa.Column("loan_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("principal_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("interest_rate_annual", sa.Numeric(5, 2), nullable=False),
        sa.Column(
            "distributor_id",
            sa.String(100),
            sa.ForeignKey("distributors.distributor_id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("split_deduction_percentage", sa.Numeric(4, 2), nullable=False, server_default="15"),
        sa.Column("outstanding_balance", sa.Numeric(12, 2), nullable=False),
        sa.Column("disbursed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('PENDING', 'DISBURSED', 'REPAYING', 'SETTLED')",
            name="ck_loan_status",
        ),
    )
    op.create_index("ix_loans_merchant", "merchant_loans", ["merchant_id"])
    op.create_table(
        "localized_campaigns",
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("featured_sku", sa.String(100), nullable=False),
        sa.Column("discount_percentage", sa.Numeric(4, 2), nullable=False),
        sa.Column("minimum_order_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("whatsapp_broadcast_message", sa.Text(), nullable=False),
        sa.Column("redemption_passcode", sa.String(32), nullable=False, unique=True),
        sa.Column("active_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_redemptions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_campaigns_merchant", "localized_campaigns", ["merchant_id"])
    op.create_table(
        "customers",
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_number", sa.String(15), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("opted_in", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("merchant_id", "phone_number", name="uq_customer_phone"),
    )
    op.create_table(
        "settlement_entries",
        sa.Column("entry_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "loan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchant_loans.loan_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("loan_deduction", sa.Numeric(12, 2), nullable=False),
        sa.Column("merchant_net", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_reference", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_settlements_loan", "settlement_entries", ["loan_id"])
    op.create_table(
        "broadcasts",
        sa.Column("broadcast_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "campaign_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("localized_campaigns.campaign_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("recipient_count", sa.Integer(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_broadcasts_merchant_sent", "broadcasts", ["merchant_id", "sent_at"])
    op.create_table(
        "soundbox_devices",
        sa.Column("device_id", sa.String(50), primary_key=True),
        sa.Column(
            "merchant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("merchants.merchant_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("last_announcement", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("soundbox_devices")
    op.drop_table("broadcasts")
    op.drop_table("settlement_entries")
    op.drop_table("customers")
    op.drop_table("localized_campaigns")
    op.drop_table("merchant_loans")
    op.drop_table("merchant_inventory")
    op.drop_table("distributors")
    op.drop_table("merchants")
