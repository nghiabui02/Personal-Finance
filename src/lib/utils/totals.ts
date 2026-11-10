/**
 * Adding up money. Amounts arrive from the database as numbers or as numeric
 * strings, so every sum goes through `Number` once, here, instead of at each
 * call site. No imports on purpose — `tests/totals.test.mjs` runs it under
 * plain Node.
 */

type Amounted = { amount: number | string }
type TypedAmount = Amounted & { type: string }

export function sumAmounts(rows: Amounted[]): number {
  return rows.reduce((total, row) => total + Number(row.amount), 0)
}

/** The total of the rows of one kind — all the income, or all the expense. */
export function sumByType(rows: TypedAmount[], type: string): number {
  return sumAmounts(rows.filter(row => row.type === type))
}

/** Income minus expense. Negative when more went out than came in. */
export function netOf(rows: TypedAmount[]): number {
  return sumByType(rows, 'income') - sumByType(rows, 'expense')
}

/** What is still owed across the debts of one direction (`lend` or `borrow`). */
export function sumRemaining(
  debts: { type: string; remaining_amount: number | string }[],
  type: string,
): number {
  return debts
    .filter(debt => debt.type === type)
    .reduce((total, debt) => total + Number(debt.remaining_amount), 0)
}
