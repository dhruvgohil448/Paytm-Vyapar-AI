import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Money = str
LoanStatus = Literal["PENDING", "DISBURSED", "REPAYING", "SETTLED"]
Alert = Literal["RED", "YELLOW", "GREEN"]
PaymentSource = Literal["PAYTM_CONSUMER_APP", "PHONEPE", "GPAY", "BHIM"]
RejectReason = Literal[
    "APPLIED",
    "WRONG_SOURCE",
    "BELOW_MINIMUM",
    "SIGNATURE_EXPIRED",
    "BAD_SIGNATURE",
    "REPLAYED",
    "UNKNOWN_VOUCHER",
    "INACTIVE_CAMPAIGN",
]

MONEY = r"^\d+\.\d{2}$"


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ForecastRequest(APIModel):
    merchant_id: uuid.UUID
    sku_name: str = Field(min_length=1, max_length=100)


class ReorderSuggestion(APIModel):
    sku_name: str
    units: str = Field(pattern=MONEY)
    cost: str = Field(pattern=MONEY)


class ForecastItem(APIModel):
    inventory_id: uuid.UUID
    merchant_id: uuid.UUID
    sku_name: str
    estimated_units_remaining: str = Field(pattern=MONEY)
    burn_rate_units_per_day: str = Field(pattern=MONEY)
    effective_burn_rate_units_per_day: str = Field(pattern=MONEY)
    runway_hours: str = Field(pattern=MONEY)
    alert: Alert
    projected_stockout_timestamp: datetime
    restock_cost_per_unit: str = Field(pattern=MONEY)
    demand_factors: list[str]
    reorder: ReorderSuggestion


class InventoryList(APIModel):
    merchant_id: uuid.UUID
    items: list[ForecastItem]


class TextBody(APIModel):
    body: str = Field(min_length=1)


class AudioBody(APIModel):
    id: str = Field(min_length=1)
    mime_type: str = Field(min_length=1)


class InboundMessage(APIModel):
    from_phone: str = Field(alias="from", min_length=1)
    id: str = Field(min_length=1)
    timestamp: str = Field(min_length=1)
    type: Literal["text", "audio"]
    text: TextBody | None = None
    audio: AudioBody | None = None

    @model_validator(mode="after")
    def body_matches_type(self) -> "InboundMessage":
        if self.type == "text" and (self.text is None or self.audio is not None):
            raise ValueError("text messages require a text body only")
        if self.type == "audio" and (self.audio is None or self.text is not None):
            raise ValueError("audio messages require an audio body only")
        return self


class WebhookMetadata(APIModel):
    display_phone_number: str
    phone_number_id: str


class WebhookValue(APIModel):
    messaging_product: Literal["whatsapp"]
    metadata: WebhookMetadata
    messages: list[InboundMessage] = Field(min_length=1)


class WebhookChange(APIModel):
    field: Literal["messages"]
    value: WebhookValue


class WebhookEntry(APIModel):
    id: str = Field(min_length=1)
    changes: list[WebhookChange] = Field(min_length=1)


class WhatsAppWebhook(APIModel):
    object: Literal["whatsapp_business_account"]
    entry: list[WebhookEntry] = Field(min_length=1)


class WebhookAck(APIModel):
    status: Literal["accepted"]
    message_id: str
    from_phone: str
    kind: Literal["text", "audio"]
    interpretation: Literal["stock_alert", "note"]


class CampaignCreate(APIModel):
    merchant_id: uuid.UUID
    featured_sku: str = Field(min_length=1, max_length=100)
    discount_percentage: str = Field(pattern=MONEY)
    minimum_order_value: str = Field(pattern=MONEY)


class CampaignOut(APIModel):
    campaign_id: uuid.UUID
    merchant_id: uuid.UUID
    featured_sku: str
    discount_percentage: str = Field(pattern=MONEY)
    minimum_order_value: str = Field(pattern=MONEY)
    whatsapp_broadcast_message: str
    redemption_passcode: str
    active_until: datetime
    total_redemptions: int = Field(ge=0)


class BroadcastRequest(APIModel):
    confirm: Literal[True]


class BroadcastResult(APIModel):
    broadcast_id: uuid.UUID
    campaign_id: uuid.UUID
    recipient_count: int = Field(ge=0)
    whatsapp_broadcast_message: str
    pay_link: str
    sent_at: datetime


class OfferRequest(APIModel):
    merchant_id: uuid.UUID
    sku_name: str = Field(min_length=1, max_length=100)


class CreditOffer(APIModel):
    loan_id: uuid.UUID
    merchant_id: uuid.UUID
    sku_name: str
    principal_amount: str = Field(pattern=MONEY)
    interest_rate_annual: str = Field(pattern=MONEY)
    interest_per_day: str = Field(pattern=MONEY)
    distributor_id: str
    distributor_name: str
    split_deduction_percentage: str = Field(pattern=MONEY)
    status: LoanStatus
    outstanding_balance: str = Field(pattern=MONEY)


class AcceptLoanRequest(APIModel):
    merchant_id: uuid.UUID


class Disbursement(APIModel):
    loan_id: uuid.UUID
    status: Literal["DISBURSED"]
    distributor_id: str
    distributor_name: str
    escrow_reference: str
    escrow_balance: str = Field(pattern=MONEY)
    outstanding_balance: str = Field(pattern=MONEY)
    disbursed_at: datetime


class RepaymentRequest(APIModel):
    loan_id: uuid.UUID
    gross_amount: str = Field(pattern=MONEY)
    payment_reference: str = Field(min_length=1, max_length=64)


class RepaymentResult(APIModel):
    entry_id: uuid.UUID
    loan_id: uuid.UUID
    gross_amount: str = Field(pattern=MONEY)
    loan_deduction: str = Field(pattern=MONEY)
    merchant_net: str = Field(pattern=MONEY)
    outstanding_balance: str = Field(pattern=MONEY)
    status: LoanStatus
    payment_reference: str


class LedgerEntry(APIModel):
    entry_id: uuid.UUID
    gross_amount: str = Field(pattern=MONEY)
    loan_deduction: str = Field(pattern=MONEY)
    merchant_net: str = Field(pattern=MONEY)
    payment_reference: str
    created_at: datetime


class Ledger(APIModel):
    loan_id: uuid.UUID
    merchant_id: uuid.UUID
    outstanding_balance: str = Field(pattern=MONEY)
    status: LoanStatus
    split_deduction_percentage: str = Field(pattern=MONEY)
    entries: list[LedgerEntry]


class DeepLinkRequest(APIModel):
    merchant_id: uuid.UUID
    amount: str = Field(pattern=MONEY)
    voucher: str = Field(min_length=1, max_length=32)


class DeepLinkOut(APIModel):
    url: str
    expires_in_seconds: int
    nonce: str
    ts: int
    sig: str
    amount_paise: int


class ValidatePaymentRequest(APIModel):
    merchant_id: uuid.UUID
    bill_amount: str = Field(pattern=MONEY)
    featured_sku_amount: str | None = None
    voucher: str = Field(min_length=1, max_length=32)
    payment_source: PaymentSource
    ts: int
    nonce: str = Field(min_length=8, max_length=64)
    sig: str = Field(min_length=64, max_length=64)

    @model_validator(mode="after")
    def featured_amount_shape(self) -> "ValidatePaymentRequest":
        if self.featured_sku_amount is not None and not re.fullmatch(MONEY, self.featured_sku_amount):
            raise ValueError("featured_sku_amount must be a decimal string with two places")
        return self


class DiscountValidation(APIModel):
    is_discount_applied: bool
    discount_amount: str = Field(pattern=MONEY)
    payable_amount: str = Field(pattern=MONEY)
    message: str
    reason: RejectReason
    announcement: str | None


class SoundboxState(APIModel):
    device_id: str
    online: bool
    topic: str
    last_announcement: str
    updated_at: datetime
