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
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
