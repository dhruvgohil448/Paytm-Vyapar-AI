from decimal import Decimal

# Selling prices for the seeded Ramesh Kirana SKUs. Keep in step with mobile/src/catalog.ts.
SHELF_PRICE: dict[str, Decimal] = {
    "Sugar": Decimal("50.00"),
    "Mustard oil": Decimal("160.00"),
    "Tea": Decimal("40.00"),
    "Milk powder": Decimal("120.00"),
    "Turmeric": Decimal("30.00"),
    "Toor dal": Decimal("90.00"),
    "Rice": Decimal("55.00"),
    "Maggi": Decimal("15.00"),
    "Sunflower oil": Decimal("150.00"),
    "Wheat flour": Decimal("42.00"),
    "Salt": Decimal("22.00"),
    "Soap": Decimal("25.00"),
    "Biscuits": Decimal("20.00"),
    "Chana dal": Decimal("80.00"),
    "Poha": Decimal("48.00"),
}
