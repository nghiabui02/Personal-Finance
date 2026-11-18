'use client'

import { useSyncExternalStore } from 'react'

const translations = {
  vi: { title: 'Đã xảy ra lỗi', detail: 'Đã xảy ra lỗi ngoài dự kiến. Vui lòng thử lại.', retry: 'Thử lại' },
  en: { title: 'Something went wrong', detail: 'An unexpected error occurred. Please try again.', retry: 'Try again' },
}
const subscribe = () => () => {}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useSyncExternalStore<'en' | 'vi'>(subscribe, () => document.documentElement.lang === 'en' ? 'en' : 'vi', () => 'vi')
  const t = translations[locale]
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-rose-500 uppercase tracking-widest mb-3">500</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-sm text-gray-500 mb-8">
            {t.detail}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-fill px-4 py-2 text-sm font-medium text-white hover:bg-brand-fill-hover transition-colors"
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  )
}
