// Subdomain handling for websites. A website sits on `${subdomain}.${domain}`,
// or on the domain itself when subdomain is "".

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export type SubdomainResult = { ok: true; value: string } | { ok: false; error: string }

/**
 * Normalise what a person typed into the subdomain field.
 * Accepts "blog", "Blog.", "blog.example.com" (domain suffix is stripped), "@" or "" for the root.
 */
export function normalizeSubdomain(input: unknown, domain: string): SubdomainResult {
  if (input === undefined || input === null) return { ok: true, value: '' }
  if (typeof input !== 'string') return { ok: false, error: 'Subdomain tidak valid' }

  const root = domain.trim().toLowerCase()
  let value = input.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
  if (value === '@') value = ''

  // Someone pasted the full address: keep only the part in front of the domain
  if (value === root) value = ''
  else if (value.endsWith(`.${root}`)) value = value.slice(0, -(root.length + 1))

  if (value === '') return { ok: true, value: '' }

  const labels = value.split('.')
  if (labels.some(label => !LABEL.test(label))) {
    return {
      ok: false,
      error: 'Subdomain hanya boleh huruf, angka, dan tanda hubung (-), tanpa spasi. Contoh: blog atau toko',
    }
  }
  if (value.length + 1 + root.length > 253) {
    return { ok: false, error: 'Alamat website terlalu panjang' }
  }
  return { ok: true, value }
}

/** Full host for a website, e.g. "blog.example.com" or "example.com". */
export function websiteAddress(subdomain: string | null | undefined, domain: string): string {
  return subdomain ? `${subdomain}.${domain}` : domain
}
