import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/domains/[id]/assign-server - Assign domain to server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can assign domains
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { serverId } = body

    // Validate serverId
    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 })
    }

    // Check if domain exists
    const domain = await prisma.domain.findUnique({
      where: { id }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Check if server exists
    const server = await prisma.server.findUnique({
      where: { id: serverId }
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Check if domain is already assigned to this server
    if (domain.serverId === serverId) {
      return NextResponse.json({ 
        error: 'Domain is already assigned to this server' 
      }, { status: 400 })
    }

    // Assign domain to server
    const updatedDomain = await prisma.domain.update({
      where: { id },
      data: { serverId },
      include: {
        server: {
          select: {
            id: true,
            serverName: true,
            provider: true,
            serverType: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Domain "${domain.domain}" assigned to server "${server.serverName}"`,
      domain: updatedDomain
    })

  } catch (error) {
    console.error('❌ Error assigning domain to server:', error)
    return NextResponse.json(
      { error: 'Failed to assign domain to server' },
      { status: 500 }
    )
  }
}

// DELETE /api/domains/[id]/assign-server - Unassign domain from server
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and STAFF can unassign domains
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if domain exists
    const domain = await prisma.domain.findUnique({
      where: { id },
      include: {
        server: {
          select: {
            serverName: true
          }
        }
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Check if domain is assigned to any server
    if (!domain.serverId) {
      return NextResponse.json({ 
        error: 'Domain is not assigned to any server' 
      }, { status: 400 })
    }

    // Unassign domain from server
    const updatedDomain = await prisma.domain.update({
      where: { id },
      data: { serverId: null }
    })

    return NextResponse.json({
      success: true,
      message: `Domain "${domain.domain}" unassigned from server "${domain.server?.serverName}"`,
      domain: updatedDomain
    })

  } catch (error) {
    console.error('❌ Error unassigning domain from server:', error)
    return NextResponse.json(
      { error: 'Failed to unassign domain from server' },
      { status: 500 }
    )
  }
}
