import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { getCloudflareContext } from '@opennextjs/cloudflare'

declare global {
  var prisma: PrismaClient | undefined
}

const isCloudflareWorker =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

// Workers can't reuse a connection across requests, so give each request its own client
const requestClients = new WeakMap<object, PrismaClient>()

function getWorkerClient(): PrismaClient {
  const { env, ctx } = getCloudflareContext()
  let client = requestClients.get(ctx)
  if (!client) {
    const connectionString = env.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL
    // maxUses: 1 closes each connection after use instead of pooling it
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString, maxUses: 1 }) })
    requestClients.set(ctx, client)
  }
  return client
}

// Node (next dev / next start): one pooled client for the whole process
function getNodeClient(): PrismaClient {
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })
  }
  return globalThis.prisma
}

function getClient(): PrismaClient {
  return isCloudflareWorker ? getWorkerClient() : getNodeClient()
}

// Resolves the right client on every access, so callers keep using `prisma.user...` as before
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
