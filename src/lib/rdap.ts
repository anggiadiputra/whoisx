import axios, { AxiosResponse } from 'axios'

export interface RDAPResponse {
  objectClassName: string
  ldhName?: string
  nameservers?: Array<{
    objectClassName: string
    ldhName: string
  }>
  status?: string[]
  events?: Array<{
    eventAction: string
    eventDate: string
  }>
  entities?: Array<{
    objectClassName: string
    handle?: string
    roles?: string[]
    publicIds?: Array<{
      type: string
      identifier: string
    }>
    vcardArray?: any[]
    links?: Array<{
      value: string
      rel: string
      href: string
      type: string
    }>
  }>
  secureDNS?: {
    delegationSigned: boolean
  }
  notices?: Array<{
    title: string
    description: string[]
    links?: Array<{
      value: string
      rel: string
      href: string
      type: string
    }>
  }>
}

export interface ProcessedWhoisData {
  domain: string
  registrar?: string
  createdDate?: Date
  expiryDate?: Date
  updatedDate?: Date
  status?: string
  nameservers?: string[]
  daysToExpiry?: number
  
  // WHOIS fields (removed only registrar_abuse_email, registrar_abuse_phone, registrar_url)
  domainStatus?: string
  dnssecStatus?: string
  registrarWhoisServer?: string
}

// RDAP Provider configurations
const RDAP_PROVIDERS = [
  {
    name: 'Verisign COM',
    baseUrl: 'https://rdap.verisign.com/com/v1/domain/',
    tlds: ['com']
  },
  {
    name: 'Verisign CC',
    baseUrl: 'https://rdap.verisign.com/cc/v1/domain/',
    tlds: ['cc']
  },
  {
    name: 'IDNIC',
    baseUrl: 'https://rdap.idnic.id/rdap/domain/',
    tlds: ['id']
  },
  {
    name: 'Neustar',
    baseUrl: 'https://rdap.neustar.biz/rdap/domain/',
    tlds: ['biz']
  },
  {
    name: 'Afilias',
    baseUrl: 'https://rdap.afilias.net/rdap/domain/',
    tlds: ['info', 'org']
  },
  {
    name: 'PIR',
    baseUrl: 'https://rdap.pir.org/rdap/domain/',
    tlds: ['org']
  }
]

// Generic fallback providers for other TLDs
const FALLBACK_PROVIDERS = [
  'https://rdap.org/domain/',
  'https://rdap.apnic.net/domain/',
  'https://rdap.arin.net/registry/domain/'
]

class RDAPError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public provider?: string,
    public domain?: string
  ) {
    super(message)
    this.name = 'RDAPError'
  }
}

/**
 * Get TLD from domain name
 */
function getTLD(domain: string): string {
  const parts = domain.toLowerCase().split('.')
  return parts[parts.length - 1]
}

/**
 * Validate domain format
 */
function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/
  return domainRegex.test(domain)
}

/**
 * Get appropriate RDAP providers for a domain based on TLD
 */
function getProviders(domain: string): string[] {
  const tld = getTLD(domain)
  const providers: string[] = []
  
  // Find TLD-specific providers
  RDAP_PROVIDERS.forEach(provider => {
    if (provider.tlds.includes(tld)) {
      providers.push(provider.baseUrl)
    }
  })
  
  // Add fallback providers
  providers.push(...FALLBACK_PROVIDERS)
  
  return providers
}

/**
 * Make HTTP request with timeout and retry logic
 */
async function makeRequest(url: string, retries = 3, delay = 1000): Promise<AxiosResponse<RDAPResponse>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<RDAPResponse>(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Domain-Manager/1.0',
          'Accept': 'application/rdap+json, application/json'
        }
      })
      
      return response
    } catch (error: any) {
      console.error(`RDAP request attempt ${attempt} failed for ${url}:`, error.message)
      
      if (attempt === retries) {
        throw new RDAPError(
          `Failed after ${retries} attempts: ${error.message}`,
          error.response?.status,
          url
        )
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw new RDAPError('Unexpected error in retry logic')
}

/**
 * Process RDAP response into standardized format
 */
function processRDAPResponse(rdapData: RDAPResponse, domain: string): ProcessedWhoisData {
  const processed: ProcessedWhoisData = {
    domain: domain.toLowerCase()
  }
  
  // Extract registrar information
  if (rdapData.entities) {
    const registrarEntity = rdapData.entities.find(entity => 
      entity.roles?.includes('registrar')
    )
    if (registrarEntity) {
      // Extract registrar name from vCard
      if (registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
        const vCardProperties = registrarEntity.vcardArray[1]
        const fnProperty = vCardProperties.find((prop: any) => prop[0] === 'fn')
        if (fnProperty && fnProperty[3]) {
          processed.registrar = fnProperty[3]
        }
      }
      
      // Extract registrar WHOIS server (not contact info)
      if (registrarEntity.links) {
        const whoisLink = registrarEntity.links.find(link => link.rel === 'related' && link.type === 'application/whois')
        if (whoisLink) {
          processed.registrarWhoisServer = whoisLink.href
        }
      }
      
      // Fallback to IANA ID if no name found
      if (!processed.registrar && registrarEntity.publicIds) {
        const ianaid = registrarEntity.publicIds.find(id => id.type === 'IANA Registrar ID')
        if (ianaid) {
          processed.registrar = `Registrar ID: ${ianaid.identifier}`
        }
      }
    }
  }
  
  // Extract important dates
  if (rdapData.events) {
    rdapData.events.forEach(event => {
      const eventDate = new Date(event.eventDate)
      
      switch (event.eventAction) {
        case 'registration':
          processed.createdDate = eventDate
          break
        case 'expiration':
          processed.expiryDate = eventDate
          // Calculate days to expiry
          const now = new Date()
          const diffTime = eventDate.getTime() - now.getTime()
          processed.daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          break
        case 'last changed':
        case 'last update of RDAP database':
          processed.updatedDate = eventDate
          break
      }
    })
  }
  
  // Extract domain status
  if (rdapData.status && rdapData.status.length > 0) {
    processed.domainStatus = rdapData.status.join(', ')
    processed.status = rdapData.status.join(', ') // Keep for backward compatibility
  }
  
  // Extract nameservers and convert to JSON string for database storage
  if (rdapData.nameservers) {
    processed.nameservers = rdapData.nameservers.map(ns => ns.ldhName).filter(Boolean)
  }
  
  // Extract DNSSEC status
  if (rdapData.secureDNS) {
    processed.dnssecStatus = rdapData.secureDNS.delegationSigned ? 'Signed' : 'Unsigned'
  }
  
  return processed
}

/**
 * Lookup WHOIS data for a single domain
 */
export async function lookupDomain(domain: string): Promise<{
  success: boolean
  data?: ProcessedWhoisData
  rawData?: RDAPResponse
  error?: string
  provider?: string
}> {
  // Validate domain format
  if (!validateDomain(domain)) {
    return {
      success: false,
      error: 'Invalid domain format'
    }
  }
  
  const providers = getProviders(domain)
  
  for (const providerUrl of providers) {
    try {
      console.log(`Trying RDAP lookup for ${domain} via ${providerUrl}`)
      
      const url = `${providerUrl}${domain.toLowerCase()}`
      const response = await makeRequest(url)
      
      const processedData = processRDAPResponse(response.data, domain)
      
      return {
        success: true,
        data: processedData,
        rawData: response.data,
        provider: providerUrl
      }
    } catch (error: any) {
      console.error(`Provider ${providerUrl} failed for domain ${domain}:`, error.message)
      continue
    }
  }
  
  return {
    success: false,
    error: 'All RDAP providers failed for this domain',
    provider: 'all-providers-failed'
  }
}

/**
 * Batch lookup multiple domains
 */
export async function batchLookupDomains(
  domains: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{
  domain: string
  success: boolean
  data?: ProcessedWhoisData
  rawData?: RDAPResponse
  error?: string
  provider?: string
}>> {
  const results = []
  const maxConcurrent = 5 // Limit concurrent requests to avoid rate limiting
  
  for (let i = 0; i < domains.length; i += maxConcurrent) {
    const batch = domains.slice(i, i + maxConcurrent)
    
    const batchPromises = batch.map(async (domain) => {
      const result = await lookupDomain(domain)
      return { domain, ...result }
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          domain: 'unknown',
          success: false,
          error: result.reason?.message || 'Unknown error'
        })
      }
    })
    
    if (onProgress) {
      onProgress(Math.min(i + maxConcurrent, domains.length), domains.length)
    }
  }
  
  return results
}

/**
 * Check if cached data is still valid
 */
export function isCacheValid(cachedAt: Date, ttlHours = 24): boolean {
  const now = new Date()
  const cacheAge = now.getTime() - cachedAt.getTime()
  const ttlMs = ttlHours * 60 * 60 * 1000
  return cacheAge < ttlMs
}

export { RDAPError }
