'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Server, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  CheckCircle,
  AlertTriangle,
  Clock,
  AlertCircle,
  Monitor,
  Copy,
  EyeOff
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Navbar } from '@/components/navbar'
import { formatIndonesianDate } from '@/lib/utils'

interface ServerData {
  id: string
  serverName: string
  provider: string
  serverType: 'HOSTING' | 'VPS'
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'MAINTENANCE' | 'CANCELLED'
  ipAddress?: string
  createdDate?: string
  expiryDate?: string
  daysToExpiry?: number
  username?: string
  password?: string
  notes?: string
  isMonitored: boolean
  uptimePercent?: number
  lastDowntime?: string
  lastChecked?: string
  createdAt: string
  updatedAt: string
  domainCount?: number
  domains?: Array<{
    id: string
    domain: string
    status: string
    expiryDate?: string
  }>
}

interface ServerStats {
  total: number
  active: number
  expired: number
  expiring7: number
  expiring30: number
  hosting: number
  vps: number
}

export default function ServersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [servers, setServers] = useState<ServerData[]>([])
  const [stats, setStats] = useState<ServerStats>({
    total: 0,
    active: 0,
    expired: 0,
    expiring7: 0,
    expiring30: 0,
    hosting: 0,
    vps: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  
  // Domain selection states
  const [availableDomains, setAvailableDomains] = useState<Array<{id: string, domain: string}>>([])
  const [selectedDomainsForNew, setSelectedDomainsForNew] = useState<string[]>([])
  const [selectedDomainsForEdit, setSelectedDomainsForEdit] = useState<string[]>([])
  const [loadingDomains, setLoadingDomains] = useState(false)

  // Add Server Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingServer, setAddingServer] = useState(false)
  
  // View Server Modal State
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedServer, setSelectedServer] = useState<ServerData | null>(null)
  
  // Domains Modal State
  const [showDomainsModal, setShowDomainsModal] = useState(false)
  const [selectedServerForDomains, setSelectedServerForDomains] = useState<ServerData | null>(null)
  
  // Edit Server Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingServer, setEditingServer] = useState(false)
  const [editServer, setEditServer] = useState<{
    id: string
    serverName: string
    provider: string
    serverType: 'HOSTING' | 'VPS'
    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'MAINTENANCE' | 'CANCELLED'
    createdDate: string
    expiryDate: string
    username: string
    password: string
    notes: string
  }>({
    id: '',
    serverName: '',
    provider: '',
    serverType: 'HOSTING',
    status: 'ACTIVE',
    createdDate: '',
    expiryDate: '',
    username: '',
    password: '',
    notes: ''
  })
  const [newServer, setNewServer] = useState({
    serverName: '',
    provider: '',
    serverType: 'HOSTING' as const,
    status: 'ACTIVE' as const,
    createdDate: '',
    expiryDate: '',
    username: '',
    password: '',
    notes: ''
  })

  // User permissions
  const userRole = session?.user?.role
  const canManageServers = userRole === 'ADMIN' || userRole === 'STAFF'
  const canViewPrices = userRole === 'ADMIN' || userRole === 'FINANCE'

  // Fetch servers data
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/servers', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setServers(data.servers)
        setStats(data.stats)
      } else {
        console.error('❌ API returned error:', data.error)
        setServers([])
        setStats({
          total: 0,
          active: 0,
          expired: 0,
          expiring7: 0,
          expiring30: 0,
          hosting: 0,
          vps: 0
        })
      }
    } catch (error) {
      console.error('❌ Error fetching servers:', error)
      toast({
        title: "Error",
        description: "Failed to fetch servers data",
        variant: "destructive",
      })
      setServers([])
      setStats({
        total: 0,
        active: 0,
        expired: 0,
        expiring7: 0,
        expiring30: 0,
        hosting: 0,
        vps: 0
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Fetch available domains (unassigned domains)
  const fetchAvailableDomains = useCallback(async () => {
    try {
      setLoadingDomains(true)
      const response = await fetch('/api/domains', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch domains')
      }

      const data = await response.json()
      if (data.success) {
        // Filter domains that are not assigned to any server
        const unassignedDomains = data.domains
          .filter((domain: any) => !domain.server)
          .map((domain: any) => ({
            id: domain.id,
            domain: domain.domain
          }))
        setAvailableDomains(unassignedDomains)
      }
    } catch (error) {
      console.error('Error fetching available domains:', error)
      toast({
        title: "Error",
        description: "Failed to load available domains",
        variant: "destructive",
      })
    } finally {
      setLoadingDomains(false)
    }
  }, [toast])

  // Initial data fetch and event listeners
  useEffect(() => {
    if (status === 'authenticated') {
      fetchServers()
    }

    // Event listeners for server updates/deletes
    const handleServerUpdate = () => {
      fetchServers()
    }

    const handleServerDelete = () => {
      fetchServers()
    }

    window.addEventListener('serverUpdated', handleServerUpdate)
    window.addEventListener('serverDeleted', handleServerDelete)
    
    return () => {
      window.removeEventListener('serverUpdated', handleServerUpdate)
      window.removeEventListener('serverDeleted', handleServerDelete)
    }
  }, [status, fetchServers])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterStatus])

  // Early returns after all hooks
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Filter servers based on search and filters
  const filteredServers = servers.filter(server => {
    const matchesSearch = 
      server.serverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || server.serverType === filterType.toUpperCase()
    const matchesStatus = filterStatus === 'all' || server.status === filterStatus.toUpperCase()

    return matchesSearch && matchesType && matchesStatus
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedServers = filteredServers.slice(startIndex, endIndex)

  // Get server type icon
  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'HOSTING':
        return Globe
      case 'VPS':
        return Server
      default:
        return Monitor
    }
  }

  // Toggle password visibility
  const togglePasswordVisibility = (serverId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(serverId)) {
        newSet.delete(serverId)
      } else {
        newSet.add(serverId)
      }
      return newSet
    })
  }

  // Copy password to clipboard
  const copyPassword = async (password: string, serverName: string) => {
    try {
      await navigator.clipboard.writeText(password)
      toast({
        title: "Password Copied",
        description: `Password for ${serverName} copied to clipboard`,
        variant: "default",
      })
    } catch (error) {
      console.error('Failed to copy password:', error)
      toast({
        title: "Copy Failed",
        description: "Failed to copy password to clipboard",
        variant: "destructive",
      })
    }
  }

  // View server details
  const handleViewServer = (server: ServerData) => {
    setSelectedServer(server)
    setShowViewModal(true)
  }

  // Show domains modal
  const handleShowDomains = (server: ServerData) => {
    setSelectedServerForDomains(server)
    setShowDomainsModal(true)
  }

  // Edit server
  const handleEditServer = (server: ServerData) => {
    setEditServer({
      id: server.id,
      serverName: server.serverName,
      provider: server.provider,
      serverType: server.serverType,
      status: server.status,
      createdDate: server.createdDate ? server.createdDate.split('T')[0] : '',
      expiryDate: server.expiryDate ? server.expiryDate.split('T')[0] : '',
      username: server.username || '',
      password: server.password || '',
      notes: server.notes || ''
    })
    
    // Set currently assigned domains
    const currentlyAssignedDomains = server.domains?.map(d => d.id) || []
    setSelectedDomainsForEdit(currentlyAssignedDomains)
    
    // Fetch available domains and show modal
    fetchAvailableDomains().then(() => {
      setShowEditModal(true)
    })
  }

  // Update server
  const handleUpdateServer = async () => {
    if (!editServer.serverName.trim() || !editServer.provider.trim()) {
      toast({
        title: "Validation Error",
        description: "Server name and provider are required",
        variant: "destructive",
      })
      return
    }

    setEditingServer(true)

    try {
      const response = await fetch(`/api/servers/${editServer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverName: editServer.serverName.trim(),
          provider: editServer.provider.trim(),
          serverType: editServer.serverType,
          status: editServer.status,
          createdDate: editServer.createdDate || null,
          expiryDate: editServer.expiryDate || null,
          username: editServer.username.trim() || null,
          password: editServer.password.trim() || null,
          notes: editServer.notes.trim() || null,
          domainIds: selectedDomainsForEdit
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update server')
      }

      const data = await response.json()
      
      toast({
        title: "Server Updated",
        description: `${editServer.serverName} has been updated successfully`,
        variant: "default",
      })

      // Reset form and close modal
      setEditServer({
        id: '',
        serverName: '',
        provider: '',
        serverType: 'HOSTING',
        status: 'ACTIVE',
        createdDate: '',
        expiryDate: '',
        username: '',
        password: '',
        notes: ''
      })
      setSelectedDomainsForEdit([])
      setShowEditModal(false)

      // Refresh servers list
      fetchServers()

    } catch (error) {
      console.error('Error updating server:', error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update server",
        variant: "destructive",
      })
    } finally {
      setEditingServer(false)
    }
  }

  // Get server status badge
  const getServerStatus = (status: string, daysToExpiry?: number) => {
    if (status === 'EXPIRED' || (daysToExpiry !== null && daysToExpiry !== undefined && daysToExpiry < 0)) {
      return { status: 'expired', color: 'bg-red-600', text: 'Expired' }
    }
    
    if (status === 'SUSPENDED') {
      return { status: 'suspended', color: 'bg-orange-600', text: 'Suspended' }
    }
    
    if (status === 'MAINTENANCE') {
      return { status: 'maintenance', color: 'bg-yellow-600', text: 'Maintenance' }
    }
    
    if (status === 'CANCELLED') {
      return { status: 'cancelled', color: 'bg-gray-600', text: 'Cancelled' }
    }

    // Check expiry for active servers
    if (status === 'ACTIVE' && daysToExpiry !== null && daysToExpiry !== undefined) {
      if (daysToExpiry <= 1) {
        return { status: 'critical', color: 'bg-red-500', text: 'Segera Expired' }
      }
      if (daysToExpiry <= 7) {
        return { status: 'warning', color: 'bg-orange-500', text: 'Perlu Diperpanjang' }
      }
      if (daysToExpiry <= 30) {
        return { status: 'attention', color: 'bg-yellow-500', text: 'Akan Expired' }
      }
    }

    return { status: 'active', color: 'bg-green-500', text: 'Active' }
  }

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Servers',
      value: stats.total,
      icon: Server,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Servers',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Expiring (30 Days)',
      value: stats.expiring30,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Expired Servers',
      value: stats.expired,
      icon: Clock,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300'
    }
  ]

  // Handle show add server modal
  const handleShowAddModal = () => {
    fetchAvailableDomains().then(() => {
      setShowAddModal(true)
    })
  }

  // Handle add server
  const handleAddServer = async () => {
    try {
      setAddingServer(true)

      // Basic validation
      if (!newServer.serverName.trim()) {
        toast({
          title: "Validation Error",
          description: "Server name is required",
          variant: "destructive",
        })
        return
      }

      if (!newServer.provider.trim()) {
        toast({
          title: "Validation Error", 
          description: "Provider is required",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newServer,
          domainIds: selectedDomainsForNew
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: `Server "${newServer.serverName}" added successfully`,
          variant: "default",
        })

        // Reset form
        setNewServer({
          serverName: '',
          provider: '',
          serverType: 'HOSTING',
          status: 'ACTIVE',
          createdDate: '',
          expiryDate: '',
          username: '',
          password: '',
          notes: ''
        })
        setSelectedDomainsForNew([])

        setShowAddModal(false)
        fetchServers() // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to add server',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error adding server:', error)
      toast({
        title: "Error",
        description: "Failed to add server",
        variant: "destructive",
      })
    } finally {
      setAddingServer(false)
    }
  }

  // Handle delete server
  const handleDeleteServer = async (serverId: string, serverName: string) => {
    if (!confirm(`Are you sure you want to delete server "${serverName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: `Server "${serverName}" deleted successfully`,
          variant: "default",
        })

        fetchServers() // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to delete server',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error deleting server:', error)
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Server Management</h1>
              <p className="text-gray-600 mt-1">Manage your hosting and VPS servers</p>
            </div>
            
            {canManageServers && (
              <>
                <Button 
                  className="flex items-center gap-2"
                  onClick={handleShowAddModal}
                >
                  <Plus className="w-4 h-4" />
                  Add New Server
                </Button>
                
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Server</DialogTitle>
                    <DialogDescription>
                      Add a new hosting or VPS server to your management system.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serverName">Server Name *</Label>
                        <Input
                          id="serverName"
                          placeholder="e.g., Web Server 01"
                          value={newServer.serverName}
                          onChange={(e) => setNewServer(prev => ({ ...prev, serverName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider *</Label>
                        <Input
                          id="provider"
                          placeholder="e.g., DigitalOcean, AWS"
                          value={newServer.provider}
                          onChange={(e) => setNewServer(prev => ({ ...prev, provider: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serverType">Server Type</Label>
                        <Select value={newServer.serverType} onValueChange={(value: any) => setNewServer(prev => ({ ...prev, serverType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOSTING">Hosting</SelectItem>
                            <SelectItem value="VPS">VPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={newServer.status} onValueChange={(value: any) => setNewServer(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Server Details */}
                    <div className="grid grid-cols-2 gap-4">
                    </div>



                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="createdDate">Created Date</Label>
                        <Input
                          id="createdDate"
                          type="date"
                          value={newServer.createdDate}
                          onChange={(e) => setNewServer(prev => ({ ...prev, createdDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={newServer.expiryDate}
                          onChange={(e) => setNewServer(prev => ({ ...prev, expiryDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Access Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="root, admin"
                          value={newServer.username}
                          onChange={(e) => setNewServer(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter server password"
                          value={newServer.password}
                          onChange={(e) => setNewServer(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Domain Selection */}
                    <div className="space-y-2">
                      <Label>Assign Domains (Optional)</Label>
                      {loadingDomains ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Loading available domains...</span>
                        </div>
                      ) : availableDomains.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">
                          No unassigned domains available
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            Select domains to assign to this server:
                          </div>
                          <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                            {availableDomains.map((domain) => (
                              <label key={domain.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedDomainsForNew.includes(domain.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDomainsForNew(prev => [...prev, domain.id])
                                    } else {
                                      setSelectedDomainsForNew(prev => prev.filter(id => id !== domain.id))
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm">{domain.domain}</span>
                              </label>
                            ))}
                          </div>
                          {selectedDomainsForNew.length > 0 && (
                            <div className="text-sm text-green-600">
                              {selectedDomainsForNew.length} domain(s) selected
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional notes about this server..."
                        value={newServer.notes}
                        onChange={(e) => setNewServer(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddServer} disabled={addingServer}>
                      {addingServer ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Server'
                      )}
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Server List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search servers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="hosting">Hosting</SelectItem>
                      <SelectItem value="vps">VPS</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Server Table - Desktop */}
              <div className="border rounded-lg overflow-hidden hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Domains</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Server className="w-12 h-12 text-gray-400" />
                            <p className="text-gray-500">No servers found</p>
                            {canManageServers && (
                              <Button 
                                variant="outline" 
                                onClick={handleShowAddModal}
                                className="mt-2"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Server
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedServers.map((server) => {
                        const serverStatus = getServerStatus(server.status, server.daysToExpiry)
                        const TypeIcon = getServerTypeIcon(server.serverType)
                        
                        return (
                          <TableRow key={server.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <TypeIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{server.serverName}</div>
                                  {server.ipAddress && (
                                    <div className="text-sm text-gray-500">{server.ipAddress}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {server.serverType}
                              </Badge>
                            </TableCell>
                            <TableCell>{server.provider}</TableCell>
                            <TableCell>
                              <Badge className={`${serverStatus.color} text-white`}>
                                {serverStatus.text}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {server.username ? (
                                <span className="font-mono text-sm">{server.username}</span>
                              ) : (
                                <span className="text-gray-400">No username</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {server.password ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    <span className="font-mono text-sm">
                                      {visiblePasswords.has(server.id) 
                                        ? server.password 
                                        : '••••••••'
                                      }
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => togglePasswordVisibility(server.id)}
                                      title={visiblePasswords.has(server.id) ? "Hide password" : "Show password"}
                                    >
                                      {visiblePasswords.has(server.id) ? (
                                        <EyeOff className="w-3 h-3" />
                                      ) : (
                                        <Eye className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyPassword(server.password!, server.serverName)}
                                      title="Copy password"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No password</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div 
                                className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                                onClick={() => handleShowDomains(server)}
                                title="Click to view assigned domains"
                              >
                                <Badge variant="outline" className="text-xs">
                                  {server.domainCount || 0} domains
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {server.expiryDate ? (
                                <div className="text-sm">
                                  <div>{formatIndonesianDate(server.expiryDate)}</div>
                                  {server.daysToExpiry !== null && server.daysToExpiry !== undefined && (
                                    <div className="text-gray-500">
                                      {server.daysToExpiry < 0 
                                        ? `${Math.abs(server.daysToExpiry)} days ago`
                                        : `${server.daysToExpiry} days left`
                                      }
                                    </div>
                                  )}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="View Server Details"
                                  onClick={() => handleViewServer(server)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canManageServers && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      title="Edit Server"
                                      onClick={() => handleEditServer(server)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {userRole === 'ADMIN' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete Server"
                                        onClick={() => handleDeleteServer(server.id, server.serverName)}
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

              {/* Pagination Controls */}
              {filteredServers.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredServers.length)} of {filteredServers.length} servers
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

          {/* Server Cards - Mobile */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Servers ({filteredServers.length})</h3>
              {canManageServers && (
                <Button onClick={handleShowAddModal} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
            
            {filteredServers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Server className="w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">No servers found</p>
                    {canManageServers && (
                      <Button 
                        variant="outline" 
                        onClick={handleShowAddModal}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Server
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {paginatedServers.map((server) => {
                  const serverStatus = getServerStatus(server.status, server.daysToExpiry)
                  const ServerIcon = getServerTypeIcon(server.serverType)
                  
                  return (
                    <Card key={server.id} className="p-4">
                      <div className="space-y-3">
                        {/* Server Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <ServerIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{server.serverName}</h4>
                              <p className="text-sm text-gray-500">{server.provider}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {server.serverType}
                            </Badge>
                            <Badge className={`${serverStatus.color} text-white text-xs`}>
                              {serverStatus.text}
                            </Badge>
                          </div>
                        </div>

                        {/* Server Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Username:</span>
                            <div className="mt-1 font-medium">
                              {server.username || 'N/A'}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Password:</span>
                            <div className="mt-1 flex items-center space-x-2">
                              {server.password ? (
                                <>
                                  <span className="font-mono text-xs">
                                    {visiblePasswords.has(server.id) ? server.password : '••••••••'}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => togglePasswordVisibility(server.id)}
                                  >
                                    {visiblePasswords.has(server.id) ? (
                                      <EyeOff className="w-3 h-3" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => copyPassword(server.password!, server.id)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-gray-400 text-xs">Not set</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Domains:</span>
                            <div className="mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-blue-600 hover:text-blue-700"
                                onClick={() => handleShowDomains(server)}
                              >
                                {server.domainCount} domains
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Expiry:</span>
                            <div className="mt-1 font-medium">
                              {server.expiryDate ? formatIndonesianDate(server.expiryDate) : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                              title="View Server"
                              onClick={() => handleViewServer(server)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {canManageServers && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                                  title="Edit Server"
                                  onClick={() => handleEditServer(server)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                  title="Delete Server"
                                  onClick={() => handleDeleteServer(server.id, server.serverName)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            #{server.id.slice(-8)}
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
      </div>

      {/* View Server Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Server Details</DialogTitle>
          </DialogHeader>
          
          {selectedServer && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Server Name</Label>
                    <p className="mt-1 text-sm">{selectedServer.serverName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Provider</Label>
                    <p className="mt-1 text-sm">{selectedServer.provider}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Type</Label>
                    <p className="mt-1">
                      <Badge variant="outline">{selectedServer.serverType}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <p className="mt-1">
                      <Badge className={`${getServerStatus(selectedServer.status, selectedServer.daysToExpiry).color} text-white`}>
                        {getServerStatus(selectedServer.status, selectedServer.daysToExpiry).text}
                      </Badge>
                    </p>
                  </div>

                </div>
              </div>

              {/* Access Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Access Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Username</Label>
                    <p className="mt-1 text-sm font-mono">{selectedServer.username || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Password</Label>
                    {selectedServer.password ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-mono">
                          {visiblePasswords.has(selectedServer.id) 
                            ? selectedServer.password 
                            : '••••••••'
                          }
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => togglePasswordVisibility(selectedServer.id)}
                        >
                          {visiblePasswords.has(selectedServer.id) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyPassword(selectedServer.password!, selectedServer.serverName)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">N/A</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Important Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created Date</Label>
                    <p className="mt-1 text-sm">
                      {selectedServer.createdDate ? formatIndonesianDate(selectedServer.createdDate) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Expiry Date</Label>
                    <p className="mt-1 text-sm">
                      {selectedServer.expiryDate ? formatIndonesianDate(selectedServer.expiryDate) : 'N/A'}
                    </p>
                  </div>
                  {selectedServer.daysToExpiry !== null && selectedServer.daysToExpiry !== undefined && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Days to Expiry</Label>
                      <p className="mt-1 text-sm">
                        {selectedServer.daysToExpiry < 0 
                          ? `${Math.abs(selectedServer.daysToExpiry)} days ago`
                          : `${selectedServer.daysToExpiry} days left`
                        }
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Checked</Label>
                    <p className="mt-1 text-sm">
                      {selectedServer.lastChecked ? formatIndonesianDate(selectedServer.lastChecked) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>



              {/* Notes */}
              {selectedServer.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedServer.notes}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Server Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Server</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-serverName">Server Name *</Label>
                  <Input
                    id="edit-serverName"
                    placeholder="Web Server 01"
                    value={editServer.serverName}
                    onChange={(e) => setEditServer(prev => ({ ...prev, serverName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-provider">Provider *</Label>
                  <Input
                    id="edit-provider"
                    placeholder="DigitalOcean, AWS, etc."
                    value={editServer.provider}
                    onChange={(e) => setEditServer(prev => ({ ...prev, provider: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-serverType">Server Type</Label>
                  <Select value={editServer.serverType} onValueChange={(value: 'HOSTING' | 'VPS') => setEditServer(prev => ({ ...prev, serverType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOSTING">Hosting</SelectItem>
                      <SelectItem value="VPS">VPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editServer.status} onValueChange={(value: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'MAINTENANCE' | 'CANCELLED') => setEditServer(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Important Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-createdDate">Created Date</Label>
                  <Input
                    id="edit-createdDate"
                    type="date"
                    value={editServer.createdDate}
                    onChange={(e) => setEditServer(prev => ({ ...prev, createdDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expiryDate">Expiry Date</Label>
                  <Input
                    id="edit-expiryDate"
                    type="date"
                    value={editServer.expiryDate}
                    onChange={(e) => setEditServer(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Access Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Access Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    placeholder="root, admin"
                    value={editServer.username}
                    onChange={(e) => setEditServer(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Enter server password"
                    value={editServer.password}
                    onChange={(e) => setEditServer(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Assign Domains (Optional)</Label>
              {loadingDomains ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading available domains...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Select domains to assign to this server:
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                    {/* Currently assigned domains */}
                    {editServer.id && servers.find(s => s.id === editServer.id)?.domains?.map((domain) => (
                      <label key={domain.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedDomainsForEdit.includes(domain.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDomainsForEdit(prev => [...prev, domain.id])
                            } else {
                              setSelectedDomainsForEdit(prev => prev.filter(id => id !== domain.id))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{domain.domain}</span>
                        <Badge variant="outline" className="text-xs">Currently assigned</Badge>
                      </label>
                    ))}
                    
                    {/* Available unassigned domains */}
                    {availableDomains.map((domain) => (
                      <label key={domain.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedDomainsForEdit.includes(domain.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDomainsForEdit(prev => [...prev, domain.id])
                            } else {
                              setSelectedDomainsForEdit(prev => prev.filter(id => id !== domain.id))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{domain.domain}</span>
                      </label>
                    ))}
                  </div>
                  {selectedDomainsForEdit.length > 0 && (
                    <div className="text-sm text-green-600">
                      {selectedDomainsForEdit.length} domain(s) selected
                    </div>
                  )}
                  {availableDomains.length === 0 && (!editServer.id || !servers.find(s => s.id === editServer.id)?.domains?.length) && (
                    <div className="text-sm text-gray-500 py-2">
                      No domains available for assignment
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes about this server..."
                value={editServer.notes}
                onChange={(e) => setEditServer(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                disabled={editingServer}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateServer}
                disabled={editingServer}
              >
                {editingServer ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Server'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Domains Modal */}
      <Dialog open={showDomainsModal} onOpenChange={setShowDomainsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assigned Domains</DialogTitle>
            <DialogDescription>
              Domains assigned to {selectedServerForDomains?.serverName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedServerForDomains?.domains && selectedServerForDomains.domains.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Total: {selectedServerForDomains.domains.length} domain(s)
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {selectedServerForDomains.domains.map((domain) => (
                    <div 
                      key={domain.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{domain.domain}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Status: <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            domain.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            domain.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                            domain.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {domain.status}
                          </span>
                        </div>
                      </div>
                      
                      {domain.expiryDate && (
                        <div className="text-right text-xs text-gray-500">
                          <div>Expires:</div>
                          <div className="font-medium">
                            {formatIndonesianDate(domain.expiryDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No domains assigned to this server</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDomainsModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
