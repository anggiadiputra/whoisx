import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Every page reads the database per request, so no incremental (ISR) cache is configured
export default defineCloudflareConfig({})
