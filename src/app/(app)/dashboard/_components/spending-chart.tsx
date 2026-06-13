'use client'

import { formatVND } from '@/lib/utils/currency'
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type CategorySpend = {
  id: string
  name: string
  icon: string | null
  color: string | null
  amount: number
}

const FALLBACK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
]

export function SpendingChart({ data, totalExpense }: { data: CategorySpend[]; totalExpense: number }) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Spending by Category</h2>
        <div className="py-10 text-center text-sm text-gray-400">No expense data this month</div>
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Spending by Category</h2>

      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              strokeWidth={0}
            />

            <Tooltip
              formatter={(value) => formatVND(Number(value))}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatVND(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-3 space-y-2">
        {chartData.slice(0, 5).map(d => {
          const pct = totalExpense > 0 ? ((d.amount / totalExpense) * 100).toFixed(0) : '0'
          return (
            <li key={d.id} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
                {d.icon} {d.name}
              </span>
              <span className="text-xs text-gray-400">{pct}%</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                {formatVND(d.amount)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
