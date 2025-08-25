import { prisma } from '@/lib/prisma'
import { ActivityType } from '@prisma/client'

interface LogActivityParams {
  type: ActivityType
  description: string
  userId?: string
  entityType?: string
  entityId?: string
  metadata?: any
}

export async function logActivity({
  type,
  description,
  userId,
  entityType,
  entityId,
  metadata
}: LogActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        type,
        description,
        userId,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })
    
    // Activity logged successfully
    return activity
  } catch (error) {
    console.error('Failed to log activity:', error)
    return null
  }
}

// Specific helper functions
export const ActivityLogger = {
  userLogin: (userId: string, userEmail: string) => 
    logActivity({
      type: 'USER_LOGIN',
      description: `User ${userEmail} logged in`,
      userId,
      entityType: 'user',
      entityId: userId
    }),

  userLogout: (userId: string, userEmail: string) => 
    logActivity({
      type: 'USER_LOGOUT', 
      description: `User ${userEmail} logged out`,
      userId,
      entityType: 'user',
      entityId: userId
    }),

  domainAdded: (userId: string, domainName: string, domainId: string) =>
    logActivity({
      type: 'DOMAIN_ADDED',
      description: `Domain ${domainName} was added`,
      userId,
      entityType: 'domain',
      entityId: domainId
    }),

  domainUpdated: (userId: string, domainName: string, domainId: string) =>
    logActivity({
      type: 'DOMAIN_UPDATED',
      description: `Domain ${domainName} was updated`,
      userId,
      entityType: 'domain', 
      entityId: domainId
    }),

  domainDeleted: (userId: string, domainName: string) =>
    logActivity({
      type: 'DOMAIN_DELETED',
      description: `Domain ${domainName} was deleted`,
      userId,
      entityType: 'domain'
    }),

  serverAdded: (userId: string, serverName: string, serverId: string) =>
    logActivity({
      type: 'SERVER_ADDED',
      description: `Server ${serverName} was added`,
      userId,
      entityType: 'server',
      entityId: serverId
    }),

  serverUpdated: (userId: string, serverName: string, serverId: string) =>
    logActivity({
      type: 'SERVER_UPDATED',
      description: `Server ${serverName} was updated`,
      userId,
      entityType: 'server',
      entityId: serverId
    }),

  serverDeleted: (userId: string, serverName: string) =>
    logActivity({
      type: 'SERVER_DELETED',
      description: `Server ${serverName} was deleted`,
      userId,
      entityType: 'server'
    }),

  websiteAdded: (userId: string, siteName: string, websiteId: string) =>
    logActivity({
      type: 'WEBSITE_ADDED',
      description: `Website ${siteName} was added`,
      userId,
      entityType: 'website',
      entityId: websiteId
    }),

  websiteUpdated: (userId: string, siteName: string, websiteId: string) =>
    logActivity({
      type: 'WEBSITE_UPDATED',
      description: `Website ${siteName} was updated`,
      userId,
      entityType: 'website',
      entityId: websiteId
    }),

  websiteDeleted: (userId: string, siteName: string) =>
    logActivity({
      type: 'WEBSITE_DELETED',
      description: `Website ${siteName} was deleted`,
      userId,
      entityType: 'website'
    }),

  userCreated: (adminId: string, newUserEmail: string, newUserId: string) =>
    logActivity({
      type: 'USER_CREATED',
      description: `User ${newUserEmail} was created`,
      userId: adminId,
      entityType: 'user',
      entityId: newUserId
    }),

  userUpdated: (adminId: string, targetUserEmail: string, targetUserId: string) =>
    logActivity({
      type: 'USER_UPDATED',
      description: `User ${targetUserEmail} was updated`,
      userId: adminId,
      entityType: 'user',
      entityId: targetUserId
    }),

  userDeleted: (adminId: string, deletedUserEmail: string) =>
    logActivity({
      type: 'USER_DELETED',
      description: `User ${deletedUserEmail} was deleted`,
      userId: adminId,
      entityType: 'user'
    })
}
