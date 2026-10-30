import { getServerSession, Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import authOptions from '@/lib/auth'

// Roles allowed to modify domains, servers and websites (FINANCE is read-only)
const MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF]

export function canManage(role?: UserRole | null): boolean {
  return !!role && MANAGER_ROLES.includes(role)
}

/**
 * Resolve the session for a write endpoint.
 * Returns either the session or a ready-to-return 401/403 response.
 */
export async function requireManager(): Promise<
  { session: Session; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!canManage(session.user.role)) {
    return { error: NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 }) }
  }

  return { session }
}

/**
 * Strip stored credentials from a server/website record unless the viewer may manage it
 */
export function withoutPassword<T extends { password?: string | null }>(
  record: T,
  role?: UserRole | null
): T | Omit<T, 'password'> {
  if (canManage(role)) {
    return record
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = record
  return rest
}

// API responses contain per-user, authenticated data and must never be stored by shared caches
export const PRIVATE_CACHE_CONTROL = 'private, no-store'
