import assert from 'node:assert/strict'
import test from 'node:test'
import { formatSignedVND, formatVND } from '../src/lib/utils/currency.ts'

test('should show a plus in front of an amount that came in', () => {
  assert.equal(formatSignedVND(1000, true), `+${formatVND(1000)}`)
})

test('should show a minus in front of an amount that went out, whatever its own sign', () => {
  assert.equal(formatSignedVND(1000, false), `−${formatVND(1000)}`)
  assert.equal(formatSignedVND(-1000, false), `−${formatVND(1000)}`)
})

test('should take the sign from the amount itself when no direction is given', () => {
  assert.equal(formatSignedVND(2500), `+${formatVND(2500)}`)
  assert.equal(formatSignedVND(-2500), `−${formatVND(2500)}`)
  assert.equal(formatSignedVND(0), `+${formatVND(0)}`)
})
