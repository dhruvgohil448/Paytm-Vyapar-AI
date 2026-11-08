import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDemo } from "../DemoContext";
import { colors, rupee } from "../theme";
import { Card, ErrorNote, PageTitle, PrimaryButton, ScreenScroll } from "../ui";

export function OfferScreen() {
  const demo = useDemo();
  const [sku, setSku] = useState(demo.chosenSku ?? demo.campaign?.featured_sku ?? "Sugar");

  useEffect(() => {
    if (demo.chosenSku) {
      setSku(demo.chosenSku);
    }
  }, [demo.chosenSku]);

  const ready = demo.campaign?.featured_sku === sku;
  const capMessage = demo.error?.includes("frequency cap")
    ? "This shop can send two broadcasts in seven days. The third one is blocked."
    : null;

  return (
    <ScreenScroll>
      <PageTitle
        title="WhatsApp offer"
        detail="The message goes out on WhatsApp with a Paytm link. The discount is accepted only when the neighbour pays in the Paytm app."
      />
      <ErrorNote message={capMessage ?? demo.error} />
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
      <PrimaryButton
        label={ready ? "Message ready" : `Write offer for ${sku}`}
        disabled={demo.busy || ready}
        tone="navy"
        onPress={() => void demo.previewCampaign(sku)}
      />
      {demo.campaign ? (
        <View style={styles.chat}>
          <Text style={styles.chatTitle}>Preview · {demo.campaign.featured_sku}</Text>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{demo.campaign.whatsapp_broadcast_message}</Text>
            <Text style={styles.voucher}>Voucher {demo.campaign.redemption_passcode}</Text>
          </View>
        </View>
      ) : (
        <Card>
          <Text style={styles.quiet}>The message appears here after you write it. Sending comes after that.</Text>
        </Card>
      )}
      <PrimaryButton
        label={demo.recipientCount ? `Sent to ${demo.recipientCount} neighbours` : "Send to neighbours"}
        tone="whatsapp"
        disabled={demo.busy || !ready}
        onPress={() => void demo.sendOffer()}
      />
      <Text style={styles.quiet}>
        {demo.recipientCount
          ? "You can send one more time this week. A third send will be refused."
          : "Opted-in neighbours only. The list has 120 people."}
      </Text>
      {demo.payLink ? (
        <Card>
          <Text style={styles.kicker}>Link in the message</Text>
          <Text selectable style={styles.link}>
            {demo.payLink}
          </Text>
          <Text style={styles.quiet}>Opens in Paytm. The offer applies only if that payment comes from the Paytm app.</Text>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.kicker}>Paytm receipts</Text>
        {demo.ledger && demo.ledger.entries.length > 0 ? (
          demo.ledger.entries.map((entry) => (
            <View key={entry.entry_id} style={styles.entry}>
              <Text style={styles.line}>Collected {rupee(entry.gross_amount)}</Text>
              <Text style={styles.quiet}>
                Loan {rupee(entry.loan_deduction)} · Shop keeps {rupee(entry.merchant_net)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.quiet}>Receipts show up here after a neighbour pays through the Paytm link.</Text>
        )}
        {demo.soundbox?.last_announcement ? <Text style={styles.announcement}>{demo.soundbox.last_announcement}</Text> : null}
      </Card>
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
    backgroundColor: colors.whatsapp,
    borderColor: colors.whatsapp,
  },
  chipText: {
    color: colors.ink,
    fontWeight: "700",
  },
  chipTextOn: {
    color: "#FFFFFF",
  },
  chat: {
    backgroundColor: colors.chat,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  chatTitle: {
    color: colors.whatsapp,
    fontWeight: "800",
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: colors.bubble,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    gap: 8,
  },
  bubbleText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  voucher: {
    color: colors.whatsapp,
    fontWeight: "800",
  },
  quiet: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  link: {
    color: colors.navy,
    fontSize: 13,
    lineHeight: 18,
  },
  line: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  entry: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 2,
  },
  announcement: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
});
