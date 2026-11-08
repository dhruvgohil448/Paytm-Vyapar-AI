import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ConnectionScreen } from "./src/ConnectionScreen";
import { DemoProvider, useDemo } from "./src/DemoContext";
import { CreditScreen } from "./src/merchant/CreditScreen";
import { HomeScreen } from "./src/merchant/HomeScreen";
import { OfferScreen } from "./src/merchant/OfferScreen";
import { ProductScreen } from "./src/merchant/ProductScreen";
import { StockScreen } from "./src/merchant/StockScreen";
import { VendorScreen } from "./src/merchant/VendorScreen";
import type { MerchantStackParamList, MerchantTabParamList } from "./src/navigation";
import { Shell } from "./src/Shell";
import { colors } from "./src/theme";

const MerchantTabs = createBottomTabNavigator<MerchantTabParamList>();
const MerchantStack = createNativeStackNavigator<MerchantStackParamList>();

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.navy,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: "700" as const },
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
};

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
}

function MerchantNavigator() {
  return (
    <MerchantStack.Navigator screenOptions={{ headerShown: false }}>
      <MerchantStack.Screen name="MerchantTabs" component={MerchantTabScreen} />
      <MerchantStack.Screen name="Product" component={ProductScreen} />
    </MerchantStack.Navigator>
  );
}

function MerchantTabScreen() {
  return (
    <MerchantTabs.Navigator screenOptions={tabOptions}>
      <MerchantTabs.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: icon("home") }} />
      <MerchantTabs.Screen name="Stock" component={StockScreen} options={{ tabBarIcon: icon("cube") }} />
      <MerchantTabs.Screen name="Vendors" component={VendorScreen} options={{ tabBarIcon: icon("storefront") }} />
      <MerchantTabs.Screen name="Credit" component={CreditScreen} options={{ tabBarIcon: icon("card") }} />
      <MerchantTabs.Screen name="Offer" component={OfferScreen} options={{ tabBarIcon: icon("megaphone") }} />
    </MerchantTabs.Navigator>
  );
}

function Shop() {
  const demo = useDemo();
  if (!demo.online) {
    return <ConnectionScreen />;
  }
  return (
    <Shell>
      <MerchantNavigator />
    </Shell>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Shop />
        </NavigationContainer>
      </DemoProvider>
    </SafeAreaProvider>
  );
}
