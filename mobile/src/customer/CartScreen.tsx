import { Pressable, StyleSheet, Text, View } from "react-native";

import { linePaise, moneyFromPaise, SHELF, shelfFor } from "../catalog";
import { useDemo } from "../DemoContext";
import type { PaymentSource } from "../types";
import { colors, rupee } from "../theme";
import { Card, ErrorNote, PageTitle, PrimaryButton, ScreenScroll, SecondaryButton } from "../ui";

const SOURCES: { source: PaymentSource; label: string }[] = [
  { source: "PHONEPE", label: "Pay with PhonePe" },
  { source: "GPAY", label: "Pay with Google Pay" },
  { source: "BHIM", label: "Pay with BHIM" },
];

export function CartScreen() {
  const demo = useDemo();
  const billPaise = Object.entries(demo.cart).reduce((sum, [sku, qty]) => sum + linePaise(sku, qty), 0);
  const featuredSku = demo.campaign?.featured_sku;
  const featuredPaise = featuredSku ? linePaise(featuredSku, demo.cart[featuredSku] ?? 0) : 0;
  const minimumPaise = demo.campaign ? Math.round(Number(demo.campaign.minimum_order_value) * 100) : 20000;
  const shortfall = Math.max(minimumPaise - billPaise, 0);
  const canPay = Boolean(demo.campaign) && billPaise >= minimumPaise && !demo.busy;
  const applied = demo.lastPayment?.is_discount_applied === true && Number(demo.lastPayment.discount_amount) > 0;
  const latest = demo.ledger?.entries[demo.ledger.entries.length - 1];

  return (
    <ScreenScroll>
      <PageTitle title="Basket" detail="Add the featured product if you want the Paytm discount on that line." />
      <ErrorNote message={demo.error} />
      <SecondaryButton label="Sample basket · Sugar and biscuits · ₹200" onPress={demo.fillSampleBasket} />
      {SHELF.map((item) => {
        const qty = demo.cart[item.sku] ?? 0;
        const featured = item.sku === featuredSku;
        return (
          <View key={item.sku} style={[styles.row, featured && styles.featured]}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.sku}</Text>
              <Text style={styles.meta}>
                {rupee(item.price)} / {item.unit}
                {featured ? " · in the offer" : ""}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable style={styles.step} onPress={() => demo.setQty(item.sku, qty - 1)}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{qty}</Text>
              <Pressable style={styles.step} onPress={() => demo.setQty(item.sku, qty + 1)}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Card>
        <Text style={styles.total}>Bill {rupee(moneyFromPaise(billPaise))}</Text>
        <Text style={styles.meta}>
          {featuredSku && shelfFor(featuredSku)
            ? `${featuredSku} in this bill: ${rupee(moneyFromPaise(featuredPaise))}`
            : "No offer is active yet."}
        </Text>
        {!demo.campaign ? <Text style={styles.meta}>Send the WhatsApp offer before paying.</Text> : null}
        {demo.campaign && shortfall > 0 ? (
          <Text style={styles.meta}>Add {rupee(moneyFromPaise(shortfall))} more to reach the ₹{Number(demo.campaign.minimum_order_value)} minimum.</Text>
        ) : null}
        {demo.offer?.status === "PENDING" ? (
          <Text style={styles.meta}>Accept the restock loan on the merchant Credit tab so this payment repays it.</Text>
        ) : null}
        <PrimaryButton label="Pay with Paytm" disabled={!canPay} onPress={() => void demo.pay("PAYTM_CONSUMER_APP")} />
        {SOURCES.map((item) => (
          <SecondaryButton key={item.source} label={item.label} disabled={!canPay} onPress={() => void demo.pay(item.source)} />
        ))}
      </Card>
      {demo.lastPayment ? (
        <View style={[styles.result, applied ? styles.resultOn : styles.resultOff]}>
          <Text style={styles.resultTitle}>{applied ? "Paytm discount applied" : "Full price"}</Text>
          <Text style={styles.resultBody}>{demo.lastPayment.message}</Text>
          <Text style={styles.resultPay}>Pay {rupee(demo.lastPayment.payable_amount)}</Text>
          {demo.lastPayment.announcement ? <Text style={styles.resultBody}>{demo.lastPayment.announcement}</Text> : null}
        </View>
      ) : null}
      {latest ? (
        <Card>
          <Text style={styles.meta}>Latest split</Text>
          <Text style={styles.line}>
            Collected {rupee(latest.gross_amount)} · Loan {rupee(latest.loan_deduction)} · Shop {rupee(latest.merchant_net)}
          </Text>
        </Card>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featured: {
    borderWidth: 1.5,
    borderColor: colors.paytm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E7F6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
  },
  qty: {
    minWidth: 18,
    textAlign: "center",
    color: colors.ink,
    fontWeight: "800",
    fontSize: 16,
  },
  total: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  line: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  result: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  resultOn: {
    backgroundColor: colors.greenBg,
  },
  resultOff: {
    backgroundColor: colors.yellowBg,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  resultBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  resultPay: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
  },
});
