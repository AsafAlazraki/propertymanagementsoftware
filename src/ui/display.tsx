import type { ReactNode } from 'react'
import NumberFlow from '@number-flow/react'
import { cn } from './cn'

/* ───────────────────────────────── figures ──────────────────────────────── */

/** Money that rolls to its new value instead of blinking. Whole dollars unless `cents`. */
export function Money({
  value,
  currency = 'NZD',
  cents = false,
  signed = false,
  className,
}: {
  value: number
  currency?: 'NZD' | 'AUD'
  cents?: boolean
  signed?: boolean
  className?: string
}) {
  return (
    <NumberFlow
      value={value}
      locales="en-NZ"
      format={{
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
        signDisplay: signed ? 'exceptZero' : 'auto',
      }}
      className={cn('num', className)}
    />
  )
}

export function Num({
  value,
  suffix,
  decimals = 0,
  className,
}: {
  value: number
  suffix?: string
  decimals?: number
  className?: string
}) {
  return (
    <NumberFlow
      value={value}
      locales="en-NZ"
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      suffix={suffix}
      className={cn('num', className)}
    />
  )
}

/** Plain-text money for places an animated element cannot go (table cells, documents, aria labels). */
export function money(value: number, opts: { cents?: boolean; currency?: 'NZD' | 'AUD' } = {}): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: opts.currency ?? 'NZD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(value)
}

export function pct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/* ─────────────────────────────── score visuals ──────────────────────────── */

/**
 * A ring that fills to `value` out of `max`. The stroke draws in on mount;
 * the figure in the middle is real text, so it scales with the user's font size
 * and is read as a sentence by a screen reader.
 */
export function Ring({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  tone = 'accent',
  label,
  children,
  className,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  tone?: 'accent' | 'ok' | 'warn' | 'danger' | 'glow'
  label: string
  children?: ReactNode
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, value / max))
  const colour = { accent: 'var(--accent)', ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', glow: 'var(--glow)' }[tone]
  return (
    <div role="img" aria-label={label} className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" opacity={0.7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

/** A thin horizontal measure. */
export function Bar({ value, max = 100, tone = 'accent', className, label }: { value: number; max?: number; tone?: 'accent' | 'ok' | 'warn' | 'danger' | 'ink'; className?: string; label: string }) {
  const frac = Math.max(0, Math.min(1, max === 0 ? 0 : value / max))
  const colour = { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger', ink: 'bg-ink' }[tone]
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', colour)} style={{ width: `${frac * 100}%` }} />
    </div>
  )
}

/* ─────────────────────────────── identity bits ──────────────────────────── */

export function Avatar({ name, hue, size = 32, className }: { name: string; hue: number; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold select-none', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        background: `oklch(0.9 0.06 ${hue})`,
        color: `oklch(0.36 0.1 ${hue})`,
      }}
    >
      {initials}
    </span>
  )
}

/* ───────────────────────────────── layout ───────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-7', className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="display text-[26px] text-ink sm:text-[32px]">{title}</h1>
        {lede && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** The true state when there is nothing to show, and the one thing to do about it. */
export function Empty({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-sunken text-ink-3 [&>svg]:size-6">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** A label/value pair. Rows of these replace a table on narrow screens. */
export function Fact({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-baseline justify-between gap-4 py-2', className)}>
      <dt className="shrink-0 text-[13px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-ink">{children}</dd>
    </div>
  )
}

export function Facts({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('divide-y divide-line', className)}>{children}</dl>
}

/** A figure with its label, for a row of headline numbers. */
export function Stat({
  label,
  children,
  sub,
  tone,
  className,
}: {
  label: ReactNode
  children: ReactNode
  sub?: ReactNode
  tone?: 'ok' | 'warn' | 'danger'
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('num mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink', tone === 'ok' && 'text-ok-text', tone === 'warn' && 'text-warn-text', tone === 'danger' && 'text-danger-text')}>
        {children}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-3">{sub}</p>}
    </div>
  )
}

/** A vertical run of dated events, newest first. */
export function Timeline({ items, className }: { items: { id: string; at: ReactNode; title: ReactNode; body?: ReactNode; tone?: 'ok' | 'warn' | 'danger' | 'accent' | 'neutral' }[]; className?: string }) {
  const dot = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger', accent: 'bg-accent', neutral: 'bg-line-strong' }
  return (
    <ol className={cn('relative', className)}>
      {items.map((it, i) => (
        <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute top-3 bottom-0 left-[5px] w-px bg-line" />}
          <span aria-hidden className={cn('relative mt-[5px] size-[11px] shrink-0 rounded-full ring-[3px] ring-surface', dot[it.tone ?? 'neutral'])} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-ink">{it.title}</p>
            {it.body && <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{it.body}</p>}
            <p className="num mt-0.5 text-[11px] text-ink-3">{it.at}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** A callout that explains or warns in place. */
export function Callout({
  tone = 'info',
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: 'info' | 'ok' | 'warn' | 'danger' | 'accent' | 'neutral'
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'bg-info-soft text-info-text',
    ok: 'bg-ok-soft text-ok-text',
    warn: 'bg-warn-soft text-warn-text',
    danger: 'bg-danger-soft text-danger-text',
    accent: 'bg-accent-soft text-accent-text',
    neutral: 'bg-sunken text-ink-2',
  }
  return (
    <div className={cn('flex gap-3 rounded-md p-3.5', tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0 [&>svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children && <div className={cn('text-[13px] leading-relaxed text-ink', title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  )
}
