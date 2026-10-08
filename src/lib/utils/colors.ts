/**
 * Hex values for places Tailwind classes can't reach — SVG charts, inline
 * `style`, and props passed to chart libraries.
 *
 * Keep in step with the Tailwind classes used in markup: money in is
 * emerald-500, money out is rose-500, brand is indigo-500.
 */
export const MONEY_IN = '#10b981'   // emerald-500
export const MONEY_OUT = '#f43f5e'  // rose-500
export const WARNING = '#f59e0b'    // amber-500
export const BRAND_HEX = '#6366f1'  // indigo-500

/**
 * The ten colours a user picks from, and the ten a chart falls back to when a
 * category has none.
 *
 * One list for both on purpose: a chart slice should be able to land on the
 * same colour the user could have chosen. Reports used to hold a copy with only
 * eight, so the ninth and tenth category came out a different colour there than
 * on the dashboard.
 */
export const CATEGORY_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
] as const
