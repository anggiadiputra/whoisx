'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/navbar'
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
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  XCircle,
  RefreshCw,
  Monitor,
  MonitorOff,
  Copy
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

export default function WebsitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [websites, setWebsites] = useState<Website[]>([])
  const [stats, setStats] = useState<WebsiteStats>({
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
    development: 0,
    suspended: 0,
    live: 0,
    offline: 0
  })
  const [loading, setLoading] = useState(true)
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

  // Fetch websites data
  const fetchWebsites = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/websites', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        console.log('📊 Websites received:', data.websites.length)
        console.log('📊 Stats received:', data.stats)
        setWebsites(data.websites)
        setStats(data.stats)
      } else {
        console.error('❌ API returned error:', data.error)
        setWebsites([])
        setStats({
          total: 0,
          active: 0,
          inactive: 0,
          maintenance: 0,
          development: 0,
          suspended: 0,
          live: 0,
          offline: 0
        })
      }
    } catch (error) {
      console.error('❌ Error fetching websites:', error)
      toast({
        title: "Error",
        description: "Failed to fetch websites data",
        variant: "destructive",
      })
      setWebsites([])
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        maintenance: 0,
        development: 0,
        suspended: 0,
        live: 0,
        offline: 0
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

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
        title: "Error",
        description: "Failed to load available domains",
      })
    } finally {
      setLoadingDomains(false)
    }
  }, [toast])

  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchWebsites()
      fetchAvailableDomains()
    }
  }, [session, fetchWebsites, fetchAvailableDomains])

  // Get website status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { status: 'active', color: 'bg-green-500', text: 'Active' }
      case 'INACTIVE':
        return { status: 'inactive', color: 'bg-gray-500', text: 'Inactive' }
      case 'MAINTENANCE':
        return { status: 'maintenance', color: 'bg-yellow-500', text: 'Maintenance' }
      case 'DEVELOPMENT':
        return { status: 'development', color: 'bg-blue-500', text: 'Development' }
      case 'SUSPENDED':
        return { status: 'suspended', color: 'bg-red-500', text: 'Suspended' }
      default:
        return { status: 'unknown', color: 'bg-gray-400', text: 'Unknown' }
    }
  }

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Websites',
      value: stats.total,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Websites',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Live Sites',
      value: stats.live,
      icon: Monitor,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: 'Offline Sites',
      value: stats.offline,
      icon: MonitorOff,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
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
          title: "Validation Error",
          description: "Site name is required",
          variant: "destructive",
        })
        return
      }

      if (!newWebsite.domainId) {
        toast({
          title: "Validation Error", 
          description: "Domain selection is required",
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
          title: "Success",
          description: "Website created successfully",
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
          title: "Error",
          description: data.error || "Failed to create website",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding website:', error)
      toast({
        title: "Error",
        description: "Failed to create website",
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
        title: "Error",
        description: "Failed to fetch available domains",
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
          title: "Success",
          description: "Website updated successfully",
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
          title: "Error",
          description: data.error || "Failed to update website",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating website:', error)
      toast({
        title: "Error",
        description: "Failed to update website",
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
        title: "Success",
        description: "Password copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy password",
        variant: "destructive",
      })
    }
  }

  // Handle delete website
  const handleDeleteWebsite = async (website: Website) => {
    if (!confirm(`Are you sure you want to delete "${website.siteName}"? This action cannot be undone.`)) {
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
          title: "Success",
          description: "Website deleted successfully",
        })

        // Refresh websites list
        await fetchWebsites()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete website",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting website:', error)
      toast({
        title: "Error",
        description: "Failed to delete website",
        variant: "destructive",
      })
    }
  }

  // Filter websites
  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.domain.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (website.cms && website.cms.toLowerCase().includes(searchTerm.toLowerCase()))
    
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Management</h1>
          <p className="text-gray-600">Manage your websites and their configurations</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
          {canManageWebsites && (
            <Button 
              className="flex items-center gap-2"
              onClick={handleShowAddModal}
            >
              <Plus className="w-4 h-4" />
              Add New Website
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className={`border ${card.borderColor} ${card.bgColor}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search websites, domains, or CMS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="DEVELOPMENT">Development</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Websites Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>CMS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Live Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWebsites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Globe className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No websites found</p>
                        <p className="text-sm">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'Try adjusting your search or filter criteria'
                            : 'Get started by adding your first website'
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
                            <div className="text-sm text-gray-500 truncate max-w-48">
                              {website.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span className="font-mono text-sm">{website.domain.domain}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {website.cms ? (
                            <Badge variant="outline" className="text-xs">
                              {website.cms}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusBadge.color} text-white text-xs`}>
                            {statusBadge.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {website.isLive ? (
                              <>
                                <Monitor className="w-4 h-4 text-green-500" />
                                <span className="text-green-600 text-sm font-medium">Live</span>
                              </>
                            ) : (
                              <>
                                <MonitorOff className="w-4 h-4 text-red-500" />
                                <span className="text-red-600 text-sm font-medium">Offline</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {new Date(website.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Details"
                              onClick={() => handleViewWebsite(website)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canManageWebsites && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Edit Website"
                                  onClick={() => handleEditWebsite(website)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {userRole === 'ADMIN' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete Website"
                                    onClick={() => handleDeleteWebsite(website)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
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
        </CardContent>
      </Card>

      {/* Websites Cards - Mobile */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Websites ({filteredWebsites.length})</h3>
          {(userRole === 'ADMIN' || userRole === 'STAFF') && (
            <Button onClick={handleShowAddModal} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          )}
        </div>
        
        {paginatedWebsites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Globe className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No websites found</p>
                <p className="text-sm">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by adding your first website'
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{website.siteName}</h4>
                          <p className="text-sm text-gray-500">{website.domain?.domain || 'No domain'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={`${statusBadge.color} text-white text-xs`}>
                          {statusBadge.text}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${website.isLive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-xs text-gray-500">
                            {website.isLive ? 'Live' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Website Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">CMS:</span>
                        <div className="mt-1 font-medium">
                          {website.cms || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="mt-1 font-medium">
                          {formatIndonesianDate(website.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {website.description && (
                      <div className="text-sm">
                        <span className="text-gray-500">Description:</span>
                        <p className="mt-1 text-gray-700">{website.description}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          title="View Website"
                          onClick={() => handleViewWebsite(website)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                              title="Edit Website"
                              onClick={() => handleEditWebsite(website)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {userRole === 'ADMIN' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                title="Delete Website"
                                onClick={() => handleDeleteWebsite(website)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
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

      {/* Pagination - Desktop */}
      {totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredWebsites.length)} of {filteredWebsites.length} websites
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Website Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Website</DialogTitle>
            <DialogDescription>
              Create a new website entry with domain and configuration details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name *</Label>
              <Input
                id="siteName"
                placeholder="My Awesome Website"
                value={newWebsite.siteName}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, siteName: e.target.value }))}
              />
            </div>

            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Domain *</Label>
              {loadingDomains ? (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading domains...</span>
                </div>
              ) : (
                <Select 
                  value={newWebsite.domainId} 
                  onValueChange={(value) => setNewWebsite(prev => ({ ...prev, domainId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a domain" />
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
              <Label htmlFor="password">Password</Label>
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
                  <SelectValue placeholder="Select CMS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="WordPress">WordPress</SelectItem>
                  <SelectItem value="Laravel">Laravel</SelectItem>
                  <SelectItem value="CodeIgniter">CodeIgniter</SelectItem>
                  <SelectItem value="React">React</SelectItem>
                  <SelectItem value="Next.js">Next.js</SelectItem>
                  <SelectItem value="Vue.js">Vue.js</SelectItem>
                  <SelectItem value="Nuxt.js">Nuxt.js</SelectItem>
                  <SelectItem value="Drupal">Drupal</SelectItem>
                  <SelectItem value="Joomla">Joomla</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
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
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the website"
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
                <Label htmlFor="isLive">Website is live</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this website..."
                value={newWebsite.notes}
                onChange={(e) => setNewWebsite(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWebsite} disabled={addingWebsite}>
              {addingWebsite ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Website'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Website Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Website</DialogTitle>
            <DialogDescription>
              Update website information and configuration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="editSiteName">Site Name *</Label>
              <Input
                id="editSiteName"
                placeholder="My Awesome Website"
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
                  <SelectValue placeholder="Select a domain" />
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
              <Label htmlFor="editPassword">Password</Label>
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
                  <SelectValue placeholder="Select CMS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="WordPress">WordPress</SelectItem>
                  <SelectItem value="Laravel">Laravel</SelectItem>
                  <SelectItem value="CodeIgniter">CodeIgniter</SelectItem>
                  <SelectItem value="React">React</SelectItem>
                  <SelectItem value="Next.js">Next.js</SelectItem>
                  <SelectItem value="Vue.js">Vue.js</SelectItem>
                  <SelectItem value="Nuxt.js">Nuxt.js</SelectItem>
                  <SelectItem value="Drupal">Drupal</SelectItem>
                  <SelectItem value="Joomla">Joomla</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
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
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                placeholder="Brief description of the website"
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
                <Label htmlFor="editIsLive">Website is live</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Additional notes about this website..."
                value={editWebsite.notes}
                onChange={(e) => setEditWebsite(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWebsite} disabled={editingWebsite}>
              {editingWebsite ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Website'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Website Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Website Details</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedWebsite?.siteName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWebsite && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Site Name</Label>
                  <p className="text-sm font-medium">{selectedWebsite.siteName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Domain</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-mono">{selectedWebsite.domain.domain}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const statusBadge = getStatusBadge(selectedWebsite.status)
                      return (
                        <Badge className={`${statusBadge.color} text-white text-xs`}>
                          {statusBadge.text}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Live Status</Label>
                  <div className="flex items-center gap-2">
                    {selectedWebsite.isLive ? (
                      <>
                        <Monitor className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 text-sm font-medium">Live</span>
                      </>
                    ) : (
                      <>
                        <MonitorOff className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 text-sm font-medium">Offline</span>
                      </>
                    )}
                  </div>
                </div>

                {selectedWebsite.username && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Username</Label>
                    <p className="text-sm font-mono">{selectedWebsite.username}</p>
                  </div>
                )}

                {selectedWebsite.password && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Password</Label>
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
                    <Label className="text-sm font-medium text-gray-600">CMS</Label>
                    <Badge variant="outline" className="text-xs">
                      {selectedWebsite.cms}
                    </Badge>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-600">Created</Label>
                  <p className="text-sm">{new Date(selectedWebsite.createdAt).toLocaleDateString('id-ID')}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                  <p className="text-sm">{new Date(selectedWebsite.updatedAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {selectedWebsite.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="text-sm">{selectedWebsite.description}</p>
                </div>
              )}

              {selectedWebsite.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedWebsite.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
