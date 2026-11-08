import { API_BASE, RAMESH_DEVICE_ID, RAMESH_MERCHANT_ID } from "./config";
import type {
  BroadcastResult,
  Campaign,
  CreditOffer,
  CreditQuote,
  DeepLink,
  DiscountValidation,
  Disbursement,
  ForecastItem,
  Ledger,
  PaymentSource,
  SoundboxState,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${API_BASE}`);
  }
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = body && typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }
  return body as T;
}

export async function probeHealth(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    if (!response.ok) {
      throw new ApiError(response.status, `API health check failed (${response.status})`);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, `Cannot reach the API at ${API_BASE}`);
  } finally {
    clearTimeout(timer);
  }
}

export function fetchInventory(): Promise<{ items: ForecastItem[] }> {
  return request(`/v1/merchants/${RAMESH_MERCHANT_ID}/inventory`);
}

export function forecastSku(sku: string): Promise<ForecastItem> {
  return request("/v1/inventory/forecast", {
    method: "POST",
    body: JSON.stringify({ merchant_id: RAMESH_MERCHANT_ID, sku_name: sku }),
  });
}

export function restockSku(sku: string, units: string): Promise<ForecastItem> {
  return request("/v1/inventory/restock", {
    method: "POST",
    body: JSON.stringify({ merchant_id: RAMESH_MERCHANT_ID, sku_name: sku, units }),
  });
}

export function fetchCreditQuote(sku: string, purchase?: string | null): Promise<CreditQuote> {
  return request("/v1/credit/quote", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: RAMESH_MERCHANT_ID,
      sku_name: sku,
      ...(purchase ? { purchase_amount: purchase } : {}),
    }),
  });
}

export function fetchOffer(sku: string, purchase?: string | null): Promise<CreditOffer> {
  return request("/v1/credit/offers", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: RAMESH_MERCHANT_ID,
      sku_name: sku,
      ...(purchase ? { purchase_amount: purchase } : {}),
    }),
  });
}

export function acceptLoan(loanId: string): Promise<Disbursement> {
  return request(`/v1/credit/loans/${loanId}/accept`, {
    method: "POST",
    body: JSON.stringify({ merchant_id: RAMESH_MERCHANT_ID }),
  });
}

export function createCampaign(sku: string): Promise<Campaign> {
  return request("/v1/campaigns", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: RAMESH_MERCHANT_ID,
      featured_sku: sku,
      discount_percentage: "40.00",
      minimum_order_value: "200.00",
    }),
  });
}

export function broadcastCampaign(campaignId: string): Promise<BroadcastResult> {
  return request(`/v1/campaigns/${campaignId}/broadcast`, {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}

export async function fetchLatestCampaign(): Promise<Campaign | null> {
  try {
    return await request(`/v1/merchants/${RAMESH_MERCHANT_ID}/campaigns/latest`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function fetchLedger(loanId: string): Promise<Ledger> {
  return request(`/v1/loans/${loanId}/ledger`);
}

export function fetchSoundbox(): Promise<SoundboxState> {
  return request(`/v1/soundbox/${RAMESH_DEVICE_ID}/state`);
}

export function createDeepLink(amount: string, voucher: string): Promise<DeepLink> {
  return request("/v1/payments/deep-links", {
    method: "POST",
    body: JSON.stringify({ merchant_id: RAMESH_MERCHANT_ID, amount, voucher }),
  });
}

export function validatePayment(input: {
  billAmount: string;
  featuredSkuAmount: string;
  voucher: string;
  paymentSource: PaymentSource;
  ts: number;
  nonce: string;
  sig: string;
}): Promise<DiscountValidation> {
  return request("/v1/payments/validate", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: RAMESH_MERCHANT_ID,
      bill_amount: input.billAmount,
      featured_sku_amount: input.featuredSkuAmount,
      voucher: input.voucher,
      payment_source: input.paymentSource,
      ts: input.ts,
      nonce: input.nonce,
      sig: input.sig,
    }),
  });
}

export function postRepayment(loanId: string, grossAmount: string): Promise<unknown> {
  return request("/v1/nbfc/repayments", {
    method: "POST",
    body: JSON.stringify({
      loan_id: loanId,
      gross_amount: grossAmount,
      payment_reference: `app-${Date.now()}`,
    }),
  });
}
