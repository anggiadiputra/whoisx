import { getActiveTurnstile, getRegistrationEnabled } from '@/lib/app-settings'
import { SignInForm } from './sign-in-form'

export default async function SignInPage() {
  const [registrationEnabled, turnstile] = await Promise.all([getRegistrationEnabled(), getActiveTurnstile()])

  return <SignInForm registrationEnabled={registrationEnabled} turnstileSiteKey={turnstile?.siteKey ?? null} />
}
