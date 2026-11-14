/**
 * The scheduled watcher is a plain Node script and cannot import the rule
 * pack, so it reads the rules it may propose patches for from
 * `regwatch/rules.nz.json`. This test is what keeps that file honest: it fails
 * the moment the pack and the file disagree.
 *
 * To regenerate after changing the pack:
 *   UPDATE_RULE_INDEX=1 npx vitest run src/domain/jurisdictions/rule-index.test.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RuleKey } from './types'
import { NZ } from './nz'

const file = resolve(process.cwd(), 'regwatch/rules.nz.json')
const index = Object.fromEntries((Object.keys(NZ.rules) as RuleKey[]).map((key) => [key, { label: NZ.rules[key].label, value: NZ.rules[key].value }]))

describe('the watcher’s rule index', () => {
  it('matches the live New Zealand pack', () => {
    if (process.env.UPDATE_RULE_INDEX) writeFileSync(file, `${JSON.stringify(index, null, 2)}\n`)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(index)
  })
})
