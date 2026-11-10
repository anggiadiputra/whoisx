import React, { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { WhoisDetailModal } from '@/components/whois-detail-modal'
import { formatIndonesianDate } from '@/lib/utils'
import { Eye, Edit, Link } from 'lucide-react'

interface Domain {
  id: string
  domain: string
  registrar: string | null
  createdDate: Date | null
  expiryDate: Date | null
  status: string
  daysToExpiry: number | null
  lastChecked: Date | null
  renewalPrice: number | null
  notes: string | null
  server?: {
    id: string
    serverName: string
    provider: string
  } | null
}

interface DomainTableRowProps {
  domain: Domain
  canManageDomains: boolean
  onEditDomain: (domain: Domain) => void
  getExpiryStatus: (daysToExpiry: number | null) => {
    status: string
    color: string
    text: string
  }
}

const DomainTableRow = memo(({ 
  domain, 
  canManageDomains, 
  onEditDomain, 
  getExpiryStatus 
}: DomainTableRowProps) => {
  const expiryStatus = getExpiryStatus(domain.daysToExpiry)
  
  return (
    <TableRow key={domain.id} className="hover:bg-cream">
      <TableCell className="font-medium">{domain.domain}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${expiryStatus.color} text-white`}>
          {expiryStatus.text}
        </Badge>
      </TableCell>
      <TableCell>{domain.registrar || 'Tidak diketahui'}</TableCell>
      <TableCell>
        {domain.server ? (
          <div className="flex items-center space-x-2">
            <Link className="w-4 h-4 text-violet" />
            <span className="text-sm">
              {domain.server.serverName} ({domain.server.provider})
            </span>
          </div>
        ) : (
          <span className="text-muted text-sm">Belum dipasang</span>
        )}
      </TableCell>
      <TableCell>
        {domain.expiryDate ? formatIndonesianDate(domain.expiryDate) : '–'}
      </TableCell>
      <TableCell>
        {domain.daysToExpiry !== null ? `${domain.daysToExpiry} hari` : '–'}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <WhoisDetailModal domainId={domain.id} domainName={domain.domain}>
            <Button variant="ghost" size="sm" className="text-violet hover:text-violet-dark hover:bg-lilac">
              <Eye className="w-4 h-4" />
            </Button>
          </WhoisDetailModal>
          {canManageDomains && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-violet hover:text-violet-dark hover:bg-lilac"
              onClick={() => onEditDomain(domain)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

DomainTableRow.displayName = 'DomainTableRow'

export { DomainTableRow }
