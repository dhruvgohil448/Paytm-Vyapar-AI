import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SEEDED_NEIGHBOURS } from "../config";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { alertColors, colors, hoursLabel, rupee } from "../theme";
import { Card, ErrorNote, PageTitle, PrimaryButton, ScreenScroll } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Home">,
  NativeStackScreenProps<MerchantStackParamList>
>;

function loanWord(status: string | undefined): string {
  if (status === "PENDING") return "Ready to accept";
  if (status === "DISBURSED") return "Disbursed";
  if (status === "REPAYING") return "Repaying";
  if (status === "SETTLED") return "Settled";
  return "Not started";
}

export function HomeScreen({ navigation }: Props) {
  const demo = useDemo();
  const urgent = demo.inventory[0];
  const low = demo.inventory.filter((item) => item.alert === "RED").length;
  const tone = urgent ? alertColors(urgent.alert) : alertColors("GREEN");

  if (demo.loading && demo.inventory.length === 0) {
    return <ActivityIndicator style={styles.loader} color={colors.paytm} />;
  }

  return (
    <ScreenScroll>
      <PageTitle title="Today" detail="The next thing that needs you is at the top." />
      <ErrorNote message={demo.error} />
      {urgent ? (
        <View style={[styles.hero, { borderLeftColor: tone.fg }]}>
          <Text style={styles.heroKicker}>Do this next</Text>
          <Text style={styles.heroTitle}>
            {urgent.sku_name} can run out in {hoursLabel(urgent.runway_hours).replace("h", " hours")}
          </Text>
          <Text style={styles.heroBody}>
            {urgent.estimated_units_remaining} units left. A week of restock costs {rupee(urgent.reorder.cost)}.
          </Text>
          <PrimaryButton
            label={`Review ${urgent.sku_name}`}
            onPress={() => {
              demo.chooseSku(urgent.sku_name);
              navigation.navigate("Credit");
            }}
          />
        </View>
      ) : (
        <Card>
          <Text style={styles.heroBody}>Stock has not loaded yet.</Text>
        </Card>
      )}

      <View style={styles.stats}>
        <Pressable style={styles.stat} onPress={() => navigation.navigate("Stock")}>
          <Text style={styles.statValue}>{low}</Text>
          <Text style={styles.statLabel}>Low stock</Text>
        </Pressable>
        <Pressable style={styles.stat} onPress={() => navigation.navigate("Credit")}>
          <Text style={styles.statValueSmall}>{loanWord(demo.offer?.status)}</Text>
          <Text style={styles.statLabel}>Loan</Text>
        </Pressable>
        <Pressable style={styles.stat} onPress={() => navigation.navigate("Offer")}>
          <Text style={styles.statValue}>{demo.recipientCount ?? SEEDED_NEIGHBOURS}</Text>
          <Text style={styles.statLabel}>Neighbours</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={styles.speaker}>Soundbox</Text>
        <Text style={styles.announcement}>{demo.soundbox?.last_announcement || "Soundbox is quiet."}</Text>
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderLeftWidth: 6,
    padding: 16,
    gap: 10,
  },
  heroKicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    minHeight: 84,
    justifyContent: "space-between",
  },
  statValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  statValueSmall: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  speaker: {
    color: colors.paytmDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  announcement: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
});
