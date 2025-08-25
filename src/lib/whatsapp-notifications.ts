interface WhatsAppSettings {
  enabled: boolean
  token: string
  phoneNumber: string
  notifications: {
    domainExpiry: boolean
    whoisUpdates: boolean
    criticalAlerts: boolean
    dailyReports: boolean
  }
  expiryThresholds: {
    critical: number
    warning: number
    reminder: number
  }
}

interface Domain {
  id: string
  domain: string
  expiryDate?: Date | string
  daysToExpiry?: number
  status: string
}

export class WhatsAppNotificationService {
  private settings: WhatsAppSettings | null = null

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('whatsappSettings')
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings)
      }
    }
  }

  private async sendNotification(
    type: 'domain_expiry' | 'whois_update' | 'critical_alert' | 'daily_report' | 'test',
    options: {
      domain?: string
      daysLeft?: number
      message?: string
    } = {}
  ): Promise<boolean> {
    if (!this.settings?.enabled || !this.settings.token || !this.settings.phoneNumber) {
      // WhatsApp notifications not configured
      return false
    }

    try {
      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          domain: options.domain,
          daysLeft: options.daysLeft,
          message: options.message,
          phoneNumber: this.settings.phoneNumber,
          token: this.settings.token
        })
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
      return false
    }
  }

  async sendDomainExpiryAlert(domain: Domain): Promise<boolean> {
    if (!this.settings?.notifications.domainExpiry) {
      return false
    }

    const daysLeft = domain.daysToExpiry
    if (daysLeft === undefined || daysLeft === null) {
      return false
    }

    // Check if we should send notification based on thresholds
    const { critical, warning, reminder } = this.settings.expiryThresholds
    
    if (daysLeft <= critical || daysLeft <= warning || daysLeft <= reminder) {
      return await this.sendNotification('domain_expiry', {
        domain: domain.domain,
        daysLeft
      })
    }

    return false
  }

  async sendWhoisUpdateNotification(domain: string): Promise<boolean> {
    if (!this.settings?.notifications.whoisUpdates) {
      return false
    }

    return await this.sendNotification('whois_update', {
      domain
    })
  }

  async sendCriticalAlert(message: string): Promise<boolean> {
    if (!this.settings?.notifications.criticalAlerts) {
      return false
    }

    return await this.sendNotification('critical_alert', {
      message
    })
  }

  async sendDailyReport(domains: Domain[]): Promise<boolean> {
    if (!this.settings?.notifications.dailyReports) {
      return false
    }

    const totalDomains = domains.length
    const expiredDomains = domains.filter(d => d.daysToExpiry !== null && d.daysToExpiry! < 0).length
    const criticalDomains = domains.filter(d => d.daysToExpiry !== null && d.daysToExpiry! <= this.settings!.expiryThresholds.critical).length
    const warningDomains = domains.filter(d => d.daysToExpiry !== null && d.daysToExpiry! <= this.settings!.expiryThresholds.warning).length

    const reportMessage = `📊 Daily Domain Report Summary\n\n` +
                         `Total Domains: ${totalDomains}\n` +
                         `Expired: ${expiredDomains}\n` +
                         `Critical (≤${this.settings.expiryThresholds.critical} days): ${criticalDomains}\n` +
                         `Warning (≤${this.settings.expiryThresholds.warning} days): ${warningDomains}\n\n` +
                         `Generated: ${new Date().toLocaleString('id-ID')}`

    return await this.sendNotification('daily_report', {
      message: reportMessage
    })
  }

  async sendTestMessage(): Promise<boolean> {
    return await this.sendNotification('test')
  }

  // Method to check and send notifications for all domains
  async checkAndSendExpiryNotifications(domains: Domain[]): Promise<void> {
    if (!this.settings?.enabled || !this.settings.notifications.domainExpiry) {
      return
    }

    for (const domain of domains) {
      if (domain.daysToExpiry !== undefined && domain.daysToExpiry !== null) {
        const { critical, warning, reminder } = this.settings.expiryThresholds
        
        // Send notification if domain is within any threshold
        if (domain.daysToExpiry <= critical || 
            domain.daysToExpiry <= warning || 
            domain.daysToExpiry <= reminder) {
          
          // Add some delay between notifications to avoid spam
          await new Promise(resolve => setTimeout(resolve, 1000))
          await this.sendDomainExpiryAlert(domain)
        }
      }
    }
  }

  // Update settings
  updateSettings(newSettings: WhatsAppSettings) {
    this.settings = newSettings
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsappSettings', JSON.stringify(newSettings))
    }
  }

  // Get current settings
  getSettings(): WhatsAppSettings | null {
    return this.settings
  }
}

// Export singleton instance
export const whatsappNotificationService = new WhatsAppNotificationService()

// Helper function to integrate with existing domain management
export async function sendDomainExpiryNotifications(domains: Domain[]) {
  await whatsappNotificationService.checkAndSendExpiryNotifications(domains)
}

export async function sendWhoisUpdateNotification(domainName: string) {
  await whatsappNotificationService.sendWhoisUpdateNotification(domainName)
}

export async function sendCriticalAlert(message: string) {
  await whatsappNotificationService.sendCriticalAlert(message)
}
