'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UserProfileModal } from '@/components/user-profile-modal'
import { 
  Globe, 
  LogOut, 
  User, 
  Settings, 
  Bell, 
  Menu,
  X,
  Shield,
  DollarSign,
  Users,
  Server,
  ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function Navbar() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { 
          label: 'Admin', 
          color: 'bg-red-100 text-red-800', 
          icon: Shield 
        }
      case 'STAFF':
        return { 
          label: 'Staff', 
          color: 'bg-blue-100 text-blue-800', 
          icon: Users 
        }
      case 'FINANCE':
        return { 
          label: 'Finance', 
          color: 'bg-green-100 text-green-800', 
          icon: DollarSign 
        }
      default:
        return { 
          label: 'User', 
          color: 'bg-gray-100 text-gray-800', 
          icon: User 
        }
    }
  }

  const roleInfo = session?.user?.role ? getRoleInfo(session.user.role) : null
  const RoleIcon = roleInfo?.icon

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (userMenuOpen && !target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Domain Manager
              </h1>
              <p className="text-xs text-gray-500 -mt-1">Professional Management</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {session ? (
              <>
                {/* Navigation Links */}
                <div className="flex items-center space-x-1">
                  <Link href="/">
                    <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                      Dashboard
                    </Button>
                  </Link>
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/domains">
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                        Domains
                      </Button>
                    </Link>
                  )}
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/servers">
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                        Servers
                      </Button>
                    </Link>
                  )}
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/websites">
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                        Websites
                      </Button>
                    </Link>
                  )}
                  
                  {session.user.role === 'ADMIN' && (
                    <Link href="/users">
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                        Users
                      </Button>
                    </Link>
                  )}
                  
                  {session.user.role === 'ADMIN' && (
                    <Link href="/settings">
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                        Settings
                      </Button>
                    </Link>
                  )}
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>

                {/* User Menu */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {session.user.name || session.user.email}
                        </p>
                        {roleInfo && RoleIcon && (
                          <Badge className={`text-xs ${roleInfo.color} border-0`}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{session.user.email}</p>
                    </div>
                    
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md">
                      {(session.user.name || session.user.email || '').charAt(0).toUpperCase()}
                    </div>
                    
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setProfileModalOpen(true)
                          setUserMenuOpen(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Edit Profile
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          signOut()
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>


              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
            {session ? (
              <>
                {/* User Info */}
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                    {(session.user.name || session.user.email || '').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">
                        {session.user.name || session.user.email}
                      </p>
                      {roleInfo && RoleIcon && (
                        <Badge className={`text-xs ${roleInfo.color} border-0`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{session.user.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Navigation Links */}
                <div className="space-y-2">
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Dashboard
                    </Button>
                  </Link>
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/domains" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Domains
                      </Button>
                    </Link>
                  )}
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/servers" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Server className="w-4 h-4 mr-2" />
                        Servers
                      </Button>
                    </Link>
                  )}
                  
                  {(session.user.role === 'ADMIN' || session.user.role === 'STAFF') && (
                    <Link href="/websites" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Globe className="w-4 h-4 mr-2" />
                        Websites
                      </Button>
                    </Link>
                  )}
                  
                  {session.user.role === 'ADMIN' && (
                    <Link href="/users" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Users className="w-4 h-4 mr-2" />
                        Users
                      </Button>
                    </Link>
                  )}
                  
                  {session.user.role === 'ADMIN' && (
                    <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                  )}

                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                    <Badge className="ml-auto bg-red-500 text-white text-xs">3</Badge>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setProfileModalOpen(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                <Separator />

                {/* Sign Out */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
      />
    </nav>
  )
}