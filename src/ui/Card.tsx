import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const card = cva('rounded-lg', {
  variants: {
    tone: {
      plain: 'bg-surface shadow-card',
      raised: 'bg-surface shadow-pop',
      sunken: 'bg-sunken',
      outline: 'border border-line bg-transparent',
      accent: 'bg-accent-soft',
      nav: 'bg-nav text-nav-ink',
    },
    pad: { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' },
    interactive: {
      true: 'pressable cursor-pointer transition-[box-shadow,transform,background-color] duration-200 ease-out hoverable:hover:shadow-pop',
    },
  },
  defaultVariants: { tone: 'plain', pad: 'md' },
})

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof card> {}

export function Card({ tone, pad, interactive, className, ...rest }: CardProps) {
  return <div {...rest} className={cn(card({ tone, pad, interactive }), className)} />
}

/** A titled region inside a screen: eyebrow, title, optional action on the right. */
export function Section({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow?: string
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0', className)}>
      {(title || eyebrow || action) && (
        <header className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
