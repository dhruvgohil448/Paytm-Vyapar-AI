import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import { API_BASE } from "./config";
import { useDemo } from "./DemoContext";
import { Shell } from "./Shell";
import { colors } from "./theme";
import { PrimaryButton } from "./ui";

export function ConnectionScreen() {
  const demo = useDemo();
  return (
    <Shell>
      <View style={styles.wrap}>
        {demo.checking ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.paytm} />
            <Text style={styles.title}>Checking the shop connection</Text>
            <Text style={styles.body}>Looking for the API at {API_BASE}.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.kicker}>Phone cannot see the API</Text>
            <Text style={styles.title}>Start the server on this Wi-Fi</Text>
            <Text style={styles.body}>
              Expo Go is open, but nothing answered at {API_BASE}. On the Mac, run this and leave that terminal open:
            </Text>
            <Text style={styles.code}>cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000</Text>
            <Text style={styles.body}>backend/run.sh does the same thing.</Text>
            <Text style={styles.body}>
              If Retry still fails, allow incoming connections for Python in the Mac firewall. The phone and the Mac have to stay on the same Wi-Fi.
            </Text>
            <PrimaryButton label="Retry" onPress={() => void demo.connect()} disabled={demo.checking} />
          </View>
        )}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  kicker: {
    color: colors.red,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  code: {
    color: colors.navy,
    backgroundColor: "#E7F6FD",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
