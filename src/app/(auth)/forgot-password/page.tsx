'use client'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useState } from 'react'
import { FormError } from '@/components/ui/form-error'
import { useAuthForm } from '../use-auth-form'
import { AuthCard, AuthHeading } from '../_components/auth-card'
import { readField } from '@/lib/utils/form'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const { error, isPending, submit } = useAuthForm()
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = readField(e.currentTarget, 'email')

    submit(async () => {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? t('requestFailed'))
      }
      setSent(true)
    }, { reenableOnSuccess: true })
  }

  return (
    <AuthCard>
      {sent ? (
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
            <svg className="text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('checkYourEmail')}</h1>
          <p className="text-sm text-gray-400 mb-6">
            {t('weSentAPasswordResetLinkClickItToSetANew')}</p>
          <Link href="/login" className="text-sm font-medium text-brand hover:underline">
            {t('backToSignIn')}</Link>
        </div>
      ) : (
        <>
          <AuthHeading title={t('forgotPassword')}>{t('enterYourEmailAndWeLlSendAResetLink')}</AuthHeading>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('email')}
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <FormError message={error} />
            <Button type="submit" disabled={isPending} fullWidth>
              {isPending ? t('sending') : t('sendResetLink')}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-400">
            <Link href="/login" className="font-medium text-brand hover:underline">
              {t('backToSignIn')}</Link>
          </p>
        </>
      )}
    </AuthCard>
  )
}
