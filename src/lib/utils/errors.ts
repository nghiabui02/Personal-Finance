import { clientTranslator } from '@/i18n/client'
import { csvErrorMessage } from '@/i18n/csv'
import { CsvError } from '@/lib/imports/bank-csv'

/**
 * Turns an unknown thrown value into a sentence worth showing a person.
 *
 * Written out at each catch site, this drifted: most places kept
 * `err.message` whatever it held, so an Error carrying an empty string showed
 * an empty box. The check for a non-empty message existed in exactly one copy.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  if (err instanceof CsvError) return csvErrorMessage(err, clientTranslator('csv'))
  return err instanceof Error && err.message ? err.message : fallback ?? clientTranslator('common')('unexpectedError')
}
