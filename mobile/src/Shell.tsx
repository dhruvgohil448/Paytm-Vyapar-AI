import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDemo } from "./DemoContext";
import { openShopProfile } from "./navigation";
import { cardShadow, colors } from "./theme";

export function Shell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const demo = useDemo();
  const speaker = demo.soundbox;
  const live = speaker?.online !== false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open shop profile"
          hitSlop={8}
          onPress={openShopProfile}
          style={({ pressed }) => [styles.stamp, pressed && styles.stampPressed]}
        >
          <View style={styles.stampBack} />
          <View style={styles.mark}>
            <Text style={styles.markText}>RK</Text>
          </View>
        </Pressable>
        <View style={styles.identity}>
          <Text style={styles.shop}>Ramesh Kirana</Text>
          <Text style={styles.place}>Dadar · 400028</Text>
        </View>
        {speaker ? (
          <View style={[styles.live, !live && styles.liveOff]}>
            <View style={[styles.dot, !live && styles.dotOff]} />
            <Text style={[styles.liveText, !live && styles.liveTextOff]}>{live ? "Live" : "Off"}</Text>
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
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 3,
    borderBottomColor: colors.paytm,
    ...cardShadow,
  },
  stamp: {
    width: 44,
    height: 44,
  },
  stampPressed: {
    opacity: 0.75,
  },
  stampBack: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.navy,
    right: 0,
    bottom: 0,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.paytm,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 14,
  },
  identity: {
    flex: 1,
    gap: 1,
  },
  shop: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  place: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.greenBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveOff: {
    backgroundColor: colors.redBg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  dotOff: {
    backgroundColor: colors.red,
  },
  liveText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  liveTextOff: {
    color: colors.red,
  },
  body: {
    flex: 1,
  },
});
