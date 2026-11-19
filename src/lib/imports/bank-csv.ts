/** CSV statement parsing shared by the review screen and the import endpoint. */
export const MAX_CSV_BYTES = 1024 * 1024
export const MAX_IMPORT_ROWS = 500
export const MAX_TITLE_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 4000
const MAX_REFERENCE_LENGTH = 500
const MAX_CSV_COLUMNS = 50
const MAX_CSV_RECORDS = MAX_IMPORT_ROWS + 50
const MAX_MONEY = 9999999999999.99
const BANK_SOURCE = 'vcb'

export type CsvMapping = {
  headerRow: number
  date: number
  description: number
  debit: number
  credit: number
  reference: number
  decimal: '.' | ','
}

export type StatementRow = {
  row: number
  date: string
  description: string
  reference: string
  type: 'income' | 'expense'
  amount: number
  identity: string
}

export type ImportDecision = {
  row: number
  title: string
  user_category_id: string | null
}

export class CsvError extends Error {
  key: string
  params: Record<string, string | number>

  constructor(key: string, params: Record<string, string | number> = {}) {
    super(key)
    this.name = 'CsvError'
    this.key = key
    this.params = params
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
}

function csvError(row: number, key: string, params: Record<string, string | number> = {}): never {
  throw new CsvError(key, { ...params, row })
}

/** Quoted fields may contain delimiters, escaped quotes, and line breaks. */
export function parseCsv(text: string, delimiter: string): string[][] {
  if (![',', ';', '\t'].includes(delimiter)) throw new CsvError('invalidSeparator')
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new CsvError('fileTooLarge')
  const records: string[][] = []
  let cells: string[] = []
  let value = ''
  let quoted = false
  let closedQuote = false
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  for (let index = 0; index <= source.length; index++) {
    const char = source[index] ?? '\n'
    if (char === '"' && !closedQuote) {
      if (quoted && source[index + 1] === '"') { value += '"'; index++; continue }
      if (!quoted && value) csvError(records.length + 1, 'unexpectedQuote')
      closedQuote = quoted
      quoted = !quoted
    } else if (!quoted && (char === delimiter || char === '\n')) {
      cells.push(value.trim())
      if (cells.length > MAX_CSV_COLUMNS) csvError(records.length + 1, 'tooManyColumns')
      value = ''; closedQuote = false
      if (char === '\n') { records.push(cells); cells = [] }
    } else {
      if (closedQuote && char.trim()) csvError(records.length + 1, 'textAfterQuote')
      if (!closedQuote) value += char
    }
    if (records.length > MAX_CSV_RECORDS) throw new CsvError('tooManyRows', { limit: MAX_IMPORT_ROWS })
  }
  if (quoted) throw new CsvError('unclosedQuote')
  while (records.length && records.at(-1)!.every(cell => !cell)) records.pop()
  if (records.length < 2) throw new CsvError('missingRecords')
  return records
}

export function parseStatementDate(value: string): string {
  const date = value.trim().split(/[ T]/)[0]
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(date)
  if (!iso && !local) throw new CsvError('dateFormat')
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(local![3]), Number(local![2]), Number(local![1])]
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (year < 1900 || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new CsvError('invalidDate', { value })
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The user chooses the decimal mark; ambiguous separators are never guessed. */
export function parseStatementMoney(value: string, decimal: '.' | ','): number {
  const input = value.trim()
  if (!input || input === '-') return 0
  const pattern = decimal === '.'
    ? /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/
    : /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/
  if (!pattern.test(input)) throw new CsvError('invalidAmount', { value })
  const amount = Number(input.replace(decimal === '.' ? /,/g : /\./g, '').replace(',', '.'))
  if (!Number.isFinite(amount) || amount > MAX_MONEY) throw new CsvError('amountLimit')
  return amount
}

export function validateMapping(mapping: CsvMapping, records: string[][]): void {
  if (!mapping || !Number.isInteger(mapping.headerRow) || mapping.headerRow < 0 || mapping.headerRow >= records.length - 1) {
    throw new CsvError('headerRow')
  }
  const columns = [mapping.date, mapping.description, mapping.debit, mapping.credit]
  const width = records[mapping.headerRow].length
  if (columns.some(column => !Number.isInteger(column) || column < 0 || column >= width) || new Set(columns).size !== columns.length) {
    throw new CsvError('separateColumns')
  }
  if (!Number.isInteger(mapping.reference) || mapping.reference < -1 || mapping.reference >= width || columns.includes(mapping.reference)) {
    throw new CsvError('referenceColumn')
  }
  if (!['.', ','].includes(mapping.decimal)) throw new CsvError('numberFormat')
}

function parseStatementRow(cells: string[], mapping: CsvMapping, row: number): Omit<StatementRow, 'identity'> {
  const debit = parseStatementMoney(cells[mapping.debit], mapping.decimal)
  const credit = parseStatementMoney(cells[mapping.credit], mapping.decimal)
  if ((debit > 0) === (credit > 0)) throw new CsvError('direction')
  const description = cells[mapping.description].normalize('NFC')
  const reference = mapping.reference < 0 ? '' : cells[mapping.reference].normalize('NFC')
  if (description.length > MAX_DESCRIPTION_LENGTH || reference.length > MAX_REFERENCE_LENGTH) throw new CsvError('textTooLong')
  if (mapping.reference >= 0 && !reference) throw new CsvError('emptyReference')
  return { row, date: parseStatementDate(cells[mapping.date]), description, reference, type: credit > 0 ? 'income' : 'expense', amount: credit || debit }
}

export function readStatement(records: string[][], mapping: CsvMapping): StatementRow[] {
  validateMapping(mapping, records)
  const occurrences = new Map<string, number>()
  const rows: StatementRow[] = []
  for (let index = mapping.headerRow + 1; index < records.length; index++) {
    const cells = records[index]
    if (cells.every(cell => !cell)) continue
    try {
      if (cells.length !== records[mapping.headerRow].length) throw new CsvError('columnCount')
      const entry = parseStatementRow(cells, mapping, index + 1)
      const source = JSON.stringify([entry.date, entry.type, entry.amount.toFixed(2), entry.description])
      const occurrence = (occurrences.get(source) ?? 0) + 1
      occurrences.set(source, occurrence)
      // References remain stable across exports. Without one, identical entries
      // need an occurrence number so legitimate repeated payments stay separate.
      const identity = entry.reference ? JSON.stringify([BANK_SOURCE, entry.reference]) : JSON.stringify([BANK_SOURCE, source, occurrence])
      rows.push({ ...entry, identity })
    } catch (error) {
      if (error instanceof CsvError) csvError(index + 1, error.key, error.params)
      throw error
    }
  }
  if (!rows.length || rows.length > MAX_IMPORT_ROWS) throw new CsvError('rowCount', { limit: MAX_IMPORT_ROWS })
  if (new Set(rows.map(row => row.identity)).size !== rows.length) throw new CsvError('repeatedReference')
  return rows
}

export function validateDecisions(value: unknown, rows: StatementRow[]): ImportDecision[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_IMPORT_ROWS) throw new CsvError('selectRows')
  const rowNumbers = new Set(rows.map(row => row.row))
  const selected = new Set<number>()
  return value.map(decision => {
    if (!decision || !rowNumbers.has(decision.row) || selected.has(decision.row)) throw new CsvError('invalidSelection')
    selected.add(decision.row)
    if (typeof decision.title !== 'string' || !decision.title.trim() || decision.title.trim().length > MAX_TITLE_LENGTH) {
      csvError(decision.row, 'titleLength', { limit: MAX_TITLE_LENGTH })
    }
    const category = decision.user_category_id
    if (category !== null && !isUuid(category)) {
      csvError(decision.row, 'invalidCategory')
    }
    return { row: decision.row, title: decision.title.trim(), user_category_id: category }
  })
}
