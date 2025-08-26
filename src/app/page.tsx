'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/navbar'
import { WhoisDetailModal } from '@/components/whois-detail-modal'
import { RecentActivity } from '@/components/recent-activity'
import { formatIndonesianDate } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Activity,
  DollarSign,
  Users,
  Server
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

export default function HomePage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Get user role from session
  const userRole = session?.user?.role as string
  const [domains, setDomains] = useState<Domain[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    expired: 0,
    expiring30: 0,
    expiring7: 0,
    expiring1: 0
  })
  const [renewalCosts, setRenewalCosts] = useState({
    expiring30: 0,
    expiring7: 0,
    expiring1: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterExpiring, setFilterExpiring] = useState<string | null>(null)
  
  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [newDomain, setNewDomain] = useState({
    domain: '',
    renewalPrice: '',
    notes: ''
  })
  const [addingDomain, setAddingDomain] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Calculate renewal costs for expiring domains
  const calculateRenewalCosts = useCallback((domainsList: Domain[]) => {
    const costs = {
      expiring30: 0,
      expiring7: 0,
      expiring1: 0,
      total: 0
    }

    domainsList.forEach(domain => {
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

    setRenewalCosts(costs)
  }, [])

  // Move all hooks to the top
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
        
        // Calculate renewal costs
        calculateRenewalCosts(data.domains || [])
      } else {
        console.error('❌ API Error:', response.status, response.statusText)
        toast({
          title: "Error Loading Domains",
          description: `Failed to load domains (${response.status})`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('🔥 Network/Fetch Error:', error)
      toast({
        title: "Network Error",
        description: 'Unable to connect to server. Please check your connection.',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDomains()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, fetchDomains])

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

  // Early returns after all hooks
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to access the dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Role-based permissions
  const canManageDomains = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF'
  const canViewPrices = session?.user?.role === 'ADMIN' || session?.user?.role === 'FINANCE'

  // Filter domains based on search and expiry filter
  // Memoized filtered domains for better performance
  const filteredDomains = useMemo(() => {
    return domains.filter(domain => {
      const matchesSearch = domain.domain.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      
      if (!filterExpiring) return matchesSearch
      
      const days = domain.daysToExpiry
      if (filterExpiring === '1' && days !== null && days <= 1) return matchesSearch
      if (filterExpiring === '7' && days !== null && days <= 7) return matchesSearch
      if (filterExpiring === '30' && days !== null && days <= 30) return matchesSearch
      
      return false
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



  const getExpiryStatus = (daysToExpiry: number | null) => {
    if (daysToExpiry === null) return { status: 'available', color: 'bg-blue-500', text: 'Available to Order' }
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

  const handleEditDomain = (domain: Domain) => {
    toast({
      title: 'Edit Domain',
      description: 'Edit domain functionality will be implemented soon'
    })
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
      value: domains.filter(d => d.daysToExpiry === null).length,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Expiring Soon',
      value: stats.expiring30,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Sudah Expired',
      value: stats.expired || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {session?.user?.name || session?.user?.email}
            </p>
          </div>
          
          {canManageDomains && (
            <Button
              onClick={() => setShowAddDomain(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>

                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <IconComponent className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>



        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Domains Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="text-xl font-semibold">Domain Portfolio</CardTitle>
                    <CardDescription>Manage and monitor your domain collection</CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search domains..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDomains()}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Filter Tabs */}
                <Tabs value={filterExpiring || 'all'} onValueChange={(value) => setFilterExpiring(value === 'all' ? null : value)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All Domains</TabsTrigger>
                    <TabsTrigger value="30">30 Days</TabsTrigger>
                    <TabsTrigger value="7">7 Days</TabsTrigger>
                    <TabsTrigger value="1">1 Day</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent>
                {filteredDomains.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No domains found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || filterExpiring ? 'Try adjusting your search or filters' : 'Get started by adding your first domain'}
                    </p>
                    {canManageDomains && !searchTerm && !filterExpiring && (
                      <Button onClick={() => setShowAddDomain(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Domain
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expiry</TableHead>
                            {canViewPrices && <TableHead>Price</TableHead>}
                            <TableHead>Registrar</TableHead>
                            <TableHead>Server</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {paginatedDomains.map((domain) => {
                          const expiryStatus = getExpiryStatus(domain.daysToExpiry)
                          return (
                            <TableRow key={domain.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{domain.domain}</div>
                                    {domain.notes && (
                                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                        {domain.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={expiryStatus.status === 'good' || expiryStatus.status === 'available' ? 'default' : 'destructive'}
                                  className={`${expiryStatus.color} text-white`}
                                >
                                  {expiryStatus.text}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {domain.expiryDate ? (
                                    <>
                                      <div className="font-medium">
                                        {formatIndonesianDate(domain.expiryDate)}
                                      </div>
                                      <div className="text-gray-500">
                                        {domain.daysToExpiry !== null ? (
                                          `${domain.daysToExpiry} days`
                                        ) : (
                                          'Unknown'
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Not available</span>
                                  )}
                                </div>
                              </TableCell>
                              {canViewPrices && (
                                <TableCell>
                                  {domain.renewalPrice ? (
                                    <span className="font-medium">Rp {parseInt(domain.renewalPrice.toString()).toLocaleString('id-ID')}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {domain.realRegistrarName || domain.registrar || 'Unknown'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {domain.server ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                                      {domain.server.serverType === 'VPS' ? (
                                        <Server className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Globe className="w-3 h-3 text-green-600" />
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <div className="font-medium">{domain.server.serverName}</div>
                                      <div className="text-xs text-gray-500">{domain.server.provider}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not assigned</span>
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
                          <Card key={domain.id} className="p-4">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{domain.domain}</div>
                                    {domain.notes && (
                                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                        {domain.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Badge 
                                  variant={expiryStatus.status === 'good' || expiryStatus.status === 'available' ? 'default' : 'destructive'}
                                  className={`${expiryStatus.color} text-white text-xs`}
                                >
                                  {expiryStatus.text}
                                </Badge>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Expiry:</span>
                                  <div className="font-medium">
                                    {domain.expiryDate ? formatIndonesianDate(domain.expiryDate) : 'N/A'}
                                  </div>
                                </div>
                                {canViewPrices && (
                                  <div>
                                    <span className="text-gray-500">Price:</span>
                                    <div className="font-medium">
                                      {domain.renewalPrice ? `Rp ${parseInt(domain.renewalPrice.toString()).toLocaleString('id-ID')}` : 'N/A'}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500">Registrar:</span>
                                  <div className="font-medium">
                                    {domain.realRegistrarName || domain.registrar || 'Unknown'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Server:</span>
                                  <div className="font-medium">
                                    {domain.server ? (
                                      <div className="flex items-center space-x-1">
                                        <Server className="w-3 h-3 text-gray-400" />
                                        <span>{domain.server.serverName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Not assigned</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end space-x-2 pt-2 border-t">
                                <WhoisDetailModal domain={domain} />
                                {canManageDomains && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditDomain(domain)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Pagination Controls */}
                {filteredDomains.length > 0 && totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t space-y-3 md:space-y-0">
                    <div className="text-sm text-gray-700 order-2 md:order-1">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredDomains.length)} of {filteredDomains.length} domains
                    </div>
                    <div className="flex items-center space-x-2 order-1 md:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Previous</span>
                      </Button>
                      
                      <div className="hidden md:flex items-center space-x-1">
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
                      
                      {/* Mobile page indicator */}
                      <div className="md:hidden text-sm text-gray-600 px-3">
                        {currentPage} / {totalPages}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Jumlah Bayar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Jumlah Bayar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Total Finance Payment */}
                {(userRole === 'ADMIN' || userRole === 'FINANCE') && (
                  <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-700">Total Payment Required</p>
                          <p className="text-2xl font-bold text-orange-800 mt-1">
                            Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">Domain renewals (30 days)</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Detailed Breakdown Modal */}
                {(userRole === 'ADMIN' || userRole === 'FINANCE') && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        View Payment Breakdown
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Domain Renewal Costs</DialogTitle>
                        <DialogDescription>
                          Financial overview of upcoming domain renewal expenses
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        {/* Cost Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Critical (1 Day)</p>
                                  <p className="text-2xl font-bold text-red-600">
                                    Rp {renewalCosts.expiring1.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Warning (7 Days)</p>
                                  <p className="text-2xl font-bold text-orange-600">
                                    Rp {renewalCosts.expiring7.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <Clock className="w-8 h-8 text-orange-500" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Upcoming (30 Days)</p>
                                  <p className="text-2xl font-bold text-yellow-600">
                                    Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <Calendar className="w-8 h-8 text-yellow-500" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">Total Portfolio</p>
                                  <p className="text-2xl font-bold text-blue-600">
                                    Rp {renewalCosts.total.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <DollarSign className="w-8 h-8 text-blue-500" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Detailed Breakdown */}
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">Budget Planning</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-red-50 rounded">
                              <span>Immediate Payment Required (≤1 day):</span>
                              <span className="font-medium text-red-600">
                                Rp {renewalCosts.expiring1.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-orange-50 rounded">
                              <span>This Week (≤7 days):</span>
                              <span className="font-medium text-orange-600">
                                Rp {renewalCosts.expiring7.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-yellow-50 rounded">
                              <span>This Month (≤30 days):</span>
                              <span className="font-medium text-yellow-600">
                                Rp {renewalCosts.expiring30.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6">
                          <Button variant="outline" className="flex-1">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Export Report
                          </Button>
                          <Button className="flex-1">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Payments
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <RecentActivity />
          </div>
        </div>


      </div>
    </div>
  )
}