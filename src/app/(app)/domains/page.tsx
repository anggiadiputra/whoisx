'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageSkeleton } from '@/components/page-skeleton'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { StatusPill, toneFromBgClass } from '@/components/status-pill'
import { WhoisDetailModal } from '@/components/whois-detail-modal'
import { AssignDomainModal } from '@/components/assign-domain-modal'
import { ManageMenu, ManageAction } from '@/components/manage-menu'
import { PaginationBar } from '@/components/pagination-bar'
import { DomainBulkActions, SelectCheckbox, useBulkSelection } from '@/components/domain-bulk-actions'
import { formatIndonesianDate } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
import { runBatch } from '@/lib/run-batch'
import { useConfirm } from '@/components/confirm-dialog'
import { 
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Globe,
  Filter,
  Eye,
  Edit,
  Download,
  Server,
  Link,
  Trash2,
  Loader2,
  Cloud,
  ShoppingCart,
  CalendarClock,
  X,
  Save
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  registrar?: string
  realRegistrarName?: string
  createdDate?: string
  expiryDate?: string
  daysToExpiry?: number
  status: string
  renewalPrice?: number
  notes?: string
  lastChecked: string
  server?: {
    id: string
    serverName: string
    provider: string
    serverType: string
    status: string
  }
}

interface DashboardStats {
  total: number
  expired: number
  expiring30: number
  expiring7: number
  expiring1: number
}

const EMPTY_STATS: DashboardStats = {
  total: 0,
  expired: 0,
  expiring30: 0,
  expiring7: 0,
  expiring1: 0
}

// Second line under the expiry date
function describeDaysLeft(days?: number | null) {
  if (days === undefined || days === null) return null
  if (days < 0) return `Kedaluwarsa ${Math.abs(days)} hari lalu`
  if (days === 0) return 'Kedaluwarsa hari ini'
  return `${days} hari lagi`
}

function daysLeftColor(days?: number | null) {
  if (days === undefined || days === null) return 'text-muted'
  if (days <= 1) return 'text-st-no'
  if (days <= 7) return 'text-on-peach'
  if (days <= 30) return 'text-st-wait'
  return 'text-muted'
}

// Bulk add: one domain per line (commas and spaces work too). Pasted URLs are reduced to their
// host, and repeats are dropped.
function parseDomainList(text: string): string[] {
  const domains = text
    .split(/[\s,;]+/)
    .map(entry => entry.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, ''))
    .filter(Boolean)
  return [...new Set(domains)]
}

export default function DomainsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Cached domain list, shared with the dashboard
  const domainsQuery = useApiQuery<{ domains: Domain[]; stats: DashboardStats }>('/api/domains', status === 'authenticated')
  const domains = useMemo(() => domainsQuery.data?.domains ?? [], [domainsQuery.data])
  const stats = domainsQuery.data?.stats ?? EMPTY_STATS
  const loading = domainsQuery.isPending && status === 'authenticated'
  const fetchDomains = useRefreshApiData()
  const confirm = useConfirm()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterExpiring, setFilterExpiring] = useState<string | null>(null)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [showEditDomain, setShowEditDomain] = useState(false)
  const [selectedDomainForEdit, setSelectedDomainForEdit] = useState<Domain | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDomainForAssign, setSelectedDomainForAssign] = useState<Domain | null>(null)
  const [whoisDomain, setWhoisDomain] = useState<Domain | null>(null)
  const [newDomain, setNewDomain] = useState({
    domain: '',
    renewalPrice: '',
    notes: ''
  })
  const [addingDomain, setAddingDomain] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [bulkDomainsText, setBulkDomainsText] = useState('')
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [editingDomain, setEditingDomain] = useState(false)
  const [editDomain, setEditDomain] = useState({
    domain: '',
    renewalPrice: '',
    notes: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // User permissions
  const userRole = session?.user?.role
  const canManageDomains = userRole === 'ADMIN' || userRole === 'STAFF'

  // Open the add dialog when arriving from the dashboard's "Add Domain" button
  useEffect(() => {
    if (canManageDomains && new URLSearchParams(window.location.search).get('add') === '1') {
      setShowAddDomain(true)
      window.history.replaceState(null, '', '/domains')
    }
  }, [canManageDomains])

  // Listen for domain updates from WHOIS modal
  useEffect(() => {
    const handleDomainUpdate = () => {
      if (status === 'authenticated') {
        fetchDomains() // Refresh domains list
      }
    }

    const handleDomainDelete = () => {
      if (status === 'authenticated') {
        fetchDomains() // Refresh domains list after deletion from modal
      }
    }

    window.addEventListener('domainUpdated', handleDomainUpdate)
    window.addEventListener('domainDeleted', handleDomainDelete)
    
    return () => {
      window.removeEventListener('domainUpdated', handleDomainUpdate)
      window.removeEventListener('domainDeleted', handleDomainDelete)
    }
  }, [status, fetchDomains])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterExpiring])

  // Memoized filtered domains for better performance
  const filteredDomains = useMemo(() => {
    return domains.filter(domain => {
      const matchesSearch = domain.domain.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           domain.registrar?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           domain.notes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      if (!matchesSearch) return false

      if (filterExpiring === 'critical') return domain.daysToExpiry && domain.daysToExpiry <= 1
      if (filterExpiring === 'warning') return domain.daysToExpiry && domain.daysToExpiry <= 7
      if (filterExpiring === 'attention') return domain.daysToExpiry && domain.daysToExpiry <= 30
      if (filterExpiring === 'good') return domain.daysToExpiry && domain.daysToExpiry > 30

      return true
    })
  }, [domains, debouncedSearchTerm, filterExpiring])

  // Memoized pagination logic
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredDomains.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedDomains = filteredDomains.slice(startIndex, endIndex)
    
    return { totalPages, startIndex, endIndex, paginatedDomains }
  }, [filteredDomains, currentPage, itemsPerPage])

  const { totalPages, startIndex, endIndex, paginatedDomains } = paginationData
  const selection = useBulkSelection(filteredDomains, paginatedDomains)

  // Handle assign domain
  const handleAssignDomain = (domain: Domain) => {
    setSelectedDomainForAssign(domain)
    setShowAssignModal(true)
  }

  const handleAssignSuccess = () => {
    fetchDomains() // Refresh domains list
  }

  // Early returns after all hooks
  if (status === 'loading' || loading) {
    return <PageSkeleton />
  }

  if (status === 'unauthenticated') {
    return (
      <div>
        <div className="w-full">
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle className="text-center">Perlu masuk dulu</CardTitle>
              <CardDescription className="text-center">
                Masuk dulu untuk membuka halaman domain
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Domain is active while its registration has not expired
  const getExpiryStatus = (daysToExpiry?: number) => {
    if (daysToExpiry === undefined || daysToExpiry === null || daysToExpiry < 0) return { status: 'inactive', color: 'bg-red-600', text: 'Nonaktif' }
    return { status: 'active', color: 'bg-green-600', text: 'Aktif' }
  }

  // Domain validation function
  const validateDomain = (domain: string): string | null => {
    if (!domain) return 'Nama domain wajib diisi'
    if (domain.length < 3) return 'Nama domain minimal 3 karakter'
    
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) return 'Masukkan nama domain yang valid'
    
    return null
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate domain before proceeding
    const domainError = validateDomain(newDomain.domain.trim())
    if (domainError) {
      toast({
        title: "Cek lagi, ya",
        description: domainError,
        variant: "destructive",
      })
      return
    }

    setAddingDomain(true)

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: newDomain.domain.trim().toLowerCase(),
          renewalPrice: newDomain.renewalPrice ? parseFloat(newDomain.renewalPrice) : null,
          notes: newDomain.notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Beres!",
          description: `Domain ${newDomain.domain} berhasil ditambahkan.`,
        })
        setNewDomain({ domain: '', renewalPrice: '', notes: '' })
        setShowAddDomain(false)
        fetchDomains()
      } else {
        // Handle API errors
        toast({
          title: "Gagal menambah domain",
          description: data.error || 'Domain gagal ditambahkan. Coba lagi, ya.',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding domain:', error)
      toast({
        title: "Koneksi bermasalah",
        description: 'Nggak bisa terhubung ke server. Cek koneksi kamu dulu.',
        variant: "destructive",
      })
    } finally {
      setAddingDomain(false)
    }
  }

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    const entries = parseDomainList(bulkDomainsText)
    const invalid = entries.filter(domain => validateDomain(domain) !== null)
    const existing = new Set(domains.map(domain => domain.domain))
    const alreadyAdded = entries.filter(domain => !invalid.includes(domain) && existing.has(domain))
    const toAdd = entries.filter(domain => !invalid.includes(domain) && !existing.has(domain))

    if (toAdd.length === 0) {
      toast({
        title: "Nggak ada yang bisa ditambah",
        description: invalid.length
          ? `Nama domain nggak valid: ${invalid.slice(0, 5).join(', ')}`
          : 'Semua domain di daftar ini sudah ditambahkan.',
        variant: "destructive",
      })
      return
    }

    setAddingDomain(true)
    setBulkProgress({ done: 0, total: toAdd.length })
    const results = await runBatch(toAdd, async (domain) => {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      // 409: added in the meantime (e.g. by someone else); not a failure
      if (response.status === 409) return 'exists'
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Failed')
      return 'added'
    }, {
      onProgress: (done) => setBulkProgress({ done, total: toAdd.length }),
    })
    setBulkProgress(null)
    setAddingDomain(false)

    const added = results.filter(r => r.status === 'fulfilled' && r.value === 'added').length
    const skipped = alreadyAdded.length + results.filter(r => r.status === 'fulfilled' && r.value === 'exists').length
    const failed = toAdd.filter((_, i) => results[i].status === 'rejected')
    // Leave what still needs attention in the box so it can be fixed and retried
    const leftOver = [...invalid, ...failed]

    const notes = [
      skipped ? `${skipped} sudah ada` : '',
      invalid.length ? `${invalid.length} nggak valid` : '',
      failed.length ? `${failed.length} gagal` : '',
    ].filter(Boolean)
    toast({
      title: `${added} domain ditambahkan`,
      description: notes.length ? `${notes.join(', ')}.${leftOver.length ? ' Yang masih ada di daftar perlu dicek lagi.' : ''}` : undefined,
      variant: leftOver.length ? "destructive" : "default",
    })

    fetchDomains()
    setBulkDomainsText(leftOver.join('\n'))
    if (leftOver.length === 0) setShowAddDomain(false)
  }

  // Handle edit domain
  const handleEditDomain = (domain: Domain) => {
    setSelectedDomainForEdit(domain)
    setEditDomain({
      domain: domain.domain,
      renewalPrice: domain.renewalPrice?.toString() || '',
      notes: domain.notes || ''
    })
    setShowEditDomain(true)
  }

  const handleUpdateDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDomainForEdit) return

    setEditingDomain(true)

    try {
      const response = await fetch(`/api/domains/${selectedDomainForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          renewalPrice: editDomain.renewalPrice ? parseFloat(editDomain.renewalPrice) : null,
          notes: editDomain.notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Beres!",
          description: `Domain ${selectedDomainForEdit.domain} berhasil diperbarui.`,
        })
        setEditDomain({ domain: '', renewalPrice: '', notes: '' })
        setShowEditDomain(false)
        setSelectedDomainForEdit(null)
        fetchDomains()
      } else {
        toast({
          title: "Gagal memperbarui domain",
          description: data.error || 'Domain gagal diperbarui. Coba lagi, ya.',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating domain:', error)
      toast({
        title: "Koneksi bermasalah",
        description: 'Nggak bisa terhubung ke server. Cek koneksi kamu dulu.',
        variant: "destructive",
      })
    } finally {
      setEditingDomain(false)
    }
  }

  // Actions behind each row's "Manage" button
  const domainActions = (domain: Domain): ManageAction[] => [
    { label: 'Lihat WHOIS', icon: Eye, onSelect: () => setWhoisDomain(domain) },
    ...(canManageDomains ? [
      { label: 'Ubah', icon: Edit, onSelect: () => handleEditDomain(domain) },
      { label: 'Pasang ke server', icon: Link, onSelect: () => handleAssignDomain(domain) },
      { label: 'Hapus', icon: Trash2, onSelect: () => handleDeleteDomain(domain), destructive: true },
    ] : []),
  ]

  // Handle delete domain
  const handleDeleteDomain = async (domain: Domain) => {
    const confirmed = await confirm({
      title: 'Hapus domain?',
      description: `"${domain.domain}" dan semua website yang terhubung akan dihapus permanen. Tindakan ini nggak bisa dibatalkan.`,
    })
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/domains/${domain.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Beres!",
          description: `Domain "${domain.domain}" berhasil dihapus`,
        })
        fetchDomains()
      } else {
        toast({
          title: "Gagal",
          description: result.error || 'Domain gagal dihapus',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error deleting domain:', error)
      toast({
        title: "Gagal",
        description: "Domain gagal dihapus",
        variant: "destructive",
      })
    }
  }

  // Filtering and pagination logic moved to hooks section above

  const statsCards = [
    {
      title: 'Total domain',
      value: stats.total,
      icon: Globe,
      color: 'text-violet',
      bgColor: 'bg-lilac'
    },
    {
      title: 'Bisa dipesan',
      value: domains.filter(d => d.daysToExpiry === null || d.daysToExpiry === undefined).length,
      icon: ShoppingCart,
      color: 'text-on-sky',
      bgColor: 'bg-sky'
    },
    {
      title: 'Kedaluwarsa ≤30 hari',
      value: stats.expiring30,
      icon: CalendarClock,
      color: 'text-on-peach',
      bgColor: 'bg-peach'
    },
    {
      title: 'Kedaluwarsa ≤1 hari',
      value: stats.expiring1,
      icon: AlertTriangle,
      color: 'text-st-no',
      bgColor: 'bg-rose'
    }
  ]

  return (
    <div>
      <div className="w-full">
        {/* Page Header */}
        <PageHeader className="mb-8"
          title="Domain"
          description="Pantau dan kelola semua domain kamu"
          actions={
            <>
              <Button variant="outline" onClick={fetchDomains} disabled={domainsQuery.isFetching}>
                <RefreshCw className={`w-4 h-4 mr-2 ${domainsQuery.isFetching ? 'animate-spin' : ''}`} />
                Muat ulang
              </Button>
              {canManageDomains && (
                <Button onClick={() => setShowAddDomain(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah domain
                </Button>
              )}
            </>
          }
        />

        {canManageDomains && (
          <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Tambah domain baru</DialogTitle>
                    <DialogDescription>
                      Isi detail domain untuk mulai dipantau. Data WHOIS diambil otomatis.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs value={addMode} onValueChange={(value) => setAddMode(value as 'single' | 'bulk')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="single" disabled={addingDomain}>Satu</TabsTrigger>
                      <TabsTrigger value="bulk" disabled={addingDomain}>Banyak</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {addMode === 'bulk' ? (
                  <form onSubmit={handleBulkAdd} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="bulkDomains" className="text-sm font-medium text-ink">
                        Nama domain
                      </label>
                      <Textarea
                        id="bulkDomains"
                        rows={8}
                        placeholder={'example.com\nexample.org\nexample.id'}
                        value={bulkDomainsText}
                        onChange={(e) => setBulkDomainsText(e.target.value)}
                        disabled={addingDomain}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted">
                        Satu domain per baris. {parseDomainList(bulkDomainsText).length} terdeteksi; yang sudah ada dilewati. Harga dan catatan bisa diatur nanti lewat Ubah.
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDomain(false)}
                        className="flex-1"
                        disabled={addingDomain}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={addingDomain || parseDomainList(bulkDomainsText).length === 0}
                        className="flex-1"
                      >
                        {bulkProgress ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menambahkan {bulkProgress.done}/{bulkProgress.total}…
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah domain
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                  ) : (
                  <form onSubmit={handleAddDomain} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="domain" className="text-sm font-medium text-ink">
                        Nama domain
                      </label>
                      <Input
                        id="domain"
                        placeholder="example.com"
                        value={newDomain.domain}
                        onChange={(e) => setNewDomain(prev => ({ ...prev, domain: e.target.value }))}
                        required
                        disabled={addingDomain}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="renewalPrice" className="text-sm font-medium text-ink">
                        Harga perpanjangan (opsional)
                      </label>
                      <Input
                        id="renewalPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newDomain.renewalPrice}
                        onChange={(e) => setNewDomain(prev => ({ ...prev, renewalPrice: e.target.value }))}
                        disabled={addingDomain}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="notes" className="text-sm font-medium text-ink">
                        Catatan (opsional)
                      </label>
                      <Input
                        id="notes"
                        placeholder="Info tambahan…"
                        value={newDomain.notes}
                        onChange={(e) => setNewDomain(prev => ({ ...prev, notes: e.target.value }))}
                        disabled={addingDomain}
                      />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDomain(false)}
                        className="flex-1"
                        disabled={addingDomain}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={addingDomain}
                        className="flex-1"
                      >
                        {addingDomain ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menambahkan…
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah domain
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                  )}
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Domain Modal */}
            {canManageDomains && (
              <Dialog open={showEditDomain} onOpenChange={setShowEditDomain}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Ubah domain</DialogTitle>
                    <DialogDescription>
                      Perbarui info domain. Nama domain nggak bisa diubah.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateDomain} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="editDomain" className="text-sm font-medium text-ink">
                        Nama domain
                      </label>
                      <Input
                        id="editDomain"
                        value={editDomain.domain}
                        disabled
                        className="bg-cream"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="editRenewalPrice" className="text-sm font-medium text-ink">
                        Harga perpanjangan (opsional)
                      </label>
                      <Input
                        id="editRenewalPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editDomain.renewalPrice}
                        onChange={(e) => setEditDomain(prev => ({ ...prev, renewalPrice: e.target.value }))}
                        disabled={editingDomain}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="editNotes" className="text-sm font-medium text-ink">
                        Catatan (opsional)
                      </label>
                      <Input
                        id="editNotes"
                        placeholder="Info tambahan…"
                        value={editDomain.notes}
                        onChange={(e) => setEditDomain(prev => ({ ...prev, notes: e.target.value }))}
                        disabled={editingDomain}
                      />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditDomain(false)
                          setSelectedDomainForEdit(null)
                          setEditDomain({ domain: '', renewalPrice: '', notes: '' })
                        }}
                        className="flex-1"
                        disabled={editingDomain}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={editingDomain}
                        className="flex-1"
                      >
                        {editingDomain ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menyimpan…
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Simpan perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:gap-5 xl:grid-cols-4 mb-8">
          {statsCards.map((card, index) => (
            <StatCard key={index} title={card.title} value={card.value} icon={card.icon} color={card.color} bgColor={card.bgColor} />
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                <Input
                  placeholder="Cari domain, registrar, atau catatan…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterExpiring === null ? "chipOn" : "chipOff"}
                  aria-pressed={filterExpiring === null}
                  onClick={() => setFilterExpiring(null)}
                  size="sm"
                >
                  Semua
                </Button>
                <Button
                  variant={filterExpiring === 'critical' ? "chipOn" : "chipOff"}
                  aria-pressed={filterExpiring === 'critical'}
                  onClick={() => setFilterExpiring(filterExpiring === 'critical' ? null : 'critical')}
                  size="sm"
                >
                  Kritis
                </Button>
                <Button
                  variant={filterExpiring === 'warning' ? "chipOn" : "chipOff"}
                  aria-pressed={filterExpiring === 'warning'}
                  onClick={() => setFilterExpiring(filterExpiring === 'warning' ? null : 'warning')}
                  size="sm"
                >
                  Peringatan
                </Button>
                <Button
                  variant={filterExpiring === 'attention' ? "chipOn" : "chipOff"}
                  aria-pressed={filterExpiring === 'attention'}
                  onClick={() => setFilterExpiring(filterExpiring === 'attention' ? null : 'attention')}
                  size="sm"
                >
                  Perhatian
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {canManageDomains && selection.selected.length > 0 && (
          <div className="mb-6">
            <DomainBulkActions
              selected={selection.selected}
              onClear={selection.clear}
              totalMatching={filteredDomains.length}
              onSelectAllMatching={selection.selectAllMatching}
            />
          </div>
        )}

        {/* Domains Table - Desktop */}
        <Card className="hidden md:block overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManageDomains && (
                      <TableHead className="w-10 pr-0">
                        <SelectCheckbox
                          checked={selection.pageAllSelected}
                          indeterminate={selection.pageSomeSelected}
                          onChange={selection.togglePage}
                          label="Pilih semua domain di halaman ini"
                        />
                      </TableHead>
                    )}
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Kedaluwarsa</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDomains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageDomains ? 6 : 5} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Globe className="w-8 h-8 text-muted" />
                          <p className="text-muted">Tidak ada domain</p>
                          {canManageDomains && (
                            <Button onClick={() => setShowAddDomain(true)} size="sm">
                              Tambah domain pertama
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDomains.map((domain) => {
                      const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                      return (
                        <TableRow key={domain.id} className={selection.isSelected(domain.id) ? 'bg-lilac/60' : 'hover:bg-cream'}>
                          {canManageDomains && (
                            <TableCell className="w-10 pr-0">
                              <SelectCheckbox
                                checked={selection.isSelected(domain.id)}
                                onChange={(checked) => selection.toggle(domain.id, checked)}
                                label={`Pilih ${domain.domain}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="font-medium text-ink">{domain.domain}</div>
                            <div className="text-sm text-muted">
                              {domain.realRegistrarName || domain.registrar || 'Registrar tidak diketahui'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                          </TableCell>
                          <TableCell>
                            {domain.server ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-mint rounded-lg flex items-center justify-center">
                                  {domain.server.serverType === 'VPS' ? (
                                    <Server className="w-3 h-3 text-on-mint" />
                                  ) : (
                                    <Cloud className="w-3 h-3 text-on-mint" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{domain.server.serverName}</div>
                                  <div className="text-xs text-muted">{domain.server.provider}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted text-sm">Belum dipasang</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-ink">
                              {domain.expiryDate ? formatIndonesianDate(domain.expiryDate) : 'Tidak diketahui'}
                            </div>
                            {describeDaysLeft(domain.daysToExpiry) && (
                              <div className={`text-sm ${daysLeftColor(domain.daysToExpiry)}`}>
                                {describeDaysLeft(domain.daysToExpiry)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <ManageMenu actions={domainActions(domain)} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredDomains.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="domain"
              className="px-6 py-4 border-t"
            />
          </CardContent>
        </Card>

        {/* Domains Cards - Mobile */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold tracking-[-0.02em]">Domain ({filteredDomains.length})</h3>
          </div>
          
          {filteredDomains.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <Globe className="w-8 h-8 text-muted" />
                  <p className="text-muted">Tidak ada domain</p>
                  {canManageDomains && (
                    <Button onClick={() => setShowAddDomain(true)} size="sm">
                      Tambah domain pertama
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {paginatedDomains.map((domain) => {
                const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                return (
                  <Card key={domain.id} className="p-4">
                    <div className="space-y-3">
                      {/* Domain Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {canManageDomains && (
                            <SelectCheckbox
                              checked={selection.isSelected(domain.id)}
                              onChange={(checked) => selection.toggle(domain.id, checked)}
                              label={`Pilih ${domain.domain}`}
                            />
                          )}
                          <div className="w-8 h-8 bg-lilac rounded-2xl flex items-center justify-center">
                            <Globe className="w-4 h-4 text-violet" />
                          </div>
                          <div>
                            <h4 className="text-[15px] font-extrabold leading-snug">{domain.domain}</h4>
                            <p className="text-sm text-muted">{domain.realRegistrarName || domain.registrar || 'Tidak diketahui'}</p>
                          </div>
                        </div>
                        <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                      </div>

                      {/* Domain Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted">Server:</span>
                          <div className="mt-1">
                            {domain.server ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-mint rounded-lg flex items-center justify-center">
                                  {domain.server.serverType === 'VPS' ? (
                                    <Server className="w-2 h-2 text-on-mint" />
                                  ) : (
                                    <Cloud className="w-2 h-2 text-on-mint" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{domain.server.serverName}</div>
                                  <div className="text-xs text-muted">{domain.server.provider}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted text-xs">Belum dipasang</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted">Sisa waktu:</span>
                          <div className="mt-1 font-medium">
                            {domain.daysToExpiry !== null ? `${domain.daysToExpiry} hari` : '–'}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted">Tanggal kedaluwarsa:</span>
                          <div className="mt-1 font-medium">
                            {formatIndonesianDate(domain.expiryDate)}
                          </div>
                        </div>
                        
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <ManageMenu actions={domainActions(domain)} />
                        <div className="text-xs text-muted">
                          #{domain.id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}

              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredDomains.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                itemLabel="domain"
                className="mt-6"
              />
            </>
          )}
        </div>
      </div>

      {/* WHOIS details for the row picked in its Manage menu */}
      {whoisDomain && (
        <WhoisDetailModal
          key={whoisDomain.id}
          domainId={whoisDomain.id}
          domainName={whoisDomain.domain}
          open
          onOpenChange={(open) => { if (!open) setWhoisDomain(null) }}
        />
      )}

      {/* Assign Domain Modal */}
      <AssignDomainModal
        domain={selectedDomainForAssign}
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedDomainForAssign(null)
        }}
        onSuccess={handleAssignSuccess}
      />
    </div>
  )
}
