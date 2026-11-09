import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { moneyFromPaise, shelfFor } from "../catalog";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { colors, rupee } from "../theme";
import { arrivalLabel, quotesFor } from "../vendors";
import { AlertPill, PageTitle, RunwayBar, RunwayLabel, SearchField } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Stock">,
  NativeStackScreenProps<MerchantStackParamList>
>;

export function StockScreen({ navigation }: Props) {
  const demo = useDemo();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const items = useMemo(
    () => demo.inventory.filter((item) => item.sku_name.toLowerCase().includes(needle)),
    [demo.inventory, needle],
  );
  return (
    <View style={styles.screen}>
      <View style={styles.sticky}>
        <PageTitle title="Stock" />
        <SearchField value={query} onChangeText={setQuery} placeholder="Search stock" />
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {items.length === 0 ? (
        <Text style={styles.empty}>{needle ? `No stock matches ${query.trim()}.` : "No stock loaded yet."}</Text>
      ) : null}
      {items.map((item) => {
        const shelf = shelfFor(item.sku_name);
        const best = quotesFor(item.restock_cost_per_unit)[0];
        const delivery = demo.restocks.find((order) => order.sku === item.sku_name);
        return (
          <Pressable key={item.inventory_id} style={styles.row} onPress={() => navigation.navigate("Product", { sku: item.sku_name })}>
            <View style={styles.top}>
              <View style={styles.thumb}>
                {shelf?.image ? (
                  <Image source={shelf.image} style={styles.thumbImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.thumbEmoji}>{shelf?.emoji ?? "📦"}</Text>
                )}
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{item.sku_name}</Text>
                <Text style={styles.meta}>
                  {item.estimated_units_remaining} {shelf?.unit ?? "units"} left
                  {shelf ? ` · shelf ${rupee(shelf.price)}` : ""}
                </Text>
              </View>
              <AlertPill alert={item.alert} />
            </View>
            <RunwayBar hours={item.runway_hours} alert={item.alert} />
            <RunwayLabel hours={item.runway_hours} alert={item.alert} />
            {delivery ? (
              <View style={styles.delivery}>
                <Text style={styles.deliveryText}>{arrivalLabel(delivery.deliveryDate)}</Text>
                <Text style={styles.deliveryMeta}>
                  {delivery.units} {shelf?.unit ?? "units"} · {delivery.vendorName}
                </Text>
              </View>
            ) : best ? (
              <Text style={styles.best}>Best {rupee(moneyFromPaise(best.unitPaise))} · {best.name}</Text>
            ) : null}
          </Pressable>
        );
      })}
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
  row: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#C5D0DC",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbEmoji: {
    fontSize: 26,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  best: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
  },
  delivery: {
    backgroundColor: colors.greenBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  deliveryText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
  },
  deliveryMeta: {
    color: colors.ink,
    fontSize: 13,
  },
});
