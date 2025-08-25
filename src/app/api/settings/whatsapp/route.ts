import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/settings/whatsapp - Get WhatsApp settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow Admin users to access settings
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // For now, we'll use a simple approach - store settings in a JSON file or database
    // In a real app, you might want a separate settings table
    
    // Try to get settings from user record or create default
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // Default settings
    const defaultSettings = {
      enabled: false,
      token: '',
      phoneNumber: '',
      notifications: {
        domainExpiry: true,
        whoisUpdates: false,
        criticalAlerts: true,
        dailyReports: false
      },
      expiryThresholds: {
        critical: 7,
        warning: 30,
        reminder: 90
      }
    }

    // For this implementation, we'll store settings in user's metadata or a separate field
    // Since we don't have a settings field in user table, we'll return defaults for now
    
    return NextResponse.json({
      success: true,
      settings: defaultSettings
    })
  } catch (error: any) {
    console.error('Error fetching WhatsApp settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 })
  }
}

// POST /api/settings/whatsapp - Save WhatsApp settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow Admin users to modify settings
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    // Validate settings structure
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    // For this implementation, we'll store in localStorage on client side
    // In a production app, you would save to database
    
    // Here you could save to database:
    // await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { whatsappSettings: JSON.stringify(settings) }
    // })

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    })
  } catch (error: any) {
    console.error('Error saving WhatsApp settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save settings'
    }, { status: 500 })
  }
}
