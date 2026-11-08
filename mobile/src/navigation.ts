import type { NavigatorScreenParams } from "@react-navigation/native";

export type MerchantTabParamList = {
  Home: undefined;
  Stock: undefined;
  Vendors: undefined;
  Credit: undefined;
  Offer: undefined;
};

export type MerchantStackParamList = {
  MerchantTabs: NavigatorScreenParams<MerchantTabParamList> | undefined;
  Product: { sku: string };
};
