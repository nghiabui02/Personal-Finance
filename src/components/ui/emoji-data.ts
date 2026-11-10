/**
 * The emojis a category can be given, grouped for browsing, and the search
 * over them. Plain data and one pure function — no React — so the picker's
 * component file holds only the component.
 */

export const CATEGORIES = [
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

export type CategoryKey = typeof CATEGORIES[number]['key']

const ALL_EMOJIS = CATEGORIES.flatMap(c => c.emojis)

/** Emojis whose own text or one of whose keywords contains the query. */
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

export function getSearchResults(q: string): string[] {
  const lq = q.toLowerCase().trim()
  const unique = [...new Set(ALL_EMOJIS)]
  return unique.filter(emoji => {
    if (emoji.includes(lq)) return true
    const keywords = EMOJI_KEYWORDS[emoji] ?? []
    return keywords.some(k => k.includes(lq))
  })
}
