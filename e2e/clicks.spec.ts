import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * Every control, clicked.
 *
 * For each screen this presses every button, tab, radio, switch, checkbox,
 * disclosure and internal link once, from a fresh copy of the demo each time.
 * Whatever a click opens — a sheet, a dialog, a menu — has its own controls
 * pressed too.
 *
 * It fails on what is never acceptable: something throws, the console
 * reports an error, or the page scrolls sideways. It also writes down what a
 * person should then look at: a control that did nothing, a control that is
 * disabled, and anything that opened and would not close with Escape.
 *
 *   npm run build:pages
 *   npx playwright test clicks
 */
const PORTALS: Record<string, string[]> = {
  loop: [
    'loop',
    'loop/properties',
    'loop/properties/p_totara',
    'loop/properties/p_ngaio?tab=compliance',
    'loop/properties/p_kowhai?tab=money',
    'loop/properties/p_totara?tab=records',
    'loop/money',
    'loop/money?tab=ledger',
    'loop/money?tab=tax',
    'loop/money?tab=savings',
    'loop/repairs',
    'loop/repairs?job=tk_sink',
    'loop/repairs?job=tk_fan',
    'loop/tenancies',
    'loop/tenancies?view=applicants',
    'loop/tenancies?view=changes',
    'loop/tenancies?view=notices',
    'loop/inspections',
    'loop/services',
    'loop/rulebook',
    'loop/rulebook?tab=dates',
    'loop/rulebook?tab=changes',
    'loop/rulebook?tab=compare',
    'loop/settings',
  ],
  pool: ['pool', 'pool/search', 'pool/listing/p_harbour', 'pool/repairs', 'pool/passport', 'pool/me'],
  admin: ['admin', 'admin/queue', 'admin/orgs', 'admin/people', 'admin/feedback', 'admin/rules', 'admin/rules?change=rc_drill', 'admin/healing', 'admin/assistant', 'admin/network', 'admin/migration', 'admin/audit'],
}

const KINDS = 'button, [role=tab], [role=radio], [role=switch], [role=checkbox], summary, a[href]'
const scoped = (scope: string) =>
  KINDS.split(', ')
    .map((k) => `${scope} ${k}`)
    .join(', ')

interface Control {
  i: number
  name: string
  visible: boolean
  disabled: boolean
  selected: boolean
  external: boolean
}

// Evaluated in the page, passed as text because this file is type-checked without the DOM library.
const list = (selector: string) => `(() => Array.from(document.querySelectorAll(${JSON.stringify(selector)})).map((e, i) => {
  const r = e.getBoundingClientRect()
  const href = e.getAttribute('href')
  return {
    i,
    name: (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || '').trim().replace(/\\s+/g, ' ').slice(0, 70),
    visible: r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden',
    disabled: e.disabled === true || e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-disabled'),
    selected: ['aria-checked', 'aria-selected', 'aria-pressed'].some((a) => e.getAttribute(a) === 'true') || e.hasAttribute('aria-current'),
    external: !!href && /^(https?:|mailto:|tel:)/.test(href),
  }
}))()`

const SNAPSHOT = `(() => {
  const t = document.body.innerHTML
  let h = 0
  for (let i = 0; i < t.length; i += 5) h = (h * 31 + t.charCodeAt(i)) | 0
  return [t.length, h, location.pathname + location.search, document.querySelectorAll('[role=dialog], [role=menu], [role=listbox], [data-sonner-toast]').length].join('|')
})()`
const OPEN = `document.querySelectorAll('[role=dialog], [role=alertdialog], [role=menu]').length`
const SIDEWAYS = `document.documentElement.scrollWidth - window.innerWidth`
const RESET = `localStorage.removeItem('loop-pool:store')`

for (const [portal, routes] of Object.entries(PORTALS)) {
  test(`every control in ${portal} can be pressed`, async ({ page }) => {
    test.setTimeout(45 * 60_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const failures: string[] = []
    const review: string[] = []
    let where = ''
    let pressed = 0
    let downloaded = false
    page.on('pageerror', (e) => failures.push(`${where}: threw ${e.message.slice(0, 200)}`))
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap/i.test(m.text())) failures.push(`${where}: console error ${m.text().slice(0, 200)}`)
    })
    page.on('dialog', (d) => void d.dismiss())
    page.on('download', () => (downloaded = true))
    page.on('popup', (p) => void p.close())

    const fresh = async (route: string) => {
      await page.goto(route)
      await page.evaluate(RESET)
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(route.startsWith('pool/search') ? 1200 : 350)
    }
    const press = async (selector: string, c: Control) => {
      downloaded = false
      await page
        .locator(selector)
        .nth(c.i)
        .click({ timeout: 2500 })
        .catch(() => review.push(`${where}: could not be pressed (covered or off screen)`))
      pressed++
      await page.waitForTimeout(280)
      const sideways = await page.evaluate<number>(SIDEWAYS)
      if (sideways > 1) failures.push(`${where}: page scrolls sideways by ${sideways}px afterwards`)
    }
    const usable = (c: Control) => c.visible && !c.external && c.name !== 'Close' && !/^Skip to (main )?content/i.test(c.name)

    for (const route of routes) {
      await fresh(route)
      const top = (await page.evaluate<Control[]>(list(scoped('main')))).filter(usable)
      for (const c of top) {
        if (c.disabled) {
          review.push(`/${route} “${c.name}”: is disabled — does the screen say why?`)
          continue
        }
        where = `/${route} “${c.name}”`
        const before = await page.evaluate<string>(SNAPSHOT)
        const url = page.url()
        await press(scoped('main'), c)
        const after = await page.evaluate<string>(SNAPSHOT)
        const opened = await page.evaluate<number>(OPEN)

        if (after === before && !downloaded && !c.selected) review.push(`${where}: nothing visibly happened`)

        if (opened > 0) {
          // Press everything inside what opened, each from a fresh start.
          const inner = (await page.evaluate<Control[]>(list(scoped('[role=dialog], [role=alertdialog], [role=menu]')))).filter(usable).slice(0, 16)
          for (const d of inner) {
            if (d.disabled) {
              review.push(`${where} → “${d.name}”: is disabled — does it say why?`)
              continue
            }
            await fresh(route)
            await page.locator(scoped('main')).nth(c.i).click({ timeout: 2500 }).catch(() => undefined)
            await page.waitForTimeout(300)
            where = `/${route} “${c.name}” → “${d.name}”`
            const b2 = await page.evaluate<string>(SNAPSHOT)
            await press(scoped('[role=dialog], [role=alertdialog], [role=menu]'), d)
            const a2 = await page.evaluate<string>(SNAPSHOT)
            if (a2 === b2 && !downloaded && !d.selected) review.push(`${where}: nothing visibly happened`)
          }
          await fresh(route)
          await page.locator(scoped('main')).nth(c.i).click({ timeout: 2500 }).catch(() => undefined)
          await page.waitForTimeout(250)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(450)
          if ((await page.evaluate<number>(OPEN)) > 0) review.push(`/${route} “${c.name}”: what it opens does not close with Escape`)
          await fresh(route)
        } else if (after !== before || page.url() !== url) {
          await fresh(route)
        }
      }
    }

    const report = [`# ${portal}: ${pressed} presses`, '', '## Never acceptable', ...(failures.length ? failures : ['Nothing.']), '', '## For a person to look at', ...(review.length ? review : ['Nothing.'])].join('\n')
    writeFileSync(`test-results/clicks-${portal}.md`, report)
    console.log(report)
    expect(failures, failures.join('\n')).toEqual([])
  })
}
