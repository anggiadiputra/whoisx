import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { APP_NAME_MAX_LENGTH } from '@/lib/app-name'
import { APP_NAME_KEY, REGISTRATION_ENABLED_KEY, getAppName, getRegistrationEnabled } from '@/lib/app-settings'
import { getTurnstileSiteKey } from '@/lib/turnstile'

async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  return null
}

function saveSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

// GET /api/settings/general - Current app-wide settings (Admin only)
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  return NextResponse.json({
    appName: await getAppName(),
    registrationEnabled: await getRegistrationEnabled(),
    // Turnstile is configured with Worker secrets, not from this page
    turnstileEnabled: getTurnstileSiteKey() !== null,
  })
}

// PUT /api/settings/general - Rename the application and/or open or close sign-up (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAdmin()
    if (denied) return denied

    const body = await request.json().catch(() => null)
    const result: { success: true; appName?: string; registrationEnabled?: boolean } = { success: true }

    if (body?.appName !== undefined) {
      const appName = typeof body.appName === 'string' ? body.appName.trim() : ''

      if (!appName) {
        return NextResponse.json({ error: 'Application name is required' }, { status: 400 })
      }

      if (appName.length > APP_NAME_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Application name must be ${APP_NAME_MAX_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }

      await saveSetting(APP_NAME_KEY, appName)
      result.appName = appName
    }

    if (body?.registrationEnabled !== undefined) {
      if (typeof body.registrationEnabled !== 'boolean') {
        return NextResponse.json({ error: 'registrationEnabled must be true or false' }, { status: 400 })
      }

      await saveSetting(REGISTRATION_ENABLED_KEY, String(body.registrationEnabled))
      result.registrationEnabled = body.registrationEnabled
    }

    // The name is rendered by the root layout (sidebar, page titles); sign-up state by the auth pages
    revalidatePath('/', 'layout')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving general settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
