'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Server, Globe, Loader2 } from 'lucide-react'

interface Domain {
  id: string
  domain: string
  server?: {
    id: string
    serverName: string
    provider: string
    serverType: string
    status: string
  }
}

interface ServerOption {
  id: string
  serverName: string
  provider: string
  serverType: 'HOSTING' | 'VPS'
  status: string
  domainCount?: number
}

interface AssignDomainModalProps {
  domain: Domain | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AssignDomainModal({ domain, isOpen, onClose, onSuccess }: AssignDomainModalProps) {
  const { toast } = useToast()
  const [servers, setServers] = useState<ServerOption[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetchingServers, setFetchingServers] = useState(false)

  // Fetch servers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchServers()
      // Pre-select current server if domain is already assigned
      if (domain?.server) {
        setSelectedServerId(domain.server.id)
      } else {
        setSelectedServerId('')
      }
    }
  }, [isOpen, domain])

  const fetchServers = async () => {
    try {
      setFetchingServers(true)
      const response = await fetch('/api/servers', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch servers')
      }

      const data = await response.json()
      if (data.success) {
        // Only show active servers
        const activeServers = data.servers.filter((server: ServerOption) => 
          server.status === 'ACTIVE'
        )
        setServers(activeServers)
      }
    } catch (error) {
      console.error('Error fetching servers:', error)
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive",
      })
    } finally {
      setFetchingServers(false)
    }
  }

  const handleAssign = async () => {
    if (!domain || !selectedServerId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/domains/${domain.id}/assign-server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ serverId: selectedServerId })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        })
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to assign domain')
      }
    } catch (error) {
      console.error('Error assigning domain:', error)
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign domain to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    if (!domain) return

    try {
      setLoading(true)
      const response = await fetch(`/api/domains/${domain.id}/assign-server`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        })
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to unassign domain')
      }
    } catch (error) {
      console.error('Error unassigning domain:', error)
      toast({
        title: "Unassignment Failed",
        description: error instanceof Error ? error.message : "Failed to unassign domain from server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedServer = servers.find(s => s.id === selectedServerId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Domain to Server</DialogTitle>
          <DialogDescription>
            Assign "{domain?.domain}" to a server. Each domain can only be assigned to one server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment */}
          {domain?.server && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Currently assigned to:</div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  {domain.server.serverType === 'VPS' ? (
                    <Server className="w-3 h-3 text-blue-600" />
                  ) : (
                    <Globe className="w-3 h-3 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-900">{domain.server.serverName}</div>
                  <div className="text-xs text-blue-700">{domain.server.provider}</div>
                </div>
              </div>
            </div>
          )}

          {/* Server Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Server:</label>
            {fetchingServers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading servers...</span>
              </div>
            ) : (
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                          {server.serverType === 'VPS' ? (
                            <Server className="w-2 h-2 text-gray-600" />
                          ) : (
                            <Globe className="w-2 h-2 text-gray-600" />
                          )}
                        </div>
                        <span>{server.serverName}</span>
                        <Badge variant="outline" className="text-xs">
                          {server.domainCount || 0} domains
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Server Info */}
          {selectedServer && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-1">Selected server:</div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  {selectedServer.serverType === 'VPS' ? (
                    <Server className="w-3 h-3 text-green-600" />
                  ) : (
                    <Globe className="w-3 h-3 text-green-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-green-900">{selectedServer.serverName}</div>
                  <div className="text-xs text-green-700">
                    {selectedServer.provider} • {selectedServer.domainCount || 0} domains
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <div>
            {domain?.server && (
              <Button
                variant="outline"
                onClick={handleUnassign}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Unassign
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading || !selectedServerId || selectedServerId === domain?.server?.id}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
