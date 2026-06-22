import { apiFetch } from './client'

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
}
