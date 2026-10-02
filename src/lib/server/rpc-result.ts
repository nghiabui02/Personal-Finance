import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Readers for the money functions' results.
 *
 * The functions are moving from returning a bare row or a scalar to returning
 * one envelope that says what changed — a native client needs that to update
 * its own copy of the data. These readers accept both shapes, so the web can
 * deploy before the migration runs and keep working either side of it.
 *
 * Once the migration is applied everywhere, the legacy branches can go.
 */

type Envelope = Record<string, unknown>

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The first transaction row the call created or changed.
 *
 * @param legacy What the old signature returned directly — the row itself.
 */
export function firstTransaction(result: unknown): Envelope | null {
  if (!isEnvelope(result)) return null
  const rows = result.transactions
  if (Array.isArray(rows)) return isEnvelope(rows[0]) ? rows[0] : null
  // Legacy: the function returned the row itself.
  return 'id' in result ? result : null
}

/** A value the envelope carries under `key`, or the whole result when the
 *  function still returns that value on its own. */
export function scalarResult<T>(result: unknown, key: string): T | null {
  if (isEnvelope(result)) {
    return key in result ? (result[key] as T) : null
  }
  return (result ?? null) as T | null
}

/** The debts row a call touched, if any. */
export function debtResult(result: unknown): Envelope | null {
  if (!isEnvelope(result)) return null
  if (isEnvelope(result.debt)) return result.debt
  // Legacy: create_debt returned the debts row itself.
  return 'remaining_amount' in result && !('transactions' in result) ? result : null
}

/**
 * A transaction row with its category and wallet, whichever shape the function
 * returned. The envelope already embeds both; the legacy bare row does not, and
 * costs one extra read.
 */
export async function transactionWithRelations(
  supabase: SupabaseClient,
  result: unknown,
): Promise<unknown> {
  const row = firstTransaction(result)
  if (!row) return result
  if ('categories' in row) return row

  const { data } = await supabase
    .from('transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('id', String(row.id))
    .single()

  return data ?? row
}
