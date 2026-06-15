import { Skeleton } from '@/components/ui/skeleton'

export default function WalletsLoading() {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Total balance card */}
      <Skeleton className="h-28 w-full rounded-2xl mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
