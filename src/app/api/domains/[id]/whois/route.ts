import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get domain with WHOIS cache
    const domain = await prisma.domain.findUnique({
      where: { id },
      include: {
        whoisCache: {
          orderBy: {
            cachedAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!domain) {
      return NextResponse.json({
        success: false,
        error: 'Domain not found'
      }, { status: 404 })
    }

    // Calculate days to expiry
    let daysToExpiry = null
    if (domain.expiryDate) {
      const now = new Date()
      const diffTime = domain.expiryDate.getTime() - now.getTime()
      daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Format the response with all available WHOIS data
    const whoisData = domain.whoisCache[0]?.whoisData || null

    const detailedInfo = {
      // Basic domain info
      domain: domain.domain,
      status: domain.status,
      
      // Dates
      createdDate: domain.createdDate,
      expiryDate: domain.expiryDate,
      updatedDate: domain.updatedDate,
      daysToExpiry,
      
      // Registrar info
      registrar: domain.registrar,
      registrarUrl: whoisData?.registrarUrl || null,
      registrarWhoisServer: whoisData?.registrarWhoisServer || null,
      registrarAbuseContactEmail: whoisData?.registrarAbuseContactEmail || null,
      registrarAbuseContactPhone: whoisData?.registrarAbuseContactPhone || null,
      
      // Domain status
      domainStatus: whoisData?.domainStatus || whoisData?.status || [],
      
      // Name servers
      nameServers: whoisData?.nameServers || whoisData?.nameserver || [],
      
      // Contact information (if available)
      registrant: whoisData?.registrant || null,
      admin: whoisData?.admin || null,
      tech: whoisData?.tech || null,
      billing: whoisData?.billing || null,
      
      // Technical details
      dnssec: whoisData?.dnssec || null,
      
      // Cache info
      lastChecked: domain.lastChecked,
      whoisCachedAt: domain.whoisCache[0]?.cachedAt || null,
      
      // Additional notes
      notes: domain.notes,
      renewalPrice: domain.renewalPrice,
      
      // Raw WHOIS data (for advanced users)
      rawWhoisData: whoisData
    }

    return NextResponse.json({
      success: true,
      data: detailedInfo
    })

  } catch (error: any) {
    console.error('Error fetching WHOIS details:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch WHOIS details'
    }, { status: 500 })
  }
}
