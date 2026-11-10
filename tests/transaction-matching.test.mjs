import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findDuplicate, normalizeWords, suggestCategoryId,
} from '../src/lib/transaction-matching.ts'

const row = (over = {}) => ({
  type: 'expense', amount: 35000, note: null, transaction_date: '2026-11-10',
  category_id: null, wallet_id: 'w1', ...over,
})

const history = [
  row({ note: 'Cà phê sáng', category_id: 'coffee' }),
  row({ note: 'ca phe chieu', category_id: 'coffee' }),
  row({ note: 'Cà phê với sếp', category_id: 'meeting' }),
  row({ note: 'Ăn trưa văn phòng', category_id: 'lunch' }),
]

test('should read accented and unaccented spellings as the same words', () => {
  assert.deepEqual(normalizeWords('Cà PHÊ sáng'), ['ca', 'phe', 'sang'])
  assert.deepEqual(normalizeWords('Đồng  giá, 50k!'), ['dong', 'gia', '50k'])
})

test('should drop words shorter than two letters', () => {
  assert.deepEqual(normalizeWords('a b xe om'), ['xe', 'om'])
})

test('should suggest the category this text was filed under most often', () => {
  assert.equal(suggestCategoryId('cà phê', history), 'coffee')
})

test('should return null when no past note covers enough of the text', () => {
  assert.equal(suggestCategoryId('tiền điện tháng 11', history), null)
  assert.equal(suggestCategoryId('', history), null)
  assert.equal(suggestCategoryId('cà phê', []), null)
})

test('should ignore past transactions with no category or no note', () => {
  assert.equal(suggestCategoryId('cà phê', [row({ note: 'cà phê' })]), null)
  assert.equal(suggestCategoryId('cà phê', [row({ category_id: 'coffee' })]), null)
})

const draft = { type: 'expense', amount: 35000, transaction_date: '2026-11-10', wallet_id: 'w1' }

test('should find an existing transaction with the same day, wallet, direction and amount', () => {
  assert.equal(findDuplicate(draft, history)?.category_id, 'coffee')
})

test('should not call a different day, wallet, direction or amount a duplicate', () => {
  assert.equal(findDuplicate({ ...draft, transaction_date: '2026-11-09' }, history), null)
  assert.equal(findDuplicate({ ...draft, wallet_id: 'w2' }, history), null)
  assert.equal(findDuplicate({ ...draft, type: 'income' }, history), null)
  assert.equal(findDuplicate({ ...draft, amount: 35001 }, history), null)
})

test('should skip the check while the draft has no amount or no wallet', () => {
  assert.equal(findDuplicate({ ...draft, amount: 0 }, history), null)
  assert.equal(findDuplicate({ ...draft, wallet_id: null }, history), null)
})
