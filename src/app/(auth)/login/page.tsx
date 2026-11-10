'use client'

import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'
import { readField } from '@/lib/utils/form'

function LoginMessages() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  if (message === 'check_email') {
    return (
      <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        Check your email to confirm your account.
      </div>
    )
  }
  if (error === 'auth_callback_failed') {
    return (
      <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
        Authentication failed. Please try again.
      </div>
    )
  }
  return null
}

function LoginForm() {
  const router = useRouter()
  const { error, isPending, submit } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = readField(form, 'email')
    const password = readField(form, 'password')

    submit(async () => {
      await authApi.signIn({ email, password })
      router.push('/dashboard')
      router.refresh()
    }, { fallback: 'Sign in failed.' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <div className="space-y-1">
        <Input label="Password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-brand transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={isPending} fullWidth>
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <AuthCard>
      <AuthHeading title="Sign in">Enter your credentials to continue</AuthHeading>

      <Suspense>
        <LoginMessages />
      </Suspense>

      <LoginForm />

      <p className="mt-5 text-center text-sm text-gray-400">
        No account?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  )
}
