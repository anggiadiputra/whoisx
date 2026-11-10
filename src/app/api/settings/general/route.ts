import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { APP_NAME_MAX_LENGTH } from '@/lib/app-name'
import {
  APP_NAME_KEY,
  REGISTRATION_ENABLED_KEY,
  TURNSTILE_ENABLED_KEY,
  TURNSTILE_SECRET_KEY_KEY,
  TURNSTILE_SITE_KEY_KEY,
  getAppName,
  getRegistrationEnabled,
  getTurnstileSettings,
} from '@/lib/app-settings'
import { verifyTurnstileToken } from '@/lib/turnstile'

async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Kamu perlu masuk dulu' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Kamu nggak punya akses untuk ini' }, { status: 403 })
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

  const turnstile = await getTurnstileSettings()

  return NextResponse.json({
    appName: await getAppName(),
    registrationEnabled: await getRegistrationEnabled(),
    turnstile: {
      enabled: turnstile.enabled,
      siteKey: turnstile.siteKey,
      // The secret key never leaves the server
      secretKeySet: turnstile.secretKey !== '',
    },
  })
}

// PUT /api/settings/general - Save any of: app name, sign-up switch, Turnstile (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAdmin()
    if (denied) return denied

    const body = await request.json().catch(() => null)
    const writes: Array<[key: string, value: string]> = []
    const result: {
      success: true
      appName?: string
      registrationEnabled?: boolean
      turnstile?: { enabled: boolean; siteKey: string; secretKeySet: boolean }
    } = { success: true }

    // Validate everything first so a rejected field does not leave the others half-saved
    if (body?.appName !== undefined) {
      const appName = typeof body.appName === 'string' ? body.appName.trim() : ''

      if (!appName) {
        return NextResponse.json({ error: 'Nama aplikasi wajib diisi' }, { status: 400 })
      }

      if (appName.length > APP_NAME_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Nama aplikasi maksimal ${APP_NAME_MAX_LENGTH} karakter` },
          { status: 400 }
        )
      }

      writes.push([APP_NAME_KEY, appName])
      result.appName = appName
    }

    if (body?.registrationEnabled !== undefined) {
      if (typeof body.registrationEnabled !== 'boolean') {
        return NextResponse.json({ error: 'registrationEnabled harus true atau false' }, { status: 400 })
      }

      writes.push([REGISTRATION_ENABLED_KEY, String(body.registrationEnabled)])
      result.registrationEnabled = body.registrationEnabled
    }

    if (body?.turnstile !== undefined) {
      const { enabled, siteKey, secretKey, testToken } = body.turnstile ?? {}

      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'turnstile.enabled harus true atau false' }, { status: 400 })
      }

      const newSiteKey = typeof siteKey === 'string' ? siteKey.trim() : ''
      // A blank secret keeps the one already saved
      const newSecretKey = typeof secretKey === 'string' ? secretKey.trim() : ''
      const effectiveSecretKey = newSecretKey || (await getTurnstileSettings()).secretKey

      if (enabled) {
        if (!newSiteKey || !effectiveSecretKey) {
          return NextResponse.json({ error: 'Isi site key dan secret key Turnstile dulu, ya' }, { status: 400 })
        }

        // A token from the test widget proves the keys pair up and work on this hostname,
        // so a typo cannot lock everyone out of sign in
        const remoteIp = request.headers.get('cf-connecting-ip') ?? undefined
        if (!(await verifyTurnstileToken(effectiveSecretKey, testToken, remoteIp))) {
          return NextResponse.json(
            { error: 'Pengecekan Turnstile gagal. Pastikan kedua key berasal dari widget yang sama dan hostname ini sudah ditambahkan di widget itu.' },
            { status: 400 }
          )
        }
      }

      writes.push([TURNSTILE_SITE_KEY_KEY, newSiteKey])
      if (newSecretKey) writes.push([TURNSTILE_SECRET_KEY_KEY, newSecretKey])
      writes.push([TURNSTILE_ENABLED_KEY, String(enabled)])
      result.turnstile = { enabled, siteKey: newSiteKey, secretKeySet: effectiveSecretKey !== '' }
    }

    for (const [key, value] of writes) {
      await saveSetting(key, value)
    }

    // The name is rendered by the root layout (sidebar, page titles); sign-up and Turnstile by the auth pages
    revalidatePath('/', 'layout')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving general settings:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan. Coba lagi, ya.' }, { status: 500 })
  }
}
