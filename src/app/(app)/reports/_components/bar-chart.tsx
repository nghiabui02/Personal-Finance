'use client'

import { formatVND, formatCompactVND } from '@/lib/utils/currency'
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from './types'
import type { PeriodType } from './reports-client'

interface BarChartProps {
  data: ChartPoint[]
  title: string
  period: PeriodType
}

export function BarChart({ data, title, period }: BarChartProps) {
  const hasData = data.some(d => d.income > 0 || d.expense > 0)

  // For month view (many bars), only show every 5th label
  const tickInterval = period === 'month' ? 4 : 0

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RechartsBarChart data={data} barGap={2} barCategoryGap={period === 'month' ? '15%' : '30%'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={v => formatCompactVND(v)}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatVND(value),
                name.charAt(0).toUpperCase() + name.slice(1),
              ]}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="income"  name="income"  fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
