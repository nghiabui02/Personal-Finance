'use client'

import { formatVND } from '@/lib/utils/currency'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Snapshot = { recorded_date: string; net_worth: number }

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d}/${m}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${payload[0].value >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {formatVND(payload[0].value)}
      </p>
    </div>
  )
}

export function NetWorthChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return null

  const data = snapshots.map(s => ({
    date: formatDate(s.recorded_date),
    value: Number(s.net_worth),
  }))

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const allPositive = min >= 0
  const strokeColor = allPositive ? '#6366f1' : min < 0 && max <= 0 ? '#f43f5e' : '#6366f1'
  const gradientId = 'nwGrad'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Net Worth</h2>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
