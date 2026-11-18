'use client'
import { authErrorKey } from '@/i18n/auth-error'
import { useTranslations } from 'next-intl'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'
import { readField } from '@/lib/utils/form'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const errors = useTranslations('errors')
  const router = useRouter()
  const { error, setError, isPending, submit } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = readField(form, 'password')
    const confirm = readField(form, 'confirm')

    if (password !== confirm) {
      setError(t('passwordsDoNotMatch'))
      return
    }
    if (password.length < 6) {
      setError(t('passwordMustBeAtLeast6Characters'))
      return
    }

    submit(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(errors(authErrorKey(error.code)))
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <AuthCard>
      <AuthHeading title={t('setNewPassword')}>{t('chooseAStrongPasswordForYourAccount')}</AuthHeading>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('newPassword')}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
        <Input
          label={t('confirmPassword')}
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
        <FormError message={error} />
        <Button type="submit" disabled={isPending} fullWidth>
          {isPending ? t('saving') : t('setNewPassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
