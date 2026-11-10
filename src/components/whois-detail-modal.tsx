'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useConfirm } from '@/components/confirm-dialog'
import { 
  Globe,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { formatIndonesianDate } from '@/lib/utils'
import { sendWhoisUpdateNotification } from '@/lib/whatsapp-notifications'

interface WhoisDetailModalProps {
  domainId: string
  domainName: string
  // Trigger element; omit it and pass open/onOpenChange to control the modal from outside (e.g. a menu)
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
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

export function WhoisDetailModal({ domainId, domainName, children, open: controlledOpen, onOpenChange }: WhoisDetailModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [whoisData, setWhoisData] = useState<WhoisDetail | null>(null)
  const { toast } = useToast()
  const confirm = useConfirm()

  const fetchWhoisDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/domains/${domainId}/whois`)
      const result = await response.json()

      if (response.ok && result.success) {
        setWhoisData(result.data)
      } else {
        toast({
          title: "Gagal",
          description: result.error || 'Detail WHOIS gagal diambil',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching WHOIS details:', error)
      toast({
        title: "Koneksi bermasalah",
        description: 'Nggak bisa mengambil detail WHOIS',
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
          title: "WHOIS diperbarui",
          description: `Data WHOIS ${domainName} berhasil diperbarui`,
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
          title: "Gagal memperbarui",
          description: result.error || 'Data WHOIS gagal diperbarui',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating WHOIS data:', error)
      toast({
        title: "Koneksi bermasalah",
        description: 'Nggak bisa memperbarui data WHOIS',
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
    if (newOpen && !whoisData) {
      fetchWhoisDetails()
    }
  }

  // Opened from outside: load details on first open
  useEffect(() => {
    if (controlledOpen && !whoisData) {
      fetchWhoisDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledOpen])



  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-ink">
              Informasi domain
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
                  <span className="text-sm font-medium text-ink min-w-[140px]">ID domain:</span>
                  <span className="text-sm text-ink text-right font-mono">
                    {whoisData.rawWhoisData?.handle || 
                     whoisData.rawWhoisData?.domainId || 
                     whoisData.rawWhoisData?.['Domain ID'] || 
                     '–'}
                  </span>
                </div>
                
                {/* Domain Name */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-ink min-w-[140px]">Nama domain:</span>
                  <span className="text-sm text-ink text-right font-medium">{whoisData.domain}</span>
                </div>
                
                {/* Created On */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-ink min-w-[140px]">Dibuat:</span>
                  <span className="text-sm text-ink text-right">
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
                  <span className="text-sm font-medium text-ink min-w-[140px]">Terakhir diperbarui:</span>
                  <span className="text-sm text-ink text-right">
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
                  <span className="text-sm font-medium text-ink min-w-[140px]">Tanggal kedaluwarsa:</span>
                  <span className="text-sm text-ink text-right font-medium">
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
                  <span className="text-sm font-medium text-ink min-w-[140px]">Status:</span>
                  <span className="text-sm text-ink text-right">
                    {(() => {
                      // Try to get from multiple sources
                      let status = whoisData.domainStatus && whoisData.domainStatus.length > 0 
                        ? whoisData.domainStatus[0] 
                        : whoisData.status
                      
                      // If not available, try to get from RDAP status
                      if (!status && whoisData.rawWhoisData?.status) {
                        status = whoisData.rawWhoisData.status[0] || whoisData.rawWhoisData.status
                      }
                      
                      return status || '–'
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
                        <span className="text-sm font-medium text-ink min-w-[140px]">Nameserver {index + 1}:</span>
                        <span className="text-sm text-ink text-right font-mono">{ns}</span>
                      </div>
                    ))
                  } else {
                    return (
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm font-medium text-ink min-w-[140px]">Nameservers:</span>
                        <span className="text-sm text-muted text-right">Nameserver tidak ditemukan</span>
                      </div>
                    )
                  }
                })()}
                
                {/* Registrar Name */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-ink min-w-[140px]">Nama registrar:</span>
                  <div className="text-right">
                    <div className="text-sm text-ink font-medium">
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
                        
                        return registrar || 'Tidak diketahui'
                      })()}
                    </div>
                    <div className="text-xs text-muted">Dari data WHOIS</div>
                  </div>
                </div>
                
                {/* DNSSEC */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-ink min-w-[140px]">DNSSEC:</span>
                  <span className="text-sm text-ink text-right">
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
                  <span className="text-sm font-medium text-ink min-w-[140px]">Harga perpanjangan:</span>
                  <span className="text-sm text-ink text-right font-medium">
                    {whoisData.renewalPrice 
                      ? `Rp ${parseInt(whoisData.renewalPrice.toString()).toLocaleString('id-ID')}`
                      : '–'
                    }
                  </span>
                </div>

                {/* Hosting/VPS Info */}
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-ink min-w-[140px]">Info hosting/VPS:</span>
                  <span className="text-sm text-violet text-right">–</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <Globe className="w-12 h-12 text-muted mx-auto mb-3" />
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ink mb-2">Data WHOIS belum tersedia</h3>
                <p className="text-muted text-sm mb-4">
                  Domain ini mungkin belum terdaftar, atau data WHOIS-nya nggak bisa diakses.
                </p>
                <div className="bg-butter border border-butter rounded-2xl p-3 mb-4">
                  <p className="text-st-wait text-sm">
                    <strong>Kemungkinan penyebabnya:</strong>
                  </p>
                  <ul className="text-st-wait text-sm mt-1 list-disc list-inside">
                    <li>Domain belum terdaftar</li>
                    <li>Perlindungan privasi domain sedang aktif</li>
                    <li>Pengecekan WHOIS gagal waktu domain ditambahkan</li>
                    <li>Registry domain ini nggak menyediakan data RDAP</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={fetchWhoisDetails}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Cek WHOIS lagi
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const url = `https://whois.net/whois/${domainName}`
                    window.open(url, '_blank')
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Cek WHOIS eksternal
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 border-t bg-cream flex justify-between">
          <Button
            variant="outline"
            onClick={updateWhoisData}
            disabled={updating || loading}
            className="text-st-no border-rose hover:bg-rose disabled:opacity-50"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Memperbarui…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Perbarui WHOIS
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Hapus domain?',
                description: `"${domainName}" dan semua website yang terhubung akan dihapus permanen. Tindakan ini nggak bisa dibatalkan.`,
              })
              if (confirmed) {
                try {
                  const response = await fetch(`/api/domains/${domainId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  })

                  if (response.ok) {
                    toast({
                      title: "Domain dihapus",
                      description: `${domainName} berhasil dihapus`,
                      variant: "default",
                    })
                    
                    // Close modal and refresh parent
                    handleOpenChange(false)
                    window.dispatchEvent(new CustomEvent('domainDeleted', { detail: { domainId } }))
                  } else {
                    const result = await response.json()
                    throw new Error(result.error || 'Domain gagal dihapus')
                  }
                } catch (error: any) {
                  toast({
                    title: "Gagal menghapus",
                    description: error.message || 'Domain gagal dihapus',
                    variant: "destructive",
                  })
                }
              }
            }}
          >
            Hapus domain
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => handleOpenChange(false)}
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
