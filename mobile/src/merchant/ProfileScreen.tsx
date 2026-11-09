import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { fetchMerchant } from "../api";
import { shelfFor } from "../catalog";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList } from "../navigation";
import { alertColors, cardShadow, colors, rupee } from "../theme";
import type { MerchantProfile } from "../types";
import { BackButton, ErrorNote } from "../ui";

type Props = NativeStackScreenProps<MerchantStackParamList, "Profile">;

function phoneLabel(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return value;
}

function placeLabel(pincode: string): string {
  if (pincode === "400028") {
    return "Dadar, Mumbai";
  }
  return `Pincode ${pincode}`;
}

function joinedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function tierLabel(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function loanLabel(status: string | undefined, balance: string | undefined): string {
  if (!status || !balance) {
    return "Nothing open";
  }
  if (status === "PENDING") {
    return `${rupee(balance)} ready`;
  }
  if (status === "SETTLED") {
    return "Settled";
  }
  return `${rupee(balance)} left`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const demo = useDemo();
  const [shop, setShop] = useState<MerchantProfile | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const low = demo.inventory.filter((item) => item.alert === "RED").length;
  const soon = demo.inventory.filter((item) => item.alert === "YELLOW").length;

  useEffect(() => {
    let alive = true;
    fetchMerchant()
      .then((profile) => {
        if (alive) {
          setShop(profile);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setFailed(err instanceof Error ? err.message : "Could not load the shop");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const soundbox = shop?.soundbox_device_id ?? demo.soundbox?.device_id ?? "Not linked";
  const speaker = demo.soundbox?.online ? "Online" : demo.soundbox ? "Offline" : "Checking";

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <BackButton onPress={() => navigation.goBack()} onDark />
        {!shop && !failed ? <ActivityIndicator color={colors.paytm} /> : null}
        {shop ? (
          <View style={styles.identity}>
            <View style={styles.mark}>
              <Text style={styles.markText}>RK</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.shop}>{shop.business_name}</Text>
              <Text style={styles.place}>
                {placeLabel(shop.pincode)} · {shop.pincode}
              </Text>
              <Text style={styles.phone}>{phoneLabel(shop.phone_number)}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <ErrorNote message={failed} />
        {shop ? (
          <View style={[styles.till, cardShadow]}>
            <View style={styles.tillCell}>
              <Text style={styles.tillValue}>{shop.sku_count}</Text>
              <Text style={styles.tillLabel}>Products</Text>
            </View>
            <View style={styles.tillRule} />
            <View style={styles.tillCell}>
              <Text style={[styles.tillValue, low > 0 && { color: colors.red }]}>{low}</Text>
              <Text style={styles.tillLabel}>Short</Text>
              <Text style={styles.tillSub}>{soon} close</Text>
            </View>
            <View style={styles.tillRule} />
            <View style={styles.tillCell}>
              <Text style={styles.tillValue}>{shop.customer_count}</Text>
              <Text style={styles.tillLabel}>Neighbours</Text>
            </View>
          </View>
        ) : null}

        {shop ? (
          <View style={[styles.panel, cardShadow]}>
            <Text style={styles.panelTitle}>Paytm</Text>
            <Row label="Since" value={joinedLabel(shop.created_at)} />
            <Row label="Store link" value={shop.slug} />
            <Row label="Credit" value={tierLabel(shop.credit_tier)} />
            <Row label="Pre-approved" value={rupee(shop.max_preapproved_limit)} />
            <Row label="Sales, 30 days" value={rupee(shop.recent_gmv_30d)} />
            <Row label="Loan" value={loanLabel(demo.offer?.status, demo.offer?.outstanding_balance)} />
            <Row label="Soundbox" value={`${soundbox} · ${speaker}`} />
          </View>
        ) : null}

        {shop && demo.soundbox?.last_announcement ? (
          <View style={[styles.speaker, cardShadow]}>
            <View style={[styles.live, demo.soundbox.online === false && styles.liveOff]} />
            <Text style={styles.announcement}>{demo.soundbox.last_announcement}</Text>
          </View>
        ) : null}

        {shop && demo.inventory.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.panelTitle}>On the shelf</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {demo.inventory.map((item) => {
                const shelf = shelfFor(item.sku_name);
                const tone = alertColors(item.alert);
                const hours = Math.round(Number(item.runway_hours));
                return (
                  <View key={item.inventory_id} style={styles.chip}>
                    <View style={styles.chipPhoto}>
                      {shelf?.image ? (
                        <Image source={shelf.image} style={styles.photo} resizeMode="cover" />
                      ) : (
                        <Text style={styles.emoji}>{shelf?.emoji ?? "📦"}</Text>
                      )}
                    </View>
                    <Text style={styles.chipName} numberOfLines={1}>
                      {item.sku_name}
                    </Text>
                    <Text style={[styles.chipHours, { color: tone.fg }]}>{Number.isNaN(hours) ? item.runway_hours : `${hours}h`}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.paytm,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 26,
  },
  identityText: {
    flex: 1,
    gap: 3,
  },
  shop: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  place: {
    color: "#D9E2EC",
    fontSize: 15,
    fontWeight: "600",
  },
  phone: {
    color: colors.paytm,
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    padding: 16,
    gap: 16,
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
  panel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 2,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  rowValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  speaker: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  live: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    marginTop: 6,
  },
  liveOff: {
    backgroundColor: colors.red,
  },
  announcement: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  section: {
    gap: 10,
  },
  strip: {
    gap: 12,
    paddingRight: 4,
  },
  chip: {
    width: 76,
    gap: 4,
  },
  chipPhoto: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  emoji: {
    fontSize: 30,
  },
  chipName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  chipHours: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: -2,
  },
});
