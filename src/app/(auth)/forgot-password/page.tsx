'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value

    setError(null)
    setIsPending(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong.')
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
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

      <div className="bg-white dark:bg-gray-900 px-6 py-6">
        {sent ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
              <svg className="text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Check your email</h1>
            <p className="text-sm text-gray-400 mb-6">
              We sent a password reset link. Click it to set a new password.
            </p>
            <Link href="/login" className="text-sm font-medium text-brand hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Forgot password</h1>
            <p className="text-sm text-gray-400 mb-6">
              Enter your email and we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
              <Button type="submit" disabled={isPending} fullWidth>
                {isPending ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-400">
              <Link href="/login" className="font-medium text-brand hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
