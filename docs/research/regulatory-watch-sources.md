# Regulatory watch sources

Observed on 14 November 2026 (NZDT). Companion machine-readable file: `regulatory-watch-sources.json` in this folder (65 entries; per-source caveats are in each entry's `notes` field).

Scope: sources that a scheduled Node.js script (plain HTTPS fetch, no headless browser, GitHub-hosted runner) can watch to detect residential tenancy law changes in New Zealand first, then NSW, VIC, QLD, WA and SA.

## 0. How this was verified, and what was not

- Every source below was actually fetched. Discovery used `curl`. The final pass fetched **every source twice, a few seconds apart, with Node 24's built-in `fetch`** (the HTTP stack the watcher will use), a normal browser User-Agent, no cookies and no JavaScript. For each one I recorded status, content type, size, whether the suggested hash region exists, and whether the SHA-256 of (a) the whole body and (b) the region was identical across the two fetches.
- `fetchOk` in the JSON means "HTTP 200 with usable content through Node fetch". It is `false` for sources that need a key, returned a bot challenge, or worked in curl but not in Node. 59 of 65 are `true`.
- **Not tested: GitHub-hosted runner IPs.** I fetched from a New Zealand residential connection. Runners use Azure data-centre addresses, and sites behind Imperva (hud.govt.nz) or Cloudflare may treat those differently. Run a one-off canary workflow that fetches the whole registry before relying on it.
- Of the 35 HTML pages that fetched successfully, **13 returned a different full-page hash on the second fetch** (tokens, server timestamps, cache-buster values), and a 14th did so on one of two runs. Every suggested region was identical across both fetches. Hashing whole pages would raise false positives on those sites every day.
- The session's web-search allowance ran out part-way through, so later discovery relied on sitemaps, on-site links and direct fetches. The gaps this left are listed in section 5.
- I did not submit any forms, request any API keys, or attempt to get past any bot challenge.

## 1. Headline findings

1. **legislation.govt.nz has been rebuilt.** URLs are now `https://www.legislation.govt.nz/{type}/{subtype}/{year}/{number}/en/{version-date|latest}/`; old-style URLs (`/act/public/1986/0120/latest/DLM94278.html`) redirect. Appending `.xml` or `.pdf` to the version segment returns that format, e.g. `https://www.legislation.govt.nz/act/public/1986/120/en/latest.xml`. The XML has no navigation or footer and carries the version date in a root attribute (`date.as.at="2025-12-01"` for the RTA). It was byte-identical across fetches. This is the best keyless source found in this exercise.
2. **There is an official API, but it needs a key.** `https://api.legislation.govt.nz` (version 0 beta), endpoints `/v0/works`, `/v0/works/{work_id}/versions`, `/v0/versions/{version_id}`; docs at `https://api.legislation.govt.nz/docs/`; developer page at `https://www.legislation.govt.nz/learn-more/legislation-data/developer-api/`. Without a key it returns `401 {"error":"API key is required"}`. Keys are issued by emailing contact@pco.govt.nz and are sent in an `X-Api-Key` header or `api_key` query parameter. Limits: 10,000 requests per key per day and 2,000 requests per IP per five minutes. Work IDs mirror the URLs (`act_public_1986_120`).
3. **Per-Act RSS exists but is key-bound.** The new site offers "document version feeds" and "search-based feeds" (`https://www.legislation.govt.nz/learn-more/find-and-use-legislation/keep-up-to-date-with-legislation/`). The "Copy feed link" button submits a form to `/api_keys/?id=act_public_1986_120`, which issues a key embedded in the feed URL. The API docs list the feed endpoints as `/api/rss/works/{work_id}/versions/` and `/api/rss/search/`; a keyless request to the first returned 404, so the live URL shape is unconfirmed. I did not press the button (it creates an access credential). A person should do that once per feed, or use the emailed API key.
4. **The old Atom feeds survive only on `classic.legislation.govt.nz`** (`https://classic.legislation.govt.nz/subscribe/nzpco-rss.xml` was live and updated 13 November 2026). Do not build on it: its robots.txt is `Disallow: /`, PCO calls this "unsupported use", and the site is due to be decommissioned.
5. **`https://www.legislation.govt.nz/sitemap.xml` is a keyless change index for the whole corpus**: 43,613 works, each with `<lastmod>`. New Bills, Acts and regulations show up as new `<loc>` entries. The response carried `Last-Modified: Thu, 12 Nov 2026 12:02:13 GMT`, so it appears to be rebuilt about daily and can lag by up to a day.
6. **NZ legislation is not Crown copyright; there is no copyright in it at all** (Copyright Act 1994 s 27, stated on the site's copyright page and in the API terms). Other content on the site is Crown copyright under CC BY.
7. **bills.parliament.nz and www.parliament.nz are Blazor WebAssembly shells.** A plain GET returns no content. Two things do work: an RSS feed (`https://bills.parliament.nz/rss?set=Bills`) and the site's own JSON search endpoint (`POST https://bills.parliament.nz/api/data/search`), which with keyword `tenancies` returned the two RTA bills currently before the House.
8. **HUD is now branded "Ministry for Cities, Environment, Regions and Transport (Formerly ... Ministry of Housing and Urban Development)".** hud.govt.nz still serves and exposes a site-wide page-change RSS feed. Expect URLs to move.
9. **NSW is the weak spot.** `legislation.nsw.gov.au` returns a Cloudflare challenge (HTTP 403) on every path including robots.txt. `www.parliament.nsw.gov.au` answers curl but challenges Node fetch. NSW coverage therefore rests on nsw.gov.au (Fair Trading) pages until access is arranged.
10. **Australian feeds.** Queensland (Atom, site-wide and per-title) and Western Australia (Atom, per-Act including subsidiary legislation) are good. Victoria and South Australia have no feed or API; both server-render a version-history table on the Act page, which works well as a hash target. Of the five regulators only Consumer Affairs Victoria advertises RSS; I found none on the other four.

## 2. Part 1 - Source registry

### 2.1 The ten most valuable sources (priority 1 in the JSON)

1. `nz-legislation-rta-1986-xml` - the Residential Tenancies Act 1986 as clean XML. The primary text, with a one-attribute version signal.
2. `nz-legislation-sitemap` - one request that reveals every new or changed Act, Bill and regulation, including amending instruments that have no watched URL yet.
3. `nz-legislation-healthy-homes-regs-2019-xml` - the regulations most likely to carry numeric standards and compliance dates.
4. `nz-parliament-bills-search-tenancies` - upcoming law, with stage and last-stage date for each bill.
5. `nz-tenancy-services-law-changes` - the regulator's own dated list of changes; the best corroboration of commencement dates in plain language.
6. `nz-tenancy-services-news-rss` - earliest regulator notice of changes, fee updates and new guidance.
7. `au-vic-legislation-rta-1997` - Victorian Act version history (version number and effective date in the first row).
8. `au-qld-legislation-rtra-2008-history` - Queensland table of reprints with effective dates.
9. `au-wa-legislation-rta-1987-atom` - one Atom feed covering the WA Act and its regulations.
10. `au-nsw-fair-trading-rental-law-changes` - the best reachable NSW signal while the NSW legislation site is blocked.

South Australia's Act page (`au-sa-legislation-rta-1995`) is as reliable as the Victorian one; it is priority 2 only because SA is the last market. Once a PCO API key is held, `nz-legislation-api-rta-versions` should become the primary NZ signal.

### 2.2 Reading the tables

- **Type** follows the JSON enum. `html` means "fetch a document and hash a region". Where the content type is `application/xml` (legislation XML, sitemaps), parse it as XML and hash the whole body.
- **Observed** is the Node fetch result: status, format, size of the region in characters of extracted text (or number of feed items), then stability across two fetches.
- **Selector** is a CSS selector. Hash the element's text content after collapsing whitespace, not its markup. Where a selector matches several elements (`div.news-result`), hash them all in order. For feeds, hash the `<item>`/`<entry>` blocks or just their ids, never the channel header.
- **Freq / P**: suggested check frequency and priority (1 = top ten, 2 = should watch, 3 = optional).

### 2.3 New Zealand - enacted law and bills

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| nz-legislation-rta-1986-xml | `https://www.legislation.govt.nz/act/public/1986/120/en/latest.xml` | html / legislation | 200 xml, 1260 KB; byte-stable | daily / 1 | `act` |
| nz-legislation-healthy-homes-regs-2019-xml | `https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2019/88/en/latest.xml` | html / legislation | 200 xml, 201 KB; byte-stable | daily / 1 | `regulation` |
| nz-legislation-smoke-alarms-regs-2016-xml | `https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2016/128/en/latest.xml` | html / legislation | 200 xml, 66 KB; byte-stable | daily / 2 | `regulation` |
| nz-legislation-meth-regs-2026-xml | `https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2026/24/en/latest.xml` | html / legislation | 200 xml, 30 KB; byte-stable | daily / 2 | `regulation` |
| nz-legislation-rt-fees-regs-1998-xml | `https://www.legislation.govt.nz/secondary-legislation/pco-drafted/1998/244/en/latest.xml` | html / legislation | 200 xml, 14 KB; byte-stable | weekly / 2 | `regulation` |
| nz-legislation-rt-rules-2010-xml | `https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2010/256/en/latest.xml` | html / legislation | 200 xml, 36 KB; byte-stable | weekly / 3 | `regulation` |
| nz-legislation-unit-titles-act-2010-xml | `https://www.legislation.govt.nz/act/public/2010/22/en/latest.xml` | html / legislation | 200 xml, 722 KB; byte-stable | weekly / 3 | `act` |
| nz-legislation-privacy-act-2020-xml | `https://www.legislation.govt.nz/act/public/2020/31/en/latest.xml` | html / privacy | 200 xml, 744 KB; byte-stable | weekly / 2 | `act` |
| nz-legislation-holidays-act-2003-xml | `https://www.legislation.govt.nz/act/public/2003/129/en/latest.xml` | html / holidays | 200 xml, 321 KB; byte-stable | weekly / 3 | `act` |
| nz-legislation-sitemap | `https://www.legislation.govt.nz/sitemap.xml` | html / legislation | 200 xml, 5392 KB; byte-stable | daily / 1 | `urlset` |
| nz-legislation-api-rta-versions | `https://api.legislation.govt.nz/v0/works/act_public_1986_120/versions` | json / legislation | 401, key required | daily / 2 | - |
| nz-parliament-bills-search-tenancies | `https://bills.parliament.nz/api/data/search` (POST; body in JSON notes) | json / bills | 200 json; stable | daily / 1 | - |
| nz-parliament-bills-rss | `https://bills.parliament.nz/rss?set=Bills` | rss / bills | 200 rss, 50 items; items stable (header changes) | daily / 2 | - |

Notes on this group:

- The methamphetamine regulations exist and are in force: Residential Tenancies (Managing Methamphetamine Contamination) Regulations 2026, LI 2026/24, made 23 February 2026, in force 16 April 2026.
- The 2016 regulations are now titled "Residential Tenancies (Smoke Alarms) Regulations 2016"; the XML records the former "Smoke Alarms and Insulation" title.
- I found no separate infringement regulations for the RTA. Infringement fees sit in the Act itself, so the Act watch covers them. The fees instrument is the Residential Tenancies (Fees) Regulations 1998 (SR 1998/244), amended annually in recent years.
- The join between Parliament and legislation.govt.nz works: bill 318-1 on bills.parliament.nz is `/bill/members/2026/318/` in the sitemap, and its `latest.xml` returned the matching title.
- The bills search is an undocumented endpoint used by the site's own front end. Treat it as likely to change and keep the RSS feed as a fallback.

### 2.4 New Zealand - regulator and policy agency

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| nz-tenancy-services-news-rss | `https://www.tenancy.govt.nz/about-tenancy-services/news/rss/` | rss / regulator | 200 rss, 20 items; items stable | daily / 1 | - |
| nz-tenancy-services-law-changes | `https://www.tenancy.govt.nz/law-changes/` | html / regulator | 200 html, region 10836 chars; region stable / page CHANGES | daily / 1 | `div.wrapper_content` |
| nz-tenancy-services-bond | `https://www.tenancy.govt.nz/rent-bond-and-bills/bond/` | html / regulator | 200 html, region 2960 chars; region stable / page stable | weekly / 2 | `div.wrapper_content` |
| nz-tenancy-services-giving-notice | `https://www.tenancy.govt.nz/ending-a-tenancy/giving-notice-to-end-tenancy/` | html / regulator | 200 html, region 7437 chars; region stable / page CHANGES | weekly / 2 | `div.wrapper_content` |
| nz-tenancy-services-rent-increases | `https://www.tenancy.govt.nz/rent-bond-and-bills/rent/increasing-rent/` | html / regulator | 200 html, region 5365 chars; region stable / page CHANGES | weekly / 2 | `div.wrapper_content` |
| nz-hud-site-changes-rss | `https://www.hud.govt.nz/home/allchanges` | rss / regulator | 200 rss, 9 items; items stable | daily / 2 | - |
| nz-hud-rta-amendment-act-2024 | `https://www.hud.govt.nz/our-work/residential-tenancies-amendment-act-2024` | html / regulator | 200 html, region 9487 chars; region stable / page CHANGES | weekly / 2 | `main#main` |
| nz-hud-methamphetamine-regulations | `https://www.hud.govt.nz/our-work/methamphetamine-regulations` | html / regulator | 200 html, region 7759 chars; region stable / page CHANGES | weekly / 3 | `main#main` |
| nz-hud-healthy-homes-standards | `https://www.hud.govt.nz/our-work/healthy-homes-standards` | html / regulator | 200 html, region 16004 chars; region stable / page CHANGES | weekly / 3 | `main#main` |

Notes on this group:

- Tenancy Services RSS items are not in strict date order; key on `<link>`.
- hud.govt.nz sits behind Imperva and returned HTTP 429 on the seventh request of a quick burst. Space requests at least 5 seconds apart. The `allchanges` feed holds only the last nine changed pages, so it needs a daily check.
- hud.govt.nz `/news` is rendered client-side. Its data endpoint (`/news/search`) answers only when sent `X-Requested-With: XMLHttpRequest`; the `allchanges` feed is the simpler signal.

### 2.5 New Zealand - tax, privacy, tribunal, holidays, data

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| nz-taxpolicy-home-news | `https://www.taxpolicy.ird.govt.nz/` | html / tax | 200 html, region 1818 chars; region stable / page stable | weekly / 2 | `div.tp-news` |
| nz-taxpolicy-sitemap | `https://www.taxpolicy.ird.govt.nz/sitemap.xml` | html / tax | 200 xml, 563 KB; byte-stable | weekly / 3 | `urlset` |
| nz-ird-residential-rental-income | `https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it` | html / tax | 200 html, region 3015 chars; region stable / page stable | weekly / 2 | `div#main-content` |
| nz-ird-rental-property-deductions | `https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-property-deductions` | html / tax | 200 html, region 3845 chars; region stable / page stable | weekly / 2 | `div#main-content` |
| nz-ird-bright-line-test | `https://www.ird.govt.nz/property/buying-and-selling/when-you-need-to-pay/the-brightline-test` | html / tax | 200 html, region 4400 chars; region stable / page stable | weekly / 3 | `div#main-content` |
| nz-privacy-commissioner-whats-new-rss | `https://www.privacy.org.nz/new-on-the-website/rss/` | rss / privacy | 200 rss, 10 items; items stable | weekly / 2 | - |
| nz-privacy-commissioner-landlord-guidance | `https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/` | html / privacy | 200 html, region 39043 chars; region stable / page stable | weekly / 2 | `div#layout` |
| nz-tenancy-tribunal-practice-directions | `https://www.justice.govt.nz/tribunals/tenancy/practice/` | html / tribunal | 200 html, region 410 chars; region stable / page stable | weekly / 3 | `div#main` |
| nz-tenancy-tribunal-orders-solr | `https://forms.justice.govt.nz/forms/publicSolrProxy/solr/TTV2/select?q=*:*&rows=0&wt=json` | json / tribunal | 200 json; stable | weekly / 3 | - |
| nz-employment-public-holidays | `https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates` | html / holidays | 200 html, region 6119 chars; region stable / page CHANGES | weekly / 2 | `article#page-content` |
| nz-tenancy-services-rental-bond-data | `https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/` | html / data | 200 html, region 5062 chars; region stable / page stable | weekly / 3 | `div.wrapper_content` |
| nz-mbie-market-rent-api | `https://api.business.govt.nz/gateway/tenancy-services/market-rent/v2/statistics?period-ending=2026-06&num-months=6&area-definition=TA2019&include-aggregates=true` | json / data | 401, key required | weekly / 3 | - |
| nz-govt-public-holidays | `https://www.govt.nz/browse/work/public-holidays-and-work/public-holidays-and-anniversary-dates/` | html / holidays | 200, Incapsula challenge page | weekly / 3 | `main` |

Notes on this group:

- **Tax policy.** `taxpolicy.ird.govt.nz/news` is rendered client-side and has no RSS feed. The home page server-renders the latest five announcements; the sitemap (2,617 URLs with `<lastmod>`) catches every new `/news/YYYY/...` page. IRD guidance pages show a "Last updated" date inside the region (`span.ir-latest-date-value`).
- **Privacy.** The tenant-side page is `https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-tenants/`. The site lists further RSS feeds at `https://www.privacy.org.nz/rss-feeds/`; the statements/media-releases feed returned zero items when fetched.
- **Tenancy Tribunal orders.** The search page `https://forms.justice.govt.nz/search/TT/` is an Angular shell. Behind it is a public Solr proxy that answers plain GETs with JSON (33,394 published orders when fetched; decision text and PDF names are included). It is undocumented, and the documents contain party names and tenancy addresses. Use it only for keyword-targeted case-law alerts reviewed by a person, store no party details, and ask the Ministry of Justice before building on it. The registry entry requests a count only (`rows=0`).
- **MBIE Market Rent API.** It exists and is official: Market Rent API v2 on MBIE's API gateway, base `https://api.business.govt.nz/gateway/tenancy-services/market-rent/v2/statistics`, developer portal `https://portal.api.business.govt.nz/` (linked from the Tenancy Services rental bond data page). Authentication is an Azure API Management subscription key: sign up in the portal, subscribe to the API, send the key in the `Ocp-Apim-Subscription-Key` header. Without it the gateway returned `401 Access denied due to missing subscription key`. A sandbox path (`/sandbox/tenancy-services/market-rent/v2/statistics`) validated parameters without a key (400 asking for `area-definition`) but returned 401 once the parameters were valid. Parameters seen: `period-ending`, `num-months`, `area-definition` (e.g. `TA2019`, `AU2016`), `include-aggregates`. The underlying bond data is published under CC BY 3.0 NZ with credit to MBIE, and the monthly CSV files are linked from the rental bond data page.

### 2.6 New South Wales

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| au-nsw-legislation-rta-2010 | `https://legislation.nsw.gov.au/view/html/inforce/current/act-2010-042` | html / legislation | 403, Cloudflare challenge | daily / 2 | `div#frag-col` |
| au-nsw-legislation-new-feed | `https://legislation.nsw.gov.au/feed?id=newlegislation` | atom / legislation | 403, Cloudflare challenge | daily / 2 | - |
| au-nsw-fair-trading-rental-law-changes | `https://www.nsw.gov.au/departments-and-agencies/fair-trading/news/changes-to-rental-laws` | html / regulator | 200 html, region 15441 chars; region stable / page stable | daily / 1 | `main.dcs-readspeaker-target` |
| au-nsw-fair-trading-news | `https://www.nsw.gov.au/departments-and-agencies/fair-trading/news` | html / regulator | 200 html, region 3557 chars; region stable / page stable | daily / 2 | `main.dcs-readspeaker-target` |
| au-nsw-rules-rent-increases | `https://www.nsw.gov.au/housing-and-construction/rules/when-and-how-rent-can-be-increased` | html / regulator | 200 html, region 4624 chars; region stable / page stable | weekly / 2 | `main.dcs-readspeaker-target` |
| au-nsw-rules-giving-notice | `https://www.nsw.gov.au/housing-and-construction/rules/giving-notice-to-end-a-residential-tenancy` | html / regulator | 200 html, region 8790 chars; region stable / page stable | weekly / 2 | `main.dcs-readspeaker-target` |
| au-nsw-parliament-bills-tenancies | `https://www.parliament.nsw.gov.au/parliamentary-business/bills/current-session-bills?query=tenancies` | html / bills | 403, Cloudflare challenge (curl got 200) | daily / 2 | `div.pims-listing` |

Notes: the Fair Trading "Changes to rental laws" page has a section listing the as-made instruments behind the changes (links to `act-2024-75`, `act-2025-65`, `sl-2025-139`, `sl-2025-284`, `sl-2026-242` on the NSW legislation site), so a new amending instrument shows up as a region change. The selector for the blocked Act page is unverified. Through curl, the Parliament page listed ten matching bills, including "Residential Tenancies Amendment (Protection of Personal Information) Bill 2025 - Assented on Fri 02 October 2026".

### 2.7 Victoria

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| au-vic-legislation-rta-1997 | `https://www.legislation.vic.gov.au/in-force/acts/residential-tenancies-act-1997` | html / legislation | 200 html, region 2410 chars; region stable / page stable | daily / 1 | `ul.lgs-version-history__version-list` |
| au-vic-legislation-rt-regs-2021 | `https://www.legislation.vic.gov.au/in-force/statutory-rules/residential-tenancies-regulations-2021` | html / legislation | 200 html, region 240 chars; region stable / page stable | daily / 2 | `ul.lgs-version-history__version-list` |
| au-vic-cav-new-rental-laws | `https://www.consumer.vic.gov.au/housing/renting/new-changes-to-rental-laws` | html / regulator | 200 html, region 10002 chars; region stable / page CHANGES | daily / 2 | `section#GeneralBodyContent` |
| au-vic-cav-news-rss | `https://www.consumer.vic.gov.au/RSS.aspx?RssType=newsalerts` | rss / regulator | 200 xml, 179 items; items stable | daily / 2 | - |
| au-vic-cav-legislation-updates-rss | `https://www.consumer.vic.gov.au/RSS.aspx?RssType=legislationupdates` | rss / regulator | 200 xml, 3 items; items stable | weekly / 3 | - |

Notes: Consumer Affairs Victoria lists its feeds at `https://www.consumer.vic.gov.au/rss-feeds`. The "legislation updates" feed is sparse (newest item 26 November 2025) and lags the "new changes to rental laws" page, which already showed a 13 October 2026 change. The feed's channel `<copyright>` element holds today's date, so hash items only.

### 2.8 Queensland

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| au-qld-legislation-rtra-2008-history | `https://www.legislation.qld.gov.au/view/html/inforce/current/act-2008-073/lh` | html / legislation | 200 html, region 1725 chars; region stable / page CHANGES | daily / 1 | `div#reprintlist` |
| au-qld-legislation-rtra-2008-whole | `https://www.legislation.qld.gov.au/view/whole/html/inforce/current/act-2008-073` | html / legislation | 200 html, region 667176 chars; region stable / page CHANGES | weekly / 2 | `div#fragview` |
| au-qld-legislation-rtra-title-feed | `https://www.legislation.qld.gov.au/feed?id=title&query=VersionSeriesId%3D%22ea413309-1965-432d-99a3-8b20208140c0%22%20AND%20PrintType%3D(%22act.reprint%22%20OR%20%22act.new%22%20OR%20%22bill.first%22%20OR%20%20%22bill.firstnongovintro%22%20OR%20%22bill.third%22)&name=Residential%20Tenancies%20and%20Rooming%20Accommodation%20Act%202008&desc=New%20or%20updated%20versions` | atom / legislation | 200 atom, 0 items; stable | daily / 2 | - |
| au-qld-legislation-whatsnew-feed | `https://www.legislation.qld.gov.au/feed?id=whatsnew` | atom / legislation | 200 atom, 72 items; items stable | daily / 2 | - |
| au-qld-legislation-newbills-feed | `https://www.legislation.qld.gov.au/feed?id=newbills` | atom / bills | 200 atom, 4 items; items stable | daily / 3 | - |
| au-qld-rta-rental-law-changes | `https://www.rta.qld.gov.au/rental-law-changes` | html / regulator | 200 html, region 8952 chars; region stable / page stable | daily / 2 | `article.page` |
| au-qld-rta-news | `https://www.rta.qld.gov.au/news` | html / regulator | 200 html, region 3127 chars; region stable / page stable | daily / 2 | `article.page` |

Notes: other Queensland feeds are `feed?id=newlegislation`, `feed?id=newinforce` and `feed?id=repealed`. The per-title feed is the one the site's own "subscribe" link generates; it returned a valid but empty feed, because it lists only recent publications. The Act pages include a `data-server-time` meta tag, which is why full-page hashes differ.

### 2.9 Western Australia

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| au-wa-legislation-rta-1987-atom | `https://www.legislation.wa.gov.au/legislation/statutes.nsf/law_a693.atom&subsidiary=yes` | atom / legislation | 200 xml, 2 items; items stable | daily / 1 | - |
| au-wa-legislation-rta-1987-page | `https://www.legislation.wa.gov.au/legislation/statutes.nsf/law_a693.html` | html / legislation | 200 html, region 164 chars; region stable / page stable | weekly / 2 | `table.consolidated` |
| au-wa-legislation-aspassed-atom | `https://www.legislation.wa.gov.au/legislation/statutes.nsf/aspassed.atom` | atom / legislation | 200 xml, 200 items; items stable | weekly / 3 | - |
| au-wa-consumer-protection-renting | `https://www.consumerprotection.wa.gov.au/renting-home` | html / regulator | 200 html, region 1103 chars; region stable / page stable | weekly / 3 | `main.ct-layout` |
| au-wa-consumer-protection-rent-increases | `https://www.consumerprotection.wa.gov.au/rent-increases` | html / regulator | 200 html, region 3636 chars; region stable / page stable | weekly / 2 | `main.ct-layout` |
| au-wa-consumer-protection-commissioner-determinations | `https://www.consumerprotection.wa.gov.au/commissioner-determinations-renting` | html / regulator | 200 html, region 594 chars; region stable / page stable | weekly / 2 | `main.ct-layout` |

Notes: the WA feed URL really does use `&` straight after `.atom`. Entry ids encode the version timestamp (`A693:202604281640` for the Act, `S4744:202609011618` for the Residential Tenancies Regulations 1989), so hashing ids is enough. All WA feeds are listed at `https://www.legislation.wa.gov.au/legislation/statutes.nsf/feeds.html`. The regulator now sits in the Department of Local Government, Industry Regulation and Safety. Sibling regulator pages worth adding later: `/bonds`, `/renting-pets`, `/making-changes-rental-home`.

### 2.10 South Australia

| ID | URL | Type / signal | Observed | Freq / P | Selector |
|---|---|---|---|---|---|
| au-sa-legislation-rta-1995 | `https://www.legislation.sa.gov.au/lz?path=%2Fc%2Fa%2Fresidential%20tenancies%20act%201995` | html / legislation | 200 html, region 4054 chars; region stable / page CHANGES | daily / 2 | `div#content` |
| au-sa-legislation-rt-regs-2025 | `https://www.legislation.sa.gov.au/lz?path=%2Fc%2Fr%2Fresidential%20tenancies%20regulations%202025` | html / legislation | 200 html, region 604 chars; region stable / page stable | daily / 2 | `div#content` |
| au-sa-legislation-whats-new | `https://www.legislation.sa.gov.au/whats-new` | html / legislation | 200 html, region 3739 chars; region stable / page CHANGES | weekly / 3 | `main#main` |
| au-sa-cbs-rental-reforms | `https://www.cbs.sa.gov.au/campaigns/rental-reforms` | html / regulator | 200 html, region 20065 chars; region stable / page CHANGES | weekly / 2 | `main#main` |
| au-sa-cbs-news | `https://www.cbs.sa.gov.au/news` | html / regulator | 200 html, region 2856 chars; region stable / page stable | weekly / 2 | `div.news-result` |

Notes: the SA Act page carried the banner "This legislation is affected by amending provisions that have not yet come into operation", which is itself an early-warning signal. The Residential Tenancies Regulations 2010 are marked ceased; the 2025 Regulations replace them. SA offers email subscription per title but no feed. "What's New" is a fortnightly PDF newsletter; the page lists the PDFs (newest 6 November 2026). On the CBS news page `main#main` changed between fetches on one run, so use the news cards.

### 2.11 Blocked, key-required, or rejected

| Source | What happened | What to do |
|---|---|---|
| `legislation.nsw.gov.au` (Act, regulation, feeds, robots.txt) | HTTP 403 Cloudflare managed challenge, in curl and in Node, with a browser UA and with an honest bot UA | Do not try to defeat it. Ask the NSW Parliamentary Counsel's Office about sanctioned access; meanwhile watch the Fair Trading pages and route the site's email notifications to a monitored mailbox |
| `www.parliament.nsw.gov.au` bills list | curl: 200 with server-rendered results. Node fetch: 403 Cloudflare challenge on every attempt | Treat as blocked for the watcher. Manual weekly check, or ask the Parliament for a sanctioned feed |
| `api.legislation.govt.nz` | 401 without key | Email PCO for a key; store it as an Actions secret |
| MBIE Market Rent API | 401 without subscription key | Register in the MBIE API portal |
| `www.govt.nz` public holidays page | HTTP 200, but the body is an Imperva/Incapsula JavaScript challenge | Use employment.govt.nz |
| `classic.legislation.govt.nz` Atom feeds | Work today | Rejected: robots.txt `Disallow: /`, unsupported, being decommissioned |
| NZ Gazette (`gazette.govt.nz`) | Home page 200, but it shows only "Popular" notices; notice search lives under `/home/search`, which robots.txt disallows; no feed found | Not machine-watchable within robots.txt. Little is lost: regulations appear on legislation.govt.nz and their XML carries `date.gazetted` |
| data.govt.nz CKAN API (`https://catalogue.data.govt.nz/api/3/action/package_search?q=rental+bond`) | 200, valid JSON, three MBIE rental bond datasets | Rejected for polling: robots.txt disallows `/api/`, and the dataset records were last modified in October 2023. The live files are on the Tenancy Services rental bond data page |
| Privacy Commissioner statements/media-releases RSS | 200 but zero items | Use the "What's New" feed |
| `taxpolicy.ird.govt.nz/news`, `hud.govt.nz/news`, `legislation.vic.gov.au/whats-new`, Tenancy Tribunal orders search page, `www.parliament.nz` | 200, but listings are rendered client-side, so the HTML has no items | Use the alternatives in the tables |
| `www.digital.govt.nz` (Better Rules pages), `www.oecd.org` | Bot challenge pages | Reference links only, not watch sources |

### 2.12 Baseline observed on 14 November 2026

Useful for seeding `last_verified` on rule packs. This is what the sources showed, not legal advice.

| Instrument | Version signal observed |
|---|---|
| NZ Residential Tenancies Act 1986 | `date.as.at` 2025-12-01 (sitemap `lastmod` 2026-04-29) |
| NZ Healthy Homes Standards Regulations 2019 | `date.as.at` 2025-09-25 |
| NZ Smoke Alarms Regulations 2016 | `date.as.at` 2025-07-02 |
| NZ Managing Methamphetamine Contamination Regulations 2026 | as made 2026-02-23; `date.first.valid` 2026-04-16 |
| NZ Residential Tenancies (Fees) Regulations 1998 | `date.as.at` 2026-07-01 |
| NZ Privacy Act 2020 / Unit Titles Act 2010 / Holidays Act 2003 | 2026-10-08 / 2026-07-10 / 2023-12-20 |
| NZ bills before the House matching "tenancies" | 318-1 Residential Tenancies (Requiring Landlords to Provide Curtains) Amendment Bill, First Reading, last stage 2026-05-21; 183-1 Residential Tenancies (Registration of Boarding House Landlords) Amendment Bill, Select Committee, 2026-04-29 |
| VIC Residential Tenancies Act 1997 | version 115, effective 13 Oct 2026 |
| VIC Residential Tenancies Regulations 2021 | version 009, effective 30 June 2026 |
| QLD Residential Tenancies and Rooming Accommodation Act 2008 | newest reprint effective 17 August 2026 |
| WA Residential Tenancies Act 1987 | consolidated version from 29 Apr 2026 (suffix 07-a0-00) |
| WA Residential Tenancies Regulations 1989 | feed entry dated 2026-09-01 |
| SA Residential Tenancies Act 1995 | current version follows one that ended 14 January 2026; page warns of uncommenced amendments |
| SA Residential Tenancies Regulations 2025 | current |
| NSW | legislation site unreachable; Fair Trading "Changes to rental laws" last updated 08 October 2026 |

### 2.13 Notes for the watcher implementation

- **Hash regions, not pages.** Extract the selector's text, collapse whitespace, then hash. For feeds hash item ids or links. For JSON pick named fields (the Solr response has a volatile `QTime`).
- **Treat challenge pages as fetch failures, never as changes.** Some WAFs return HTTP 200 with a tiny JavaScript page. Fail the fetch if the region is missing, the body is only a few kilobytes, or it contains `_Incapsula_Resource` or `Just a moment...`.
- **Two-stage NZ detection.** Daily: fetch the sitemap and diff `(loc, lastmod)`. For changed watched works, and for new `/bill/`, `/act/` and `/secondary-legislation/` entries, fetch `latest.xml`, read `<title>` and `date.as.at`, keyword-match, then diff at provision level (elements carry stable ids such as `DLM94278`).
- **Handle `date.as.at="nulldate"`**, which appears on as-made instruments with no consolidation yet.
- **Expect empty feeds.** The Queensland per-title feed legitimately returns zero entries between publications.
- **Distinguish "no change" from "could not check".** Record `lastSuccessAt` per source and alarm on consecutive failures (section 3.5).
- **Use conditional requests where offered.** The NZ sitemap and nsw.gov.au pages send `Last-Modified` or `ETag`; the Tenancy Services RSS sends `ETag`. The legislation XML and most others send `no-cache` with no validator.
- **Keep snapshots private.** Committing raw fetched pages to a public repository is republication. That is fine for NZ legislation (no copyright) and Queensland legislation (CC BY 4.0), but not for Victorian legislation or regulator guidance pages. Keep snapshots in a private repo or artifact store; a public change feed should carry hashes, dates, short quotes and links.
- **GitHub Actions scheduling.** Cron is in UTC and scheduled runs can start late under load. GitHub disables scheduled workflows in public repositories after 60 days without repository activity, so have the watcher commit a heartbeat file or alert on missed runs.

## 3. Part 2 - Method: doing regulatory change monitoring well

### 3.1 What "rules as code" practice offers

- **OECD, "Cracking the Code: Rulemaking for humans and machines" (2020)**, `https://oecd-opsi.org/publications/cracking-the-code/`. The reference survey. Its point for this product: a coded rule is a second, official-looking version of the law, so it needs explicit traceability back to the text and a governance process that keeps the two aligned.
- **NZ Better Rules and OpenFisca Aotearoa**, `https://github.com/BetterRules` and `https://github.com/BetterRules/openfisca-aotearoa` ("Aotearoa New Zealand legislation as code"). Lessons: model the concepts and decisions before coding, and write test cases with subject experts first.
- **OpenFisca**, `https://openfisca.org/en/`; see "Legislation evolutions", `https://openfisca.org/doc/coding-the-legislation/40_legislation_evolutions.html`. Every parameter is a time series of dated values, each with a legal reference. That is the `value + effective_from + source` shape the founder is asking for. The engine is more than this product needs; the data pattern is worth copying.
- **Australia.** OpenFisca NSW, `https://github.com/Openfisca-NSW/openfisca_nsw_base`, from the NSW Government's rules-as-code work.
- **Catala**, `https://catala-lang.org/`. Keeps each rule physically next to the statutory text it implements. Worth imitating in spirit: store the quoted clause beside every constant.
- **legislation.gov.uk**, `https://www.legislation.gov.uk/developer` and `https://www.legislation.gov.uk/changes`. The model for point-in-time versions and for publishing changes not yet applied. South Australia's "not yet come into operation" banner is the same idea, and the rule store should track it as a state of its own.

### 3.2 Pipeline: detect, triage, review, publish

Commercial regulatory-change products (for example CUBE, `https://www.cube.global/`; the former Thomson Reuters Regulatory Intelligence product URL now redirects there) follow the same broad stages: horizon scanning, relevance triage, impact assessment against an inventory of obligations, controlled change, attestation with an audit trail. A version sized for this product:

1. **Detect (deterministic, no LLM).** Fetch, normalise, hash, diff. Emit a change event: source id, previous and new version markers, before and after text of the changed provisions, snapshot hashes.
2. **Triage (deterministic first, LLM second).** Each rule in a pack stores a source locator (work id, provision id, quote). If a changed provision id matches a locator, the event is high-impact automatically. Only unmatched changes go to an LLM for a relevance call.
3. **Summarise and propose (LLM, schema-bound).** Output is a structured proposal, not prose: affected rule ids, proposed new values, commencement, transitional notes, each with a verbatim quote and locator.
4. **Verify (deterministic).** Code checks that every quote is an exact substring of the fetched snapshot and that every number or date in the proposal appears inside its quote. Failures are rejected before a person sees them.
5. **Review (human).** The proposal is a pull request against the rule-pack repository. The reviewer sees the source diff, the quotes, and the calculator regression delta (3.5).
6. **Publish.** A new immutable rule-pack version. Rules with a future `effective_from` ship ahead of time and switch on by date.
7. **Monitor.** Staleness alarms, plus a cross-check that regulator guidance pages now agree with the pack.

### 3.3 Effective-dated, versioned rule design

Store two time axes (Fowler, "Bitemporal History", `https://martinfowler.com/articles/bitemporal-history.html`, and "Temporal Patterns", `https://martinfowler.com/eaaDev/timeNarrative.html`): when the rule applies in law, and when the system learned and published it. The second is what lets you answer "what did we tell this landlord on 3 March, and why?".

```yaml
id: nz.rta.<rule-name>
jurisdiction: NZ
value: <taken from the quoted source>
unit: <days | weeks_rent | nzd | ...>
effective_from: <date the provision applies in law>
effective_to: null
legal_status: in_force          # proposed | enacted_not_commenced | in_force | repealed
applies_to: <transitional scope, e.g. "notices given on or after effective_from">
source:
  work_id: act_public_1986_120
  version_id: act_public_1986_120_en_2025-12-01
  provision: <section / schedule / clause>
  provision_xml_id: <stable id from the XML>
  url: https://www.legislation.govt.nz/act/public/1986/120/en/2025-12-01/
  quote: "<verbatim text the value was taken from>"
  snapshot_sha256: <hash of the fetched document>
last_verified: { at: 2026-11-14, method: auto-hash | human, by: <reviewer> }
recorded_at: <when this row was published>     # transaction time
review: { approved_by: <name>, second_approver: <name or null>, pr: <link> }
impact: high                    # high = money caps, notice periods, termination grounds, penalties
```

Design rules that follow:

- Calculators evaluate rules **as at the legally relevant event date** (the date notice is given, the date the tenancy starts), never "today", and `applies_to` decides which version governs an existing tenancy.
- Never edit a published rule in place. Supersede it with a new row and keep the old one.
- Bills and announcements live in the same store with `legal_status: proposed` and are never read by live calculations.
- Pin `version_id` to a dated URL, not `latest`, so the cited text cannot change underneath the rule.

### 3.4 LLM-assisted summarisation: known failure modes

The evidence does not support unsupervised use. Dahl et al., "Large Legal Fictions" (`https://arxiv.org/abs/2401.01301`), found general-purpose models hallucinated on 58% to 88% of specific, verifiable legal questions and could not reliably tell when they were doing so. Magesh et al., "Hallucination-Free?" (`https://arxiv.org/abs/2405.20362`), found commercial retrieval-grounded legal research tools still hallucinated 17% to 33% of the time. Stanford HAI summary: `https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive`. Grounding in retrieved text reduces the problem; it does not remove it.

Failure modes to design against in this task:

1. **Wrong commencement date.** Confusing assent, gazettal and commencement; missing staged commencement or "a date appointed by Order in Council"; inventing a date when none is stated.
2. **Missed transitional and savings provisions**, so a change is applied to existing tenancies it does not cover, or the reverse.
3. **Treating a bill, or an enacted but uncommenced amendment, as current law.**
4. **Number and unit slips.** Days versus working days, weeks versus months, "at least" versus "more than", swapping two periods that appear in the same section.
5. **Scope errors.** Boarding houses, fixed-term versus periodic tenancies, social housing carve-outs.
6. **Summarising noise as substance.** Editorial reprint changes and renumbering presented as policy change.
7. **Jurisdiction bleed.** A Victorian rule described in a summary of a Queensland change.
8. **Instructions hidden in fetched content.** Web pages are untrusted input; text on a page can try to steer the model.
9. **Confident output with no abstention** when the source is ambiguous.

### 3.5 Recommended guardrails

- **Quote-backed extraction, mechanically checked.** Every proposed field is `{value, quote, locator}`. Reject the proposal unless the quote is an exact substring of the snapshot and the value appears in the quote. This one check removes most invented dates and numbers.
- **Dates only from quotes, and typed.** Each date is labelled assent, commencement or expiry. If commencement depends on a later instrument, the rule gets `enacted_not_commenced`, no `effective_from`, and an open watch task.
- **Abstention is a valid output.** "Cannot determine from the text" routes to a person and is not a failure.
- **Mandatory human sign-off.** The model can open a pull request; it cannot merge or publish. Enforce this with branch protection and code owners, not convention.
- **Dual review for high-impact rules** (money caps, notice periods, termination grounds, penalties): two approvers, one of whom reads the primary source rather than the summary.
- **Confidence labels computed from evidence, not self-reported.** High: primary legislation source, quotes verified, regulator page agrees. Medium: primary source only. Low: regulator or news source only. Nothing publishes on Low.
- **Two-source rule.** No rule change from a secondary source alone. Regulator pages corroborate and explain; the legislation text decides.
- **Automatic regression tests on date calculators.** Keep a fixture set of scenarios (notice given on a given date, public holidays, month ends, leap days, each jurisdiction). On every proposed pack, run old and new packs over the fixtures and show the reviewer the table of scenarios whose answer changes. Unexplained deltas block the merge; so does a proposal that changes nothing when its summary says it should.
- **Replay evaluation.** Build a test set from past amendments using dated version URLs (for example the RTA before and after 2025-12-01). Measure whether the pipeline finds the change, the date and the transitional rule. Re-run when the model or prompt changes.
- **Staleness alarms.** Per source: alert if a priority-1 source has had no successful fetch for 3 days, priority-2 for 14 days. Per rule: flag any rule not human-verified in 180 days. Show users "law checked as at <date>" and degrade visibly, not silently, when a source is stale.
- **Isolate the model from fetched content.** No tools and no write access during summarisation; fetched text passed as data; output validated against a schema.
- **Immutable packs and one-step rollback.** Publishing repoints to a new version; rolling back repoints to the previous one.

## 4. Part 3 - Etiquette and legal

### 4.1 Copyright and reuse (as stated on each site when fetched)

| Site | Position |
|---|---|
| legislation.govt.nz (legislation and API data) | **No copyright** in NZ legislation (Copyright Act 1994 s 27). It may be reproduced in any format without permission. The API terms add that the Crown does not assert copyright over the compiled data. Material incorporated by reference may still be copyright |
| legislation.govt.nz (other content: news, help) | Crown copyright, CC BY |
| tenancy.govt.nz | Crown copyright. Reproduction is allowed for **personal or non-commercial** use with attribution and without misleading context. A commercial product should link, quote briefly and summarise in its own words, not copy pages. Rental bond data is separately CC BY 3.0 NZ (credit MBIE) |
| legislation.qld.gov.au | CC BY 4.0 |
| legislation.vic.gov.au | Copyright; the Government Printer owns copyright in Victorian legislation; "no part may be reproduced" except under the Copyright Act; authorised versions are "for personal use only". Hash, link and quote sparingly; do not republish text |
| legislation.wa.gov.au | The disclaimer page only disclaims accuracy; no open licence seen. Treat as copyright |
| legislation.sa.gov.au, regulator sites, IRD, Privacy Commissioner, Justice, Parliament | Reuse terms not read in this pass; assume Crown or State copyright and do not republish |

Monitoring, hashing, diffing and showing a reviewer a short quoted extract with a link is low-risk everywhere. Republishing page text to customers is where the terms above matter. This is a summary of site terms, not legal advice.

### 4.2 robots.txt and access constraints observed

| Host | robots.txt / constraint | Practical consequence |
|---|---|---|
| www.legislation.govt.nz | `Disallow: /items/` and `Disallow: /*?`; everything else allowed; sitemap advertised | Do not poll search results or any URL with a query string (including `?active_tab=version`). `.xml`, `.pdf` and sitemap paths are fine. Terms of use: all activity is logged and PCO may block misuse |
| api.legislation.govt.nz | API terms: key is personal and confidential; 10,000 requests/key/day; 2,000 requests/IP/5 min | Far above this watcher's needs |
| classic.legislation.govt.nz | `Disallow: /` | Do not use |
| bills.parliament.nz | `Allow: /` | The JSON search endpoint is undocumented; keep it to one request a day |
| www.tenancy.govt.nz | Disallows admin paths and news URLs with query strings; `Crawl-delay: 5` for Bingbot only | 5 s spacing is a sensible courtesy |
| www.hud.govt.nz | No robots.txt (404); Imperva in front; HTTP 429 on the seventh rapid request | At least 5 s between requests, one pass a day |
| www.ird.govt.nz, www.taxpolicy.ird.govt.nz | Disallow `/temp`, `/sitecore`, `/app_data` only | No constraint on the pages listed |
| www.privacy.org.nz | `crawl-delay: 10`; disallows `/*/changes` and `/*/allchanges` | 10 s spacing; use the "What's New" RSS, not page-change feeds |
| www.justice.govt.nz | Disallows `/*/changes`, `/*/allchanges`, `/assets/`, `/jdo_documents/` | Do not auto-fetch the practice-direction PDFs |
| forms.justice.govt.nz | robots.txt request was reset | Unknown. The Solr proxy is undocumented and returns personal information; count-only use unless the Ministry agrees otherwise |
| www.employment.govt.nz | `Crawl-delay: 5` | 5 s spacing |
| gazette.govt.nz | Disallows `/home/search`, `/issues/*`, `/storage/*`, PDFs | Search is off limits |
| catalogue.data.govt.nz | Disallows `/api/` and filtered listings | Do not poll the CKAN API |
| legislation.nsw.gov.au | Unreadable (challenge) | Blocked |
| www.nsw.gov.au | Standard CMS robots; no crawl-delay seen | Fine |
| www.legislation.vic.gov.au | `Crawl-delay: 2`; disallows document files under `/sites/default/files/` | 2 s spacing; do not fetch the PDF or DOC versions |
| www.consumer.vic.gov.au | `Crawl-delay: 5` ("maximum rate is one page every 5 secs") | 5 s spacing |
| www.legislation.qld.gov.au | Disallows `/view/pdf/` and compare views; blocks some named crawlers entirely (including GPTBot) | Use HTML and feeds only; identify the watcher honestly |
| www.rta.qld.gov.au, www.consumerprotection.wa.gov.au | Standard CMS robots; no crawl-delay seen | Fine |
| www.legislation.wa.gov.au | No robots.txt (404) | Be conservative anyway |
| www.legislation.sa.gov.au | `Crawl-delay: 10`; disallows `/search` | 10 s spacing |
| www.cbs.sa.gov.au | `Crawl-delay: 20` | 20 s spacing |

robots.txt is a convention (RFC 9309, `https://www.rfc-editor.org/rfc/rfc9309.html`), not a licence, but honouring it is the cheapest way to stay welcome on government sites.

### 4.3 Sensible polling

- **Once a day is enough** for legislation, bills and regulator news. Law does not commence faster than that, and commencement is almost always announced ahead. Guidance, tax, privacy and holiday pages: weekly.
- The reachable priority 1 and 2 set is 44 requests across 17 hosts, of which 24 are daily. Run hosts in parallel but requests to one host in series, honouring the largest crawl-delay above (default 5 s where none is stated).
- Schedule off-peak for the target sites (for example 18:00 UTC, early morning in NZ and eastern Australia), with a random start offset.
- Send a truthful User-Agent that names the watcher and gives a contact address, for example `<product>-regwatch/1.0 (+https://<your-domain>/regwatch; <contact email>)`. Government web teams usually contact, not block, a polite and identifiable client. I tested with a browser-style UA; an honest bot UA made no difference on the Cloudflare-protected NSW hosts.
- Use conditional requests where validators are offered, cap retries at two with backoff, and never retry a 403 or 429 in the same run.
- Prefer sanctioned channels as they become available: the PCO API key for NZ, and email notification subscriptions (NSW, SA) into a monitored mailbox as a human-readable backstop.

## 5. Gaps and follow-ups

1. **PCO API key.** Email contact@pco.govt.nz. The highest-value follow-up.
2. **Canary run from GitHub Actions** against the whole registry, to confirm hud.govt.nz, nsw.gov.au and the rest behave the same from runner IPs.
3. **NSW legislation access.** Contact NSW PCO; decide the interim manual process.
4. **Queensland regulation.** The ID of the current Residential Tenancies and Rooming Accommodation Regulation on legislation.qld.gov.au was not resolved. The What's New feed will still surface amendments to it.
5. **NSW regulation.** The Residential Tenancies Regulation 2019 (`sl-2019-0629`) is on the blocked host and could not be checked.
6. **Australian tax, privacy and public-holiday sources** (ATO, OAIC, state holiday pages) were outside this brief and are not in the registry.
7. **Reuse terms** for the SA, WA regulator, IRD, Privacy Commissioner, Justice and Parliament sites were not read.
8. **Tenancy Tribunal case law.** The Solr endpoint works but is undocumented and holds personal information; ask the Ministry of Justice before building on it.
9. **MBIE Market Rent API** subscription, if market-rent data is wanted in the product.
