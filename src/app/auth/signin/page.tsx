import { getRegistrationEnabled } from '@/lib/app-settings'
import { getTurnstileSiteKey } from '@/lib/turnstile'
import { SignInForm } from './sign-in-form'

export default async function SignInPage() {
  const registrationEnabled = await getRegistrationEnabled()

  return <SignInForm registrationEnabled={registrationEnabled} turnstileSiteKey={getTurnstileSiteKey()} />
}
