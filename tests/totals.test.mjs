import assert from 'node:assert/strict'
import test from 'node:test'
import { netOf, sumAmounts, sumByType, sumRemaining } from '../src/lib/utils/totals.ts'

const rows = [
  { type: 'income', amount: 100 },
  { type: 'expense', amount: '30.5' },
  { type: 'expense', amount: 20 },
]

test('should add amounts whether they are numbers or numeric strings', () => {
  assert.equal(sumAmounts(rows), 150.5)
})

test('should return zero for no rows', () => {
  assert.equal(sumAmounts([]), 0)
  assert.equal(sumByType([], 'income'), 0)
  assert.equal(netOf([]), 0)
})

test('should add only the rows of the asked kind', () => {
  assert.equal(sumByType(rows, 'expense'), 50.5)
  assert.equal(sumByType(rows, 'income'), 100)
  assert.equal(sumByType(rows, 'transfer'), 0)
})

test('should subtract expense from income, and go negative when more went out', () => {
  assert.equal(netOf(rows), 49.5)
  assert.equal(netOf([{ type: 'expense', amount: 10 }]), -10)
})

test('should add what is still owed in one direction only', () => {
  const debts = [
    { type: 'lend', remaining_amount: '500' },
    { type: 'lend', remaining_amount: 250 },
    { type: 'borrow', remaining_amount: 90 },
  ]
  assert.equal(sumRemaining(debts, 'lend'), 750)
  assert.equal(sumRemaining(debts, 'borrow'), 90)
})
