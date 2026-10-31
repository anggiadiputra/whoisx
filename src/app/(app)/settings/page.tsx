'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { PageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/page-header'
import { useAppName } from '@/components/app-name-provider'
import { APP_NAME_MAX_LENGTH } from '@/lib/app-name'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { useDebounce } from '@/hooks/use-debounce'
import { 
  MessageSquare,
  Bell,
  SlidersHorizontal,
  Globe,
  Shield,
  Send,
  AlertTriangle,
  FileSearch,
  Clock,
  Smartphone,
  Loader2,
  Save,
  UserPlus,
  ShieldCheck
} from 'lucide-react'

interface SavedTurnstile {
  enabled: boolean
  siteKey: string
  secretKeySet: boolean
}

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
  const router = useRouter()
  const appName = useAppName()
  const [appNameInput, setAppNameInput] = useState(appName)
  // Sign-up and Turnstile state live on the server; null until loaded
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null)
  const [savedRegistrationEnabled, setSavedRegistrationEnabled] = useState<boolean | null>(null)
  const [savedTurnstile, setSavedTurnstile] = useState<SavedTurnstile | null>(null)
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  // Blank keeps the saved secret; the server never sends it back
  const [turnstileSecretKey, setTurnstileSecretKey] = useState('')
  const [turnstileTestToken, setTurnstileTestToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const debouncedTurnstileSiteKey = useDebounce(turnstileSiteKey.trim(), 600)
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

  useEffect(() => {
    if ((session?.user as any)?.role !== 'ADMIN') return
    fetch('/api/settings/general')
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!result) return
        setRegistrationEnabled(result.registrationEnabled)
        setSavedRegistrationEnabled(result.registrationEnabled)
        setSavedTurnstile(result.turnstile)
        setTurnstileEnabled(result.turnstile.enabled)
        setTurnstileSiteKey(result.turnstile.siteKey)
      })
      .catch(() => {
        // Leave the sign-up switch disabled; saving other settings still works
      })
  }, [session])

  // Redirect if not authenticated
  if (status === 'loading') {
    return <PageSkeleton showStats={false} showTable={false} />
  }

  if (status === 'unauthenticated') {
    return (
      <div>
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
      <div>
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

  const trimmedAppName = appNameInput.trim()
  const turnstileChanged = savedTurnstile !== null && (
    turnstileEnabled !== savedTurnstile.enabled ||
    turnstileSiteKey.trim() !== savedTurnstile.siteKey ||
    turnstileSecretKey.trim() !== ''
  )
  // Turning Turnstile on, or changing its keys while on, needs a passed test check first
  const turnstileNeedsCheck = turnstileEnabled && turnstileChanged

  const handleSaveSettings = async () => {
    if (!trimmedAppName) {
      toast({
        title: "Application Name Required",
        description: "Please enter a name for the application",
        variant: "destructive",
      })
      return
    }

    if (turnstileNeedsCheck && !turnstileTestToken) {
      toast({
        title: "Turnstile Check Required",
        description: "Enter both keys and complete the Turnstile check in the Security tab before saving",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // These settings are stored on the server; only send what changed
      const changes: {
        appName?: string
        registrationEnabled?: boolean
        turnstile?: { enabled: boolean; siteKey: string; secretKey: string; testToken: string }
      } = {}
      if (trimmedAppName !== appName) changes.appName = trimmedAppName
      if (registrationEnabled !== null && registrationEnabled !== savedRegistrationEnabled) {
        changes.registrationEnabled = registrationEnabled
      }
      if (turnstileChanged) {
        changes.turnstile = {
          enabled: turnstileEnabled,
          siteKey: turnstileSiteKey.trim(),
          secretKey: turnstileSecretKey.trim(),
          testToken: turnstileTestToken,
        }
      }

      if (Object.keys(changes).length > 0) {
        const response = await fetch('/api/settings/general', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          // A test token works once; get a fresh one for the next try
          if (changes.turnstile?.testToken) setTurnstileResetKey(key => key + 1)
          throw new Error(result.error || 'Failed to save settings')
        }
        if (result.appName !== undefined) {
          setAppNameInput(result.appName)
          // Re-render the root layout so the sidebar and page title use the new name
          router.refresh()
        }
        if (result.registrationEnabled !== undefined) {
          setSavedRegistrationEnabled(result.registrationEnabled)
        }
        if (result.turnstile !== undefined) {
          setSavedTurnstile(result.turnstile)
          setTurnstileSiteKey(result.turnstile.siteKey)
          setTurnstileSecretKey('')
          setTurnstileTestToken('')
        }
      }

      // WhatsApp settings are still kept in this browser only
      localStorage.setItem('whatsappSettings', JSON.stringify(whatsappSettings))
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully",
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
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
      data.append("message", `🔔 Test notification from ${appName}\n\nThis is a test message to verify your WhatsApp integration is working correctly.\n\n✅ Configuration successful!`)
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
    <div>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <PageHeader className="mb-8"
          title="Settings"
          description="Configure your domain management preferences and notifications"
        />

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>General</span>
            </TabsTrigger>
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

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>Application</span>
                </CardTitle>
                <CardDescription>
                  Name shown in the sidebar, sign-up page and browser tab
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  placeholder="e.g., Domain Manager"
                  maxLength={APP_NAME_MAX_LENGTH}
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Browser tabs read as &ldquo;Page | {trimmedAppName || appName}&rdquo;, e.g. &ldquo;Domains | {trimmedAppName || appName}&rdquo;
                </p>
              </CardContent>
            </Card>
          </TabsContent>

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
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                      <FileSearch className="w-5 h-5 text-green-500" />
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
                  Who can sign up, and bot protection on sign in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Public sign-up */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                    <div>
                      <Label htmlFor="registrationEnabled" className="text-base font-medium">Public Sign Up</Label>
                      <p className="text-sm text-gray-500">
                        Let anyone create a Staff account from the sign-in page. When off, add users from the Users page.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="registrationEnabled"
                    checked={registrationEnabled ?? false}
                    disabled={registrationEnabled === null}
                    onCheckedChange={setRegistrationEnabled}
                  />
                </div>

                {/* Turnstile */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <ShieldCheck className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="turnstileEnabled" className="text-base font-medium">Cloudflare Turnstile</Label>
                          <Badge variant={savedTurnstile?.enabled ? 'default' : 'secondary'}>
                            {savedTurnstile?.enabled ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Bot check on the sign-in form. Create a widget for this domain in the Cloudflare dashboard (Turnstile → Add widget) and paste its keys here.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="turnstileEnabled"
                      checked={turnstileEnabled}
                      disabled={savedTurnstile === null}
                      onCheckedChange={setTurnstileEnabled}
                    />
                  </div>

                  {turnstileEnabled && (
                    <div className="space-y-4 pl-8">
                      <div className="space-y-2">
                        <Label htmlFor="turnstileSiteKey">Site Key</Label>
                        <Input
                          id="turnstileSiteKey"
                          placeholder="0x4AAAAAAA..."
                          autoComplete="off"
                          value={turnstileSiteKey}
                          onChange={(e) => {
                            setTurnstileSiteKey(e.target.value)
                            setTurnstileTestToken('')
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="turnstileSecretKey">Secret Key</Label>
                        <Input
                          id="turnstileSecretKey"
                          type="password"
                          placeholder={savedTurnstile?.secretKeySet ? 'Saved. Leave blank to keep it' : '0x4AAAAAAA...'}
                          autoComplete="new-password"
                          value={turnstileSecretKey}
                          onChange={(e) => setTurnstileSecretKey(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">Stored on the server and never shown again</p>
                      </div>

                      {turnstileNeedsCheck && debouncedTurnstileSiteKey && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            Complete this check, then save. It confirms the keys work on this domain, so a wrong key cannot lock you out of sign in.
                          </p>
                          <TurnstileWidget
                            key={debouncedTurnstileSiteKey}
                            siteKey={debouncedTurnstileSiteKey}
                            onToken={setTurnstileTestToken}
                            resetKey={turnstileResetKey}
                            className="flex"
                          />
                        </div>
                      )}
                    </div>
                  )}
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
