import { useTranslations } from 'next-intl'
import { formatSignedVND, formatVND } from '@/lib/utils/currency'
import { SectionCard, SectionEmpty } from '@/components/ui/section-card'
import { sumRemaining } from '@/lib/utils/totals'

type DebtItem = {
  type: 'lend' | 'borrow'
  remaining_amount: number
  status: string
}

export function DebtSummary({ debts }: { debts: DebtItem[] }) {
  const t = useTranslations('dashboard')
  const active = debts.filter(d => d.status === 'active')
  const totalLend = sumRemaining(active, 'lend')
  const totalBorrow = sumRemaining(active, 'borrow')

  const net = totalLend - totalBorrow

  return (
    <SectionCard title={t('debts')} action={{ label: t('manage'), href: '/debts' }}>
      {active.length === 0 ? (
        <SectionEmpty message={t('noActiveDebts')} action={{ label: t('trackADebt'), href: '/debts' }} />
      ) : (
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-gray-400 dark:text-gray-500">{t('theyOweMe')}</dt>
            <dd className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(totalLend)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-gray-400 dark:text-gray-500">{t('iOweThem')}</dt>
            <dd className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
              {formatVND(totalBorrow)}
            </dd>
          </div>
          {/* The figure that actually answers "am I up or down on debt" */}
          <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-hairline dark:border-gray-800">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('netPosition')}</dt>
            <dd className={`text-sm font-semibold tabular-nums ${
              net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}>
              {formatSignedVND(net)}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  )
}
