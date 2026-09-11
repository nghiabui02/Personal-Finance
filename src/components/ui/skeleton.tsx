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

/** A card with shimmer */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-hairline p-5 ${className}`}>
      <Skeleton className="h-4 w-28 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-4/6" />
      </div>
    </div>
  )
}
