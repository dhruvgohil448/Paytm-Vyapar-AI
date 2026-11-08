import { StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { useDemo } from "../DemoContext";
import type { CustomerTabParamList } from "../navigation";
import { colors } from "../theme";
import { Card, PageTitle, PrimaryButton, ScreenScroll } from "../ui";

type Props = BottomTabScreenProps<CustomerTabParamList, "Inbox">;

export function InboxScreen({ navigation }: Props) {
  const demo = useDemo();
  return (
    <ScreenScroll>
      <PageTitle title="Offer" detail="This is the message a neighbour receives on WhatsApp." />
      <View style={styles.chat}>
        <Text style={styles.chatTitle}>Ramesh Kirana</Text>
        {demo.campaign ? (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{demo.campaign.whatsapp_broadcast_message}</Text>
            <Text style={styles.voucher}>Voucher {demo.campaign.redemption_passcode}</Text>
            <Text style={styles.meta}>Minimum bill {`₹${Number(demo.campaign.minimum_order_value).toLocaleString("en-IN")}`}</Text>
          </View>
        ) : (
          <Text style={styles.empty}>No offer yet. Send one from the merchant Offer tab.</Text>
        )}
      </View>
      {demo.campaign ? (
        <Card>
          <Text style={styles.line}>
            {demo.campaign.discount_percentage}% off {demo.campaign.featured_sku} when the bill is paid in the Paytm app.
            PhonePe, Google Pay, and BHIM stay at full price.
          </Text>
          <PrimaryButton label="Open the basket" onPress={() => navigation.navigate("Cart")} />
        </Card>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  chat: {
    backgroundColor: colors.chat,
    borderRadius: 18,
    padding: 14,
    minHeight: 140,
    gap: 10,
  },
  chatTitle: {
    color: colors.whatsapp,
    fontWeight: "800",
    fontSize: 16,
  },
  bubble: {
    alignSelf: "flex-start",
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
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  line: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
