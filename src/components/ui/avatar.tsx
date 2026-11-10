'use client'

import { useState } from 'react'

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
} as const

const TONES = {
  neutral: {
    image: 'ring-1 ring-gray-200 dark:ring-gray-700',
    fallback: 'bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900',
  },
  brand: {
    image: 'ring-2 ring-gray-100 dark:ring-gray-800',
    fallback: 'bg-brand-fill text-white ring-2 ring-gray-100 dark:ring-gray-800',
  },
} as const

/**
 * A person's picture, or their first letter when there is none or it will not
 * load. The picture comes from whatever sign-in provider the user used, so it
 * can be any host and can break later.
 *
 * Remembers which `src` failed, not just that one did: a new picture (after an
 * upload, say) is tried again without anyone resetting anything.
 */
export function Avatar({
  src,
  name,
  size = 'md',
  tone = 'neutral',
  alt = '',
}: {
  src?: string | null
  /** Where the fallback letter comes from. */
  name: string
  size?: keyof typeof SIZES
  tone?: keyof typeof TONES
  alt?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const base = `${SIZES[size]} rounded-full shrink-0`

  if (src && src !== failedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny remote avatar, host varies per auth provider
      <img
        src={src}
        alt={alt}
        className={`${base} object-cover ${TONES[tone].image}`}
        onError={() => setFailedSrc(src)}
      />
    )
  }

  return (
    <div className={`${base} flex items-center justify-center font-semibold ${TONES[tone].fallback}`}>
      {name[0]?.toUpperCase() ?? 'U'}
    </div>
  )
}
