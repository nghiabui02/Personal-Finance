'use client'

import { useEffect, useRef, useState } from 'react'

const CATEGORIES = [
  {
    key: 'money', icon: '💰', label: 'Money',
    emojis: ['💰','💵','💴','💶','💷','💸','💳','🏧','💹','📈','📉','🪙','💎','🏦','📊','💼','🏛️','📋'],
  },
  {
    key: 'food', icon: '🍔', label: 'Food',
    emojis: ['🍔','🍕','🍣','🍜','🥗','🥘','🍱','☕','🍺','🥤','🍷','🥂','🍦','🎂','🍎','🍊','🥑','🍇','🥩','🧁'],
  },
  {
    key: 'transport', icon: '🚗', label: 'Transport',
    emojis: ['🚗','🚕','🚌','🚂','✈️','🚢','🛵','🏍','🚲','🛺','🚐','🚁','⛽','🅿️','🚦','🛣️'],
  },
  {
    key: 'shopping', icon: '🛍️', label: 'Shopping',
    emojis: ['🛍️','👗','👟','💄','🛒','🎁','👜','👔','💍','🧴','👒','🧤','🎀','👠','🧸','🛻','🏪'],
  },
  {
    key: 'health', icon: '🏥', label: 'Health',
    emojis: ['🏥','💊','🏋️','🧘','🩺','💉','🩹','🧬','🏃','🚴','🥊','🛁','🧴','🦷','👁️','🫀'],
  },
  {
    key: 'fun', icon: '🎮', label: 'Fun',
    emojis: ['🎬','🎮','🎵','🎸','🎨','🎭','📺','🎤','🎧','🎲','🎯','♟️','🎳','📸','🎡','🎢'],
  },
  {
    key: 'home', icon: '🏠', label: 'Home',
    emojis: ['🏠','🏡','🛋️','🔨','🧹','🪴','🛏️','🚿','🧺','🪣','🔑','🪑','🧰','💡','🪟','🚪'],
  },
  {
    key: 'education', icon: '📚', label: 'Study',
    emojis: ['📚','✏️','🎓','📝','🔬','💻','📱','🖥️','⌨️','📐','📏','🖊️','📖','🔭','🧪','📡'],
  },
  {
    key: 'travel', icon: '🌍', label: 'Travel',
    emojis: ['🌴','🏖️','⛺','🗺️','🧳','🏔️','🗼','🗽','🏰','🎡','🌍','🧭','🏕️','🌅','🏄','🤿'],
  },
  {
    key: 'other', icon: '⭐', label: 'Other',
    emojis: ['❤️','✅','⚡','🔥','💡','⭐','🌙','☀️','🌈','🎊','🎉','🍀','🌸','🦋','🐕','🐈','🌺','🪄'],
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

interface EmojiPickerInputProps {
  label: string
  name: string
  defaultValue?: string
}

export function EmojiPickerInput({ label, name, defaultValue = '' }: EmojiPickerInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(CATEGORIES[0].key)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - rect.bottom < 300)
    }
    setOpen(v => !v)
  }

  function select(emoji: string) {
    setValue(emoji === value ? '' : emoji)
    setOpen(false)
  }

  const current = CATEGORIES.find(c => c.key === activeCategory) ?? CATEGORIES[0]

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors outline-none ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } bg-white dark:bg-gray-800`}
      >
        {value ? (
          <span className="text-xl leading-none">{value}</span>
        ) : (
          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
          </span>
        )}
        <span className={value ? 'text-gray-600 dark:text-gray-400 text-sm' : 'text-gray-400 text-sm'}>
          {value ? 'Selected' : 'Choose emoji'}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          className={`ml-auto text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>

      {/* Picker panel */}
      {open && (
        <div className={`absolute z-50 left-0 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden ${
          openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {/* Custom emoji input */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg shrink-0">
              {value || <span className="text-gray-300 text-xs">?</span>}
            </div>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Type or paste emoji…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 min-w-0"
            />
            {value && (
              <button
                type="button"
                onClick={() => setValue('')}
                className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 shrink-0 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-1 pt-1 gap-px overflow-x-auto scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                title={cat.label}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 text-base px-1.5 py-1 rounded-t-md transition-colors ${
                  activeCategory === cat.key
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500'
                }`}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-7 gap-px p-2">
            {current.emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => select(emoji)}
                className={`text-xl p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 aspect-square flex items-center justify-center ${
                  value === emoji ? 'bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-400' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
