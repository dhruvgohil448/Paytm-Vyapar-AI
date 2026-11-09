import { createNavigationContainerRef, type NavigatorScreenParams } from "@react-navigation/native";

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
  VendorProducts: { vendorId: string };
  Profile: undefined;
};

export const navigationRef = createNavigationContainerRef<MerchantStackParamList>();

export function openShopProfile(): void {
  if (!navigationRef.isReady()) {
    return;
  }
  if (navigationRef.getCurrentRoute()?.name === "Profile") {
    return;
  }
  navigationRef.navigate("Profile");
}
