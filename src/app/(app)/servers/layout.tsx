import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Server' }

export default function ServersLayout({ children }: { children: React.ReactNode }) {
  return children
}
