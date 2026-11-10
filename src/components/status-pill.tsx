import { Check, Clock, Hourglass, Info, LucideIcon, Minus, Sparkles, X } from 'lucide-react'

export type PillTone = 'green' | 'red' | 'yellow' | 'orange' | 'blue' | 'purple' | 'gray'

// One place for tone -> pastel pair -> icon. A status is never told apart by color alone.
const TONES: Record<PillTone, { cls: string; icon: LucideIcon; strokeWidth?: number }> = {
  green: { cls: 'bg-lime text-ink', icon: Check, strokeWidth: 3 },
  red: { cls: 'bg-rose text-st-no', icon: X },
  yellow: { cls: 'bg-butter text-st-wait', icon: Hourglass },
  orange: { cls: 'bg-peach text-st-rev', icon: Clock },
  blue: { cls: 'bg-sky text-on-sky', icon: Info },
  purple: { cls: 'bg-lilac text-violet-dark', icon: Sparkles },
  gray: { cls: 'bg-sand text-st-draft', icon: Minus },
}

// Rounded status label (icon + text) used in tables and cards
export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const { cls, icon: Icon, strokeWidth = 2 } = TONES[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${cls}`}>
      <Icon className="size-3.5 shrink-0" strokeWidth={strokeWidth} aria-hidden="true" />
      {children}
    </span>
  )
}

// Map the color keys returned by the pages' status helpers (e.g. "bg-green-500") to a pill tone
export function toneFromBgClass(bgClass: string): PillTone {
  const color = bgClass.match(/bg-(\w+)-\d+/)?.[1] ?? 'gray'
  const aliases: Record<string, PillTone> = { emerald: 'green', amber: 'yellow', indigo: 'blue', sky: 'blue', slate: 'gray' }
  return (aliases[color] ?? (color in TONES ? color : 'gray')) as PillTone
}
