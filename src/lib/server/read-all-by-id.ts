const PAGE_SIZE = 1000

type PageQuery<T> = PromiseLike<{ data: T[] | null; count?: number | null; error: { message: string } | null }> & {
  gt(column: string, value: string): PageQuery<T>
  order(column: string): PageQuery<T>
  limit(count: number): PageQuery<T>
}

/** Keyset pagination also works when the project's response cap is below PAGE_SIZE. */
export async function readAllById<T extends { id: string }>(operation: string, query: () => PageQuery<T>) {
  const rows: T[] = []
  let after: string | undefined
  for (;;) {
    const page = query().order('id').limit(PAGE_SIZE)
    const { data, error, count } = await (after ? page.gt('id', after) : page)
    if (error || !data) throw new Error(`Could not read ${operation}: ${error?.message ?? 'missing result'}`)
    if (!data.length) return rows
    rows.push(...data)
    if (count != null && data.length >= count) return rows
    after = data[data.length - 1].id
  }
}
