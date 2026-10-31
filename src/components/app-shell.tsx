'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  AppWindow,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Menu,
  Server,
  Settings,
  Shield,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserProfileModal } from '@/components/user-profile-modal'

type Role = 'ADMIN' | 'STAFF' | 'FINANCE'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

// Sidebar sections; items are hidden for roles that cannot open the page
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'FINANCE'] },
    ],
  },
  {
    label: 'Assets',
    items: [
      { href: '/domains', label: 'Domains', icon: Globe, roles: ['ADMIN', 'STAFF'] },
      { href: '/servers', label: 'Servers', icon: Server, roles: ['ADMIN', 'STAFF'] },
      { href: '/websites', label: 'Websites', icon: AppWindow, roles: ['ADMIN', 'STAFF'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
      { href: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
]

const ROLE_INFO: Record<Role, { label: string; color: string; icon: LucideIcon }> = {
  ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-800', icon: Shield },
  STAFF: { label: 'Staff', color: 'bg-blue-100 text-blue-800', icon: Users },
  FINANCE: { label: 'Finance', color: 'bg-green-100 text-green-800', icon: Wallet },
}

const COLLAPSED_KEY = 'sidebar-collapsed'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  // Desktop: sidebar can be collapsed. Mobile: sidebar is a drawer.
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    } catch {
      // Storage unavailable (private mode); keep the sidebar expanded
    }
  }, [])

  // Close the mobile drawer after navigating
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      const next = !collapsed
      setCollapsed(next)
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // Ignore storage errors; the toggle still works for this visit
      }
    } else {
      setDrawerOpen(open => !open)
    }
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const role = session?.user?.role as Role | undefined
  const roleInfo = role ? ROLE_INFO[role] : null
  const RoleIcon = roleInfo?.icon
  const displayName = session?.user?.name || session?.user?.email || ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden animate-in fade-in-0"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
      >
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Domain Manager</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map(group => {
            const items = group.items.filter(item => role && item.roles.includes(role))
            if (items.length === 0) return null
            return (
              <div key={group.label}>
                <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {items.map(item => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main column */}
      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-0' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
          </Button>

          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  {roleInfo && RoleIcon && (
                    <Badge className={`mt-0.5 border-0 text-xs ${roleInfo.color}`}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {roleInfo.label}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{session.user.name || 'Account'}</p>
                  <p className="truncate text-xs font-normal text-gray-500">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setProfileModalOpen(true)}>
                  <User />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => signOut()}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <main>{children}</main>
      </div>

      <UserProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </div>
  )
}
