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
