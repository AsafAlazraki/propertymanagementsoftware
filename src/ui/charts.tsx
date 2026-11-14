/**
 * Charts.
 *
 * A few fixed rules, the same in every portal: thin marks, a square baseline
 * and a 4px rounded data end, 2px lines over a 10% wash, hairline grid, text in
 * ink tokens (never the series colour), a tooltip on every mark, and — because
 * two of the series hues are light on white — every chart can show its figures
 * as a table. One series needs no legend: the title already names it.
 */
import { useId, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Table } from '@phosphor-icons/react'
import { cn } from './cn'

export interface Series {
  key: string
  label: string
  /** A CSS colour. Defaults to the fixed series order. */
  color?: string
}

type Row = { label: string } & Record<string, number | string>

const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
const colorOf = (s: Series, i: number) => s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]

const axisTick = { fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--ff-sans)' }

function compact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 10_000) return `${Math.round(n / 1000)}K`
  return n.toLocaleString('en-NZ')
}

/** Axis labels: thousands always shorten the same way, so 10,500 never reads as "11K". */
function axisLabel(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${Number((n / 1_000_000).toFixed(1))}M`
  if (abs >= 1000) return `${Number((n / 1000).toFixed(1))}K`
  return n.toLocaleString('en-NZ')
}

/** Round ticks from zero: a step of 1, 2, 2.5 or 5 times a power of ten. */
function niceAxis(data: Row[], series: Series[], stacked?: boolean): { domain: [number, number]; ticks: number[] } {
  let lo = 0
  let hi = 0
  for (const row of data) {
    if (stacked) {
      const values = series.map((s) => Number(row[s.key]) || 0)
      hi = Math.max(
        hi,
        values.filter((v) => v > 0).reduce((a, b) => a + b, 0),
      )
      lo = Math.min(
        lo,
        values.filter((v) => v < 0).reduce((a, b) => a + b, 0),
      )
    } else {
      for (const s of series) {
        const v = Number(row[s.key]) || 0
        hi = Math.max(hi, v)
        lo = Math.min(lo, v)
      }
    }
  }
  if (hi === lo) hi = lo + 1
  const raw = (hi - lo) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const min = Math.floor(lo / step) * step
  const max = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { domain: [min, max], ticks }
}

interface TipProps {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; value?: number | string; color?: string; name?: string }[]
  series: Series[]
  format: (n: number) => string
}

/** Values lead, labels follow; a short stroke of the series colour keys each row. */
function ChartTip({ active, label, payload, series, format }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md bg-surface px-3 py-2 shadow-pop">
      <p className="mb-1 text-[11px] text-ink-3">{label}</p>
      {payload.map((p, i) => {
        const s = series.find((x) => x.key === p.dataKey)
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: s ? colorOf(s, series.indexOf(s)) : p.color }}
            />
            <span className="num font-semibold text-ink">{format(Number(p.value ?? 0))}</span>
            {series.length > 1 && <span className="text-ink-3">{s?.label ?? p.name ?? i}</span>}
          </p>
        )
      })}
    </div>
  )
}

/** Title, optional legend, the plot, and the same figures as a table on request. */
export function ChartFrame({
  title,
  subtitle,
  series,
  rows,
  format,
  children,
  aside,
  className,
}: {
  title: string
  subtitle?: ReactNode
  series: Series[]
  rows: Row[]
  format: (n: number) => string
  children: ReactNode
  aside?: ReactNode
  className?: string
}) {
  const [asTable, setAsTable] = useState(false)
  const id = useId()
  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {series.length > 1 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {series.map((s, i) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: colorOf(s, i) }} />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          {aside}
          <button
            type="button"
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
            className={cn(
              'pressable grid size-8 place-items-center rounded-sm text-ink-3 hoverable:hover:bg-sunken hoverable:hover:text-ink coarse:size-10',
              asTable && 'bg-sunken text-ink',
            )}
            aria-label={asTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
          >
            <Table className="size-4" />
          </button>
        </div>
      </figcaption>
      {asTable ? (
        <div role="region" aria-labelledby={id} tabIndex={0} className="max-h-72 overflow-auto rounded-md bg-sunken/60">
          <table aria-labelledby={id} className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-sunken text-xs text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Period
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 font-normal text-ink-2">
                    {r.label}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="num px-3 py-1.5 text-right text-ink">
                      {format(Number(r[s.key] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-labelledby={id}>
          {children}
        </div>
      )}
    </figure>
  )
}

interface PlotProps {
  title: string
  subtitle?: ReactNode
  data: Row[]
  series: Series[]
  format?: (n: number) => string
  height?: number
  stacked?: boolean
  aside?: ReactNode
  className?: string
}

/** Columns from one baseline. Capped at 24px wide; the rest of the band is air. */
export function Columns({
  title,
  subtitle,
  data,
  series,
  format = compact,
  height = 220,
  stacked,
  aside,
  className,
}: PlotProps) {
  // A series that dips below zero keeps zero on the axis, and its negative bars read as a shortfall.
  const dips = data.some((row) => series.some((s) => Number(row[s.key]) < 0))
  const axis = niceAxis(data, series, stacked)
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      series={series}
      rows={data}
      format={format}
      aside={aside}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%" barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--line-strong)' }}
            tick={axisTick}
            tickMargin={6}
            minTickGap={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={axisLabel}
            width={44}
            domain={axis.domain}
            ticks={axis.ticks}
          />
          {dips && <ReferenceLine y={0} stroke="var(--line-strong)" />}
          <Tooltip
            cursor={{ fill: 'var(--bg-sunken)', opacity: 0.6 }}
            isAnimationActive={false}
            content={(p) => <ChartTip {...(p as unknown as TipProps)} series={series} format={format} />}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'stack' : undefined}
              fill={colorOf(s, i)}
              maxBarSize={24}
              radius={stacked && i < series.length - 1 ? 0 : dips ? 3 : [4, 4, 0, 0]}
              stroke={stacked ? 'var(--surface)' : undefined}
              strokeWidth={stacked ? 2 : 0}
              isAnimationActive={false}
            >
              {dips &&
                series.length === 1 &&
                data.map((row) => (
                  <Cell key={row.label} fill={Number(row[s.key]) < 0 ? 'var(--danger)' : colorOf(s, i)} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** Change over time: a 2px line over a faint wash, with a crosshair that finds the date for you. */
export function Trend({
  title,
  subtitle,
  data,
  series,
  format = compact,
  height = 220,
  stacked,
  aside,
  className,
}: PlotProps) {
  const gid = useId().replace(/:/g, '')
  const axis = niceAxis(data, series, stacked)
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      series={series}
      rows={data}
      format={format}
      aside={aside}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colorOf(s, i)} stopOpacity={0.16} />
                <stop offset="1" stopColor={colorOf(s, i)} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--line-strong)' }}
            tick={axisTick}
            tickMargin={6}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={axisLabel}
            width={44}
            domain={axis.domain}
            ticks={axis.ticks}
          />
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
            isAnimationActive={false}
            content={(p) => <ChartTip {...(p as unknown as TipProps)} series={series} format={format} />}
          />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'stack' : undefined}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={`url(#${gid}-${i})`}
              dot={false}
              activeDot={{ r: 4, fill: colorOf(s, i), stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** A twelve-point trace for a stat tile. Decorative: the figure beside it carries the value. */
export function Spark({
  values,
  width = 96,
  height = 28,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = (width - 4) / (values.length - 1)
  const pts = values.map((v, i) => [2 + i * step, height - 3 - ((v - min) / span) * (height - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={cn('shrink-0 overflow-visible', className)}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  )
}

/** One whole split into parts, with a 2px gap doing the separating and a legend that carries the values. */
export function Segments({
  parts,
  format = compact,
  label,
  className,
}: {
  parts: { label: string; value: number; color?: string }[]
  format?: (n: number) => string
  label: string
  className?: string
}) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  const shown = parts.filter((p) => p.value > 0)
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${label}: ${shown.map((p) => `${p.label} ${format(p.value)}`).join(', ')}`}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {shown.map((p, i) => (
          <span
            key={p.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(p.value / total) * 100}%`,
              background: p.color ?? SERIES_COLORS[i % SERIES_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-1.5 text-xs text-ink-2">
            <span
              aria-hidden
              className="size-2.5 rounded-[3px]"
              style={{ background: p.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {p.label}
            <span className="num font-semibold text-ink">{format(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
