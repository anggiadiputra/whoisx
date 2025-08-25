import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lookupDomain } from '@/lib/rdap'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get domain from database
    const domain = await prisma.domain.findUnique({
      where: { id }
    })

    if (!domain) {
      return NextResponse.json({
        success: false,
        error: 'Domain not found'
      }, { status: 404 })
    }

    console.log(`🔄 Updating WHOIS for ${domain.domain}`)

    // Perform fresh WHOIS lookup
    const whoisResult = await lookupDomain(domain.domain)

    if (!whoisResult.success) {
      console.log(`❌ WHOIS update failed for ${domain.domain}: ${whoisResult.error}`)
      return NextResponse.json({
        success: false,
        error: whoisResult.error || 'Failed to fetch WHOIS data'
      }, { status: 500 })
    }

    // Update domain record with new WHOIS data
    const updatedDomain = await prisma.domain.update({
      where: { id },
      data: {
        registrar: whoisResult.data?.registrar,
        createdDate: whoisResult.data?.createdDate,
        expiryDate: whoisResult.data?.expiryDate,
        updatedDate: whoisResult.data?.updatedDate,
        daysToExpiry: whoisResult.data?.daysToExpiry,
        lastChecked: new Date(),
        
        // WHOIS fields (excluding only the 3 contact fields as requested)
        nameServers: whoisResult.data?.nameservers ? JSON.stringify(whoisResult.data.nameservers) : null,
        domainStatus: whoisResult.data?.domainStatus,
        dnssecStatus: whoisResult.data?.dnssecStatus,
        registrarWhoisServer: whoisResult.data?.registrarWhoisServer,
        
        updatedAt: new Date()
      }
    })

    // Update WHOIS cache with new data
    if (whoisResult.rawData) {
      // Delete old cache entries for this domain
      await prisma.whoisCache.deleteMany({
        where: { domain: domain.domain }
      })

      // Create new cache entry
      await prisma.whoisCache.create({
        data: {
          domain: domain.domain,
          whoisData: whoisResult.rawData as any
        }
      })
    }

    console.log(`✅ WHOIS updated successfully for ${domain.domain}`)

    return NextResponse.json({
      success: true,
      data: updatedDomain,
      message: 'WHOIS data updated successfully',
      provider: whoisResult.provider
    })

  } catch (error: any) {
    console.error('Error updating WHOIS:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update WHOIS data'
    }, { status: 500 })
  }
}
