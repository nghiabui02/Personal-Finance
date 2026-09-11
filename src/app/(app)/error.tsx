'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
      <p className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-3">500</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {error.message || 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 dark:text-gray-600 mb-8 font-mono">ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-fill px-4 py-2 text-sm font-medium text-white hover:bg-brand-fill-hover transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
