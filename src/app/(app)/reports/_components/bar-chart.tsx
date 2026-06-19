'use client'

import { formatVND, formatCompactVND } from '@/lib/utils/currency'
import { useTheme } from 'next-themes'
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from './types'
import type { PeriodType } from './reports-client'

interface BarChartProps {
  data: ChartPoint[]
  title: string
  period: PeriodType
}

export function BarChart({ data, title, period }: BarChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const hasData = data.some(d => d.income > 0 || d.expense > 0)

  const tickInterval = period === 'month' ? 4 : 0
  const tooltipStyle = {
    borderRadius: '12px',
    border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{title}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-gray-400">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] text-gray-400">Expense</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <RechartsBarChart data={data} barGap={2} barCategoryGap={period === 'month' ? '15%' : '30%'}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={v => formatCompactVND(v)}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              cursor={false}
              formatter={((value: unknown, name: unknown) => [
                formatVND(typeof value === 'number' ? value : 0),
                String(name ?? ''),
              ]) as never}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="income"  name="income"  fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[3, 3, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
