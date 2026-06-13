import { formatVND } from '@/lib/utils/currency'

interface StatCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
}

interface StatCardProps {
  label: string
  amount: number
  color: 'green' | 'red' | 'blue'
  icon: React.ReactNode
}

function StatCard({ label, amount, color, icon }: StatCardProps) {
  const colorMap = {
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    red:   'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
    blue:  'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
  }
  const amountColor = {
    green: 'text-green-700 dark:text-green-300',
    red:   'text-red-700 dark:text-red-300',
    blue:  'text-gray-900 dark:text-gray-100',
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-xl font-semibold tracking-tight ${amountColor[color]}`}>
        {formatVND(amount)}
      </p>
    </div>
  )
}

export function StatCards({ totalIncome, totalExpense, balance }: StatCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Income"
        amount={totalIncome}
        color="green"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
          </svg>
        }
      />
      <StatCard
        label="Expense"
        amount={totalExpense}
        color="red"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
          </svg>
        }
      />
      <StatCard
        label="Balance"
        amount={balance}
        color="blue"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        }
      />
    </div>
  )
}
