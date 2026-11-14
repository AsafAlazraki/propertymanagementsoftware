import { describe, expect, it } from 'vitest'
import { compare, decodeEntities, excerpt, feedLines, isChallenge, isDue, jsonLines, quoteAppears, read, selectRegion, sitemapLines, toLines, type WatchSource } from './watcher'

const base: WatchSource = { id: 's', name: 'S', url: 'https://example.test/', type: 'html', jurisdiction: 'NZ', signal: 'regulator', fetchOk: true, selector: 'main#main', frequency: 'daily', priority: 1 }

const page = (inner: string, token: string) => `<!doctype html><html><head><script>var t="${token}"</script><style>.a{}</style></head><body>
<nav><a href="/">Home</a></nav>
<main id="main" class="page wide"><h1>Rent increases</h1><p>Rent can go up once every <strong>12 months</strong>.</p>${inner}</main>
<footer>Rendered ${token}</footer></body></html>`

describe('reading a region', () => {
  it('takes only the region, so a token elsewhere on the page changes nothing', () => {
    const a = read(base, page('<p>Notice is 60 days.</p>', 'abc'), '2026-11-14')
    const b = read(base, page('<p>Notice is 60 days.</p>', 'xyz'), '2026-11-14')
    expect(a).toEqual(b)
    expect(a.ok && a.lines).toEqual(['Rent increases', 'Rent can go up once every 12 months .', 'Notice is 60 days.'])
  })

  it('keeps inline tags inside their sentence and ends a line at block tags', () => {
    expect(toLines('<p>At least <em>28</em> days&rsquo; notice</p><ul><li>One</li><li>Two &amp; three</li></ul>')).toEqual(['At least 28 days’ notice', 'One', 'Two & three'])
  })

  it('matches by class, and joins every match in order', () => {
    const html = '<div class="news-result first">A</div><div class="other">X</div><div class="news-result">B <div>nested</div></div>'
    expect(toLines(selectRegion(html, 'div.news-result') ?? '')).toEqual(['A', 'B', 'nested'])
  })

  it('handles nested elements of the same tag', () => {
    expect(toLines(selectRegion('<div id="a"><div><div>deep</div></div>tail</div><div>after</div>', 'div#a') ?? '')).toEqual(['deep', 'tail'])
  })

  it('reads an XML root such as an Act', () => {
    const xml = '<?xml version="1.0"?><act date.as.at="2025-12-01"><title>Residential Tenancies Act 1986</title><prov id="DLM1"><para><text>The bond must not exceed <amend>4 weeks</amend> rent.</text></para></prov></act>'
    const r = read({ ...base, selector: 'act' }, xml, '2026-11-14')
    expect(r.ok && r.lines).toEqual(['Residential Tenancies Act 1986', 'The bond must not exceed 4 weeks rent.'])
  })

  it('decodes numeric and named entities and leaves unknown ones alone', () => {
    expect(decodeEntities('a&#8217;b &#x2014; c &nbsp;d &bogus;')).toBe('a’b — c  d &bogus;')
  })
})

describe('a failed read is never a change', () => {
  it('refuses a bot-challenge page', () => {
    expect(isChallenge('<html><title>Just a moment...</title></html>')).toBe(true)
    expect(read(base, '<html><body><script src="/_Incapsula_Resource?x"></script></body></html>', '2026-11-14')).toEqual({ ok: false, why: 'The site answered with a bot-challenge page.' })
  })

  it('refuses a page whose region has gone', () => {
    const r = read(base, '<html><body><div>Site maintenance</div></body></html>', '2026-11-14')
    expect(r.ok).toBe(false)
  })

  it('refuses something that is not a feed, but accepts an empty feed', () => {
    expect(read({ ...base, type: 'atom', selector: null }, '<html>nope</html>', '2026-11-14').ok).toBe(false)
    expect(read({ ...base, type: 'atom', selector: null }, '<feed xmlns="http://www.w3.org/2005/Atom"><updated>2026-11-14</updated></feed>', '2026-11-14')).toEqual({ ok: true, lines: [] })
  })
})

describe('feeds, sitemaps and JSON', () => {
  it('reads items and ignores the channel header', () => {
    const rss = (built: string) => `<rss><channel><title>News</title><lastBuildDate>${built}</lastBuildDate><item><title>Bond Hub &amp; you</title><link>https://example.test/a</link><pubDate>Thu, 12 Nov 2026</pubDate></item></channel></rss>`
    expect(feedLines(rss('today'))).toEqual(['Bond Hub & you | https://example.test/a | Thu, 12 Nov 2026'])
    expect(feedLines(rss('today'))).toEqual(feedLines(rss('tomorrow')))
  })

  it('reads an Atom entry whose link is an attribute', () => {
    expect(feedLines('<feed><entry><title>Act as passed</title><link href="https://example.test/act"/><updated>2026-04-28</updated></entry></feed>')).toEqual(['Act as passed | https://example.test/act | 2026-04-28'])
  })

  it('keeps only recent sitemap entries', () => {
    const xml = '<urlset><url><loc>https://l.test/act/1</loc><lastmod>2020-01-01</lastmod></url><url><loc>https://l.test/bill/2</loc><lastmod>2026-11-12T10:00:00Z</lastmod></url></urlset>'
    expect(sitemapLines(xml, '2026-10-01')).toEqual(['https://l.test/bill/2 | 2026-11-12'])
    const r = read({ ...base, selector: 'urlset' }, xml, '2026-11-14')
    expect(r.ok && r.lines).toEqual(['https://l.test/bill/2 | 2026-11-12'])
  })

  it('picks named JSON fields and ignores the rest', () => {
    const body = (ms: number) => JSON.stringify({ responseHeader: { QTime: ms }, results: [{ title: 'Curtains Bill', billNumber: '318-1', status: 'First Reading', extra: ms }] })
    const pick = { list: 'results', fields: ['title', 'billNumber', 'status'] }
    expect(jsonLines(body(3), pick)).toEqual(['Curtains Bill | 318-1 | First Reading'])
    expect(jsonLines(body(3), pick)).toEqual(jsonLines(body(99), pick))
    expect(jsonLines('{"response":{"numFound":33394}}', { fields: ['response.numFound'] })).toEqual(['response.numFound | 33394'])
    expect(jsonLines('<html>', pick)).toBeNull()
  })
})

describe('comparing with last time', () => {
  const before = compare(undefined, ['Bond is 4 weeks.', 'Notice is 21 days.', 'Fee is $27.'])

  it('records a baseline on first sight and reports no change', () => {
    expect(before.changed).toBe(false)
    expect(before.lineKeys).toHaveLength(3)
  })

  it('reports nothing when the lines are the same', () => {
    expect(compare(before, ['Bond is 4 weeks.', 'Notice is 21 days.', 'Fee is $27.']).changed).toBe(false)
  })

  it('names the new lines and counts the lost ones', () => {
    const c = compare(before, ['Bond is 4 weeks.', 'Notice is 28 days.', 'Fee is $27.'])
    expect(c.changed).toBe(true)
    expect(c.added).toEqual(['Notice is 28 days.'])
    expect(c.removed).toBe(1)
  })

  it('does not call a reordering a change', () => {
    expect(compare(before, ['Fee is $27.', 'Bond is 4 weeks.', 'Notice is 21 days.']).changed).toBe(false)
  })
})

describe('the small rules', () => {
  it('reads daily sources each run and weekly ones once a week', () => {
    const now = Date.parse('2026-11-14T18:00:00Z')
    expect(isDue({ frequency: 'daily' }, undefined, now)).toBe(true)
    expect(isDue({ frequency: 'daily' }, '2026-11-13T18:05:00Z', now)).toBe(true)
    expect(isDue({ frequency: 'daily' }, '2026-11-14T10:00:00Z', now)).toBe(false)
    expect(isDue({ frequency: 'weekly' }, '2026-11-10T18:00:00Z', now)).toBe(false)
    expect(isDue({ frequency: 'weekly' }, '2026-11-07T18:00:00Z', now)).toBe(true)
  })

  it('cuts an excerpt to a few short lines', () => {
    const out = excerpt(Array.from({ length: 30 }, (_, i) => `${i} ${'x'.repeat(400)}`))
    expect(out).toHaveLength(12)
    expect(out[0].length).toBe(280)
  })

  it('accepts a quote only if it is in the text word for word', () => {
    const lines = ['The tenant shall give the landlord at least', '28 days’ notice of termination.']
    expect(quoteAppears('at least 28 days’ notice', lines)).toBe(true)
    expect(quoteAppears('at least 21 days’ notice', lines)).toBe(false)
    expect(quoteAppears('28 days', lines)).toBe(false)
  })
})
