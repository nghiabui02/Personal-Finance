import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60',
  secondary:
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  ghost:
    'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger:
    'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', fullWidth = false, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-1.5
          rounded-lg px-4 py-2 text-sm font-medium
          transition-colors disabled:cursor-not-allowed
          ${variants[variant]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { Variant as ButtonVariant }
