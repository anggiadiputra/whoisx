'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusPill, PillTone } from '@/components/status-pill'
import { useToast } from '@/hooks/use-toast'
import { useRefreshApiData } from '@/hooks/use-api-query'
import { User, Lock, Eye, EyeOff, Save, X, Loader2 } from 'lucide-react'

interface UserProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserProfile {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
}

type FormField = 'name' | 'email' | 'currentPassword' | 'newPassword' | 'confirmPassword'
type Tab = 'profile' | 'security'

const EMPTY_ERRORS: Record<FormField, string> = {
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
}

// Same colors as the status pills on the Users page
const STATUS_TONES: Record<string, PillTone> = { ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'red' }

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktif', INACTIVE: 'Nonaktif', SUSPENDED: 'Ditangguhkan' }

export function UserProfileModal({ open, onOpenChange }: UserProfileModalProps) {
  const { update: updateSession } = useSession()
  const { toast } = useToast()
  const refreshApiData = useRefreshApiData()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('profile')
  const [visible, setVisible] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState(EMPTY_ERRORS)

  // Fetch user profile
  const fetchProfile = async () => {
    if (!open) return

    setLoading(true)
    setTab('profile')
    setErrors(EMPTY_ERRORS)
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const userData = await response.json()
        setProfile(userData)
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        toast({
          title: 'Gagal',
          description: 'Gagal memuat data profil',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memuat data profil',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [open])

  const wantsPasswordChange = Boolean(formData.currentPassword || formData.newPassword || formData.confirmPassword)
  const isDirty = profile !== null && (
    formData.name !== (profile.name || '') ||
    formData.email !== profile.email ||
    wantsPasswordChange
  )
  // Shown while typing, before the form is submitted
  const confirmMismatch = formData.confirmPassword !== '' && formData.newPassword !== formData.confirmPassword

  // Validate form
  const validateForm = () => {
    const newErrors = { ...EMPTY_ERRORS }

    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Masukkan email yang valid'
    }

    if (wantsPasswordChange) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Isi kata sandi saat ini untuk ganti kata sandi'
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Kata sandi baru minimal 6 karakter'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Kata sandi belum sama'
      }
    }

    setErrors(newErrors)

    // Show the tab that holds the first problem
    if (newErrors.name || newErrors.email) {
      setTab('profile')
    } else if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
      setTab('security')
    }

    return !Object.values(newErrors).some(error => error !== '')
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      const updateData: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim()
      }

      // Only include password fields if user wants to change password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (response.ok) {
        // The JWT callback copies name/email on update, so the topbar refreshes without a page reload
        await updateSession({
          name: result.user.name,
          email: result.user.email
        })
        setProfile(prev => prev ? { ...prev, ...result.user } : prev)
        // Lists such as Users and Recent Activity may show this user's name
        refreshApiData()

        toast({
          title: 'Beres!',
          description: formData.newPassword ? 'Profil dan kata sandi berhasil diperbarui' : 'Profil berhasil diperbarui'
        })
        onOpenChange(false)
      } else {
        // Server-side password errors belong to the Security tab
        if (/password/i.test(result.error || '')) {
          setTab('security')
          setErrors(prev => ({ ...prev, currentPassword: result.error }))
        }
        toast({
          title: 'Gagal',
          description: result.error || 'Gagal memperbarui profil',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memperbarui profil',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle input changes
  const handleInputChange = (field: FormField, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatLastLogin = (dateString: string | null) =>
    dateString ? `Terakhir masuk ${formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: localeId })}` : 'Belum pernah masuk'

  const renderPasswordField = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    label: string,
    placeholder: string,
    autoComplete: string,
    hint?: string
  ) => {
    const error = errors[field] || (field === 'confirmPassword' && confirmMismatch ? 'Kata sandi belum sama' : '')
    return (
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="relative">
          <Input
            id={field}
            type={visible[field] ? 'text' : 'password'}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`pr-10 ${error ? 'border-st-no' : ''}`}
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => setVisible(prev => ({ ...prev, [field]: !prev[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
            aria-label={visible[field] ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
          >
            {visible[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="text-sm text-st-no">{error}</p>
        ) : hint ? (
          <p className="text-sm text-muted">{hint}</p>
        ) : null}
      </div>
    )
  }

  const displayName = profile?.name || profile?.email || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[500px]">
        {loading || !profile ? (
          <>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Profil pengguna</DialogTitle>
              <DialogDescription className="sr-only">Detail akun kamu</DialogDescription>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet" />
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted">Gagal memuat data profil. Tutup lalu buka lagi, ya.</p>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* Identity header */}
            <DialogHeader className="space-y-0 px-6 pb-4 pt-6 text-left">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-lg font-bold text-ink">{displayName}</DialogTitle>
                  <DialogDescription className="truncate">{profile.email}</DialogDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone={STATUS_TONES[profile.status] ?? 'gray'}>{STATUS_LABELS[profile.status] ?? 'Tidak diketahui'}</StatusPill>
                <span className="text-sm text-muted">
                  Bergabung {format(new Date(profile.createdAt), 'd MMM yyyy', { locale: localeId })} · {formatLastLogin(profile.lastLoginAt)}
                </span>
              </div>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">
                    <User className="w-4 h-4" />
                    Profil
                  </TabsTrigger>
                  <TabsTrigger value="security">
                    <Lock className="w-4 h-4" />
                    Keamanan
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Only the fields scroll; the footer stays put */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <TabsContent value="profile" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama lengkap</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Masukkan nama lengkap kamu"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-st-no' : ''}
                      disabled={saving}
                    />
                    {errors.name && <p className="text-sm text-st-no">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Alamat email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Masukkan email kamu"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-st-no' : ''}
                      disabled={saving}
                    />
                    {errors.email && <p className="text-sm text-st-no">{errors.email}</p>}
                  </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <p className="text-sm text-muted">Kosongkan kolom ini kalau nggak mau ganti kata sandi.</p>
                  {renderPasswordField('currentPassword', 'Kata sandi saat ini', 'Masukkan kata sandi saat ini', 'current-password')}
                  {renderPasswordField('newPassword', 'Kata sandi baru', 'Masukkan kata sandi baru', 'new-password', 'Minimal 6 karakter')}
                  {renderPasswordField('confirmPassword', 'Konfirmasi kata sandi baru', 'Ulangi kata sandi baru', 'new-password')}
                </TabsContent>
              </div>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || !isDirty}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
