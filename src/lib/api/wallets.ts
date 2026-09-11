import { apiFetch } from './client'
import type { CategoryRef } from '@/lib/types'

export type Wallet = {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'e_wallet' | 'investment' | 'other' | 'credit'
  balance: number
  color: string | null
  icon: string | null
  is_default: boolean
  credit_limit: number | null
  statement_day: number | null
  payment_due_day: number | null
}

export const WALLET_TYPE_LABELS: Record<Wallet['type'], string> = {
  cash: 'Cash',
  bank: 'Bank Account',
  e_wallet: 'E-Wallet',
  investment: 'Investment',
  other: 'Other',
  credit: 'Credit Card',
}

export type WalletTransaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string | null
  bank_fee: number | null
  transaction_date: string
  category_id: string | null
  transfer_pair_id: string | null
  categories: CategoryRef | null
}

/** Columns a `Wallet` needs — keep in sync with the type above. */
export const WALLET_COLUMNS = 'id, user_id, name, type, balance, color, icon, is_default, credit_limit, statement_day, payment_due_day'

/** Columns a `WalletTransaction` needs. */
export const WALLET_TX_COLUMNS = 'id, type, amount, note, bank_fee, transaction_date, category_id, transfer_pair_id, categories(id, name, icon, color)'

export const WALLET_TX_PAGE_SIZE = 20

type WalletPayload = {
  name: string
  type: Wallet['type']
  balance: number
  icon?: string
  color?: string
  is_default?: boolean
  credit_limit?: number
  statement_day?: number
  payment_due_day?: number
}

export const walletsApi = {
  list(): Promise<Wallet[]> {
    return apiFetch('/api/wallets')
  },

  create(payload: WalletPayload): Promise<Wallet> {
    return apiFetch('/api/wallets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: WalletPayload): Promise<Wallet> {
    return apiFetch(`/api/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/wallets/${id}`, { method: 'DELETE' })
  },

  transactions(id: string, offset: number): Promise<{ transactions: WalletTransaction[]; hasMore: boolean }> {
    return apiFetch(`/api/wallets/${id}/transactions?offset=${offset}&limit=${WALLET_TX_PAGE_SIZE}`)
  },
}
