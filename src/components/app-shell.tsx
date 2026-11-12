'use client'

import { useState } from 'react'
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
  MoreHorizontal,
  Server,
  Settings,
  User,
  Users,
} from 'lucide-react'
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

// Items are hidden for roles that cannot open the page
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Beranda', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'FINANCE'] },
  { href: '/domains', label: 'Domain', icon: Globe, roles: ['ADMIN', 'STAFF'] },
  { href: '/servers', label: 'Server', icon: Server, roles: ['ADMIN', 'STAFF'] },
  { href: '/websites', label: 'Website', icon: AppWindow, roles: ['ADMIN', 'STAFF'] },
  { href: '/users', label: 'Pengguna', icon: Users, roles: ['ADMIN'] },
  { href: '/settings', label: 'Pengaturan', icon: Settings, roles: ['ADMIN'] },
]

// The bottom tab bar holds at most 5 slots; anything beyond that moves into a "More" menu
const MAX_TABS = 5

// Violet square with the app's initial in lime and a white dot
function Logo({ appName, className }: { appName: string; className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center bg-violet font-extrabold text-lime ${className}`} aria-hidden="true">
      <span>
        {appName.charAt(0).toUpperCase() || 'W'}
        <span className="-ml-0.5 text-white">.</span>
      </span>
    </span>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const appName = useAppName()
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const role = session?.user?.role as Role | undefined
  const displayName = session?.user?.name || session?.user?.email || ''
  const items = NAV_ITEMS.filter(item => role && item.roles.includes(role))

  const tabs = items.length > MAX_TABS ? items.slice(0, MAX_TABS - 1) : items
  const overflow = items.slice(tabs.length)
  const overflowActive = overflow.some(item => isActive(item.href))

  return (
    <div className="min-h-dvh">
      {/* Desktop: floating icon rail */}
      <aside className="fixed inset-y-4 left-4 z-40 hidden w-[84px] flex-col items-center rounded-hero bg-white py-5 shadow-card md:flex">
        <Link href="/" title={appName} aria-label={appName}>
          <Logo appName={appName} className="size-12 rounded-[16px] text-xl" />
        </Link>
        <nav className="no-scrollbar mt-6 flex flex-1 flex-col items-center gap-1.5 overflow-y-auto" aria-label="Navigasi utama">
          {items.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-[18px] py-2.5 text-[11px] font-bold transition-colors ${
                  active ? 'bg-ink text-white' : 'text-muted hover:bg-cream hover:text-ink'
                }`}
              >
                <Icon className={`size-[22px] ${active ? 'text-lime' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="md:pl-[116px]">
        <div className="mx-auto max-w-[1600px] px-4 pb-32 pt-4 md:px-6 md:pb-16 md:pt-6 xl:px-8">
          {/* Top bar: every element is a white pill */}
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <Logo appName={appName} className="size-10 rounded-[14px] text-lg md:hidden" />
              <span className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-extrabold shadow-card">
                <span className="size-2 shrink-0 rounded-full bg-violet" />
                <span className="truncate">{appName}</span>
              </span>
            </Link>

            {session && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Menu akun"
                  className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white pl-1 pr-2.5 shadow-card transition-colors hover:bg-lilac"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-lime text-xs font-extrabold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-40 truncate text-[13px] font-extrabold sm:block">{displayName}</span>
                  <ChevronDown className="size-4 text-muted" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate">{session.user.name || 'Akun'}</p>
                    <p className="truncate text-xs font-semibold text-muted">{session.user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setProfileModalOpen(true)}>
                    <User />
                    Ubah profil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => signOut()}
                    className="text-st-no focus:bg-rose focus:text-st-no"
                  >
                    <LogOut />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <main className="mt-6 lg:mt-8">{children}</main>
        </div>
      </div>

      {/* Phone: floating tab bar (a single tab would be pointless) */}
      {items.length > 1 && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 md:hidden"
        >
          <div
            className="grid h-[70px] items-center rounded-[26px] bg-white px-1 shadow-float ring-1 ring-ink/5"
            style={{ gridTemplateColumns: `repeat(${tabs.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))` }}
          >
            {tabs.map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-w-0 flex-col items-center gap-0.5 text-[11px] ${active ? 'font-extrabold text-violet' : 'font-bold text-muted'}`}
                >
                  <span className={`grid h-8 w-12 place-items-center rounded-full ${active ? 'bg-lilac' : ''}`}>
                    <Icon className="size-[21px]" />
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              )
            })}
            {overflow.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex min-w-0 flex-col items-center gap-0.5 text-[11px] ${overflowActive ? 'font-extrabold text-violet' : 'font-bold text-muted'}`}
                >
                  <span className={`grid h-8 w-12 place-items-center rounded-full ${overflowActive ? 'bg-lilac' : ''}`}>
                    <MoreHorizontal className="size-[21px]" />
                  </span>
                  Lainnya
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-48">
                  {overflow.map(item => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                          <Icon />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>
      )}

      <UserProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </div>
  )
}
