'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  Globe, 
  RefreshCw
} from 'lucide-react'
import { formatIndonesianDate } from '@/lib/utils'
import { sendWhoisUpdateNotification } from '@/lib/whatsapp-notifications'

interface WhoisDetailModalProps {
  domainId: string
  domainName: string
  children: React.ReactNode
}

interface WhoisDetail {
  domain: string
  status: string
  createdDate?: string
  expiryDate?: string
  updatedDate?: string
  daysToExpiry?: number
  registrar?: string
  registrarUrl?: string
  registrarWhoisServer?: string
  registrarAbuseContactEmail?: string
  registrarAbuseContactPhone?: string
  domainStatus?: string[]
  nameServers?: string[]
  registrant?: any
  admin?: any
  tech?: any
  billing?: any
  dnssec?: string
  lastChecked: string
  whoisCachedAt?: string
  notes?: string
  renewalPrice?: number
  rawWhoisData?: any
}

export function WhoisDetailModal({ domainId, domainName, children }: WhoisDetailModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [whoisData, setWhoisData] = useState<WhoisDetail | null>(null)
  const { toast } = useToast()

  const fetchWhoisDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/domains/${domainId}/whois`)
      const result = await response.json()

      if (response.ok && result.success) {
        setWhoisData(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to fetch WHOIS details',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching WHOIS details:', error)
      toast({
        title: "Network Error",
        description: 'Unable to fetch WHOIS details',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateWhoisData = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/domains/${domainId}/update-whois`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "WHOIS Updated",
          description: `WHOIS data for ${domainName} has been updated successfully`,
          variant: "default",
        })
        
        // Refresh the WHOIS data in modal
        await fetchWhoisDetails()
        
        // Trigger a refresh of the parent component if needed
        // This can be done via props callback or custom event
        window.dispatchEvent(new CustomEvent('domainUpdated', { detail: { domainId } }))
        
        // Send WhatsApp notification for WHOIS update
        try {
          await sendWhoisUpdateNotification(domainName)
        } catch (error) {
          // WhatsApp notification failed silently
          // Don't show error to user as this is optional feature
        }
        
      } else {
        toast({
          title: "Update Failed",
          description: result.error || 'Failed to update WHOIS data',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating WHOIS data:', error)
      toast({
        title: "Network Error",
        description: 'Unable to update WHOIS data',
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && !whoisData) {
      fetchWhoisDetails()
    }
  }



  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-gray-900">
              Domain Information
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : whoisData ? (
            <div className="space-y-6">
              {/* Domain Information */}
              <div className="space-y-4">
                {/* Domain ID */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Domain ID:</span>
                  <span className="text-sm text-gray-900 text-right font-mono">
                    {whoisData.rawWhoisData?.handle || 
                     whoisData.rawWhoisData?.domainId || 
                     whoisData.rawWhoisData?.['Domain ID'] || 
                     'N/A'}
                  </span>
                </div>
                
                {/* Domain Name */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Domain Name:</span>
                  <span className="text-sm text-gray-900 text-right font-medium">{whoisData.domain}</span>
                </div>
                
                {/* Created On */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Created On:</span>
                  <span className="text-sm text-gray-900 text-right">
                    {(() => {
                      // Try to get from multiple sources
                      let createdDate = whoisData.createdDate
                      
                      // If not available, try to get from RDAP events
                      if (!createdDate && whoisData.rawWhoisData?.events) {
                        const registrationEvent = whoisData.rawWhoisData.events.find(
                          (event: any) => event.eventAction === 'registration'
                        )
                        if (registrationEvent?.eventDate) {
                          createdDate = registrationEvent.eventDate
                        }
                      }
                      
                      return formatIndonesianDate(createdDate)
                    })()}
                  </span>
                </div>
                
                {/* Last Update On */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Last Update On:</span>
                  <span className="text-sm text-gray-900 text-right">
                    {(() => {
                      // Try to get from multiple sources
                      let updatedDate = whoisData.updatedDate
                      
                      // If not available, try to get from RDAP events
                      if (!updatedDate && whoisData.rawWhoisData?.events) {
                        const updateEvent = whoisData.rawWhoisData.events.find(
                          (event: any) => event.eventAction === 'last changed' || event.eventAction === 'last updated'
                        )
                        if (updateEvent?.eventDate) {
                          updatedDate = updateEvent.eventDate
                        }
                      }
                      
                      return formatIndonesianDate(updatedDate)
                    })()}
                  </span>
                </div>
                
                {/* Expiration Date */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Expiration Date:</span>
                  <span className="text-sm text-gray-900 text-right font-medium">
                    {(() => {
                      // Try to get from multiple sources
                      let expiryDate = whoisData.expiryDate
                      
                      // If not available, try to get from RDAP events
                      if (!expiryDate && whoisData.rawWhoisData?.events) {
                        const expirationEvent = whoisData.rawWhoisData.events.find(
                          (event: any) => event.eventAction === 'expiration'
                        )
                        if (expirationEvent?.eventDate) {
                          expiryDate = expirationEvent.eventDate
                        }
                      }
                      
                      return formatIndonesianDate(expiryDate)
                    })()}
                  </span>
                </div>
                
                {/* Status */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Status:</span>
                  <span className="text-sm text-gray-900 text-right">
                    {(() => {
                      // Try to get from multiple sources
                      let status = whoisData.domainStatus && whoisData.domainStatus.length > 0 
                        ? whoisData.domainStatus[0] 
                        : whoisData.status
                      
                      // If not available, try to get from RDAP status
                      if (!status && whoisData.rawWhoisData?.status) {
                        status = whoisData.rawWhoisData.status[0] || whoisData.rawWhoisData.status
                      }
                      
                      return status || 'N/A'
                    })()}
                  </span>
                </div>
                
                {/* Name Servers */}
                {(() => {
                  // Get nameservers from various possible locations in the data
                  let nameServers = whoisData.nameServers || []
                  
                  // If no nameservers in processed data, try to get from raw data
                  if (nameServers.length === 0 && whoisData.rawWhoisData?.nameservers) {
                    nameServers = whoisData.rawWhoisData.nameservers.map((ns: any) => 
                      ns.ldhName || ns.name || ns.toString()
                    )
                  }
                  
                  if (nameServers.length > 0) {
                    return nameServers.slice(0, 4).map((ns: string, index: number) => (
                      <div key={index} className="flex justify-between items-start py-2">
                        <span className="text-sm font-medium text-gray-900 min-w-[140px]">Nameserver {index + 1}:</span>
                        <span className="text-sm text-gray-900 text-right font-mono">{ns}</span>
                      </div>
                    ))
                  } else {
                    return (
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm font-medium text-gray-900 min-w-[140px]">Nameservers:</span>
                        <span className="text-sm text-gray-500 text-right">No nameservers found</span>
                      </div>
                    )
                  }
                })()}
                
                {/* Registrar Name */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Registrar Name:</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-900 font-medium">
                      {(() => {
                        // PRIORITIZE RDAP data over database registrar ID
                        let registrar = null
                        
                        // First try to get from RDAP entities (this contains the actual name)
                        if (whoisData.rawWhoisData?.entities) {
                          const registrarEntity = whoisData.rawWhoisData.entities.find(
                            (entity: any) => entity.roles && entity.roles.includes('registrar')
                          )
                          if (registrarEntity?.vcardArray) {
                            // Extract name from vCard
                            const fnField = registrarEntity.vcardArray[1]?.find(
                              (field: any) => field[0] === 'fn'
                            )
                            if (fnField && fnField[3]) {
                              registrar = fnField[3]
                            }
                          }
                        }
                        
                        // Only use database registrar if RDAP doesn't have a name and it's not a number
                        if (!registrar && whoisData.registrar) {
                          // Check if registrar is a number (ID) or actual name
                          const registrarValue = whoisData.registrar.toString()
                          if (!/^\d+$/.test(registrarValue)) {
                            registrar = registrarValue
                          }
                        }
                        
                        return registrar || 'Unknown'
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">From WHOIS data</div>
                  </div>
                </div>
                
                {/* DNSSEC */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">DNSSEC:</span>
                  <span className="text-sm text-gray-900 text-right">
                    {(() => {
                      // Try to get DNSSEC from multiple sources
                      let dnssec = whoisData.dnssec || whoisData.rawWhoisData?.dnssec || whoisData.rawWhoisData?.['DNSSEC']
                      
                      // Check secureDNS object in RDAP
                      if (!dnssec && whoisData.rawWhoisData?.secureDNS) {
                        dnssec = whoisData.rawWhoisData.secureDNS.delegationSigned ? 'Signed' : 'Unsigned'
                      }
                      
                      return dnssec || 'Unsigned'
                    })()}
                  </span>
                </div>
                
                {/* Renewal Price */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Renewal Price:</span>
                  <span className="text-sm text-gray-900 text-right font-medium">
                    {whoisData.renewalPrice 
                      ? `Rp ${parseInt(whoisData.renewalPrice.toString()).toLocaleString('id-ID')}`
                      : 'N/A'
                    }
                  </span>
                </div>

                {/* Hosting/VPS Info */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-gray-900 min-w-[140px]">Hosting/VPS Info:</span>
                  <span className="text-sm text-blue-600 text-right">N/A</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No WHOIS Data Available</h3>
                <p className="text-gray-500 text-sm mb-4">
                  This domain may not be registered or WHOIS data is not accessible.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Possible reasons:</strong>
                  </p>
                  <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                    <li>Domain is not registered</li>
                    <li>Domain has privacy protection enabled</li>
                    <li>WHOIS lookup failed during domain addition</li>
                    <li>Domain uses a registry that doesn't provide RDAP data</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={fetchWhoisDetails}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry WHOIS Lookup
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const url = `https://whois.net/whois/${domainName}`
                    window.open(url, '_blank')
                  }}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Check External WHOIS
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            onClick={updateWhoisData}
            disabled={updating || loading}
            className="text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update WHOIS
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            onClick={async () => {
              if (confirm(`Are you sure you want to delete ${domainName}? This action cannot be undone.`)) {
                try {
                  const response = await fetch(`/api/domains/${domainId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  })

                  if (response.ok) {
                    toast({
                      title: "Domain Deleted",
                      description: `${domainName} has been deleted successfully`,
                      variant: "default",
                    })
                    
                    // Close modal and refresh parent
                    setOpen(false)
                    window.dispatchEvent(new CustomEvent('domainDeleted', { detail: { domainId } }))
                  } else {
                    const result = await response.json()
                    throw new Error(result.error || 'Failed to delete domain')
                  }
                } catch (error: any) {
                  toast({
                    title: "Delete Failed",
                    description: error.message || 'Failed to delete domain',
                    variant: "destructive",
                  })
                }
              }
            }}
          >
            Delete Domain
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
