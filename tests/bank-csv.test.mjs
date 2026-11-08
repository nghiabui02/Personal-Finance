import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_CSV_BYTES, MAX_IMPORT_ROWS, parseCsv, parseStatementDate,
  parseStatementMoney, readStatement, validateDecisions,
} from '../src/lib/imports/bank-csv.ts'

const header = ['Date', 'Description', 'Debit', 'Credit', 'Reference']
const mapping = { headerRow: 0, date: 0, description: 1, debit: 2, credit: 3, reference: 4, decimal: '.' }
const payment = ['23/10/2026', 'Coffee', '35,000', '', 'VCB-1']

test('should read BOM, quoted delimiters, escaped quotes, and multiline descriptions', () => {
  const records = parseCsv('\uFEFFDate,Description,Debit,Credit,Reference\r\n23/10/2026,"Coffee, ""large""\r\nTakeaway","35,000",,VCB-1\r\n', ',')
  const [row] = readStatement(records, mapping)
  assert.equal(row.description, 'Coffee, "large"\nTakeaway')
  assert.equal(row.amount, 35000)
  assert.equal(row.type, 'expense')
  assert.equal(row.date, '2026-10-23')
})

test('should support semicolon and tab CSV with selected number formats', () => {
  assert.equal(parseCsv('A;B\n"a;b";c', ';')[1][0], 'a;b')
  assert.deepEqual(parseCsv('A\tB\nx\ty', '\t')[1], ['x', 'y'])
  assert.equal(parseStatementMoney('1.234.567,89', ','), 1234567.89)
  assert.equal(parseStatementMoney('1,234,567.89', '.'), 1234567.89)
  assert.equal(parseStatementMoney('0', '.'), 0)
  assert.equal(parseStatementMoney('-', ','), 0)
  assert.throws(() => parseStatementMoney('35.000', '.'), /number format/)
  for (const value of ['-1', 'NaN', '1e3', '12,34', '1,234.567', '10000000000000', '1 000']) {
    assert.throws(() => parseStatementMoney(value, '.'), undefined, value)
  }
})

test('should validate calendar dates rather than normalize impossible dates', () => {
  assert.equal(parseStatementDate('29/02/2024 15:00:00'), '2024-02-29')
  assert.equal(parseStatementDate('2026-10-23'), '2026-10-23')
  for (const value of ['29/02/2025', '31/04/2026', '12/31/2026', '01/01/0099', '23/10/26']) {
    assert.throws(() => parseStatementDate(value), undefined, value)
  }
})

test('should reject malformed CSV and unsupported files without partial parsing', () => {
  for (const source of ['A,B\n"unclosed,x', 'A,B\n"x"oops,y', 'A,B\nx"y,z', 'A,B']) {
    assert.throws(() => parseCsv(source, ','), undefined, source)
  }
  assert.throws(() => parseCsv('x'.repeat(MAX_CSV_BYTES + 1), ','), /1 MB/)
  assert.throws(() => parseCsv('A,B\nx,y', '|'), /separator/)
})

test('should map header after statement metadata and ignore blank records', () => {
  const rows = readStatement([['VCB statement'], header, payment, ['', '', '', '', '']], { ...mapping, headerRow: 1 })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].row, 3)
  assert.throws(() => readStatement([header, payment], { ...mapping, debit: 3 }), /separate columns/)
  assert.throws(() => readStatement([header, payment], { ...mapping, reference: 0 }), /reference column/)
  assert.throws(() => readStatement([header, payment], { ...mapping, headerRow: 1 }), /header row/)
})

test('should reject ambiguous directions and malformed records with their record number', () => {
  assert.throws(() => readStatement([header, ['23/10/2026', 'Both', '100', '200', 'x']], mapping), /record 2:.*either/)
  assert.throws(() => readStatement([header, ['23/10/2026', 'Zero', '', '', 'x']], mapping), /record 2:.*either/)
  assert.throws(() => readStatement([header, payment.slice(0, 4)], mapping), /record 2:.*Column count/)
  assert.throws(() => readStatement([header, [...payment.slice(0, 4), '']], mapping), /reference is empty/)
  assert.throws(() => readStatement([header, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [...payment.slice(0, 4), `ref-${i}`])], mapping), /500/)
})

test('should use stable bank references independent of description changes and export order', () => {
  const first = readStatement([header, payment], mapping)[0]
  const changed = readStatement([header, ['2026-10-23', 'COFFEE', '35000.00', '', 'VCB-1']], mapping)[0]
  assert.equal(first.identity, changed.identity)
  assert.throws(() => readStatement([header, payment, payment], mapping), /references repeat/)
})

test('should preserve identical legitimate payments without references and stable keys on retry', () => {
  const noReference = { ...mapping, reference: -1 }
  const first = readStatement([header, payment, payment], noReference)
  const retry = readStatement([header, payment, payment], noReference)
  assert.notEqual(first[0].identity, first[1].identity)
  assert.deepEqual(first.map(row => row.identity), retry.map(row => row.identity))
})

test('should require reviewed titles and valid, unique selections', () => {
  const rows = readStatement([header, payment], mapping)
  assert.deepEqual(validateDecisions([{ row: 2, title: ' Coffee ', category_id: null }], rows), [{ row: 2, title: 'Coffee', category_id: null }])
  const choice = { row: 2, title: 'Coffee', category_id: null }
  for (const decisions of [[], [null], [{ ...choice, title: ' ' }], [{ ...choice, title: 'x'.repeat(501) }], [{ ...choice, row: 3 }], [choice, choice], [{ ...choice, category_id: 'other' }]]) {
    assert.throws(() => validateDecisions(decisions, rows))
  }
})
