import { cache } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_APP_NAME } from '@/lib/app-name'

export const APP_NAME_KEY = 'appName'
export const REGISTRATION_ENABLED_KEY = 'registrationEnabled'

// Read per request (not at build time) so a change shows up right away
const getSetting = cache(async (key: string): Promise<string | null> => {
  await connection()
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key } })
    return setting?.value ?? null
  } catch {
    // Table missing (migration not applied yet) or DB unavailable
    return null
  }
})

export async function getAppName(): Promise<string> {
  return (await getSetting(APP_NAME_KEY)) || DEFAULT_APP_NAME
}

// Public sign-up stays open until an admin turns it off in Settings
export async function getRegistrationEnabled(): Promise<boolean> {
  return (await getSetting(REGISTRATION_ENABLED_KEY)) !== 'false'
}
