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
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Settings,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserProfileModal } from '@/components/user-profile-modal'
import { useAppName } from '@/components/app-name-provider'

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

const COLLAPSED_KEY = 'sidebar-collapsed'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const appName = useAppName()
  // Desktop: sidebar can collapse to an icon rail. Mobile: sidebar is a drawer.
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

  // Desktop only: the toggle lives at the bottom of the sidebar
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // Ignore storage errors; the toggle still works for this visit
    }
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const role = session?.user?.role as Role | undefined
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

      {/* Sidebar: full width, or an icon-only rail when collapsed on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-20' : ''}`}
      >
        <Link
          href="/"
          title={appName}
          className={`flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <span className={`whitespace-nowrap text-lg font-bold text-gray-900 ${collapsed ? 'lg:hidden' : ''}`}>{appName}</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map(group => {
            const items = group.items.filter(item => role && item.roles.includes(role))
            if (items.length === 0) return null
            return (
              <div key={group.label} className={collapsed ? 'lg:pt-6' : ''}>
                {/* In the rail, group labels give way to plain spacing */}
                <p className={`px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-gray-500 ${collapsed ? 'lg:sr-only' : ''}`}>
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
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5' : ''
                        } ${
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={collapsed ? 'lg:sr-only' : ''}>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Collapse / expand control (desktop) */}
        <div className="hidden shrink-0 border-t border-gray-200 p-3 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 ${
              collapsed ? 'justify-center px-0 py-2.5' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0 text-gray-500" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0 text-gray-500" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8">
          {/* Mobile: open the navigation drawer */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(open => !open)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-auto flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
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
