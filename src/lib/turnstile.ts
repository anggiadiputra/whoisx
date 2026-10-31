// Cloudflare Turnstile. The keys and the on/off switch are saved in Settings → Security
// (see getActiveTurnstile in app-settings.ts). This file is also imported by the sign-in form,
// so keep it free of server-only imports.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Thrown from the credentials provider; the sign-in form shows its own message for it
export const TURNSTILE_FAILED = 'TurnstileFailed'

export async function verifyTurnstileToken(secretKey: string, token: string | undefined, remoteIp?: string): Promise<boolean> {
  if (!token) return false

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    return false
  }
}
