/** Plain-text formatting for the domain layer (documents, sentences, exports). No React here. */

export function money(value: number, opts: { cents?: boolean; currency?: 'NZD' | 'AUD' } = {}): string {
  const cents = opts.cents ?? !Number.isInteger(value)
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: opts.currency ?? 'NZD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(value)
}

/** Adds money without drifting: every sum is rounded back to whole cents. */
export function sum(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function listOf(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
