/**
 * The regulatory watcher's reading rules.
 *
 * Detection is deterministic: fetch a page, take the one region that carries
 * the law, turn it into lines, and compare those lines with the ones seen last
 * time. No model is involved in deciding whether something changed.
 *
 * This file has no imports on purpose. The scheduled script
 * (`scripts/reg-watch.mjs`) loads it directly with Node, and the unit tests
 * load it with Vitest, so the code that runs every night is the code that is
 * tested. Keep it to syntax Node can strip: no enums, no namespaces.
 */

export interface WatchSource {
  id: string
  name: string
  url: string
  type: 'html' | 'rss' | 'atom' | 'json'
  jurisdiction: string
  signal: string
  fetchOk: boolean
  /** One compound CSS selector (`main#main`, `div.news-result`, `act`). Null hashes the whole document. */
  selector: string | null
  frequency: 'daily' | 'weekly'
  priority: 1 | 2 | 3
  /** For the few sources that are not a plain GET. */
  request?: { method: 'POST'; body: unknown }
  /** For JSON: which fields carry the signal. Everything else is ignored. */
  pick?: { list?: string; fields: string[] }
  notes?: string
}

/** What is kept between runs. Line keys are hashes, so no page text is republished by committing this. */
export interface SourceState {
  hash: string
  lineKeys: string[]
  lastCheckedAt: string
  lastChangedAt: string | null
  etag?: string
  lastModified?: string
  /** Consecutive runs that could not read the source. */
  failures: number
}

/* ───────────────────────────────── hashing ──────────────────────────────── */

/** cyrb53: a fast 53-bit string hash. Not cryptographic; it only has to tell two lines apart. */
export function lineKey(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function hashOf(lines: string[]): string {
  return lineKey(lines.join('\n'))
}

/* ─────────────────────────── bot-challenge pages ────────────────────────── */

/**
 * Markers of a "prove you are human" page. A site that answers with one has
 * not changed its law; the fetch failed.
 */
export const CHALLENGE_PATTERN = /_Incapsula_Resource|Just a moment\.\.\.|cf-chl-|Attention Required!|Checking your browser|Access Denied|Request unsuccessful\. Incapsula/i

export function isChallenge(body: string): boolean {
  return CHALLENGE_PATTERN.test(body.slice(0, 20_000))
}

/* ─────────────────────────────── HTML and XML ───────────────────────────── */

const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'cite', 'code', 'em', 'i', 'kbd', 'label', 'mark', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'citation', 'extref', 'intref', 'emphasis', 'amend', 'insertwords', 'def-term', 'atidlm:link', 'atidlm:linkcontent', 'atidlm:resourcepair'])

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' }

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

/** Removes what is never content: scripts, styles, comments, inline SVG. */
export function stripNoise(markup: string): string {
  return markup
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\?[\s\S]*?\?>/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

interface Compound {
  tag: string | null
  id: string | null
  classes: string[]
}

export function parseSelector(selector: string): Compound {
  const m = /^([a-z][\w:-]*)?((?:[#.][\w-]+)*)$/i.exec(selector.trim())
  if (!m) throw new Error(`Unsupported selector: ${selector}`)
  const parts = m[2].match(/[#.][\w-]+/g) ?? []
  return {
    tag: m[1] ? m[1].toLowerCase() : null,
    id: parts.find((p) => p[0] === '#')?.slice(1) ?? null,
    classes: parts.filter((p) => p[0] === '.').map((p) => p.slice(1)),
  }
}

function attr(tagText: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tagText)
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null
}

/**
 * The inner markup of every element that matches one compound selector, in
 * document order. Returns null when nothing matches — which the watcher
 * treats as a failed read, never as "the page is now empty".
 */
export function selectRegion(markup: string, selector: string | null): string | null {
  if (!selector) return markup
  const want = parseSelector(selector)
  const open = new RegExp(`<(${want.tag ? want.tag.replace(/[:]/g, '\\$&') : '[a-z][\\w:-]*'})\\b[^>]*>`, 'gi')
  const found: string[] = []
  let m: RegExpExecArray | null
  while ((m = open.exec(markup)) !== null) {
    const tagText = m[0]
    if (want.id !== null && attr(tagText, 'id') !== want.id) continue
    if (want.classes.length) {
      const have = (attr(tagText, 'class') ?? '').split(/\s+/)
      if (!want.classes.every((c) => have.includes(c))) continue
    }
    if (tagText.endsWith('/>')) continue
    const tag = m[1]
    const walker = new RegExp(`<(/?)${tag.replace(/[:]/g, '\\$&')}\\b[^>]*>`, 'gi')
    walker.lastIndex = open.lastIndex
    let depth = 1
    let end = -1
    let w: RegExpExecArray | null
    while ((w = walker.exec(markup)) !== null) {
      if (w[1]) depth--
      else if (!w[0].endsWith('/>')) depth++
      if (depth === 0) {
        end = w.index
        break
      }
    }
    if (end === -1) continue
    found.push(markup.slice(open.lastIndex, end))
    // Matches do not nest for the selectors the registry uses; carry on after this element.
    open.lastIndex = end
  }
  return found.length ? found.join('\n') : null
}

/** Text lines from markup: inline tags join their neighbours, every other tag ends a line. */
export function toLines(markup: string): string[] {
  const text = markup.replace(/<(\/?)([a-z][\w:-]*)\b[^>]*>/gi, (_whole, _slash: string, tag: string) => (INLINE.has(tag.toLowerCase()) ? ' ' : '\n'))
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    // A one-character line is kept: in a table, "4" on its own can be the whole rule.
    .filter((l) => l.length > 0)
}

/* ───────────────────────────── feeds and sitemaps ───────────────────────── */

function firstTag(block: string, names: string[]): string {
  for (const name of names) {
    const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}\\s*>`, 'i').exec(block)
    if (m) return decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  }
  return ''
}

/** One line per feed item, keyed on what identifies it. The channel header is ignored: it often carries today's date. */
export function feedLines(xml: string): string[] {
  const clean = stripNoise(xml)
  const blocks = clean.match(/<(item|entry)\b[\s\S]*?<\/\1\s*>/gi) ?? []
  return blocks
    .map((b) => {
      const link = firstTag(b, ['link', 'guid', 'id']) || (/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(b)?.[1] ?? '')
      return [firstTag(b, ['title']), link, firstTag(b, ['updated', 'pubDate', 'published', 'dc:date'])].filter(Boolean).join(' | ')
    })
    .filter((l) => l.length > 1)
}

/**
 * A sitemap as `loc | lastmod` lines. Only entries modified on or after
 * `since` are kept, so a 40,000-entry sitemap is watched as "what moved
 * lately" rather than stored whole.
 */
export function sitemapLines(xml: string, since: string): string[] {
  const out: string[] = []
  const re = /<url\b[^>]*>([\s\S]*?)<\/url\s*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const loc = firstTag(m[1], ['loc'])
    const lastmod = firstTag(m[1], ['lastmod']).slice(0, 10)
    if (loc && lastmod && lastmod >= since) out.push(`${loc} | ${lastmod}`)
  }
  return out.sort()
}

/* ─────────────────────────────────── JSON ───────────────────────────────── */

function dig(value: unknown, path: string): unknown {
  let at: unknown = value
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null) return undefined
    at = (at as Record<string, unknown>)[key]
  }
  return at
}

/** Named fields only. A JSON API's timings and request ids change on every call. */
export function jsonLines(text: string, pick: WatchSource['pick']): string[] | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!pick) return [JSON.stringify(data)]
  const show = (v: unknown) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  if (pick.list) {
    const rows = dig(data, pick.list)
    if (!Array.isArray(rows)) return null
    return rows.map((row) => pick.fields.map((f) => show(dig(row, f))).join(' | '))
  }
  return pick.fields.map((f) => `${f} | ${show(dig(data, f))}`)
}

/* ───────────────────────────────── reading ──────────────────────────────── */

export type Reading = { ok: true; lines: string[] } | { ok: false; why: string }

/**
 * Turns a response body into the lines to compare.
 * `today` is only used to bound a sitemap to recent entries.
 */
export function read(source: WatchSource, body: string, today: string): Reading {
  if (isChallenge(body)) return { ok: false, why: 'The site answered with a bot-challenge page.' }
  if (source.type === 'json') {
    const lines = jsonLines(body, source.pick)
    return lines ? { ok: true, lines } : { ok: false, why: 'The response was not the JSON shape expected.' }
  }
  if (source.type === 'rss' || source.type === 'atom') {
    if (!/<(rss|feed|rdf:RDF)\b/i.test(body)) return { ok: false, why: 'The response was not a feed.' }
    // A feed with no items is normal between publications.
    return { ok: true, lines: feedLines(body) }
  }
  const clean = stripNoise(body)
  if (source.selector === 'urlset') {
    if (!/<urlset\b/i.test(clean)) return { ok: false, why: 'The response was not a sitemap.' }
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 45)
    return { ok: true, lines: sitemapLines(clean, d.toISOString().slice(0, 10)) }
  }
  const region = selectRegion(clean, source.selector)
  if (region === null) return { ok: false, why: `The region “${source.selector}” was not on the page.` }
  const lines = toLines(region)
  if (lines.length === 0) return { ok: false, why: 'The region was empty.' }
  return { ok: true, lines }
}

/* ───────────────────────────────── comparing ────────────────────────────── */

export interface Comparison {
  changed: boolean
  hash: string
  lineKeys: string[]
  /** Lines present now that were not there before, in page order. */
  added: string[]
  /** How many earlier lines are gone. Their text is not kept, so it cannot be shown. */
  removed: number
}

export function compare(previous: Pick<SourceState, 'hash' | 'lineKeys'> | undefined, lines: string[]): Comparison {
  const lineKeys = lines.map(lineKey)
  const hash = hashOf(lines)
  if (!previous) return { changed: false, hash, lineKeys, added: [], removed: 0 }
  if (previous.hash === hash) return { changed: false, hash, lineKeys, added: [], removed: 0 }
  const before = new Set(previous.lineKeys)
  const now = new Set(lineKeys)
  const added = lines.filter((_, i) => !before.has(lineKeys[i]))
  const removed = previous.lineKeys.filter((k) => !now.has(k)).length
  // The same lines in a new order is not a change worth a person's time.
  return { changed: added.length > 0 || removed > 0, hash, lineKeys, added, removed }
}

/** Whether a source is due, by its frequency. A weekly source is read once six and a half days have passed. */
export function isDue(source: Pick<WatchSource, 'frequency'>, lastCheckedAt: string | undefined, nowMs: number): boolean {
  if (!lastCheckedAt) return true
  const hours = (nowMs - Date.parse(lastCheckedAt)) / 3_600_000
  return hours >= (source.frequency === 'weekly' ? 156 : 20)
}

/** Short quotes for a public feed: a few lines, each cut to a sentence or two. */
export function excerpt(lines: string[], maxLines = 12, maxChars = 280): string[] {
  return lines.slice(0, maxLines).map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1)}…` : l))
}

/** True when `quote` appears word for word in the given lines, ignoring only runs of whitespace. */
export function quoteAppears(quote: string, lines: string[]): boolean {
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  const q = flat(quote)
  return q.length >= 12 && flat(lines.join(' ')).includes(q)
}
