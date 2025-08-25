import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { lookupDomain } from '@/lib/rdap'
import { DomainStatus } from '@prisma/client'
import { ActivityLogger } from '@/lib/activity-logger'
import authOptions from '@/lib/auth'

// GET /api/domains - List all domains with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const expiring = searchParams.get('expiring')
    const registrar = searchParams.get('registrar')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const availableForWebsite = searchParams.get('availableForWebsite')
    const sortBy = searchParams.get('sortBy') || 'expiryDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // Build where clause
    const where: any = {}
    
    if (expiring) {
      const days = parseInt(expiring)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      
      where.expiryDate = {
        lte: futureDate,
        gte: new Date()
      }
    }
    
    if (registrar) {
      where.registrar = {
        contains: registrar,
        mode: 'insensitive'
      }
    }
    
    if (status) {
      where.status = status as DomainStatus
    }
    
    if (search) {
      where.OR = [
        {
          domain: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Filter domains that are not assigned to any website
    if (availableForWebsite === 'true') {
      where.websites = {
        none: {}
      }
    }
    
    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'daysToExpiry') {
      orderBy.expiryDate = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }
    
    const domains = await prisma.domain.findMany({
      where,
      orderBy,
      include: {
        whoisCache: {
          orderBy: {
            cachedAt: 'desc'
          },
          take: 1
        },
        server: {
          select: {
            id: true,
            serverName: true,
            provider: true,
            serverType: true,
            status: true
          }
        }
      }
    })
    
    // Calculate days to expiry for each domain and extract real registrar name
    const domainsWithCalculatedExpiry = domains.map(domain => {
      let daysToExpiry = null
      if (domain.expiryDate) {
        const now = new Date()
        const expiryDate = new Date(domain.expiryDate)
        
        // Set both dates to start of day for accurate day comparison
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        
        const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
        daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
      
      // Extract real registrar name from WHOIS cache
      let realRegistrarName = domain.registrar
      if (domain.whoisCache && domain.whoisCache.length > 0) {
        const whoisData = domain.whoisCache[0].whoisData
        if (whoisData?.entities) {
          const registrarEntity = whoisData.entities.find((entity: any) => 
            entity.roles && entity.roles.includes('registrar')
          )
          if (registrarEntity?.vcardArray) {
            const fnField = registrarEntity.vcardArray[1]?.find((field: any) => field[0] === 'fn')
            if (fnField && fnField[3]) {
              realRegistrarName = fnField[3]
            }
          }
        }
      }
      
      return {
        ...domain,
        daysToExpiry,
        realRegistrarName
      }
    })
    
    // Calculate statistics
    const stats = {
      total: domainsWithCalculatedExpiry.length,
      expired: domainsWithCalculatedExpiry.filter(d => d.daysToExpiry !== null && d.daysToExpiry < 0).length,
      expiring30: domainsWithCalculatedExpiry.filter(d => d.daysToExpiry !== null && d.daysToExpiry >= 0 && d.daysToExpiry <= 30).length,
      expiring7: domainsWithCalculatedExpiry.filter(d => d.daysToExpiry !== null && d.daysToExpiry >= 0 && d.daysToExpiry <= 7).length,
      expiring1: domainsWithCalculatedExpiry.filter(d => d.daysToExpiry !== null && d.daysToExpiry >= 0 && d.daysToExpiry <= 1).length,
    }

    return NextResponse.json({
      success: true,
      domains: domainsWithCalculatedExpiry,
      stats
    })
  } catch (error: any) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch domains'
    }, { status: 500 })
  }
}

// POST /api/domains - Add new domain with WHOIS lookup
export async function POST(request: NextRequest) {
  try {
    // Get session for activity logging
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { domain, renewalPrice, notes } = body
    
    if (!domain) {
      return NextResponse.json({
        success: false,
        error: 'Domain is required'
      }, { status: 400 })
    }
    
    // Check if domain already exists
    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domain.toLowerCase() }
    })
    
    if (existingDomain) {
      return NextResponse.json({
        success: false,
        error: 'Domain already exists'
      }, { status: 409 })
    }
    
    // Perform WHOIS lookup
    const whoisResult = await lookupDomain(domain)
    
    if (!whoisResult.success) {
      // Still create domain record even if WHOIS fails
      const newDomain = await prisma.domain.create({
        data: {
          domain: domain.toLowerCase(),
          renewalPrice: renewalPrice ? parseFloat(renewalPrice) : null,
          notes,
          status: DomainStatus.ACTIVE,
          lastChecked: new Date()
        }
      })
      
      return NextResponse.json({
        success: true,
        data: newDomain,
        whoisError: whoisResult.error
      })
    }
    
    // Create domain record with WHOIS data
    const domainData = {
      domain: domain.toLowerCase(),
      renewalPrice: renewalPrice ? parseFloat(renewalPrice) : null,
      notes,
      registrar: whoisResult.data?.registrar,
      createdDate: whoisResult.data?.createdDate,
      expiryDate: whoisResult.data?.expiryDate,
      updatedDate: whoisResult.data?.updatedDate,
      status: DomainStatus.ACTIVE,
      daysToExpiry: whoisResult.data?.daysToExpiry,
      lastChecked: new Date(),
      
      // WHOIS fields (excluding only the 3 contact fields as requested)
      nameServers: whoisResult.data?.nameservers ? JSON.stringify(whoisResult.data.nameservers) : null,
      domainStatus: whoisResult.data?.domainStatus,
      dnssecStatus: whoisResult.data?.dnssecStatus,
      registrarWhoisServer: whoisResult.data?.registrarWhoisServer
    }
    
    const newDomain = await prisma.domain.create({
      data: domainData
    })
    
    // Cache the WHOIS data
    if (whoisResult.rawData) {
      await prisma.whoisCache.create({
        data: {
          domain: domain.toLowerCase(),
          whoisData: whoisResult.rawData as any
        }
      })
    }
    
    // Log activity
    await ActivityLogger.domainAdded(session.user.id, domain, newDomain.id)
    
    return NextResponse.json({
      success: true,
      data: newDomain,
      whoisProvider: whoisResult.provider
    })
  } catch (error: any) {
    console.error('Error creating domain:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create domain'
    }, { status: 500 })
  }
}
