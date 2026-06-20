'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CATEGORIES = [
  {
    key: 'finance', icon: '💰', label: 'Finance & Money',
    emojis: ['💰','💵','💴','💶','💷','💸','💳','🏧','💹','📈','📉','🪙','💎','🏦','📊','💼','🏛️','📋','🤑','💲','💱','🏷️','🧾','📑','🤝','🏪','🏬','🎰','💡','🔐','🗝️','📦','🏺','📬','🧮','⚖️'],
  },
  {
    key: 'food', icon: '🍔', label: 'Food & Drink',
    emojis: ['🍔','🍕','🍣','🍜','🥗','🥘','🍱','☕','🍺','🥤','🍷','🥂','🍦','🎂','🍎','🍊','🥑','🍇','🥩','🧁','🍰','🥐','🍳','🌮','🌯','🍛','🥟','🍤','🥞','🧇'],
  },
  {
    key: 'transport', icon: '🚗', label: 'Transport',
    emojis: ['🚗','🚕','🚌','🚂','✈️','🚢','🛵','🏍️','🚲','🛺','🚐','🚁','⛽','🅿️','🚦','🛣️','🚙','🛻','🚛','🚜','🛴','🛹','⛵','🚀','🚁','🛸'],
  },
  {
    key: 'shopping', icon: '🛍️', label: 'Shopping',
    emojis: ['🛍️','👗','👟','💄','🛒','🎁','👜','👔','💍','🧴','👒','🧤','🎀','👠','🧸','🏪','🛻','👛','🧣','🥿','👞','🎽','🩱','🧢','👓','⌚','💻','📱','📷'],
  },
  {
    key: 'health', icon: '🏥', label: 'Health & Fitness',
    emojis: ['🏥','💊','🏋️','🧘','🩺','💉','🩹','🧬','🏃','🚴','🥊','🛁','🧴','🦷','👁️','🫀','🧠','🩻','🏊','⚽','🎾','🏸','🤸','🧗','🪥','🩺'],
  },
  {
    key: 'fun', icon: '🎮', label: 'Entertainment',
    emojis: ['🎬','🎮','🎵','🎸','🎨','🎭','📺','🎤','🎧','🎲','🎯','♟️','🎳','📸','🎡','🎢','🎪','🎠','🎹','🥁','🎷','🎺','🎻','🪗','🎫','🎟️','🃏','🎴'],
  },
  {
    key: 'home', icon: '🏠', label: 'Home & Living',
    emojis: ['🏠','🏡','🛋️','🔨','🧹','🪴','🛏️','🚿','🧺','🪣','🔑','🪑','🧰','💡','🪟','🚪','🧻','🪒','🛁','🪞','🫧','🧽','🔧','🪛','🔌','💻','📺','🖼️'],
  },
  {
    key: 'education', icon: '📚', label: 'Education',
    emojis: ['📚','✏️','🎓','📝','🔬','💻','📱','🖥️','⌨️','📐','📏','🖊️','📖','🔭','🧪','📡','🧑‍💻','📓','📔','📒','📃','📄','📑','📊','📈','📉','🗂️','📁'],
  },
  {
    key: 'travel', icon: '🌍', label: 'Travel',
    emojis: ['🌴','🏖️','⛺','🗺️','🧳','🏔️','🗼','🗽','🏰','🎡','🌍','🧭','🏕️','🌅','🏄','🤿','🛂','🏨','🗿','🌋','🏜️','🌊','⛰️','🌁','🗾','🌐','🏟️','🎑'],
  },
  {
    key: 'other', icon: '⭐', label: 'Symbols & Other',
    emojis: ['❤️','✅','⚡','🔥','💡','⭐','🌙','☀️','🌈','🎊','🎉','🍀','🌸','🦋','🐕','🐈','🌺','🪄','🔔','📣','💬','🔖','📌','📍','🏁','🚩','🏳️','♻️','⚠️','🆕','✨','💫','🌟'],
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

const ALL_EMOJIS = CATEGORIES.flatMap(c => c.emojis)

interface EmojiPickerInputProps {
  label: string
  name: string
  defaultValue?: string
}

export function EmojiPickerInput({ label, name, defaultValue = '' }: EmojiPickerInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('finance')
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useCallback((node: HTMLInputElement | null) => {
    if (node) setTimeout(() => node.focus(), 0)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (open) { setOpen(false); return }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - r.bottom < 340)
    }
    setQuery('')
    setOpen(true)
  }

  function select(emoji: string) {
    setValue(emoji === value ? '' : emoji)
    setOpen(false)
    setQuery('')
  }

  const filteredEmojis = query.trim()
    ? ALL_EMOJIS.filter(e => {
        // Match by pasting actual emoji
        if (query.trim() === e) return true
        return false
      })
    : null

  // For text search, we do a simple name-based approach via keyword map
  const searchResults = query.trim() ? getSearchResults(query) : null
  const displayedEmojis = searchResults ?? CATEGORIES.find(c => c.key === activeCategory)!.emojis
  const sectionLabel = query.trim() ? `Results for "${query}"` : CATEGORIES.find(c => c.key === activeCategory)!.label

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />

      {/* Trigger + Panel wrapper */}
      <div className="relative">
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
          <span className="text-gray-400 text-sm">Choose emoji</span>
        )}
        {value && (
          <span className="text-gray-400 text-sm">Change</span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          className={`ml-auto text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>

      {/* Picker panel */}
      {open && (
        <div
          className="absolute z-[200] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden flex flex-col"
          style={{
            width: '100%',
            maxHeight: 340,
            left: 0,
            ...(openUpward ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
          }}
        >
          {/* Search */}
          <div className="px-2.5 pt-2.5 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search all emoji"
                className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              {query && (
                <button type="button" onMouseDown={e => { e.preventDefault(); setQuery('') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          {!query && (
            <div className="flex items-center gap-0.5 px-2 pb-1 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  title={cat.label}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 text-base w-8 h-7 rounded flex items-center justify-center transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-blue-50 dark:bg-blue-950/50'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Section label */}
          <div className="px-3 pt-2 pb-1 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{sectionLabel}</p>
          </div>

          {/* Emoji grid */}
          <div className="overflow-y-auto flex-1 px-2 pb-2">
            {displayedEmojis.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No emoji found</p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {displayedEmojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
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
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Simple keyword-based emoji search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '💰': ['money','cash','bag','finance','dollar'],
  '💵': ['dollar','bill','money','cash','usd'],
  '💴': ['yen','japan','money','cash'],
  '💶': ['euro','europe','money','cash'],
  '💷': ['pound','uk','money','cash','gbp'],
  '💸': ['spend','flying money','cash','payment'],
  '💳': ['card','credit','debit','payment','bank'],
  '🏧': ['atm','cash','bank','withdraw'],
  '💹': ['chart','yen','profit','stock','market'],
  '📈': ['chart','growth','increase','profit','stock','trend','up'],
  '📉': ['chart','decline','decrease','loss','stock','trend','down'],
  '🪙': ['coin','money','gold','currency'],
  '💎': ['diamond','gem','luxury','expensive','value'],
  '🏦': ['bank','finance','building','money'],
  '📊': ['chart','bar','report','statistics','data'],
  '💼': ['briefcase','work','business','office','job'],
  '🏛️': ['bank','government','building','finance'],
  '📋': ['clipboard','list','report','notes'],
  '🤑': ['money face','rich','cash','greedy'],
  '💲': ['dollar','currency','money'],
  '💱': ['exchange','currency','convert','forex'],
  '🏷️': ['tag','price','label','sale'],
  '🧾': ['receipt','bill','invoice','purchase'],
  '📑': ['invoice','document','file','paper'],
  '🤝': ['handshake','deal','agreement','partnership'],
  '🏪': ['store','shop','market','convenience'],
  '🏬': ['department store','mall','shopping'],
  '🎰': ['slot','gamble','casino','luck'],
  '💡': ['idea','light','tip','clever'],
  '🔐': ['lock','secure','private','safe'],
  '🗝️': ['key','access','lock','unlock'],
  '📦': ['box','package','delivery','shipping'],
  '🧮': ['abacus','calculate','math','count'],
  '⚖️': ['scale','balance','justice','law','weight'],
  '🍔': ['burger','food','meal','lunch','fast food'],
  '🍕': ['pizza','food','italian','meal'],
  '🍣': ['sushi','japanese','food','fish'],
  '🍜': ['noodle','ramen','food','asian','soup'],
  '☕': ['coffee','drink','morning','cafe','tea'],
  '🍺': ['beer','drink','alcohol','pub'],
  '🍷': ['wine','drink','alcohol','red'],
  '🎂': ['cake','birthday','celebration','dessert'],
  '🚗': ['car','drive','auto','vehicle','transport'],
  '✈️': ['plane','flight','travel','air','airline'],
  '🚌': ['bus','transit','transport','public'],
  '🚂': ['train','rail','transit','travel'],
  '⛽': ['gas','fuel','petrol','station'],
  '🛍️': ['shopping','bag','purchase','buy'],
  '🎁': ['gift','present','birthday','surprise'],
  '👗': ['dress','clothes','fashion','outfit'],
  '👟': ['shoes','sneaker','sport','wear'],
  '💄': ['lipstick','makeup','beauty','cosmetic'],
  '🛒': ['cart','shopping','grocery','buy'],
  '🏥': ['hospital','health','medical','clinic'],
  '💊': ['pill','medicine','drug','pharmacy'],
  '🏋️': ['gym','workout','fitness','exercise','weights'],
  '🧘': ['yoga','meditation','relax','mindful'],
  '🏠': ['home','house','property','real estate'],
  '🛋️': ['sofa','furniture','couch','living room'],
  '🔑': ['key','lock','access','home'],
  '📚': ['books','study','education','read','school'],
  '✏️': ['pencil','write','edit','draw'],
  '🎓': ['graduation','degree','university','study'],
  '💻': ['laptop','computer','tech','work','code'],
  '🌍': ['world','earth','globe','travel','international'],
  '🧳': ['luggage','travel','trip','suitcase'],
  '✅': ['check','done','complete','yes','tick'],
  '⚡': ['lightning','fast','energy','electric','power'],
  '🔥': ['fire','hot','trending','popular'],
  '⭐': ['star','favorite','rating','best'],
  '🎉': ['party','celebrate','confetti','fun'],
  '🎊': ['celebrate','party','event'],
  '♻️': ['recycle','environment','green','eco'],
  '📱': ['phone','mobile','smartphone','app'],
  '🏃': ['run','exercise','sport','fitness','jog'],
  '🚴': ['bike','cycle','sport','exercise','bicycle'],
  '🎬': ['movie','film','cinema','entertainment'],
  '🎮': ['game','gaming','play','controller'],
  '🎵': ['music','song','note','audio'],
  '🎨': ['art','paint','creative','design'],
}

function getSearchResults(q: string): string[] {
  const lq = q.toLowerCase().trim()
  const all = CATEGORIES.flatMap(c => c.emojis)
  const unique = [...new Set(all)]
  return unique.filter(emoji => {
    if (emoji.includes(lq)) return true
    const keywords = EMOJI_KEYWORDS[emoji] ?? []
    return keywords.some(k => k.includes(lq))
  })
}
