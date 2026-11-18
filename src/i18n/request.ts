import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LOCALE_COOKIE, resolveLocale } from './locale'
import { messagesForLocale } from './messages'

export default getRequestConfig(async () => {
  const [store, requestHeaders, supabase] = await Promise.all([cookies(), headers(), createClient()])
  const { data: { user } } = await supabase.auth.getUser()
  const locale = resolveLocale(user?.user_metadata.locale, store.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'))
  return { locale, messages: messagesForLocale(locale), timeZone: process.env.NEXT_PUBLIC_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }
})
