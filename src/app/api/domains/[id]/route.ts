import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lookupDomain } from '@/lib/rdap'
import { DomainStatus } from '@prisma/client'

// GET /api/domains/[id] - Get domain details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: params.id },
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
    
    return NextResponse.json({
      success: true,
      data: {
        ...domain,
        daysToExpiry
      }
    })
  } catch (error: any) {
    console.error('Error fetching domain:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch domain'
    }, { status: 500 })
  }
}

// PUT /api/domains/[id] - Update domain
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { renewalPrice, notes, refreshWhois } = body
    
    // Check if domain exists
    const existingDomain = await prisma.domain.findUnique({
      where: { id: params.id }
    })
    
    if (!existingDomain) {
      return NextResponse.json({
        success: false,
        error: 'Domain not found'
      }, { status: 404 })
    }
    
    let updateData: any = {
      renewalPrice: renewalPrice ? parseFloat(renewalPrice) : null,
      notes
    }
    
    // If refreshWhois is requested, perform new WHOIS lookup
    if (refreshWhois) {
      console.log(`Refreshing WHOIS data for ${existingDomain.domain}`)
      const whoisResult = await lookupDomain(existingDomain.domain)
      
      if (whoisResult.success && whoisResult.data) {
        updateData = {
          ...updateData,
          registrar: whoisResult.data.registrar,
          createdDate: whoisResult.data.createdDate,
          expiryDate: whoisResult.data.expiryDate,
          daysToExpiry: whoisResult.data.daysToExpiry,
          lastChecked: new Date()
        }
        
        // Update cache
        if (whoisResult.rawData) {
          // Delete old cache entries
          await prisma.whoisCache.deleteMany({
            where: { domain: existingDomain.domain }
          })
          
          // Create new cache entry
          await prisma.whoisCache.create({
            data: {
              domain: existingDomain.domain,
              whoisData: whoisResult.rawData as any
            }
          })
        }
      }
    }
    
    const updatedDomain = await prisma.domain.update({
      where: { id: params.id },
      data: updateData,
      include: {
        whoisCache: {
          orderBy: {
            cachedAt: 'desc'
          },
          take: 1
        }
      }
    })
    
    // Calculate days to expiry
    let daysToExpiry = null
    if (updatedDomain.expiryDate) {
      const now = new Date()
      const diffTime = updatedDomain.expiryDate.getTime() - now.getTime()
      daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedDomain,
        daysToExpiry
      }
    })
  } catch (error: any) {
    console.error('Error updating domain:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update domain'
    }, { status: 500 })
  }
}

// DELETE /api/domains/[id] - Delete domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if domain exists
    const existingDomain = await prisma.domain.findUnique({
      where: { id: params.id }
    })
    
    if (!existingDomain) {
      return NextResponse.json({
        success: false,
        error: 'Domain not found'
      }, { status: 404 })
    }
    
    // Delete domain (cascade will handle whois_cache)
    await prisma.domain.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting domain:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete domain'
    }, { status: 500 })
  }
}
