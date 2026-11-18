import type { CsvError } from '../lib/imports/bank-csv'

export function csvErrorMessage(error: CsvError, t: (key: string, values?: Record<string, string | number>) => string): string {
  const reason = t(error.key, error.params)
  return error.params.row === undefined ? reason : t('record', { row: error.params.row, reason })
}
