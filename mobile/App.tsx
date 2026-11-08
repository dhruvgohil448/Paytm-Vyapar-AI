import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ConnectionScreen } from "./src/ConnectionScreen";
import { CartScreen } from "./src/customer/CartScreen";
import { InboxScreen } from "./src/customer/InboxScreen";
import { DemoProvider, useDemo } from "./src/DemoContext";
import { CreditScreen } from "./src/merchant/CreditScreen";
import { HomeScreen } from "./src/merchant/HomeScreen";
import { OfferScreen } from "./src/merchant/OfferScreen";
import { ProductScreen } from "./src/merchant/ProductScreen";
import { StockScreen } from "./src/merchant/StockScreen";
import type { CustomerTabParamList, MerchantStackParamList, MerchantTabParamList, ShopMode } from "./src/navigation";
import { Shell } from "./src/Shell";
import { colors } from "./src/theme";

const MerchantTabs = createBottomTabNavigator<MerchantTabParamList>();
const MerchantStack = createNativeStackNavigator<MerchantStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.navy,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: "700" as const },
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
};

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
      <MerchantTabs.Screen name="Home" component={HomeScreen} />
      <MerchantTabs.Screen name="Stock" component={StockScreen} />
      <MerchantTabs.Screen name="Credit" component={CreditScreen} />
      <MerchantTabs.Screen name="Offer" component={OfferScreen} />
    </MerchantTabs.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerTabs.Navigator screenOptions={tabOptions}>
      <CustomerTabs.Screen name="Inbox" component={InboxScreen} options={{ title: "Offer" }} />
      <CustomerTabs.Screen name="Cart" component={CartScreen} options={{ title: "Basket" }} />
    </CustomerTabs.Navigator>
  );
}

function Shop() {
  const demo = useDemo();
  const [mode, setMode] = useState<ShopMode>("Merchant");
  if (!demo.online) {
    return <ConnectionScreen />;
  }
  return (
    <Shell mode={mode} onSwitch={setMode}>
      {mode === "Merchant" ? <MerchantNavigator /> : <CustomerNavigator />}
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
