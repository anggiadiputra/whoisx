'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageSkeleton } from '@/components/page-skeleton'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { StatusPill, toneFromBgClass } from '@/components/status-pill'
import { WhoisDetailModal } from '@/components/whois-detail-modal'
import { RecentActivity } from '@/components/recent-activity'
import { formatIndonesianDate } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { ManageMenu } from '@/components/manage-menu'
import { PaginationBar } from '@/components/pagination-bar'
import { DomainBulkActions, SelectCheckbox, useBulkSelection } from '@/components/domain-bulk-actions'
import { 
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  Globe,
  Filter,
  Eye,
  Edit,
  Activity,
  Users,
  Server,
  Cloud,
  Wallet,
  Receipt,
  CalendarClock,
  Banknote,
  Download,
  CalendarPlus,
  ShoppingCart,
  CalendarX
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  renewalPrice: number | null
  notes: string | null
  registrar: string | null
  realRegistrarName?: string
  createdDate: string | null
  expiryDate: string | null
  status: string
  daysToExpiry: number | null
  lastChecked: string | null
  createdAt: string
  updatedAt: string
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

export default function HomePage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Get user role from session
  const router = useRouter()
  const userRole = session?.user?.role as string
  const [whoisDomain, setWhoisDomain] = useState<Domain | null>(null)

  // Cached domain list, shared with the Domains page
  const domainsQuery = useApiQuery<{ domains: Domain[]; stats: DashboardStats }>('/api/domains', status === 'authenticated')
  const domains = useMemo(() => domainsQuery.data?.domains ?? [], [domainsQuery.data])
  const stats = domainsQuery.data?.stats ?? EMPTY_STATS
  const loading = domainsQuery.isPending && status === 'authenticated'
  const fetchDomains = useRefreshApiData()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterExpiring, setFilterExpiring] = useState<string | null>(null)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [newDomain, setNewDomain] = useState({
    domain: '',
    renewalPrice: '',
    notes: ''
  })
  const [addingDomain, setAddingDomain] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Renewal costs for expiring domains
  const renewalCosts = useMemo(() => {
    const costs = {
      expiring30: 0,
      expiring7: 0,
      expiring1: 0,
      total: 0
    }

    domains.forEach(domain => {
      const price = domain.renewalPrice ? parseFloat(domain.renewalPrice.toString()) : 0
      const days = domain.daysToExpiry

      if (days !== null && days >= 0 && price > 0) {
        if (days <= 1) {
          costs.expiring1 += price
        }
        if (days <= 7) {
          costs.expiring7 += price
        }
        if (days <= 30) {
          costs.expiring30 += price
        }
        costs.total += price
      }
    })

    return costs
  }, [domains])

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
      const matchesSearch = domain.domain.toLowerCase().includes(debouncedSearchTerm.trim().toLowerCase())
      if (!matchesSearch) return false
      if (!filterExpiring) return true

      // Same window as the renewal panel: still active, expiring within N days
      const days = domain.daysToExpiry
      return days !== null && days >= 0 && days <= Number(filterExpiring)
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

  // Early returns after all hooks
  if (status === 'loading' || loading) {
    return <PageSkeleton />
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Akses ditolak</CardTitle>
            <CardDescription>Masuk dulu untuk membuka beranda</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Role-based permissions
  const canManageDomains = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF'
  const canViewPrices = session?.user?.role === 'ADMIN' || session?.user?.role === 'FINANCE'

  // Filter domains based on search and expiry filter (moved to hooks section above)



  const getExpiryStatus = (daysToExpiry: number | null) => {
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
      value: domains.filter(d => d.daysToExpiry === null).length,
      icon: ShoppingCart,
      color: 'text-on-sky',
      bgColor: 'bg-sky'
    },
    {
      title: 'Segera kedaluwarsa',
      value: stats.expiring30,
      icon: CalendarClock,
      color: 'text-on-peach',
      bgColor: 'bg-peach'
    },
    {
      title: 'Sudah kedaluwarsa',
      value: stats.expired || 0,
      icon: CalendarX,
      color: 'text-st-no',
      bgColor: 'bg-rose'
    }
  ]

  return (
    <div>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <PageHeader
          title="Beranda"
          description={`Selamat datang lagi, ${session?.user?.name || session?.user?.email}`}
          actions={
            <>
              <Button variant="outline" onClick={fetchDomains} disabled={domainsQuery.isFetching} aria-label="Muat ulang" className="w-12 px-0 sm:w-auto sm:px-5">
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${domainsQuery.isFetching ? 'animate-spin' : ''}`} />
                <span className="sr-only sm:not-sr-only">Muat ulang</span>
              </Button>
              {canManageDomains && (
                <Button asChild>
                  <NextLink href="/domains?add=1">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah domain
                  </NextLink>
                </Button>
              )}
            </>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:gap-5 xl:grid-cols-4">
          {statsCards.map((stat, index) => (
            <StatCard key={index} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} bgColor={stat.bgColor} />
          ))}
        </div>



        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Domains Table */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Portofolio domain</CardTitle>
                  <CardDescription>Kelola dan pantau semua domain kamu</CardDescription>
                </div>

                {/* Toolbar: search + filter share one row and one height (52px) */}
                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:order-last lg:w-72">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <Input
                      type="search"
                      aria-label="Cari domain"
                      placeholder="Cari domain…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-[52px] pl-11"
                    />
                  </div>

                  <Tabs value={filterExpiring || 'all'} onValueChange={(value) => setFilterExpiring(value === 'all' ? null : value)}>
                    <TabsList className="grid w-full grid-cols-4 lg:flex lg:w-fit">
                      <TabsTrigger value="all" className="lg:flex-none lg:px-4">
                        Semua<span className="hidden sm:inline">&nbsp;domain</span>
                      </TabsTrigger>
                      <TabsTrigger value="30" className="lg:flex-none lg:px-4">30 hari</TabsTrigger>
                      <TabsTrigger value="7" className="lg:flex-none lg:px-4">7 hari</TabsTrigger>
                      <TabsTrigger value="1" className="lg:flex-none lg:px-4">1 hari</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              
              <CardContent>
                {filteredDomains.length === 0 ? (
                  <div className="flex items-center gap-4 rounded-card border-2 border-dashed border-ink/15 p-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-cream text-2xl" aria-hidden="true">🌤️</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold">Tidak ada domain</p>
                      <p className="text-[13px] font-medium text-muted">
                        {searchTerm || filterExpiring ? 'Coba ubah pencarian atau filternya' : 'Yuk, tambah domain pertama kamu'}
                      </p>
                    </div>
                    {canManageDomains && !searchTerm && !filterExpiring && (
                      <Button size="icon" className="shrink-0" onClick={() => setShowAddDomain(true)} aria-label="Tambah domain">
                        <Plus className="size-5" strokeWidth={2.6} />
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {canManageDomains && selection.selected.length > 0 && (
                      <div className="mb-4">
                        <DomainBulkActions
                          selected={selection.selected}
                          onClear={selection.clear}
                          totalMatching={filteredDomains.length}
                          onSelectAllMatching={selection.selectAllMatching}
                        />
                      </div>
                    )}

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
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
                            <TableHead>Kedaluwarsa</TableHead>
                            {canViewPrices && <TableHead>Harga</TableHead>}
                            <TableHead>Server</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {paginatedDomains.map((domain) => {
                          const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                          return (
                            <TableRow key={domain.id} className={selection.isSelected(domain.id) ? 'bg-lilac/60' : ''}>
                              {canManageDomains && (
                                <TableCell className="w-10 pr-0">
                                  <SelectCheckbox
                                    checked={selection.isSelected(domain.id)}
                                    onChange={(checked) => selection.toggle(domain.id, checked)}
                                    label={`Pilih ${domain.domain}`}
                                  />
                                </TableCell>
                              )}
                              {/* Wraps so a long registrar name does not push the table past the card */}
                              <TableCell className="whitespace-normal">
                                <div className="flex items-center space-x-3">
                                  <div className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-lilac">
                                    <Globe className="size-5 text-violet" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="break-all text-[15px] font-extrabold leading-snug">{domain.domain}</div>
                                    {/* Registrar sits under the name (as on the Domains page) so the table fits beside the sidebar */}
                                    <div className="text-sm text-muted">
                                      {domain.realRegistrarName || domain.registrar || 'Registrar tidak diketahui'}
                                    </div>
                                    {domain.notes && (
                                      <div className="text-sm text-muted truncate max-w-[200px]">
                                        {domain.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {domain.expiryDate ? (
                                    <>
                                      <div className="font-medium">
                                        {formatIndonesianDate(domain.expiryDate)}
                                      </div>
                                      <div className="text-muted">
                                        {domain.daysToExpiry !== null ? (
                                          `${domain.daysToExpiry} hari`
                                        ) : (
                                          'Tidak diketahui'
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-muted">Tidak tersedia</span>
                                  )}
                                </div>
                              </TableCell>
                              {canViewPrices && (
                                <TableCell>
                                  {domain.renewalPrice ? (
                                    <span className="font-medium">Rp {parseInt(domain.renewalPrice.toString()).toLocaleString('id-ID')}</span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                {domain.server ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="grid size-7 shrink-0 place-items-center rounded-full bg-mint">
                                      {domain.server.serverType === 'VPS' ? (
                                        <Server className="w-3 h-3 text-on-mint" />
                                      ) : (
                                        <Cloud className="w-3 h-3 text-on-mint" />
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <div className="font-medium">{domain.server.serverName}</div>
                                      <div className="text-xs text-muted">{domain.server.provider}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted text-sm">Belum dipasang</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {paginatedDomains.map((domain) => {
                        const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                        return (
                          <Card key={domain.id} className="rounded-card border-2 border-sand p-4 shadow-none">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-start gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  {canManageDomains && (
                                    <SelectCheckbox
                                      checked={selection.isSelected(domain.id)}
                                      onChange={(checked) => selection.toggle(domain.id, checked)}
                                      label={`Pilih ${domain.domain}`}
                                    />
                                  )}
                                  <div className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-lilac">
                                    <Globe className="size-5 text-violet" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="break-all text-[15px] font-extrabold leading-snug">{domain.domain}</div>
                                    {domain.notes && (
                                      <div className="truncate text-sm text-muted">
                                        {domain.notes}
                                      </div>
                                    )}
                                    <div className="mt-1.5 flex">
                                      <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-3 text-sm [&>div]:min-w-0 [&>div]:break-words">
                                <div>
                                  <span className="text-muted">Kedaluwarsa:</span>
                                  <div className="font-medium">
                                    {domain.expiryDate ? formatIndonesianDate(domain.expiryDate) : '–'}
                                  </div>
                                </div>
                                {canViewPrices && (
                                  <div>
                                    <span className="text-muted">Harga:</span>
                                    <div className="font-medium">
                                      {domain.renewalPrice ? `Rp ${parseInt(domain.renewalPrice.toString()).toLocaleString('id-ID')}` : '–'}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted">Registrar:</span>
                                  <div className="font-medium">
                                    {domain.realRegistrarName || domain.registrar || 'Tidak diketahui'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted">Server:</span>
                                  <div className="font-medium">
                                    {domain.server ? (
                                      <div className="flex items-center space-x-1">
                                        <Server className="w-3 h-3 text-muted" />
                                        <span>{domain.server.serverName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted">Belum dipasang</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end space-x-2 pt-2 border-t">
                                <ManageMenu
                                  actions={[
                                    { label: 'Lihat WHOIS', icon: Eye, onSelect: () => setWhoisDomain(domain) },
                                    ...(canManageDomains ? [{ label: 'Kelola di Domain', icon: Globe, onSelect: () => router.push('/domains') }] : []),
                                  ]}
                                />
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </>
                )}

                <PaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredDomains.length}
                  pageSize={itemsPerPage}
                  onPageChange={setCurrentPage}
                  itemLabel="domain"
                  className="mt-4 pt-4 border-t"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Jumlah Bayar */}
            {/* Hidden for roles that may not see prices; it would be an empty card */}
            {(userRole === 'ADMIN' || userRole === 'FINANCE') && (
            <section className="relative overflow-hidden rounded-hero bg-ink p-5 text-white md:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full border-[28px] border-violet/40 md:-right-16 md:-top-20" />
              <div className="relative space-y-5">
                <h2 className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                  <Wallet className="size-4 text-lime" />
                  Jumlah Bayar
                </h2>
                {/* Total Finance Payment */}
                <div>
                  <p className="tabular break-words text-[40px] font-extrabold leading-none tracking-[-0.05em] text-lime">
                    Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                  </p>
                  <p className="mt-2 text-lg font-extrabold leading-tight">
                    Total yang perlu dibayar<br />
                    <span className="text-white/60">Perpanjangan domain (30 hari)</span>
                  </p>
                </div>
                
                {/* Detailed Breakdown Modal */}
                {(userRole === 'ADMIN' || userRole === 'FINANCE') && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="h-10 bg-lime px-4 text-[13px] text-ink shadow-none hover:bg-white">
                        <Receipt className="w-4 h-4 mr-2" />
                        Lihat rincian pembayaran
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Biaya perpanjangan domain</DialogTitle>
                        <DialogDescription>
                          Ringkasan biaya perpanjangan domain yang akan datang
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        {/* Cost Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className="rounded-card bg-cream shadow-none">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[13px] font-semibold text-muted">Kritis (1 hari)</p>
                                  <p className="tabular text-2xl font-extrabold tracking-[-0.03em] text-st-no">
                                    Rp {renewalCosts.expiring1.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-st-no" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="rounded-card bg-cream shadow-none">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[13px] font-semibold text-muted">Peringatan (7 hari)</p>
                                  <p className="tabular text-2xl font-extrabold tracking-[-0.03em] text-on-peach">
                                    Rp {renewalCosts.expiring7.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <Clock className="w-8 h-8 text-on-peach" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="rounded-card bg-cream shadow-none">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[13px] font-semibold text-muted">Mendatang (30 hari)</p>
                                  <p className="tabular text-2xl font-extrabold tracking-[-0.03em] text-st-wait">
                                    Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <CalendarClock className="w-8 h-8 text-st-wait" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="rounded-card bg-cream shadow-none">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[13px] font-semibold text-muted">Total portofolio</p>
                                  <p className="tabular text-2xl font-extrabold tracking-[-0.03em] text-violet">
                                    Rp {renewalCosts.total.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <Banknote className="w-8 h-8 text-violet" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Detailed Breakdown */}
                        <div className="mt-6">
                          <h4 className="mb-3 text-[15px] font-extrabold">Rencana anggaran</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3 rounded-2xl bg-rose px-4 py-3 font-semibold">
                              <span>Harus segera dibayar (≤1 hari):</span>
                              <span className="tabular shrink-0 font-extrabold text-st-no">
                                Rp {renewalCosts.expiring1.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3 rounded-2xl bg-peach px-4 py-3 font-semibold">
                              <span>Minggu ini (≤7 hari):</span>
                              <span className="tabular shrink-0 font-extrabold text-on-peach">
                                Rp {renewalCosts.expiring7.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3 rounded-2xl bg-butter px-4 py-3 font-semibold">
                              <span>Bulan ini (≤30 hari):</span>
                              <span className="tabular shrink-0 font-extrabold text-st-wait">
                                Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6">
                          <Button variant="outline" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            Ekspor laporan
                          </Button>
                          <Button className="flex-1">
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Jadwalkan pembayaran
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </section>
            )}

            {/* Recent Activity */}
            <RecentActivity />
          </div>
        </div>


      </div>
      {whoisDomain && (
        <WhoisDetailModal
          key={whoisDomain.id}
          domainId={whoisDomain.id}
          domainName={whoisDomain.domain}
          open
          onOpenChange={(open) => { if (!open) setWhoisDomain(null) }}
        />
      )}
    </div>
  )
}