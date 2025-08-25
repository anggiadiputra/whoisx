import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { batchLookupDomains } from '@/lib/rdap'
import { DomainStatus } from '@prisma/client'

// POST /api/whois/batch - Batch WHOIS lookup for multiple domains
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domains, updateExisting = false } = body
    
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Domains array is required'
      }, { status: 400 })
    }
    
    if (domains.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 100 domains allowed per batch'
      }, { status: 400 })
    }
    
    const results = []
    let completed = 0
    
    // Perform batch WHOIS lookup
    // console.log(`Starting batch WHOIS lookup for ${domains.length} domains`)
    
    const batchResults = await batchLookupDomains(domains, (completedCount, total) => {
      completed = completedCount
      // console.log(`Batch progress: ${completedCount}/${total}`)
    })
    
    // Process results and update/create domain records
    for (const result of batchResults) {
      try {
        if (result.success && result.data) {
          const domainLower = result.domain.toLowerCase()
          
          // Check if domain exists
          const existingDomain = await prisma.domain.findUnique({
            where: { domain: domainLower }
          })
          
          const domainData = {
            domain: domainLower,
            registrar: result.data.registrar,
            createdDate: result.data.createdDate,
            expiryDate: result.data.expiryDate,
            status: DomainStatus.ACTIVE,
            daysToExpiry: result.data.daysToExpiry,
            lastChecked: new Date()
          }
          
          if (existingDomain) {
            if (updateExisting) {
              // Update existing domain
              await prisma.domain.update({
                where: { domain: domainLower },
                data: domainData
              })
              
              results.push({
                domain: result.domain,
                action: 'updated',
                success: true,
                data: result.data
              })
            } else {
              results.push({
                domain: result.domain,
                action: 'skipped',
                success: true,
                message: 'Domain exists, use updateExisting=true to update'
              })
            }
          } else {
            // Create new domain
            await prisma.domain.create({
              data: domainData
            })
            
            results.push({
              domain: result.domain,
              action: 'created',
              success: true,
              data: result.data
            })
          }
          
          // Cache WHOIS data
          if (result.rawData) {
            // Delete old cache
            await prisma.whoisCache.deleteMany({
              where: { domain: domainLower }
            })
            
            // Create new cache
            await prisma.whoisCache.create({
              data: {
                domain: domainLower,
                whoisData: result.rawData as any
              }
            })
          }
        } else {
          // WHOIS lookup failed
          results.push({
            domain: result.domain,
            action: 'failed',
            success: false,
            error: result.error
          })
        }
      } catch (dbError: any) {
        console.error(`Database error for domain ${result.domain}:`, dbError)
        results.push({
          domain: result.domain,
          action: 'failed',
          success: false,
          error: 'Database error: ' + dbError.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    
    return NextResponse.json({
      success: true,
      summary: {
        total: domains.length,
        successful: successCount,
        failed: failureCount,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        skipped: results.filter(r => r.action === 'skipped').length
      },
      results
    })
  } catch (error: any) {
    console.error('Error in batch WHOIS lookup:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform batch WHOIS lookup'
    }, { status: 500 })
  }
}
