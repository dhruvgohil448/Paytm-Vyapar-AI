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
import { ErrorNote, PrimaryButton } from "../ui";

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

function shortLine(alert: string): string {
  if (alert === "RED") {
    return "is short";
  }
  if (alert === "YELLOW") {
    return "is getting close";
  }
  return "can wait";
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
  const loanOpen = offer && offer.status !== "SETTLED";
  const loanValue = loanOpen ? rupee(offer.outstanding_balance) : "None";
  const loanLabel = !offer ? "Nothing open" : offer.status === "PENDING" ? "Ready" : offer.status === "SETTLED" ? "Settled" : "Outstanding";

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

  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const watch = [...reds, ...yellows].filter((item) => item.sku_name !== urgent?.sku_name).slice(0, 8);
  const shelfRow = watch.length > 0 ? watch : demo.inventory.filter((item) => item.sku_name !== urgent?.sku_name).slice(0, 6);
  const runway = Math.max(0.08, Math.min(1, (Number.isNaN(hours) ? 0 : hours) / 72));
  const offerCount = demo.recipientCount ?? SEEDED_NEIGHBOURS;

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {urgent ? (
        <View style={styles.hero}>
          <Text style={styles.date}>{today}</Text>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                {urgent.sku_name} {shortLine(urgent.alert)}
              </Text>
              <Text style={styles.heroBody}>
                {quantityLabel(urgent.estimated_units_remaining, shelf?.unit ?? "units")} left
                {Number.isNaN(hours) ? "" : `, about ${hours} hours`}
              </Text>
              {demand ? <Text style={styles.heroDemand}>{demand}</Text> : null}
            </View>
            <View style={styles.photo}>
              {shelf?.image ? (
                <Image source={shelf.image} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <Text style={styles.photoEmoji}>{shelf?.emoji ?? "📦"}</Text>
              )}
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${runway * 100}%`, backgroundColor: tone.fg }]} />
          </View>
          <PrimaryButton label={`Restock ${urgent.sku_name}`} onPress={() => navigation.navigate("Product", { sku: urgent.sku_name })} />
          <Pressable
            onPress={() => {
              demo.chooseSku(urgent.sku_name);
              navigation.navigate("Credit");
            }}
          >
            <Text style={styles.fund}>
              {quote ? `Paytm can cover ${rupee(quote.suggested_amount)} of this order` : "Check what Paytm can cover"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Stock has not loaded yet.</Text>
        </View>
      )}

      <View style={styles.body}>
        <ErrorNote message={demo.error} />

        {shelfRow.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{watch.length > 0 ? "Also on watch" : "On the shelf"}</Text>
              <Pressable onPress={() => navigation.navigate("Stock")}>
                <Text style={styles.sectionLink}>All stock</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {shelfRow.map((item) => {
                const itemShelf = shelfFor(item.sku_name);
                const itemTone = alertColors(item.alert);
                const itemHours = Math.round(Number(item.runway_hours));
                return (
                  <Pressable
                    key={item.inventory_id}
                    style={styles.chip}
                    onPress={() => navigation.navigate("Product", { sku: item.sku_name })}
                  >
                    <View style={styles.chipPhoto}>
                      {itemShelf?.image ? (
                        <Image source={itemShelf.image} style={styles.photoImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.chipEmoji}>{itemShelf?.emoji ?? "📦"}</Text>
                      )}
                    </View>
                    <Text style={styles.chipName} numberOfLines={1}>
                      {item.sku_name}
                    </Text>
                    <Text style={[styles.chipHours, { color: itemTone.fg }]}>
                      {Number.isNaN(itemHours) ? item.runway_hours : `${itemHours}h`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.till, cardShadow]}>
          <Pressable style={styles.tillCell} onPress={() => navigation.navigate("Stock")}>
            <Text style={[styles.tillValue, { color: reds.length > 0 ? colors.red : colors.ink }]}>{reds.length}</Text>
            <Text style={styles.tillLabel}>Short</Text>
            <Text style={styles.tillSub} numberOfLines={1}>
              {yellows.length} close
            </Text>
          </Pressable>
          <View style={styles.tillRule} />
          <Pressable style={styles.tillCell} onPress={() => navigation.navigate("Credit")}>
            <Text style={styles.tillMoney} numberOfLines={1}>
              {loanValue}
            </Text>
            <Text style={styles.tillLabel}>Loan</Text>
            <Text style={styles.tillSub} numberOfLines={1}>
              {loanLabel}
            </Text>
          </Pressable>
          <View style={styles.tillRule} />
          <Pressable style={styles.tillCell} onPress={() => navigation.navigate("Offer")}>
            <Text style={styles.tillValue}>{offerCount}</Text>
            <Text style={styles.tillLabel}>{demo.recipientCount ? "Sent" : "Neighbours"}</Text>
            <Text style={styles.tillSub} numberOfLines={1}>
              {demo.recipientCount ? "WhatsApp" : "Offer waiting"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.box, cardShadow]}
          disabled={!announcedSku}
          onPress={() => {
            if (announcedSku) {
              navigation.navigate("Product", { sku: announcedSku });
            }
          }}
        >
          <View style={[styles.live, demo.soundbox?.online === false && styles.liveOff]} />
          <View style={styles.boxCopy}>
            <Text style={styles.boxName}>Soundbox {demo.soundbox?.online === false ? "offline" : "at the counter"}</Text>
            <Text style={styles.announcement}>{announcement || "Nothing new from the speaker."}</Text>
            {announcedSku ? <Text style={styles.openLink}>{announcedSku}</Text> : null}
          </View>
        </Pressable>

        {demo.restocks.length === 0 ? (
          <Text style={styles.quiet}>No order on the way today.</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Arriving</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {demo.restocks.map((order) => {
                const orderShelf = shelfFor(order.sku);
                return (
                  <Pressable
                    key={order.id}
                    style={[styles.delivery, cardShadow]}
                    onPress={() => navigation.navigate("Product", { sku: order.sku })}
                  >
                    <View style={styles.deliveryPhoto}>
                      {orderShelf?.image ? (
                        <Image source={orderShelf.image} style={styles.photoImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.chipEmoji}>{orderShelf?.emoji ?? "📦"}</Text>
                      )}
                    </View>
                    <View style={styles.deliveryCopy}>
                      <Text style={styles.deliveryWhen}>{arrivalLabel(order.deliveryDate)}</Text>
                      <Text style={styles.deliverySku}>{order.sku}</Text>
                      <Text style={styles.deliveryMeta}>
                        {order.units} {orderShelf?.unit ?? "units"} · {order.vendorName}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  page: {
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 14,
  },
  date: {
    color: "#9FB3C8",
    fontSize: 13,
    fontWeight: "700",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroBody: {
    color: "#D9E2EC",
    fontSize: 15,
    lineHeight: 21,
  },
  heroDemand: {
    color: colors.paytm,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.paytm,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoEmoji: {
    fontSize: 42,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 999,
  },
  fund: {
    color: colors.paytm,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    padding: 16,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionLink: {
    color: colors.paytmDark,
    fontSize: 14,
    fontWeight: "800",
  },
  strip: {
    gap: 12,
    paddingRight: 4,
  },
  chip: {
    width: 84,
    gap: 6,
  },
  chipPhoto: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: colors.card,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipEmoji: {
    fontSize: 32,
  },
  chipName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  chipHours: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: -2,
  },
  till: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  tillCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
  },
  tillRule: {
    width: 1,
    backgroundColor: colors.line,
  },
  tillValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  tillMoney: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tillLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  tillSub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  quiet: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  delivery: {
    width: 240,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  deliveryPhoto: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryCopy: {
    flex: 1,
    gap: 2,
  },
  deliveryWhen: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  deliverySku: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  deliveryMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.line,
  },
  live: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    marginTop: 5,
  },
  liveOff: {
    backgroundColor: colors.red,
  },
  boxCopy: {
    flex: 1,
    gap: 4,
  },
  boxName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  announcement: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  openLink: {
    color: colors.paytmDark,
    fontSize: 14,
    fontWeight: "800",
  },
});
