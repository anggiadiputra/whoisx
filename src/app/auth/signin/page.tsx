'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Eye, EyeOff, Globe, Shield, User, DollarSign, CheckCircle, Copy, Loader2, ArrowRight, Sparkles } from 'lucide-react'

const demoAccounts = [
  {
    role: 'Admin',
    email: 'admin@example.com',
    password: 'password123',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Full access to all features',
    badge: 'Full Access'
  },
  {
    role: 'Staff',
    email: 'staff@example.com', 
    password: 'password123',
    icon: User,
    color: 'bg-blue-500',
    description: 'Domain management only',
    badge: 'Management'
  },
  {
    role: 'Finance',
    email: 'finance@example.com',
    password: 'password123', 
    icon: DollarSign,
    color: 'bg-green-500',
    description: 'Read-only with pricing access',
    badge: 'Read Only'
  }
]

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auto-fill demo credentials when clicked
  const fillDemoCredentials = (account: typeof demoAccounts[0]) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
    setSuccess(`Demo credentials filled for ${account.role}`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // Copy email to clipboard
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(''), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  // Check for redirect from middleware
  useEffect(() => {
    const from = searchParams.get('from')
    if (from) {
      setError('Please sign in to access that page')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Check session and redirect
        const session = await getSession()
        if (session) {
          const from = searchParams.get('from') || '/'
          router.push(from)
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative w-full max-w-md mx-auto space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        )}

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              Access your domain management dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/auth/signup"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Don't have an account? <span className="font-semibold text-blue-600">Create one now</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-gray-900">Try Demo Accounts</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Experience different role permissions instantly
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {demoAccounts.map((account, index) => {
              const IconComponent = account.icon
              return (
                <div
                  key={index}
                  onClick={() => fillDemoCredentials(account)}
                  className="group relative overflow-hidden border-2 border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${account.color} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">{account.role}</p>
                          <Badge variant="secondary" className="text-xs">
                            {account.badge}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{account.description}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{account.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyEmail(account.email)
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Copy email"
                      >
                        {copiedEmail === account.email ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-xs text-gray-400">Click to use</span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            <Separator className="my-4" />
            
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">
                All demo accounts use password: <code className="bg-blue-100 px-2 py-1 rounded font-mono">password123</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}