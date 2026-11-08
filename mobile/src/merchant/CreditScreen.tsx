import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fetchCreditQuote } from "../api";
import { moneyFromPaise } from "../catalog";
import { useDemo } from "../DemoContext";
import { colors, rupee } from "../theme";
import type { CreditQuote } from "../types";
import { Card, ErrorNote, PageTitle, PrimaryButton, ScreenScroll } from "../ui";

const FACTOR_LINE = {
  purchase: "This purchase is smaller than what the sales and stock would allow.",
  assets: "The stock already on the shelf is the limit.",
  sales: "Recent sales are the limit.",
  preapproved: "The Paytm cap for this shop is the limit.",
};

export function CreditScreen() {
  const demo = useDemo();
  const [sku, setSku] = useState(demo.chosenSku ?? "Sugar");
  const [quote, setQuote] = useState<CreditQuote | null>(null);

  useEffect(() => {
    if (demo.chosenSku) {
      setSku(demo.chosenSku);
    }
  }, [demo.chosenSku]);

  const intent = demo.restockIntent?.sku === sku ? demo.restockIntent : null;
  const purchase = intent ? moneyFromPaise(intent.totalPaise) : null;
  const loanOpen = demo.offer?.status === "DISBURSED" || demo.offer?.status === "REPAYING" || demo.offer?.status === "SETTLED";

  useEffect(() => {
    let alive = true;
    setQuote(null);
    fetchCreditQuote(sku, purchase)
      .then((next) => {
        if (alive) {
          setQuote(next);
        }
      })
      .catch(() => {
        if (alive) {
          setQuote(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [purchase, sku]);

  return (
    <ScreenScroll>
      <PageTitle
        title="Restock credit"
        detail="Paytm reads your sales and the stock on the shelf, then suggests a loan for this restock."
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
      {quote ? (
        <Card>
          <Text style={styles.kicker}>Paytm record</Text>
          <Text style={styles.line}>Sales in 30 days {rupee(quote.sales_30d)}</Text>
          <Text style={styles.line}>15% of those sales {rupee(quote.sales_limit)}</Text>
          <Text style={styles.line}>Stock on the shelf {rupee(quote.asset_value)}</Text>
          <Text style={styles.line}>
            {intent
              ? `This purchase from ${intent.vendorName} ${rupee(quote.purchase_amount)}`
              : `One week of ${sku} ${rupee(quote.purchase_amount)}`}
          </Text>
          <Text style={styles.line}>Paytm cap {rupee(quote.preapproved_limit)}</Text>
          <Text style={styles.amount}>{rupee(quote.suggested_amount)}</Text>
          <Text style={styles.hint}>Paytm can lend this for the restock. {FACTOR_LINE[quote.limiting_factor]}</Text>
        </Card>
      ) : null}
      {!demo.offer ? (
        <PrimaryButton
          label={demo.busy ? "Checking…" : quote ? `See Paytm offer of ${rupee(quote.suggested_amount)}` : "Reading your record…"}
          disabled={demo.busy || !quote || quote.suggested_amount === "0.00"}
          onPress={() => void demo.requestOffer(sku, purchase)}
        />
      ) : null}
      {demo.offer ? (
        <Card>
          <Text style={styles.kicker}>{demo.offer.status}</Text>
          <Text style={styles.amount}>{rupee(demo.offer.principal_amount)}</Text>
          <Text style={styles.line}>{rupee(demo.offer.interest_per_day)} a day · {demo.offer.distributor_name}</Text>
          <Text style={styles.line}>
            {demo.offer.split_deduction_percentage}% of each receipt repays the loan. Outstanding {rupee(demo.offer.outstanding_balance)}.
          </Text>
          <Text style={styles.line}>Choosing another product does not open a second loan or change this amount.</Text>
          {quote && quote.suggested_amount !== demo.offer.principal_amount ? (
            <Text style={styles.line}>
              A fresh reading is {rupee(quote.suggested_amount)}. That amount is available after this balance reaches zero.
            </Text>
          ) : null}
          {loanOpen ? (
            <Text style={styles.ok}>This loan is open. A second product can be financed after the balance reaches zero.</Text>
          ) : (
            <PrimaryButton label="Accept and send to distributor" disabled={demo.busy} onPress={() => void demo.acceptLoan()} />
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.line}>Nothing is borrowed until you accept. Pay with Paytm on the restock draws this loan.</Text>
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
