import { formatVND } from '@/lib/utils/currency'

interface StatCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
  netWorth: number
  totalAssets: number
  totalCreditDebt: number
}

export function StatCards({ totalIncome, totalExpense, netWorth, totalAssets, totalCreditDebt }: StatCardsProps) {
  const net = totalIncome - totalExpense
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
      {/* Monthly cash flow */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 px-5 py-4">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">This Month</p>
        <p className={`text-2xl font-bold tabular-nums ${net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-rose-600 dark:text-rose-400'}`}>
          {net >= 0 ? '+' : ''}{formatVND(net)}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-6">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Income</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatVND(totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Expense</p>
            <p className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
              {formatVND(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Net worth */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 px-5 py-4">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Net Worth</p>
        <p className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-rose-600 dark:text-rose-400'}`}>
          {formatVND(netWorth)}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-6">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Assets</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(totalAssets)}
            </p>
          </div>
          {totalCreditDebt > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Credit Debt</p>
              <p className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
                −{formatVND(totalCreditDebt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
