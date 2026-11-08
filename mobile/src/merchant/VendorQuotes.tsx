import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { moneyFromPaise, shelfFor } from "../catalog";
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
  const unitLabel = shelfFor(sku)?.unit ?? "units";
  const [units, setUnits] = useState(() => Math.max(1, defaultUnits));
  const [funded, setFunded] = useState<string | null>(null);
  const [paidWith, setPaidWith] = useState<string | null>(null);

  const total = selected ? selected.unitPaise * units : 0;

  useEffect(() => {
    if (!selected) {
      return;
    }
    demo.setRestockIntent({
      sku,
      units,
      totalPaise: total,
      vendorName: selected.name,
    });
  }, [demo, selected, sku, total, units]);

  if (!selected) {
    return null;
  }

  function changeUnits(next: number) {
    if (!Number.isFinite(next)) {
      setUnits(1);
      return;
    }
    setUnits(Math.min(9999, Math.max(1, Math.round(next))));
  }

  function orderDraft() {
    return {
      sku,
      vendorName: selected.name,
      units,
      unitPaise: selected.unitPaise,
      totalPaise: total,
      deliveryDate: nextDeliveryDate(),
    };
  }

  async function confirmOnDelivery() {
    try {
      await demo.placeRestock(orderDraft());
      setFunded(null);
      setPaidWith("Pay on delivery");
      setNote(null);
      setStage("done");
    } catch {
      setNote(null);
    }
  }

  async function confirmWithPaytm() {
    try {
      const covered = await demo.confirmPaytmRestock(orderDraft());
      setFunded(covered);
      setPaidWith("Paytm");
      setNote(null);
      setStage("done");
    } catch {
      setNote(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>10 vendors selling {sku}</Text>
      <Text style={styles.detail}>Set the quantity, pick a seller, then restock. The lowest price is marked Best.</Text>
      {stage !== "done" ? (
        <QuantityField units={units} unitLabel={unitLabel} unitPrice={rupee(moneyFromPaise(selected.unitPaise))} onChange={changeUnits} />
      ) : null}
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
          <Text style={styles.meta}>
            {units} {unitLabel} of {sku} from {selected.name}
          </Text>
          <Text style={styles.kicker}>Payment</Text>
          <SecondaryButton label="Pay on delivery" onPress={confirmOnDelivery} disabled={demo.busy} />
          <PrimaryButton label="Pay with Paytm" onPress={confirmWithPaytm} disabled={demo.busy} />
          {demo.offer && demo.offer.status !== "SETTLED" ? (
            <Text style={styles.meta}>
              Paytm loan covers {rupee(demo.offer.principal_amount)} of this order.
            </Text>
          ) : (
            <Text style={styles.meta}>Finance this restock first if you want Paytm to fund the purchase.</Text>
          )}
          <SecondaryButton label="Card payment" onPress={() => setNote("Pay with Paytm to confirm this order.")} />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      ) : null}

      {stage === "done" && placed ? (
        <View style={styles.confirmed}>
          <Text style={styles.kicker}>Order confirmed</Text>
          <Text style={styles.grand}>{rupee(moneyFromPaise(placed.totalPaise))}</Text>
          <Text style={styles.meta}>
            {paidWith ?? "Paytm"} · {placed.units} {unitLabel} · {placed.vendorName}
          </Text>
          {funded ? <Text style={styles.arrival}>Paytm funded {rupee(funded)} of this restock.</Text> : null}
          <Text style={styles.arrival}>{arrivalLabel(placed.deliveryDate)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function QuantityField({
  units,
  unitLabel,
  unitPrice,
  onChange,
}: {
  units: number;
  unitLabel: string;
  unitPrice: string;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.qtyBlock}>
      <Text style={styles.kicker}>Quantity</Text>
      <View style={styles.qtyRow}>
        <Pressable style={styles.step} onPress={() => onChange(units - 1)} accessibilityLabel="Decrease quantity">
          <Text style={styles.stepLabel}>−</Text>
        </Pressable>
        <TextInput
          value={String(units)}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, "");
            onChange(digits ? Number(digits) : 1);
          }}
          keyboardType="number-pad"
          style={styles.qtyInput}
          selectTextOnFocus
          maxLength={4}
        />
        <Pressable style={styles.step} onPress={() => onChange(units + 1)} accessibilityLabel="Increase quantity">
          <Text style={styles.stepLabel}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        {unitPrice} per {unitLabel}
      </Text>
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
  qtyBlock: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  step: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  qtyInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.bg,
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
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
