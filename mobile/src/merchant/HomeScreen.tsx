import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { fetchCreditQuote } from "../api";
import { shelfFor } from "../catalog";
import { SEEDED_NEIGHBOURS } from "../config";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { alertColors, cardShadow, colors, rupee } from "../theme";
import type { CreditQuote, ForecastItem } from "../types";
import { arrivalLabel } from "../vendors";
import { ErrorNote, PrimaryButton, ScreenScroll } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Home">,
  NativeStackScreenProps<MerchantStackParamList>
>;

function quantityLabel(value: string, unit: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return `${value} ${unit}`;
  }
  const shown = Number.isInteger(amount)
    ? amount.toLocaleString("en-IN")
    : amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${shown} ${unit}`;
}

function demandSentence(factors: string[]): string | null {
  const named = factors
    .filter((factor) => factor !== "baseline")
    .map((factor) => factor.charAt(0).toUpperCase() + factor.slice(1));
  if (named.length === 0) {
    return null;
  }
  if (named.length === 1) {
    return `${named[0]} demand is lifting sales.`;
  }
  const last = named[named.length - 1];
  return `${named.slice(0, -1).join(", ")} and ${last} demand is lifting sales.`;
}

function skuInText(text: string, names: string[]): string | null {
  const haystack = text.toLowerCase();
  const hits = names.filter((name) => haystack.includes(name.toLowerCase()));
  hits.sort((left, right) => right.length - left.length);
  return hits[0] ?? null;
}

function nameList(items: ForecastItem[]): string {
  if (items.length === 0) {
    return "None";
  }
  const shown = items.slice(0, 2).map((item) => item.sku_name);
  const extra = items.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
}

export function HomeScreen({ navigation }: Props) {
  const demo = useDemo();
  const urgent = demo.inventory[0];
  const reds = demo.inventory.filter((item) => item.alert === "RED");
  const yellows = demo.inventory.filter((item) => item.alert === "YELLOW");
  const tone = urgent ? alertColors(urgent.alert) : alertColors("GREEN");
  const shelf = urgent ? shelfFor(urgent.sku_name) : undefined;
  const demand = urgent ? demandSentence(urgent.demand_factors) : null;
  const hours = urgent ? Math.round(Number(urgent.runway_hours)) : 0;
  const [quote, setQuote] = useState<CreditQuote | null>(null);
  const announcement = demo.soundbox?.last_announcement ?? "";
  const announcedSku = skuInText(announcement, demo.inventory.map((item) => item.sku_name));
  const offer = demo.offer;
  const loanValue = offer && offer.status !== "SETTLED" ? rupee(offer.outstanding_balance) : "Clear";
  const loanLabel = !offer ? "No loan" : offer.status === "PENDING" ? "Ready to accept" : offer.status === "SETTLED" ? "Settled" : "Outstanding";

  useEffect(() => {
    if (!urgent) {
      setQuote(null);
      return undefined;
    }
    let alive = true;
    setQuote(null);
    fetchCreditQuote(urgent.sku_name)
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
  }, [urgent]);

  if (demo.loading && demo.inventory.length === 0) {
    return <ActivityIndicator style={styles.loader} color={colors.paytm} />;
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <ScreenScroll>
      <View style={styles.heading}>
        <Text style={styles.kicker}>{today}</Text>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.detail}>{demand ?? "The next thing that needs you is at the top."}</Text>
      </View>
      <ErrorNote message={demo.error} />

      {urgent ? (
        <View style={[styles.hero, { backgroundColor: tone.bg }, cardShadow]}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroKicker, { color: tone.fg }]}>Do this next</Text>
              <Text style={[styles.hours, { color: tone.fg }]}>{Number.isNaN(hours) ? urgent.runway_hours : `${hours} hours`}</Text>
              <Text style={styles.heroTitle}>{urgent.sku_name} can run out</Text>
              <Text style={styles.heroBody}>{quantityLabel(urgent.estimated_units_remaining, shelf?.unit ?? "units")} left on the shelf.</Text>
            </View>
            <View style={styles.photo}>
              {shelf?.image ? (
                <Image source={shelf.image} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <Text style={styles.photoEmoji}>{shelf?.emoji ?? "📦"}</Text>
              )}
            </View>
          </View>
          <PrimaryButton label={`Restock ${urgent.sku_name}`} onPress={() => navigation.navigate("Product", { sku: urgent.sku_name })} />
          <Pressable
            onPress={() => {
              demo.chooseSku(urgent.sku_name);
              navigation.navigate("Credit");
            }}
          >
            <Text style={styles.fund}>
              {quote ? `Paytm can fund ${rupee(quote.suggested_amount)} of this restock` : "See what Paytm can fund"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.hero, cardShadow]}>
          <Text style={styles.heroBody}>Stock has not loaded yet.</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>On the way</Text>
        {demo.restocks.length === 0 ? (
          <Text style={styles.quiet}>No delivery yet. A Paytm restock shows up here with its arrival day.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {demo.restocks.map((order) => {
              const orderShelf = shelfFor(order.sku);
              return (
                <Pressable key={order.id} style={[styles.delivery, cardShadow]} onPress={() => navigation.navigate("Product", { sku: order.sku })}>
                  <Text style={styles.deliveryWhen}>{arrivalLabel(order.deliveryDate)}</Text>
                  <Text style={styles.deliverySku}>{order.sku}</Text>
                  <Text style={styles.deliveryMeta}>
                    {order.units} {orderShelf?.unit ?? "units"} · {order.vendorName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.stats}>
        <Pressable style={[styles.stat, cardShadow]} onPress={() => navigation.navigate("Stock")}>
          <Text style={[styles.statValue, { color: colors.red }]}>{reds.length}</Text>
          <Text style={styles.statLabel}>Low · {yellows.length} soon</Text>
          <Text style={styles.statNames}>{nameList(reds)}</Text>
        </Pressable>
        <Pressable style={[styles.stat, cardShadow]} onPress={() => navigation.navigate("Credit")}>
          <Text style={styles.statMoney}>{loanValue}</Text>
          <Text style={styles.statLabel}>{loanLabel}</Text>
          <Text style={styles.statNames}>Paytm loan</Text>
        </Pressable>
        <Pressable style={[styles.stat, cardShadow]} onPress={() => navigation.navigate("Offer")}>
          <Text style={styles.statValue}>{demo.recipientCount ?? "—"}</Text>
          <Text style={styles.statLabel}>{demo.recipientCount ? "Messaged" : "Not sent"}</Text>
          <Text style={styles.statNames}>{demo.recipientCount ? "WhatsApp sent" : `${SEEDED_NEIGHBOURS} ready`}</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.speakerCard, cardShadow]}
        disabled={!announcedSku}
        onPress={() => {
          if (announcedSku) {
            navigation.navigate("Product", { sku: announcedSku });
          }
        }}
      >
        <Text style={styles.speaker}>Soundbox</Text>
        <Text style={styles.announcement}>{announcement || "Soundbox is quiet."}</Text>
        {announcedSku ? <Text style={styles.openLink}>Open {announcedSku}</Text> : null}
      </Pressable>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  heading: {
    gap: 2,
  },
  kicker: {
    color: colors.paytmDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  hero: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  hours: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  heroBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: colors.card,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoEmoji: {
    fontSize: 40,
  },
  fund: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
  },
  openLink: {
    color: colors.paytm,
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  quiet: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  strip: {
    gap: 10,
    paddingRight: 4,
  },
  delivery: {
    width: 210,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  deliveryWhen: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  deliverySku: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  deliveryMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    minHeight: 108,
    gap: 4,
  },
  statValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  statMoney: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  statNames: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  speakerCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  speaker: {
    color: colors.paytm,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  announcement: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
});
