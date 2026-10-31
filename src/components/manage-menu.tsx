'use client'

import { Fragment } from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ManageAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

// Single "Manage" button per row that opens the row's actions.
// Non-modal so dialogs opened from an item (edit, confirm delete) get focus normally.
export function ManageMenu({ actions }: { actions: ManageAction[] }) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          Manage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Fragment key={action.label}>
              {action.destructive && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={action.onSelect}
                className={action.destructive ? 'text-red-600 focus:bg-red-50 focus:text-red-700' : ''}
              >
                <Icon />
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
