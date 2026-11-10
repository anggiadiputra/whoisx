// Run one async task per item, a few at a time, reporting progress as each one settles.
// Used by the bulk domain actions, which call the existing per-domain API routes so
// permissions, validation and activity logging stay in one place.
export async function runBatch<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  { concurrency = 3, onProgress }: { concurrency?: number; onProgress?: (done: number) => void } = {}
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  let done = 0

  const worker = async () => {
    while (next < items.length) {
      const index = next++
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
      onProgress?.(++done)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

// fetch() that throws on non-2xx, using the API's { error } message when there is one
export async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { credentials: 'include', ...init })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Permintaan gagal (${response.status})`)
  }
  return response
}
