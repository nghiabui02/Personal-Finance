// Shared view-model shapes used across pages, API routes and client components.
// Full row types for API payloads live in src/lib/api/*.

// The `categories(id, name, icon, color)` join selected throughout the app.
export type CategoryRef = {
  id: string
  name: string
  icon: string | null
  color: string | null
}

// Minimal debt info the transaction modal needs to link a payment to a debt.
export type DebtOption = {
  id: string
  type: 'lend' | 'borrow'
  person_name: string
  remaining_amount: number
}

export type NetWorthSnapshot = {
  recorded_date: string
  net_worth: number
}
