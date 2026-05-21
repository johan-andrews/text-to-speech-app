// lib/purchases.ts — stub, no RevenueCat
export const ENTITLEMENT_ID = 'premium'

export function configureRevenueCat() {}
export async function loginRevenueCat(_userId: string) {}
export async function logoutRevenueCat() {}

export function isRCPremium(_customerInfo: any): boolean {
  return false
}

export async function fetchOfferings() {
  return null
}

export async function fetchCustomerInfo() {
  return null
}

export async function purchasePackage(_pkg: any) {
  return null
}

export async function restorePurchases() {
  return null
}
