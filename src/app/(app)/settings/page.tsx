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
        <div className="w-full">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-center">Perlu masuk dulu</CardTitle>
              <CardDescription className="text-center">
                Masuk dulu buat buka pengaturan
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
        <div className="w-full">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-center flex items-center justify-center">
                <Shield className="w-5 h-5 mr-2" />
                Akses ditolak
              </CardTitle>
              <CardDescription className="text-center">
                Cuma admin yang bisa buka pengaturan
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
        title: "Nama aplikasi belum diisi",
        description: "Isi dulu nama aplikasinya",
        variant: "destructive",
      })
      return
    }

    if (turnstileNeedsCheck && !turnstileTestToken) {
      toast({
        title: "Perlu cek Turnstile dulu",
        description: "Isi kedua key dan selesaikan pemeriksaan Turnstile di tab Keamanan sebelum menyimpan",
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
          throw new Error(result.error || 'Gagal menyimpan pengaturan')
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
        title: "Pengaturan tersimpan",
        description: "Pengaturan kamu sudah disimpan",
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan",
        description: error.message || "Gagal menyimpan pengaturan. Coba lagi, ya.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestMessage = async () => {
    if (!whatsappSettings.token || !whatsappSettings.phoneNumber) {
      toast({
        title: "Konfigurasi belum lengkap",
        description: "Isi dulu token API dan nomor WhatsApp sebelum tes",
        variant: "destructive",
      })
      return
    }

    setTestLoading(true)
    try {
      const data = new FormData()
      data.append("target", whatsappSettings.phoneNumber)
      data.append("message", `🔔 Notifikasi tes dari ${appName}\n\nIni pesan tes untuk memastikan integrasi WhatsApp kamu sudah berjalan.\n\n✅ Konfigurasi berhasil!`)
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
          title: "Pesan tes terkirim",
          description: "Pesan tes WhatsApp berhasil dikirim. Cek ponsel kamu.",
          variant: "default",
        })
      } else {
        throw new Error(result.reason || 'Gagal mengirim pesan tes')
      }
    } catch (error: any) {
      toast({
        title: "Tes gagal",
        description: error.message || 'Gagal mengirim pesan tes',
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
        message = `${urgencyIcon} PERINGATAN KRITIS DOMAIN\n\n` +
                 `Domain: ${domain}\n` +
                 `Status: KEDALUWARSA ${daysLeft === 0 ? 'HARI INI' : 'BESOK'}\n` +
                 `Tindakan: SEGERA PERPANJANG\n\n` +
                 `⚠️ Domain akan nonaktif kalau tidak diperpanjang!`
      } else if (daysLeft <= 7) {
        urgencyIcon = "⚠️"
        message = `${urgencyIcon} Peringatan domain kedaluwarsa\n\n` +
                 `Domain: ${domain}\n` +
                 `Kedaluwarsa dalam: ${daysLeft} hari\n` +
                 `Tindakan: Segera perpanjang, ya\n\n` +
                 `📅 Sebaiknya diperpanjang dalam beberapa hari ini`
      } else if (daysLeft <= 30) {
        urgencyIcon = "📋"
        message = `${urgencyIcon} Pengingat perpanjangan domain\n\n` +
                 `Domain: ${domain}\n` +
                 `Kedaluwarsa dalam: ${daysLeft} hari\n` +
                 `Status: Mulai rencanakan perpanjangan\n\n` +
                 `💡 Perpanjang lebih awal supaya nggak mepet`
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
      <div className="w-full">
        {/* Page Header */}
        <PageHeader className="mb-8"
          title="Pengaturan"
          description="Atur preferensi pengelolaan domain dan notifikasi kamu"
        />

        <Tabs defaultValue="general" className="space-y-6">
          {/* Two rows on phones, where four labels do not fit side by side */}
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-card sm:grid-cols-4">
            <TabsTrigger value="general" className="flex items-center space-x-2 h-8">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Umum</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center space-x-2 h-8">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2 h-8">
              <Bell className="w-4 h-4" />
              <span>Notifikasi</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2 h-8">
              <Shield className="w-4 h-4" />
              <span>Keamanan</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-violet" />
                  <span>Aplikasi</span>
                </CardTitle>
                <CardDescription>
                  Nama yang tampil di sidebar, halaman daftar, dan tab browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="appName">Nama aplikasi</Label>
                <Input
                  id="appName"
                  placeholder="mis. Domain Manager"
                  maxLength={APP_NAME_MAX_LENGTH}
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                />
                <p className="text-xs text-muted">
                  Judul tab browser jadi &ldquo;Halaman | {trimmedAppName || appName}&rdquo;, misalnya &ldquo;Domain | {trimmedAppName || appName}&rdquo;
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Settings Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-on-mint" />
                  <span>Integrasi WhatsApp</span>
                </CardTitle>
                <CardDescription>
                  Atur notifikasi WhatsApp untuk peringatan domain lewat API Fonnte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable WhatsApp */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Aktifkan notifikasi WhatsApp</Label>
                    <p className="text-sm text-muted">Terima peringatan domain lewat WhatsApp</p>
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
                      <Label htmlFor="token">Token API Fonnte</Label>
                      <Input
                        id="token"
                        type="password"
                        placeholder="Masukkan token API Fonnte kamu"
                        value={whatsappSettings.token}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({ ...prev, token: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted">
                        Ambil token kamu di <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">fonnte.com</a>
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Nomor WhatsApp</Label>
                      <Input
                        id="phone"
                        placeholder="mis. 082227097005"
                        value={whatsappSettings.phoneNumber}
                        onChange={(e) => 
                          setWhatsappSettings(prev => ({ ...prev, phoneNumber: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted">
                        Masukkan nomor tanpa kode negara (bawaannya Indonesia +62)
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
                            Mengirim pesan tes…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Kirim pesan tes
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
                  <Bell className="w-5 h-5 text-violet" />
                  <span>Preferensi notifikasi</span>
                </CardTitle>
                <CardDescription>
                  Pilih kejadian apa saja yang dikabari lewat WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Types */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-st-no" />
                      <div>
                        <Label className="text-base font-medium">Peringatan domain kedaluwarsa</Label>
                        <p className="text-sm text-muted">Peringatan penting saat domain hampir kedaluwarsa</p>
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
                      <FileSearch className="w-5 h-5 text-on-mint" />
                      <div>
                        <Label className="text-base font-medium">Pembaruan WHOIS</Label>
                        <p className="text-sm text-muted">Notifikasi saat data WHOIS berubah</p>
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
                      <AlertTriangle className="w-5 h-5 text-on-peach" />
                      <div>
                        <Label className="text-base font-medium">Peringatan kritis</Label>
                        <p className="text-sm text-muted">Peringatan langsung untuk masalah mendesak</p>
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
                      <Clock className="w-5 h-5 text-violet" />
                      <div>
                        <Label className="text-base font-medium">Laporan harian</Label>
                        <p className="text-sm text-muted">Ringkasan harian status domain</p>
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
                  <h3 className="text-lg font-extrabold tracking-[-0.02em] mb-4">Batas peringatan kedaluwarsa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="critical">Kritis (hari)</Label>
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
                      <Badge variant="destructive" className="text-xs">Mendesak</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="warning">Peringatan (hari)</Label>
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
                      <Badge variant="secondary" className="text-xs">Penting</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reminder">Pengingat (hari)</Label>
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
                  <Shield className="w-5 h-5 text-on-mint" />
                  <span>Pengaturan keamanan</span>
                </CardTitle>
                <CardDescription>
                  Siapa yang boleh daftar, dan perlindungan bot saat masuk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Public sign-up */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="w-5 h-5 text-violet" />
                    <div>
                      <Label htmlFor="registrationEnabled" className="text-base font-medium">Pendaftaran publik</Label>
                      <p className="text-sm text-muted">
                        Siapa pun bisa bikin akun Staf dari halaman masuk. Kalau dimatikan, tambah pengguna dari halaman Pengguna.
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
                      <ShieldCheck className="w-5 h-5 text-on-peach" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="turnstileEnabled" className="text-base font-medium">Cloudflare Turnstile</Label>
                          <Badge variant={savedTurnstile?.enabled ? 'default' : 'secondary'}>
                            {savedTurnstile?.enabled ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted">
                          Pemeriksaan bot di form masuk. Buat widget untuk domain ini di dashboard Cloudflare (Turnstile → Add widget), lalu tempel key-nya di sini.
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
                        <Label htmlFor="turnstileSiteKey">Site key</Label>
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
                        <Label htmlFor="turnstileSecretKey">Secret key</Label>
                        <Input
                          id="turnstileSecretKey"
                          type="password"
                          placeholder={savedTurnstile?.secretKeySet ? 'Sudah tersimpan. Kosongkan kalau nggak mau ganti' : '0x4AAAAAAA...'}
                          autoComplete="new-password"
                          value={turnstileSecretKey}
                          onChange={(e) => setTurnstileSecretKey(e.target.value)}
                        />
                        <p className="text-xs text-muted">Disimpan di server dan nggak bakal ditampilkan lagi</p>
                      </div>

                      {turnstileNeedsCheck && debouncedTurnstileSiteKey && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted">
                            Selesaikan pemeriksaan ini dulu, baru simpan. Ini memastikan key-nya jalan di domain ini, jadi key yang salah nggak bikin kamu terkunci dari halaman masuk.
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
                Menyimpan…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan pengaturan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
