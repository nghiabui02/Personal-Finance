'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPanel, useOutsideClose } from './use-anchored-panel'

const CATEGORIES = [
  {
    key: 'finance', icon: '💰', label: 'Finance & Money', shortLabel: 'Money',
    emojis: ['💰','💵','💴','💶','💷','💸','💳','🏧','💹','📈','📉','🪙','💎','🏦','📊','💼','🏛️','📋','🤑','💲','💱','🏷️','🧾','📑','🤝','🏪','🏬','🎰','💡','🔐','🗝️','📦','🏺','📬','🧮','⚖️'],
  },
  {
    key: 'food', icon: '🍔', label: 'Food & Drink', shortLabel: 'Food',
    emojis: ['🍔','🍕','🍣','🍜','🥗','🥘','🍱','☕','🍺','🥤','🍷','🥂','🍦','🎂','🍎','🍊','🥑','🍇','🥩','🧁','🍰','🥐','🍳','🌮','🌯','🍛','🥟','🍤','🥞','🧇'],
  },
  {
    key: 'transport', icon: '🚗', label: 'Transport', shortLabel: 'Transport',
    emojis: ['🚗','🚕','🚌','🚂','✈️','🚢','🛵','🏍️','🚲','🛺','🚐','🚁','⛽','🅿️','🚦','🛣️','🚙','🛻','🚛','🚜','🛴','🛹','⛵','🚀','🚁','🛸'],
  },
  {
    key: 'shopping', icon: '🛍️', label: 'Shopping', shortLabel: 'Shopping',
    emojis: ['🛍️','👗','👟','💄','🛒','🎁','👜','👔','💍','🧴','👒','🧤','🎀','👠','🧸','🏪','🛻','👛','🧣','🥿','👞','🎽','🩱','🧢','👓','⌚','💻','📱','📷'],
  },
  {
    key: 'health', icon: '🏥', label: 'Health & Fitness', shortLabel: 'Health',
    emojis: ['🏥','💊','🏋️','🧘','🩺','💉','🩹','🧬','🏃','🚴','🥊','🛁','🧴','🦷','👁️','🫀','🧠','🩻','🏊','⚽','🎾','🏸','🤸','🧗','🪥','🩺'],
  },
  {
    key: 'fun', icon: '🎮', label: 'Entertainment', shortLabel: 'Fun',
    emojis: ['🎬','🎮','🎵','🎸','🎨','🎭','📺','🎤','🎧','🎲','🎯','♟️','🎳','📸','🎡','🎢','🎪','🎠','🎹','🥁','🎷','🎺','🎻','🪗','🎫','🎟️','🃏','🎴'],
  },
  {
    key: 'home', icon: '🏠', label: 'Home & Living', shortLabel: 'Home',
    emojis: ['🏠','🏡','🛋️','🔨','🧹','🪴','🛏️','🚿','🧺','🪣','🔑','🪑','🧰','💡','🪟','🚪','🧻','🪒','🛁','🪞','🫧','🧽','🔧','🪛','🔌','💻','📺','🖼️'],
  },
  {
    key: 'education', icon: '📚', label: 'Education', shortLabel: 'Study',
    emojis: ['📚','✏️','🎓','📝','🔬','💻','📱','🖥️','⌨️','📐','📏','🖊️','📖','🔭','🧪','📡','🧑‍💻','📓','📔','📒','📃','📄','📑','📊','📈','📉','🗂️','📁'],
  },
  {
    key: 'travel', icon: '🌍', label: 'Travel', shortLabel: 'Travel',
    emojis: ['🌴','🏖️','⛺','🗺️','🧳','🏔️','🗼','🗽','🏰','🎡','🌍','🧭','🏕️','🌅','🏄','🤿','🛂','🏨','🗿','🌋','🏜️','🌊','⛰️','🌁','🗾','🌐','🏟️','🎑'],
  },
  {
    key: 'other', icon: '⭐', label: 'Symbols & Other', shortLabel: 'Other',
    emojis: ['❤️','✅','⚡','🔥','💡','⭐','🌙','☀️','🌈','🎊','🎉','🍀','🌸','🦋','🐕','🐈','🌺','🪄','🔔','📣','💬','🔖','📌','📍','🏁','🚩','🏳️','♻️','⚠️','🆕','✨','💫','🌟'],
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

const ALL_EMOJIS = CATEGORIES.flatMap(c => c.emojis)

const PANEL_HEIGHT = 268
/** Eight columns of emoji need this much room, whatever the field's width. */
const PANEL_MIN_WIDTH = 288

interface EmojiPickerInputProps {
  label: string
  name: string
  defaultValue?: string
}

export function EmojiPickerInput({ label, name, defaultValue = '' }: EmojiPickerInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('finance')
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useCallback((node: HTMLInputElement | null) => {
    if (node) setTimeout(() => node.focus(), 0)
  }, [])

  const { triggerRef, panelRef, pos, reposition } = useAnchoredPanel<HTMLButtonElement>(
    open, { height: PANEL_HEIGHT, minWidth: PANEL_MIN_WIDTH },
  )
  const close = useCallback(() => { setOpen(false); setQuery('') }, [])
  useOutsideClose(ref, panelRef, close)

  function handleOpen() {
    if (open) { close(); return }
    setQuery('')
    reposition()
    setOpen(true)
  }

  function select(emoji: string) {
    setValue(emoji === value ? '' : emoji)
    setOpen(false)
    setQuery('')
  }

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

      <div
        className={`w-full flex items-center rounded-lg border transition-colors ${
          open
            ? 'border-brand'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } bg-white dark:bg-gray-800`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex-1 min-w-0 h-[40px] flex items-center gap-2 px-3 text-sm text-left outline-none"
        >
          {value
            ? <span className="text-xl leading-none">{value}</span>
            : <span className="text-gray-400 text-sm">Choose emoji</span>}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            className={`ml-auto text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
          </svg>
        </button>
        {/* Clearing shouldn't mean hunting down the chosen emoji to click it again */}
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="Remove icon"
            title="Remove icon"
            className="self-stretch px-2.5 text-gray-400 hover:text-rose-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Picker panel */}
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden flex flex-col animate-dropdown-in"
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            maxHeight: PANEL_HEIGHT,
          }}
        >
          {/* Search */}
          <div className="p-2 shrink-0">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="money, food, car…"
                className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              {query && (
                <button type="button" onMouseDown={e => { e.preventDefault(); setQuery('') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category tabs — named, because a row of emoji reads as more emoji,
              not as navigation. The active one also serves as the section label. */}
          {!query ? (
            <div className="flex items-center gap-1 px-2 pb-2 shrink-0 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-brand-soft text-brand'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  {cat.shortLabel}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 shrink-0">
              {sectionLabel}
            </p>
          )}

          {/* Emoji grid */}
          <div className="overflow-y-auto flex-1 px-2 pb-2 border-t border-hairline pt-2">
            {displayedEmojis.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">Nothing matches that.</p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {displayedEmojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    type="button"
                    onClick={() => select(emoji)}
                    className={`text-xl p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 aspect-square flex items-center justify-center ${
                      value === emoji ? 'bg-brand-soft' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
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
  const unique = [...new Set(ALL_EMOJIS)]
  return unique.filter(emoji => {
    if (emoji.includes(lq)) return true
    const keywords = EMOJI_KEYWORDS[emoji] ?? []
    return keywords.some(k => k.includes(lq))
  })
}
