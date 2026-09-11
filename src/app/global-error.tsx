'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-3">500</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-8">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-fill px-4 py-2 text-sm font-medium text-white hover:bg-brand-fill-hover transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
