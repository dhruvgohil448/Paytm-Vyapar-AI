import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "./theme";

export function Shell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>RK</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.shop}>Ramesh Kirana</Text>
          <Text style={styles.place}>Dadar · 400028</Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.paytm,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 15,
  },
  identity: {
    flex: 1,
  },
  shop: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  place: {
    color: "#D9E2EC",
    fontSize: 13,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
});
