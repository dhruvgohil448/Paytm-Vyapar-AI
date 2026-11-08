import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ShopMode } from "./navigation";
import { colors } from "./theme";

export function Shell({
  mode,
  onSwitch,
  children,
}: {
  mode?: ShopMode;
  onSwitch?: (mode: ShopMode) => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Paytm for Business</Text>
        <Text style={styles.shop}>Ramesh Kirana</Text>
        <Text style={styles.place}>Dadar · 400028</Text>
        {mode && onSwitch ? (
          <View style={styles.switcher}>
            {(["Merchant", "Customer"] as ShopMode[]).map((name) => {
              const active = name === mode;
              return (
                <Pressable key={name} onPress={() => onSwitch(name)} style={[styles.segment, active && styles.segmentOn]}>
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelOn]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brand: {
    color: colors.paytm,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  shop: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
  },
  place: {
    color: "#D9E2EC",
    fontSize: 14,
    marginTop: 2,
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: "#0B3A56",
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentOn: {
    backgroundColor: "#FFFFFF",
  },
  segmentLabel: {
    color: "#D9E2EC",
    fontWeight: "700",
    fontSize: 15,
  },
  segmentLabelOn: {
    color: colors.navy,
  },
  body: {
    flex: 1,
  },
});
