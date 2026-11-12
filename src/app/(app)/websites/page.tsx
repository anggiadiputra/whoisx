'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
import { useConfirm } from '@/components/confirm-dialog'
import { PageSkeleton } from '@/components/page-skeleton'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { ManageMenu, ManageAction } from '@/components/manage-menu'
import { PaginationBar } from '@/components/pagination-bar'
import { StatusPill, toneFromBgClass } from '@/components/status-pill'
import { formatIndonesianDate } from '@/lib/utils'
import { 
  Globe,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Activity,
  XCircle,
  Monitor,
  MonitorOff,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AppWindow,
  RefreshCw,
  X,
  Save
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

// Types
interface Domain {
  id: string
  domain: string
  expiryDate?: string
  status: string
}

interface Website {
  id: string
  siteName: string
  domainId: string
  username?: string
  password?: string
  cms?: string
  description?: string
  notes?: string
  status: string
  isLive: boolean
  createdAt: string
  updatedAt: string
  domain: Domain
}

interface WebsiteStats {
  total: number
  active: number
  inactive: number
  maintenance: number
  development: number
  suspended: number
  live: number
  offline: number
}

interface NewWebsite {
  siteName: string
  domainId: string
  username: string
  password: string
  cms: string
  description: string
  notes: string
  status: string
  isLive: boolean
}

interface EditWebsite extends NewWebsite {
  id: string
}

const EMPTY_STATS: WebsiteStats = {
  total: 0,
  active: 0,
  inactive: 0,
  maintenance: 0,
  development: 0,
  suspended: 0,
  live: 0,
  offline: 0
}

export default function WebsitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // Cached website list; refreshed after mutations via fetchWebsites
  const websitesQuery = useApiQuery<{ websites: Website[]; stats: WebsiteStats }>('/api/websites', status === 'authenticated')
  const websites = useMemo(() => websitesQuery.data?.websites ?? [], [websitesQuery.data])
  const stats = websitesQuery.data?.stats ?? EMPTY_STATS
  const loading = websitesQuery.isPending && status === 'authenticated'
  const fetchWebsites = useRefreshApiData()
  const confirm = useConfirm()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Domain selection states
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(false)

  // Add Website Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingWebsite, setAddingWebsite] = useState(false)
  const [newWebsite, setNewWebsite] = useState<NewWebsite>({
    siteName: '',
    domainId: '',
    username: '',
    password: '',
    cms: 'none',
    description: '',
    notes: '',
    status: 'ACTIVE',
    isLive: true
  })

  // Edit Website Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState(false)
  const [editWebsite, setEditWebsite] = useState<EditWebsite>({
    id: '',
    siteName: '',
    domainId: '',
    username: '',
    password: '',
    cms: 'none',
    description: '',
    notes: '',
    status: 'ACTIVE',
    isLive: true
  })

  // View Website Modal State
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  // Check authentication and permissions
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // User role and permissions
  const userRole = (session?.user as any)?.role
  const canManageWebsites = userRole === 'ADMIN' || userRole === 'STAFF'

  // Fetch available domains
  const fetchAvailableDomains = useCallback(async () => {
    try {
      setLoadingDomains(true)
      const response = await fetch('/api/domains?availableForWebsite=true', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch domains')
      }

      const data = await response.json()
      if (data.success) {
        setAvailableDomains(data.domains.map((domain: any) => ({
          id: domain.id,
          domain: domain.domain,
          expiryDate: domain.expiryDate,
          status: domain.status
        })))
      }
    } catch (error) {
      console.error('Error fetching available domains:', error)
      toast({
        title: "Gagal",
        description: "Daftar domain nggak bisa dimuat. Coba lagi, ya.",
      })
    } finally {
      setLoadingDomains(false)
    }
  }, [toast])

  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchAvailableDomains()
    }
  }, [session, fetchAvailableDomains])

  // Get website status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { status: 'active', color: 'bg-green-500', text: 'Aktif' }
      case 'INACTIVE':
        return { status: 'inactive', color: 'bg-gray-500', text: 'Nonaktif' }
      case 'MAINTENANCE':
        return { status: 'maintenance', color: 'bg-yellow-500', text: 'Pemeliharaan' }
      case 'DEVELOPMENT':
        return { status: 'development', color: 'bg-blue-500', text: 'Pengembangan' }
      case 'SUSPENDED':
        return { status: 'suspended', color: 'bg-red-500', text: 'Ditangguhkan' }
      default:
        return { status: 'unknown', color: 'bg-gray-400', text: 'Tidak diketahui' }
    }
  }

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total website',
      value: stats.total,
      icon: AppWindow,
      color: 'text-violet',
      bgColor: 'bg-lilac'
    },
    {
      title: 'Website aktif',
      value: stats.active,
      icon: Activity,
      color: 'text-on-mint',
      bgColor: 'bg-mint'
    },
    {
      title: 'Situs online',
      value: stats.live,
      icon: Monitor,
      color: 'text-on-sky',
      bgColor: 'bg-sky'
    },
    {
      title: 'Situs offline',
      value: stats.offline,
      icon: MonitorOff,
      color: 'text-st-no',
      bgColor: 'bg-rose'
    }
  ]

  // Handle show add website modal
  const handleShowAddModal = () => {
    fetchAvailableDomains()
    setShowAddModal(true)
  }

  // Handle add website
  const handleAddWebsite = async () => {
    try {
      setAddingWebsite(true)

      // Basic validation
      if (!newWebsite.siteName.trim()) {
        toast({
          title: "Cek lagi, ya",
          description: "Nama situs wajib diisi",
          variant: "destructive",
        })
        return
      }

      if (!newWebsite.domainId) {
        toast({
          title: "Cek lagi, ya", 
          description: "Pilih domain dulu, ya",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newWebsite,
          cms: newWebsite.cms === 'none' ? null : newWebsite.cms
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Beres!",
          description: "Website sudah ditambahkan",
        })

        // Refresh websites list
        await fetchWebsites()

        // Reset form
        setNewWebsite({
          siteName: '',
          domainId: '',
          username: '',
          password: '',
          cms: 'none',
          description: '',
          notes: '',
          status: 'ACTIVE',
          isLive: true
        })

        setShowAddModal(false)
      } else {
        toast({
          title: "Gagal",
          description: data.error || "Website gagal ditambahkan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding website:', error)
      toast({
        title: "Gagal",
        description: "Website gagal ditambahkan",
        variant: "destructive",
      })
    } finally {
      setAddingWebsite(false)
    }
  }

  // Fetch available domains for edit (including current domain)
  const fetchAvailableDomainsForEdit = useCallback(async (currentDomainId: string) => {
    try {
      setLoadingDomains(true)
      const response = await fetch('/api/domains?availableForWebsite=true', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch domains')
      }

      const data = await response.json()
      if (data.success) {
        const availableDomains = data.domains.map((domain: any) => ({
          id: domain.id,
          domain: domain.domain,
          expiryDate: domain.expiryDate,
          status: domain.status
        }))

        // Add current domain if not in the list
        const currentDomainExists = availableDomains.some((d: any) => d.id === currentDomainId)
        if (!currentDomainExists) {
          // Fetch current domain details
          const currentDomainResponse = await fetch('/api/domains', {
            credentials: 'include'
          })
          if (currentDomainResponse.ok) {
            const currentDomainData = await currentDomainResponse.json()
            const currentDomain = currentDomainData.domains.find((d: any) => d.id === currentDomainId)
            if (currentDomain) {
              availableDomains.push({
                id: currentDomain.id,
                domain: currentDomain.domain,
                expiryDate: currentDomain.expiryDate,
                status: currentDomain.status
              })
            }
          }
        }

        setAvailableDomains(availableDomains)
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
      toast({
        title: "Gagal",
        description: "Daftar domain nggak bisa dimuat. Coba lagi, ya.",
        variant: "destructive",
      })
    } finally {
      setLoadingDomains(false)
    }
  }, [toast])

  // Handle edit website
  const handleEditWebsite = (website: Website) => {
    setEditWebsite({
      id: website.id,
      siteName: website.siteName,
      domainId: website.domainId,
      username: website.username || '',
      password: website.password || '',
      cms: website.cms || 'none',
      description: website.description || '',
      notes: website.notes || '',
      status: website.status,
      isLive: website.isLive
    })
    fetchAvailableDomainsForEdit(website.domainId)
    setShowEditModal(true)
  }

  // Handle update website
  const handleUpdateWebsite = async () => {
    try {
      setEditingWebsite(true)

      const response = await fetch(`/api/websites/${editWebsite.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          siteName: editWebsite.siteName.trim(),
          domainId: editWebsite.domainId,
          username: editWebsite.username.trim() || null,
          password: editWebsite.password.trim() || null,
          cms: editWebsite.cms === 'none' ? null : (editWebsite.cms.trim() || null),
          description: editWebsite.description.trim() || null,
          notes: editWebsite.notes.trim() || null,
          status: editWebsite.status,
          isLive: editWebsite.isLive
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Beres!",
          description: "Website sudah diperbarui",
        })

        // Refresh websites list
        await fetchWebsites()

        // Reset form and close modal
        setEditWebsite({
          id: '',
          siteName: '',
          domainId: '',
          username: '',
          password: '',
          cms: 'none',
          description: '',
          notes: '',
          status: 'ACTIVE',
          isLive: true
        })
        setShowEditModal(false)
      } else {
        toast({
          title: "Gagal",
          description: data.error || "Website gagal diperbarui",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating website:', error)
      toast({
        title: "Gagal",
        description: "Website gagal diperbarui",
        variant: "destructive",
      })
    } finally {
      setEditingWebsite(false)
    }
  }

  // Handle view website details
  const handleViewWebsite = (website: Website) => {
    setSelectedWebsite(website)
    setShowViewModal(true)
  }

  // Toggle password visibility
  const togglePasswordVisibility = (websiteId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(websiteId)) {
        newSet.delete(websiteId)
      } else {
        newSet.add(websiteId)
      }
      return newSet
    })
  }

  // Copy password to clipboard
  const copyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password)
      toast({
        title: "Beres!",
        description: "Kata sandi sudah disalin",
      })
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Kata sandi nggak bisa disalin. Coba lagi, ya.",
        variant: "destructive",
      })
    }
  }

  // Actions behind each row's "Manage" button
  const websiteActions = (website: Website): ManageAction[] => [
    { label: 'Lihat detail', icon: Eye, onSelect: () => handleViewWebsite(website) },
    ...(canManageWebsites ? [{ label: 'Ubah', icon: Edit, onSelect: () => handleEditWebsite(website) }] : []),
    ...(userRole === 'ADMIN' ? [{ label: 'Hapus', icon: Trash2, onSelect: () => handleDeleteWebsite(website), destructive: true }] : []),
  ]

  // Handle delete website
  const handleDeleteWebsite = async (website: Website) => {
    const confirmed = await confirm({
      title: 'Hapus website?',
      description: `"${website.siteName}" akan dihapus permanen. Tindakan ini nggak bisa dibatalkan.`,
    })
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Beres!",
          description: "Website sudah dihapus",
        })

        // Refresh websites list
        await fetchWebsites()
      } else {
        toast({
          title: "Gagal",
          description: data.error || "Website gagal dihapus",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting website:', error)
      toast({
        title: "Gagal",
        description: "Website gagal dihapus",
        variant: "destructive",
      })
    }
  }

  // Filter websites
  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.siteName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                         website.domain.domain.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                         (website.cms && website.cms.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    
    const matchesFilter = filterStatus === 'all' || website.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  // Pagination
  const totalPages = Math.ceil(filteredWebsites.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWebsites = filteredWebsites.slice(startIndex, endIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  if (status === 'loading' || loading) {
    return <PageSkeleton />
  }

  if (!session) {
    return null
  }

  return (
    <>
      <div className="w-full">
      {/* Header */}
      <PageHeader className="mb-8"
        title="Website"
        description="Kelola website kamu beserta detailnya"
        actions={
          <>
            <Button variant="outline" onClick={fetchWebsites} disabled={websitesQuery.isFetching} aria-label="Muat ulang" className="w-12 px-0 sm:w-auto sm:px-5">
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${websitesQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="sr-only sm:not-sr-only">Muat ulang</span>
            </Button>
            {canManageWebsites && (
              <Button onClick={handleShowAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah website
              </Button>
            )}
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:gap-5 xl:grid-cols-4 mb-8">
        {statsCards.map((card, index) => (
          <StatCard key={index} title={card.title} value={card.value} icon={card.icon} color={card.color} bgColor={card.bgColor} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Cari website, domain, atau CMS…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white pl-11 shadow-card"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full whitespace-nowrap bg-white shadow-card sm:w-auto sm:min-w-52">
            <Filter className="w-4 h-4 shrink-0 text-muted" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            <SelectItem value="MAINTENANCE">Pemeliharaan</SelectItem>
            <SelectItem value="DEVELOPMENT">Pengembangan</SelectItem>
            <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Websites Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama situs</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>CMS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWebsites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-muted">
                        <AppWindow className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">Nggak ada website yang ditemukan</p>
                        <p className="text-sm">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'Coba ubah kata kunci atau filternya'
                            : 'Yuk, tambah website pertamamu'
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedWebsites.map((website) => {
                    const statusBadge = getStatusBadge(website.status)
                    return (
                      <TableRow key={website.id}>
                        <TableCell>
                          <div className="font-medium">{website.siteName}</div>
                          {website.description && (
                            <div className="text-sm text-muted truncate max-w-48">
                              {website.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-violet" />
                            <span className="font-mono text-sm">{website.domain.domain}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {website.cms ? (
                            <Badge variant="outline" className="text-xs">
                              {website.cms}
                            </Badge>
                          ) : (
                            <span className="text-muted text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneFromBgClass(statusBadge.color)}>{statusBadge.text}</StatusPill>
                          <div className={`mt-1 flex items-center gap-1 text-sm ${website.isLive ? 'text-on-mint' : 'text-st-no'}`}>
                            {website.isLive ? <Monitor className="w-3.5 h-3.5" /> : <MonitorOff className="w-3.5 h-3.5" />}
                            {website.isLive ? 'Online' : 'Offline'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted">
                            {new Date(website.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ManageMenu actions={websiteActions(website)} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Websites Cards - Mobile */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold tracking-[-0.02em]">Website ({filteredWebsites.length})</h3>
          {(userRole === 'ADMIN' || userRole === 'STAFF') && (
            <Button onClick={handleShowAddModal} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          )}
        </div>
        
        {paginatedWebsites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center justify-center text-muted">
                <AppWindow className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nggak ada website yang ditemukan</p>
                <p className="text-sm">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Coba ubah kata kunci atau filternya'
                    : 'Yuk, tambah website pertamamu'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedWebsites.map((website) => {
              const statusBadge = getStatusBadge(website.status)
              
              return (
                <Card key={website.id} className="p-4">
                  <div className="space-y-3">
                    {/* Website Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-[14px] bg-lilac">
                          <AppWindow className="w-4 h-4 text-violet" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[15px] font-extrabold leading-snug break-words">{website.siteName}</h4>
                          <p className="truncate text-sm text-muted">{website.domain?.domain || 'Belum ada domain'}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <StatusPill tone={toneFromBgClass(statusBadge.color)}>{statusBadge.text}</StatusPill>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${website.isLive ? 'bg-on-mint' : 'bg-muted'}`}></div>
                              <span className="text-xs text-muted">
                                {website.isLive ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Website Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm [&>div]:min-w-0 [&>div]:break-words">
                      <div>
                        <span className="text-muted">CMS:</span>
                        <div className="mt-1 font-medium">
                          {website.cms || 'Belum diisi'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted">Dibuat:</span>
                        <div className="mt-1 font-medium">
                          {formatIndonesianDate(website.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {website.description && (
                      <div className="text-sm">
                        <span className="text-muted">Deskripsi:</span>
                        <p className="mt-1 text-ink">{website.description}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <ManageMenu actions={websiteActions(website)} />
                      <div className="text-xs text-muted">
                        #{website.id.slice(-8)}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted">
                  Halaman {currentPage} dari {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination - Desktop */}
      <div className="hidden md:block mt-6">
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredWebsites.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="website"
        />
      </div>

      {/* Add Website Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah website baru</DialogTitle>
            <DialogDescription>
              Tambah website baru lengkap dengan domain dan detailnya.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="siteName">Nama situs *</Label>
              <Input
                id="siteName"
                placeholder="mis. Blog Perusahaan"
                value={newWebsite.siteName}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, siteName: e.target.value }))}
              />
            </div>

            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Domain *</Label>
              {loadingDomains ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted">Memuat domain…</span>
                </div>
              ) : (
                <Select 
                  value={newWebsite.domainId} 
                  onValueChange={(value) => setNewWebsite(prev => ({ ...prev, domainId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {domain.domain}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="admin"
                value={newWebsite.username}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={newWebsite.password}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            {/* CMS */}
            <div className="space-y-2">
              <Label htmlFor="cms">CMS</Label>
              <Select 
                value={newWebsite.cms} 
                onValueChange={(value) => setNewWebsite(prev => ({ ...prev, cms: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih CMS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="WordPress">WordPress</SelectItem>
                  <SelectItem value="Laravel">Laravel</SelectItem>
                  <SelectItem value="CodeIgniter">CodeIgniter</SelectItem>
                  <SelectItem value="React">React</SelectItem>
                  <SelectItem value="Next.js">Next.js</SelectItem>
                  <SelectItem value="Vue.js">Vue.js</SelectItem>
                  <SelectItem value="Nuxt.js">Nuxt.js</SelectItem>
                  <SelectItem value="Drupal">Drupal</SelectItem>
                  <SelectItem value="Joomla">Joomla</SelectItem>
                  <SelectItem value="Custom">Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={newWebsite.status} 
                onValueChange={(value) => setNewWebsite(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="MAINTENANCE">Pemeliharaan</SelectItem>
                  <SelectItem value="DEVELOPMENT">Pengembangan</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                placeholder="Deskripsi singkat website"
                value={newWebsite.description}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Live Status */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isLive"
                  checked={newWebsite.isLive}
                  onCheckedChange={(checked) => setNewWebsite(prev => ({ ...prev, isLive: checked }))}
                />
                <Label htmlFor="isLive">Website sudah online</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan soal website ini…"
                value={newWebsite.notes}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleAddWebsite} disabled={addingWebsite}>
              {addingWebsite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menambahkan…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah website
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Website Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ubah website</DialogTitle>
            <DialogDescription>
              Perbarui informasi dan detail website.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="editSiteName">Nama situs *</Label>
              <Input
                id="editSiteName"
                placeholder="mis. Blog Perusahaan"
                value={editWebsite.siteName}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, siteName: e.target.value }))}
              />
            </div>

            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Domain *</Label>
              <Select 
                value={editWebsite.domainId} 
                onValueChange={(value) => setEditWebsite(prev => ({ ...prev, domainId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih domain" />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {domain.domain}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                placeholder="admin"
                value={editWebsite.username}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="editPassword">Kata sandi</Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="••••••••"
                value={editWebsite.password}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            {/* CMS */}
            <div className="space-y-2">
              <Label htmlFor="editCms">CMS</Label>
              <Select 
                value={editWebsite.cms} 
                onValueChange={(value) => setEditWebsite(prev => ({ ...prev, cms: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih CMS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="WordPress">WordPress</SelectItem>
                  <SelectItem value="Laravel">Laravel</SelectItem>
                  <SelectItem value="CodeIgniter">CodeIgniter</SelectItem>
                  <SelectItem value="React">React</SelectItem>
                  <SelectItem value="Next.js">Next.js</SelectItem>
                  <SelectItem value="Vue.js">Vue.js</SelectItem>
                  <SelectItem value="Nuxt.js">Nuxt.js</SelectItem>
                  <SelectItem value="Drupal">Drupal</SelectItem>
                  <SelectItem value="Joomla">Joomla</SelectItem>
                  <SelectItem value="Custom">Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editWebsite.status} 
                onValueChange={(value) => setEditWebsite(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="MAINTENANCE">Pemeliharaan</SelectItem>
                  <SelectItem value="DEVELOPMENT">Pengembangan</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="editDescription">Deskripsi</Label>
              <Input
                id="editDescription"
                placeholder="Deskripsi singkat website"
                value={editWebsite.description}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Live Status */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsLive"
                  checked={editWebsite.isLive}
                  onCheckedChange={(checked) => setEditWebsite(prev => ({ ...prev, isLive: checked }))}
                />
                <Label htmlFor="editIsLive">Website sudah online</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="editNotes">Catatan</Label>
              <Textarea
                id="editNotes"
                placeholder="Catatan tambahan soal website ini…"
                value={editWebsite.notes}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleUpdateWebsite} disabled={editingWebsite}>
              {editingWebsite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memperbarui…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Perbarui website
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Website Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail website</DialogTitle>
            <DialogDescription>
              Informasi lengkap {selectedWebsite?.siteName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWebsite && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted">Nama situs</Label>
                  <p className="text-sm font-medium">{selectedWebsite.siteName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted">Domain</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet" />
                    <p className="text-sm font-mono">{selectedWebsite.domain.domain}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted">Status</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const statusBadge = getStatusBadge(selectedWebsite.status)
                      return (
                        <StatusPill tone={toneFromBgClass(statusBadge.color)}>{statusBadge.text}</StatusPill>
                      )
                    })()}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted">Status online</Label>
                  <div className="flex items-center gap-2">
                    {selectedWebsite.isLive ? (
                      <>
                        <Monitor className="w-4 h-4 text-on-mint" />
                        <span className="text-on-mint text-sm font-medium">Online</span>
                      </>
                    ) : (
                      <>
                        <MonitorOff className="w-4 h-4 text-st-no" />
                        <span className="text-st-no text-sm font-medium">Offline</span>
                      </>
                    )}
                  </div>
                </div>

                {selectedWebsite.username && (
                  <div>
                    <Label className="text-sm font-medium text-muted">Username</Label>
                    <p className="text-sm font-mono">{selectedWebsite.username}</p>
                  </div>
                )}

                {selectedWebsite.password && (
                  <div>
                    <Label className="text-sm font-medium text-muted">Kata sandi</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {visiblePasswords.has(selectedWebsite.id) 
                          ? selectedWebsite.password 
                          : '••••••••'
                        }
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => togglePasswordVisibility(selectedWebsite.id)}
                      >
                        {visiblePasswords.has(selectedWebsite.id) ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyPassword(selectedWebsite.password!)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedWebsite.cms && (
                  <div>
                    <Label className="text-sm font-medium text-muted">CMS</Label>
                    <Badge variant="outline" className="text-xs">
                      {selectedWebsite.cms}
                    </Badge>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted">Dibuat</Label>
                  <p className="text-sm">{new Date(selectedWebsite.createdAt).toLocaleDateString('id-ID')}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted">Terakhir diperbarui</Label>
                  <p className="text-sm">{new Date(selectedWebsite.updatedAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {selectedWebsite.description && (
                <div>
                  <Label className="text-sm font-medium text-muted">Deskripsi</Label>
                  <p className="text-sm">{selectedWebsite.description}</p>
                </div>
              )}

              {selectedWebsite.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted">Catatan</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedWebsite.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
