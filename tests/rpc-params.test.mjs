import assert from 'node:assert/strict'
import test from 'node:test'
import { debtMovementRpcParams, transactionRpcParams } from '../src/lib/server/rpc-params.ts'

test('should map a transaction body onto the money function arguments', () => {
  assert.deepEqual(
    transactionRpcParams({
      type: 'expense', amount: '35000', transaction_date: '2026-11-10',
      category_id: 'c1', wallet_id: 'w1', note: 'cà phê', bank_fee: 5000,
    }),
    {
      p_type: 'expense', p_amount: 35000, p_transaction_date: '2026-11-10',
      p_category_id: 'c1', p_wallet_id: 'w1', p_note: 'cà phê', p_bank_fee: 5000,
    },
  )
})

test('should send null for a missing or empty category, wallet, note and fee', () => {
  const params = transactionRpcParams({
    type: 'income', amount: 1, transaction_date: '2026-11-10', category_id: '', wallet_id: '',
  })
  assert.equal(params.p_category_id, null)
  assert.equal(params.p_wallet_id, null)
  assert.equal(params.p_note, null)
  assert.equal(params.p_bank_fee, null)
})

test('should keep an empty note as an empty note rather than null', () => {
  assert.equal(
    transactionRpcParams({ type: 'expense', amount: 1, transaction_date: '2026-11-10', note: '' }).p_note,
    '',
  )
})

test('should map a debt movement body, falling back to today when no date is given', () => {
  assert.deepEqual(
    debtMovementRpcParams('d1', { amount: '20000', wallet_id: 'w1', note: 'trả bớt' }, 'cat', '2026-11-10'),
    {
      p_debt_id: 'd1', p_amount: 20000, p_date: '2026-11-10',
      p_wallet_id: 'w1', p_category_id: 'cat', p_note: 'trả bớt',
    },
  )
})

test('should keep a given date and send null for an empty wallet or missing note', () => {
  const params = debtMovementRpcParams('d1', { amount: 1, date: '2026-10-01', wallet_id: '' }, null, '2026-11-10')
  assert.equal(params.p_date, '2026-10-01')
  assert.equal(params.p_wallet_id, null)
  assert.equal(params.p_category_id, null)
  assert.equal(params.p_note, null)
})
