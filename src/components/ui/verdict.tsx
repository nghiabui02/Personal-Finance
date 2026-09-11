import Link from 'next/link'

/**
 * The lede of a screen: one sentence that answers the question the screen
 * exists to answer, with the numbers underneath as evidence.
 *
 * Deliberately not a card. It sits directly on the page background so it reads
 * as the screen talking, not as one more panel competing with the others.
 */

type EmphasisTone = 'good' | 'bad' | 'warn' | 'plain'

const EMPHASIS_CLASSES: Record<EmphasisTone, string> = {
  good:  'text-emerald-600 dark:text-emerald-400',
  bad:   'text-rose-600 dark:text-rose-400',
  warn:  'text-amber-600 dark:text-amber-400',
  plain: 'text-gray-900 dark:text-gray-100',
}

/** Highlights the number the sentence turns on. */
export function Em({ tone = 'plain', children }: { tone?: EmphasisTone; children: React.ReactNode }) {
  return <span className={`font-semibold tabular-nums ${EMPHASIS_CLASSES[tone]}`}>{children}</span>
}

interface VerdictProps {
  /** Small label above — usually the period or scope in view. */
  eyebrow?: React.ReactNode
  /** The sentence. Keep it to one claim. */
  headline: React.ReactNode
  /** Supporting facts, shown muted under the sentence. */
  support?: React.ReactNode
  /** Where to go to act on the verdict. */
  action?: { label: string; href: string }
  className?: string
}

export function Verdict({ eyebrow, headline, support, action, className = '' }: VerdictProps) {
  return (
    <section className={`pt-1 pb-1 ${className}`}>
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="text-xl sm:text-2xl leading-snug font-medium tracking-tight text-gray-500 dark:text-gray-400 max-w-2xl text-balance">
        {headline}
      </h1>
      {(support || action) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400 dark:text-gray-500">
          {support}
          {action && (
            <Link
              href={action.href}
              className="group inline-flex items-center gap-0.5 font-medium text-brand rounded"
            >
              {action.label}
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                   className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

/** Separates supporting facts: `4.2M left` · `18 days` */
export function Dot() {
  return <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">·</span>
}
