import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">404</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-fill px-4 py-2 text-sm font-medium text-white hover:bg-brand-fill-hover transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
