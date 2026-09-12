/**
 * Narrowing a transaction list by more than its date range.
 *
 * The same filters apply whether the screen is showing a period or the results
 * of a note search, so they live apart from either query and are applied on top
 * of whichever one runs.
 */

export interface TransactionFilters {
  type?: 'income' | 'expense'
  categoryId?: string
  walletId?: string
  /** Inclusive bounds on `amount`. */
  min?: number
  max?: number
}

export interface TransactionFilterParams {
  type?: string
  cat?: string
  wallet?: string
  min?: string
  max?: string
}

function positiveNumber(raw?: string): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function parseTransactionFilters(params: TransactionFilterParams): TransactionFilters {
  const min = positiveNumber(params.min)
  const max = positiveNumber(params.max)

  return {
    type: params.type === 'income' || params.type === 'expense' ? params.type : undefined,
    categoryId: params.cat || undefined,
    walletId: params.wallet || undefined,
    // A reversed range would silently return nothing; treat it as one bound.
    min: max !== undefined && min !== undefined && min > max ? max : min,
    max: max !== undefined && min !== undefined && min > max ? min : max,
  }
}

/** Chainable PostgREST builder — narrow enough to keep this file client-free. */
interface FilterableQuery<T> {
  eq(column: string, value: string): T
  gte(column: string, value: number): T
  lte(column: string, value: number): T
}

export function applyTransactionFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: TransactionFilters,
): T {
  let q = query
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
  if (filters.walletId) q = q.eq('wallet_id', filters.walletId)
  if (filters.min !== undefined) q = q.gte('amount', filters.min)
  if (filters.max !== undefined) q = q.lte('amount', filters.max)
  return q
}

export function countActiveFilters(filters: TransactionFilters): number {
  return Object.values(filters).filter(v => v !== undefined).length
}
