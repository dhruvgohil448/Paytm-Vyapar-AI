export type AlertLevel = "RED" | "YELLOW" | "GREEN";
export type LoanStatus = "PENDING" | "DISBURSED" | "REPAYING" | "SETTLED";
export type PaymentSource = "PAYTM_CONSUMER_APP" | "PHONEPE" | "GPAY" | "BHIM";

export type ForecastItem = {
  inventory_id: string;
  merchant_id: string;
  sku_name: string;
  estimated_units_remaining: string;
  burn_rate_units_per_day: string;
  effective_burn_rate_units_per_day: string;
  runway_hours: string;
  alert: AlertLevel;
  projected_stockout_timestamp: string;
  restock_cost_per_unit: string;
  demand_factors: string[];
  reorder: { sku_name: string; units: string; cost: string };
};

export type CreditOffer = {
  loan_id: string;
  merchant_id: string;
  sku_name: string;
  principal_amount: string;
  interest_rate_annual: string;
  interest_per_day: string;
  distributor_id: string;
  distributor_name: string;
  split_deduction_percentage: string;
  status: LoanStatus;
  outstanding_balance: string;
};

export type Disbursement = {
  loan_id: string;
  status: "DISBURSED";
  distributor_id: string;
  distributor_name: string;
  escrow_reference: string;
  escrow_balance: string;
  outstanding_balance: string;
  disbursed_at: string;
};

export type Campaign = {
  campaign_id: string;
  merchant_id: string;
  featured_sku: string;
  discount_percentage: string;
  minimum_order_value: string;
  whatsapp_broadcast_message: string;
  redemption_passcode: string;
  active_until: string;
  total_redemptions: number;
};

export type BroadcastResult = {
  broadcast_id: string;
  campaign_id: string;
  recipient_count: number;
  whatsapp_broadcast_message: string;
  pay_link: string;
  sent_at: string;
};

export type LedgerEntry = {
  entry_id: string;
  gross_amount: string;
  loan_deduction: string;
  merchant_net: string;
  payment_reference: string;
  created_at: string;
};

export type Ledger = {
  loan_id: string;
  merchant_id: string;
  outstanding_balance: string;
  status: LoanStatus;
  split_deduction_percentage: string;
  entries: LedgerEntry[];
};

export type DeepLink = {
  url: string;
  expires_in_seconds: number;
  nonce: string;
  ts: number;
  sig: string;
  amount_paise: number;
};

export type DiscountValidation = {
  is_discount_applied: boolean;
  discount_amount: string;
  payable_amount: string;
  message: string;
  reason: string;
  announcement: string | null;
};

export type SoundboxState = {
  device_id: string;
  online: boolean;
  topic: string;
  last_announcement: string;
  updated_at: string;
};

export type Vendor = {
  vendor_id: string;
  name: string;
  location: string;
  price_per_unit: string;
  unit: string;
  min_order_qty: number;
  delivery_days: number;
  rating: number;
  verified: boolean;
  phone: string;
};

export type VendorQuote = {
  sku: string;
  vendors: Vendor[];
};

export type RestockOrder = {
  order_id: string;
  vendor_id: string;
  sku: string;
  quantity: number;
  total_cost: string;
  status: "PLACED" | "CONFIRMED" | "DISPATCHED" | "DELIVERED";
  placed_at: string;
};
