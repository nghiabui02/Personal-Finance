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
}

export function TabGroup<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: TabGroupProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  // Measure the active tab's position and size after paint
  const updatePill = () => {
    const container = containerRef.current
    if (!container) return
    const btn = container.querySelector<HTMLElement>(`[data-key="${value}"]`)
    if (!btn) return
    setPill({ left: btn.offsetLeft, width: btn.offsetWidth })
  }

  useLayoutEffect(updatePill, [value])

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  })

  return (
    <div
      ref={containerRef}
      className={`relative flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg ${className}`}
    >
      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-200 ease-out pointer-events-none"
        style={{ left: pill.left, width: pill.width }}
      />

      {tabs.map(tab => (
        <button
          key={tab.key}
          data-key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`relative z-10 flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
            value === tab.key
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
