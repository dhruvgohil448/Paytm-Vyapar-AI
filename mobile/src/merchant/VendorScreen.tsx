import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useDemo } from "../DemoContext";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { colors } from "../theme";
import { arrivalLabel } from "../vendors";
import { PageTitle, PrimaryButton, ScreenScroll } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Vendors">,
  NativeStackScreenProps<MerchantStackParamList>
>;

export function VendorScreen({ navigation }: Props) {
  const demo = useDemo();
  const [picking, setPicking] = useState(false);
  const available = demo.inventory.filter((item) => !demo.watchSkus.includes(item.sku_name));

  return (
    <ScreenScroll>
      <PageTitle title="Vendors" detail="Add something you already sell. Open it to compare 10 wholesalers and restock." />
      <PrimaryButton label={picking ? "Hide shop items" : "Add an item from the shop"} onPress={() => setPicking((value) => !value)} />
      {picking ? (
        <View style={styles.chips}>
          {available.length === 0 ? <Text style={styles.quiet}>Every shop item is already on this list.</Text> : null}
          {available.map((item) => (
            <Pressable
              key={item.inventory_id}
              style={styles.chip}
              onPress={() => {
                demo.addWatchSku(item.sku_name);
                setPicking(false);
              }}
            >
              <Text style={styles.chipText}>{item.sku_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {demo.watchSkus.length === 0 ? (
        <Text style={styles.quiet}>No item yet. Add sugar, oil, or any other product already in stock.</Text>
      ) : null}
      {demo.watchSkus.map((sku) => {
        const latest = demo.restocks.find((order) => order.sku === sku);
        return (
          <Pressable key={sku} style={styles.row} onPress={() => navigation.navigate("Product", { sku })}>
            <View style={styles.copy}>
              <Text style={styles.name}>{sku}</Text>
              <Text style={styles.meta}>
                {latest ? `${arrivalLabel(latest.deliveryDate)} · ${latest.vendorName}` : "Compare 10 sellers"}
              </Text>
            </View>
            <Text style={styles.open}>Vendors</Text>
          </Pressable>
        );
      })}
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
  chipText: {
    color: colors.ink,
    fontWeight: "700",
  },
  quiet: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: {
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
  open: {
    color: colors.paytmDark,
    fontWeight: "800",
  },
});
