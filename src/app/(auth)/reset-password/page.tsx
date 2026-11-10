'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { error, setError, isPending, submit } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    submit(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <AuthCard>
      <AuthHeading title="Set new password">Choose a strong password for your account.</AuthHeading>

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
        <FormError message={error} />
        <Button type="submit" disabled={isPending} fullWidth>
          {isPending ? 'Saving...' : 'Set new password'}
        </Button>
      </form>
    </AuthCard>
  )
}
