import React, { createContext, useContext, useEffect, useState } from 'react'

type SubscriptionContextType = {
  isPremium: boolean
  isLoading: boolean
  offerings: any | null
  customerInfo: any | null
  purchase: (pkg: any) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>
  restore: () => Promise<{ success: boolean; error?: string }>
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium:    false,
  isLoading:    false,
  offerings:    null,
  customerInfo: null,
  purchase:     async () => ({ success: false }),
  restore:      async () => ({ success: false }),
  refresh:      async () => {},
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // Return standard un-subscribed status since purchases is removed in Phase 1
  return (
    <SubscriptionContext.Provider
      value={{
        isPremium: false,
        isLoading: false,
        offerings: null,
        customerInfo: null,
        purchase: async () => ({ success: false }),
        restore: async () => ({ success: false }),
        refresh: async () => {},
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}
