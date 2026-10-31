// Cloudflare Turnstile on the sign-in form. It is on when both Worker secrets are set:
// TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY (read per request, never at build time).

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Thrown from the credentials provider; the sign-in form shows its own message for it
export const TURNSTILE_FAILED = 'TurnstileFailed'

export function getTurnstileSiteKey(): string | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY
  return siteKey && process.env.TURNSTILE_SECRET_KEY ? siteKey : null
}

export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!getTurnstileSiteKey() || !secret) return true
  if (!token) return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    return false
  }
}
