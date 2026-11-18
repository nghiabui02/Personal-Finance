import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { SectionCard, SectionEmpty } from '@/components/ui/section-card'
import { formatMonthDay } from '@/lib/utils/date'
import { SignedAmount } from '@/components/ui/signed-amount'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string | null
  transaction_date: string
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

function formatDate(dateStr: string, locale: string) {
  return formatMonthDay(new Date(dateStr), locale)
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const locale = useLocale()
  const t = useTranslations('dashboard')
  return (
    <SectionCard
      title={t('recentActivity')}
      action={{ label: t('viewAll'), href: '/transactions' }}
      className="flex flex-col flex-1"
    >
      {transactions.length === 0 ? (
        <SectionEmpty message={t('nothingRecordedYet')} action={{ label: t('addYourFirstTransaction'), href: '/transactions' }} />
      ) : (
        <ul className="space-y-2.5">
          {transactions.map((tx, idx) => {
            const cat = tx.categories
            return (
              <li key={tx.id} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: cat?.color ? `${cat.color}18` : '#f3f4f6' }}
                >
                  {cat?.icon ?? (
                    <span className="text-xs font-semibold text-gray-400">
                      {(cat ? getCategoryName(cat, locale) : undefined)?.[0] ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium leading-snug">
                    {tx.note || (cat ? getCategoryName(cat, locale) : undefined) || t('uncategorized')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug mt-0.5">
                    {formatDate(tx.transaction_date, locale)}
                    {tx.note && (cat ? getCategoryName(cat, locale) : undefined) ? ` · ${getCategoryName(cat!, locale)}` : ''}
                  </p>
                </div>
                <SignedAmount amount={tx.amount} positive={tx.type === 'income'} className="text-sm shrink-0" />
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
