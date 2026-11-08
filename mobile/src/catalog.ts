export type ShelfItem = {
  sku: string;
  price: string;
  unit: string;
  /** Emoji fallback shown while the real image is unavailable. */
  emoji: string;
  /** Local require() handle for the product photo. Undefined when no image exists yet. */
  image?: ReturnType<typeof require>;
};

/** Shelf prices for the seeded Ramesh Kirana SKUs. Restock cost stays on the API. */
export const SHELF: ShelfItem[] = [
  { sku: "Sugar",        price: "50.00",  unit: "kg",   emoji: "🍬", image: require("../assets/products/sugar.png") },
  { sku: "Mustard oil",  price: "160.00", unit: "L",    emoji: "🫙", image: require("../assets/products/mustard_oil.png") },
  { sku: "Tea",          price: "40.00",  unit: "pack", emoji: "🍵", image: require("../assets/products/tea.png") },
  { sku: "Milk powder",  price: "120.00", unit: "pack", emoji: "🥛", image: require("../assets/products/milk_powder.png") },
  { sku: "Turmeric",     price: "30.00",  unit: "pack", emoji: "🌿" },
  { sku: "Toor dal",     price: "90.00",  unit: "kg",   emoji: "🫘", image: require("../assets/products/toor_dal.png") },
  { sku: "Rice",         price: "55.00",  unit: "kg",   emoji: "🍚", image: require("../assets/products/rice.png") },
  { sku: "Maggi",        price: "15.00",  unit: "pack", emoji: "🍜", image: require("../assets/products/maggi.png") },
  { sku: "Sunflower oil",price: "150.00", unit: "L",    emoji: "🌻", image: require("../assets/products/sunflower_oil.png") },
  { sku: "Wheat flour",  price: "42.00",  unit: "kg",   emoji: "🌾", image: require("../assets/products/wheat_flour.png") },
  { sku: "Salt",         price: "22.00",  unit: "kg",   emoji: "🧂", image: require("../assets/products/salt.png") },
  { sku: "Soap",         price: "25.00",  unit: "bar",  emoji: "🧼", image: require("../assets/products/soap.png") },
  { sku: "Biscuits",     price: "20.00",  unit: "pack", emoji: "🍪", image: require("../assets/products/biscuits.png") },
  { sku: "Chana dal",    price: "80.00",  unit: "kg",   emoji: "🫘", image: require("../assets/products/chana_dal.png") },
  { sku: "Poha",         price: "48.00",  unit: "kg",   emoji: "🥣" },
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
