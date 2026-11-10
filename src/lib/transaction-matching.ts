/**
 * Reading a draft transaction against the ones already recorded.
 *
 * Two questions share this file because they share the data: "which category
 * did this text get last time" and "did I already record this". Both run on
 * the client over the same recent-history array, so neither costs a round trip
 * while the user types.
 *
 * No imports on purpose — `tests/transaction-matching.test.mjs` runs it under
 * plain Node, the way the CSV parser is tested.
 */

/** The columns both checks need. Richer rows are accepted as they are. */
export interface HistoryTransaction {
  type: string
  amount: number
  note: string | null
  transaction_date: string
  category_id: string | null
  wallet_id: string | null
}

export interface DraftTransaction {
  type: string
  amount: number
  transaction_date: string
  wallet_id: string | null
}

/** One-letter words carry no meaning and match far too much. */
const MIN_WORD_LENGTH = 2

/** Share of the typed words a past note must cover to count as the same spend. */
const MIN_WORD_OVERLAP = 0.6

/**
 * Lowercased words, accents removed, punctuation dropped.
 *
 * "Cà phê" and "ca phe" are the same spend typed two ways, and a phone keyboard
 * produces both. NFD strips the combining accents; `đ` has no decomposition of
 * its own and needs the explicit pass.
 */
export function normalizeWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= MIN_WORD_LENGTH)
}

/**
 * A past note's words, worked out once per row. The history array outlives
 * every keystroke and every row of an import preview, and normalising a
 * thousand notes again for each of those is where the time went.
 */
const noteWords = new WeakMap<HistoryTransaction, string[]>()

function wordsOfNote(past: HistoryTransaction): string[] {
  let words = noteWords.get(past)
  if (!words) {
    words = normalizeWords(past.note ?? '')
    noteWords.set(past, words)
  }
  return words
}

function overlap(words: string[], against: string[]): number {
  if (words.length === 0 || against.length === 0) return 0
  const other = new Set(against)
  const shared = words.filter(word => other.has(word)).length
  return shared / words.length
}

/**
 * The category this text was filed under before, or null when history does not
 * agree. Picks the category that matched most often, so one odd entry does not
 * outvote a habit.
 */
export function suggestCategoryId(text: string, history: HistoryTransaction[]): string | null {
  const words = normalizeWords(text)
  if (words.length === 0) return null

  const scores = new Map<string, { hits: number; best: number }>()

  for (const past of history) {
    if (!past.category_id || !past.note) continue
    const score = overlap(words, wordsOfNote(past))
    if (score < MIN_WORD_OVERLAP) continue
    const current = scores.get(past.category_id) ?? { hits: 0, best: 0 }
    scores.set(past.category_id, {
      hits: current.hits + 1,
      best: Math.max(current.best, score),
    })
  }

  let winner: string | null = null
  let top = { hits: 0, best: 0 }
  for (const [categoryId, score] of scores) {
    if (score.hits > top.hits || (score.hits === top.hits && score.best > top.best)) {
      winner = categoryId
      top = score
    }
  }
  return winner
}

/**
 * A transaction already recorded for the same day, wallet, direction and
 * amount — the shape a double entry takes when the same spend is typed twice,
 * or typed once and then imported from the bank.
 *
 * Deliberately exact: a near-match warning on every similar coffee would be
 * dismissed without reading, and then the real duplicate would be too.
 */
export function findDuplicate(
  draft: DraftTransaction,
  history: HistoryTransaction[],
): HistoryTransaction | null {
  if (!draft.amount || !draft.wallet_id) return null
  return history.find(past =>
    past.transaction_date === draft.transaction_date &&
    past.wallet_id === draft.wallet_id &&
    past.type === draft.type &&
    Number(past.amount) === draft.amount,
  ) ?? null
}
