interface PeriodNavProps {
  label: string
  onPrev: () => void
  onNext: () => void
  labelClassName?: string
  className?: string
}

export function PeriodNav({
  label,
  onPrev,
  onNext,
  labelClassName = 'min-w-36',
  className = '',
}: PeriodNavProps) {
  return (
    <div className={`flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit ${className}`}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span className={`px-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-center ${labelClassName}`}>
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
