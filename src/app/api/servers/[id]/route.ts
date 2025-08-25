import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ServerType, ServerStatus } from '@prisma/client'

// GET /api/servers/[id] - Get server details
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

    const server = await prisma.server.findUnique({
      where: { id }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Calculate days to expiry
    let daysToExpiry = null
    if (server.expiryDate) {
      const now = new Date()
      const expiryDate = new Date(server.expiryDate)
      const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
      const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
      daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      success: true,
      server: {
        ...server,
        daysToExpiry,
        monthlyPrice: server.monthlyPrice ? Number(server.monthlyPrice) : null,
        uptimePercent: server.uptimePercent ? Number(server.uptimePercent) : null
      }
    })

  } catch (error) {
    console.error('❌ Error fetching server:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/servers/[id] - Update server
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can update servers
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if server exists
    const existingServer = await prisma.server.findUnique({
      where: { id }
    })

    if (!existingServer) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Validate server type if provided
    if (body.serverType && !Object.values(ServerType).includes(body.serverType)) {
      return NextResponse.json(
        { error: 'Invalid server type' },
        { status: 400 }
      )
    }

    // Validate server status if provided
    if (body.status && !Object.values(ServerStatus).includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid server status' },
        { status: 400 }
      )
    }

    // Calculate days to expiry if expiry date is provided
    let daysToExpiry = existingServer.daysToExpiry
    if (body.expiryDate !== undefined) {
      if (body.expiryDate) {
        const now = new Date()
        const expiryDate = new Date(body.expiryDate)
        const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const expiryStartOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
        const diffTime = expiryStartOfDay.getTime() - nowStartOfDay.getTime()
        daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      } else {
        daysToExpiry = null
      }
    }

    // Update server
    const updatedServer = await prisma.server.update({
      where: { id },
      data: {
        ...(body.serverName !== undefined && { serverName: body.serverName.trim() }),
        ...(body.provider !== undefined && { provider: body.provider.trim() }),
        ...(body.serverType !== undefined && { serverType: body.serverType }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.ipAddress !== undefined && { ipAddress: body.ipAddress?.trim() || null }),
        ...(body.createdDate !== undefined && { createdDate: body.createdDate ? new Date(body.createdDate) : null }),
        ...(body.expiryDate !== undefined && { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null }),
        ...(daysToExpiry !== existingServer.daysToExpiry && { daysToExpiry }),
        ...(body.username !== undefined && { username: body.username?.trim() || null }),
        ...(body.password !== undefined && { password: body.password?.trim() || null }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.isMonitored !== undefined && { isMonitored: body.isMonitored }),
        ...(body.uptimePercent !== undefined && { uptimePercent: body.uptimePercent ? parseFloat(body.uptimePercent) : null }),
        ...(body.lastDowntime !== undefined && { lastDowntime: body.lastDowntime ? new Date(body.lastDowntime) : null }),
        lastChecked: new Date()
      }
    })

    // Handle domain assignments if provided
    if (body.domainIds !== undefined && Array.isArray(body.domainIds)) {
      // First, unassign all domains currently assigned to this server
      await prisma.domain.updateMany({
        where: {
          serverId: id
        },
        data: {
          serverId: null
        }
      })
      
      // Then assign the selected domains to this server
      if (body.domainIds.length > 0) {
        await prisma.domain.updateMany({
          where: {
            id: { in: body.domainIds }
          },
          data: {
            serverId: id
          }
        })
      }
    }



    return NextResponse.json({
      success: true,
      message: 'Server updated successfully',
      server: {
        ...updatedServer,
        monthlyPrice: updatedServer.monthlyPrice ? Number(updatedServer.monthlyPrice) : null,
        uptimePercent: updatedServer.uptimePercent ? Number(updatedServer.uptimePercent) : null
      }
    })

  } catch (error) {
    console.error('❌ Error updating server:', error)
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    )
  }
}

// DELETE /api/servers/[id] - Delete server
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN can delete servers
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can delete servers' }, { status: 403 })
    }

    const { id } = await params

    // Check if server exists
    const existingServer = await prisma.server.findUnique({
      where: { id }
    })

    if (!existingServer) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Delete server
    await prisma.server.delete({
      where: { id }
    })



    return NextResponse.json({
      success: true,
      message: 'Server deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting server:', error)
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    )
  }
}
