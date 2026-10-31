import { cache } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_APP_NAME } from '@/lib/app-name'

export const APP_NAME_KEY = 'appName'

// Read per request (not at build time) so a rename shows up right away
export const getAppName = cache(async (): Promise<string> => {
  await connection()
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: APP_NAME_KEY } })
    return setting?.value || DEFAULT_APP_NAME
  } catch {
    // Table missing (migration not applied yet) or DB unavailable
    return DEFAULT_APP_NAME
  }
})
