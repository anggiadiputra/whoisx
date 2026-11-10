'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppName } from '@/components/app-name-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Eye, EyeOff, Globe, UserPlus, Shield, ArrowRight, Loader2, Check, X, Gift, Receipt, Headphones, Undo2 } from 'lucide-react'

export function SignUpForm() {
  const appName = useAppName()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
    
    const score = Object.values(checks).filter(Boolean).length
    return { checks, score }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nama wajib diisi')
      return false
    }

    if (!formData.email.trim()) {
      setError('Email wajib diisi')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Masukkan alamat email yang valid')
      return false
    }

    if (formData.password.length < 8) {
      setError('Kata sandi minimal 8 karakter')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Kata sandi belum sama')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Pendaftaran gagal')
      }

      setSuccess('Akun berhasil dibuat! Mengarahkan ke halaman masuk…')
      
      // Redirect to sign in page after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin?message=Account created successfully')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Ada yang salah saat mendaftar. Coba lagi, ya.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-4">

      <div className="relative w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-ink">
                  {appName}
                </h1>
                <p className="text-muted font-medium">Kelola portofolio secara profesional</p>
              </div>
            </div>
            
            <p className="text-xl text-ink leading-relaxed max-w-lg">
              Gabung bareng ribuan profesional yang mengandalkan platform ini buat kelola domain, pemantauan otomatis, dan analitik cerdas.
            </p>
          </div>
          
          {/* Benefits List */}
          <div className="space-y-4">
            {[
              { icon: Gift, text: "Coba gratis 30 hari dengan semua fitur" },
              { icon: Receipt, text: "Tanpa biaya pemasangan atau biaya tersembunyi" },
              { icon: Headphones, text: "Dukungan pelanggan 24 jam" },
              { icon: Undo2, text: "Bisa berhenti kapan saja, tanpa ribet" }
            ].map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-mint rounded-full flex items-center justify-center group-hover:bg-mint transition-colors">
                  <benefit.icon className="w-4 h-4 text-on-mint" />
                </div>
                <span className="text-ink font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-6 pt-8">
            {[
              { value: "10K+", label: "Pengguna aktif" },
              { value: "500K+", label: "Domain dikelola" },
              { value: "99.9%", label: "SLA uptime" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-ink">{stat.value}</div>
                <div className="text-sm text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Mobile Header */}
          <div className="text-center lg:hidden">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-ink">{appName}</h1>
                <p className="text-sm text-muted">Pengelolaan profesional</p>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center space-x-2 p-4 bg-mint border border-mint rounded-2xl">
              <CheckCircle className="w-5 h-5 text-on-mint" />
              <span className="text-on-mint font-medium">{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-4 bg-rose border border-rose rounded-2xl">
              <AlertCircle className="w-5 h-5 text-st-no" />
              <span className="text-st-no font-medium">{error}</span>
            </div>
          )}

          {/* Signup Card */}
          <Card>
            <CardHeader className="space-y-2 text-center pb-6">
              <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-ink">Buat akun</CardTitle>
              <CardDescription className="text-muted">
                Yuk, mulai kelola domain kamu dengan rapi
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-ink">
                    Nama lengkap
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Masukkan nama lengkap kamu"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-ink">
                    Alamat email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Masukkan alamat email kamu"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-ink">
                    Kata sandi
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Buat kata sandi yang kuat"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-muted transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-lg ${
                              level <= passwordStrength.score
                                ? passwordStrength.score <= 2
                                  ? 'bg-st-no'
                                  : passwordStrength.score <= 3
                                  ? 'bg-st-wait'
                                  : 'bg-on-mint'
                                : 'bg-sand'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(passwordStrength.checks).map(([key, passed]) => (
                          <div key={key} className="flex items-center space-x-1">
                            {passed ? (
                              <Check className="w-3 h-3 text-on-mint" />
                            ) : (
                              <X className="w-3 h-3 text-muted" />
                            )}
                            <span className={passed ? 'text-on-mint' : 'text-muted'}>
                              {key === 'length' && '8+ karakter'}
                              {key === 'uppercase' && 'Huruf besar'}
                              {key === 'lowercase' && 'Huruf kecil'}
                              {key === 'number' && 'Angka'}
                              {key === 'special' && 'Simbol'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
                    Konfirmasi kata sandi
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi kata sandi kamu"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-muted transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || passwordStrength.score < 3}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat akun…
                    </>
                  ) : (
                    <>
                      Buat akun
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <Separator />

              <div className="text-center">
                <Link
                  href="/auth/signin"
                  className="text-sm text-muted hover:text-violet transition-colors"
                >
                  Sudah punya akun? <span className="font-semibold text-violet">Masuk di sini</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <div className="text-center text-xs text-muted space-y-2">
            <p>Dengan membuat akun, kamu setuju dengan</p>
            <div className="space-x-4">
              <Link href="#" className="text-violet hover:underline">Ketentuan layanan</Link>
              <span>•</span>
              <Link href="#" className="text-violet hover:underline">Kebijakan privasi</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}