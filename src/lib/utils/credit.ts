export type CreditCycle = {
  start: string   // YYYY-MM-DD — first day of cycle
  end: string     // YYYY-MM-DD — last day of cycle (day before statement_day)
  statementDate: string  // YYYY-MM-DD — statement date
  dueDate: string        // YYYY-MM-DD — payment due date
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

// Returns the current billing cycle based on today's local date string (YYYY-MM-DD)
export function getCreditCycle(
  statementDay: number,
  paymentDueDay: number,
  todayStr: string,
): CreditCycle {
  const [ty, tm, td] = todayStr.split('-').map(Number)

  // Clamp statementDay to valid day in month
  const clamp = (y: number, m: number) => Math.min(statementDay, daysInMonth(y, m))

  let cycleStartY: number, cycleStartM: number
  let cycleEndY: number, cycleEndM: number
  let stmtY: number, stmtM: number

  if (td < clamp(ty, tm)) {
    // Before statement day this month → cycle started last month
    // e.g. today=Jun 22, statement_day=26 → cycle: May 26 → Jun 25
    cycleStartM = tm === 1 ? 12 : tm - 1
    cycleStartY = tm === 1 ? ty - 1 : ty
    stmtY = ty
    stmtM = tm
  } else {
    // On or after statement day → cycle starts this month
    // e.g. today=Jun 27, statement_day=26 → cycle: Jun 26 → Jul 25
    cycleStartY = ty
    cycleStartM = tm
    stmtY = tm === 12 ? ty + 1 : ty
    stmtM = tm === 12 ? 1 : tm + 1
  }

  cycleEndM = stmtM === 1 ? 12 : stmtM - 1
  cycleEndY = stmtM === 1 ? stmtY - 1 : stmtY

  const start = ymd(cycleStartY, cycleStartM, clamp(cycleStartY, cycleStartM))
  const end = ymd(cycleEndY, cycleEndM, clamp(cycleEndY, cycleEndM) - 1 < 1
    ? daysInMonth(cycleEndY, cycleEndM === 1 ? 12 : cycleEndM - 1)
    : clamp(cycleEndY, cycleEndM) - 1)
  const statementDate = ymd(stmtY, stmtM, clamp(stmtY, stmtM))

  // Payment due: paymentDueDay of the month after statement
  const dueM = stmtM === 12 ? 1 : stmtM + 1
  const dueY = stmtM === 12 ? stmtY + 1 : stmtY
  const dueDate = ymd(dueY, dueM, Math.min(paymentDueDay, daysInMonth(dueY, dueM)))

  return { start, end, statementDate, dueDate }
}

// Days until a YYYY-MM-DD date from today's local date string
export function daysUntil(targetStr: string, todayStr: string): number {
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const [gy, gm, gd] = targetStr.split('-').map(Number)
  const a = new Date(ty, tm - 1, td)
  const b = new Date(gy, gm - 1, gd)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
