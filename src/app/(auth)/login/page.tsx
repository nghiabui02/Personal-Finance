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
      <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <Button type="submit" disabled={isPending} fullWidth>
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
      {/* Brand header */}
      <div className="bg-slate-900 px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-base leading-none">₫</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Personal Finance</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 px-6 py-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Sign in</h1>
        <p className="text-sm text-gray-400 mb-6">Enter your credentials to continue</p>

        <Suspense>
          <LoginMessages />
        </Suspense>

        <LoginForm />

        <p className="mt-5 text-center text-sm text-gray-400">
          No account?{' '}
          <Link href="/register" className="font-medium text-indigo-500 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
