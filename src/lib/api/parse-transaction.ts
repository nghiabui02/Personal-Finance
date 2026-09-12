import { apiFetch } from './client'

/**
 * A transaction read out of free text. It is a suggestion: the modal fills in
 * from it and the user confirms, so a misread never reaches the ledger.
 */
export interface ParsedDraft {
  type: 'income' | 'expense'
  amount: number
  category_id: string | null
  wallet_id: string | null
  note: string | null
  date: string | null
  /** 0–1. Below 0.5 the amount or direction was a guess worth flagging. */
  confidence: number | null
}

export const LOW_CONFIDENCE = 0.5

export function parseTransactionText(text: string): Promise<ParsedDraft> {
  return apiFetch('/api/ai/parse-transaction', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}
