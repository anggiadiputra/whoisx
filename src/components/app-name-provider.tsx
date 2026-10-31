'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_APP_NAME } from '@/lib/app-name'

const AppNameContext = createContext(DEFAULT_APP_NAME)

// The name comes from the root layout; router.refresh() picks up a rename
export function AppNameProvider({ value, children }: { value: string; children: React.ReactNode }) {
  return <AppNameContext.Provider value={value}>{children}</AppNameContext.Provider>
}

export function useAppName() {
  return useContext(AppNameContext)
}
