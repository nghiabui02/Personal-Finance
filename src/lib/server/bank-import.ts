import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CsvError, MAX_CSV_BYTES, isUuid, parseCsv, readStatement,
  type CsvMapping, type StatementRow,
} from '@/lib/imports/bank-csv'

/** Reparse the original file server-side; reviewed amounts and identities cannot be edited. */
export function parseImportRequest(body: unknown) {
  if (!body || typeof body !== 'object') throw new CsvError('Choose a CSV file and a bank wallet.')
  const input = body as Record<string, unknown>
  if (typeof input.csv !== 'string' || input.csv.length > MAX_CSV_BYTES || input.csv.includes('\uFFFD')) {
    throw new CsvError('Choose a UTF-8 CSV file of at most 1 MB.')
  }
  if (!isUuid(input.wallet_id)) {
    throw new CsvError('Choose a bank wallet.')
  }
  if (typeof input.delimiter !== 'string') throw new CsvError('Choose the CSV separator.')
  const rows = readStatement(parseCsv(input.csv, input.delimiter), input.mapping as CsvMapping)
  return { walletId: input.wallet_id, rows: rows.map(row => ({ ...row, source_key: sourceKey(row) })), decisions: input.decisions }
}

function sourceKey(row: StatementRow): string {
  return createHash('sha256').update(row.identity).digest('hex')
}

export async function importWallet(supabase: SupabaseClient, userId: string, walletId: string) {
  const { data, error } = await supabase.from('wallets').select('id, balance')
    .eq('id', walletId).eq('user_id', userId).eq('type', 'bank').maybeSingle()
  if (error) throw error
  if (!data) throw new CsvError('Choose one of your bank wallets.')
  return data
}

export function importDatabaseError(error: { message: string; code?: string }): { message: string; code?: string } {
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code ?? '')) {
    return { code: 'P0001', message: 'CSV import is not ready. Apply migration 20261023000000_bank_csv_import.sql, then retry.' }
  }
  return error
}
