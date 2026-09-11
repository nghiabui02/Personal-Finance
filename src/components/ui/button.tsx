import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
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
  ({ variant = 'primary', fullWidth = false, className = '', children, ...props }, ref) => {
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
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { Variant as ButtonVariant }
