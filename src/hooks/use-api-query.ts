'use client'

import { useCallback } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'

// Fetch JSON from one of our API routes; non-2xx responses become query errors
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Failed to load data (${response.status})`)
  }
  return response.json()
}

/**
 * Cached GET of an API route, keyed by URL so pages share results.
 * Navigating back to a page shows the last data instantly while it revalidates.
 * With keepPrevious, changing the URL (e.g. search filters) keeps showing the
 * previous result until the new one arrives instead of falling back to loading.
 */
export function useApiQuery<T>(url: string, enabled = true, keepPrevious = false) {
  return useQuery({
    queryKey: [url],
    queryFn: () => fetchJson<T>(url),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  })
}

/**
 * Mark all cached API data stale after a mutation. Domains, servers and websites
 * reference each other, so refreshing everything keeps every page consistent;
 * only queries on screen refetch immediately.
 */
export function useRefreshApiData() {
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.invalidateQueries(), [queryClient])
}
