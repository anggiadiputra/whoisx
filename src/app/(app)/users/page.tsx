'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { useApiQuery, useRefreshApiData } from '@/hooks/use-api-query'
import { useConfirm } from '@/components/confirm-dialog'
import { PageSkeleton } from '@/components/page-skeleton'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { ManageMenu, ManageAction } from '@/components/manage-menu'
import { PaginationBar } from '@/components/pagination-bar'
import { StatusPill, toneFromBgClass } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users,
  User,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Save,
  Loader2
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'STAFF' | 'FINANCE'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  emailVerified: string | null
  _count: {
    sessions: number
  }
}

interface UserStats {
  total: number
  active: number
  admin: number
  staff: number
  finance: number
  suspended: number
}

const EMPTY_STATS: UserStats = {
  total: 0,
  active: 0,
  admin: 0,
  staff: 0,
  finance: 0,
  suspended: 0
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Cached, server-filtered user list; previous results stay visible while filters change
  const usersUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (filterRole) params.append('role', filterRole)
    if (filterStatus) params.append('status', filterStatus)
    if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
    return `/api/users?${params.toString()}`
  }, [filterRole, filterStatus, debouncedSearchTerm])
  const isAdmin = session?.user?.role === 'ADMIN'
  const usersQuery = useApiQuery<{ users: User[]; stats?: UserStats }>(usersUrl, isAdmin, true)
  const users = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data])
  const stats = usersQuery.data?.stats ?? EMPTY_STATS
  const loading = status === 'loading' || (isAdmin && usersQuery.isPending)
  const fetchUsers = useRefreshApiData()
  const confirm = useConfirm()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [editingUser, setEditingUser] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    status: 'ACTIVE',
    password: ''
  })

  const [editUser, setEditUser] = useState({
    id: '',
    name: '',
    email: '',
    role: 'STAFF',
    status: 'ACTIVE',
    password: ''
  })

  // Check authentication and permissions
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Only ADMIN can access user management
    if (session.user.role !== 'ADMIN') {
      toast({
        title: "Akses ditolak",
        description: "Kamu nggak punya izin buat kelola pengguna",
        variant: "destructive",
      })
      router.push('/')
      return
    }
  }, [session, status, router, toast])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterRole, filterStatus])

  // Handle filter changes to convert "none" to empty string
  const handleRoleChange = (value: string) => {
    setFilterRole(value === 'none' ? '' : value)
  }

  const handleStatusChange = (value: string) => {
    setFilterStatus(value === 'none' ? '' : value)
  }

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { status: 'admin', color: 'bg-purple-500', text: 'Admin' }
      case 'STAFF':
        return { status: 'staff', color: 'bg-blue-500', text: 'Staf' }
      case 'FINANCE':
        return { status: 'finance', color: 'bg-green-500', text: 'Keuangan' }
      default:
        return { status: 'unknown', color: 'bg-gray-400', text: 'Tidak diketahui' }
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { status: 'active', color: 'bg-green-500', text: 'Aktif' }
      case 'INACTIVE':
        return { status: 'inactive', color: 'bg-gray-500', text: 'Nonaktif' }
      case 'SUSPENDED':
        return { status: 'suspended', color: 'bg-red-500', text: 'Ditangguhkan' }
      default:
        return { status: 'unknown', color: 'bg-gray-400', text: 'Tidak diketahui' }
    }
  }

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total pengguna',
      value: stats.total,
      icon: Users,
      color: 'text-violet',
      bgColor: 'bg-lilac'
    },
    {
      title: 'Pengguna aktif',
      value: stats.active,
      icon: UserCheck,
      color: 'text-on-mint',
      bgColor: 'bg-mint'
    },
    {
      title: 'Admin',
      value: stats.admin,
      icon: Shield,
      color: 'text-on-sky',
      bgColor: 'bg-sky'
    },
    {
      title: 'Pengguna ditangguhkan',
      value: stats.suspended,
      icon: UserX,
      color: 'text-st-no',
      bgColor: 'bg-rose'
    }
  ]

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm.trim() || 
      user.name?.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.trim().toLowerCase())
    
    const matchesRole = !filterRole || user.role === filterRole
    const matchesStatus = !filterStatus || user.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Handle add user
  const handleAddUser = async () => {
    try {
      setAddingUser(true)

      // Basic validation
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast({
          title: "Cek lagi, ya",
          description: "Isi dulu semua kolom yang wajib",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newUser)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat pengguna')
      }

      if (data.success) {
        toast({
          title: "Beres!",
          description: "Pengguna berhasil dibuat",
        })
        
        // Reset form and close modal
        setNewUser({
          name: '',
          email: '',
          role: 'STAFF',
          status: 'ACTIVE',
          password: ''
        })
        setShowAddModal(false)
        
        // Refresh users list
        fetchUsers()
      }
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({
        title: "Gagal",
        description: error.message || "Gagal membuat pengguna",
        variant: "destructive",
      })
    } finally {
      setAddingUser(false)
    }
  }

  // Handle view user
  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditUser({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      status: user.status,
      password: ''
    })
    setShowEditModal(true)
  }

  // Handle update user
  const handleUpdateUser = async () => {
    try {
      setEditingUser(true)

      const response = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          status: editUser.status,
          ...(editUser.password && { password: editUser.password })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui pengguna')
      }

      if (data.success) {
        toast({
          title: "Beres!",
          description: "Pengguna berhasil diperbarui",
        })
        
        setShowEditModal(false)
        fetchUsers()
      }
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: "Gagal",
        description: error.message || "Gagal memperbarui pengguna",
        variant: "destructive",
      })
    } finally {
      setEditingUser(false)
    }
  }

  // Actions behind each row's "Manage" button; admins cannot delete themselves
  const userActions = (user: User): ManageAction[] => [
    { label: 'Lihat detail', icon: Eye, onSelect: () => handleViewUser(user) },
    { label: 'Ubah', icon: Edit, onSelect: () => handleEditUser(user) },
    ...(session?.user?.id !== user.id ? [{ label: 'Hapus', icon: Trash2, onSelect: () => handleDeleteUser(user), destructive: true }] : []),
  ]

  // Handle delete user
  const handleDeleteUser = async (user: User) => {
    const confirmed = await confirm({
      title: 'Hapus pengguna?',
      description: `"${user.name || user.email}" akan dihapus permanen dan nggak bisa masuk lagi. Tindakan ini nggak bisa dibatalkan.`,
    })
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus pengguna')
      }

      if (data.success) {
        toast({
          title: "Beres!",
          description: "Pengguna berhasil dihapus",
        })
        
        fetchUsers()
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({
        title: "Gagal",
        description: error.message || "Gagal menghapus pengguna",
        variant: "destructive",
      })
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah'
    return new Date(dateString).toLocaleDateString('id-ID')
  }

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <>
      <div className="w-full">
      {/* Header */}
      <PageHeader className="mb-8"
        title="Pengguna"
        description="Kelola pengguna dan hak aksesnya"
        actions={
          <>
            <Button variant="outline" onClick={fetchUsers} disabled={usersQuery.isFetching} aria-label="Muat ulang" className="w-12 px-0 sm:w-auto sm:px-5">
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${usersQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="sr-only sm:not-sr-only">Muat ulang</span>
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah pengguna
            </Button>
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
      <Card className="mb-6">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Cari pengguna dari nama atau email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={filterRole || 'none'} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full whitespace-nowrap sm:flex-1 lg:w-auto lg:min-w-[190px] lg:flex-none">
                  <Filter className="w-4 h-4 shrink-0 text-muted" />
                  <SelectValue placeholder="Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua peran</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staf</SelectItem>
                  <SelectItem value="FINANCE">Keuangan</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus || 'none'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full whitespace-nowrap sm:flex-1 lg:w-auto lg:min-w-[190px] lg:flex-none">
                  <Filter className="w-4 h-4 shrink-0 text-muted" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role)
                  const statusBadge = getStatusBadge(user.status)
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name || 'Tanpa nama'}</div>
                          <div className="text-sm text-muted">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneFromBgClass(roleBadge.color)}>{roleBadge.text}</StatusPill>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneFromBgClass(statusBadge.color)}>{statusBadge.text}</StatusPill>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-ink">Terakhir masuk: {formatDate(user.lastLoginAt)}</div>
                        <div className="text-sm text-muted">Bergabung {formatDate(user.createdAt)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ManageMenu actions={userActions(user)} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="pengguna"
            className="mt-6"
          />
        </CardContent>
      </Card>

      {/* Users Cards - Mobile */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold tracking-[-0.02em]">Pengguna ({filteredUsers.length})</h3>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        </div>
        
        {paginatedUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <Users className="w-8 h-8 text-muted" />
                <p className="text-muted">Belum ada pengguna yang cocok. Coba ubah pencarian atau filternya.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role)
              const statusBadge = getStatusBadge(user.status)
              
              return (
                <Card key={user.id} className="p-4">
                  <div className="space-y-3">
                    {/* User Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-[14px] bg-lilac">
                          <User className="w-4 h-4 text-violet" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[15px] font-extrabold leading-snug break-words">{user.name || 'Tanpa nama'}</h4>
                          <p className="truncate text-sm text-muted">{user.email}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <StatusPill tone={toneFromBgClass(roleBadge.color)}>{roleBadge.text}</StatusPill>
                            <StatusPill tone={toneFromBgClass(statusBadge.color)}>{statusBadge.text}</StatusPill>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm [&>div]:min-w-0 [&>div]:break-words">
                      <div>
                        <span className="text-muted">Terakhir masuk:</span>
                        <div className="mt-1 flex items-center text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(user.lastLoginAt)}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted">Dibuat:</span>
                        <div className="mt-1 font-medium text-xs">
                          {formatDate(user.createdAt)}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted">Email terverifikasi:</span>
                        <div className="mt-1 font-medium text-xs">
                          {user.emailVerified ? 'Sudah' : 'Belum'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted">Sesi:</span>
                        <div className="mt-1 font-medium text-xs">
                          {user._count.sessions} aktif
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <ManageMenu actions={userActions(user)} />
                      <div className="text-xs text-muted">
                        #{user.id.slice(-8)}
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

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah pengguna baru</DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dengan peran yang sesuai.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Masukkan nama pengguna"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Masukkan alamat email"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Kata sandi *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Masukkan kata sandi"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Peran</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staf</SelectItem>
                  <SelectItem value="FINANCE">Keuangan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newUser.status} onValueChange={(value) => setNewUser({ ...newUser, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat pengguna
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah pengguna</DialogTitle>
            <DialogDescription>
              Perbarui data dan peran pengguna.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama</Label>
              <Input
                id="edit-name"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                placeholder="Masukkan nama pengguna"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                placeholder="Masukkan alamat email"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-password">Kata sandi baru (opsional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editUser.password}
                onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                placeholder="Kosongkan kalau nggak mau ganti kata sandi"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-role">Peran</Label>
              <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staf</SelectItem>
                  <SelectItem value="FINANCE">Keuangan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editUser.status} onValueChange={(value) => setEditUser({ ...editUser, status: value })}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleUpdateUser} disabled={editingUser}>
              {editingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memperbarui…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Perbarui pengguna
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail pengguna</DialogTitle>
            <DialogDescription>
              Lihat data pengguna dan detail akunnya.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted">Nama</Label>
                  <p className="text-sm">{selectedUser.name || 'Tanpa nama'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Email</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Peran</Label>
                  <StatusPill tone={toneFromBgClass(getRoleBadge(selectedUser.role).color)}>{getRoleBadge(selectedUser.role).text}</StatusPill>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Status</Label>
                  <StatusPill tone={toneFromBgClass(getStatusBadge(selectedUser.status).color)}>{getStatusBadge(selectedUser.status).text}</StatusPill>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Email terverifikasi</Label>
                  <p className="text-sm">{selectedUser.emailVerified ? 'Sudah' : 'Belum'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Sesi aktif</Label>
                  <p className="text-sm">{selectedUser._count.sessions}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Terakhir masuk</Label>
                  <p className="text-sm">{formatDate(selectedUser.lastLoginAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted">Dibuat</Label>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowViewModal(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
