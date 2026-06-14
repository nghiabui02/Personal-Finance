'use client'

import { formatVND, formatCompactVND } from '@/lib/utils/currency'
import { type MonthlyData } from '@/lib/api/reports'
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map(d => ({
    label: MONTHS[parseInt(d.month.split('-')[1]) - 1],
    income: d.income,
    expense: d.expense,
    net: d.income - d.expense,
  }))

  const hasData = data.some(d => d.income > 0 || d.expense > 0)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Monthly Income vs Expense
      </h2>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No data for this year
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => formatCompactVND(v)}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={((value: unknown, name: unknown) => [
                formatVND(typeof value === 'number' ? value : 0),
                String(name ?? ''),
              ]) as never}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
