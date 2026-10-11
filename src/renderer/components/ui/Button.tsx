import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-surface-elevated text-foreground border border-border hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  destructive: 'bg-[var(--danger)] text-white hover:opacity-90',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[0.92em]',
  md: 'px-3 py-1.5 text-[1em]',
  lg: 'px-4 py-2 text-[1.05em]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-focus ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {loading ? 'Working…' : children}
    </button>
  )
}
