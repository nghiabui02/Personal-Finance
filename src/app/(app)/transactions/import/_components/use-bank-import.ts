import { useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bankImportApi, type ImportFile, type ImportPreviewRow, type ImportResult } from '@/lib/api/bank-import'
import { MAX_CSV_BYTES, parseCsv, readStatement } from '@/lib/imports/bank-csv'
import { errorMessage } from '@/lib/utils/errors'
import { EMPTY_MAPPING } from './csv-column-mapping'
import type { ReviewedRow } from './import-review'

/** File reading and CSV settings stay separate from a confirmed review. */
export function useCsvSource() {
  const t = useTranslations('transactions')
  const [csv, setCsv] = useState('')
  const [delimiter, setDelimiter] = useState(',')
  const [mapping, setMapping] = useState(EMPTY_MAPPING)
  const [error, setError] = useState<string | null>(null)
  const fileVersion = useRef(0)
  const parsed = useMemo(() => {
    try { return { records: csv ? parseCsv(csv, delimiter) : [], parseError: '' } }
    catch (error) { return { records: [], parseError: errorMessage(error) } }
  }, [csv, delimiter])

  async function loadFile(selected?: File) {
    const version = ++fileVersion.current
    setCsv(''); setError(null); setMapping(EMPTY_MAPPING)
    if (!selected) return
    try {
      if (!/\.csv$/i.test(selected.name)) throw new Error(t('chooseACsvFileExportExcelFilesAsCsvUtf'))
      if (selected.size > MAX_CSV_BYTES) throw new Error(t('chooseACsvFileOfAtMost1Mb'))
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await selected.arrayBuffer())
      if (!text.trim()) throw new Error(t('theCsvFileIsEmptyExportAStatementWithAt'))
      if (version === fileVersion.current) setCsv(text)
    } catch (error) {
      if (version !== fileVersion.current) return
      setError(error instanceof TypeError ? t('couldNotDecodeTheFileExportItAsCsvUtf') : errorMessage(error, t('couldNotReadTheCsvFile')))
    }
  }

  function changeDelimiter(value: string) {
    setDelimiter(value); setMapping(EMPTY_MAPPING); setError(null)
  }

  return { csv, delimiter, mapping, error, ...parsed, loadFile, changeDelimiter, setMapping }
}

/** Saving uses one atomic request; double clicks and lost responses are safe to retry. */
export function useStatementReview(
  file: ImportFile,
  records: string[][],
  /** Category this row's description was filed under before, or null. */
  suggestCategory: (row: ImportPreviewRow) => string | null,
) {
  const router = useRouter()
  const [rows, setRows] = useState<ReviewedRow[] | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError(null)
    try { await action() }
    catch (error) { setError(errorMessage(error)) }
    finally { busyRef.current = false; setBusy(false) }
  }

  function preview() {
    return run(async () => {
      readStatement(records, file.mapping)
      const preview = await bankImportApi.preview(file)
      setRows(preview.rows.map(row => ({
        ...row,
        selected: !row.duplicate && !row.conflict,
        title: '',
        user_category_id: suggestCategory(row),
      })))
    })
  }

  function confirm(event: React.FormEvent) {
    event.preventDefault()
    if (!rows) return
    return run(async () => {
      const decisions = rows.filter(row => row.selected).map(row => ({ row: row.row, title: row.title, user_category_id: row.user_category_id }))
      setResult(await bankImportApi.confirm(file, decisions))
      router.refresh()
    })
  }

  function updateRow(number: number, change: Partial<ReviewedRow>) {
    setRows(current => current?.map(row => row.row === number ? { ...row, ...change } : row) ?? null)
  }

  function back() { setRows(null); setError(null) }

  return { rows, result, error, busy, preview, confirm, updateRow, back }
}
