import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  // Pastel pair from design.md: bgColor is the tile fill, color the matching text/icon color
  color: string
  bgColor: string
}

// Pastel summary tile shared by every page's stats row: big number, small label under it
export function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <section className={`flex min-w-0 flex-col rounded-card p-4 md:p-5 ${bgColor}`}>
      <span className={`grid size-10 place-items-center rounded-full bg-white ${color}`}>
        <Icon className="size-5" />
      </span>
      <div className="mt-4 min-w-0">
        <p className="tabular break-words text-[40px] font-extrabold leading-none tracking-[-0.05em] md:text-[52px]">{value}</p>
        <p className="mt-1 text-sm font-extrabold leading-snug">{title}</p>
      </div>
    </section>
  )
}
