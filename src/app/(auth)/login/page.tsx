'use client'

import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function LoginMessages() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  if (message === 'check_email') {
    return (
      <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Check your email to confirm your account.
      </div>
    )
  }
  if (error === 'auth_callback_failed') {
    return (
      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        Authentication failed. Please try again.
      </div>
    )
  }
  return null
}

function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setError(null)
    setIsPending(true)

    try {
      await authApi.signIn({ email, password })
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" disabled={isPending} fullWidth>
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your personal finances</p>
      </div>

      <Suspense>
        <LoginMessages />
      </Suspense>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
