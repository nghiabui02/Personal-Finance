import { Select } from '@/components/ui/select'
import type { CsvMapping } from '@/lib/imports/bank-csv'

const COLUMN_LABELS = {
  date: 'Transaction date', description: 'Bank description',
  debit: 'Money out (debit)', credit: 'Money in (credit)', reference: 'Bank reference (recommended)',
} as const

export const EMPTY_MAPPING: CsvMapping = {
  headerRow: 0, date: -1, description: -1, debit: -1, credit: -1, reference: -1, decimal: '.',
}

export function CsvColumnMapping({ records, mapping, onChange }: {
  records: string[][]
  mapping: CsvMapping
  onChange: (mapping: CsvMapping) => void
}) {
  const headers = records[mapping.headerRow] ?? []
  return (
    <div className="space-y-4">
      <Select label="Header row" value={mapping.headerRow} onChange={event => onChange({ ...EMPTY_MAPPING, decimal: mapping.decimal, headerRow: Number(event.target.value) })}>
        {records.slice(0, -1).map((record, index) => <option key={index} value={index}>{index + 1}: {record.join(' · ').slice(0, 120)}</option>)}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(COLUMN_LABELS).map(([key, label]) => {
          const column = key as keyof typeof COLUMN_LABELS
          return (
            <Select key={key} label={label} value={mapping[column]} onChange={event => onChange({ ...mapping, [column]: Number(event.target.value) })}>
              <option value={-1}>{column === 'reference' ? 'None' : 'Choose column'}</option>
              {headers.map((header, index) => <option key={index} value={index}>{index + 1}: {header || '(empty)'}</option>)}
            </Select>
          )
        })}
        <Select label="Number format" value={mapping.decimal} onChange={event => onChange({ ...mapping, decimal: event.target.value as '.' | ',' })}>
          <option value=".">1,234,567.89 (decimal point)</option>
          <option value=",">1.234.567,89 (decimal comma)</option>
        </Select>
      </div>
      <p className="text-xs text-gray-500">Dates: DD/MM/YYYY or YYYY-MM-DD. Amounts: VND, with separate debit and credit columns.</p>
      {mapping.reference < 0 && <p className="text-sm text-amber-700 dark:text-amber-400">Without bank references, identical transactions in overlapping statements cannot always be distinguished. Review duplicates carefully.</p>}
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <table className="w-full text-left text-xs">
          <caption className="px-3 py-2 text-left text-gray-500">First three records after the header</caption>
          <thead><tr>{headers.map((header, index) => <th key={index} className="p-3 whitespace-nowrap">{header || `Column ${index + 1}`}</th>)}</tr></thead>
          <tbody>{records.slice(mapping.headerRow + 1, mapping.headerRow + 4).map((record, index) => (
            <tr key={index} className="border-t border-hairline">{record.map((cell, cellIndex) => <td key={cellIndex} className="p-3 min-w-24 max-w-64 break-words">{cell}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
