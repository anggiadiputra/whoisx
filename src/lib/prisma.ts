import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// One client per D1 binding object. On Workers and in `next dev`
// (initOpenNextCloudflareForDev in next.config.ts) the binding comes from the Cloudflare context.
const clients = new WeakMap<object, PrismaClient>()

function getClient(): PrismaClient {
  const { env } = getCloudflareContext()
  let client = clients.get(env.DB)
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(env.DB) })
    clients.set(env.DB, client)
  }
  return client
}

// Resolves the client on every access, so callers keep using `prisma.user...` as before
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
