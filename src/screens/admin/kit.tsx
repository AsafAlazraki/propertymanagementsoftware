/**
 * The console's own furniture.
 *
 * The shared kit (src/ui) gives every portal the same buttons, sheets and
 * fields. These are the pieces only an operations console needs: a dense table
 * that turns into cards on a phone, a status that is always an icon and a word,
 * a framed panel, and filters small enough to sit five to a row.
 */
import { useCallback, useRef, type ComponentType, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowSquareOut, CaretDown, CaretUp, CaretUpDown, Flask, MagnifyingGlass } from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { Bar } from '@/ui/display'
import { useHotkey } from '@/ui/hooks'
import { cn } from '@/ui/cn'

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral'
export type Icon = ComponentType<IconProps>

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok-text',
  warn: 'text-warn-text',
  danger: 'text-danger-text',
  info: 'text-info-text',
  accent: 'text-accent-text',
  neutral: 'text-ink-3',
}

export const TONE_SOFT: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  danger: 'bg-danger-soft text-danger-text',
  info: 'bg-info-soft text-info-text',
  accent: 'bg-accent-soft text-accent-text',
  neutral: 'bg-sunken text-ink-2',
}

/** A state, as an icon and a word. Colour only ever repeats what the two already say. */
export function Status({
  tone = 'neutral',
  icon: Glyph,
  children,
  strong,
  className,
}: {
  tone?: Tone
  icon: Icon
  children: ReactNode
  strong?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex max-w-full min-w-0 items-center gap-1.5 align-middle whitespace-nowrap', className)}
    >
      <Glyph weight="fill" className={cn('size-3.5 shrink-0', TONE_TEXT[tone])} aria-hidden />
      <span className={cn('truncate', strong ? 'font-medium text-ink' : 'text-ink-2')}>{children}</span>
    </span>
  )
}

/** The same, boxed: for the one or two states on a screen that must not be missed. */
export function Flag({
  tone = 'neutral',
  icon: Glyph,
  children,
  className,
}: {
  tone?: Tone
  icon: Icon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-1 rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap',
        TONE_SOFT[tone],
        className,
      )}
    >
      <Glyph weight="fill" className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Marks anything in the console that is acted out rather than real: payouts, invites, a model's draft. */
export function Simulated({ children = 'Simulated', className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-sm border border-dashed border-line-strong px-1.5 font-mono text-[10px] tracking-wide whitespace-nowrap text-ink-2 uppercase',
        className,
      )}
    >
      <Flask className="size-3 shrink-0" aria-hidden />
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-line-strong bg-surface px-1 font-mono text-[10px] leading-4 text-ink-2">
      {children}
    </kbd>
  )
}

/** A link that leaves the console, and says so. */
export function Out({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm text-accent-text underline decoration-accent-line underline-offset-2 hoverable:hover:decoration-accent-text',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowSquareOut className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

/* ───────────────────────────────── page chrome ──────────────────────────── */

/** The top of a console screen: smaller and tighter than the customer portals' headers. */
export function Head({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-5">
      <div className="max-w-3xl min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">{title}</h1>
        {lede && <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** A framed region with a hairline title bar. */
export function Panel({
  title,
  note,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  /** One quiet line under the title: what the panel is, or where its figures come from. */
  note?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('min-w-0 rounded-lg bg-surface shadow-card', className)}>
      {(title || action) && (
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold text-ink">{title}</h2>}
            {note && <p className="text-xs text-ink-3">{note}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName ?? 'p-4'}>{children}</div>
    </section>
  )
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex flex-wrap items-center gap-x-3 gap-y-2', className)}>{children}</div>
}

/** A search field. `/` puts the cursor in it from anywhere on the screen. */
export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const focus = useCallback((e: globalThis.KeyboardEvent) => {
    e.preventDefault()
    ref.current?.focus()
  }, [])
  useHotkey('/', focus)
  return (
    <div className={cn('relative min-w-0 flex-1 basis-48 sm:max-w-xs', className)}>
      <MagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className="h-8 w-full rounded-md bg-surface pr-8 pl-8 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--field-line)] outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_2px_var(--focus)] coarse:h-11"
      />
      <span className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 hoverable:block">
        <Kbd>/</Kbd>
      </span>
    </div>
  )
}

/** A compact labelled picker for a filter row. */
export function Filter<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <label className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <span className="eyebrow shrink-0">{label}</span>
      <span className="relative min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-8 max-w-full appearance-none truncate rounded-md bg-surface pr-7 pl-2.5 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--field-line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--focus)] coarse:h-11"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <CaretDown
          aria-hidden
          weight="bold"
          className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-ink-3"
        />
      </span>
    </label>
  )
}

/* ───────────────────────────────── the table ────────────────────────────── */

export interface Sort {
  key: string
  dir: 'asc' | 'desc'
}

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'right'
  /** A width class such as `w-28`. The column without one takes the room that is left. */
  width?: string
  /** The breakpoint from which the column is shown. Without it, the column is always shown. */
  from?: 'md' | 'lg' | 'xl' | '2xl'
  /** Makes the heading a sort control for this key. */
  sort?: string
  /** The cell that opens the row. Its content is wrapped in the row's button, so it must be inline content. */
  primary?: boolean
}

const FROM: Record<NonNullable<Column<unknown>['from']>, string> = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
}

/**
 * A dense table from 640px up, a stack of cards below it.
 *
 * The heading row sticks under the page chrome while the page scrolls. Columns
 * are fixed-width and hide in a set order as the screen narrows, so the table
 * never needs to scroll sideways. Each row is opened by a real button in its
 * primary cell; the arrow keys move between rows.
 */
export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  onOpen,
  selected,
  card,
  empty,
  sort,
  onSort,
  openLabel,
}: {
  caption: string
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onOpen?: (row: T) => void
  selected?: string
  /** The row as a card, for screens under 640px. */
  card: (row: T) => ReactNode
  /** Shown instead of the table when there are no rows. */
  empty: ReactNode
  sort?: Sort
  onSort?: (key: string) => void
  /** Names the row for assistive tech: "Open Whitaker Family Trust". */
  openLabel?: (row: T) => string
}) {
  const onKeys = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const openers = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-row-open]'))
    const at = openers.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    e.preventDefault()
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? openers.length - 1
          : Math.max(0, Math.min(openers.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))
    openers[next]?.focus()
  }

  if (rows.length === 0) return <div className="rounded-lg bg-surface shadow-card">{empty}</div>

  return (
    <div className="min-w-0">
      <div className="hidden overflow-clip rounded-lg bg-surface shadow-card sm:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort && c.sort === sort.key
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'sticky top-13 z-10 h-9 border-b border-line bg-surface-2 px-3 font-mono text-[10.5px] font-medium tracking-[0.06em] whitespace-nowrap text-ink-3 uppercase md:top-0',
                      c.align === 'right' && 'text-right',
                      c.width,
                      c.from && FROM[c.from],
                    )}
                  >
                    {c.sort && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.sort!)}
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 rounded-sm uppercase hoverable:hover:text-ink',
                          active && 'text-ink',
                        )}
                      >
                        <span className="truncate">{c.header}</span>
                        {active ? (
                          sort.dir === 'asc' ? (
                            <CaretUp weight="bold" className="size-3 shrink-0" aria-hidden />
                          ) : (
                            <CaretDown weight="bold" className="size-3 shrink-0" aria-hidden />
                          )
                        ) : (
                          <CaretUpDown className="size-3 shrink-0 opacity-60" aria-hidden />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody onKeyDown={onKeys} className="[&>tr:last-child>td]:border-b-0">
            {rows.map((row) => {
              const key = rowKey(row)
              const isSelected = selected === key
              return (
                <tr
                  key={key}
                  onClick={onOpen ? () => onOpen(row) : undefined}
                  className={cn(
                    'transition-colors duration-100 focus-within:bg-surface-2',
                    onOpen && 'cursor-pointer hoverable:hover:bg-surface-2',
                    isSelected && 'bg-accent-soft/60 hoverable:hover:bg-accent-soft/60',
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.id}
                      className={cn(
                        'overflow-hidden border-b border-line px-3 py-2 align-middle',
                        c.align === 'right' && 'num text-right',
                        c.from && FROM[c.from],
                        isSelected && i === 0 && 'shadow-[inset_2px_0_0_var(--accent)]',
                      )}
                    >
                      {c.primary && onOpen ? (
                        <button
                          type="button"
                          data-row-open
                          aria-label={openLabel?.(row)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpen(row)
                          }}
                          className="block w-full min-w-0 rounded-sm text-left outline-offset-[-2px]"
                        >
                          {c.cell(row)}
                        </button>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 sm:hidden">
        {rows.map((row) => {
          const key = rowKey(row)
          return (
            <li key={key}>
              {onOpen ? (
                // No aria-label here: the card's own words are its name, so a screen reader hears the status and figures too.
                <button
                  type="button"
                  onClick={() => onOpen(row)}
                  className={cn(
                    'pressable block w-full rounded-lg bg-surface p-3.5 text-left shadow-card',
                    selected === key && 'shadow-[inset_3px_0_0_var(--accent),var(--sh-card)]',
                  )}
                >
                  {card(row)}
                </button>
              ) : (
                <div className="rounded-lg bg-surface p-3.5 shadow-card">{card(row)}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Flips a sort when the same heading is pressed twice; a new heading starts in its natural direction. */
export function nextSort(current: Sort, key: string, numeric: boolean): Sort {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: numeric ? 'desc' : 'asc' }
}

/** A count line under a list: "12 of 14 organisations". */
export function Tally({ shown, total, noun, plural }: { shown: number; total: number; noun: string; plural?: string }) {
  const many = plural ?? `${noun}s`
  return (
    <p className="num mt-2.5 text-xs text-ink-3">
      {shown === total ? `${total} ${total === 1 ? noun : many}` : `${shown} of ${total} ${many}`}
    </p>
  )
}

/** Two lines in one cell: the name, and the thing you would otherwise have to open the row to learn. */
export function TwoLine({ title, sub, mono }: { title: ReactNode; sub?: ReactNode; mono?: boolean }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-ink">{title}</span>
      {sub && <span className={cn('block truncate text-xs text-ink-3', mono && 'font-mono text-[11px]')}>{sub}</span>}
    </span>
  )
}

/** A figure with a thin bar beside it. The number is the value; the bar is the picture of it. */
export function Gauge({
  value,
  max = 100,
  tone,
  label,
  className,
}: {
  value: number
  max?: number
  tone: 'ok' | 'warn' | 'danger' | 'accent'
  label: string
  className?: string
}) {
  return (
    <div className={cn('flex w-full min-w-0 items-center justify-end gap-2', className)}>
      <Bar value={value} max={max} tone={tone} label={label} className="h-1 min-w-6 flex-1" />
      <span aria-hidden className="num w-6 shrink-0 text-right text-ink">
        {Math.round(value)}
      </span>
    </div>
  )
}

export function scoreTone(score: number): 'ok' | 'accent' | 'warn' | 'danger' {
  return score >= 90 ? 'ok' : score >= 75 ? 'accent' : score >= 55 ? 'warn' : 'danger'
}
