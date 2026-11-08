import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { shelfFor } from "../catalog";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation";
import { colors, rupee } from "../theme";
import { AlertPill, PageTitle, RunwayBar, RunwayLabel, ScreenScroll } from "../ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "Stock">,
  NativeStackScreenProps<MerchantStackParamList>
>;

export function StockScreen({ navigation }: Props) {
  const demo = useDemo();
  return (
    <ScreenScroll>
      <PageTitle title="Stock" detail="Low means under 24 hours. Soon means under 48. OK means you can wait." />
      {demo.inventory.map((item) => {
        const shelf = shelfFor(item.sku_name);
        return (
          <Pressable key={item.inventory_id} style={styles.row} onPress={() => navigation.navigate("Product", { sku: item.sku_name })}>
            <View style={styles.top}>
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
          </Pressable>
        );
      })}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
});
