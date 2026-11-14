import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const badge = cva('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap font-medium', {
  variants: {
    tone: {
      neutral: 'bg-sunken text-ink-2',
      ok: 'bg-ok-soft text-ok-text',
      warn: 'bg-warn-soft text-warn-text',
      danger: 'bg-danger-soft text-danger-text',
      info: 'bg-info-soft text-info-text',
      accent: 'bg-accent-soft text-accent-text',
      solid: 'bg-ink text-bg',
      outline: 'border border-line text-ink-2',
    },
    size: {
      sm: 'h-5 rounded-[5px] px-1.5 text-[11px]',
      md: 'h-6 rounded-sm px-2 text-xs',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
})

const dotTone: Record<string, string> = {
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  solid: 'bg-bg',
  outline: 'bg-ink-3',
}

export type Tone = NonNullable<VariantProps<typeof badge>['tone']>

export function Badge({
  tone = 'neutral',
  size,
  dot,
  pulse,
  icon,
  children,
  className,
}: VariantProps<typeof badge> & { dot?: boolean; pulse?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn(badge({ tone, size }), className)}>
      {dot && (
        <span
          aria-hidden
          className={cn('size-1.5 shrink-0 rounded-full', dotTone[tone ?? 'neutral'], pulse && 'animate-pulse-dot')}
        />
      )}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
