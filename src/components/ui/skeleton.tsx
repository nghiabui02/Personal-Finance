import { useTranslations } from 'next-intl'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

/** A row with a circle + two lines (like a list item) */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-3.5 w-16 shrink-0" />
    </div>
  )
}

/** Shared placeholder for route navigation and refreshed content regions. */
export function ContentSkeleton() {
  const t = useTranslations('common')
  return (
    <div role="status" aria-label={t('loading')} aria-busy="true" className="space-y-4" data-content-loading>
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-2/3" />
        <div className="rounded-2xl border border-hairline bg-white dark:bg-gray-900 divide-y divide-hairline">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  )
}
