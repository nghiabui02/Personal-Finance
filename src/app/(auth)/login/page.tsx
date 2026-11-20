'use client'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  if (message === 'check_email') {
    return (
      <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        {t('checkYourEmailToConfirmYourAccount')}</div>
    )
  }
  if (error === 'auth_callback_failed') {
    return (
      <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
        {t('authenticationFailedPleaseTryAgain')}</div>
    )
  }
  return null
}

function LoginForm() {
  const t = useTranslations('auth')
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
    }, { fallback: t('signInFailed') })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label={t('email')} name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <div className="space-y-1">
        <Input label={t('password')} name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-brand transition-colors">
            {t('forgotPassword2')}</Link>
        </div>
      </div>
      <FormError message={error} />
      <Button loading={isPending} type="submit" disabled={isPending} fullWidth>
        {isPending ? t('signingIn') : t('signIn')}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <AuthCard>
      <AuthHeading title={t('signIn')}>{t('enterYourCredentialsToContinue')}</AuthHeading>

      <Suspense>
        <LoginMessages />
      </Suspense>

      <LoginForm />

      <p className="mt-5 text-center text-sm text-gray-400">{t.rich('sentenceNoAccountSignUp', { value0: ' ', value1: () => <Link href="/register" className="font-medium text-brand hover:underline">
          {t('signUp')}</Link> })}</p>
    </AuthCard>
  )
}
