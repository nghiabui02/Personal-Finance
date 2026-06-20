import { apiFetch } from './client'

export type DebtPayment = {
  id: string
  amount: number
  note: string | null
  paid_at: string
  type: 'payment' | 'addition'
}

export type Debt = {
  id: string
  user_id: string
  wallet_id: string | null
  type: 'lend' | 'borrow'
  person_name: string
  person_contact: string | null
  amount: number
  remaining_amount: number
  due_date: string | null
  status: 'active' | 'completed' | 'overdue'
  note: string | null
  debt_payments: DebtPayment[]
  wallets: { id: string; name: string } | null
}

export const debtsApi = {
  list(): Promise<Debt[]> {
    return apiFetch('/api/debts')
  },

  create(payload: {
    type: 'lend' | 'borrow'
    person_name: string
    person_contact?: string
    amount: number
    wallet_id?: string
    date?: string      // date of the debt — defaults to today on server
    due_date?: string
    note?: string
  }): Promise<Debt> {
    return apiFetch('/api/debts', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: {
    person_name: string
    person_contact?: string
    due_date?: string
    note?: string
  }): Promise<Debt> {
    return apiFetch(`/api/debts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/debts/${id}`, { method: 'DELETE' })
  },

  addPayment(id: string, payload: { amount: number; note?: string; wallet_id?: string; date?: string }): Promise<{ remaining_amount: number; settled: boolean }> {
    return apiFetch(`/api/debts/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) })
  },

  addDebt(id: string, payload: { amount: number; note?: string; date?: string; wallet_id?: string }): Promise<{ amount: number; remaining_amount: number }> {
    return apiFetch(`/api/debts/${id}/additions`, { method: 'POST', body: JSON.stringify(payload) })
  },
}
