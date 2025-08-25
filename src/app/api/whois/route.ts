import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lookupDomain, isCacheValid } from '@/lib/rdap'

// POST /api/whois - Single domain WHOIS lookup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, forceRefresh = false } = body
    
    if (!domain) {
      return NextResponse.json({
        success: false,
        error: 'Domain is required'
      }, { status: 400 })
    }
    
    const domainLower = domain.toLowerCase()
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cached = await prisma.whoisCache.findFirst({
        where: { domain: domainLower },
        orderBy: { cachedAt: 'desc' }
      })
      
      if (cached && isCacheValid(cached.cachedAt)) {
        return NextResponse.json({
          success: true,
          data: cached.whoisData,
          source: 'cache',
          cachedAt: cached.cachedAt
        })
      }
    }
    
    // Perform fresh WHOIS lookup
    // console.log(`Performing WHOIS lookup for ${domain}`)
    const whoisResult = await lookupDomain(domain)
    
    if (!whoisResult.success) {
      return NextResponse.json({
        success: false,
        error: whoisResult.error,
        provider: whoisResult.provider
      }, { status: 400 })
    }
    
    // Cache the result
    if (whoisResult.rawData) {
      // Delete old cache entries for this domain
      await prisma.whoisCache.deleteMany({
        where: { domain: domainLower }
      })
      
      // Create new cache entry
      await prisma.whoisCache.create({
        data: {
          domain: domainLower,
          whoisData: whoisResult.rawData as any
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: whoisResult.rawData,
      processedData: whoisResult.data,
      source: 'fresh',
      provider: whoisResult.provider
    })
  } catch (error: any) {
    console.error('Error in WHOIS lookup:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform WHOIS lookup'
    }, { status: 500 })
  }
}
