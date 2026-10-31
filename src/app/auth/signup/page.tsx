import { redirect } from 'next/navigation'
import { getRegistrationEnabled } from '@/lib/app-settings'
import { SignUpForm } from './sign-up-form'

export default async function SignUpPage() {
  // Admins can close public sign-up in Settings; new accounts are then added from the Users page
  if (!(await getRegistrationEnabled())) {
    redirect('/auth/signin')
  }

  return <SignUpForm />
}
