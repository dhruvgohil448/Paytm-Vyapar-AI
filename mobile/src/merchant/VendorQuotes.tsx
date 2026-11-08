import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { moneyFromPaise } from "../catalog";
import { useDemo } from "../DemoContext";
import { colors, rupee } from "../theme";
import { arrivalLabel, nextDeliveryDate, quotesFor } from "../vendors";
import { PrimaryButton, SecondaryButton } from "../ui";

type Stage = "choose" | "pay" | "done";

export function VendorQuotes({
  sku,
  unitCost,
  defaultUnits,
}: {
  sku: string;
  unitCost: string;
  defaultUnits: number;
}) {
  const demo = useDemo();
  const quotes = quotesFor(unitCost);
  const [vendorId, setVendorId] = useState(quotes[0]?.id ?? "");
  const [stage, setStage] = useState<Stage>("choose");
  const [note, setNote] = useState<string | null>(null);
  const selected = quotes.find((quote) => quote.id === vendorId) ?? quotes[0];
  const placed = demo.restocks.find((order) => order.sku === sku);
  const units = Math.max(1, defaultUnits);

  if (!selected) {
    return null;
  }

  const total = selected.unitPaise * units;

  function confirmWithPaytm() {
    demo.placeRestock({
      sku,
      vendorName: selected.name,
      units,
      unitPaise: selected.unitPaise,
      totalPaise: total,
      deliveryDate: nextDeliveryDate(),
    });
    setNote(null);
    setStage("done");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>10 vendors selling {sku}</Text>
      <Text style={styles.detail}>Pick a seller, then restock. The lowest price is marked Best.</Text>
      {quotes.map((quote) => {
        const on = quote.id === selected.id;
        return (
          <Pressable
            key={quote.id}
            onPress={() => {
              setVendorId(quote.id);
              setStage("choose");
              setNote(null);
            }}
            style={[styles.row, on && styles.rowOn]}
          >
            <View style={styles.copy}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{quote.name}</Text>
                {quote.best ? <Text style={styles.best}>Best</Text> : null}
              </View>
              <Text style={styles.meta}>{quote.area}</Text>
            </View>
            <Text style={styles.price}>{rupee(moneyFromPaise(quote.unitPaise))}</Text>
          </Pressable>
        );
      })}

      {stage === "choose" ? (
        <PrimaryButton label={`Restock from ${selected.name}`} onPress={() => setStage("pay")} />
      ) : null}

      {stage === "pay" ? (
        <View style={styles.checkout}>
          <Text style={styles.kicker}>Order total</Text>
          <Text style={styles.grand}>{rupee(moneyFromPaise(total))}</Text>
          <Text style={styles.meta}>One week of {sku} from {selected.name}</Text>
          <Text style={styles.kicker}>Payment</Text>
          <SecondaryButton label="Pay on delivery" onPress={() => setNote("Pay with Paytm to confirm this order.")} />
          <PrimaryButton label="Pay with Paytm" onPress={confirmWithPaytm} />
          <SecondaryButton label="Card payment" onPress={() => setNote("Pay with Paytm to confirm this order.")} />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      ) : null}

      {stage === "done" && placed ? (
        <View style={styles.confirmed}>
          <Text style={styles.kicker}>Order confirmed</Text>
          <Text style={styles.grand}>{rupee(moneyFromPaise(placed.totalPaise))}</Text>
          <Text style={styles.meta}>Paid with Paytm · {placed.vendorName}</Text>
          <Text style={styles.arrival}>{arrivalLabel(placed.deliveryDate)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rowOn: {
    borderColor: colors.paytm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  best: {
    color: colors.green,
    backgroundColor: colors.greenBg,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
  },
  checkout: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grand: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "800",
  },
  note: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmed: {
    backgroundColor: colors.greenBg,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  arrival: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "800",
  },
});
