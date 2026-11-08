export type ShelfItem = {
  sku: string;
  price: string;
  unit: string;
};

/** Shelf prices for the seeded Ramesh Kirana SKUs. Restock cost stays on the API. */
export const SHELF: ShelfItem[] = [
  { sku: "Sugar", price: "50.00", unit: "kg" },
  { sku: "Mustard oil", price: "160.00", unit: "L" },
  { sku: "Tea", price: "40.00", unit: "pack" },
  { sku: "Milk powder", price: "120.00", unit: "pack" },
  { sku: "Turmeric", price: "30.00", unit: "pack" },
  { sku: "Toor dal", price: "90.00", unit: "kg" },
  { sku: "Rice", price: "55.00", unit: "kg" },
  { sku: "Maggi", price: "15.00", unit: "pack" },
  { sku: "Sunflower oil", price: "150.00", unit: "L" },
  { sku: "Wheat flour", price: "42.00", unit: "kg" },
  { sku: "Salt", price: "22.00", unit: "kg" },
  { sku: "Soap", price: "25.00", unit: "bar" },
  { sku: "Biscuits", price: "20.00", unit: "pack" },
  { sku: "Chana dal", price: "80.00", unit: "kg" },
  { sku: "Poha", price: "48.00", unit: "kg" },
];

export function shelfFor(sku: string): ShelfItem | undefined {
  return SHELF.find((item) => item.sku === sku);
}

export function paise(value: string): number {
  return Math.round(Number(value) * 100);
}

export function linePaise(sku: string, qty: number): number {
  const item = shelfFor(sku);
  if (!item || qty <= 0) {
    return 0;
  }
  return paise(item.price) * qty;
}

export function moneyFromPaise(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
