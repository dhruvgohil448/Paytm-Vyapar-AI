import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDemo } from "../DemoContext";
import { colors, rupee } from "../theme";
import { Card, ErrorNote, PageTitle, PrimaryButton, ScreenScroll } from "../ui";

export function CreditScreen() {
  const demo = useDemo();
  const [sku, setSku] = useState(demo.chosenSku ?? "Sugar");

  useEffect(() => {
    if (demo.chosenSku) {
      setSku(demo.chosenSku);
    }
  }, [demo.chosenSku]);

  const selected = demo.inventory.find((item) => item.sku_name === sku);
  const fullLimit = selected ? Number(selected.reorder.cost) >= 15000 : false;
  const loanOpen = demo.offer?.status === "DISBURSED" || demo.offer?.status === "REPAYING" || demo.offer?.status === "SETTLED";

  return (
    <ScreenScroll>
      <PageTitle
        title="Restock credit"
        detail="One loan at a time. The amount is the smaller of ₹15,000, 15% of recent sales, and one week of restock."
      />
      <ErrorNote message={demo.error} />
      <View style={styles.chips}>
        {demo.inventory.map((item) => {
          const on = item.sku_name === sku;
          return (
            <Pressable key={item.inventory_id} onPress={() => setSku(item.sku_name)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.sku_name}</Text>
            </Pressable>
          );
        })}
      </View>
      {fullLimit ? <Text style={styles.hint}>{sku} is large enough to use the full ₹15,000 limit.</Text> : null}
      <PrimaryButton
        label={demo.busy ? "Checking…" : `See offer for ${sku}`}
        disabled={demo.busy}
        onPress={() => void demo.requestOffer(sku)}
      />
      {demo.offer ? (
        <Card>
          <Text style={styles.kicker}>{demo.offer.status}</Text>
          <Text style={styles.amount}>{rupee(demo.offer.principal_amount)}</Text>
          <Text style={styles.line}>{rupee(demo.offer.interest_per_day)} a day · {demo.offer.distributor_name}</Text>
          <Text style={styles.line}>
            {demo.offer.split_deduction_percentage}% of each receipt repays the loan. Outstanding {rupee(demo.offer.outstanding_balance)}.
          </Text>
          <Text style={styles.line}>Choosing another product does not open a second loan or change this amount.</Text>
          {loanOpen ? (
            <Text style={styles.ok}>This loan is open. A second product can be financed after the balance reaches zero.</Text>
          ) : (
            <PrimaryButton label="Accept and send to distributor" disabled={demo.busy} onPress={() => void demo.acceptLoan()} />
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.line}>Pick a product, then ask for the offer. Nothing is borrowed until you accept.</Text>
        </Card>
      )}
      {demo.ledger && demo.ledger.entries.length > 0 ? (
        <Card>
          <Text style={styles.kicker}>Receipts</Text>
          {demo.ledger.entries.map((entry) => (
            <View key={entry.entry_id} style={styles.entry}>
              <Text style={styles.line}>Collected {rupee(entry.gross_amount)}</Text>
              <Text style={styles.meta}>Loan {rupee(entry.loan_deduction)} · Shop keeps {rupee(entry.merchant_net)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    color: colors.ink,
    fontWeight: "700",
  },
  chipTextOn: {
    color: "#FFFFFF",
  },
  hint: {
    color: colors.green,
    fontWeight: "700",
    fontSize: 14,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  amount: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "800",
  },
  line: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  ok: {
    color: colors.green,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  entry: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 2,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
});
