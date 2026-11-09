import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { colors } from "../theme";
import { WHOLESALERS } from "../vendors";
import { PageTitle, SearchField } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Vendors">,
  NativeStackScreenProps<MerchantStackParamList>
>;

/** Gradient colours paired with each vendor id for the placeholder banner. */
const VENDOR_GRADIENTS: Record<string, [string, string]> = {
  dadar:        ["#F97316", "#EA580C"],
  masjid:       ["#8B5CF6", "#7C3AED"],
  crawford:     ["#10B981", "#059669"],
  lalbaug:      ["#F59E0B", "#D97706"],
  parel:        ["#3B82F6", "#2563EB"],
  grant:        ["#EC4899", "#DB2777"],
  byculla:      ["#06B6D4", "#0891B2"],
  worli:        ["#84CC16", "#65A30D"],
  elphinstone:  ["#EF4444", "#DC2626"],
  sewri:        ["#A78BFA", "#7C3AED"],
};

function VendorBanner({
  id,
  name,
  image,
}: {
  id: string;
  name: string;
  image?: ReturnType<typeof require>;
}) {
  if (image) {
    return <Image source={image} style={styles.bannerImage} resizeMode="cover" fadeDuration={0} />;
  }
  const [bg] = VENDOR_GRADIENTS[id] ?? ["#627D98", "#486581"];
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <View style={[styles.bannerPlaceholder, { backgroundColor: bg }]}>
      <Text style={styles.bannerInitials}>{initials}</Text>
    </View>
  );
}

export function VendorScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const vendors = useMemo(
    () =>
      WHOLESALERS.filter(
        (vendor) => vendor.name.toLowerCase().includes(needle) || vendor.area.toLowerCase().includes(needle),
      ),
    [needle],
  );
  return (
    <View style={styles.screen}>
      <View style={styles.sticky}>
        <PageTitle title="Vendors" />
        <SearchField value={query} onChangeText={setQuery} placeholder="Search vendors" />
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {vendors.length === 0 ? (
        <Text style={styles.empty}>{needle ? `No vendor matches ${query.trim()}.` : "No vendors yet."}</Text>
      ) : null}
      {vendors.map((vendor) => (
        <Pressable
          key={vendor.id}
          style={styles.card}
          onPress={() => navigation.navigate("VendorProducts", { vendorId: vendor.id })}
        >
          <VendorBanner id={vendor.id} name={vendor.name} image={vendor.image} />
          <View style={styles.cardBody}>
            <View style={styles.cardCopy}>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              <Text style={styles.vendorArea}>{vendor.area}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceLabel}>
                {vendor.factor < 1
                  ? `${Math.round((1 - vendor.factor) * 100)}% cheaper`
                  : vendor.factor === 1
                  ? "Market rate"
                  : `${Math.round((vendor.factor - 1) * 100)}% costlier`}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  sticky: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: colors.bg,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#C5D0DC",
    shadowColor: "#0B1F33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  bannerImage: {
    width: "100%",
    height: 140,
  },
  bannerPlaceholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerInitials: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "900",
    opacity: 0.6,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  vendorName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  vendorArea: {
    color: colors.muted,
    fontSize: 13,
  },
  priceBadge: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceLabel: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "800",
  },
});
