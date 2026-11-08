import { apiFetch } from './client'
import type { CsvMapping, ImportDecision, StatementRow } from '@/lib/imports/bank-csv'

export type ImportFile = { csv: string; delimiter: string; mapping: CsvMapping; wallet_id: string }
export type ImportPreviewRow = Omit<StatementRow, 'identity'> & { duplicate: boolean; conflict: boolean }
export type ImportPreview = { balance: number; rows: ImportPreviewRow[] }
export type ImportResult = { imported: number; skipped: number; balance: number }

export const bankImportApi = {
  preview(file: ImportFile): Promise<ImportPreview> {
    return apiFetch('/api/transactions/import/preview', { method: 'POST', body: JSON.stringify(file) })
  },
  confirm(file: ImportFile, decisions: ImportDecision[]): Promise<ImportResult> {
    return apiFetch('/api/transactions/import', { method: 'POST', body: JSON.stringify({ ...file, decisions }) })
  },
}
