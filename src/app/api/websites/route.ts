import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WebsiteStatus } from '@prisma/client'

// GET /api/websites - List all websites with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all websites with domain information
    const websites = await prisma.website.findMany({
      orderBy: [
        { status: 'asc' },
        { siteName: 'asc' }
      ],
      include: {
        domain: {
          select: {
            id: true,
            domain: true,
            expiryDate: true,
            status: true
          }
        }
      }
    })

    // Calculate statistics
    const stats = {
      total: websites.length,
      active: websites.filter(w => w.status === 'ACTIVE').length,
      inactive: websites.filter(w => w.status === 'INACTIVE').length,
      maintenance: websites.filter(w => w.status === 'MAINTENANCE').length,
      development: websites.filter(w => w.status === 'DEVELOPMENT').length,
      suspended: websites.filter(w => w.status === 'SUSPENDED').length,
      live: websites.filter(w => w.isLive).length,
      offline: websites.filter(w => !w.isLive).length
    }

    return NextResponse.json({
      success: true,
      websites,
      stats
    })

  } catch (error) {
    console.error('❌ Error fetching websites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/websites - Create new website
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can create websites
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.siteName || !body.domainId) {
      return NextResponse.json(
        { error: 'Site name and domain are required' },
        { status: 400 }
      )
    }

    // Validate website status
    if (body.status && !Object.values(WebsiteStatus).includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid website status' },
        { status: 400 }
      )
    }

    // Check if domain exists
    const domain = await prisma.domain.findUnique({
      where: { id: body.domainId }
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Create website
    const website = await prisma.website.create({
      data: {
        siteName: body.siteName.trim(),
        domainId: body.domainId,
        username: body.username?.trim() || null,
        password: body.password?.trim() || null, // TODO: Encrypt in production
        cms: body.cms?.trim() || null,
        description: body.description?.trim() || null,
        notes: body.notes?.trim() || null,
        status: body.status || 'ACTIVE',
        isLive: body.isLive !== undefined ? body.isLive : true
      },
      include: {
        domain: {
          select: {
            id: true,
            domain: true,
            expiryDate: true,
            status: true
          }
        }
      }
    })

    // console.log('✅ Website created successfully:', website.siteName)

    return NextResponse.json({
      success: true,
      message: 'Website created successfully',
      website
    })

  } catch (error) {
    console.error('❌ Error creating website:', error)
    return NextResponse.json(
      { error: 'Failed to create website' },
      { status: 500 }
    )
  }
}

