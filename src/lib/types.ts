import type { DebtType } from '@/lib/constants'
// Shared view-model shapes used across pages, API routes and client components.
// Full row types for API payloads live in src/lib/api/*.

// Membership metadata returned by CATEGORY_RELATION, including historical reads.
export type CategoryRef = {
  id: string
  name: string | null
  template?: { default_key: string } | null
  system_key?: string | null
  is_active?: boolean
  icon: string | null
  color: string | null
}

// Minimal debt info the transaction modal needs to link a payment to a debt.
export type DebtOption = {
  id: string
  type: DebtType
  person_name: string
  remaining_amount: number
}

export type NetWorthSnapshot = {
  recorded_date: string
  net_worth: number
}
