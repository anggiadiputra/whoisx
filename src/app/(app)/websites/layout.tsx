import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Website' }

export default function WebsitesLayout({ children }: { children: React.ReactNode }) {
  return children
}
