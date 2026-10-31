'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
import { formatIndonesianDate } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
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
  ChevronLeft,
  ChevronRight,
  Server,
  Link,
  Trash2,
  Loader2,
  Cloud,
  ShoppingCart,
  CalendarClock
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
  if (days < 0) return `Expired ${Math.abs(days)} days ago`
  if (days === 0) return 'Expires today'
  return `${days} days remaining`
}

function daysLeftColor(days?: number | null) {
  if (days === undefined || days === null) return 'text-gray-500'
  if (days <= 1) return 'text-red-600'
  if (days <= 7) return 'text-orange-600'
  if (days <= 30) return 'text-yellow-600'
  return 'text-gray-500'
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
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle className="text-center">Authentication Required</CardTitle>
              <CardDescription className="text-center">
                Please sign in to access the domains page
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Domain is active while its registration has not expired
  const getExpiryStatus = (daysToExpiry?: number) => {
    if (daysToExpiry === undefined || daysToExpiry === null || daysToExpiry < 0) return { status: 'inactive', color: 'bg-red-600', text: 'Tidak Aktif' }
    return { status: 'active', color: 'bg-green-600', text: 'Aktif' }
  }

  // Domain validation function
  const validateDomain = (domain: string): string | null => {
    if (!domain) return 'Domain is required'
    if (domain.length < 3) return 'Domain must be at least 3 characters'
    
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) return 'Please enter a valid domain name'
    
    return null
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate domain before proceeding
    const domainError = validateDomain(newDomain.domain.trim())
    if (domainError) {
      toast({
        title: "Validation Error",
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
          title: "Success!",
          description: `Domain ${newDomain.domain} has been added successfully.`,
        })
        setNewDomain({ domain: '', renewalPrice: '', notes: '' })
        setShowAddDomain(false)
        fetchDomains()
      } else {
        // Handle API errors
        toast({
          title: "Error Adding Domain",
          description: data.error || 'Failed to add domain. Please try again.',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding domain:', error)
      toast({
        title: "Network Error",
        description: 'Unable to connect to server. Please check your connection.',
        variant: "destructive",
      })
    } finally {
      setAddingDomain(false)
    }
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
          title: "Success!",
          description: `Domain ${selectedDomainForEdit.domain} has been updated successfully.`,
        })
        setEditDomain({ domain: '', renewalPrice: '', notes: '' })
        setShowEditDomain(false)
        setSelectedDomainForEdit(null)
        fetchDomains()
      } else {
        toast({
          title: "Error Updating Domain",
          description: data.error || 'Failed to update domain. Please try again.',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating domain:', error)
      toast({
        title: "Network Error",
        description: 'Unable to connect to server. Please check your connection.',
        variant: "destructive",
      })
    } finally {
      setEditingDomain(false)
    }
  }

  // Actions behind each row's "Manage" button
  const domainActions = (domain: Domain): ManageAction[] => [
    { label: 'View WHOIS', icon: Eye, onSelect: () => setWhoisDomain(domain) },
    ...(canManageDomains ? [
      { label: 'Edit', icon: Edit, onSelect: () => handleEditDomain(domain) },
      { label: 'Assign to Server', icon: Link, onSelect: () => handleAssignDomain(domain) },
      { label: 'Delete', icon: Trash2, onSelect: () => handleDeleteDomain(domain), destructive: true },
    ] : []),
  ]

  // Handle delete domain
  const handleDeleteDomain = async (domain: Domain) => {
    const confirmed = await confirm({
      title: 'Delete domain?',
      description: `"${domain.domain}" and any websites linked to it will be permanently deleted. This action cannot be undone.`,
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
          title: "Success",
          description: `Domain "${domain.domain}" deleted successfully`,
        })
        fetchDomains()
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to delete domain',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error deleting domain:', error)
      toast({
        title: "Error",
        description: "Failed to delete domain",
        variant: "destructive",
      })
    }
  }

  // Filtering and pagination logic moved to hooks section above

  const statsCards = [
    {
      title: 'Total Domains',
      value: stats.total,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Available to Order',
      value: domains.filter(d => d.daysToExpiry === null || d.daysToExpiry === undefined).length,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Akan Expired (30 Hari)',
      value: stats.expiring30,
      icon: CalendarClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Segera Expired (1 Hari)',
      value: stats.expiring1,
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <PageHeader className="mb-8"
          title="Domains"
          description="Monitor and manage your domain portfolio"
          actions={
            <>
              <Button variant="outline" onClick={fetchDomains} disabled={domainsQuery.isFetching}>
                <RefreshCw className={`w-4 h-4 mr-2 ${domainsQuery.isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {canManageDomains && (
                <Button onClick={() => setShowAddDomain(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              )}
            </>
          }
        />

        {canManageDomains && (
          <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Domain</DialogTitle>
                    <DialogDescription>
                      Enter domain details to start monitoring. WHOIS data will be automatically fetched.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddDomain} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="domain" className="text-sm font-medium text-gray-700">
                        Domain Name
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
                      <label htmlFor="renewalPrice" className="text-sm font-medium text-gray-700">
                        Renewal Price (Optional)
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
                      <label htmlFor="notes" className="text-sm font-medium text-gray-700">
                        Notes (Optional)
                      </label>
                      <Input
                        id="notes"
                        placeholder="Additional information..."
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
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={addingDomain}
                        className="flex-1"
                      >
                        {addingDomain ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Domain'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Domain Modal */}
            {canManageDomains && (
              <Dialog open={showEditDomain} onOpenChange={setShowEditDomain}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Domain</DialogTitle>
                    <DialogDescription>
                      Update domain information. Domain name cannot be changed.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateDomain} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="editDomain" className="text-sm font-medium text-gray-700">
                        Domain Name
                      </label>
                      <Input
                        id="editDomain"
                        value={editDomain.domain}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="editRenewalPrice" className="text-sm font-medium text-gray-700">
                        Renewal Price (Optional)
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
                      <label htmlFor="editNotes" className="text-sm font-medium text-gray-700">
                        Notes (Optional)
                      </label>
                      <Input
                        id="editNotes"
                        placeholder="Additional information..."
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
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={editingDomain}
                        className="flex-1"
                      >
                        {editingDomain ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Domain'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <StatCard key={index} title={card.title} value={card.value} icon={card.icon} color={card.color} bgColor={card.bgColor} />
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search domains, registrars, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filterExpiring === null ? "default" : "outline"}
                  onClick={() => setFilterExpiring(null)}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterExpiring === 'critical' ? "default" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'critical' ? null : 'critical')}
                  size="sm"
                >
                  Critical
                </Button>
                <Button
                  variant={filterExpiring === 'warning' ? "default" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'warning' ? null : 'warning')}
                  size="sm"
                >
                  Warning
                </Button>
                <Button
                  variant={filterExpiring === 'attention' ? "default" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'attention' ? null : 'attention')}
                  size="sm"
                >
                  Attention
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domains Table - Desktop */}
        <Card className="hidden md:block overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDomains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Globe className="w-8 h-8 text-gray-400" />
                          <p className="text-gray-500">No domains found</p>
                          {canManageDomains && (
                            <Button onClick={() => setShowAddDomain(true)} size="sm">
                              Add your first domain
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDomains.map((domain) => {
                      const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                      return (
                        <TableRow key={domain.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium text-gray-900">{domain.domain}</div>
                            <div className="text-sm text-gray-500">
                              {domain.realRegistrarName || domain.registrar || 'Unknown registrar'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                          </TableCell>
                          <TableCell>
                            {domain.server ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                                  {domain.server.serverType === 'VPS' ? (
                                    <Server className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Cloud className="w-3 h-3 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{domain.server.serverName}</div>
                                  <div className="text-xs text-gray-500">{domain.server.provider}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900">
                              {domain.expiryDate ? formatIndonesianDate(domain.expiryDate) : 'Unknown'}
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

            {/* Pagination Controls */}
            {filteredDomains.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredDomains.length)} of {filteredDomains.length} domains
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Domains Cards - Mobile */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Domains ({filteredDomains.length})</h3>
          </div>
          
          {filteredDomains.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <Globe className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-500">No domains found</p>
                  {canManageDomains && (
                    <Button onClick={() => setShowAddDomain(true)} size="sm">
                      Add your first domain
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
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Globe className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{domain.domain}</h4>
                            <p className="text-sm text-gray-500">{domain.realRegistrarName || domain.registrar || 'Unknown'}</p>
                          </div>
                        </div>
                        <StatusPill tone={toneFromBgClass(expiryStatus.color)}>{expiryStatus.text}</StatusPill>
                      </div>

                      {/* Domain Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Server:</span>
                          <div className="mt-1">
                            {domain.server ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                                  {domain.server.serverType === 'VPS' ? (
                                    <Server className="w-2 h-2 text-green-600" />
                                  ) : (
                                    <Cloud className="w-2 h-2 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{domain.server.serverName}</div>
                                  <div className="text-xs text-gray-500">{domain.server.provider}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Not assigned</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Days Left:</span>
                          <div className="mt-1 font-medium">
                            {domain.daysToExpiry !== null ? `${domain.daysToExpiry} days` : 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Expiry Date:</span>
                          <div className="mt-1 font-medium">
                            {formatIndonesianDate(domain.expiryDate)}
                          </div>
                        </div>
                        
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <ManageMenu actions={domainActions(domain)} />
                        <div className="text-xs text-gray-400">
                          #{domain.id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
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
