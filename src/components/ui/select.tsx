interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
