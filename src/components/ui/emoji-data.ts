import { normalizeSearch } from '@/i18n/category'

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
  '💰': ['money','tiền','tài chính','cash','tiền mặt','bag','finance','dollar'],
  '💵': ['dollar','bill','hóa đơn','money','tiền','tài chính','cash','tiền mặt','usd'],
  '💴': ['yen','japan','money','tiền','tài chính','cash','tiền mặt'],
  '💶': ['euro','europe','money','tiền','tài chính','cash','tiền mặt'],
  '💷': ['pound','uk','money','tiền','tài chính','cash','tiền mặt','gbp'],
  '💸': ['spend','flying money','cash','tiền mặt','payment'],
  '💳': ['card','thẻ','credit','tín dụng','debit','payment','bank','ngân hàng'],
  '🏧': ['atm','cash','tiền mặt','bank','ngân hàng','withdraw'],
  '💹': ['chart','yen','profit','stock','cổ phiếu','market'],
  '📈': ['chart','growth','increase','profit','stock','cổ phiếu','trend','up'],
  '📉': ['chart','decline','decrease','loss','stock','cổ phiếu','trend','down'],
  '🪙': ['coin','money','tiền','tài chính','gold','currency'],
  '💎': ['diamond','gem','luxury','expensive','value'],
  '🏦': ['bank','ngân hàng','finance','building','money','tiền','tài chính'],
  '📊': ['chart','bar','report','statistics','data'],
  '💼': ['briefcase','work','công việc','business','office','job'],
  '🏛️': ['bank','ngân hàng','government','building','finance'],
  '📋': ['clipboard','list','report','notes'],
  '🤑': ['money face','rich','cash','tiền mặt','greedy'],
  '💲': ['dollar','currency','money','tiền','tài chính'],
  '💱': ['exchange','currency','convert','forex'],
  '🏷️': ['tag','price','label','sale'],
  '🧾': ['receipt','bill','hóa đơn','invoice','purchase'],
  '📑': ['invoice','document','file','paper'],
  '🤝': ['handshake','deal','agreement','partnership'],
  '🏪': ['store','shop','market','convenience'],
  '🏬': ['department store','mall','shopping','mua sắm'],
  '🎰': ['slot','gamble','casino','luck'],
  '💡': ['idea','light','tip','clever'],
  '🔐': ['lock','secure','private','safe'],
  '🗝️': ['key','access','lock','unlock'],
  '📦': ['box','package','delivery','shipping'],
  '🧮': ['abacus','calculate','math','count'],
  '⚖️': ['scale','balance','justice','law','weight'],
  '🍔': ['burger','food','đồ ăn','ăn uống','meal','lunch','fast food'],
  '🍕': ['pizza','food','đồ ăn','ăn uống','italian','meal'],
  '🍣': ['sushi','japanese','food','đồ ăn','ăn uống','fish'],
  '🍜': ['noodle','mì','phở','ramen','food','đồ ăn','ăn uống','asian','soup'],
  '☕': ['coffee','cà phê','drink','đồ uống','morning','cafe','tea'],
  '🍺': ['beer','bia','drink','đồ uống','alcohol','pub'],
  '🍷': ['wine','drink','đồ uống','alcohol','red'],
  '🎂': ['cake','birthday','celebration','dessert'],
  '🚗': ['car','xe','ô tô','drive','auto','vehicle','transport'],
  '✈️': ['plane','máy bay','flight','travel','du lịch','air','airline'],
  '🚌': ['bus','xe buýt','transit','transport','public'],
  '🚂': ['train','rail','transit','travel','du lịch'],
  '⛽': ['gas','fuel','xăng','petrol','station'],
  '🛍️': ['shopping','mua sắm','bag','purchase','buy'],
  '🎁': ['gift','quà','present','birthday','surprise'],
  '👗': ['dress','clothes','fashion','outfit'],
  '👟': ['shoes','sneaker','sport','thể thao','wear'],
  '💄': ['lipstick','makeup','beauty','cosmetic'],
  '🛒': ['cart','shopping','mua sắm','grocery','buy'],
  '🏥': ['hospital','bệnh viện','health','sức khỏe','medical','clinic'],
  '💊': ['pill','medicine','thuốc','drug','pharmacy'],
  '🏋️': ['gym','workout','fitness','exercise','weights'],
  '🧘': ['yoga','meditation','relax','mindful'],
  '🏠': ['home','nhà','house','nhà ở','property','real estate'],
  '🛋️': ['sofa','furniture','couch','living room'],
  '🔑': ['key','lock','access','home','nhà'],
  '📚': ['books','study','education','học tập','read','school','trường học'],
  '✏️': ['pencil','write','edit','draw'],
  '🎓': ['graduation','degree','university','study'],
  '💻': ['laptop','computer','tech','work','công việc','code'],
  '🌍': ['world','earth','globe','travel','du lịch','international'],
  '🧳': ['luggage','travel','du lịch','trip','suitcase'],
  '✅': ['check','done','complete','yes','tick'],
  '⚡': ['lightning','fast','energy','electric','điện','power'],
  '🔥': ['fire','hot','trending','popular'],
  '⭐': ['star','favorite','rating','best'],
  '🎉': ['party','celebrate','confetti','fun'],
  '🎊': ['celebrate','party','event'],
  '♻️': ['recycle','environment','green','eco'],
  '📱': ['phone','điện thoại','mobile','smartphone','app'],
  '🏃': ['run','exercise','sport','thể thao','fitness','jog'],
  '🚴': ['bike','xe đạp','xe máy','cycle','sport','thể thao','exercise','bicycle'],
  '🎬': ['movie','phim','film','cinema','entertainment'],
  '🎮': ['game','trò chơi','gaming','play','controller'],
  '🎵': ['music','âm nhạc','song','note','audio'],
  '🎨': ['art','paint','creative','design'],
}

export function getSearchResults(q: string): string[] {
  const lq = normalizeSearch(q.trim())
  const unique = [...new Set(ALL_EMOJIS)]
  return unique.filter(emoji => {
    if (emoji.includes(lq)) return true
    const keywords = EMOJI_KEYWORDS[emoji] ?? []
    return keywords.some(k => normalizeSearch(k).includes(lq))
  })
}
