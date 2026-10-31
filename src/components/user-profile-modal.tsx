'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, formatDistanceToNow } from 'date-fns'
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

// Same colors as the role/status pills on the Users page
const ROLE_TONES: Record<string, PillTone> = { ADMIN: 'purple', STAFF: 'blue', FINANCE: 'green' }
const STATUS_TONES: Record<string, PillTone> = { ACTIVE: 'green', INACTIVE: 'gray', SUSPENDED: 'red' }

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

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
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
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
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (wantsPasswordChange) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password'
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
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
          title: 'Success',
          description: formData.newPassword ? 'Profile and password updated successfully' : 'Profile updated successfully'
        })
        onOpenChange(false)
      } else {
        // Server-side password errors belong to the Security tab
        if (/password/i.test(result.error || '')) {
          setTab('security')
          setErrors(prev => ({ ...prev, currentPassword: result.error }))
        }
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
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
    dateString ? `Last login ${formatDistanceToNow(new Date(dateString), { addSuffix: true })}` : 'Never logged in'

  const renderPasswordField = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    label: string,
    placeholder: string,
    autoComplete: string,
    hint?: string
  ) => {
    const error = errors[field] || (field === 'confirmPassword' && confirmMismatch ? 'Passwords do not match' : '')
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
            className={`pr-10 ${error ? 'border-red-500' : ''}`}
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => setVisible(prev => ({ ...prev, [field]: !prev[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={visible[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          >
            {visible[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : hint ? (
          <p className="text-sm text-gray-500">{hint}</p>
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
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription className="sr-only">Your account details</DialogDescription>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-500">Failed to load profile data</p>
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
                  <DialogTitle className="truncate text-lg font-bold text-gray-900">{displayName}</DialogTitle>
                  <DialogDescription className="truncate">{profile.email}</DialogDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone={ROLE_TONES[profile.role] ?? 'gray'}>{titleCase(profile.role)}</StatusPill>
                <StatusPill tone={STATUS_TONES[profile.status] ?? 'gray'}>{titleCase(profile.status)}</StatusPill>
                <span className="text-sm text-gray-500">
                  Joined {format(new Date(profile.createdAt), 'd MMM yyyy')} · {formatLastLogin(profile.lastLoginAt)}
                </span>
              </div>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="security">
                    <Lock className="w-4 h-4" />
                    Security
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Only the fields scroll; the footer stays put */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <TabsContent value="profile" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                      disabled={saving}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                      disabled={saving}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <p className="text-sm text-gray-500">Leave these fields blank to keep your current password.</p>
                  {renderPasswordField('currentPassword', 'Current Password', 'Enter current password', 'current-password')}
                  {renderPasswordField('newPassword', 'New Password', 'Enter new password', 'new-password', 'At least 6 characters')}
                  {renderPasswordField('confirmPassword', 'Confirm New Password', 'Confirm new password', 'new-password')}
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !isDirty}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
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
