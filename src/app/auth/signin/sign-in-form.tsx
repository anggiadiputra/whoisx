'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { TURNSTILE_FAILED } from '@/lib/turnstile'
import { AlertCircle, Eye, EyeOff, Globe, Loader2, ArrowRight } from 'lucide-react'

interface SignInFormProps {
  registrationEnabled: boolean
  turnstileSiteKey: string | null
}

export function SignInForm({ registrationEnabled, turnstileSiteKey }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        turnstileToken,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error === TURNSTILE_FAILED
          ? 'Pemeriksaan keamanan gagal. Coba lagi, ya.'
          : 'Email atau kata sandi salah')
        // The token was spent on this attempt
        if (turnstileSiteKey) setTurnstileResetKey(key => key + 1)
      } else {
        // Check session and redirect
        const session = await getSession()
        if (session) {
          const from = searchParams.get('from') || '/'
          router.push(from)
        }
      }
    } catch (error) {
      setError('Ada yang salah. Coba lagi, ya.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">

      <div className="relative w-full max-w-md mx-auto space-y-6">
        {/* Error Message */}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose px-4 py-3 text-sm font-bold text-st-no">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {/* Login Card */}
        <Card>
          <CardHeader className="space-y-2 pb-6">
            <div className="mb-4 grid size-12 place-items-center rounded-[16px] bg-violet text-lime">
              <Globe className="size-6" />
            </div>
            <CardTitle className="text-[36px] leading-[1.04] tracking-[-0.035em]">Halo lagi</CardTitle>
            <CardDescription className="text-[15px] font-medium">
              Masuk dulu buat kelola domain kamu
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-[13px] font-extrabold">
                  Alamat email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan alamat email kamu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[13px] font-extrabold">
                  Kata sandi
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi kamu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted transition-colors hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {turnstileSiteKey && (
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onToken={setTurnstileToken}
                  resetKey={turnstileResetKey}
                />
              )}

              <Button
                type="submit"
                disabled={loading || (!!turnstileSiteKey && !turnstileToken)}
                className="w-full shadow-float"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sedang masuk…
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {registrationEnabled && (
              <div className="text-center">
                <Link
                  href="/auth/signup"
                  className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
                >
                  Belum punya akun? <span className="font-extrabold text-violet">Daftar sekarang</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
