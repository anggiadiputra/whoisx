'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/navbar'
import { WhoisDetailModal } from '@/components/whois-detail-modal'
import { AssignDomainModal } from '@/components/assign-domain-modal'
import { formatIndonesianDate } from '@/lib/utils'
import { 
  Plus, 
  Search, 
  RefreshCw,
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Globe, 
  Calendar,
  Filter,
  Eye,
  Edit,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Server,
  Link
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

export default function DomainsPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [domains, setDomains] = useState<Domain[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    expired: 0,
    expiring30: 0,
    expiring7: 0,
    expiring1: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterExpiring, setFilterExpiring] = useState<string | null>(null)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDomainForAssign, setSelectedDomainForAssign] = useState<Domain | null>(null)
  const [newDomain, setNewDomain] = useState({
    domain: '',
    renewalPrice: '',
    notes: ''
  })
  const [addingDomain, setAddingDomain] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // User permissions
  const userRole = session?.user?.role
  const canManageDomains = userRole === 'ADMIN' || userRole === 'STAFF'

  const fetchDomains = useCallback(async () => {
    try {
      const response = await fetch('/api/domains', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      })
      
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
        setStats(data.stats || { total: 0, expired: 0, expiring30: 0, expiring7: 0, expiring1: 0 })
      } else {
        console.error('❌ API Error:', response.status, response.statusText)
        // Try to get error message from response
        try {
          const errorData = await response.json()
          console.error('Error details:', errorData)
        } catch (e) {
          console.error('Could not parse error response')
        }
        
        if (toast) {
          toast({
            title: "Error Loading Domains",
            description: `Failed to load domains (${response.status})`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('🔥 Network/Fetch Error:', error)
      if (toast) {
        toast({
          title: "Network Error",
          description: 'Unable to connect to server. Please check your connection.',
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Add small delay to ensure session is fully established
      const timer = setTimeout(() => {
        fetchDomains()
      }, 100)
      return () => clearTimeout(timer)
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, session, fetchDomains])

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navbar />
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

  // Get status badge for domain expiry
  const getExpiryStatus = (daysToExpiry?: number) => {
    if (daysToExpiry === undefined || daysToExpiry === null) return { status: 'available', color: 'bg-blue-500', text: 'Available to Order' }
    if (daysToExpiry < 0) return { status: 'expired', color: 'bg-red-600', text: 'Sudah Expired' }
    if (daysToExpiry <= 1) return { status: 'critical', color: 'bg-red-500', text: 'Segera Expired' }
    if (daysToExpiry <= 7) return { status: 'warning', color: 'bg-orange-500', text: 'Perlu Diperpanjang' }
    if (daysToExpiry <= 30) return { status: 'attention', color: 'bg-yellow-500', text: 'Akan Expired' }
    return { status: 'good', color: 'bg-green-500', text: 'Masih Aman' }
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

  // Filter domains based on search and expiry filter
  const filteredDomains = domains.filter(domain => {
    const matchesSearch = domain.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         domain.registrar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         domain.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (filterExpiring === 'critical') return domain.daysToExpiry && domain.daysToExpiry <= 1
    if (filterExpiring === 'warning') return domain.daysToExpiry && domain.daysToExpiry <= 7
    if (filterExpiring === 'attention') return domain.daysToExpiry && domain.daysToExpiry <= 30
    if (filterExpiring === 'good') return domain.daysToExpiry && domain.daysToExpiry > 30

    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDomains = filteredDomains.slice(startIndex, endIndex)

  const statsCards = [
    {
      title: 'Total Domains',
      value: stats.total,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Available to Order',
      value: domains.filter(d => d.daysToExpiry === null || d.daysToExpiry === undefined).length,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Akan Expired (30 Hari)',
      value: stats.expiring30,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Segera Expired (1 Hari)',
      value: stats.expiring1,
      icon: Clock,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Domain Management</h1>
              <p className="text-gray-600 mt-1">Monitor and manage your domain portfolio</p>
            </div>
            
            {canManageDomains && (
              <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Domain
                  </Button>
                </DialogTrigger>
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
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className={`${card.bgColor} ${card.borderColor} border-2 hover:shadow-lg transition-all duration-200`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                    <div className={`${card.color} ${card.bgColor} p-3 rounded-full`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                  variant={filterExpiring === 'critical' ? "destructive" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'critical' ? null : 'critical')}
                  size="sm"
                >
                  Critical
                </Button>
                <Button
                  variant={filterExpiring === 'warning' ? "default" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'warning' ? null : 'warning')}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Warning
                </Button>
                <Button
                  variant={filterExpiring === 'attention' ? "default" : "outline"}
                  onClick={() => setFilterExpiring(filterExpiring === 'attention' ? null : 'attention')}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Attention
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domains Table - Desktop */}
        <Card className="hidden md:block">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Domains ({filteredDomains.length})</CardTitle>
                <CardDescription>
                  Manage your domain portfolio and monitor expiry dates
                </CardDescription>
              </div>
              <Button variant="outline" onClick={fetchDomains} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registrar</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDomains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
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
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Globe className="w-4 h-4 text-blue-600" />
                              </div>
                              <span>{domain.domain}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${expiryStatus.color} text-white`}>
                              {expiryStatus.text}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {domain.realRegistrarName || domain.registrar || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {domain.server ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                                  {domain.server.serverType === 'VPS' ? (
                                    <Server className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Globe className="w-3 h-3 text-green-600" />
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
                            {domain.expiryDate ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatIndonesianDate(domain.expiryDate)}</span>
                              </div>
                            ) : (
                              'Unknown'
                            )}
                          </TableCell>
                          <TableCell>
                            {domain.daysToExpiry !== undefined ? (
                              <span className={`font-medium ${
                                domain.daysToExpiry <= 1 ? 'text-red-600' :
                                domain.daysToExpiry <= 7 ? 'text-orange-600' :
                                domain.daysToExpiry <= 30 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {domain.daysToExpiry} days
                              </span>
                            ) : (
                              'Unknown'
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <WhoisDetailModal domainId={domain.id} domainName={domain.domain}>
                                <Button variant="ghost" size="sm" title="View WHOIS Details">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </WhoisDetailModal>
                              {canManageDomains && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                    title="Edit Domain"
                                    onClick={() => {
                                      // TODO: Implement edit domain functionality
                                      toast({
                                        title: "Edit Domain",
                                        description: "Edit domain functionality will be implemented soon",
                                        variant: "default",
                                      })
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50" 
                                    title="Assign to Server"
                                    onClick={() => handleAssignDomain(domain)}
                                  >
                                    <Link className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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
            <Button variant="outline" onClick={fetchDomains} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
                        <Badge variant="secondary" className={`${expiryStatus.color} text-white text-xs`}>
                          {expiryStatus.text}
                        </Badge>
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
                                    <Globe className="w-2 h-2 text-green-600" />
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
                        <div className="flex items-center space-x-2">
                          <WhoisDetailModal domainId={domain.id} domainName={domain.domain}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                              title="View WHOIS Details"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </WhoisDetailModal>
                          {canManageDomains && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                                title="Edit Domain"
                                onClick={() => {
                                  toast({
                                    title: "Edit Domain",
                                    description: "Edit domain functionality will be implemented soon",
                                    variant: "default",
                                  })
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                                title="Assign to Server"
                                onClick={() => handleAssignDomain(domain)}
                              >
                                <Link className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
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
