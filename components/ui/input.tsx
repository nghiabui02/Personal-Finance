import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
