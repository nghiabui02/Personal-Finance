export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** "+1.000 ₫" or "−1.000 ₫": the sign always shown, the figure never negative.
 *  `isPositive` defaults to the amount's own sign; pass it when the direction
 *  comes from elsewhere, such as a transaction's type. */
export function formatSignedVND(amount: number, isPositive: boolean = amount >= 0): string {
  return `${isPositive ? '+' : '−'}${formatVND(Math.abs(amount))}`
}

export function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B ₫`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ₫`
  return formatVND(amount)
}
