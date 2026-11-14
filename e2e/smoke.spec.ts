import { expect, test } from '@playwright/test'

/**
 * Every screen, at every size. Two things must hold everywhere: nothing
 * throws, and nothing makes the page scroll sideways. This is the floor, not
 * the review — a screen still has to be looked at.
 */
const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone on its side', width: 844, height: 390 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large desktop', width: 1920, height: 1080 },
]

const ROUTES = [
  '',
  'loop',
  'loop/properties',
  'loop/properties/p_totara',
  'loop/properties/p_kowhai?tab=compliance',
  'loop/properties/p_kowhai?tab=money',
  'loop/properties/p_totara?tab=records',
  'loop/money',
  'loop/money?tab=ledger',
  'loop/money?tab=tax',
  'loop/money?tab=savings',
  'loop/repairs',
  'loop/repairs?job=tk_sink',
  'loop/tenancies',
  'loop/tenancies?view=applicants',
  'loop/tenancies?view=changes',
  'loop/tenancies?view=notices',
  'loop/inspections',
  'loop/services',
  'loop/rulebook',
  'loop/rulebook?tab=dates',
  'loop/rulebook?tab=penalties',
  'loop/rulebook?tab=changes',
  'loop/rulebook?tab=compare',
  'loop/settings',
  'pool',
  'pool/search',
  'pool/listing/p_harbour',
  'pool/repairs',
  'pool/passport',
  'pool/me',
  'admin',
  'admin/queue',
  'admin/orgs',
  'admin/people',
  'admin/feedback',
  'admin/rules',
  'admin/rules?change=rc_drill',
  'admin/healing',
  'admin/assistant',
  'admin/network',
  'admin/migration',
  'admin/audit',
]

for (const size of SIZES) {
  test(`every screen holds at ${size.width}×${size.height} (${size.name})`, async ({ page }) => {
    const problems: string[] = []
    let where = ''
    page.on('pageerror', (e) => problems.push(`${where}: threw ${e.message}`))
    page.on('console', (m) => {
      // Map tiles and fonts can fail on a machine with no network; that is not the app.
      if (m.type() === 'error' && !/Failed to load resource|net::ERR|tiles\.openfreemap/i.test(m.text())) problems.push(`${where}: console error ${m.text().slice(0, 160)}`)
    })
    await page.setViewportSize({ width: size.width, height: size.height })

    for (const route of ROUTES) {
      where = `/${route}`
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page.locator('h1, h2').first()).toBeVisible()
      await page.waitForTimeout(route.startsWith('pool/search') ? 1500 : 250)
      // Passed as text: this file is type-checked without the DOM library.
      const sideways = await page.evaluate<number>('document.documentElement.scrollWidth - window.innerWidth')
      if (sideways > 1) problems.push(`${where}: scrolls sideways by ${sideways}px`)
      const stillBuilding = await page.getByText(/ is being built$/).count()
      if (stillBuilding) problems.push(`${where}: still a placeholder`)
    }
    expect(problems, problems.join('\n')).toEqual([])
  })
}
