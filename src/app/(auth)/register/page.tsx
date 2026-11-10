'use client'

import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'

export default function RegisterPage() {
  const router = useRouter()
  const { error, isPending, submit } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    submit(async () => {
      await authApi.signUp({ email, password })
      router.push('/login?message=check_email')
    }, { fallback: 'Sign up failed.' })
  }

  return (
    <AuthCard>
      <AuthHeading title="Create account">Start managing your finances today</AuthHeading>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <Input label="Password" name="password" type="password" autoComplete="new-password" required placeholder="At least 6 characters" />
        <FormError message={error} />
        <Button type="submit" disabled={isPending} fullWidth>
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
