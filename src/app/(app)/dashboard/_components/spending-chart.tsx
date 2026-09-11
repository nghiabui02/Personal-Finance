'use client'

import { formatVND } from '@/lib/utils/currency'
import { SectionCard, SectionEmpty } from '@/components/ui/section-card'
import { useState } from 'react'
import { Pie as PieBase, PieChart, ResponsiveContainer, Sector } from 'recharts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Pie = PieBase as React.ComponentType<any>

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 5}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

export function SpendingChart({ data, totalExpense }: { data: CategorySpend[]; totalExpense: number }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <SectionCard title="Spending by category" className="flex flex-col flex-1">
        <SectionEmpty message="No spending this month" action={{ label: 'Record an expense', href: '/transactions' }} />
      </SectionCard>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  const active = activeIndex !== null ? chartData[activeIndex] : null
  const pct = active && totalExpense > 0
    ? ((active.amount / totalExpense) * 100).toFixed(0)
    : null

  return (
    <SectionCard
      title="Spending by category"
      action={{ label: 'Breakdown', href: '/reports' }}
      className="flex flex-col flex-1"
    >
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
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-2">
            {active ? (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[104px]">
                  {active.name}
                </p>
                <p className="mt-1 text-lg font-semibold leading-none text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatVND(active.amount)}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 tabular-nums">{pct}% of spend</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500">Total spent</p>
                <p className="mt-1 text-lg font-semibold leading-none text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatVND(totalExpense)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {chartData.slice(0, 5).map((d, i) => {
          const p = totalExpense > 0 ? ((d.amount / totalExpense) * 100).toFixed(0) : '0'
          const isActive = activeIndex === i
          return (
            <li
              key={d.id}
              className={`flex items-center gap-2 transition-opacity ${activeIndex !== null && !isActive ? 'opacity-40' : ''}`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
                {d.icon} {d.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-9 text-right shrink-0">{p}%</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums shrink-0">
                {formatVND(d.amount)}
              </span>
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}
