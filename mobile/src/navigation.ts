import type { NavigatorScreenParams } from "@react-navigation/native";

export type ShopMode = "Merchant" | "Customer";

export type MerchantTabParamList = {
  Home: undefined;
  Stock: undefined;
  Credit: undefined;
  Offer: undefined;
};

export type MerchantStackParamList = {
  MerchantTabs: NavigatorScreenParams<MerchantTabParamList> | undefined;
  Product: { sku: string };
};

export type CustomerTabParamList = {
  Inbox: undefined;
  Cart: undefined;
};
