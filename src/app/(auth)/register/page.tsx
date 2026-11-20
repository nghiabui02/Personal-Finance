'use client'
import { useTranslations } from 'next-intl'

import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'
import { readField } from '@/lib/utils/form'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const { error, isPending, submit } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = readField(form, 'email')
    const password = readField(form, 'password')

    submit(async () => {
      await authApi.signUp({ email, password })
      router.push('/login?message=check_email')
    }, { fallback: t('signUpFailed') })
  }

  return (
    <AuthCard>
      <AuthHeading title={t('createAccount')}>{t('startManagingYourFinancesToday')}</AuthHeading>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('email')} name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <Input label={t('password')} name="password" type="password" autoComplete="new-password" required placeholder={t('atLeast6Characters')} />
        <FormError message={error} />
        <Button loading={isPending} type="submit" disabled={isPending} fullWidth>
          {isPending ? t('creatingAccount') : t('createAccount')}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-400">{t.rich('sentenceAlreadyHaveAnAccountSignIn', { value0: ' ', value1: () => <Link href="/login" className="font-medium text-brand hover:underline">
          {t('signIn')}</Link> })}</p>
    </AuthCard>
  )
}
