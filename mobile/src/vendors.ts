import { paise, SHELF } from "./catalog";

export type Wholesaler = {
  id: string;
  name: string;
  area: string;
  factor: number;
  /** Shop photo — undefined when image has not been generated yet. */
  image?: ReturnType<typeof require>;
};

/** Demo wholesalers. Prices are a factor of the shop's restock cost from the API. */
export const WHOLESALERS: Wholesaler[] = [
  { id: "dadar",        name: "Dadar Super Stockist",  area: "Dadar",           factor: 0.86 },
  { id: "masjid",      name: "Masjid Bunder Grains",  area: "Masjid Bunder",   factor: 0.91 },
  { id: "crawford",    name: "Crawford Wholesale",     area: "Crawford Market", factor: 0.94 },
  { id: "lalbaug",     name: "Lalbaug Oil Depot",      area: "Lalbaug",         factor: 0.97 },
  { id: "parel",       name: "Parel Kirana Mandi",     area: "Parel",           factor: 1    },
  { id: "grant",       name: "Grant Road Traders",     area: "Grant Road",      factor: 1.03 },
  { id: "byculla",     name: "Byculla Supply",         area: "Byculla",         factor: 1.06 },
  { id: "worli",       name: "Worli Dry Goods",        area: "Worli",           factor: 1.09 },
  { id: "elphinstone", name: "Elphinstone Depot",      area: "Elphinstone",     factor: 1.12 },
  { id: "sewri",       name: "Sewri Staples",          area: "Sewri",           factor: 1.16 },
];

export type VendorQuote = {
  id: string;
  name: string;
  area: string;
  unitPaise: number;
  best: boolean;
};

export type RestockOrder = {
  id: string;
  sku: string;
  vendorName: string;
  units: number;
  unitPaise: number;
  totalPaise: number;
  deliveryDate: string;
};

function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function nextDeliveryDate(): string {
  return localDate(1);
}

export function arrivalLabel(iso: string): string {
  const today = localDate(0);
  const tomorrow = localDate(1);
  if (iso === today) {
    return "Arriving today";
  }
  if (iso === tomorrow) {
    return "Arriving tomorrow";
  }
  const [year, month, day] = iso.split("-").map(Number);
  const when = new Date(year, month - 1, day);
  return `Arriving ${when.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function quotesFor(unitCost: string): VendorQuote[] {
  const base = paise(unitCost);
  const rows = WHOLESALERS.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    area: vendor.area,
    unitPaise: Math.max(100, Math.round(base * vendor.factor)),
    best: false,
  }));
  rows.sort((left, right) => left.unitPaise - right.unitPaise);
  if (rows[0]) {
    rows[0].best = true;
  }
  return rows;
}

export type PricedItem = {
  sku: string;
  unit: string;
  emoji: string;
  image?: ReturnType<typeof require>;
  unitPaise: number;
};

/** Returns all SHELF products priced for a vendor's factor. */
export function pricedItems(factor: number): PricedItem[] {
  return SHELF.map((item) => ({
    sku: item.sku,
    unit: item.unit,
    emoji: item.emoji,
    image: item.image,
    unitPaise: Math.max(100, Math.round(paise(item.price) * factor)),
  }));
}
