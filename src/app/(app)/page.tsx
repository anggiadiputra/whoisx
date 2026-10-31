import type { Metadata } from 'next'
import DashboardClient from './dashboard-client'

export const metadata: Metadata = { title: 'Dashboard' }

// Server wrapper so the client dashboard can still export a page title
export default function DashboardPage() {
  return <DashboardClient />
}
