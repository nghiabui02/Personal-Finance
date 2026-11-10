import { Dot, Em, Verdict } from '@/components/ui/verdict'
import { type Transaction } from '@/lib/api/transactions'
import { formatVND } from '@/lib/utils/currency'
import { plural } from '@/lib/utils/plural'
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
  const totalIncome = sumByType(transactions, 'income')
  const totalExpense = sumByType(transactions, 'expense')
  const totalNet = totalIncome - totalExpense
  const biggestExpense = transactions
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0]
  const count = plural(transactions.length, 'transaction')

  if (transactions.length === 0) {
    return (
      <Verdict
        className="mb-3"
        headline={isNarrowed
          ? <>Nothing matches what you&rsquo;re looking for.</>
          : <>Nothing recorded here yet.</>}
      />
    )
  }

  return (
    <Verdict
      className="mb-3"
      headline={totalNet >= 0
        ? <>You&rsquo;re up <Em tone="good">{formatVND(totalNet)}</Em> across {count}.</>
        : <>You&rsquo;re down <Em tone="bad">{formatVND(-totalNet)}</Em> across {count}.</>}
      support={
        <>
          <span>{formatVND(totalIncome)} in</span><Dot /><span>{formatVND(totalExpense)} out</span>
          {biggestExpense && <><Dot /><span>largest: {biggestExpense.categories?.name ?? 'Uncategorized'} {formatVND(biggestExpense.amount)}</span></>}
        </>
      }
    />
  )
}
