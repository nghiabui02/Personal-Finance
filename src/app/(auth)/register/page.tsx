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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
        <p className="mt-1 text-sm text-gray-500">Start managing your finances today</p>
      </div>

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
          autoComplete="new-password"
          required
          placeholder="At least 6 characters"
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={isPending} fullWidth>
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
