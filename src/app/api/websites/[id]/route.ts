import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WebsiteStatus } from '@prisma/client'

// GET /api/websites/[id] - Get website by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const website = await prisma.website.findUnique({
      where: { id },
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

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      website
    })

  } catch (error) {
    console.error('❌ Error fetching website:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/websites/[id] - Update website
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can update websites
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if website exists
    const existingWebsite = await prisma.website.findUnique({
      where: { id }
    })

    if (!existingWebsite) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Validate website status if provided
    if (body.status && !Object.values(WebsiteStatus).includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid website status' },
        { status: 400 }
      )
    }

    // If domainId is being changed, validate the new domain exists
    if (body.domainId && body.domainId !== existingWebsite.domainId) {
      const domain = await prisma.domain.findUnique({
        where: { id: body.domainId }
      })

      if (!domain) {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        )
      }
    }

    // Update website
    const updatedWebsite = await prisma.website.update({
      where: { id },
      data: {
        siteName: body.siteName?.trim() || existingWebsite.siteName,
        domainId: body.domainId || existingWebsite.domainId,
        username: body.username?.trim() || existingWebsite.username,
        password: body.password?.trim() || existingWebsite.password,
        cms: body.cms?.trim() || existingWebsite.cms,
        description: body.description?.trim() || existingWebsite.description,
        notes: body.notes?.trim() || existingWebsite.notes,
        status: body.status || existingWebsite.status,
        isLive: body.isLive !== undefined ? body.isLive : existingWebsite.isLive
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

    console.log('✅ Website updated successfully:', updatedWebsite.siteName)

    return NextResponse.json({
      success: true,
      message: 'Website updated successfully',
      website: updatedWebsite
    })

  } catch (error) {
    console.error('❌ Error updating website:', error)
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    )
  }
}

// DELETE /api/websites/[id] - Delete website
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN can delete websites
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if website exists
    const website = await prisma.website.findUnique({
      where: { id }
    })

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Delete website
    await prisma.website.delete({
      where: { id }
    })

    console.log('✅ Website deleted successfully:', website.siteName)

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting website:', error)
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    )
  }
}

