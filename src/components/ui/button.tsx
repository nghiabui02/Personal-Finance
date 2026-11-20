import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export function ButtonSpinner() {
  return <span aria-hidden="true" className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-fill text-white hover:bg-brand-fill-hover disabled:opacity-60',
  secondary:
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  ghost:
    'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger:
    'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', fullWidth = false, loading = false, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-1.5
          rounded-lg px-4 py-2 text-sm font-medium
          transition-[colors,transform] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100
          ${variants[variant]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        {loading && <ButtonSpinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { Variant as ButtonVariant }
