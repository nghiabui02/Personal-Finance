const TZ = process.env.NEXT_PUBLIC_TIMEZONE

// Returns local date as YYYY-MM-DD, respecting NEXT_PUBLIC_TIMEZONE env var.
// Falls back to browser/system timezone when env is not set.
export function localYMD(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Returns YYYY-MM for the current local month.
export function localYM(date: Date = new Date()): string {
  return localYMD(date).slice(0, 7)
}

// Returns the Monday of the week containing the given local date string (YYYY-MM-DD).
// Operates purely on date arithmetic — no UTC conversion.
export function getMondayOfLocalWeek(localDateStr: string): string {
  const [y, m, d] = localDateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d) // local midnight, no timezone shift
  const dow = date.getDay() // 0=Sun, 1=Mon ... 6=Sat
  date.setDate(d - (dow === 0 ? 6 : dow - 1))
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

// Date range for a YYYY-MM month: [startDate, endDate) where endDate is the
// first day of the next month. Pure string math — no Date/UTC conversion.
export function monthRange(ym: string): { startDate: string; endDate: string } {
  const [y, m] = ym.split('-').map(Number)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  return {
    startDate: `${ym}-01`,
    endDate: `${nextY}-${String(nextM).padStart(2, '0')}-01`,
  }
}

// Formats a Date object's LOCAL calendar fields as YYYY-MM-DD (no timezone
// conversion — use only for Dates already constructed in the intended zone,
// e.g. new Date(y, m - 1, d) arithmetic).
export function toYMD(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

// Shifts a local YYYY-MM-DD by N days.
export function shiftLocalDate(localDateStr: string, days: number): string {
  const [y, m, d] = localDateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}
