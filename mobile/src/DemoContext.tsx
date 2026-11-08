import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import * as api from "./api";
import { ApiError } from "./api";
import { linePaise } from "./catalog";
import { moneyFromPaise } from "./catalog";
import { playSoundboxClip } from "./sound";
import type { Campaign, CreditOffer, DiscountValidation, ForecastItem, Ledger, PaymentSource, SoundboxState } from "./types";

type DemoValue = {
  online: boolean;
  checking: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  inventory: ForecastItem[];
  chosenSku: string | null;
  offer: CreditOffer | null;
  campaign: Campaign | null;
  ledger: Ledger | null;
  soundbox: SoundboxState | null;
  lastPayment: DiscountValidation | null;
  recipientCount: number | null;
  cart: Record<string, number>;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  chooseSku: (sku: string) => void;
  requestOffer: (sku: string) => Promise<void>;
  acceptLoan: () => Promise<void>;
  previewCampaign: (sku: string) => Promise<void>;
  sendOffer: () => Promise<void>;
  setQty: (sku: string, qty: number) => void;
  fillSampleBasket: () => void;
  pay: (source: PaymentSource) => Promise<void>;
};

const DemoContext = createContext<DemoValue | null>(null);

function byRunway(items: ForecastItem[]): ForecastItem[] {
  return [...items].sort((left, right) => Number(left.runway_hours) - Number(right.runway_hours));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<ForecastItem[]>([]);
  const [chosenSku, setChosenSku] = useState<string | null>(null);
  const [offer, setOffer] = useState<CreditOffer | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [soundbox, setSoundbox] = useState<SoundboxState | null>(null);
  const [lastPayment, setLastPayment] = useState<DiscountValidation | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const offerRef = useRef<CreditOffer | null>(null);
  offerRef.current = offer;

  const refresh = useCallback(async () => {
    const [stock, latest, speaker] = await Promise.all([
      api.fetchInventory(),
      api.fetchLatestCampaign(),
      api.fetchSoundbox(),
    ]);
    setInventory(byRunway(stock.items));
    setCampaign(latest);
    setSoundbox(speaker);
    const current = offerRef.current;
    if (current && current.status !== "SETTLED") {
      const updated = await api.fetchOffer(current.sku_name);
      setOffer(updated);
      setLedger(await api.fetchLedger(updated.loan_id));
    }
    setError(null);
  }, []);

  const connect = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      await api.probeHealth();
      setLoading(true);
      await refresh();
      setOnline(true);
    } catch (err: unknown) {
      setOnline(false);
      setError(err instanceof Error ? err.message : "Cannot reach the API");
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void connect();
  }, [connect]);

  useEffect(() => {
    if (!online) {
      return undefined;
    }
    const timer = setInterval(() => {
      api.fetchSoundbox().then(setSoundbox).catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [online]);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 0) {
        setOnline(false);
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const chooseSku = useCallback((sku: string) => {
    setChosenSku(sku);
  }, []);

  const requestOffer = useCallback(
    (sku: string) =>
      run(async () => {
        const credit = await api.fetchOffer(sku);
        setOffer(credit);
        setChosenSku(sku);
        setLedger(await api.fetchLedger(credit.loan_id));
      }),
    [run],
  );

  const acceptLoan = useCallback(
    () =>
      run(async () => {
        if (!offer || offer.status !== "PENDING") {
          return;
        }
        await api.acceptLoan(offer.loan_id);
        const updated = await api.fetchOffer(offer.sku_name);
        setOffer(updated);
        setLedger(await api.fetchLedger(updated.loan_id));
      }),
    [offer, run],
  );

  const previewCampaign = useCallback(
    (sku: string) =>
      run(async () => {
        if (campaign?.featured_sku === sku) {
          return;
        }
        setCampaign(await api.createCampaign(sku));
      }),
    [campaign?.featured_sku, run],
  );

  const sendOffer = useCallback(
    () =>
      run(async () => {
        if (!campaign) {
          throw new Error("Preview the message before sending it");
        }
        const sent = await api.broadcastCampaign(campaign.campaign_id);
        setRecipientCount(sent.recipient_count);
        await refresh();
      }),
    [campaign, refresh, run],
  );

  const setQty = useCallback((sku: string, qty: number) => {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) {
        delete next[sku];
      } else {
        next[sku] = Math.min(qty, 20);
      }
      return next;
    });
  }, []);

  const fillSampleBasket = useCallback(() => {
    setCart({ Sugar: 2, Biscuits: 5 });
  }, []);

  const pay = useCallback(
    (source: PaymentSource) =>
      run(async () => {
        if (!campaign) {
          throw new Error("Send the WhatsApp offer from the merchant screen first");
        }
        const billPaise = Object.entries(cart).reduce((sum, [sku, qty]) => sum + linePaise(sku, qty), 0);
        const featuredPaise = linePaise(campaign.featured_sku, cart[campaign.featured_sku] ?? 0);
        if (billPaise <= 0) {
          throw new Error("Add something to the basket first");
        }
        const bill = moneyFromPaise(billPaise);
        const featured = moneyFromPaise(featuredPaise);
        const link = await api.createDeepLink(bill, campaign.redemption_passcode);
        const result = await api.validatePayment({
          billAmount: bill,
          featuredSkuAmount: featured,
          voucher: campaign.redemption_passcode,
          paymentSource: source,
          ts: link.ts,
          nonce: link.nonce,
          sig: link.sig,
        });
        const current = offerRef.current;
        const loanOpen = current?.status === "DISBURSED" || current?.status === "REPAYING";
        if (loanOpen && current && (result.reason === "APPLIED" || result.reason === "WRONG_SOURCE")) {
          await api.postRepayment(current.loan_id, result.payable_amount);
        }
        if (result.is_discount_applied && Number(result.discount_amount) > 0) {
          await playSoundboxClip();
        }
        setLastPayment(result);
        await refresh();
      }),
    [campaign, cart, refresh, run],
  );

  const value = useMemo(
    () => ({
      online,
      checking,
      loading,
      busy,
      error,
      inventory,
      chosenSku,
      offer,
      campaign,
      ledger,
      soundbox,
      lastPayment,
      recipientCount,
      cart,
      connect,
      refresh,
      chooseSku,
      requestOffer,
      acceptLoan,
      previewCampaign,
      sendOffer,
      setQty,
      fillSampleBasket,
      pay,
    }),
    [
      online,
      checking,
      loading,
      busy,
      error,
      inventory,
      chosenSku,
      offer,
      campaign,
      ledger,
      soundbox,
      lastPayment,
      recipientCount,
      cart,
      connect,
      refresh,
      chooseSku,
      requestOffer,
      acceptLoan,
      previewCampaign,
      sendOffer,
      setQty,
      fillSampleBasket,
      pay,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error("useDemo must be used inside DemoProvider");
  }
  return value;
}
