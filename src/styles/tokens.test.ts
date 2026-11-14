/**
 * The contrast of the colour pairs the kit puts together, measured.
 *
 * `tokens.css` is read as text, its cascade is resolved for `<html data-brand
 * data-theme>` in each of the six combinations (specificity first, then source
 * order), and each OKLCH value is converted to the 8-bit sRGB a browser paints
 * (channels outside sRGB are clipped). The ratio is WCAG 2.x.
 *
 * Text needs 4.5:1 (WCAG 1.4.3). The edge of a control, the parts of a switch
 * and the focus ring need 3:1 (WCAG 1.4.11). A pair that fails here is a token
 * to change, never a threshold to lower.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

interface Block {
  selectors: string[]
  decls: Record<string, string>
}

const blocks: Block[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  decls: Object.fromEntries([...m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])),
}))

type Brand = 'loop' | 'pool' | 'admin'
type Theme = 'light' | 'dark'

/** The specificity with which a selector matches the root element, or -1 when it does not. */
function matches(selector: string, brand: Brand, theme: Theme): number {
  // A descendant selector needs an ancestor, and the root has none.
  if (/\s/.test(selector)) return -1
  let specificity = selector.includes(':root') ? 1 : 0
  let rest = selector.replace(':root', '')
  for (const [, attr, value] of rest.matchAll(/\[data-(brand|theme)='([^']+)'\]/g)) {
    if (value !== (attr === 'brand' ? brand : theme)) return -1
    specificity++
  }
  rest = rest.replace(/\[data-(brand|theme)='[^']+'\]/g, '')
  return rest === '' ? specificity : -1
}

/** Reads a token as the root element computes it for one brand and theme. */
function scope(brand: Brand, theme: Theme): (name: string) => string {
  const vars: Record<string, string> = {}
  blocks
    .map((b, order) => ({ b, order, specificity: Math.max(...b.selectors.map((s) => matches(s, brand, theme))) }))
    .filter((h) => h.specificity >= 0)
    .sort((x, y) => x.specificity - y.specificity || x.order - y.order)
    .forEach((h) => Object.assign(vars, h.b.decls))
  const get = (name: string, depth = 0): string => {
    const value = vars[name]
    if (value === undefined || depth > 8) throw new Error(`${name} is not defined for ${brand} ${theme}`)
    const alias = /^var\((--[\w-]+)\)$/.exec(value)
    return alias ? get(alias[1], depth + 1) : value
  }
  return get
}

/** OKLCH to the 8-bit sRGB a browser paints. */
function srgb(value: string): number[] {
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value)
  if (!m) throw new Error(`Cannot read the colour "${value}"`)
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180]
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map((linear) => {
    const x = Math.min(1, Math.max(0, linear))
    return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))
  })
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((channel) => {
    const x = channel / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(one: string, other: string): number {
  const [hi, lo] = [luminance(srgb(one)), luminance(srgb(other))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SCOPES: [Brand, Theme][] = [
  ['loop', 'light'],
  ['loop', 'dark'],
  ['pool', 'light'],
  ['pool', 'dark'],
  ['admin', 'light'],
  ['admin', 'dark'],
]

/** Text on the surface it is printed on. */
const TEXT: [string, string][] = [
  ['--ink', '--bg'],
  ['--ink', '--surface'],
  ['--ink', '--bg-sunken'],
  ['--ink-2', '--bg'],
  ['--ink-2', '--surface'],
  ['--ink-2', '--bg-sunken'],
  ['--ink-3', '--bg'],
  ['--ink-3', '--surface'],
  ['--ink-3', '--bg-sunken'],
  ['--ink-3', '--accent-soft'],
  ['--accent-ink', '--accent'],
  ['--accent-text', '--accent-soft'],
  ['--accent-text', '--surface'],
  ['--ok-text', '--ok-soft'],
  ['--warn-text', '--warn-soft'],
  ['--warn-ink', '--warn'],
  ['--danger-text', '--danger-soft'],
  ['--danger-ink', '--danger'],
  ['--info-text', '--info-soft'],
  ['--nav-ink', '--nav'],
  ['--nav-ink', '--nav-2'],
  ['--nav-ink-2', '--nav'],
  ['--nav-ink-2', '--nav-2'],
]

/** What marks out a control: the edge of a field, the two parts of a switch off and on, the focus ring. */
const CONTROLS: [string, string][] = [
  ['--field-line', '--surface'],
  ['--field-line', '--surface-2'],
  ['--field-line', '--bg'],
  ['--field-line', '--bg-sunken'],
  ['--field-line', '--accent-soft'],
  ['--ink-3', '--surface'], // the switch's track, off
  ['--ink-3', '--bg'],
  ['--ink-3', '--bg-sunken'],
  ['--surface', '--ink-3'], // its thumb, off
  ['--accent', '--surface'], // its track, on
  ['--accent', '--bg'],
  ['--accent', '--bg-sunken'],
  ['--accent-ink', '--accent'], // its thumb, on
  ['--focus', '--surface'],
  ['--focus', '--bg'],
  ['--focus', '--bg-sunken'],
  ['--focus', '--nav'],
]

describe('the colour arithmetic', () => {
  it('gives black on white as 21:1 and paints the gamut’s corners exactly', () => {
    expect(srgb('oklch(1 0 0)')).toEqual([255, 255, 255])
    expect(srgb('oklch(0 0 0)')).toEqual([0, 0, 0])
    expect(contrast('oklch(1 0 0)', 'oklch(0 0 0)')).toBeCloseTo(21, 5)
  })

  it('resolves the cascade the way the root element does', () => {
    // The dark root rule is more specific than a brand rule, so a brand's dark block has to win by coming later.
    expect(scope('loop', 'light')('--surface')).toBe('oklch(1 0 0)')
    expect(scope('pool', 'dark')('--surface')).toBe('oklch(0.228 0.026 285)')
    // An alias is followed to the value it points at, in the same scope.
    expect(scope('pool', 'light')('--nav')).toBe(scope('pool', 'light')('--surface'))
    expect(scope('pool', 'dark')('--nav')).toBe(scope('pool', 'dark')('--surface'))
  })
})

describe.each(SCOPES)('%s, %s', (brand, theme) => {
  const get = scope(brand, theme)

  it.each(TEXT)('%s on %s is readable as text (4.5:1)', (ink, ground) => {
    expect(contrast(get(ink), get(ground))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(CONTROLS)('%s against %s can be made out as part of a control (3:1)', (mark, ground) => {
    expect(contrast(get(mark), get(ground))).toBeGreaterThanOrEqual(3)
  })
})

describe('pairs known to fall short, from the round-2 quality audit', () => {
  // Each of these is drawn beside a figure or a word that carries the same information.
  it.todo(
    '--warn as a fill on --surface and --bg-sunken reaches 3:1 in the light themes (A-06: rings, bars, day tracks)',
  )
  it.todo('--series-3 and --series-4 reach 3:1 on --surface in the light themes (every chart also offers its table)')
  it.todo('--accent-text on --nav-2 reaches 4.5:1 in Loop and the team console, light (A-07: the decorative § on navy)')
})
