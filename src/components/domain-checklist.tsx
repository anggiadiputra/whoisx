'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DomainChecklistOption {
  id: string
  domain: string
  /** Small label shown next to the domain, e.g. "Sudah terpasang" */
  badge?: string
}

interface DomainChecklistProps {
  domains: DomainChecklistOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}

/** Multi-select domain list with live search. */
export function DomainChecklist({ domains, selected, onChange }: DomainChecklistProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? domains.filter((d) => d.domain.toLowerCase().includes(q)) : domains
  }, [domains, query])

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selected, id] : selected.filter((s) => s !== id))
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter in the search box must not submit the surrounding form
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          placeholder="Cari domain…"
          aria-label="Cari domain"
          autoComplete="off"
          spellCheck={false}
          className="h-10 w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted md:text-sm"
        />
      </div>

      <div className="max-h-40 space-y-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-1 py-3 text-center text-sm text-muted">Domain nggak ketemu.</div>
        ) : (
          filtered.map((domain) => (
            <label
              key={domain.id}
              className="flex cursor-pointer items-center space-x-2 rounded-lg p-1 hover:bg-cream"
            >
              <input
                type="checkbox"
                checked={selected.includes(domain.id)}
                onChange={(e) => toggle(domain.id, e.target.checked)}
                className="rounded-lg border-sand"
              />
              <span className="text-sm">{domain.domain}</span>
              {domain.badge && (
                <Badge variant="outline" className="text-xs">{domain.badge}</Badge>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
