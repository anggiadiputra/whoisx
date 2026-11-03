'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
import { fetchOrThrow, runBatch } from '@/lib/run-batch'
import { Link, Loader2, RefreshCw, Trash2, X } from 'lucide-react'

export interface BulkDomain {
  id: string
  domain: string
  server?: { id: string } | null
}

interface ServerOption {
  id: string
  serverName: string
  provider: string
  status: string
}

// Native checkbox styled to sit in table headers, rows and mobile cards
export function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
    />
  )
}

// Selection that survives paging; ids that drop out of the list (deleted, filtered by a refresh) are ignored
export function useBulkSelection<T extends BulkDomain>(matching: T[], page: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const selected = useMemo(() => matching.filter(item => selectedIds.has(item.id)), [matching, selectedIds])
  const pageSelectedCount = page.filter(item => selectedIds.has(item.id)).length

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const togglePage = (checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const item of page) {
        if (checked) next.add(item.id)
        else next.delete(item.id)
      }
      return next
    })
  }

  return {
    selected,
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    togglePage,
    pageAllSelected: page.length > 0 && pageSelectedCount === page.length,
    pageSomeSelected: pageSelectedCount > 0 && pageSelectedCount < page.length,
    selectAllMatching: () => setSelectedIds(new Set(matching.map(item => item.id))),
    clear: () => setSelectedIds(new Set()),
  }
}

interface DomainBulkActionsProps {
  selected: BulkDomain[]
  onClear: () => void
  // Shown as "Select all N" while only part of the filtered list is selected
  totalMatching: number
  onSelectAllMatching: () => void
}

type Progress = { label: string; done: number; total: number }

export function DomainBulkActions({ selected, onClear, totalMatching, onSelectAllMatching }: DomainBulkActionsProps) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const refreshApiData = useRefreshApiData()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [serverId, setServerId] = useState('')

  const serversQuery = useApiQuery<{ servers: ServerOption[] }>('/api/servers', assignOpen)
  const activeServers = (serversQuery.data?.servers ?? []).filter(server => server.status === 'ACTIVE')

  if (selected.length === 0) return null

  const count = selected.length
  const plural = (n: number) => `${n} domain${n === 1 ? '' : 's'}`

  // Runs the task for every selected domain, then reports and refreshes the lists
  const run = async (label: string, past: string, task: (domain: BulkDomain) => Promise<unknown>) => {
    const domains = [...selected]
    setProgress({ label, done: 0, total: domains.length })
    const results = await runBatch(domains, task, {
      onProgress: (done) => setProgress({ label, done, total: domains.length }),
    })
    setProgress(null)

    const failed = domains.filter((_, i) => results[i].status === 'rejected')
    const succeeded = domains.length - failed.length
    toast({
      title: failed.length ? `${past} ${succeeded} of ${plural(domains.length)}` : `${past} ${plural(succeeded)}`,
      description: failed.length
        ? `Failed: ${failed.slice(0, 5).map(d => d.domain).join(', ')}${failed.length > 5 ? ` and ${failed.length - 5} more` : ''}`
        : undefined,
      variant: failed.length ? 'destructive' : 'default',
    })
    refreshApiData()
    onClear()
  }

  const handleRefreshWhois = () =>
    run('Refreshing WHOIS', 'Refreshed WHOIS for', (domain) =>
      fetchOrThrow(`/api/domains/${domain.id}/update-whois`, { method: 'POST' })
    )

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${plural(count)}?`,
      description: `The selected domains and any websites linked to them will be permanently deleted. This action cannot be undone.`,
    })
    if (!confirmed) return
    await run('Deleting', 'Deleted', (domain) => fetchOrThrow(`/api/domains/${domain.id}`, { method: 'DELETE' }))
  }

  const handleAssign = async () => {
    if (!serverId) return
    setAssignOpen(false)
    await run('Assigning', 'Assigned', async (domain) => {
      // The API rejects a no-op assignment; for a bulk run it simply counts as done
      if (domain.server?.id === serverId) return
      await fetchOrThrow(`/api/domains/${domain.id}/assign-server`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      })
    })
    setServerId('')
  }

  const busy = progress !== null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <span className="flex items-center text-sm font-medium text-blue-900">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {busy ? `${progress.label} ${progress.done}/${progress.total}…` : `${plural(count)} selected`}
        </span>
        {!busy && count < totalMatching && (
          <button type="button" onClick={onSelectAllMatching} className="text-sm font-medium text-blue-700 hover:underline">
            Select all {totalMatching}
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshWhois} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh WHOIS
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)} disabled={busy}>
            <Link className="w-4 h-4 mr-2" />
            Assign to Server
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign {plural(count)} to Server</DialogTitle>
            <DialogDescription>
              Each domain can only be assigned to one server; domains already on another server are moved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Server:</label>
            <Select value={serverId} onValueChange={setServerId} disabled={serversQuery.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={serversQuery.isPending ? 'Loading servers...' : 'Choose a server'} />
              </SelectTrigger>
              <SelectContent>
                {activeServers.map(server => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.serverName} ({server.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!serversQuery.isPending && activeServers.length === 0 && (
              <p className="text-sm text-gray-500">No active servers yet. Add one on the Servers page first.</p>
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!serverId}>
              <Link className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
