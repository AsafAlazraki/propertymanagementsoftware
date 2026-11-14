# Operations domain research: Loop & Pool (NZ self-managing landlords, Nelson/Tasman)

Compiled 14 November 2026. All prices NZD.

**How to read this file**

| Tag | Meaning |
|---|---|
| (no tag) | Figure read directly from the linked page on 14 Nov 2026 |
| **[S]** | Figure taken from a search-result summary of the linked page; the page itself was not opened |
| **[D]** | Derived by me from sourced inputs; arithmetic shown |
| **[U]** | Unverified: general industry knowledge or an unsourced/low-authority page. Do not present as fact in the product without checking |

**Research limits.** The session's web-search quota ran out roughly a third of the way through. Everything after that was sourced by fetching known pages directly (Tenancy Services, Trade Me, realestate.co.nz, insurers, PM firms, cost guides). Where no page could be reached, the item is tagged [U]. Specific gaps: BRANZ pages returned 403; builderscrack cost estimators are interactive calculators with no static figures; no primary source was retrieved for locksmith, glazier, handyman and heat-pump-service rates, arrears-rate benchmarks, or igloohome NZ pricing.

---

## 1. Rental market numbers

### 1.1 Headline rents

| Area | Bedrooms | Median weekly rent | Date | Source |
|---|---|---|---|---|
| New Zealand | All | $620 (asking; flat YoY) | Sep 2026 | [Trade Me Rental Price Index](https://www.trademe.co.nz/c/property/news/rental-slide-over-as-tenant-demand-outpaces-supply) |
| New Zealand | All | $625 (asking; +$5 YoY, first annual rise in 18 months) | Aug 2026 | [Trade Me media release, 25 Sep 2026](https://www.interest.co.nz/sites/default/files/2026-09/Trade%20Me%20media%20release%20-%20National%20rents%20up%20year-on-year%20for%20the%20first%20time%20in%2018%20months%20as%20Otago%20becomes%20country%27s%20most%20expensive%20region%20.pdf) |
| New Zealand | All | $595 (new bonds lodged; geometric mean used as median) **[S]** | Jun 2026 | [MBIE bond data via Figure.NZ](https://figure.nz/chart/azFwYTVvUcrcxT3m-Cn6TyuSQBZ8Kacee) |
| New Zealand | 5+ | $1,100 (asking) | Aug 2026 | Trade Me media release (above) |
| Nelson/Tasman region | All | $590 (asking) | Sep 2026 | [Trade Me RPI](https://www.trademe.co.nz/c/property/news/rental-slide-over-as-tenant-demand-outpaces-supply) |
| Nelson/Tasman region | All | $580 (asking; +0.9% YoY) | Aug 2026 | Trade Me media release (above) |
| Nelson/Tasman region | All | $610 (Jun), $600 (Jul) **[S]** | Jun-Jul 2026 | Trade Me RPI monthly releases |
| Nelson City (TA) | All | $565 (new bonds) | Jun 2026 | [MBIE bond data via Figure.NZ](https://figure.nz/chart/azFwYTVvUcrcxT3m-xUviheoBn3Kv3ROS) |
| Tasman District (TA) | All | $570 (new bonds) | Jun 2026 | [MBIE bond data via Figure.NZ](https://figure.nz/chart/azFwYTVvUcrcxT3m-UKFfBikkba5dZbLH) |
| Nelson & Bays | All | $617 average asking, a record (+7.8% YoY) **[S]** | Apr 2026 | [realestate.co.nz](https://realestate.co.nz/news/property-market-news/new-zealand-rental-property-market-2026-april) |
| Marlborough (context) | All | $580 (asking; +4% YoY) | Sep 2026 | Trade Me RPI (above) |

- Nelson City new-bond median ranged $500-$580 between Jan 2025 and Jun 2026; Tasman ranged $560-$610 (Figure.NZ links above).
- Market direction (Trade Me, Sep 2026): new rental listings down about 5% YoY, total inventory down 7%, searches per listing up 20%. The balance is moving back toward landlords after 18 months of flat or falling rents.
- Mean rents: not retrieved. MBIE publishes a geometric mean and uses it as the median.

### 1.2 Nelson/Tasman suburbs by dwelling type and bedrooms

Source for every row: Tenancy Services market rent tool, period **1 Apr 2026 - 30 Sep 2026**. Example URL: [Nelson - Stoke](https://www.tenancy.govt.nz/rent-bond-and-bills/market-rent/?location=Nelson+-+Stoke&period=43&action_doSearchValues=Find+Rent).

Notes for whoever builds on this:
- The `period` URL parameter is an internal ID (43 = Apr-Sep 2026). Old links with `period=6` silently return Mar-Aug 2023 data.
- The tool reports "active bonds", so medians include sitting tenants and run below current asking rents **[U: my reading of the page's wording]**.
- Tenancy Services warns that one-bedroom figures are unreliable because bedroom counts at bond lodgement are often wrong. The "House, 1 bedroom" rows look implausible (dearer than 2-bedroom houses) and are left out below.

| Area | Dwelling / bedrooms | Median weekly rent | Lower-upper quartile | Bonds | Date |
|---|---|---|---|---|---|
| Stoke | All | $530 | $420-$610 | 1,023 | Apr-Sep 2026 |
| Stoke | Flat, 1 | $305 | $200-$380 | 44 | Apr-Sep 2026 |
| Stoke | Flat, 2 | $400 | $310-$480 | 87 | Apr-Sep 2026 |
| Stoke | House, 2 | $480 | $396-$530 | 145 | Apr-Sep 2026 |
| Stoke | House, 3 | $560 | $458-$620 | 417 | Apr-Sep 2026 |
| Stoke | House, 4 | $650 | $488-$720 | 98 | Apr-Sep 2026 |
| Stoke | House, 5+ | $690 | $645-$725 | 7 | Apr-Sep 2026 |
| Tahunanui | All | $470 | $370-$550 | 492 | Apr-Sep 2026 |
| Tahunanui | Flat, 1 | $243 | $198-$317 | 35 | Apr-Sep 2026 |
| Tahunanui | Flat, 2 | $410 | $290-$465 | 104 | Apr-Sep 2026 |
| Tahunanui | Apartment, 2 | $443 | $373-$480 | 12 | Apr-Sep 2026 |
| Tahunanui | House, 2 | $450 | $370-$500 | 74 | Apr-Sep 2026 |
| Tahunanui | House, 3 | $538 | $450-$600 | 113 | Apr-Sep 2026 |
| Tahunanui | House, 4 | $600 | $510-$673 | 37 | Apr-Sep 2026 |
| The Wood | All | $495 | $400-$580 | 389 | Apr-Sep 2026 |
| The Wood | Flat, 1 | $390 | $353-$400 | 23 | Apr-Sep 2026 |
| The Wood | Flat, 2 | $440 | $315-$486 | 70 | Apr-Sep 2026 |
| The Wood | Apartment, 2 | $500 | $435-$565 | 17 | Apr-Sep 2026 |
| The Wood | House, 2 | $495 | $400-$560 | 105 | Apr-Sep 2026 |
| The Wood | House, 3 | $550 | $465-$610 | 62 | Apr-Sep 2026 |
| The Wood | House, 4 | $600 | $505-$690 | 11 | Apr-Sep 2026 |
| Atawhai | All | $540 | $445-$643 | 178 | Apr-Sep 2026 |
| Atawhai | Flat, 1 | $350 | $340-$400 | 11 | Apr-Sep 2026 |
| Atawhai | Flat, 2 | $470 | $370-$515 | 9 | Apr-Sep 2026 |
| Atawhai | House, 2 | $500 | $470-$530 | 21 | Apr-Sep 2026 |
| Atawhai | House, 3 | $540 | $450-$641 | 71 | Apr-Sep 2026 |
| Atawhai | House, 4 | $650 | $550-$720 | 21 | Apr-Sep 2026 |
| Nelson central ("Nelson - Nelson") | All | $460 | $325-$600 | 257 | Apr-Sep 2026 |
| Nelson central | Apartment, 1 | $400 | $300-$435 | 16 | Apr-Sep 2026 |
| Nelson central | Apartment, 2 | $505 | $192-$693 | 26 | Apr-Sep 2026 |
| Nelson central | Flat, 1 | $325 | $253-$432 | 28 | Apr-Sep 2026 |
| Nelson central | Flat, 2 | $380 | $276-$457 | 39 | Apr-Sep 2026 |
| Nelson central | House, 2 | $485 | $370-$570 | 42 | Apr-Sep 2026 |
| Nelson central | House, 3 | $595 | $520-$690 | 27 | Apr-Sep 2026 |
| Nelson central | House, 4 | $555 | $260-$700 | 17 | Apr-Sep 2026 |
| Nelson South | All (skewed by 291 boarding-house rooms at $250) | $340 | $240-$500 | 876 | Apr-Sep 2026 |
| Nelson South | Flat, 2 | $400 | $290-$460 | 58 | Apr-Sep 2026 |
| Nelson South | House, 2 | $460 | $335-$525 | 91 | Apr-Sep 2026 |
| Nelson South | House, 3 | $530 | $393-$597 | 149 | Apr-Sep 2026 |
| Nelson South | House, 4 | $565 | $500-$640 | 35 | Apr-Sep 2026 |
| Richmond (Tasman, "Richmond - Richmond") | All | $550 | $450-$640 | 974 | Apr-Sep 2026 |
| Richmond | Flat, 1 | $318 | $275-$393 | 31 | Apr-Sep 2026 |
| Richmond | Flat, 2 | $408 | $280-$480 | 63 | Apr-Sep 2026 |
| Richmond | House, 2 | $460 | $380-$510 | 115 | Apr-Sep 2026 |
| Richmond | House, 3 | $560 | $470-$620 | 410 | Apr-Sep 2026 |
| Richmond | House, 4 | $650 | $575-$700 | 99 | Apr-Sep 2026 |
| Richmond | House, 5+ | $780 | $600-$875 | 19 | Apr-Sep 2026 |
| Toi Toi (context) | House, 3 | $500 | $406-$570 | 96 | Apr-Sep 2026 |
| Motueka (context) | House, 3 | $480 | $360-$567 | 212 | Apr-Sep 2026 |

Other area names available in the tool for Nelson: Annesbrook, Beachville, Bishopdale, Britannia Heights, Enner Glynn, Glenduan, Maitai, Marybank, Moana, Monaco, Stepneyville, The Brook, Todds Valley, Wakapuaka, Wakatu, Washington Valley. For Richmond: Appleby, Hope, Redwood Valley.

### 1.3 Asking rents, house values, yields and days-to-let by suburb

| Suburb | Median asking rent (12 mo) | Median sale price (12 mo, REINZ via realestate.co.nz) | Trade Me median HomesEstimate (Nov 2026) | Gross yield **[D]** | Median days to rent | Median days to sell | Source |
|---|---|---|---|---|---|---|---|
| Stoke | $595/wk (+0.8%) | $734,188 (-1.7%) | $725K | 4.2-4.3% | 15 | 29 | [realestate.co.nz](https://www.realestate.co.nz/insights/nelson-bays/nelson/stoke), [Trade Me](https://www.trademe.co.nz/a/property/insights/search/nelson/stoke) |
| Tahunanui | $550/wk (0%) | $548,000 (-10.5%) | $640K | 4.5-5.2% | 19 | 38 | [realestate.co.nz](https://www.realestate.co.nz/insights/nelson-bays/nelson/tahunanui), [Trade Me](https://www.trademe.co.nz/a/property/insights/search/nelson/tahunanui) |
| The Wood | $580/wk (+5.5%) | $710,000 (-14.5%) | $730K | 4.1-4.2% | 18 | 45 | [realestate.co.nz](https://www.realestate.co.nz/insights/nelson-bays/nelson/the-wood), [Trade Me](https://www.trademe.co.nz/a/property/insights/search/nelson/the-wood) |
| Atawhai | $650/wk (+6.6%) | $910,000 (+13.7%) | $825K | 3.7-4.1% | 22 | 48 | [realestate.co.nz](https://www.realestate.co.nz/insights/nelson-bays/nelson/atawhai), [Trade Me](https://www.trademe.co.nz/a/property/insights/search/nelson/atawhai) |
| Richmond | $630/wk (+1.6%) | $840,688 (+5.3%) | $795K | 3.9-4.1% | 16 | 28 | [realestate.co.nz](https://www.realestate.co.nz/insights/nelson-bays/tasman/richmond), [Trade Me](https://www.trademe.co.nz/a/property/insights/search/tasman/richmond) |
| Nelson (central suburb) | not retrieved | not retrieved | $960K | n/a | n/a | n/a | [Trade Me](https://www.trademe.co.nz/a/property/insights/search/nelson/nelson) |

Yield = asking rent x 52 / value; the range uses the sale-price median and the HomesEstimate median as alternative denominators. Suburb sale medians move a lot on small samples (62-76 sales in The Wood, Atawhai and Tahunanui).

Region-wide value references:

| Measure | Value | Date | Source |
|---|---|---|---|
| Nelson average home value (QV) | $778,674 (-2.6% YoY) **[S]** | Apr 2026 | [QV House Price Index](https://www.qv.co.nz/news/qv-house-price-index-steady-as-she-goes/) |
| Tasman average home value (QV) | $830,617 **[S]** | Feb 2026 quarter | [QV HPI Feb 2026](https://www.qv.co.nz/news/qv-house-price-index-february-2026-home-values-still-holding-steady-for-now/) |
| Nelson median house price | $691,000 | Sep 2026 | [Opes Partners](https://www.opespartners.co.nz/property-markets/nelson) (underlying data source not named) |
| Nelson/Tasman average asking price | $766,600 (-4.8% YoY) **[S]** | Sep 2026 | Trade Me Property Pulse |
| NZ median value (Cotality) | $790,987 (-2.3% YoY; 19.1% below Jan 2022 peak) | Oct 2026 | [Cotality HVI](https://www.cotality.com/nz/insights/articles/housing-market-down-again-as-election-looms) |
| NZ average home value (QV) | $890,508 | Oct 2026 | [QV](https://qv.co.nz/price-index/) |

Typical Nelson gross yield: about **4.0-4.5%** on these inputs **[D]** (Nelson City $565 x 52 / $691,000 = 4.25%). An unsourced page quoting 4.5-5.5% was found ([Moneybalance](https://moneybalance.co.nz/mortgages/regional/nelson-house-prices/)) **[U]**. Cotality's October 2026 regional table and yield figures did not include Nelson in the retrievable text.

### 1.4 Property management fees (inputs for "savings vs a property manager")

| Fee | Typical NZ level | Named examples | Source |
|---|---|---|---|
| Management fee | 7.5-8.5% + GST of rent collected is typical; 7-10% + GST is the usual range; budget 6-7%, premium 10%+ | Barfoot & Thompson 8.5% + GST (9.5% furnished); Opes 7.99% + GST; Property Brokers 9% + GST ("Exclusive") or 11% + GST all-inclusive | [Opes](https://www.opespartners.co.nz/property-management/how-much-does-property-management-cost), [Property Brokers](https://www.propertybrokers.co.nz/news/how-much-does-property-management-cost-in-new-zealand), [Property Brokers packages](https://www.propertybrokers.co.nz/manage/our-packages), [Barfoot FAQ](https://www.barfoot.co.nz/landlords/help-and-tips/landlord-faqs) |
| Letting fee (charged to landlord) | One week's rent + GST is usual; some charge a flat fee | Property Brokers $395 + GST; flat $550-$600 + GST at some agencies **[S]** | Opes, Property Brokers (above) |
| Routine inspection | $35-$100 each, normally 4 a year | Property Brokers $55 + GST; Trade Me guide $35-$65 + GST | Opes; [Trade Me guide, Apr 2024](https://www.trade.me/c/property/article/how-much-are-property-management-fees-in-nz) |
| Maintenance margin | 5-10% on tradie invoices | Property Brokers 9% + GST | Opes; Property Brokers |
| Advertising | $150-$500 + GST where charged | Property Brokers Trade Me ad $150 + GST | Property Brokers; Trade Me guide |
| Tenant credit check | About $25 per check | | Opes |
| Tribunal attendance | $100-$200 per hearing where charged | Included at Property Brokers and Barfoot | Opes |
| Healthy Homes assessment | About $150 + GST | | Trade Me guide; Property Brokers |
| Off-contract hourly work | $40-$60/hr | | Trade Me guide |

- Letting fees cannot be charged to tenants; the landlord pays (Opes, above).
- Nelson-specific fees: Summit (the largest Nelson/Tasman/Marlborough manager) does not publish its percentage; it offers a sliding scale for multiple properties ([Summit FAQ](https://summit.co.nz/property-management/resources/frequently-asked-questions)). Use national figures.
- A property manager is expected to carry around 120 properties (Opes).

### 1.5 Savings maths: worked example **[D]**

Assumptions: $590/week (Trade Me Nelson/Tasman median, Sep 2026); 8% + GST management; letting fee of one week + GST spread over a 25-month median tenancy; four inspections at $55 + GST; 9% + GST margin on $1,746 average annual maintenance.

| Line | Calculation | Per year |
|---|---|---|
| Annual rent | $590 x 52 | $30,680 |
| Management fee | 9.2% (8% + GST) x $30,680 | $2,823 |
| Letting fee, amortised | $590 x 1.15 = $678.50, x 12/25 | $326 |
| Inspections | 4 x $55 x 1.15 | $253 |
| Maintenance margin | $1,746 x 9% x 1.15 | $181 |
| **Total PM cost** | | **about $3,580 (11.7% of rent, $69/week)** |

Sensitivity: management fee alone is $2,646 at 7.5% + GST and $3,175 at 9% + GST. Self-management costs to net off: Trade Me listing $219 per re-let, tenant checks about $40-$63 each including GST, Tribunal fee $29 if needed, plus the app subscription. PM fees are a deductible rental expense, so the after-tax saving is smaller.

### 1.6 Tenancy length, vacancy and re-letting costs

| Item | Figure | Source |
|---|---|---|
| Median tenancy length (NZ) | 25 months (14 in 2010) | [RNZ, 3 Apr 2025, citing Ministry of Housing and Urban Development data](https://www.rnz.co.nz/news/top/556995/the-tenancies-that-have-lasted-20-years) |
| Mean tenancy length (NZ) | 50 months (28 in 2010). Caveat in the article: unclaimed old bonds may inflate both numbers | RNZ (above) |
| Days to let, Nelson suburbs | 15-22 days median (table 1.3) | realestate.co.nz insights |
| Days to re-let, NZ | About 22 days; no source named in the article **[U]** | [Goodwins](https://www.goodwins.co.nz/client-resources/keeping-our-clients-updated/cost-crunch-piles-pressure-on-landlords/) |
| Cost of one vacant week | $590 = 1.9% of annual rent **[D]** | |
| Average house insurance premium | $2,949/yr, up 31% in three years | Goodwins (above) |
| Council rates | Average 6.9% rise for 2026/27 nationally | Goodwins (above) |

**Trade Me Property "Residential for rent" listing fees** (official fee page, updated 2 Nov 2026; listing runs up to 21 days; Bronze relist is free within 45 days of closing; GST treatment not stated on the page). Source: [Trade Me Property fees](https://help.trademe.co.nz/hc/en-us/articles/360032007872-Property-fees).

| Weekly rent | Bronze | Silver | Gold | Relist (Silver / Gold) |
|---|---|---|---|---|
| Up to $299 | $119 | $159 | $179 | $40 / $60 |
| $300-$399 | $169 | $219 | $259 | $50 / $90 |
| $400-$599 | $219 | $319 | $339 | $100 / $120 |
| $600-$799 | $279 | $379 | $409 | $100 / $130 |
| $800-$999 | $299 | $419 | $449 | $120 / $150 |
| $1,000+ | $339 | $489 | $509 | $150 / $170 |

Flatmates wanted: $9.90 (14 days). Gold carousel renewal: $60. Trade Me notes it sometimes A/B tests prices.

| Other re-letting cost | Figure | Source |
|---|---|---|
| myRent multi-site listing (Trade Me, Homes.co.nz, Facebook, myRent) | $119 + GST; Premium upgrade +$179 + GST | [myRent](https://www.myrent.co.nz/advertise-on-trademe) |
| Tenant check (credit, background, references) | $35 + GST basic; $55 + GST comprehensive | [myRent tenant checks](https://www.myrent.co.nz/tenant-checks) |
| Tenancy Tribunal application | $29 (recoverable if successful) | [Tenancy Services](https://www.tenancy.govt.nz/disputes/tribunal/making-an-application/) |
| End-of-tenancy clean, 3-bedroom house | $380-$650; carpet steam clean $50-$90 per room; oven clean $80-$150 **[U: low-authority aggregator, Apr 2025]** | [QuickTrade](https://quicktrade-pi.vercel.app/blog/end-of-tenancy-cleaning-nz) |

**Cost of one tenant turnover at $590/week, self-managed [D]:** vacancy of 15-22 days ($1,264-$1,854) + Trade Me Bronze ($219) + two tenant checks ($80-$127) + cleaning or touch-ups not recoverable from bond ($0-$650 **[U]**) = **about $1,560-$2,850**, or 2.6-4.8 weeks' rent. With a property manager, add the $678.50 letting fee.

---

## 2. CapEx asset lifecycles (sinking-fund forecaster)

GST basis matters: checkmybuilder figures exclude GST (add 15%); Water & Gas Worx cylinder prices include GST. Checkmybuilder's "regional NZ" estimates run about 15-30% below Auckland for large jobs (bathroom $20,000 vs $28,000; rewire $20,000 vs $25,000; replumb $17,000 vs $20,000), which is the best available proxy for Nelson.

| Asset | Lifespan (yrs) | Cost low | Cost high | Source and notes |
|---|---|---|---|---|
| Hot water cylinder, electric 180L mains pressure, installed | 10-15 (budget for replacement after 12) | $3,499 | $4,399 | [Water & Gas Worx, Auckland, Apr 2026](https://wgw.co.nz/hot-water/cylinders/electric/), incl. GST. Low-pressure 135L from $2,499. An aggregator quotes $1,200-$2,800 **[U]** |
| Heat pump, hi-wall 5-7kW, installed | 10-15 | $2,600 | $5,000 | Lifespan: [Consumer NZ](https://consumer.org.nz/home-and-living/household-essentials/appliance-life-expectancy). Cost: [checkmybuilder, May 2026](https://checkmybuilder.co.nz/cost/heat-pump-install) $2,000-$4,000 for 3-5kW and $4,000-$8,000 for 5-9kW excl. GST; [Mitre 10](https://www.mitre10.co.nz/services/heat-pump-installation) $1,700-$4,000 supplied and installed; Bunnings Rinnai 5kW $2,595 and 7kW $3,155 with standard install **[S]** |
| Roof, long-run steel re-roof (about 150-180 m2 roof) | 30-50 (less near the coast) | $18,000 | $40,000 | [checkmybuilder, Jul 2026](https://checkmybuilder.co.nz/cost/roof-replacement): long-run steel $120-$200/m2 excl. GST. Range **[D]**; removal of old roof (about +25% **[S]**) and scaffolding (typical $7,000) push toward the top |
| Roof repaint | 10-15 **[U]** | $3,500 | $8,000 | **[U]** No source retrieved |
| Exterior repaint | 6-8 coastal, 10-12 inland | $7,000 | $22,000 | [checkmybuilder, May 2026](https://checkmybuilder.co.nz/cost/house-painting-exterior), excl. GST: $7,000-$12,000 small single-storey, $12,000-$22,000 typical 150-200 m2. Tahunanui, Atawhai and The Wood are coastal |
| Interior repaint (whole house about 150 m2) | 7-10 **[U]** | $7,000 | $14,000 | [checkmybuilder, May 2026](https://checkmybuilder.co.nz/cost/house-painting-interior), excl. GST. Single room or small house $2,000-$5,000 |
| Carpet (about 70 m2 in a 3-bedroom house) | 8-12 in a rental **[U]** | $4,000 | $9,000 | **[D]** from [ArchiPro, Mar 2024](https://archipro.co.nz/article/cost-of-carpet-in-new-zealand): nylon $30-$120/m2, laying about $20/m2, underlay $10-$20/m2. [Refresh Renovations](https://www.refreshrenovations.co.nz/articles/carpet-options-and-prices-nz): solution-dyed nylon $25-$100+/m2 |
| Vinyl, wet areas (about 15-20 m2) | 10-20 **[U]** | $1,200 | $3,000 | **[U]** No source retrieved |
| Oven and cooktop (or freestanding range) | 13-15 | $1,200 | $3,000 | Lifespan: Consumer NZ. Cost **[U]** (retail plus install) |
| Rangehood (ducted outside) | 10-15 **[U]** | $400 | $1,200 | **[U]**. A new kitchen fan must be 150mm diameter or 50 L/s and vent outside ([Tenancy Services](https://www.tenancy.govt.nz/healthy-homes/ventilation-standard/)) |
| Dishwasher | 9-10 | $850 | $1,700 | Lifespan: Consumer NZ. Cost **[U]** |
| Bathroom extractor fan (each, ducted outside) | 10 **[U]** | $350 | $900 | **[U]**. A new bathroom fan must be 120mm or 25 L/s and vent outside (Tenancy Services, above) |
| Smoke alarms, long-life photoelectric (set of 3-5) | 10 (law requires at least 8-year battery life; replace at expiry) | $100 | $300 | Requirement: [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/smoke-alarms/). Price **[U]** (about $25-$60 each) |
| Gutters / spouting and downpipes (40-50 m) | 20-30 PVC, 25-40 coated steel **[U]** | $2,500 | $6,000 | **[U]** No source retrieved |
| Curtains / blinds, whole house (8-10 windows) | 7-12 **[U]** | $1,500 | $5,000 | **[U]** |
| Bathroom refit | 15-25 **[U]** | $8,000 | $35,000 | [checkmybuilder, Jul 2026](https://checkmybuilder.co.nz/cost/bathroom-renovation), excl. GST: $8,000-$15,000 cosmetic refresh, $15,000-$35,000 mid-range; typical $22,000 (regional NZ $20,000) |
| Kitchen refit | 15-25 **[U]** | $15,000 | $45,000 | [checkmybuilder, Jul 2026](https://checkmybuilder.co.nz/cost/kitchen-renovation), excl. GST: $15,000-$25,000 refresh on existing layout, $25,000-$45,000 full replacement; typical $35,000 |
| Fencing (about 30 m of 1.8 m timber paling) | 15-25 (8-12 for cheap installs) | $4,000 | $7,000 | [checkmybuilder, May 2026](https://checkmybuilder.co.nz/cost/fence-installation), excl. GST; $90-$250+ per metre. Boundary fences are generally shared 50/50 under the Fencing Act |
| Deck (15-20 m2, treated pine) | 12-15 pine; 25-30 hardwood if oiled | $6,000 | $15,000 | **[D]** from [checkmybuilder, Jul 2026](https://checkmybuilder.co.nz/cost/deck): $300-$500/m2 ground-level, $500-$900/m2 raised, excl. GST |
| Garage door opener | 10-15 **[U]** | $600 | $1,200 | **[U]** |
| Retrofit double glazing (3-bedroom, 12-15 windows) | 20-30 for sealed units **[U]** | $10,000 | $25,000 | [checkmybuilder, Jun 2026](https://checkmybuilder.co.nz/cost/double-glazing-retrofit), excl. GST; $450-$800 per m2 of glass; living areas plus 1-2 bedrooms $4,000-$10,000. [Canstar](https://www.canstar.co.nz/home-loans/how-much-does-double-glazing-cost/): $450-$1,500/m2 **[S]** |
| Insulation top-up (ceiling; ceiling plus underfloor) | 30-50 if kept dry **[U]** | $2,000 | $6,000 | [checkmybuilder, Jun 2026](https://checkmybuilder.co.nz/cost/insulation-install), excl. GST: ceiling only $2,000-$3,000; ceiling plus underfloor $2,000-$6,000; $35-$60/m2 each |
| Ground moisture barrier (about 100 m2 subfloor) | 20+ **[U]** | $800 | $2,000 | Material about $8/m2 DIY, 0.25mm polythene, 75mm overlaps ([Barfoot & Thompson](https://www.barfoot.co.nz/landlords/help-and-tips/ground-moisture-barrier), undated). Installed range **[U]** |

Other Consumer NZ life expectancies (reviewed Sep 2023): fridge-freezer 10-11, washing machine 10, dryer 10-11, microwave 8, dehumidifier 10.

**Annual maintenance budgeting rules of thumb**

| Rule | Figure | Source |
|---|---|---|
| NZ property-manager guidance | At least $1,500/yr, ideally 0.3-0.5% of property value | [Barfoot & Thompson](https://www.barfoot.co.nz/landlords/ask-kiri/maintenance-mistakes) |
| Actual spend, regional NZ rentals | $1,746 average per property in the past year (about 8,750 properties; 33% general repairs, 23% plumbing and gas, 11% electrical) | [Property Brokers, 1 Jul 2026](https://www.propertybrokers.co.nz/news/the-hidden-maintenance-costs-facing-new-zealand-landlords) |
| BRANZ economist, stand-alone house | 0.5-2% of value per year **[S, secondary]** | [Initio](https://initio.co.nz/deferring-property-maintenance/) |
| BRANZ average home maintenance cost | About $5,000/yr **[S]** | [BRANZ](https://www.branz.co.nz/design-build/articles/hidden-cost-of-not-maintaining) (page returned 403) |
| Share-of-rent rules | 10% of rent, or 1.5x monthly rent per year **[S]** | Lodge Real Estate blog (page now 404) |

Suggested forecaster default **[D]**: reactive maintenance at 0.3-0.5% of value ($2,200-$3,700 on a $735,000 Stoke house; $1,746 is the observed regional average) plus a CapEx sinking fund. Summing mid-point cost divided by lifespan for the assets above gives roughly $9,000 a year, about 1.2% of value, for a house where everything is eventually replaced. That sits inside the BRANZ 0.5-2% range and well above what most landlords set aside.

---

## 3. Maintenance triage

### 3a. Common tenant-reported issues and safe self-help

Sourced steps come from Summit Property Management's tenant troubleshooting guide ([web page](https://summit.co.nz/rent/caring-for-your-home/trouble-shooting); Summit is the main Nelson/Tasman manager), [Tenancy Services mould guidance](https://www.tenancy.govt.nz/maintenance-and-inspections/mould-and-dampness/), [EECA](https://www.eeca.govt.nz/for-homes/energy-saving-technology/heating-and-cooling/heat-and-cool-efficiently-at-home/) and [Summit's heat pump article](https://summit.co.nz/about/about-summit/latest-news/how-to-maintain-your-heat-pump). Steps and cost ranges marked [U] are standard practice but were not confirmed against a source in this session. Cost ranges draw on section 3c.

| Issue | Self-help steps | Stop-and-call triggers | Likely trade | Typical urgency | Typical cost range |
|---|---|---|---|---|---|
| No power (whole house) | Ask neighbours or check the lines company outage page; check the power account is paid; look for a tripped main switch or RCD at the switchboard and reset once | Breaker trips again straight away; burning smell; scorch marks; buzzing switchboard | Electrician | Emergency if a house fault; routine if a network outage | $150-$350 |
| One power point or circuit dead / tripping | Test the appliance in another socket; unplug everything on the circuit, reset the breaker once, plug items back one at a time to find the faulty appliance | Do not open or repair sockets; stop if it trips with nothing plugged in, or if the socket is warm, cracked or wet | Electrician | Urgent | $150-$300 |
| No hot water (electric cylinder) | Check the hot water switch at the switchboard and the isolating switch by the cylinder; check for a tripped breaker; check the bill is paid; consider whether the tank has simply been emptied and wait 2-3 hours **[U]** | Water leaking from cylinder or valves; water near wiring; scalding-hot or steaming water from taps | Plumber or electrician (element, thermostat) | Urgent (24-48 h) | $200-$400 for element or thermostat **[U]** |
| No hot water (gas) | Check the LPG bottle is not empty and switch to the full one; check the unit has power; check accounts are paid | Any gas smell: see caveats below | Gasfitter | Urgent | $150-$350 **[U]** |
| Heat pump not heating | Check mode is Heat (not Auto, Cool or Fan); set 18-21C; replace remote batteries; clean filters; clear leaves from the outdoor unit; allow 10-15 minutes on frosty mornings for defrost **[U]**; power off at the wall for 5 minutes and restart **[U]** | Error code or flashing light persists; water dripping indoors; ice that does not clear; burning smell | Heat pump technician | Urgent in winter (it is the Healthy Homes heater) | $100-$200 service; more for repair **[U]** |
| Oven not working after a power cut | Set the clock; turn the timer to Manual; check the wall isolating switch and the breaker | Sparking; element visibly broken; breaker trips when oven is switched on | Electrician or appliance technician | Urgent (2-3 days) | $150-$350 **[U]** |
| Light not working | Replace the bulb (commonly the tenant's job once supplied working); check the breaker | Flickering across several lights; hot or buzzing fitting | Electrician | Routine | $120-$250 |
| Blocked sink or basin | Remove and clean the plug and trap strainer; use a plunger; flush with hot (not boiling) water and detergent **[U]** | Water backing up in several fixtures; sewage smell; do not use caustic drain cleaner before a plumber attends | Plumber | Routine; urgent if it is the only sink | $150-$350; blockages from grease or foreign objects may be charged to the tenant |
| Blocked toilet | Stop flushing; use a toilet plunger; lift the cistern lid and close the flap or isolating valve if the bowl is about to overflow **[U]** | Overflowing; sewage coming up outside gully trap or in the shower | Plumber or drainlayer | Urgent; emergency if only toilet or sewage overflow | $150-$520 |
| Running or leaking toilet cistern | Jiggle the flush button; check the flap or float is seated; turn off the isolating valve by the toilet between uses **[U]** | Water on the floor; constant overflow | Plumber | Routine (water cost adds up; urgent if metered and heavy) | $150-$400 |
| Burst pipe or major leak | Turn water off at the toby (road-side meter); open taps to drain the pipes; switch off power to affected areas if safe; move belongings; photograph | Always call straight away | Plumber | Emergency | $250-$600+ |
| Dripping tap | Note which tap; no DIY needed; put a container under it **[U]** | Leak inside a cupboard or wall | Plumber | Routine | $120-$250 washer; $360-$590 new mixer |
| Smoke alarm chirping | A chirp every 30-60 seconds means low battery or end of life: press test or hush, vacuum dust off the vents, replace the battery only if it is a replaceable type, check the expiry date **[U]** | Sealed long-life unit chirping or past expiry: landlord must replace. Never remove or disconnect an alarm (tenant penalty up to $4,000) | Landlord or handyman | Urgent (landlord must keep alarms working) | $25-$60 per alarm **[U]** |
| Mould or condensation | Wipe condensation; clean mould with white vinegar (half and half with water on paint) or bleach 1:3 with water, wearing gloves, eye protection and a mask; ventilate daily; run extractor fans; keep furniture off walls; dry washing outside | Mould returns quickly despite ventilating and heating; mould on ceilings under a roof or around windows after rain (leak); musty smell under floor | Builder, roofer or plumber | Routine; urgent if a leak or a health concern | Varies |
| Waste disposal jammed | Switch off at the wall; press the red reset button underneath; free the plate with the hex key in the centre underneath; run cold water and retry **[U]** | Never put a hand in; stop if it hums and trips again, or leaks | Plumber or appliance technician | Routine | $150-$450 **[U]** (new InSinkErator units fitted from about $450 + GST per [Water & Gas Worx](https://wgw.co.nz/small-jobs/)) |
| Washing machine not draining | Usually the tenant's own appliance: clean the pump filter; check the drain hose is not kinked or pushed too far into the standpipe; check the tub outlet is clear **[U]** | Water coming back up the standpipe or tub (drain blockage is the landlord's side) | Plumber if drain; otherwise tenant's appliance repairer | Routine | $150-$350 |
| Dishwasher not draining or starting (landlord chattel) | Clean the filter; check the door latch, the tap under the sink and the breaker **[U]** | Leaking onto the floor; tripping the breaker | Appliance technician | Routine | $150-$300 **[U]** |
| Low water pressure | Check whether all taps or one are affected; clean the tap aerator; check the toby is fully open; ask neighbours or check council notices **[U]** | Sudden drop plus damp ground or water-meter spinning (hidden leak); only hot is low (valve or cylinder fault) | Plumber | Routine; urgent if a leak is suspected | $150-$400 |
| Gas pilot light out | Follow the relighting instructions on the appliance once only; check the LPG bottle | Smell of gas; pilot will not stay lit; soot or yellow flame | Gasfitter | Urgent | $150-$300 **[U]** |
| Locked out or lost keys | Contact the landlord for the spare during business hours with photo ID | After hours a locksmith is at the tenant's expense (Summit policy); lost keys are charged to the tenant ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/locks-and-security/)) | Locksmith | Urgent for the tenant | $150-$350 **[U]** |
| Garage door will not open | Replace the remote battery; check the opener has power; use the manual release cord **[U]** | Broken spring or cable; door off its tracks: do not force it | Garage door technician | Routine; urgent if the car is trapped or the house is insecure | $150-$400 **[U]** |

**Safety caveats to show in the app [U unless linked]**
- **Gas smell:** turn off at the bottle or meter if safe, open doors and windows, no flames, no light switches, leave, then call the gas supplier's emergency line or 111. Homes with gas in Nelson/Tasman are on LPG rather than piped natural gas **[U]**.
- **Electrical:** burning smell, scorch marks, tingles from taps or appliances, or water near electrics: switch off at the main switch if safe, keep clear, call an electrician. Reset a tripped breaker once only.
- **Sewage:** stop using water, keep children and pets away, treat as an emergency.
- **Leaking hot water cylinder:** turn off its power and its water supply valve.
- **Fire or immediate danger:** 111 first, landlord second.
- **Licensed work:** electrical, plumbing, gasfitting and drainlaying work must be done by licensed practitioners ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/regular-maintenance/using-licensed-practitioners-for-your-property/)).
- **Legal backstop:** if disrepair is likely to cause injury or property damage and the tenant has made reasonable attempts to reach the landlord, the tenant may get the work done and the landlord must reimburse ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/damage-and-repairs/)). Tenants cannot withhold rent while waiting for repairs.

### 3b. How urgency is classified

The law only says landlords must repair "promptly" and defines the urgent-repair reimbursement rule above. The tiers and response targets below are industry convention **[U]**; NZ managers publish the process (Summit: phone the property manager at once for emergencies, online request for routine; Property Brokers and Summit run 24/7 after-hours lines) but not target hours.

| Tier | Test | Examples | Target response **[U]** |
|---|---|---|---|
| Emergency | Immediate risk to people or the property, or loss of an essential service | Burst pipe or flooding; sewage overflow; gas leak; dangerous electrical fault; no water; storm or fire damage; property cannot be secured after a break-in; only toilet blocked | Acknowledge within 1 hour; tradie on site same day, 24/7 |
| Urgent | Essential amenity lost, no immediate danger | No hot water; heating failure in winter; oven or cooktop out; roof leak that is contained; fridge supplied by landlord has failed; faulty smoke alarm; broken exterior lock or window that is still secure | Acknowledge same business day; fix within 24-72 hours |
| Routine | Inconvenient, not essential | Dripping tap; running toilet; sticking door; cupboard hinge; noisy extractor fan; one dead power point; minor gutter overflow | Acknowledge within 1-2 business days; fix within 7-14 days |
| Planned / cosmetic | No functional loss | Paint touch-ups; worn carpet; garden upgrades | Review at next inspection; budget cycle |

Owner approval convention: managers typically act without approval under a set dollar limit and seek approval above it (Opes gives $100 as an example of a check-in threshold).

### 3c. Trade rates and common job costs (2025-26)

No authoritative NZ rate survey was retrievable. The best published real-world price list found is Water & Gas Worx (Auckland). The QuickTrade ranges are from a low-authority aggregator that cites no sources. Nelson rates are likely somewhat lower than Auckland for labour **[U]**.

| Trade | Call-out | Hourly | Source |
|---|---|---|---|
| Plumber (published price list) | None; first hour $155 + GST covers travel. After-hours and weekends first hour $295 + GST; public holidays $395 + GST | $100 + GST per additional hour, billed in 15-minute blocks | [Water & Gas Worx, Jun 2026](https://wgw.co.nz/pricing/) |
| Plumber (general range) | $80-$120 weekday; $150-$250 after-hours; $200-$350+ overnight emergency | $90-$150 (about $120 typical) **[U]** | [QuickTrade, Apr 2025](https://quicktrade-pi.vercel.app/blog/how-much-does-a-plumber-cost-in-nz) |
| Gasfitter | As plumber; gas certificate $55-$95 + GST | As plumber | Water & Gas Worx |
| Electrician | $80-$150 standard; $150-$300 after-hours or weekend; $200-$400 emergency same-day | $90-$160; first hour $100-$180 **[U]** | [QuickTrade, Apr 2025](https://quicktrade-pi.vercel.app/blog/electrician-call-out-fee-nz) |
| Drainlayer / drain unblocking | Labour as plumber, plus equipment: flexshaft $65, drain snake $245, hydrojet $295 (all + GST) | $100-$160 **[U]** | Water & Gas Worx |
| Handyman | Often a one-hour minimum **[U]** | $55-$90 **[U]** | None retrieved |
| Locksmith | $90-$150 daytime; $180-$350 after-hours lockout **[U]** | $90-$130 **[U]** | None retrieved |
| Glazier | $120-$200 minimum charge **[U]** | $90-$130 **[U]** | None retrieved |
| Heat pump technician | Per-unit service price rather than call-out **[U]** | $100-$140 **[U]** | None retrieved |

| Common job | Typical cost | Source |
|---|---|---|
| Replace tap washer | $120-$250 (in practice the plumber's minimum first hour) | **[D]** from Water & Gas Worx first hour; QuickTrade tap repair $100-$250 |
| Replace basin or kitchen mixer, supplied and fitted | $315-$509 + GST basin; $329-$493 + GST kitchen | [Water & Gas Worx, Jul 2026](https://wgw.co.nz/small-jobs/) |
| Unblock drain | $150-$350 simple; $250-$520 incl. GST with machine **[D]** | QuickTrade; Water & Gas Worx |
| Toilet repair or replacement | $150-$400 **[U]** | QuickTrade |
| Burst pipe repair | $250-$600+ **[U]** | QuickTrade |
| Replace hot water element or thermostat | $200-$400 **[U]** | None retrieved |
| Replace hot water cylinder | $2,499 (135L low pressure) to $4,399 (180L outdoor mains) incl. GST | Water & Gas Worx |
| Low-pressure to mains-pressure conversion | From $3,799 incl. GST | Water & Gas Worx |
| Leak detection | $220 + GST per hour | Water & Gas Worx |
| Switchboard upgrade | $1,500-$4,000 excl. GST | [checkmybuilder](https://checkmybuilder.co.nz/cost/electrical-rewire) |
| Rekey house locks | $150-$300 **[U]** | None retrieved |
| Replace a standard window pane | $200-$500; more for safety glass **[U]** | None retrieved |
| Heat pump service / deep clean | $100-$200 per hi-wall unit **[U]** | None retrieved |
| Lawn mow, medium section (100-300 m2) | $60-$120 **[U]** | [QuickTrade, Apr 2025](https://quicktrade-pi.vercel.app/blog/lawn-mowing-service-nz) |

### 3d. Tenant-liable damage vs fair wear and tear

Rules ([Tenancy Services: damage and repairs](https://www.tenancy.govt.nz/maintenance-and-inspections/damage-and-repairs/)):
- Fair wear and tear is gradual deterioration from normal use. The tenant is not liable for it, nor for burglary or natural events.
- **Careless damage:** tenant liable up to the lower of four weeks' rent or the landlord's insurance excess. The landlord cannot ask for more, and insurers cannot pursue the tenant.
- **Intentional damage:** tenant fully liable. Meth contamination caused by the tenant or guests can be treated as intentional.
- **Accidental damage (neither careless nor intentional):** tenant not liable.
- **Pet damage from 1 December 2025:** tenants are fully liable for pet damage beyond fair wear and tear ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/damage-and-repairs/pet-related-damage/)).
- Burden of proof: the landlord shows it is more than fair wear and tear; the tenant then shows it was not intentional, or was neither careless nor intentional.
- Tenants must report damage straight away; a delay that makes things worse can make the tenant liable for the extra cost.

| Usually fair wear and tear (landlord pays) | Usually tenant-liable | Source |
|---|---|---|
| Worn flooring and carpet in traffic areas | Burn marks or drink stains on carpet | Tenancy Services |
| Taps and washers wearing out or leaking | Drawing on wallpaper | Tenancy Services |
| Stove element failing from normal cooking | Damage from using the stove to heat the kitchen | Tenancy Services |
| | Leaving a stove on unattended and causing damage (careless) | [Initio](https://initio.co.nz/faqs/can-i-hold-my-tenant-responsible-for-damage/) |
| A genuine accident, e.g. tripping and putting a knee through a wall; a knocked-over iron melting carpet ($772, Tribunal 2020, ruled accidental) | | Initio (above) |
| | Scratched floors, chewed fittings, stained carpet, flea infestations from pets | Tenancy Services pet page |
| | Lost keys or remotes | Tenancy Services locks page |
| | Drain blockages from grease or foreign objects | Summit troubleshooting page |
| Faded paint and curtains; minor scuffs; furniture indentations in carpet **[U]** | Holes in walls; broken windows; damage from Blu-Tack or tape; pot-plant water stains and carpet rot **[U]; Summit's tenant guide warns about the last two** | Convention; case by case at the Tribunal |

In Q3 2026, 31.6% of landlord Tribunal applications included a compensation or damages claim ([Tenancy Services statistics](https://www.tenancy.govt.nz/assets/Uploads/Tenancy/Data-and-statistics/dispute-resolution-statistics-2026-quarter-3.pdf)).

---

## 4. Inspection best practice

### 4.1 Frequency: law vs insurer vs practice

| Layer | Requirement | Source |
|---|---|---|
| Law (maximum) | No more than once every 4 weeks; 48 hours' written notice, given no more than 14 days ahead; between 8am and 7pm. Re-inspection of agreed fixes follows the same notice rules. There is no legal minimum frequency | [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/inspections/) |
| Insurer (Initio landlord cover) | Inspect inside and outside at least every 3 months and at every change of tenant; keep photos and a written record; an agent must be physically present (remote inspections only in rare cases). Missing inspections does not void the policy but affects tenancy-related claims (tenant damage, meth, loss of rent) | [Initio inspections FAQ](https://initio.co.nz/faqs/how-often-do-i-need-to-do-property-inspections/), [Initio landlord obligations](https://initio.co.nz/faqs/landlord-obligations/) |
| Other insurers | Three-monthly is the commonly quoted condition; AA Insurance's product page does not state a frequency, so check each policy wording **[U]** | [AA Insurance](https://www.aainsurance.co.nz/home-insurance/landlord-insurance) |
| Property-manager practice | Summit: every 13 weeks, about 15 minutes, video reports. Property Brokers: every 13-16 weeks | [Summit services](https://summit.co.nz/property-management/shift-to-summit/our-services), [Property Brokers packages](https://www.propertybrokers.co.nz/manage/our-packages) |

Product default: quarterly (13 weeks), first inspection about 6 weeks into a new tenancy **[U]**, plus entry and exit inspections.

### 4.2 Room-by-room checklist

Base structure is the official [Tenancy Services Property Inspection Report](https://www.tenancy.govt.nz/assets/forms-templates/property-inspection-report-fillable.pdf) (form MB_TEN0004_10/25). Extra items are standard manager practice **[U]** and Healthy Homes checks.

| Area | Items in the Tenancy Services template | Added routine-inspection and Healthy Homes spot checks |
|---|---|---|
| Lounge | Walls/doors; lights/power points; floors/coverings; windows; blinds/curtains; heater | Heat pump runs on Heat and filters are clean; window latches and stays work; blind cords are safe for children; draughts; ceiling stains |
| Kitchen / dining | Walls/doors; lights/power points; floors; windows; blinds/curtains; cupboards; sinks/benches; oven; refrigerator; ventilation system | Rangehood runs and vents outside; under-sink leaks; tap drips; oven and cooktop elements; benchtop damage; pests |
| Bathroom | Walls/doors; lights/power points; floors; windows; blinds/curtains; mirror/cabinet; bath; shower; wash basin; toilet; ventilation system | Extractor fan runs and vents outside; sealant and grout; mould on ceiling; cistern running; soft flooring near shower; water pressure and temperature |
| Laundry | Walls/doors; lights/power points; floors; windows; blinds/curtains; washing machine; wash tub | Tap and hose leaks; dryer vented outside; tub drains freely |
| Bedrooms 1-4 | Walls/doors; lights/power points; floors; windows; blinds/curtains | Smoke alarm in the room or within 3 m of the door: test button and expiry date; mould behind furniture and in wardrobes; window condensation damage |
| General | Rubbish bins; locks; garage/carport; grounds; number of keys supplied; insulation; gutters and downpipes; ground moisture barrier | Hot water cylinder (leaks, seismic restraint, valve drip); switchboard condition; signs of extra occupants, pets or smoking against the agreement |
| Exterior / grounds | (covered by "grounds", "gutters and downpipes") | Roof and flashings from the ground; cladding and paint; spouting blocked or overflowing; paths, steps and decks safe; fences and gates; lawns and gardens kept; trees near lines; outdoor heat pump unit clear; drains clear; subfloor vents clear |
| Smoke alarm compliance block | One working alarm in each bedroom or within 3 m of each bedroom door; one per level; one in any sleep-out or caravan; none expired; new alarms photoelectric with at least 8-year battery or hard-wired; installed per manufacturer's instructions; all working at start of tenancy | Landlord penalty up to $7,200 for non-compliance |
| Also on the template | List of furniture and chattels; water meter reading at start; signatures and dates of landlord and tenant; rent and bond receipt | |

Healthy Homes numbers for spot checks ([ventilation standard](https://www.tenancy.govt.nz/healthy-homes/ventilation-standard/)): openable windows or doors totalling at least 5% of floor area in each habitable room and able to be fixed open; kitchen fans installed after 1 July 2019 at least 150mm or 50 L/s; bathroom fans at least 120mm or 25 L/s; all fans vent outside; recirculating systems do not count. A fixed heater of adequate capacity must heat the main living room ([heating and ventilation](https://www.tenancy.govt.nz/maintenance-and-inspections/heating-and-ventilation/)). Gutters, downpipes and drains must work, and enclosed subfloors need a ground moisture barrier where practicable ([mould and dampness](https://www.tenancy.govt.nz/maintenance-and-inspections/mould-and-dampness/)).

### 4.3 Condition rating

- Official template: for each item the landlord and the tenant each tick "condition acceptable?", with a free-text damage/defects column.
- Common manager practice **[U]**: three ticks per item (clean / undamaged / working) plus comments, or a scale (new, good, fair, poor) for comparing entry and exit.

### 4.4 What a good entry / exit condition report includes

- Every room and item above, with both parties' assessment and specific defect notes (location, size, type).
- Chattels list; number and type of keys, remotes and access cards; water meter reading; smoke alarm checklist; insulation, gutters and moisture-barrier status.
- Date-stamped photos, both parties' signatures and dates, and a copy for each party ([Tenancy Services: initial inspection](https://www.tenancy.govt.nz/starting-a-tenancy/new-to-tenancy/initial-property-inspection/)).
- A window for the tenant to add missed items: Summit gives tenants 24 hours to report anything missed on the entry report (Summit Renting Guide 2025, [PDF](https://summit.co.nz/assets/downloads-and-resources/the-renting-guide-2025-update-%281%29.pdf)).
- At exit: compare against the entry report item by item. A tenant cannot be blamed for damage recorded at the start. Tell the other party about new damage quickly, with photos.

### 4.5 Photo standards **[U except where linked]**

- One wide shot per wall or room corner, then close-ups of every existing defect with something for scale.
- Always capture: inside oven and rangehood filters, shower and bath sealant, under sinks, carpets in doorways, window sills, heat pump filters, smoke alarms (showing expiry date), keys laid out, water meter, exterior elevations, gutters, lawns.
- Timestamped and stored against the property and inspection; keep at least until 12 months after the tenancy ends.
- Avoid photographing tenants' belongings where possible (this one is Tenancy Services guidance). Summit asks tenants to put personal items away because video and photos go to the owner.

### 4.6 Tenant-communication tips ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/inspections/))

- Give proper notice, pick a reasonable day and time, and ask whether the tenant wants to attend.
- If they will be out, invite them to leave a note of anything they want looked at.
- Bring the entry report and a camera; use the report to discuss repairs.
- Treat the first inspection as the one that sets expectations. Show the tenant how to clean the heat pump filters then.
- Invite feedback; follow up with a short written summary and dates for any repairs **[U]**.
- A landlord cannot end a tenancy because the tenant asked for repairs (retaliatory notice is unlawful) ([Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/regular-maintenance/maintaining-the-property/)).

### 4.7 Inspection prices

| Service | Price | Source |
|---|---|---|
| Routine inspection by a property manager | $35-$100; commonly $50-$55 + GST | Opes; Trade Me guide; Property Brokers ($55 + GST) |
| Entry or exit condition report by a third-party inspection company | $150-$300 **[U]** | None retrieved |
| Healthy Homes assessment | About $150 + GST | Trade Me guide; Property Brokers FAQ |

---

## 5. Arrears and tenant relationships

### 5.1 Legal and insurer anchors

| Trigger | What it allows or requires | Source |
|---|---|---|
| Any missed payment | Contact the tenant, check they know, agree how they will catch up; record any agreement in writing; point them to Work and Income (Accommodation Supplement is available to non-beneficiaries) | [Tenancy Services: overdue rent](https://www.tenancy.govt.nz/rent-bond-and-bills/rent/overdue-rent/) |
| No agreement, less than 21 days owed | Serve a 14-day notice to remedy (template on the same page) | Tenancy Services |
| Rent unpaid for 5 working days | Serve a "Notice of overdue rent" stating amount, dates, the tenant's right to challenge, and how many such notices have been given in the 90-day period | Tenancy Services; [rent arrears fact sheet](https://www.tenancy.govt.nz/assets/Uploads/Tenancy/rent-arrears-guidance.pdf) |
| Three such notices within 90 days (periodic tenancy) | Apply to the Tribunal for termination within 28 days of the third notice | Tenancy Services |
| 21 days in arrears | Apply to the Tribunal for termination under section 55 | Tenancy Services |
| Insurer (Initio) | Check rent weekly; at 14 days send written notice and visit in person to confirm the tenant is still there; at 21 days apply to the Tribunal for possession. Also collect at least 3 weeks' rent as bond and advance, and vet every adult tenant (ID and references) | [Initio landlord obligations](https://initio.co.nz/faqs/landlord-obligations/) |
| Insurer loss-of-rent cover | Up to 6 weeks after eviction or abandonment; overdue rent before eviction is excluded | [Initio](https://initio.co.nz/faqs/loss-of-rent-faqs-for-landlord-insurance/) |
| Tribunal | $29 application; options are mediation, FastTrack Resolution (formalises an agreement already reached) or a hearing | [Tenancy Services](https://www.tenancy.govt.nz/disputes/tribunal/making-an-application/) |

Scale: 7,979 Tribunal applications in July-September 2026; 82.9% from landlords; rent arrears featured in 57.4% of all applications and 69.2% of landlord applications ([Tenancy Services, Q3 2026](https://www.tenancy.govt.nz/assets/Uploads/Tenancy/Data-and-statistics/dispute-resolution-statistics-2026-quarter-3.pdf)).

### 5.2 What experienced managers do, day by day

The day-by-day cadence is a synthesis **[U]** built on the anchors above. Published manager statements: Barfoot monitors rent by computer and starts debt recovery immediately; Summit runs a zero-tolerance policy and applies to the Tribunal, while asking tenants in genuine difficulty to make contact early; Opes says first contact is by phone or email.

| Day after rent was due | Action | Tone and wording |
|---|---|---|
| 0 | Reconcile rent daily (weekly at minimum for insurance) | |
| 1 | Text and phone the same day. Assume an error first (failed automatic payment, wrong reference). Log the contact | "Hi Mere, your rent of $560 due yesterday hasn't arrived. Could you check your automatic payment and let me know today? If something has come up, call me and we'll sort out a plan." |
| 3 | Second call, then an email summarising the amount and dates. Offer a written catch-up plan (an extra amount on top of normal rent). Mention Work and Income support | Factual and calm: state the amount, the date it was due, one clear request, and one offer of help |
| 5-7 | No payment or plan: serve the 14-day notice to remedy. Once 5 working days have passed, also serve the Notice of overdue rent (strike 1) | "This is the standard legal step and it stops as soon as the arrears are cleared or we agree a plan in writing." |
| 7 | Phone to confirm the notices arrived. If a plan is agreed, put it in writing; consider FastTrack Resolution so it becomes enforceable | Keep the relationship separate from the process: "I'd rather fix this with you than at the Tribunal." |
| 14 | Written notice plus a visit in person to confirm the tenant still lives there (insurer requirement). If the 14-day notice has expired unremedied, file the Tribunal application ($29) | Still courteous; state exactly what has been filed and what would stop it |
| 21 | File for termination and possession if not already done (insurer requires it at 21 days). Keep the rent ledger current and keep talking | No threats, no lock changes, no removing belongings: only the Tribunal can end the tenancy |

Rules of tone: never accuse; always give the figure and the date; always offer a route to fix it; always say what happens next and when; keep every contact in writing afterwards.

### 5.3 Arrears rates and evidence

- **Typical arrears rates:** no published NZ benchmark was retrieved **[U]**. Demo assumption: 2-4% of tenancies more than 3 days late at any time and under 1% more than 14 days late.
- **Does early personal contact reduce arrears?** No NZ quantitative study was retrieved **[U]**. The supportable claim is that Tenancy Services' first recommended step is direct contact, and an insurer makes weekly monitoring and a personal visit conditions of cover. Present it as recommended practice, not as a statistic.

### 5.4 Retention and the cost of turnover

- Barfoot's four retention levers: keep up maintenance, plan upgrades, respond promptly, build goodwill ([Barfoot](https://www.barfoot.co.nz/landlords/help-and-tips/keep-tenants-happy)). Delayed repairs are named as a cause of turnover ([Barfoot](https://www.barfoot.co.nz/landlords/ask-kiri/maintenance-mistakes)).
- Turnover cost at $590/week: about $1,560-$2,850 self-managed (section 1.6) **[D]**.
- Typical tenancy: median 25 months, so a landlord faces a re-let roughly every two years.
- Tenants give 21 days' notice on a periodic tenancy; Summit recommends advertising at least four weeks before a property is available ([Summit FAQ](https://summit.co.nz/property-management/resources/frequently-asked-questions)).

### 5.5 Rent increase vs vacancy

Rules: rent can rise only once every 12 months, with at least 60 days' written notice; there is no cap, but a tenant can challenge rent well above market at the Tribunal ([Tenancy Services](https://www.tenancy.govt.nz/rent-bond-and-bills/rent/increasing-rent/)).

Arithmetic **[D]** at $590/week: one vacant week costs 1.9% of annual rent. A $20/week increase earns $1,040 a year. If it triggers a move-out costing 2.5 weeks of vacancy plus about $300 of re-let costs ($1,775), it takes about 1.7 years to break even. Market context: national asking rents were flat year on year in September 2026 and Nelson/Tasman was up 0.9% in August, so the market supports only small increases. Product guidance: compare against the Tenancy Services median and upper quartile for the suburb and bedroom count, and show the break-even weeks of vacancy next to any proposed increase.

---

## 6. Key management

### 6.1 KeyNest in New Zealand

| Item | Detail | Source |
|---|---|---|
| How it works | Drop keys at a KeyNest Point (a shop, cafe or hotel, often open long hours). The collector gets a 6-digit code; staff hand over the key; the owner gets live notifications and a movement log in the app | [KeyNest NZ](https://keynest.com/nz/airbnb-key-exchange) |
| Security | Keys stored with an NFC fob and no address; time-restricted codes; staff cannot see the property location; automated lockers have cameras | KeyNest |
| Pay as you go | NZ$12.99 per key collection; first day of storage included, then 99c a day | KeyNest NZ |
| Monthly plan | NZ$49.99 per key per month, unlimited movements, free storage | KeyNest NZ |
| Yearly plan | NZ$39.99 per key per month, billed annually | KeyNest NZ |
| Own locker hardware | From NZ$2,399 | [KeyNest NZ home](https://keynest.com/nz/home) |
| Coverage | 7,000+ points worldwide. NZ point count and whether Nelson has one were **not confirmed [U]**; check the map before implying local coverage | KeyNest |

### 6.2 Lockboxes and smart locks sold in NZ

| Product | Type | NZ price | Source / status |
|---|---|---|---|
| Yale Assure Keyed Digital Deadbolt (YRD226) | Keypad deadbolt with key override, Bluetooth, app | $459.99 incl. tax | [Yale NZ store](https://www.shopyalehome.co.nz/yale-assure) (listed as currently unavailable) |
| Yale Assure SL (YRD256) | Key-free keypad deadbolt | $419.99 | Yale NZ store (currently unavailable) |
| Yale YDM3109A / YDM7220 | Digital mortice locks: PIN, card, key, app | $729.99 / $789.99 | [Yale NZ store](https://www.shopyalehome.co.nz/digital-locks) |
| Yale Unity Slim | Wi-Fi smart lock with door-position sensing | $999-$1,098 | Yale NZ store |
| Schlage (NZ range) | Encode Smart Wi-Fi Deadbolt, Artus, Ascent, Encore, Resolute mortice | No prices on the NZ site; about $450-$700 **[U]** | [Schlage NZ](https://www.schlage.co.nz/) |
| igloohome Smart Keybox 3 | Bluetooth lockbox with offline time-limited PINs and access log | About $300-$400 **[U]** | Not retrieved |
| igloohome deadbolt / padlock | Offline PIN smart locks | About $350-$600 **[U]** | Not retrieved |
| Mechanical push-button or dial lockbox | Wall-mounted key safe | About $40-$100 **[U]** | Not retrieved |

### 6.3 Key custody rules and log practice

Rules ([Tenancy Services: locks and security](https://www.tenancy.govt.nz/maintenance-and-inspections/locks-and-security/)): the landlord must provide and maintain locks; neither party may change locks without the other's consent; tenants return all keys, remotes and cards at the end; unreturned keys can be charged to the tenant.

Summit's practice (Renting Guide 2025): keys are released only to tenants named on the agreement, with photo ID; an after-hours lockout is at the tenant's expense via a locksmith; keys are due back at checkout or by 9am the next working day, otherwise locks may be changed at the tenant's cost.

Best practice for a custody log **[U]**:
- Tag keys with a code, never the address. Keep the code-to-address map inside the app only.
- Record every key set at entry (the official inspection report has a "number of keys supplied" line): type, count, photo.
- Every movement is a log entry: who (name, company, ID checked), which set, purpose, time out, due back, time returned, who received it.
- Contractors: time-boxed access, one job per code, change the lockbox code after each job.
- Overdue keys trigger a reminder, then an escalation; rekey if a set is not recovered.
- Reconcile the full key count at every inspection and at exit, before the bond refund is agreed.

---

## 7. Seasonal home-care nudges

| When (NZ seasons) | Nudge | Who | Source |
|---|---|---|---|
| All year, monthly | Press the test button on each smoke alarm; never remove or cover one; report a chirping or expired alarm | Tenant tests and reports; landlord replaces | [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/smoke-alarms/); monthly cadence is Fire and Emergency NZ's standing advice **[U: page not retrievable]** |
| All year | Clean heat pump filters: every couple of weeks in heavy use (EECA) or about monthly (Summit); vacuum or rinse and dry; keep the outdoor unit clear of leaves | Tenant (accessible filters); landlord for servicing | [EECA](https://www.eeca.govt.nz/for-homes/energy-saving-technology/heating-and-cooling/heat-and-cool-efficiently-at-home/), [Summit](https://summit.co.nz/about/about-summit/latest-news/how-to-maintain-your-heat-pump), [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/heating-and-ventilation/) |
| All year | Mow lawns and weed gardens; remove clippings | Tenant, unless the agreement says otherwise | [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/regular-maintenance/lawns-and-gardens/) |
| All year | Tree, shrub and hedge pruning; tenants need written consent before pruning | Landlord | Tenancy Services (above) |
| Autumn (Mar-May) | Clear gutters, downpipes and drains before the wet season; check roof and flashings; wash the house | Landlord | [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/regular-maintenance/maintaining-the-property/), [Barfoot winter tips](https://www.barfoot.co.nz/landlords/help-and-tips/winter-maintenance) |
| Autumn | Remove any mould before winter; check wardrobes, cupboards and behind curtains; confirm extractor fans work | Tenant cleans and reports; landlord fixes fans | Barfoot; Tenancy Services |
| Autumn | Chimney swept and checked at least yearly if there is a usable fireplace (often an insurance condition) | Landlord arranges; tenant clears ash | Tenancy Services; Barfoot |
| Autumn | Replace ventilation-system filters at least every 12 months; prune trees that shade the house | Landlord | Barfoot |
| Winter (Jun-Aug) | Heat living areas to at least 18C and no more than about 20-21C; use the timer rather than running all day | Tenant | EECA; Summit |
| Winter | Open windows and doors for a while every day, even when cold; open curtains in the day | Tenant | [Tenancy Services](https://www.tenancy.govt.nz/maintenance-and-inspections/mould-and-dampness/) |
| Winter | Use extractor fans and keep lids on pots; close the bathroom door while showering; wipe condensation from windows and walls | Tenant | Tenancy Services |
| Winter | Dry washing outside or in a vented dryer; avoid unflued gas heaters; keep furniture slightly off walls; leave wardrobes ajar | Tenant | Tenancy Services |
| Winter | Clean mould as soon as it appears: white vinegar (half and half with water on paint) or 1 part bleach to 3 parts water; gloves, eye protection and mask | Tenant; tell the landlord if it keeps coming back | Tenancy Services |
| Spring (Sep-Nov) | Clean gutters again and check the roof after winter storms; clear vents; check sealant around doors and windows; look in the roof space and subfloor for leaks, wet insulation or pests | Landlord | [Barfoot spring checklist](https://www.barfoot.co.nz/landlords/help-and-tips/spring-maintenance-checklist) |
| Spring-summer | Lawns grow fastest: mow every 1-2 weeks (every 2-3 in autumn, every 4-6 in winter) **[U]** | Tenant | [QuickTrade](https://quicktrade-pi.vercel.app/blog/lawn-mowing-service-nz) |
| Summer (Dec-Feb) | Cooling: set 24C or higher by day; avoid Auto mode; try fan-only with windows open; use dehumidify mode on muggy days | Tenant | EECA |
| Summer | Fit or use security latches so windows can stay open safely; keep rubbish collected to avoid pests | Tenant; landlord supplies latches | EECA; Summit Renting Guide |
| Summer | Check for council water restrictions before watering gardens **[U]** | Tenant | None retrieved |

Other responsibility facts useful for nudges (Tenancy Services): window cleaning is the tenant's job where windows are accessible; light bulbs are not covered by the Act, so the agreement should say who replaces them (commonly the landlord supplies working bulbs and the tenant replaces them); landlords maintain heaters and ventilation systems including technical cleaning.

---

## 8. Not retrieved or still to verify

| Item | Status |
|---|---|
| Mean (not median) weekly rents for NZ, Nelson and Tasman | Not retrieved |
| QV and Cotality Nelson/Tasman figures for October 2026; Cotality gross yields by centre | Not in retrievable page text; older QV figures used |
| Nelson central suburb sale and rent medians on realestate.co.nz | Page 404 |
| Nelson-specific property-manager fees | Not published by Summit |
| Roof repaint, vinyl, oven, rangehood, dishwasher, extractor fan, smoke alarm, gutter, curtain and garage-opener prices | [U] estimates; need retailer or trade quotes |
| Locksmith, glazier, handyman and heat-pump-service rates | [U]; no source retrieved |
| builderscrack cost estimators | Interactive only; not extracted |
| BRANZ maintenance schedule and durability tables | 403; only search summaries |
| Refresh Renovations bathroom, kitchen and roofing guides | Not fetched |
| NZ arrears-rate benchmark and evidence on early contact | Not found |
| Entry/exit report pricing from inspection companies | Not found |
| igloohome and Schlage NZ prices; KeyNest points in Nelson | Not found |
| Fire and Emergency NZ smoke alarm page | Returned empty; monthly-test advice is from memory |
| GST treatment of Trade Me listing fees | Not stated on the fee page |
