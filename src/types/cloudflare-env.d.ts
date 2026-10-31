// Bindings declared in wrangler.jsonc, as seen through getCloudflareContext().env
interface CloudflareEnv {
  DB: import('@cloudflare/workers-types').D1Database
}
