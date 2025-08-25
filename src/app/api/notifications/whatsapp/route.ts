import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface WhatsAppNotificationRequest {
  type: 'domain_expiry' | 'whois_update' | 'critical_alert' | 'daily_report' | 'test'
  domain?: string
  daysLeft?: number
  message?: string
  phoneNumber: string
  token: string
}

// POST /api/notifications/whatsapp - Send WhatsApp notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow Admin users to send notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body: WhatsAppNotificationRequest = await request.json()
    const { type, domain, daysLeft, message, phoneNumber, token } = body

    if (!phoneNumber || !token) {
      return NextResponse.json({ error: 'Phone number and token are required' }, { status: 400 })
    }

    let whatsappMessage = ''

    // Generate message based on notification type
    switch (type) {
      case 'test':
        whatsappMessage = message || '🔔 Test notification from Domain Management System\n\nThis is a test message to verify your WhatsApp integration is working correctly.\n\n✅ Configuration successful!'
        break
        
      case 'domain_expiry':
        if (!domain || daysLeft === undefined) {
          return NextResponse.json({ error: 'Domain and daysLeft are required for expiry notifications' }, { status: 400 })
        }
        
        if (daysLeft <= 1) {
          whatsappMessage = `🚨 CRITICAL DOMAIN ALERT\n\n` +
                           `Domain: ${domain}\n` +
                           `Status: EXPIRES ${daysLeft === 0 ? 'TODAY' : 'TOMORROW'}\n` +
                           `Action Required: RENEW IMMEDIATELY\n\n` +
                           `⚠️ Domain will become inactive if not renewed!`
        } else if (daysLeft <= 7) {
          whatsappMessage = `⚠️ Domain Expiry Warning\n\n` +
                           `Domain: ${domain}\n` +
                           `Expires in: ${daysLeft} days\n` +
                           `Action: Please renew soon\n\n` +
                           `📅 Renewal recommended within next few days`
        } else if (daysLeft <= 30) {
          whatsappMessage = `📋 Domain Renewal Reminder\n\n` +
                           `Domain: ${domain}\n` +
                           `Expires in: ${daysLeft} days\n` +
                           `Status: Renewal planning recommended\n\n` +
                           `💡 Consider renewing to avoid last-minute issues`
        } else {
          whatsappMessage = `📅 Domain Status Update\n\n` +
                           `Domain: ${domain}\n` +
                           `Expires in: ${daysLeft} days\n` +
                           `Status: Good condition\n\n` +
                           `✅ No immediate action required`
        }
        break
        
      case 'whois_update':
        whatsappMessage = `🔄 WHOIS Data Updated\n\n` +
                         `Domain: ${domain}\n` +
                         `Status: WHOIS information refreshed\n` +
                         `Time: ${new Date().toLocaleString('id-ID')}\n\n` +
                         `✅ Domain data is now up to date`
        break
        
      case 'critical_alert':
        whatsappMessage = `🚨 CRITICAL SYSTEM ALERT\n\n` +
                         `${message || 'Critical issue detected in domain management system'}\n\n` +
                         `⚠️ Immediate attention required!`
        break
        
      case 'daily_report':
        whatsappMessage = `📊 Daily Domain Report\n\n` +
                         `Date: ${new Date().toLocaleDateString('id-ID')}\n` +
                         `${message || 'Daily summary of domain status'}\n\n` +
                         `📈 Report generated automatically`
        break
        
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    // Send WhatsApp message using Fonnte API
    const data = new FormData()
    data.append("target", phoneNumber)
    data.append("message", whatsappMessage)
    data.append("countryCode", "62")

    // Add additional features for specific notification types
    if (type === 'domain_expiry' && daysLeft !== undefined && daysLeft <= 7) {
      // Add buttons for critical expiry notifications
      const buttonJSON = {
        message: whatsappMessage,
        footer: "Domain Management System",
        buttons: [
          { id: "renew_now", message: "Renew Now" },
          { id: "remind_later", message: "Remind Later" },
          { id: "view_details", message: "View Details" }
        ]
      }
      data.append("buttonJSON", JSON.stringify(buttonJSON))
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      mode: "cors",
      headers: new Headers({
        Authorization: token,
      }),
      body: data,
    })

    const result = await response.json()
    
    if (response.ok && result.status) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp notification sent successfully',
        data: result
      })
    } else {
      throw new Error(result.reason || 'Failed to send WhatsApp notification')
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send notification'
    }, { status: 500 })
  }
}
