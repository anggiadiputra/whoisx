'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  // Plural noun for the summary, e.g. "domains"
  itemLabel: string
  className?: string
}

type PageSlot = number | 'gap-start' | 'gap-end'

// First, last and the pages around the current one; a gap of more than one page becomes an ellipsis
function pageSlots(current: number, total: number): PageSlot[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current - 1, current, current + 1])
  // Near either end, keep five numbers in a row so the bar does not jump in width
  if (current <= 4) for (let page = 2; page <= 5; page++) pages.add(page)
  if (current >= total - 3) for (let page = total - 4; page < total; page++) pages.add(page)

  const sorted = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  const slots: PageSlot[] = []
  sorted.forEach((page, i) => {
    const previous = sorted[i - 1]
    if (previous !== undefined && page - previous === 2) slots.push(previous + 1)
    else if (previous !== undefined && page - previous > 2) slots.push(page < current ? 'gap-start' : 'gap-end')
    slots.push(page)
  })
  return slots
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel,
  className = '',
}: PaginationBarProps) {
  if (totalPages <= 1) return null

  const first = (currentPage - 1) * pageSize + 1
  const last = Math.min(currentPage * pageSize, totalItems)

  return (
    // Wraps the page buttons under the summary when the card is too narrow for both on one line
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-sm text-gray-600 whitespace-nowrap">
        Showing {first}–{last} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden lg:inline">Previous</span>
        </Button>

        {/* Page numbers from sm up; phones get "3 / 18" instead */}
        <div className="hidden sm:flex items-center gap-1">
          {pageSlots(currentPage, totalPages).map(slot =>
            typeof slot === 'number' ? (
              <Button
                key={slot}
                variant={slot === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(slot)}
                className="w-8 h-8 p-0"
                aria-current={slot === currentPage ? 'page' : undefined}
              >
                {slot}
              </Button>
            ) : (
              <span key={slot} className="w-6 text-center text-sm text-gray-400">…</span>
            )
          )}
        </div>
        <span className="sm:hidden px-2 text-sm text-gray-600">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <span className="hidden lg:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
