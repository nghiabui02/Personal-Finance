'use client'

import { useState } from 'react'
import { LOW_CONFIDENCE, parseTransactionText, type ParsedDraft } from '@/lib/api/parse-transaction'

/**
 * One line in, a filled-in form out — "cà phê 35k vcb", or a pasted bank SMS.
 *
 * It only fills the form. The user still sees every field and submits, so a
 * misread costs a correction rather than a wrong row in the ledger.
 */
export function QuickParse({ onDraft }: { onDraft: (draft: ParsedDraft) => void }) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  async function run() {
    const value = text.trim()
    if (!value || pending) return

    setPending(true)
    setError(null)
    setHint(null)
    try {
      const draft = await parseTransactionText(value)
      onDraft(draft)
      setText('')
      // A confident read is obvious from the filled-in form; only flag doubt.
      setHint(
        draft.confidence !== null && draft.confidence < LOW_CONFIDENCE
          ? 'Filled in, but check the amount and category.'
          : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); run() }
          }}
          placeholder="cà phê 35k vcb — or paste a bank message"
          disabled={pending}
          className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 pl-3 pr-20 py-2.5 text-sm outline-none focus:border-brand focus:border-solid transition-colors disabled:opacity-60"
        />
        <button
          type="button"
          onClick={run}
          disabled={pending || !text.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          {pending ? 'Reading…' : 'Fill in'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}
