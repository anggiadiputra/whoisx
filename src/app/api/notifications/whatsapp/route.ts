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
      return NextResponse.json({ error: 'Kamu perlu masuk dulu' }, { status: 401 })
    }

    // Only allow Admin users to send notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Kamu nggak punya akses untuk ini' }, { status: 403 })
    }

    const body: WhatsAppNotificationRequest = await request.json()
    const { type, domain, daysLeft, message, phoneNumber, token } = body

    if (!phoneNumber || !token) {
      return NextResponse.json({ error: 'Nomor WhatsApp dan token wajib diisi' }, { status: 400 })
    }

    let whatsappMessage = ''

    // Generate message based on notification type
    switch (type) {
      case 'test':
        whatsappMessage = message || '🔔 Notifikasi tes dari Sistem Manajemen Domain\n\nIni pesan tes untuk memastikan integrasi WhatsApp kamu sudah berjalan.\n\n✅ Konfigurasi berhasil!'
        break
        
      case 'domain_expiry':
        if (!domain || daysLeft === undefined) {
          return NextResponse.json({ error: 'Domain dan daysLeft wajib diisi untuk notifikasi kedaluwarsa' }, { status: 400 })
        }
        
        if (daysLeft <= 1) {
          whatsappMessage = `🚨 PERINGATAN KRITIS DOMAIN\n\n` +
                           `Domain: ${domain}\n` +
                           `Status: KEDALUWARSA ${daysLeft === 0 ? 'HARI INI' : 'BESOK'}\n` +
                           `Tindakan: SEGERA PERPANJANG\n\n` +
                           `⚠️ Domain akan nonaktif kalau tidak diperpanjang!`
        } else if (daysLeft <= 7) {
          whatsappMessage = `⚠️ Peringatan domain kedaluwarsa\n\n` +
                           `Domain: ${domain}\n` +
                           `Kedaluwarsa dalam: ${daysLeft} hari\n` +
                           `Tindakan: Segera perpanjang, ya\n\n` +
                           `📅 Sebaiknya diperpanjang dalam beberapa hari ini`
        } else if (daysLeft <= 30) {
          whatsappMessage = `📋 Pengingat perpanjangan domain\n\n` +
                           `Domain: ${domain}\n` +
                           `Kedaluwarsa dalam: ${daysLeft} hari\n` +
                           `Status: Mulai rencanakan perpanjangan\n\n` +
                           `💡 Perpanjang lebih awal supaya nggak mepet`
        } else {
          whatsappMessage = `📅 Info status domain\n\n` +
                           `Domain: ${domain}\n` +
                           `Kedaluwarsa dalam: ${daysLeft} hari\n` +
                           `Status: Aman\n\n` +
                           `✅ Belum perlu tindakan apa pun`
        }
        break
        
      case 'whois_update':
        whatsappMessage = `🔄 Data WHOIS diperbarui\n\n` +
                         `Domain: ${domain}\n` +
                         `Status: Informasi WHOIS sudah dimuat ulang\n` +
                         `Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
                         `✅ Data domain sudah yang terbaru`
        break
        
      case 'critical_alert':
        whatsappMessage = `🚨 PERINGATAN KRITIS SISTEM\n\n` +
                         `${message || 'Ada masalah kritis di sistem manajemen domain'}\n\n` +
                         `⚠️ Perlu segera ditangani!`
        break
        
      case 'daily_report':
        whatsappMessage = `📊 Laporan harian domain\n\n` +
                         `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
                         `${message || 'Ringkasan harian status domain'}\n\n` +
                         `📈 Laporan ini dibuat otomatis`
        break
        
      default:
        return NextResponse.json({ error: 'Tipe notifikasi tidak valid' }, { status: 400 })
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
        footer: "Sistem Manajemen Domain",
        buttons: [
          { id: "renew_now", message: "Perpanjang sekarang" },
          { id: "remind_later", message: "Ingatkan nanti" },
          { id: "view_details", message: "Lihat detail" }
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
        message: 'Notifikasi WhatsApp terkirim',
        data: result
      })
    } else {
      throw new Error(result.reason || 'Gagal mengirim notifikasi WhatsApp. Coba lagi, ya.')
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengirim notifikasi. Coba lagi, ya.'
    }, { status: 500 })
  }
}
