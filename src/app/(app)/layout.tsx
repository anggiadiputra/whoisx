import { AppShell } from '@/components/app-shell'

// Signed-in area: sidebar + topbar around every page in this group
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
