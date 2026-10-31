import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { APP_NAME_MAX_LENGTH } from '@/lib/app-name'
import { APP_NAME_KEY } from '@/lib/app-settings'

// PUT /api/settings/general - Rename the application (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const appName = typeof body?.appName === 'string' ? body.appName.trim() : ''

    if (!appName) {
      return NextResponse.json({ error: 'Application name is required' }, { status: 400 })
    }

    if (appName.length > APP_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Application name must be ${APP_NAME_MAX_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    await prisma.appSetting.upsert({
      where: { key: APP_NAME_KEY },
      update: { value: appName },
      create: { key: APP_NAME_KEY, value: appName },
    })

    // The name is rendered by the root layout (sidebar, page titles)
    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true, appName })
  } catch (error) {
    console.error('Error saving general settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
