import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { alertColors, cardShadow, colors, hoursLabel } from "./theme";

export function ScreenScroll({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>;
}

export function PageTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function AlertPill({ alert }: { alert: string }) {
  const tone = alertColors(alert);
  const label = alert === "RED" ? "Low" : alert === "YELLOW" ? "Soon" : "OK";
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function RunwayBar({ hours, alert }: { hours: string; alert: string }) {
  const tone = alertColors(alert);
  const ratio = Math.max(0.08, Math.min(1, Number(hours) / 72));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: tone.fg }]} />
    </View>
  );
}

export function RunwayLabel({ hours, alert }: { hours: string; alert: string }) {
  const tone = alertColors(alert);
  return <Text style={[styles.runway, { color: tone.fg }]}>{hoursLabel(hours)} left</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = "paytm",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "paytm" | "navy" | "whatsapp";
}) {
  const background = tone === "navy" ? colors.navy : tone === "whatsapp" ? colors.whatsapp : colors.paytm;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: background }, disabled && styles.buttonOff]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.secondary, disabled && styles.buttonOff]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  titleBlock: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    ...cardShadow,
  },
  error: {
    backgroundColor: colors.redBg,
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E8EEF4",
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 999,
  },
  runway: {
    fontSize: 14,
    fontWeight: "800",
  },
  button: {
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonOff: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondary: {
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
});
