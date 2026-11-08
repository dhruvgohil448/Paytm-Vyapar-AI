import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import * as api from "./api";
import { ApiError } from "./api";
import { playSoundboxClip } from "./sound";
import type { Campaign, CreditOffer, ForecastItem, Ledger, SoundboxState } from "./types";
import { nextDeliveryDate, type RestockOrder } from "./vendors";

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
  recipientCount: number | null;
  payLink: string | null;
  watchSkus: string[];
  restocks: RestockOrder[];
  connect: () => Promise<void>;
  addWatchSku: (sku: string) => void;
  placeRestock: (order: Omit<RestockOrder, "id">) => void;
  refresh: () => Promise<void>;
  chooseSku: (sku: string) => void;
  requestOffer: (sku: string) => Promise<void>;
  acceptLoan: () => Promise<void>;
  previewCampaign: (sku: string) => Promise<void>;
  sendOffer: () => Promise<void>;
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
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [watchSkus, setWatchSkus] = useState<string[]>([]);
  const [restocks, setRestocks] = useState<RestockOrder[]>([]);
  const offerRef = useRef<CreditOffer | null>(null);
  const heardAnnouncement = useRef<string | null>(null);
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
      const current = offerRef.current;
      if (current && (current.status === "DISBURSED" || current.status === "REPAYING")) {
        api.fetchLedger(current.loan_id).then(setLedger).catch(() => undefined);
      }
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

  const addWatchSku = useCallback((sku: string) => {
    setWatchSkus((current) => (current.includes(sku) ? current : [...current, sku]));
  }, []);

  const placeRestock = useCallback((order: Omit<RestockOrder, "id">) => {
    setRestocks((current) => [
      { ...order, id: `${order.sku}-${Date.now()}`, deliveryDate: order.deliveryDate || nextDeliveryDate() },
      ...current,
    ]);
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
        setPayLink(sent.pay_link);
        await refresh();
      }),
    [campaign, refresh, run],
  );

  useEffect(() => {
    const text = soundbox?.last_announcement;
    if (!text) {
      return;
    }
    if (heardAnnouncement.current === null) {
      heardAnnouncement.current = text;
      return;
    }
    if (heardAnnouncement.current === text) {
      return;
    }
    heardAnnouncement.current = text;
    void playSoundboxClip();
  }, [soundbox?.last_announcement]);

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
      recipientCount,
      payLink,
      watchSkus,
      restocks,
      connect,
      addWatchSku,
      placeRestock,
      refresh,
      chooseSku,
      requestOffer,
      acceptLoan,
      previewCampaign,
      sendOffer,
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
      recipientCount,
      payLink,
      watchSkus,
      restocks,
      connect,
      addWatchSku,
      placeRestock,
      refresh,
      chooseSku,
      requestOffer,
      acceptLoan,
      previewCampaign,
      sendOffer,
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
