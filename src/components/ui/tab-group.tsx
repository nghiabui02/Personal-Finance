'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Tab<T extends string> {
  key: T
  label: string
}

interface TabGroupProps<T extends string> {
  tabs: Tab<T>[]
  value: T
  onChange: (key: T) => void
  className?: string
  /** Hex color per tab key for the active pill, e.g. { expense: '#ef4444', income: '#22c55e' } */
  activeColors?: Partial<Record<T, string>>
  /** Hex text color per tab key for the active label — pill stays white, only the label is tinted */
  activeTextColors?: Partial<Record<T, string>>
  size?: 'md' | 'lg'
}

export function TabGroup<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
  activeColors,
  activeTextColors,
  size = 'md',
}: TabGroupProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  const updatePill = () => {
    const container = containerRef.current
    if (!container) return
    const btn = container.querySelector<HTMLElement>(`[data-key="${value}"]`)
    if (!btn) return
    setPill({ left: btn.offsetLeft, width: btn.offsetWidth })
  }

  useLayoutEffect(updatePill, [value])

  useEffect(() => {
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  })

  const pillColor = activeColors?.[value]
  const isLg = size === 'lg'

  return (
    <div
      ref={containerRef}
      className={`relative flex bg-gray-100 dark:bg-gray-800 p-1 ${isLg ? 'rounded-xl' : 'rounded-lg'} ${className}`}
    >
      {/* Sliding pill — position + color both transition smoothly */}
      <div
        className={`absolute top-1 bottom-1 ${isLg ? 'rounded-lg' : 'rounded-md'} shadow-sm transition-all duration-200 ease-out pointer-events-none ${
          pillColor ? '' : 'bg-white dark:bg-gray-700'
        }`}
        style={{
          left: pill.left,
          width: pill.width,
          ...(pillColor ? { backgroundColor: pillColor } : {}),
        }}
      />

      {tabs.map(tab => {
        const isActive = value === tab.key
        const textColor = isActive ? activeTextColors?.[tab.key] : undefined
        return (
          <button
            key={tab.key}
            data-key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={textColor ? { color: textColor } : undefined}
            className={`relative z-10 flex-1 px-3 ${isLg ? 'py-2.5' : 'py-1.5'} text-sm font-medium ${isLg ? 'rounded-lg' : 'rounded-md'} transition-colors duration-150 whitespace-nowrap ${
              isActive
                ? textColor ? '' : activeColors ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
