'use client'
import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { formatVND } from '@/lib/utils/currency'
import { SectionCard, SectionEmpty } from '@/components/ui/section-card'
import React, { useState } from 'react'
import { Pie as PieBase, PieChart, ResponsiveContainer, Sector } from 'recharts'
import { CATEGORY_PALETTE } from '@/lib/utils/colors'
import type { CategoryRef } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Pie = PieBase as React.ComponentType<any>

type CategorySpend = CategoryRef & {
  amount: number
}

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

export function SpendingChart({ data: categories, totalExpense }: { data: CategorySpend[]; totalExpense: number }) {
  const locale = useLocale()
  const data = categories.map(category => ({ ...category, name: getCategoryName(category, locale) }))
  const t = useTranslations('dashboard')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <SectionCard title={t('spendingByCategory')} className="flex flex-col flex-1">
        <SectionEmpty message={t('noSpendingThisMonth')} action={{ label: t('recordAnExpense'), href: '/transactions' }} />
      </SectionCard>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color ?? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }))

  const active = activeIndex !== null ? chartData[activeIndex] : null
  const pct = active && totalExpense > 0
    ? ((active.amount / totalExpense) * 100).toFixed(0)
    : null

  return (
    <SectionCard
      title={t('spendingByCategory')}
      action={{ label: t('breakdown'), href: '/reports' }}
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
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-26">
                  {active.name}
                </p>
                <p className="mt-1 text-lg font-semibold leading-none text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatVND(active.amount)}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 tabular-nums">{t('sentenceOfSpend', { value0: pct ?? 0 })}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('totalSpent')}</p>
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
