/** Category identity survives renames and translations, including duplicate names. */
export function categoryTotals<T extends { id: string; name: string | null }>(
  rows: { amount: number | string; categories: T | null }[],
): (T & { amount: number; count: number })[] {
  const totals = new Map<string | null, T & { amount: number; count: number }>()
  for (const row of rows) {
    const category = row.categories
    const id = category?.id ?? null
    const previous = totals.get(id)
    totals.set(id, {
      ...(category ?? { id: '', name: 'Uncategorized' } as T),
      amount: (previous?.amount ?? 0) + Number(row.amount),
      count: (previous?.count ?? 0) + 1,
    })
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount)
}
