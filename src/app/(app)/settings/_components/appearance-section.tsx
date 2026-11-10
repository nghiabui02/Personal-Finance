'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Section } from './settings-section'

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <circle cx="12" cy="12" r="4"/>
    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <path strokeLinecap="round" d="M8 21h8M12 17v4"/>
  </svg>
)

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  Icon: SunIcon  },
  { value: 'dark',   label: 'Dark',   Icon: MoonIcon },
  { value: 'system', label: 'Device', Icon: MonitorIcon },
] as const

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  // The stored theme is unknown on the server, so nothing is drawn until the
  // browser has mounted — otherwise the wrong option flashes as selected.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <Section title="Appearance">
      {mounted && (
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-hairline text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <Icon />
                <span className="text-xs font-medium">{label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-fill" />}
              </button>
            )
          })}
        </div>
      )}
    </Section>
  )
}
