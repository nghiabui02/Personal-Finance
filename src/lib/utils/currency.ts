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

export function formatCompactVND(amount: number, locale = 'vi'): string {
  const absolute = Math.abs(amount)
  const units = locale === 'en' ? ['B', 'M', 'K'] : [' tỷ', ' triệu', ' nghìn']
  const divisor = absolute >= 1_000_000_000 ? 1_000_000_000 : absolute >= 1_000_000 ? 1_000_000 : absolute >= 1_000 ? 1_000 : 1
  if (divisor === 1) return formatVND(amount)
  const index = divisor === 1_000_000_000 ? 0 : divisor === 1_000_000 ? 1 : 2
  return `${(amount / divisor).toLocaleString('vi-VN', { minimumFractionDigits: index < 2 ? 1 : 0, maximumFractionDigits: index < 2 ? 1 : 0 })}${units[index]} ₫`
}
