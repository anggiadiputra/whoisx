export type PillTone = 'green' | 'red' | 'yellow' | 'orange' | 'blue' | 'purple' | 'gray'

const TONES: Record<PillTone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20',
}

// Soft rounded status label used in tables and cards
export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  )
}

// Map the solid color classes returned by the pages' status helpers (e.g. "bg-green-500") to a pill tone
export function toneFromBgClass(bgClass: string): PillTone {
  const color = bgClass.match(/bg-(\w+)-\d+/)?.[1] ?? 'gray'
  const aliases: Record<string, PillTone> = { emerald: 'green', amber: 'yellow', indigo: 'blue', sky: 'blue', slate: 'gray' }
  return (aliases[color] ?? (color in TONES ? color : 'gray')) as PillTone
}
