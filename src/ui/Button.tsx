import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { CircleNotch } from '@phosphor-icons/react'
import { cn } from './cn'

/**
 * One pressable, five intents. `primary` is the single most important action
 * in a region — if two sit side by side, one of them is wrong.
 */
export const buttonClass = cva(
  [
    'pressable relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none',
    'transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
  ],
  {
    variants: {
      intent: {
        primary:
          'bg-accent text-accent-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_1px_2px_oklch(0.2_0.04_260/0.28)] hoverable:hover:bg-accent-hover',
        secondary: 'bg-surface text-ink shadow-card hoverable:hover:bg-surface-2',
        soft: 'bg-accent-soft text-accent-text hoverable:hover:brightness-[0.97] dark:hoverable:hover:brightness-110',
        ghost: 'text-ink-2 hoverable:hover:bg-sunken hoverable:hover:text-ink',
        danger: 'bg-danger text-danger-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.2)] hoverable:hover:brightness-95',
        dangerSoft: 'bg-danger-soft text-danger-text hoverable:hover:brightness-[0.97]',
        /** On the navy navigation surface. */
        nav: 'text-nav-ink-2 hoverable:hover:bg-nav-2 hoverable:hover:text-nav-ink',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-[13px] coarse:h-10',
        md: 'h-10 rounded-md px-4 text-sm coarse:h-11',
        lg: 'h-12 rounded-md px-5 text-[15px]',
        icon: 'size-10 rounded-md coarse:size-11',
        iconSm: 'size-8 rounded-sm coarse:size-10',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { intent: 'secondary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonClass> {
  loading?: boolean
  icon?: ReactNode
  trailing?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  intent,
  size,
  block,
  loading,
  icon,
  trailing,
  className,
  children,
  disabled,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass({ intent, size, block }), className)}
    >
      {loading ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {trailing}
    </button>
  )
}
