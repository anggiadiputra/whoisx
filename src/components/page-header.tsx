interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  // Buttons on the right, e.g. Refresh + primary "Add" action
  actions?: React.ReactNode
  className?: string
}

// Title, subtitle and actions row shared by every page in the app shell
export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <section className={`flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="break-words text-[36px] font-extrabold leading-[1.04] tracking-[-0.035em] md:text-[52px]">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </section>
  )
}
