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
      className="size-[18px] cursor-pointer accent-violet"
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
  const plural = (n: number) => `${n} domain`

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
      title: failed.length ? `${past} ${succeeded} dari ${plural(domains.length)}` : `${past} ${plural(succeeded)}`,
      description: failed.length
        ? `Gagal: ${failed.slice(0, 5).map(d => d.domain).join(', ')}${failed.length > 5 ? ` dan ${failed.length - 5} lainnya` : ''}`
        : undefined,
      variant: failed.length ? 'destructive' : 'default',
    })
    refreshApiData()
    onClear()
  }

  const handleRefreshWhois = () =>
    run('Memuat ulang WHOIS', 'WHOIS dimuat ulang untuk', (domain) =>
      fetchOrThrow(`/api/domains/${domain.id}/update-whois`, { method: 'POST' })
    )

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `Hapus ${plural(count)}?`,
      description: `Domain yang dipilih dan semua website yang terhubung akan dihapus permanen. Tindakan ini nggak bisa dibatalkan.`,
    })
    if (!confirmed) return
    await run('Menghapus', 'Berhasil hapus', (domain) => fetchOrThrow(`/api/domains/${domain.id}`, { method: 'DELETE' }))
  }

  const handleAssign = async () => {
    if (!serverId) return
    setAssignOpen(false)
    await run('Memasang', 'Berhasil pasang', async (domain) => {
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
      <div className="flex flex-wrap items-center gap-2 rounded-tile bg-lilac p-3 pl-4">
        <span className="tabular flex items-center text-[13px] font-extrabold text-violet-dark">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {busy ? `${progress.label} ${progress.done}/${progress.total}…` : `${plural(count)} dipilih`}
        </span>
        {!busy && count < totalMatching && (
          <button type="button" onClick={onSelectAllMatching} className="text-[13px] font-extrabold text-violet-dark underline underline-offset-2">
            Pilih semua {totalMatching}
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" className="bg-white hover:bg-cream" onClick={handleRefreshWhois} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Muat ulang WHOIS
          </Button>
          <Button variant="secondary" size="sm" className="bg-white hover:bg-cream" onClick={() => setAssignOpen(true)} disabled={busy}>
            <Link className="w-4 h-4 mr-2" />
            Pasang ke server
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-white" onClick={onClear} disabled={busy}>
            <X className="w-4 h-4 mr-2" />
            Bersihkan
          </Button>
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pasang {plural(count)} ke server</DialogTitle>
            <DialogDescription>
              Satu domain cuma bisa dipasang ke satu server; domain yang sudah ada di server lain akan dipindahkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[13px] font-extrabold">Pilih server</label>
            <Select value={serverId} onValueChange={setServerId} disabled={serversQuery.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={serversQuery.isPending ? 'Memuat server…' : 'Pilih server'} />
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
              <p className="text-sm text-muted">Belum ada server aktif. Tambah dulu di halaman Server, yuk.</p>
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleAssign} disabled={!serverId}>
              <Link className="w-4 h-4 mr-2" />
              Pasang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
