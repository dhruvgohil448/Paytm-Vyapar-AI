import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { colors } from "../theme";
import { WHOLESALERS } from "../vendors";
import { PageTitle, ScreenScroll } from "../ui";

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
  return (
    <ScreenScroll>
      <PageTitle
        title="Vendors"
        detail="Pick a wholesaler to browse their products and place a restock order."
      />
      {WHOLESALERS.map((vendor) => (
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
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: "hidden",
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
