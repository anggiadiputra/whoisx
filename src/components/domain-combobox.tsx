'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DomainOption {
  id: string
  domain: string
}

interface DomainComboboxProps {
  domains: DomainOption[]
  value: string
  onChange: (domainId: string) => void
  placeholder?: string
}

/**
 * Domain picker with live search. Rendered inline (no portal) so it keeps
 * working inside a Radix Dialog's focus trap.
 */
export function DomainCombobox({
  domains,
  value,
  onChange,
  placeholder = 'Pilih domain',
}: DomainComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selected = domains.find((d) => d.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? domains.filter((d) => d.domain.toLowerCase().includes(q)) : domains
  }, [domains, query])

  const close = (refocus = true) => {
    setOpen(false)
    setQuery('')
    if (refocus) triggerRef.current?.focus()
  }

  const openList = () => {
    setActiveIndex(Math.max(0, domains.findIndex((d) => d.id === value)))
    setOpen(true)
  }

  const pick = (id: string) => {
    onChange(id)
    close()
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    // Capture on window so Escape closes the list before the dialog sees it
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Never submit the surrounding form from the search box
      e.preventDefault()
      const option = filtered[activeIndex]
      if (option) pick(option.id)
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openList())}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-2xl border-2 border-transparent bg-cream px-4 text-left text-base font-semibold text-ink outline-none transition focus:border-violet focus:bg-white md:text-[15px]',
          open && 'border-violet bg-white',
          !selected && 'font-medium text-muted'
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected && <Globe className="size-4 shrink-0" />}
          <span className="truncate">{selected ? selected.domain : placeholder}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-tile bg-white text-ink shadow-float ring-1 ring-ink/5">
          <div className="flex items-center gap-2 border-b border-sand px-3">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Cari domain…"
              aria-label="Cari domain"
              aria-autocomplete="list"
              aria-controls={listId}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted md:text-sm"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-[13px] font-medium text-muted">
                {domains.length === 0 ? 'Belum ada domain.' : 'Domain nggak ketemu.'}
              </li>
            ) : (
              filtered.map((domain, index) => (
                <li
                  key={domain.id}
                  role="option"
                  aria-selected={domain.id === value}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  // mousedown keeps focus in the search box until the pick lands
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(domain.id)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pl-9 pr-3 text-[13px] font-bold',
                    index === activeIndex && 'bg-lilac text-violet-dark'
                  )}
                >
                  {domain.id === value && <Check className="absolute left-3 size-4" />}
                  <Globe className="size-4 shrink-0" />
                  <span className="truncate">{domain.domain}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
