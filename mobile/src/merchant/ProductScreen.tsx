import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { forecastSku } from "../api";
import { shelfFor } from "../catalog";
import { useDemo } from "../DemoContext";
import type { MerchantStackParamList } from "../navigation";
import type { ForecastItem } from "../types";
import { colors, rupee } from "../theme";
import { AlertPill, BackButton, Card, ErrorNote, PageTitle, PrimaryButton, RunwayBar, RunwayLabel, ScreenScroll, SecondaryButton } from "../ui";
import { VendorQuotes } from "./VendorQuotes";

type Props = NativeStackScreenProps<MerchantStackParamList, "Product">;

export function ProductScreen({ navigation, route }: Props) {
  const demo = useDemo();
  const sku = route.params.sku;
  const cached = demo.inventory.find((item) => item.sku_name === sku) ?? null;
  const [item, setItem] = useState<ForecastItem | null>(cached);
  const [failed, setFailed] = useState<string | null>(null);
  const shelf = shelfFor(sku);

  useEffect(() => {
    let alive = true;
    forecastSku(sku)
      .then((forecast) => {
        if (!alive) {
          return;
        }
        setItem((current) => {
          if (current && Number(current.estimated_units_remaining) > Number(forecast.estimated_units_remaining)) {
            return current;
          }
          return forecast;
        });
      })
      .catch((err: unknown) => {
        if (alive) {
          setFailed(err instanceof Error ? err.message : "Could not refresh this product");
        }
      });
    return () => {
      alive = false;
    };
  }, [sku]);

  useEffect(() => {
    const next = demo.inventory.find((row) => row.sku_name === sku);
    if (next) {
      setItem(next);
    }
  }, [demo.inventory, sku]);

  return (
    <ScreenScroll>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={styles.heading}>
        <PageTitle title={sku} detail={shelf ? `Sells at ${rupee(shelf.price)} per ${shelf.unit}` : undefined} />
        {item ? <AlertPill alert={item.alert} /> : null}
      </View>
      <ErrorNote message={failed ?? demo.error} />
      {!item ? <ActivityIndicator color={colors.paytm} /> : null}
      {item ? (
        <Card>
          <RunwayLabel hours={item.runway_hours} alert={item.alert} />
          <RunwayBar hours={item.runway_hours} alert={item.alert} />
          <Text style={styles.line}>{item.estimated_units_remaining} units in the shop</Text>
          <Text style={styles.line}>Selling about {item.effective_burn_rate_units_per_day} units a day</Text>
          <Text style={styles.line}>Demand: {item.demand_factors.join(", ")}</Text>
          <Text style={styles.line}>Restock price {rupee(item.restock_cost_per_unit)} each</Text>
          <Text style={styles.reorder}>
            One week needs {item.reorder.units} units, about {rupee(item.reorder.cost)}.
          </Text>
        </Card>
      ) : null}
      {item ? (
        <VendorQuotes
          sku={sku}
          unitCost={item.restock_cost_per_unit}
          defaultUnits={Math.max(1, Math.round(Number(item.reorder.units)))}
        />
      ) : null}
      <PrimaryButton
        label="Finance this restock"
        onPress={() => {
          demo.chooseSku(sku);
          navigation.navigate("MerchantTabs", { screen: "Credit" });
        }}
      />
      <SecondaryButton
        label="Feature in a WhatsApp offer"
        onPress={() => {
          demo.chooseSku(sku);
          navigation.navigate("MerchantTabs", { screen: "Offer" });
        }}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  line: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  reorder: {
    color: colors.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
});
