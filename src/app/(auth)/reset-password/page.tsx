'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
      {/* Brand header */}
      <div className="bg-slate-900 px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-base leading-none">₫</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Personal Finance</p>
      </div>

      <div className="bg-white dark:bg-gray-900 px-6 py-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Set new password</h1>
        <p className="text-sm text-gray-400 mb-6">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Set new password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
