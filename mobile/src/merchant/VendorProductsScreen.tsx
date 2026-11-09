import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { moneyFromPaise } from "../catalog";
import { colors, rupee } from "../theme";
import type { MerchantStackParamList } from "../navigation";
import { WHOLESALERS, pricedItems } from "../vendors";
import { BackButton } from "../ui";

type Props = NativeStackScreenProps<MerchantStackParamList, "VendorProducts">;

const DEFAULT_EMOJI = "📦";

export function VendorProductsScreen({ navigation, route }: Props) {
  const { vendorId } = route.params;
  const vendor = WHOLESALERS.find((v) => v.id === vendorId);

  if (!vendor) {
    return null;
  }

  const items = pricedItems(vendor.factor);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{vendor.name}</Text>
        <Text style={styles.subtitle}>{vendor.area} · All products</Text>
      </View>

      {/* Product grid */}
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.sku}
            style={styles.cell}
            onPress={() => navigation.navigate("Product", { sku: item.sku })}
          >
            {/* Product image / emoji fallback */}
            <View style={styles.imageBox}>
              {item.image ? (
                <Image source={item.image} style={styles.productImage} resizeMode="cover" fadeDuration={0} />
              ) : (
                <Text style={styles.productEmoji}>{item.emoji}</Text>
              )}
            </View>

            {/* Name & price */}
            <View style={styles.cellBody}>
              <Text style={styles.skuName} numberOfLines={1}>
                {item.sku}
              </Text>
              <Text style={styles.skuPrice}>{rupee(moneyFromPaise(item.unitPaise))}</Text>
              <Text style={styles.skuUnit}>per {item.unit}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const CELL_SIZE = "48%";

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  cell: {
    width: CELL_SIZE,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0B1F33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productEmoji: {
    fontSize: 52,
  },
  cellBody: {
    padding: 10,
    gap: 2,
  },
  skuName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  skuPrice: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900",
  },
  skuUnit: {
    color: colors.muted,
    fontSize: 11,
  },
});
