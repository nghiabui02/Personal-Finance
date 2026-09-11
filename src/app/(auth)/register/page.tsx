'use client'

import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
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
      await authApi.signUp({ email, password })
      router.push('/login?message=check_email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-hairline shadow-sm">
      {/* Brand header */}
      <div className="bg-panel px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-base leading-none">₫</span>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Personal Finance</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 px-6 py-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Create account</h1>
        <p className="text-sm text-gray-400 mb-6">Start managing your finances today</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          <Input label="Password" name="password" type="password" autoComplete="new-password" required placeholder="At least 6 characters" />
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
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
      </div>
    </div>
  )
}
