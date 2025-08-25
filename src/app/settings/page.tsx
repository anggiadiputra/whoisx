'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/navbar'
import { 
  Settings,
  MessageSquare,
  Bell,
  Shield,
  Send,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone
} from 'lucide-react'

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
    critical: number  // days
    warning: number   // days
    reminder: number  // days
  }
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
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
  })

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('whatsappSettings')
    if (savedSettings) {
      setWhatsappSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-center">Authentication Required</CardTitle>
              <CardDescription className="text-center">
                Please sign in to access settings
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Only allow Admin users to access settings
  const userRole = (session?.user as any)?.role
  if (userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-center flex items-center justify-center">
                <Shield className="w-5 h-5 mr-2" />
                Access Denied
              </CardTitle>
              <CardDescription className="text-center">
                Only administrators can access settings
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      // Here you would save settings to your backend
      // For now, we'll just simulate saving to localStorage
      localStorage.setItem('whatsappSettings', JSON.stringify(whatsappSettings))
      
      toast({
        title: "Settings Saved",
        description: "WhatsApp notification settings have been saved successfully",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestMessage = async () => {
    if (!whatsappSettings.token || !whatsappSettings.phoneNumber) {
      toast({
        title: "Missing Configuration",
        description: "Please enter both API token and phone number before testing",
        variant: "destructive",
      })
      return
    }

    setTestLoading(true)
    try {
      const data = new FormData()
      data.append("target", whatsappSettings.phoneNumber)
      data.append("message", "🔔 Test notification from Domain Management System\n\nThis is a test message to verify your WhatsApp integration is working correctly.\n\n✅ Configuration successful!")
      data.append("countryCode", "62")

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        mode: "cors",
        headers: new Headers({
          Authorization: whatsappSettings.token,
        }),
        body: data,
      })

      const result = await response.json()
      
      if (response.ok && result.status) {
        toast({
          title: "Test Message Sent",
          description: "WhatsApp test message sent successfully! Check your phone.",
          variant: "default",
        })
      } else {
        throw new Error(result.reason || 'Failed to send test message')
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || 'Failed to send test message',
        variant: "destructive",
      })
    } finally {
      setTestLoading(false)
    }
  }

  const sendDomainExpiryAlert = async (domain: string, daysLeft: number) => {
    if (!whatsappSettings.enabled || !whatsappSettings.notifications.domainExpiry) return

    try {
      const data = new FormData()
      data.append("target", whatsappSettings.phoneNumber)
      
      let message = ""
      let urgencyIcon = ""
      
      if (daysLeft <= 1) {
        urgencyIcon = "🚨"
        message = `${urgencyIcon} CRITICAL DOMAIN ALERT\\n\\n` +
                 `Domain: ${domain}\\n` +
                 `Status: EXPIRES ${daysLeft === 0 ? 'TODAY' : 'TOMORROW'}\\n` +
                 `Action Required: RENEW IMMEDIATELY\\n\\n` +
                 `⚠️ Domain will become inactive if not renewed!`
      } else if (daysLeft <= 7) {
        urgencyIcon = "⚠️"
        message = `${urgencyIcon} Domain Expiry Warning\\n\\n` +
                 `Domain: ${domain}\\n` +
                 `Expires in: ${daysLeft} days\\n` +
                 `Action: Please renew soon\\n\\n` +
                 `📅 Renewal recommended within next few days`
      } else if (daysLeft <= 30) {
        urgencyIcon = "📋"
        message = `${urgencyIcon} Domain Renewal Reminder\\n\\n` +
                 `Domain: ${domain}\\n` +
                 `Expires in: ${daysLeft} days\\n` +
                 `Status: Renewal planning recommended\\n\\n` +
                 `💡 Consider renewing to avoid last-minute issues`
      }

      data.append("message", message)
      data.append("countryCode", "62")

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        mode: "cors",
        headers: new Headers({
          Authorization: whatsappSettings.token,
        }),
        body: data,
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send WhatsApp alert:', error)
      return false
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Configure your domain management preferences and notifications</p>
        </div>

        <Tabs defaultValue="whatsapp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp Settings Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <span>WhatsApp Integration</span>
                </CardTitle>
                <CardDescription>
                  Configure WhatsApp notifications for domain alerts using Fonnte API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable WhatsApp */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Enable WhatsApp Notifications</Label>
                    <p className="text-sm text-gray-500">Receive domain alerts via WhatsApp</p>
                  </div>
                  <Switch
                    checked={whatsappSettings.enabled}
                    onCheckedChange={(checked) => 
                      setWhatsappSettings(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                {whatsappSettings.enabled && (
                  <>
                    {/* API Token */}
                    <div className="space-y-2">
                      <Label htmlFor="token">Fonnte API Token</Label>
                      <Input
                        id="token"
                        type="password"
                        placeholder="Enter your Fonnte API token"
                        value={whatsappSettings.token}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({ ...prev, token: e.target.value }))
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Get your token from <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">fonnte.com</a>
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="e.g., 082227097005"
                        value={whatsappSettings.phoneNumber}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({ ...prev, phoneNumber: e.target.value }))
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Enter phone number without country code (Indonesia +62 is default)
                      </p>
                    </div>

                    {/* Test Message */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleTestMessage}
                        disabled={testLoading || !whatsappSettings.token || !whatsappSettings.phoneNumber}
                        className="w-full"
                      >
                        {testLoading ? (
                          <>
                            <TestTube className="w-4 h-4 mr-2 animate-spin" />
                            Sending Test Message...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Test Message
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose which events should trigger WhatsApp notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Types */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <Label className="text-base font-medium">Domain Expiry Alerts</Label>
                        <p className="text-sm text-gray-500">Critical domain expiration warnings</p>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappSettings.notifications.domainExpiry}
                      onCheckedChange={(checked) => 
                        setWhatsappSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, domainExpiry: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <Label className="text-base font-medium">WHOIS Updates</Label>
                        <p className="text-sm text-gray-500">Notifications when WHOIS data changes</p>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappSettings.notifications.whoisUpdates}
                      onCheckedChange={(checked) => 
                        setWhatsappSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, whoisUpdates: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <div>
                        <Label className="text-base font-medium">Critical Alerts</Label>
                        <p className="text-sm text-gray-500">Immediate alerts for urgent issues</p>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappSettings.notifications.criticalAlerts}
                      onCheckedChange={(checked) => 
                        setWhatsappSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, criticalAlerts: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label className="text-base font-medium">Daily Reports</Label>
                        <p className="text-sm text-gray-500">Daily summary of domain status</p>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappSettings.notifications.dailyReports}
                      onCheckedChange={(checked) => 
                        setWhatsappSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, dailyReports: checked }
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Expiry Thresholds */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">Expiry Alert Thresholds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="critical">Critical (Days)</Label>
                      <Input
                        id="critical"
                        type="number"
                        min="1"
                        max="30"
                        value={whatsappSettings.expiryThresholds.critical}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({
                            ...prev,
                            expiryThresholds: { ...prev.expiryThresholds, critical: parseInt(e.target.value) || 7 }
                          }))
                        }
                      />
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="warning">Warning (Days)</Label>
                      <Input
                        id="warning"
                        type="number"
                        min="1"
                        max="90"
                        value={whatsappSettings.expiryThresholds.warning}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({
                            ...prev,
                            expiryThresholds: { ...prev.expiryThresholds, warning: parseInt(e.target.value) || 30 }
                          }))
                        }
                      />
                      <Badge variant="secondary" className="text-xs">Important</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reminder">Reminder (Days)</Label>
                      <Input
                        id="reminder"
                        type="number"
                        min="1"
                        max="365"
                        value={whatsappSettings.expiryThresholds.reminder}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({
                            ...prev,
                            expiryThresholds: { ...prev.expiryThresholds, reminder: parseInt(e.target.value) || 90 }
                          }))
                        }
                      />
                      <Badge variant="outline" className="text-xs">Info</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>Security Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage security preferences and API access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Security Features</h3>
                  <p className="text-gray-600">
                    Additional security settings will be available in future updates
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
            size="lg"
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Settings className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
