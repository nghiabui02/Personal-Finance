import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { Dot, Em, Verdict } from '@/components/ui/verdict'
import { type Transaction } from '@/lib/api/transactions'
import { formatVND } from '@/lib/utils/currency'
import { sumByType } from '@/lib/utils/totals'

/** The sentence the transactions screen opens with; the figures under it are
 *  the evidence. */
export function TransactionsVerdict({
  transactions,
  isNarrowed,
}: {
  transactions: Transaction[]
  /** A search or a filter is on — an empty list then means "no match", not
   *  "nothing recorded". */
  isNarrowed: boolean
}) {
  const locale = useLocale()
  const t = useTranslations('transactions')
  const totalIncome = sumByType(transactions, 'income')
  const totalExpense = sumByType(transactions, 'expense')
  const totalNet = totalIncome - totalExpense
  const biggestExpense = transactions
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0]

  if (transactions.length === 0) {
    return (
      <Verdict
        className="mb-3"
        headline={isNarrowed
          ? <>{t('nothingMatchesWhatYouReLookingFor')}</>
          : <>{t('nothingRecordedHereYet')}</>}
      />
    )
  }

  return (
    <Verdict
      className="mb-3"
      headline={totalNet >= 0
        ? <>{t.rich('netUp', { amount: formatVND(Math.abs(totalNet)), count: transactions.length, strong: chunks => <Em tone="good">{chunks}</Em> })}</>
        : <>{t.rich('netDown', { amount: formatVND(Math.abs(totalNet)), count: transactions.length, strong: chunks => <Em tone="bad">{chunks}</Em> })}</>}
      support={
        <>
          <span>{t('sentenceIn', { value0: formatVND(totalIncome) })}</span><Dot /><span>{t('sentenceOut', { value0: formatVND(totalExpense) })}</span>
          {biggestExpense && <><Dot /><span>{t('sentenceLargest', { value0: (biggestExpense.categories ? getCategoryName(biggestExpense.categories, locale) : undefined) ?? t('uncategorized'), value1: formatVND(biggestExpense.amount) })}</span></>}
        </>
      }
    />
  )
}
