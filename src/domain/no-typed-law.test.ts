/**
 * The law is never written from memory — and a sentence is where it most
 * easily is. The calculators read the rule pack; this test keeps the words
 * beside them doing the same.
 *
 * It reads the assistant and the action queue as text and fails when a string
 * or a template literal states a time period ("21 days", "a 14-day notice",
 * "four weeks") in its own words. A period that comes from the pack arrives
 * through a `${…}` expression, which is code, so it passes.
 *
 * It looks for time periods only. Money, temperatures, R-values and dates are
 * not caught; copilot.ts says at its head which of those it still types.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const FILES = ['src/domain/copilot.ts', 'src/domain/actions.ts'] as const
type File = (typeof FILES)[number]

interface Allowance {
  file: File
  /** The exact words, as they stand in the source. */
  phrase: string
  why: string
}

/** Periods that are not law. Each one says whose number it is. */
const NOT_LAW: Allowance[] = [
  {
    file: 'src/domain/copilot.ts',
    phrase: 'three or six months',
    why: 'How often insurers usually want an inspection. A policy condition, not a statute; the pack says the same in its notes on entry.inspection_min_interval.',
  },
]

/**
 * Periods that are law, were read at source in docs/research, and have no value
 * in the rule pack to be read from. They are typed in the sentence because
 * there is nowhere else for them to come from, so a published change cannot
 * reach them. Each is a rule the pack is missing: when it is added, read it
 * from there and delete the line here. This list is a debt, not a way to make
 * the test pass.
 */
const NOT_IN_PACK: Allowance[] = [
  {
    file: 'src/domain/copilot.ts',
    phrase: 'within 90 days, for at least 90 days',
    why: 'RTA s 51(2)(a): the conditions for an owner or their family moving in. The pack has them only in the plain text of termination.owner_occupy_notice. Research: nz-tenancy-law.md §10a.',
  },
  {
    file: 'src/domain/copilot.ts',
    phrase: 'within 28 days of the last of those notices',
    why: 'RTA s 55(1)(aa)(iv): the time to apply after repeated late rent. arrears.repeat_rule holds the occasions, how late and the period, not this. Research: nz-tenancy-law.md §10d.',
  },
  {
    file: 'src/domain/copilot.ts',
    phrase: '48 hours to 14 days of notice',
    why: 'RTA s 48(2)(ba): entry to test for methamphetamine. No rule key; it is not the routine-inspection rule. Research: nz-property-compliance.md §6.',
  },
  {
    file: 'src/domain/copilot.ts',
    phrase: 'in writing within 7 days',
    why: 'RTA s 48(3B): giving the tenant the test results. No rule key. Research: nz-property-compliance.md §6.',
  },
  {
    file: 'src/domain/copilot.ts',
    phrase: 'on 2 days of notice and a landlord on 7',
    why: 'RTA s 59B: ending a tenancy in a home above the uninhabitable level. No rule key. Research: nz-tenancy-law.md §10b.',
  },
]

const ALLOWED = [...NOT_LAW, ...NOT_IN_PACK]

/* ─────────────────────────── reading the source ─────────────────────────── */

interface Literal {
  /** The literal's own text. Each `${…}` is cut down to that mark: what is inside is code. */
  text: string
  line: number
}

const REGEX_MAY_FOLLOW = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'do',
  'else',
  'void',
  'throw',
  'new',
  'delete',
])

/**
 * Every string and template literal in a TypeScript source. Comments and
 * regular expressions are skipped; a literal nested inside a `${…}` is found
 * and reported as its own literal.
 */
function literals(source: string): Literal[] {
  const out: Literal[] = []
  let i = 0
  let line = 1
  /** The last thing seen in code, to tell `a / b` from `/pattern/`. */
  let last = ''

  const quoted = (quote: string) => {
    const start = line
    let text = ''
    i++
    while (i < source.length && source[i] !== quote && source[i] !== '\n') {
      if (source[i] === '\\') text += source[i++]
      text += source[i++] ?? ''
    }
    i++
    out.push({ text, line: start })
  }

  const template = () => {
    const start = line
    let text = ''
    i++
    while (i < source.length && source[i] !== '`') {
      if (source[i] === '\\') {
        text += source[i] + (source[i + 1] ?? '')
        i += 2
      } else if (source[i] === '$' && source[i + 1] === '{') {
        i += 2
        code(true)
        text += '${…}'
      } else {
        if (source[i] === '\n') line++
        text += source[i++]
      }
    }
    i++
    out.push({ text, line: start })
  }

  const regex = () => {
    let inClass = false
    i++
    while (i < source.length && source[i] !== '\n') {
      const c = source[i]
      if (c === '\\') i++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
      i++
    }
    i++
    while (/[a-z]/i.test(source[i] ?? '')) i++
  }

  /** Reads code. Inside a template's `${…}` it stops at the brace that closes the expression. */
  function code(inExpression: boolean): void {
    let depth = 0
    while (i < source.length) {
      const c = source[i]
      const next = source[i + 1]
      if (c === '\n') {
        line++
        i++
      } else if (c === '/' && next === '/') {
        while (i < source.length && source[i] !== '\n') i++
      } else if (c === '/' && next === '*') {
        const end = source.indexOf('*/', i + 2)
        const stop = end < 0 ? source.length : end + 2
        line += source.slice(i, stop).split('\n').length - 1
        i = stop
      } else if (c === "'" || c === '"') {
        quoted(c)
        last = 'literal'
      } else if (c === '`') {
        template()
        last = 'literal'
      } else if (c === '/' && (last === '' || REGEX_MAY_FOLLOW.has(last) || /^[^\w)\]}]$/.test(last))) {
        regex()
        last = 'literal'
      } else if (/[\w$]/.test(c)) {
        const word = /^[\w$]+/.exec(source.slice(i))![0]
        last = word
        i += word.length
      } else {
        if (c === '{') depth++
        if (c === '}') {
          if (inExpression && depth === 0) {
            i++
            return
          }
          depth--
        }
        if (!/\s/.test(c)) last = c
        i++
      }
    }
  }

  code(false)
  return out
}

/* ─────────────────────────── finding typed periods ──────────────────────── */

const WORDS =
  'two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety'
const ONES = 'one|two|three|four|five|six|seven|eight|nine'
const UNITS = 'working[\\s-]+days?|days?|weeks?|months?|hours?'
/** A number, in digits or as a word from two to ninety, followed by a unit of time: "21 days", "14-day", "four weeks". */
const TYPED_PERIOD = new RegExp(
  `(?<![\\w.])(?:\\d+(?:[.,]\\d+)*|(?:${WORDS})(?:-(?:${ONES}))?)[\\s\\u2010-\\u2013-]*(?:${UNITS})\\b`,
  'gi',
)

interface Found {
  line: number
  phrase: string
  sentence: string
}

function typedPeriods(source: string, allowed: string[] = [], used?: Set<string>): Found[] {
  const found: Found[] = []
  for (const literal of literals(source)) {
    let text = literal.text
    for (const phrase of allowed) {
      if (!text.includes(phrase)) continue
      used?.add(phrase)
      text = text.split(phrase).join(' … ')
    }
    for (const match of text.matchAll(TYPED_PERIOD)) {
      found.push({ line: literal.line, phrase: match[0], sentence: literal.text.slice(0, 140) })
    }
  }
  return found
}

const read = (file: File) => readFileSync(resolve(process.cwd(), file), 'utf8')
const allowedIn = (file: File) => ALLOWED.filter((a) => a.file === file).map((a) => a.phrase)

describe('statutory time periods in sentences', () => {
  it.each(FILES)('%s reads every period from the rule pack', (file) => {
    const found = typedPeriods(read(file), allowedIn(file))
    const report = found.map((f) => `${file}:${f.line}  “${f.phrase}”  in  ${f.sentence}`).join('\n')
    expect(
      found,
      `A time period is typed into a sentence. Read it from the pack (durationText(pack.rules[…].value)) so a published change reaches it:\n${report}\n`,
    ).toEqual([])
  })

  it('reads each file through to its last sentence without losing its place', () => {
    // A reader thrown by a quote inside a regular expression would take code for text from there on,
    // and would no longer find the sentences near the end of the file word for word.
    const late = {
      'src/domain/copilot.ts': 'What happens when my fixed term ends?',
      'src/domain/actions.ts': 'Sort them',
    }
    for (const file of FILES) {
      const all = literals(read(file))
      expect(all.length, file).toBeGreaterThan(100)
      expect(
        all.some((l) => l.text === late[file]),
        `${file}: “${late[file]}” was not read as a sentence`,
      ).toBe(true)
      expect(
        all.filter((l) => l.text.includes('\n')),
        `${file}: a literal runs over a line break`,
      ).toEqual([])
    }
  })

  it('keeps no allowance that is no longer needed', () => {
    for (const file of FILES) {
      const used = new Set<string>()
      const phrases = allowedIn(file)
      typedPeriods(read(file), phrases, used)
      expect(
        phrases.filter((p) => !used.has(p)),
        `allowed in ${file} but no longer there`,
      ).toEqual([])
    }
    // An allowance that hides nothing is not an allowance.
    for (const a of ALLOWED) expect(typedPeriods(`const s = '${a.phrase}'`), a.phrase).not.toEqual([])
    for (const a of ALLOWED) expect(a.why.length, a.phrase).toBeGreaterThan(20)
  })
})

describe('the check itself', () => {
  const phrases = (source: string) => typedPeriods(source).map((f) => f.phrase)

  it('catches a period typed in digits or in words', () => {
    expect(phrases(`const a = 'within 21 days of receiving it'`)).toEqual(['21 days'])
    expect(phrases(`const a = "Send them a 14-day notice"`)).toEqual(['14-day'])
    expect(phrases('const a = `the 23 working days ran out on ${when}`')).toEqual(['23 working days'])
    expect(phrases(`const a = 'at most four weeks of rent, or Twelve months'`)).toEqual(['four weeks', 'Twelve months'])
    expect(phrases(`const a = 'needs 48 hours and twenty-one days'`)).toEqual(['48 hours', 'twenty-one days'])
  })

  it('passes a period that arrives through an expression', () => {
    expect(phrases('const a = `within ${durationText(rule)} of receiving it`')).toEqual([])
    expect(phrases('const a = `Send them ${aDuration(rule)} notice; ${n} days late`')).toEqual([])
    expect(phrases("const a = `${plural(left, 'working day')} left`")).toEqual([])
  })

  it('still reads a literal nested inside an expression', () => {
    expect(phrases("const a = `if ${pool ? 'you give' : 'a 90-day'} notice ${`in ${'three weeks'}`}`")).toEqual([
      '90-day',
      'three weeks',
    ])
    expect(phrases('const a = `${ { a: `${1}` }.a } then 7 days`')).toEqual(['7 days'])
  })

  it('does not read comments, regular expressions or things that are not periods', () => {
    expect(phrases(`// 21 days\n/* a 14-day\n notice */\nconst a = 1 // it's 3 weeks`)).toEqual([])
    expect(phrases(`const re = { test: /hasn'?t paid for 21 days|["\`]/i, next: 'ok' }`)).toEqual([])
    expect(phrases(`const half = total / 2 / days; const b = '5 days'`)).toEqual(['5 days'])
    expect(
      phrases(`const a = ['Day 1', 'day one', '$25 a month', '1.5 kW', '24 December', '2024–25 year', '120 mm']`),
    ).toEqual([])
    expect(phrases(`const a = 'accepted on 29 June 2026. Working days leave out weekends'`)).toEqual([])
  })

  it('reports the line a literal starts on', () => {
    const found = typedPeriods(`const a = 1\n/* two\nlines */\nconst b = \`\n  ok\`\nconst c = '21 days'\n`)
    expect(found.map((f) => f.line)).toEqual([6])
  })
})
