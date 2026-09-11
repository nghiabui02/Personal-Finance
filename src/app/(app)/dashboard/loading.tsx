import { Skeleton, SkeletonRow } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="w-9 h-9 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-36" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-52 w-52 rounded-full mx-auto" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="divide-y divide-hairline">
            {[1, 2, 3, 4, 5, 6, 7].map(i => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
