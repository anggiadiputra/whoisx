'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmOptions {
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Promise-based replacement for window.confirm():
 *   if (!(await confirm({ title, description }))) return
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm must be used inside ConfirmProvider')
  }
  return confirm
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    // Settle any dialog still waiting so its caller doesn't hang
    resolveRef.current?.(false)
    setOptions(nextOptions)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const settle = (value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setOpen(false)
  }

  const destructive = options?.destructive ?? true

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) settle(false) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {destructive && <AlertTriangle className="w-5 h-5 text-st-no" />}
              {options?.title}
            </DialogTitle>
            <DialogDescription>{options?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => settle(false)}>
              {options?.cancelLabel ?? 'Batal'}
            </Button>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>
              {options?.confirmLabel ?? 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
