# NZ research: rental tax, Privacy Act, payments and bonds

Prepared 14 November 2026 for Loop & Pool (NZ launch). Scope: (1) residential rental income tax, (2) Privacy Act 2020 for landlords, (3) payments, bonds and money handling.

## How to read this document

**Confidence labels**

| Label | Meaning |
|---|---|
| primary-verified | I read the rule on the primary source itself (IRD, OPC, legislation.govt.nz, tenancy.govt.nz, HUD, Payments NZ, or the vendor's own site for vendor facts) during this research. |
| secondary-verified | Read on a secondary source (law/accounting firm, news), or seen only in a search-result summary of a primary page that I did not open. Stated which in Notes. |
| unverified | Not confirmed from any source read today. Treat as a prompt to check, not as a rule. |

**Limits of this research (read before relying on it)**

- The session's web-search allowance ran out part-way through. After that I could only open URLs I already knew, so a few items could not be chased to a primary page. They are flagged individually and collected in section 6.
- mbie.govt.nz refused automated access (bot protection), so the MBIE open-banking register and MBIE's Customer and Product Data pages were **not read**. Open-banking designation dates below rest on a law-firm summary plus Payments NZ and vendor pages.
- A general election was held on 7 November 2026. Search summaries of news coverage say the result was too close to call on the night, with official results due 27 November 2026 and government formation after that. Tax and tenancy policy may change once a government is formed. Nothing here reflects post-election policy.
- This is product research, not tax or legal advice. Section 3.4 (holding money) in particular needs a NZ lawyer before launch.

---

## 1. Residential rental income tax

### 1.1 The form: yes, it is still the IR3R

The rental schedule is **"Rental income – IR3R"**, current edition **March 2026**. One IR3R per property, covering the year to balance date. Co-owners enter only their own share. It can be completed in myIR, where the amounts pre-populate the income section of the return.

Source (form read in full): https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir1---ir99/ir3r/ir3r-2026.pdf
Source (how to file): https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/pay-tax-on-your-rental-income (updated 1 Apr 2026)

**IR3R line items, exactly as printed**

| Box | Label on form | Form note |
|---|---|---|
| (header) | Year ended 31 March; Your name; IRD number; Address of property rented; Period the property was available for renting (months) | Ongoing costs are claimed in proportion to months available (e.g. 10/12). |
| 1 | Total rents | Total rents received. |
| 2A / 2 | Other income (specify) | "such as insurance receipts or rates refunds". 2A is the description, 2 the amount. |
| 3 | Gain or loss on disposal (enter any loss in brackets) | Disposal of depreciated assets. |
| 4 | **Total income** | Boxes 1 + 2 + 3. |
| 5 | Rates | |
| 6 | Insurance | |
| 7 | Interest | |
| 8 | Agent's collection fees | |
| 9 | Repairs and maintenance | Itemised lines; must be "fully explained". Not additions or improvements. |
| 10 | Other (specify) | Itemised lines. |
| 11 | Depreciation – Buildings | 0% for buildings with economic life over 50 years. |
| 12 | Depreciation – Assets | Individual or pooled. |
| 13 | (depreciation subtotal) | |
| 14 | **Total expenses** | |
| 15 | **Net rents** (total rents less expenses) | Copy to the return only if the property is NOT residential. For residential property, use the IR1226 worksheets. |
| 16–25 | Depreciation of buildings detail | Date purchased; construction materials and description; cost excluding land; rate; depreciation claimed; closing adjusted tax value (SL and DV rows). |
| 26 | Depreciation of assets schedule | Asset; date purchased; cost; opening adjusted tax value; rate; method SL/DV; depreciation claimed; closing adjusted tax value. |

**Fields the income tax return itself asks for on residential property** (IR264, March 2026, Parts 3 and 5):

- Gross residential rental income
- Net bright-line profit (excluding losses)
- Other residential income (depreciation recovered, foreign-currency loan income, revenue-account land sales)
- Total combined residential income
- Residential rental deductions, and excess deductions brought forward
- Excess residential rental deductions carried forward (pre-populates next year in myIR)
- Total interest on residential property, Interest expense claimed, and the reason for claiming

Source: https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir200---ir299/ir264/ir264.pdf (IR264 "Rental income", March 2026, read in full for Parts 1–3 and relevant parts of 4–5)

**Which return each owner type files**

| Owner | Return | Source | Confidence |
|---|---|---|---|
| Individual (incl. joint owners, each for own share) | IR3 with IR3R attached | IRD pay-tax page above; IR264 | primary-verified |
| Non-resident individual | IR3NR | IRD pay-tax page | primary-verified |
| Partnership and look-through company | IR7 | IRD pay-tax page | primary-verified |
| Trust or estate | IR6 | IRD pay-tax page | primary-verified |
| Ordinary company | IR4 | not on the pages read | unverified |

Note: the IR1226 worksheet PDFs linked from IRD are dated 2023 and 2020. I did not find a newer edition; the March 2026 IR3R still points to IR1226.

### 1.2 Deductible, non-deductible and capital expenses

Sources: IRD "Rental property expenses" https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/rental-expense-deductions (updated 21 Aug 2026); IR264 March 2026 (URL above); QB 20/01 https://www.taxtechnical.ird.govt.nz/-/media/project/ir/tt/pdfs/questions-we-ve-been-asked/2020/qb-20-01.pdf. All primary-verified unless noted.

| Item | Treatment | Notes |
|---|---|---|
| Rates | Deductible | |
| Insurance on the rental | Deductible | |
| Mortgage repayment insurance | Deductible only if the lender required it to obtain the loan | IR264 |
| Mortgage interest | Deductible, 100% from 1 April 2025 | Only the part borrowed for the rental. See 1.3. |
| Agent fees to collect rent, maintain the property, or find tenants | Deductible | Includes letting commission. |
| Accountant fees (accounts, returns, advice) | Deductible | Set-up costs such as investigating the viability of the rental are not deductible (IR264). |
| Repairs and maintenance | Deductible | Examples: broken window, hole in Gib, repainting, replacing a shower head, blown hot-water element. |
| Owner's own time on repairs | Not deductible | Materials only. |
| Mortgage arrangement fees | Deductible | |
| Fees for drawing up a tenancy agreement | Deductible | |
| Valuation required for a mortgage | Deductible | Valuation for insurance purposes is not. |
| Legal costs to recover unpaid rent; costs of evicting a tenant | Deductible | |
| Legal fees on buying the rental | Deductible if total legal fees for the income year are $10,000 or less | IRD page says "$10,000 or less"; IR264 says total legal fees for the year. |
| Legal fees on selling | Not deductible, unless in the business of providing rental accommodation and total legal fees for the year are $10,000 or less | |
| Real estate agent fees on buying or selling | Not deductible (capital) | |
| Travel to inspect or do repairs | Deductible | Mixed private/rental trips are apportioned; a holiday with a drop-in visit gets nothing. |
| Motor vehicle | Deductible via IRD kilometre rates with a logbook, or actual-cost percentage with a logbook (3-month test period every 3 years allowed) | With no records: the lesser of actual rental proportion and 25% of costs. |
| Body corporate levies, general purposes (maintenance, admin, painting, insurance) | Deductible | |
| Body corporate levies for capital improvements | Not deductible (capital) | If a levy covers both, the repair part must be reasonably determinable. |
| Depreciation on chattels and fittings | Deductible | See 1.3. |
| Depreciation on land or buildings | Not deductible (0%) | |
| Purchase price of the property | Capital | |
| Principal part of mortgage repayments | Not deductible | |
| Interest on borrowing for another purpose, even if secured over the rental | Not deductible | |
| Additions and improvements | Capital | Examples: adding a room, installing a heat pump where none existed, double glazing, replacing a wall with a conservatory, renovating a run-down purchase before first letting. |
| Repair or replacement that improves the property and increases value | Capital | |
| Private expenses | Not deductible | |

**Healthy Homes upgrade costs (QB 20/01)**

| Cost | Treatment |
|---|---|
| Repairing items that would otherwise meet the standard | Deductible |
| Minor additions that do not change the building's character: some draught-stopping (e.g. blocking unused chimneys if attached), making mechanical ventilation compliant, some ground-moisture-barrier costs | Deductible |
| Like-for-like replacement of items previously treated as part of the building | Deductible |
| Record-keeping and tenancy-agreement statements | Deductible |
| Items that become part of the building: smoke alarms, insulation, ducted or multi-unit heat pumps, flued fires, new openable windows, new exterior doors, most extractor fans and rangehoods, ground moisture barriers, drainage systems | Capital, added to building cost, depreciated at the building rate (generally 0%) |
| Electric panel heaters | Depreciable chattel, 67% DV or SL |
| Single-split heat pumps | Depreciable chattel, 20% DV or 13.5% SL |
| Through-window extractor fans, window stays, door stops, external door draught excluders, unattached chimney blockers | Depreciable chattel, 40% DV or 30% SL |
| Any of the depreciable items within the low-value threshold | 100% depreciation in the year incurred |

### 1.3 Key rules and numbers

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Tax year | 1 April to 31 March | https://www.ird.govt.nz/income-tax/income-tax-for-individuals/what-happens-at-the-end-of-the-tax-year | primary-verified | |
| IR3 due date | 7 July, unless tax agent or extension of time | https://www.ird.govt.nz/income-tax/income-tax-for-individuals/what-happens-at-the-end-of-the-tax-year/timelines-at-the-end-of-the-tax-year (updated 15 Oct 2025) | primary-verified | |
| IR3 due date with a tax agent | 31 March of the following year | none read | unverified | The IRD page read confirms an extension exists but gives no date. |
| Terminal tax due | 7 February of the following year; 7 April with a tax agent's extension of time | IR264 March 2026 | primary-verified | |
| Interest deductibility, 2025–26 tax year (1 Apr 2025–31 Mar 2026) | 100% | https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/rental-expense-deductions/property-interest-rules (updated 1 Apr 2026) | primary-verified | IRD: "From 1 April 2025 you can claim 100% of the interest you incur." Confirmed. |
| Interest deductibility, 2026–27 tax year | 100% | same | primary-verified | No end date or step-down stated. Budget 2026 made no change (secondary, see 1.4). |
| Interest deductibility, 2024–25 | 80%, regardless of purchase or drawdown date | same | primary-verified | |
| Interest limitation period | 1 October 2021 to 31 March 2025 | same; IR264 | primary-verified | Earlier years phased (IR264 examples show 75% then 50%). |
| Previously denied interest | May be claimable when the sale is taxable (bright-line or other land rule) | same | primary-verified | Product should keep per-property totals of interest incurred versus claimed. |
| Mixed-purpose loans | Only the rental portion is deductible | IR264 | primary-verified | |
| Ring-fencing of rental losses | Since the 2019–20 income year, deductions are capped at residential income; excess is carried forward to the next year with residential income | IR3R Note 7; IR264 Part 3; https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-property-deductions (updated 1 Apr 2026) | primary-verified | Cannot offset salary or wages. |
| Ring-fencing basis | Portfolio basis, individual-property basis, or a mix. Once on portfolio basis the choice sticks for those properties | IR264 Part 3 | primary-verified | Excess deductions must be tracked per property and per portfolio even though the return shows one total. |
| Ring-fencing: who | Individuals, partners, look-through company owners, close-company shareholders, trustees | IRD deductions page | primary-verified | |
| Ring-fencing: excluded property | Main home; mixed-use assets; property that will be taxed on sale (with notification to IRD); farmland; business premises; property owned by a non-close company; employee accommodation | IRD deductions page | primary-verified | Short-stay accommodation that is not the main home is inside the rules from the 2022 income year. |
| Ring-fencing on sale | Taxable sale can release excess deductions; non-taxable sale transfers them to other residential property or carries them forward | IR264 Part 3 | primary-verified | |
| Bright-line period | 2 years, for property sold on or after 1 July 2024 | https://www.ird.govt.nz/property/buying-and-selling-residential-property/the-brightline-property-rule (updated 1 Apr 2026); IR264 | primary-verified | |
| Bright-line start date | Usually the date title transfers to you (settlement) | same | primary-verified | Off-the-plan purchases follow different rules. |
| Bright-line end date | Usually the date you enter a binding sale and purchase agreement | same | primary-verified | |
| Bright-line exclusions | Main home (if use criteria met), inherited property, relationship property transfers; rollover relief for certain transfers | same; IR264 | primary-verified | Applies to short-stay accommodation and to NZ residents' overseas residential property. |
| Bright-line, sales before 1 July 2024 | 5 years if acquired on or after 29 March 2018 (IR264); IRD web page refers to 5-year or 10-year periods by acquisition date | same | primary-verified | Legacy only. |
| Building depreciation | 0% for residential buildings with estimated useful life of 50 years or more, since the 2011–12 income year | IR3R Note 5; IR264 | primary-verified | Non-residential buildings also back to 0% from the 2025 income year (IRD claiming-depreciation page). |
| Chattels depreciation | Depreciable individually (DV or SL) or pooled; rates from IRD's rate finder and IR265 | IR264 Part 2; https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/types-of-business-expenses/depreciation/claiming-depreciation (updated 14 Sep 2026) | primary-verified | IR264 worked example: dishwasher 30% DV or 21% SL. Use the rate finder for each asset rather than a hard-coded table. |
| Chattel values on purchase | Registered valuation apportioned at market value, or market value of each chattel | IR264 | primary-verified | |
| Low-value asset threshold | Up to $1,000 from 17 March 2021 (was $5,000 from 17 Mar 2020 to 16 Mar 2021; $500 before) | IR264; IRD claiming-depreciation page | primary-verified | Fully deducted in the year of purchase. Whether the $1,000 is measured GST-inclusive for non-registered landlords was not checked. |
| Pooling | Assets costing $5,000 or less each (or depreciated to $5,000 or less); DV method at the lowest rate in the pool; not for privately used assets | IR3R Note 6; IR264 | primary-verified | |
| Electing not to depreciate | Possible asset by asset; otherwise depreciation is deemed claimed and recovered on sale | IR264 | primary-verified | Matters for owners renting out their own home temporarily. |
| Depreciation recovery | Gain over adjusted tax value on sale of a chattel is income (Box 3); loss is deductible | IR264 | primary-verified | |
| Investment Boost | 20% of the cost of new assets deductible up front, from 22 May 2025. Residential rental buildings and improvements to residential buildings are excluded | https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/types-of-business-expenses/new-assets---investment-boost/what--you-can-claim-with-investment-boost (updated 31 Mar 2026) | primary-verified | Whether new chattels in a residential rental qualify is **not stated** on IRD's pages or examples. Do not build this in without advice. |
| GST on residential rent | Long-term residential renting is exempt. No GST charged on rent, none claimed on expenses. Income tax deductions use GST-inclusive amounts | IR264; https://www.ird.govt.nz/property/renting-out-residential-property/gst-and-renting-out-residential-property | primary-verified | Ledger should store GST-inclusive expense amounts for long-term rentals. |
| GST on short-stay | A taxable activity. Must register if turnover from all taxable activities exceeds $60,000 in 12 months | https://www.ird.govt.nz/property/renting-out-residential-property/gst-and-renting-out-residential-property/gst-and-your-short-stay-rental-income (updated 6 Nov 2025) | primary-verified | Jointly owned rental income is not added to each owner's personal turnover. |
| Short-stay via online marketplaces | From 1 April 2024 the marketplace (Airbnb, Bookabach etc.) collects and pays the GST | IRD GST and renting page (updated 3 Apr 2024) | primary-verified | |
| Flat-rate credit for non-registered hosts | 8.5% | none read | unverified | Could not find the IRD page for this today. |
| Mixed-use asset (holiday home) | Applies when used privately, used to earn income, and unused 62 days or more in the year | IR264 Part 4 | primary-verified | |
| Mixed-use opt-out | Income from income-earning use under $4,000 a year: may stay outside the tax system | IR264 Part 4 | primary-verified | |
| Mixed-use quarantining | Excess expenditure is quarantined when gross income is less than 2% of the asset's value | IR264 Part 4 | primary-verified | |
| Provisional tax threshold | Residual income tax over $5,000 | IR264; https://www.ird.govt.nz/income-tax/provisional-tax | primary-verified | |
| Provisional tax dates (31 March balance date) | 28 August, 15 January, 7 May | IR264 | primary-verified | |
| Provisional tax methods | Standard, estimation, ratio, AIM | IRD provisional tax page | primary-verified | Standard uplift percentages (commonly cited 105% and 110%) and the $60,000 interest safe harbour were not on the pages read: unverified. |
| Record keeping (tax) | 7 years, even after you stop renting | IR3R Note 8; IR264 | primary-verified | Includes vehicle logbooks, asset register, tenancy agreement, loan agreement. |
| Trust tax rate | 39% on trustee income from 1 April 2024, where net trustee income exceeds $10,000; 33% if $10,000 or less | https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/trusts-and-estates/income/trustee-tax-rates (updated 20 Apr 2026) | primary-verified | Over $10,000, the whole amount is taxed at 39% (search summary of IRD webinar: secondary). Exceptions: deceased estates (33% for year of death plus 3 years), disabled-beneficiary trusts. Trustees file IR6 and are inside ring-fencing and the interest rules. |
| Look-through company | Files IR7. Ring-fencing and the interest rules apply at owner level | IRD pay-tax and deductions pages; IR264 | primary-verified | The general LTC rule (income and deductions flow to owners in proportion to shareholding) was not read today: unverified. |
| Rent in advance | Taxable in the year received | IR264 | primary-verified | |
| Bond money | Bond passed on to MBIE is not income. Bond paid out to the landlord for rent arrears is income. Bond paid out for damage is not income | IR264 | primary-verified | Directly relevant to bond-refund ledger entries. |
| Below-market rent | Profit is taxable; deductions generally cannot exceed the income received | IR264 | primary-verified | |
| Part-year letting | Ongoing costs (rates, insurance, interest) pro-rated by months let or available | IR3R Note 3; IR264 | primary-verified | Short vacancies for redecoration still count as available. |

### 1.4 Budget and pending changes for landlords

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Budget 2025 | Investment Boost (above). Residential buildings excluded | IRD Investment Boost page | primary-verified | |
| Budget 2026 | No change to interest deductibility or bright-line; no property-specific tax measures | https://pkfwt.co.nz/hear-from-us/budget-2026-initial-thoughts-and-key-tax-takeaways-for-businesses-and-households/ (28 May 2026) | secondary-verified | Not confirmed against Treasury or IRD budget pages. |
| Budget 2026, trusts | Proposed: income allocated to tax-exempt beneficiaries must be paid within a set time or be taxed at 39%, from 2028–29 | same | secondary-verified | Unlikely to touch ordinary family-trust landlords. |
| myIR, April 2026 | IR3R completed in myIR pre-populates the return | IRD pay-tax page | primary-verified | A search summary also mentioned a new "rental income type" field; the IRD page for it returned 404, so that detail is unverified. |
| Election 2026 | Labour campaigned on a 28% tax on property gains from 1 July 2027 and said it would not change interest deductibility; Greens proposed removing interest deductibility and a 10-year bright-line | search-result summaries of news and firm articles, not opened | secondary-verified | Outcome and government not settled at the time of writing. Watch item. |

### 1.5 Ledger categories

Mapped to IR3R boxes. "Deductible" means deductible against rental income, subject to ring-fencing.

**Income categories**

| Ledger category | IR3R line | Tax status | Notes |
|---|---|---|---|
| Rent received (including rent in advance) | Box 1 Total rents | Taxable | Recognise when received. |
| Bond released to landlord for rent arrears | Box 1 Total rents | Taxable | IR264. |
| Insurance payout | Box 2 Other income | Taxable | Named on the form. |
| Rates refund | Box 2 Other income | Taxable | Named on the form. |
| Interest on rental bank account | Box 2 Other income | Taxable | Used in the IR264 worked example. |
| Tenant reimbursements (e.g. water, damage recharge outside the bond) | Box 2 Other income | Taxable | Mapping is my inference; IRD does not list it. |
| Gain or loss on disposal of a depreciated asset | Box 3 | Gain taxable, loss deductible | Depreciation recovered. |
| Bond received and lodged with Tenancy Services | none | Not income | Pass-through. Keep outside income. |
| Bond released to landlord for damage | none | Not income | IR264. |
| Profit on sale within the bright-line period | Not on IR3R; "Net bright-line profit" on the return | Taxable | Outside the rental ledger's normal flow. |

**Expense categories**

| Ledger category | IR3R line | Flag | Notes |
|---|---|---|---|
| Council and regional rates | Box 5 Rates | Deductible | |
| Building and landlord insurance | Box 6 Insurance | Deductible | Lender-required mortgage repayment insurance also deductible. |
| Mortgage interest (rental portion) | Box 7 Interest | Deductible | 100% from 1 April 2025. Store total incurred and amount claimed. |
| Property management fees | Box 8 Agent's collection fees | Deductible | |
| Letting fee or commission to find a tenant | Box 8 Agent's collection fees | Deductible | |
| Repairs and maintenance | Box 9 (itemised, with description) | Deductible | Require a description on each entry; the form asks for a full explanation. |
| Accounting fees | Box 10 Other | Deductible | Not set-up or viability costs. |
| Legal fees: rent recovery, eviction, tenancy agreement | Box 10 Other | Deductible | |
| Legal fees: purchase | Box 10 Other | Deductible if year's total legal fees are $10,000 or less, otherwise capital | Needs a yearly total check. |
| Mortgage arrangement fees; valuation for mortgage | Box 10 Other | Deductible | |
| Body corporate levy, operating | Box 10 Other | Deductible | |
| Motor vehicle and travel | Box 10 Other | Deductible (rental portion) | IR264 example puts vehicle costs here. Needs logbook data. |
| Healthy Homes compliance, revenue items | Box 9 or Box 10 | Deductible | Per QB 20/01. |
| Advertising for tenants | Box 10 Other | Deductible | Not on IRD's list explicitly; inferred from the "find tenants" principle. |
| Water and other utility charges paid by the landlord | Box 5 or Box 10 | Deductible | IRD does not specify the box. Product decision. |
| Depreciation, chattels | Box 12 Assets, plus Box 26 schedule | Deductible | |
| Low-value asset ($1,000 or less) | Box 12 Assets | Deductible in full in year of purchase | QB 20/01 treats it as 100% depreciation. |
| Depreciation, building | Box 11 Buildings | 0% | Record cost, claim nil. |
| Purchase price; purchase real estate agent fees | none | Capital | Feeds bright-line cost base only. |
| Capital improvements and additions | none (may enter the asset schedule if a separate depreciable chattel) | Capital | New heat pump where none existed, new room, double glazing. |
| Healthy Homes items that become part of the building | none | Capital, 0% | Insulation, ducted heat pumps, most extractor fans. |
| Body corporate levy, capital fund | none | Capital | |
| Sale costs: agent commission, legal fees on sale | none | Capital / non-deductible | Exception for those in the business with legal fees of $10,000 or less. |
| Mortgage principal | none | Non-deductible | |
| Interest on non-rental borrowing | none | Non-deductible | |
| Insurance valuation | none | Non-deductible | |
| Owner's own labour | none | Non-deductible | |
| Private use portion (travel, mixed-use, months not available) | none | Non-deductible | |

---

## 2. Privacy Act 2020 for landlords and property managers

### 2.1 Current OPC guidance

- "Privacy Act guidance for landlords and property managers", **February 2025**, 18 pages (read in full): https://privacy.org.nz/assets/New-order/Resources-/Publications/Guidance-resources/Rental-guidance/2025_02_14-Privacy-Act-guidance-for-landlords-A1050761.pdf
- OPC web page "Rental guidance for landlords": https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/
- Key-facts factsheet (file re-issued 24 February 2026, but every page footer still reads "February 2025"; content matches the 2025 guidance): https://www.privacy.org.nz/assets/DOCUMENTS/20260224-Master-document-factsheet-for-landlords-A1011137.pdf
- Tenant-side page: https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-tenants/

The guidance says OPC will respond to complaints, breaches and non-compliance "in line with this guidance". It does not cover public or social housing, boarding houses, or accommodation outside the Residential Tenancies Act.

I found no substantive revision of the rental guidance during 2025–2026 beyond the February 2025 edition. The change that matters since then is IPP 3A (section 2.6).

### 2.2 Applicant data collection stages

All rows primary-verified from the OPC guidance, page and factsheet above.

| Stage | Allowed fields | Prohibited or not yet allowed | Retention |
|---|---|---|---|
| **1. Viewing** | Name and contact details only | Requiring a full application before viewing (may be offered as an option, never required) | Do not keep details of people who viewed and did not apply |
| **2. Application and shortlisting** | Name and contact details. Proof of identity (record the ID number). Whether aged 18 or over. Number of occupants. Names only of occupants who will not be on the agreement. Contact details for landlord and non-landlord referees. Consent to contact referees. Consent to a credit check and criminal record check. Pet ownership, only if pets are restricted. Smoking, only if smoking is restricted. Legal right to remain in NZ for the term, only for a fixed-term tenancy | Actually contacting referees. Actually running the credit or criminal check. Any other details about non-tenant occupants. Everything in the "never collect" list below. Optional questions still need a good reason, and the form must say what happens if they are left blank | ID images submitted online must be securely destroyed once verification is done. Unsuccessful applications: "a short period of time" only (no number given) |
| **3. Preferred applicant checks** (actively negotiating an offer) | Referee checks. Credit report, with consent. Criminal record check, with consent, having said how it will be used and which convictions are relevant. Extra data needed to run those checks (date of birth, ID copies). **One** further form of evidence of ability to pay, chosen by the applicant: payslip, employer letter, Work and Income letter, or proof of past rent payments | Bank statements showing transactions. More than one extra proof of affordability. Broad consent to collect from unnamed "other sources" | Same as stage 2 if the applicant is not selected |
| **4. Preparing the tenancy agreement** | Vehicle details, only if needed for parking. Address for service. Emergency contact. Work and Income client number, only if rent is paid by accommodation supplement and it is shown to be necessary | | Tenancy records: see 2.4 |
| **5. During the tenancy** | Inspection notes and photos limited to what shows how the property is cared for. Neighbour complaints. Rent and payment records. Disability or similar information where relevant to managing the tenancy or communicating with the tenant | Photos that include people or focus on personal items (unless the item breaches the agreement). Cameras that could record tenants inside the home. Using inspection photos to market the property for sale without consent. Using tenant contact details to promote an unrelated business | See 2.4 |

**Never collect when selecting tenants** (OPC list, primary-verified)

- Sex, including pregnancy or childbirth
- Relationship or family status
- Political opinion; religious or ethical belief
- Colour, race or ethnicity, including nationality or citizenship. A passport may be used for ID, but citizenship must not be asked about
- Physical or mental disability or illness
- Age, other than whether over 18
- Employment status: unemployed, on a benefit, or on ACC
- Sexual orientation or gender identity
- Whether the applicant has experienced or is experiencing family violence
- Spending habits, such as bank statements showing transactions. A statement showing only the total balance is acceptable if the applicant chooses to give it. Narrow exceptions: an applicant with a poor credit record who wants to show improvement, or a sitting tenant negotiating a repayment plan
- Employment history. Current employment is allowed
- Social media URLs, or access to restricted social media profiles

**Product implications**

- The application form needs stage gating: referee, credit and criminal checks must be locked until the landlord marks an applicant as preferred.
- Date of birth should not be a stage-2 field. Stage 2 gets an "18 or over" yes/no; date of birth arrives at stage 3 only if a check needs it.
- Store the ID number and a verified flag, then delete the ID image.
- The affordability step should let the applicant pick one document type, and should reject or warn on transaction-level bank statements.
- Consent must be specific and unbundled. Applicants cannot be asked to waive Privacy Act rights (no legal effect).

### 2.3 Consent rules for credit, criminal and reference checks

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Credit check | Consent may be collected on the application form; the check is run only when actively negotiating an offer | OPC landlord guidance PDF | primary-verified | The Credit Reporting Privacy Code allows disclosure to a landlord with the individual's authorisation, to assess creditworthiness as a tenant (guidance footnote 3). |
| Criminal record check | Same timing and consent. Landlord should state how it will be used and which convictions are relevant | OPC landlord guidance PDF | primary-verified | |
| Criminal record, mechanics | Ministry of Justice online third-party service; registered third parties only (contract required); $13.00 per request | https://www.justice.govt.nz/criminal-records/get-someone-elses/ | primary-verified | The page read did not describe the individual-consent step or Clean Slate effects. |
| Reference checks | Referee details and authorisation at stage 2; contact only at stage 3 | OPC landlord guidance PDF | primary-verified | |
| Public sources | May be used if genuinely public, relevant and checked for accuracy. A restricted social profile is not public | OPC landlord guidance PDF | primary-verified | |
| Consent quality | Informed, specific, not bundled; no "other sources" or "other purposes" wording; opt-out for non-core uses | OPC landlord guidance PDF | primary-verified | |
| Privacy statement | Must accompany the application form and the tenancy agreement, and say whether a property manager shares data with the landlord | OPC landlord guidance PDF | primary-verified | |

### 2.4 Retention and disposal

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| General rule (IPP 9) | Keep only as long as there is a lawful purpose, then dispose securely | OPC landlord guidance PDF | primary-verified | |
| Viewers who did not apply | Do not keep | OPC landlord guidance PDF | primary-verified | |
| Unsuccessful applicants | "A short period of time in case any issues are raised about the selection process" | OPC landlord guidance PDF | primary-verified | **No period is stated by OPC.** Any number of days in the product is our own policy choice, not a legal figure. |
| Keeping an application for re-use | Allowed only if the applicant asks | OPC landlord guidance PDF | primary-verified | Make it an explicit opt-in. |
| ID document images | Destroy once verification is complete | OPC landlord guidance PDF | primary-verified | |
| Tenancy documents | Keep during the tenancy and for 12 months after it ends: tenancy agreement and variations, inspection reports, records of building, electrical, plumbing, gas and maintenance work, healthy-homes compliance records, the advertisement, and notices or correspondence with the tenant **and with prospective tenants** about the tenancy | Residential Tenancies Act 1986 s 123A (version as at 1 Dec 2025) https://www.legislation.govt.nz/act/public/1986/0120/latest/whole.html | primary-verified | Correspondence with applicants about the tenancy falls under this even where the application data itself should be deleted. |
| Rent and bond records | 7 tax years after the tax year they relate to | RTA s 30(1A), same URL | primary-verified | Matches the IRD 7-year rule. |
| Family violence withdrawal notices | Dispose of securely once there is no lawful purpose; disclosure restricted by RTA s 56E | OPC landlord guidance PDF | primary-verified | |
| After an access request | Never destroy the requested information; doing so is an offence | OPC guidance; Privacy Act 2020 s 212(2)(d) | primary-verified | Deletion jobs must pause for records under an open access request. |
| Access by unsuccessful applicants | Entitled to their application, any credit report obtained, and public-source material. Not other applicants' data. References given in confidence may be withheld as evaluative material | OPC landlord guidance PDF | primary-verified | |

### 2.5 Human Rights Act grounds

Human Rights Act 1993 (version as at 27 November 2025), read on https://www.legislation.govt.nz/act/public/1993/0082/latest/DLM304475.html. All primary-verified.

| Ground, s 21(1) | Statutory detail |
|---|---|
| (a) Sex | Includes pregnancy and childbirth |
| (b) Marital status | Single, married, civil union, de facto, widowed, separated, divorced |
| (c) Religious belief | |
| (d) Ethical belief | Lack of a religious belief |
| (e) Colour | |
| (f) Race | |
| (g) Ethnic or national origins | Includes nationality or citizenship |
| (h) Disability | Physical, psychiatric, intellectual; reliance on a disability assist dog, wheelchair or other remedial means; presence of organisms capable of causing illness |
| (i) Age | Any age from 16 years |
| (j) Political opinion | Includes having none |
| (k) Employment status | Unemployed, or receiving a benefit or ACC |
| (l) Family status | Having or not having responsibility for children or dependants; being married to or a relative of a particular person |
| (m) Sexual orientation | Heterosexual, homosexual, lesbian or bisexual |

- Section 21(2): a ground counts if it relates to the person or to a relative or associate, whether current, past, or merely suspected or assumed.
- Section 53: unlawful to refuse, offer less favourable terms, treat differently, deny occupation or terminate residential accommodation on a prohibited ground, or to restrict who a tenant's guests may be on such a ground.
- Section 54: section 53 does not apply to residential accommodation shared with the person letting it. Relevant if the product ever covers flatmate or boarder arrangements.
- Section 56: limited disability exception where there is a risk of harm that cannot reasonably be reduced.
- Residential Tenancies Act s 12: discrimination contrary to the Human Rights Act in granting, continuing, varying or ending a tenancy is an unlawful act, as is instructing someone to discriminate or advertising an intention to.
- "Gender identity" appears in OPC's list but is not a separate word in s 21(1). The product should follow OPC's wider list.
- Assist dogs: a pet policy must not be applied so as to refuse a disability assist dog (s 21(1)(h)(vi)).

### 2.6 Blacklists, penalties, breach notification, IPP 3A

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Tenant "blacklists" | OPC calls them "problematic under the Privacy Act": not transparent, often inaccurate or incomplete, a security risk, criticised by tenant and landlord groups alike | OPC landlord guidance PDF | primary-verified | Covers third-party databases and private social media groups. |
| Blacklists: principles at risk | Submitting: IPP 8 (accuracy) and IPP 11 (disclosure). Obtaining: IPP 2 (collect from the individual). Using unverified: IPP 8. Operators must answer access requests | OPC landlord guidance PDF | primary-verified | Also defamation and breach of Tenancy Tribunal name suppression. Do not build shared "bad tenant" notes or cross-landlord ratings. |
| Notifiable privacy breach | A breach that has caused or is likely to cause serious harm. Notify the Commissioner and affected people as soon as practicable | Privacy Act 2020 ss 112–117 https://www.legislation.govt.nz/act/public/2020/0031/latest/whole.html (version as at 8 Oct 2026); https://www.privacy.org.nz/responsibilities/privacy-breaches/ | primary-verified | Notify through OPC's NotifyUs tool. |
| 72 hours | OPC expectation: notify the Office no later than 72 hours after becoming aware | OPC landlord guidance PDF | primary-verified | An expectation in guidance; the Act says "as soon as practicable". |
| Processor breaches | If a cloud or software provider holding the data is breached, the landlord or manager remains responsible and must respond | OPC landlord guidance PDF | primary-verified | Loop & Pool's contracts and incident process must support customers' notification duty. |
| Failure to notify | Offence; fine up to $10,000 | Privacy Act 2020 s 118 | primary-verified | |
| Other offences | Fine up to $10,000: obstructing the Commissioner; false statements; impersonating an individual to get their information; destroying a document knowing an access request has been made | Privacy Act 2020 s 212 | primary-verified | |
| Compliance notices | The Commissioner can direct an agency to comply; failing to comply with a Tribunal-confirmed notice or order is an offence, fine up to $10,000 | Privacy Act 2020 Part 6 and s 133 | primary-verified | |
| Complaints and damages | Complaint to OPC, then Human Rights Review Tribunal, which can award damages | Privacy Act 2020; OPC guidance | primary-verified | The commonly quoted $350,000 Tribunal ceiling was not checked: unverified. |
| OPC rental-sector compliance programme | Regular checks of rental agencies, an annual survey of application forms and privacy policies, and a tenant tipline | search-result summaries of OPC and press pages; OPC release URL returned 404 | secondary-verified | Dates back to the original 2021 guidance launch. |
| OPC complaint backlog | OPC warns an investigator may take more than 12 months to be assigned | OPC tenant page | primary-verified | |
| **IPP 3A** (Privacy Amendment Act 2025) | Royal assent 23 September 2025. **In force 1 May 2026** | https://www.justice.govt.nz/justice-sector-policy/key-initiatives/enhancing-the-privacy-act/ ; https://www.privacy.org.nz/resources-and-learning/a-z-topics/ipp3a/ ; Privacy Act 2020 IPP 3A text | primary-verified | |
| IPP 3A: duty | When collecting personal information from someone other than the individual, take reasonable steps to make the individual aware of: the fact of collection, the purpose, intended recipients, name and address of the collecting and holding agency, any law requiring it, and access and correction rights. As soon as reasonably practicable after collection | Privacy Act 2020 IPP 3A(1)–(2) | primary-verified | |
| IPP 3A: main exception | Not required if the individual has previously been made aware of all those matters | IPP 3A(3) | primary-verified | This is how to comply in practice. |
| IPP 3A: other exceptions | Publicly available information; no prejudice to the individual; not reasonably practicable; would prejudice the purpose of collection; serious threat to health or safety; and others | IPP 3A(4); OPC IPP 3A page | primary-verified | |
| IPP 3A: scope in time | Applies only to information collected from 1 May 2026 | search-result summary of OPC guidance; not on the OPC page read | secondary-verified | |
| IPP 3A: effect on tenant checks | Referee comments, credit reports, criminal records and Tenancy Tribunal searches are all indirect collection. OPC's own example: even where a client authorises a credit check, they must still be told who collected the information and why, and the agency should keep evidence of the notice | OPC IPP 3A page | primary-verified | The application privacy statement should name each source and each collector (landlord, and Loop & Pool if it holds data for its own purposes), and the product should log that the notice was shown. |

### 2.7 Identity verification and credit bureaus

| Item | What it provides | Source URL | Confidence | Notes |
|---|---|---|---|---|
| RealMe verified identity | Government-issued digital identity added to a RealMe login; businesses can integrate it to verify identity and address | https://www.realme.govt.nz/ ; developer site https://developers.realme.govt.nz/ | primary-verified | Bond Hub uses RealMe, Microsoft or Google sign-in for landlords, and the Tenancy Bond API needs the landlord's RealMe. |
| Centrix | Tenancy Credit Check: everything in a consumer credit report plus related Tenancy Tribunal files. Consumer Credit Check with driver licence verification. SmartID and AML/ID verification | https://www.centrix.co.nz/get-reports/tenancy-check/ ; https://www.centrix.co.nz/ | primary-verified | Price and consent wording not shown on the pages read. |
| Experian New Zealand | Consumer credit reports, a Tenancy Check product, identity verification | https://www.experian.co.nz/ | primary-verified | That Experian NZ is the former illion comes from search summaries of OPC pages: secondary-verified. Product URLs were menu paths and not opened. |
| Equifax New Zealand | Consumer credit risk products, fraud and identity products | https://www.equifax.co.nz/ | primary-verified | A tenancy-specific Equifax product was not found on the page read. |
| Akahu verification | Bank-held identity and account-holder verification through open banking; $1.00 per successful request | https://www.akahu.nz/pricing | primary-verified | Could double as bank-account ownership proof for rent payouts. |
| DIA Identity Check, NZTA driver licence checks | | none read | unverified | Not looked up before the search allowance ran out. |

---

## 3. Payments, bonds and money handling

### 3.1 Open banking as of November 2026

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Payments NZ API Centre | **Closed on 30 September 2026.** Set up in 2019 | https://www.apicentre.paymentsnz.co.nz/ ; https://www.apicentre.paymentsnz.co.nz/news/articles/open-banking-moves-into-its-next-phase/ | primary-verified | No longer accepting standards users. |
| Why it closed | Policy moved to a centralised standards model under the Customer and Product Data Act 2025; Payments NZ's role was no longer required | https://www.apicentre.paymentsnz.co.nz/news/articles/payments-nz-announces-closure-of-api-centre/ (media release file dated 21 Aug 2026) | primary-verified | |
| Who runs standards now | MBIE took over open banking standards management from the end of September 2026. Payments NZ agreed to transfer its version 3.0 specifications to MBIE | same | primary-verified | MBIE's approach to standards management, certification and support is still being worked out. |
| Standards in use | v2.3 is the mandatory baseline, including enduring payment consent, the decoupled authentication flow, and party and statement endpoints. v3.0 published. v1.0 expired | https://www.apicentre.paymentsnz.co.nz/news/articles/updated-minimum-open-banking-implementation-plan-published/ | primary-verified | |
| Industry implementation plan | ANZ, ASB, BNZ, Westpac: payment initiation v2.1 by end May 2024, account information v2.1 by end November 2024, payment initiation v2.3 by 30 May 2025, account information v2.3 by 28 November 2025. Kiwibank: May 2026 and November 2026 | same | primary-verified | The Kiwibank split between payments (May) and data (November) is inferred from the article. |
| Customer and Product Data Act 2025 | In force; 2025 No 14 | https://www.legislation.govt.nz/act/public/2025/0014/latest/whole.html (version as at 24 Jan 2026) | primary-verified | The Act itself was confirmed; the banking designation regulations were not located on the legislation site. |
| Banking designation | ANZ, ASB, BNZ and Westpac must provide customer account data and payment initiation from **1 December 2025**. Kiwibank: payment initiation from **1 June 2026**, customer account data from **1 December 2026** | https://www.hgmlegal.com/insights/customer-and-product-data-act-update---open-banking-officially-on-the-way (5 May 2025) | secondary-verified | Law-firm report of Cabinet decisions, written before the regulations were made. MBIE's own pages could not be read. Kiwibank account data is due about two weeks after this document's date. |
| Designated data | Customer name, type and contact details; balances and transactions on transactional, savings, credit card and lending accounts; only for customers with digital banking access | same | secondary-verified | |
| Designated action | Domestic payment initiation | same | secondary-verified | |
| Bank fee caps | 5 cents per payment request; 1 cent per successful data call, or $5 per customer per month for near-real-time transaction access. Banks cannot charge end customers | same | secondary-verified | As decided by Cabinet in 2025; final regulations not checked. |
| Accreditation | Only MBIE-accredited requestors may request data or initiate payments under the Act. Requirements include adequate insurance, financial service provider registration where required (with dispute-resolution membership), and reminding customers of active authorisations at least every 12 months | same | secondary-verified | |
| Do we need our own accreditation? | Not if we connect through an accredited intermediary. Akahu states that using it as intermediary avoids the accreditation fee, annual fees and levies, certificates, insurance and security requirements | https://www.akahu.nz/pricing | primary-verified (vendor statement) | Akahu runs its own app accreditation: accept developer terms, integrate, give Akahu a test account, show compliance with its requirements. https://www.akahu.nz/accreditation-process |
| Volumes | August 2026: 545,681 open banking payments worth $152.9 million, up 36% on July. July 2026: over 221,000 customers had authorised a payment or data consent; data requests passed 19 million | Payments NZ articles above | primary-verified | Still small, growing fast. |

**Providers**

| Provider | Offers | Coverage | Pricing | Source URL | Confidence |
|---|---|---|---|---|---|
| Akahu | Account data (balances, account metadata, enriched transactions), one-off or ongoing. Payments: one-off, and enduring payment consents (authorise once, then variable amounts). Identity and account verification. States it is an accredited requestor and uses the regulated system where possible, with "classic" connections elsewhere | Enduring data access: ANZ, ASB, BNZ, Co-operative Bank, Heartland, Kiwibank, NZHL, Rabobank (limited), SBS (data only, about 6 months of history), TSB, Westpac. One-off payments via official open banking: ANZ, ASB, BNZ, Kiwibank, NZHL, Westpac | $0.15 per successful one-off payment request. Ongoing connectivity typically $0.50–$2.50 per user per month. Verification $1.00. Personal apps free | https://www.akahu.nz/ ; https://www.akahu.nz/products-payments ; https://www.akahu.nz/products-data ; https://developers.akahu.nz/docs/integrations ; https://www.akahu.nz/pricing | primary-verified (vendor) |
| BlinkPay | Pay-by-bank gateway: one-off payments, AutoPay (recurring, variable amounts within customer-approved thresholds, pitched as a direct debit replacement, no dishonour fees), Request to Pay to a banking app, Xero integration. Displays the MBIE accreditation mark. No account-data product seen | ANZ, ASB, BNZ, Kiwibank, Westpac | 0.59% per transaction plus $99 a month (to $100k a month); 0.49% plus $179 a month (to $250k); Xero plan $19 a month plus 0.59%. NZD, excluding GST, 12-month commitment. Settles directly to the merchant's bank account, typically within about 2 hours | https://www.blinkpay.co.nz/ ; https://www.blinkpay.co.nz/accepting-payments ; https://www.blinkpay.co.nz/pricing | primary-verified (vendor) |

**Is automatic rent reconciliation from bank feeds realistic?** Yes.

- The landlord connects the account that receives rent through an Akahu enduring data consent. The app reads transactions and matches them to expected rent by amount, date, payer name and reference.
- Coverage is good: all five large banks plus Co-operative, Heartland, TSB, SBS and others through Akahu.
- No MBIE accreditation is needed when using Akahu as intermediary. Akahu's own app accreditation is required.
- Cost is per connected user per month, so it scales with landlords, not tenants.
- Things I could not confirm from the pages read: refresh frequency, webhook support for new transactions, consent duration, and re-consent rules. The 12-month reminder duty comes from a secondary source. Confirm these with Akahu before designing the matching cadence.
- Matching quality depends on tenants using a stable reference. Give each tenancy a unique payment reference, and handle part-payments, split payers and Work and Income payments as exceptions.

### 3.2 Bond lodgement

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| System name | **Bond Hub** (mybond.tenancy.govt.nz), run by Tenancy Services, MBIE | https://www.tenancy.govt.nz/rent-bond-and-bills/bond/about-lodging-a-bond/ (updated 8 Oct 2026) | primary-verified | The API sandbox routes to a back end called ABODE. |
| Launch | Bond Hub launched alongside the pet rules on 1 December 2025, initially for viewing bonds, lodgements and top-ups | https://www.tenancy.govt.nz/about-tenancy-services/news/new-pet-laws-and-bond-hub-launch/ | primary-verified | |
| Is online lodgement mandatory? | **Yes.** "Landlords must lodge online", through Bond Hub or integrated property management software | about-lodging-a-bond page above | primary-verified | |
| Since when | **29 June 2026**: all bond tasks online; paper bond forms no longer accepted; refund, change-of-tenant and change-of-landlord forms withdrawn. Non-digital options only for specific situations | https://www.tenancy.govt.nz/about-tenancy-services/news/faster-simpler-bond-management-is-now-live/ ; https://www.tenancy.govt.nz/rent-bond-and-bills/bond/refunding-a-bond/how-to-apply-for-a-bond-refund/ (updated 4 Sep 2026) | primary-verified | |
| Registration | Landlords register for Bond Hub with a RealMe, Microsoft or Google account. Tenants do not register; they act through emailed or texted links | https://www.tenancy.govt.nz/about-tenancy-services/improving-our-tenancy-bond-service/ | primary-verified | |
| Maximum general bond | 4 weeks' rent | RTA s 18 (replaced 1 Dec 2025) https://www.legislation.govt.nz/act/public/1986/0120/latest/whole.html | primary-verified | |
| Pet bond | Up to 2 weeks' rent, in addition to the general bond. Only one pet bond at a time, however many pets. Only where the tenant keeps or intends to keep a pet and the landlord has agreed | RTA s 18AA (from 1 Dec 2025) | primary-verified | No pet bond for pets lawfully kept before 1 December 2025 (Tenancy Services news page). |
| Pet consent | Tenant may keep a pet if the agreement allows or the landlord consents. Landlord must answer a written request in writing within 21 days, and may refuse only on reasonable grounds or attach reasonable conditions | RTA ss 42E, 42F | primary-verified | Tenants are liable for pet damage beyond fair wear and tear (Tenancy Services). |
| Lodgement deadline | Within 23 working days of receiving any bond payment, whole or part | RTA s 19(1)(b) | primary-verified | If the tenant pays Tenancy Services directly, the timeframe is as agreed. |
| Receipt | Written, signed receipt to the payer as soon as practicable, showing address, bond type and amount, date, payer | RTA s 19(1)(a) | primary-verified | |
| Penalty for breaching bond duties | Unlawful act. Infringement fee $500, or $1,000 for landlords with 6 or more tenancies. Maximum fine $1,500 or $3,000 | RTA s 19(2)–(3), Schedule 1B | primary-verified | Same amounts for demanding more than the permitted general or pet bond. |
| Boarding houses | Bond of 1 week's rent or less need not be lodged | RTA s 19(1A) | primary-verified | |
| Lodging in Bond Hub | Landlord enters address, weekly rent, general and pet bond amounts, and for each tenant: name, date of birth, contact details and preference, entry date. Then nominates who pays | https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/how-to-lodge-a-new-bond-in-bond-hub/ | primary-verified | Tenant can be nominated payer only with an email address on file. Sessions time out after 15 minutes. |
| Payment methods, Bond Hub | Mastercard or Visa credit or debit card, or Account2Account from a personal bank account | same | primary-verified | |
| Payment methods, software | Direct debit or direct credit, each registered in advance with Tenancy Services, with a payment form or remittance advice uploaded per lodgement | https://www.tenancy.govt.nz/rent-bond-and-bills/bond/using-property-management-software-to-complete-bond-transactions/ | primary-verified | Supports bulk lodgement. |
| Confirmation | Landlord and tenants get the bond number, Landlord ID and Tenant Number ("Tenant-" plus 8 digits) | Bond Hub lodging page | primary-verified | The tenant number is needed for later tenant responses. |
| Top-ups | After a rent increase the landlord may require a top-up up to the new 4-week (or 2-week pet) amount. Lodged in Bond Hub under "New top up" or through software; same payment options and payer nomination | RTA s 18(2), s 18AA; https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/how-to-top-up-a-bond-in-bond-hub/ (updated 13 Oct 2026) | primary-verified | If rent falls, the excess is refundable on application. |
| Refunds | Landlord starts the refund in Bond Hub or software. Every tenant must agree or disagree, within 12 working days. Once all agree, payment is made the following day. Processing up to 10 working days from a complete application | refund page above | primary-verified | Tenants enter their own bank accounts; refunds can be split. |
| Refund disputes | Either party applies to the Tenancy Tribunal; mediation first if both agree | refund page | primary-verified | |
| Landlord unresponsive | Tenant calls 0800 TENANCY and Tenancy Services helps them apply | refund page | primary-verified | |
| Unclaimed bonds | Pass to the Crown if not claimed within 6 years | refund page | primary-verified | |
| Bond transfer to a new tenancy | A tenant can direct their refund to a new landlord, if that landlord agrees, by entering the new landlord's bank account in the refund flow | refund page; https://tenancy.govt.nz/rent-bond-and-bills/bond/transferring-bond (updated 26 Jun 2026) | primary-verified | The old paper transfer form is gone. No dedicated transfer flow is described. |
| Change of tenant | Landlord submits in Bond Hub. All tenants are notified and each must respond within 12 working days. One "disagree" cancels the request. At least one tenant must remain. Remove and add are separate requests | https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/changing-a-tenant/ (updated 17 Sep 2026) | primary-verified | Where the departing tenant is owed money, a refund request goes in first (search summary of Tenancy Services: secondary). |
| Change of landlord | Done in Bond Hub; both landlords are notified | https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/changing-a-landlord/ (seen in search summary and site links, page not opened) | secondary-verified | |
| Duty to report changes | Change of landlord, tenant or contact details must be notified within 10 working days | search summary of Tenancy Services "updating bond information" page, not opened | secondary-verified | |
| **Tenancy Bond API** | Published on MBIE's API platform. Version 3 released June 2026; new builds must target v3. Operations: register a landlord, lodge bonds, check request status, view and maintain bonds. Sandbox and production. Three-legged OAuth, with the landlord consenting through their RealMe. Subscription is approved by MBIE's API team | https://portal.api.business.govt.nz/api/tenancy-bond | primary-verified | Any vendor can subscribe. Eleven vendors are integrated, including Console, Keyhook, MRI Palace, MyRent, Quinovic, RentHQ, RentManager NZ and TenancyIQ. Integrated software can also do refunds and tenant or landlord changes. |

**Product implications**

- A direct Tenancy Bond API integration is open to us and is what competitors such as MyRent and Keyhook already have. Without it, landlords must leave the app and use Bond Hub.
- The landlord needs a RealMe login for the API consent step, and a pre-registered direct debit or direct credit arrangement for software payments.
- Tenants must have an email address on file with Tenancy Services for most digital flows. Collect and pass it accurately.
- Build timers for the 23-working-day lodgement deadline and the 12-working-day tenant response window.
- Bond Hub collects each tenant's date of birth at lodgement. That is a stage-4 collection in the privacy model, not an application-stage one.
- Other RTA limits visible in Schedule 1B that the product should enforce: no rent demanded more than 2 weeks in advance (s 23), rent stated in every advertisement (s 22F), written signed tenancy agreement (s 13), rent receipts where required (s 29).

### 3.3 Are property managers regulated?

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Licensing today | No licence, registration or trust-account rule applies to residential property managers | Real Estate Agents Act 2008 s 4(1) (version as at 10 Jul 2026) https://www.legislation.govt.nz/act/public/2008/0066/latest/whole.html | primary-verified | The definition of "transaction" excludes "a tenancy to which the Residential Tenancies Act 1986 applies", so letting and managing residential tenancies is not real estate agency work. |
| Residential Property Managers Bill (2023) | Introduced 18 August 2023. Government announced on 30 April 2024 it would not proceed. Discharged 21 June 2024 | search-result summaries of legislation.govt.nz, Beehive and HUD pages, not opened | secondary-verified | |
| **New proposal, 2026** | Cabinet has agreed to a "light-touch" **Residential Property Managers Registration Bill** (minute ECO-26-MIN-0025). Not yet introduced as at HUD's last update on 24 March 2026; timing depends on legislative priorities | https://www.hud.govt.nz/our-work/regulation-of-residential-property-managers ; https://www.hud.govt.nz/news/new-regulations-for-residential-property-management-sector | primary-verified | Whether it has since been introduced, and its fate after the election, could not be checked. |
| Proposed regime: scope | In: residential property managers and residential property management organisations. **Out: private landlords**, Kāinga Ora, community housing providers | HUD page above | primary-verified | Self-managing landlords, our core users, are outside it. |
| Proposed regime: content | Compulsory public registration, renewed every 2 years. Minimum age 18 and education or experience requirements. **Client funds held in accounts separate from operating funds.** Records kept at least 7 years. Audit on request. Code of conduct. Continuing professional development. Registrar within MBIE; Disciplinary Tribunal under the Ministry of Justice. Offences for practising unregistered or rendering false accounts | HUD page above | primary-verified | How the Bill will define a property manager, and whether a software platform that collects rent could fall inside it, is not answered on the page. |

### 3.4 Would Loop & Pool need a licence or trust account to hold rent or maintenance money?

Short position: there is no property-management licence to obtain, but **holding or moving other people's money is likely to bring the platform under financial-services law**. This is my reading of the statutes, not a legal opinion.

| Item | Rule / value | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Financial service provider registration | "Financial service" includes "keeping, investing, administering, or managing money ... on behalf of other persons" and "operating a money or value transfer service". A business providing a financial service must be registered, and must join an approved dispute resolution scheme if it serves retail clients | Financial Service Providers (Registration and Dispute Resolution) Act 2008 s 5(1)(d), (f) and Part 2 (version as at 1 Jul 2026) https://www.legislation.govt.nz/act/public/2008/0097/latest/whole.html | primary-verified (statute text); application to us unverified | A platform that receives rent into its own account and pays it on would plausibly be caught. |
| AML/CFT | A "financial institution" includes a person who, in the ordinary course of business, is "transferring money or value for, or on behalf of, a customer" or "investing, administering, or managing funds or money on behalf of other persons" | Anti-Money Laundering and Countering Financing of Terrorism Act 2009 s 5 (version as at 1 Jul 2026) https://www.legislation.govt.nz/act/public/2009/0035/latest/whole.html | primary-verified (statute text); application to us unverified | If caught: risk assessment, compliance programme, customer due diligence, reporting, audit. Exemptions and the supervisor were not researched. |
| Real estate agents and AML | Real estate agents are AML reporting entities for real estate agency work, which excludes RTA tenancies | AML/CFT Act s 5; REAA s 4 | primary-verified | So property management is not caught by that route. |
| Trust account | No statutory trust-account requirement for property managers today. The 2026 Bill would require separate client-fund accounts for registered organisations | HUD page | primary-verified | |
| Stripe's own restriction | Stripe lists "Payment facilitators that process payments for sub-merchants" and "Peer-to-peer money transfers" as prohibited or restricted for NZ BECS Direct Debit | https://docs.stripe.com/payments/nz-bank-account | primary-verified | A rent-collection platform should confirm its model with Stripe before building on this method. |

**Lower-risk design**: do not take custody of rent.

- Rent flows bank-to-bank from tenant to landlord. The app only reads the landlord's bank feed and reconciles.
- If the app initiates payments, use open-banking payment initiation where funds settle directly into the landlord's account (BlinkPay states it settles direct to the merchant account; Akahu initiates bank payments), or Stripe Connect with each landlord as a connected account so Stripe is the regulated money handler.
- Maintenance money: have the landlord pay tradespeople directly; do not hold floats.
- Get a NZ financial-services lawyer to confirm the registration and AML position for whichever model is chosen.

### 3.5 Direct debit and payment facilitation options for rent

| Option | What it is | Source URL | Confidence | Notes |
|---|---|---|---|---|
| Automatic payment set up by the tenant | Tenant's own recurring bank payment with a reference | none | unverified | Widely understood to be the usual way rent is paid in NZ; not checked against a source today. Needs no licence and pairs with bank-feed reconciliation. |
| Open-banking enduring payment consent | Tenant authorises once in their banking app; the app then initiates variable payments within agreed limits | Akahu and BlinkPay pages above | primary-verified (vendor) | Handles rent changes without the tenant re-doing a mandate. Big five banks. |
| Stripe NZ BECS Direct Debit | Bank debit under a Direct Debit Authority. NZ accounts only, NZD, available to merchants and Connect platforms located in NZ. Approval required, with extra identity verification | https://docs.stripe.com/payments/nz-bank-account | primary-verified | Settlement T+2 business days. Default limits NZ$10,000 per transaction and NZ$10,000 a week initially. Customer can dispute for up to 9 months if the authority is contested, or 120 days if the pre-debit notice was missing or wrong. Mandate confirmation within 5 days and a notice before each debit (Stripe sends both by default). One automatic retry within 5 days. |
| Stripe Connect in NZ | Available. Stripe's NZ BECS page lists "Platform or marketplace (Connect)" as an eligible account type for business location NZ, and Stripe's en-nz Connect page is localised in NZD | https://docs.stripe.com/payments/nz-bank-account ; https://stripe.com/en-nz/connect | primary-verified | The Connect marketing page does not itself state NZ eligibility or NZ fees; confirm onboarding rules and pricing with Stripe. |
| GoCardless | Direct debit, one-off and recurring, for NZ merchants; Auckland office; Xero and API integrations | https://gocardless.com/en-nz/ | primary-verified (vendor) | Pricing and payout timing not on the page read. |
| Bank-sponsored direct debit initiator | Direct debit facility obtained from the business's own bank | none | unverified | Payments NZ rules not researched. |

---

## 4. Recent and upcoming changes

**Already in force**

| Date | Change | Topic | Confidence |
|---|---|---|---|
| 1 Apr 2024 | Trustee tax rate 39% (over $10,000). Online marketplaces collect GST on short-stay accommodation. Interest deductibility 80% for 2024–25 | Tax | primary-verified |
| 21 Jun 2024 | Residential Property Managers Bill discharged | Regulation | secondary-verified |
| 1 Jul 2024 | Bright-line period cut to 2 years for sales from this date. Healthy Homes standards apply universally | Tax, tenancy | primary-verified |
| Feb 2025 | OPC reissued its landlord and tenant privacy guidance | Privacy | primary-verified |
| 1 Apr 2025 | **Interest deductibility restored to 100%** | Tax | primary-verified |
| 22 May 2025 | Investment Boost (20%); residential buildings excluded | Tax | primary-verified |
| 23 Sep 2025 | Privacy Amendment Act 2025 received Royal assent | Privacy | primary-verified |
| 1 Dec 2025 | Pet bonds (up to 2 weeks) and pet consent rules. Bond Hub launched. Banking designation under the Customer and Product Data Act starts for ANZ, ASB, BNZ, Westpac (last item secondary) | Tenancy, payments | primary-verified / secondary-verified |
| Mar 2026 | New editions of IR3R and IR264. Cabinet agrees to a Residential Property Managers Registration Bill | Tax, regulation | primary-verified |
| 1 May 2026 | **IPP 3A in force** (notice of indirect collection) | Privacy | primary-verified |
| 28 May 2026 | Budget 2026 commentary: no change to landlord tax settings | Tax | secondary-verified |
| 1 Jun 2026 | Kiwibank payment initiation designated | Payments | secondary-verified |
| Jun 2026 | Tenancy Bond API version 3 released | Bonds | primary-verified |
| 29 Jun 2026 | **Bond processes fully online; paper forms ended**; refunds and tenant or landlord changes in Bond Hub | Bonds | primary-verified |
| 30 Sep 2026 | **Payments NZ API Centre closed**; MBIE now responsible for open banking standards | Payments | primary-verified |
| 7 Nov 2026 | General election; result and government not settled | All | secondary-verified |

**Upcoming or pending**

| Date | Change | Topic | Confidence |
|---|---|---|---|
| 27 Nov 2026 (reported) | Official election results, then government formation. Tax policy could shift | Tax | secondary-verified |
| 1 Dec 2026 | Kiwibank customer account data designated | Payments | secondary-verified |
| Not dated | Residential Property Managers Registration Bill to be introduced; separate client-fund accounts and registration for property management organisations | Regulation | primary-verified (proposal) |
| Not dated | MBIE's long-term model for open banking standards, certification and support | Payments | primary-verified (stated as unresolved) |
| 1 Jul 2027 (proposal only) | Labour's campaign proposal for a 28% tax on property gains, if it forms a government | Tax | secondary-verified |
| 2028–29 (proposal) | Budget 2026 proposal on trust income allocated to tax-exempt beneficiaries | Tax | secondary-verified |

Noticed in passing, outside scope: HUD lists new regulations for methamphetamine contamination in rental homes, announced 8 October 2025.

---

## 5. Source list (pages actually read)

**Inland Revenue**
- IR3R March 2026: https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir1---ir99/ir3r/ir3r-2026.pdf
- IR264 March 2026: https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir200---ir299/ir264/ir264.pdf
- Residential rental income overview: https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it
- Rental property expenses: https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/rental-expense-deductions
- Interest rules: https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/rental-expense-deductions/property-interest-rules
- Pay tax on rental income: https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it/pay-tax-on-your-rental-income
- Residential rental property deductions: https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-property-deductions
- Bright-line: https://www.ird.govt.nz/property/buying-and-selling-residential-property/the-brightline-property-rule
- GST and renting: https://www.ird.govt.nz/property/renting-out-residential-property/gst-and-renting-out-residential-property
- Short-stay GST: https://www.ird.govt.nz/property/renting-out-residential-property/gst-and-renting-out-residential-property/gst-and-your-short-stay-rental-income
- Depreciation: https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/types-of-business-expenses/depreciation/claiming-depreciation
- Investment Boost: https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/types-of-business-expenses/new-assets---investment-boost/what--you-can-claim-with-investment-boost
- Trustee tax rates: https://www.ird.govt.nz/income-tax/income-tax-for-businesses-and-organisations/trusts-and-estates/income/trustee-tax-rates
- Provisional tax: https://www.ird.govt.nz/income-tax/provisional-tax
- End-of-year timelines: https://www.ird.govt.nz/income-tax/income-tax-for-individuals/what-happens-at-the-end-of-the-tax-year/timelines-at-the-end-of-the-tax-year
- QB 20/01: https://www.taxtechnical.ird.govt.nz/-/media/project/ir/tt/pdfs/questions-we-ve-been-asked/2020/qb-20-01.pdf

**Privacy**
- OPC landlord guidance (Feb 2025): https://privacy.org.nz/assets/New-order/Resources-/Publications/Guidance-resources/Rental-guidance/2025_02_14-Privacy-Act-guidance-for-landlords-A1050761.pdf
- OPC landlord page: https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/
- OPC landlord factsheet: https://www.privacy.org.nz/assets/DOCUMENTS/20260224-Master-document-factsheet-for-landlords-A1011137.pdf
- OPC tenant page: https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-tenants/
- OPC IPP 3A: https://www.privacy.org.nz/resources-and-learning/a-z-topics/ipp3a/
- OPC privacy breaches: https://www.privacy.org.nz/responsibilities/privacy-breaches/
- Ministry of Justice, Privacy Amendment Act: https://www.justice.govt.nz/justice-sector-policy/key-initiatives/enhancing-the-privacy-act/
- Ministry of Justice, third-party criminal records: https://www.justice.govt.nz/criminal-records/get-someone-elses/
- RealMe: https://www.realme.govt.nz/
- Centrix: https://www.centrix.co.nz/get-reports/tenancy-check/
- Experian NZ: https://www.experian.co.nz/ ; Equifax NZ: https://www.equifax.co.nz/

**Legislation (legislation.govt.nz, full Act text)**
- Privacy Act 2020 (as at 8 Oct 2026): https://www.legislation.govt.nz/act/public/2020/0031/latest/whole.html
- Human Rights Act 1993 (as at 27 Nov 2025): https://www.legislation.govt.nz/act/public/1993/0082/latest/DLM304475.html
- Residential Tenancies Act 1986 (as at 1 Dec 2025): https://www.legislation.govt.nz/act/public/1986/0120/latest/whole.html
- Customer and Product Data Act 2025 (as at 24 Jan 2026): https://www.legislation.govt.nz/act/public/2025/0014/latest/whole.html
- Financial Service Providers (Registration and Dispute Resolution) Act 2008 (as at 1 Jul 2026): https://www.legislation.govt.nz/act/public/2008/0097/latest/whole.html
- AML/CFT Act 2009 (as at 1 Jul 2026): https://www.legislation.govt.nz/act/public/2009/0035/latest/whole.html
- Real Estate Agents Act 2008 (as at 10 Jul 2026): https://www.legislation.govt.nz/act/public/2008/0066/latest/whole.html

**Tenancy Services, HUD, MBIE API portal**
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/about-lodging-a-bond/
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/how-to-lodge-a-new-bond-in-bond-hub/
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/how-to-top-up-a-bond-in-bond-hub/
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/bond-hub/changing-a-tenant/
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/refunding-a-bond/how-to-apply-for-a-bond-refund/
- https://tenancy.govt.nz/rent-bond-and-bills/bond/transferring-bond
- https://www.tenancy.govt.nz/rent-bond-and-bills/bond/using-property-management-software-to-complete-bond-transactions/
- https://www.tenancy.govt.nz/about-tenancy-services/improving-our-tenancy-bond-service/
- https://www.tenancy.govt.nz/about-tenancy-services/news/faster-simpler-bond-management-is-now-live/
- https://www.tenancy.govt.nz/about-tenancy-services/news/new-pet-laws-and-bond-hub-launch/
- https://portal.api.business.govt.nz/api/tenancy-bond
- https://www.hud.govt.nz/our-work/regulation-of-residential-property-managers

**Payments**
- https://www.apicentre.paymentsnz.co.nz/ and the four news articles cited in 3.1
- https://www.akahu.nz/ , /products-payments , /products-data , /pricing , /accreditation-process ; https://developers.akahu.nz/docs/integrations
- https://www.blinkpay.co.nz/ , /accepting-payments , /pricing
- https://docs.stripe.com/payments/nz-bank-account ; https://stripe.com/en-nz/connect
- https://gocardless.com/en-nz/

**Secondary**
- HGM Legal, 5 May 2025: https://www.hgmlegal.com/insights/customer-and-product-data-act-update---open-banking-officially-on-the-way
- PKF, 28 May 2026: https://pkfwt.co.nz/hear-from-us/budget-2026-initial-thoughts-and-key-tax-takeaways-for-businesses-and-households/

---

## 6. What could not be verified from a primary source

| Item | Status | What to do |
|---|---|---|
| Banking designation dates and banks under the Customer and Product Data Act; fee caps; accreditation requirements | Law-firm summary only. MBIE pages blocked; regulations not found on the legislation site | Read MBIE's Customer and Product Data pages and register directly. |
| MBIE register of accredited requestors (Akahu, BlinkPay status) | Vendor self-statements only | Check the MBIE register. |
| Akahu data refresh frequency, webhooks, consent duration and re-consent | Not on the pages read | Ask Akahu; read developers.akahu.nz. |
| Whether Investment Boost covers new chattels in a residential rental | IRD pages silent | Ask IRD or a tax adviser before adding it. |
| 8.5% flat-rate credit for non-registered short-stay hosts | Not found today | Find IRD's platform-economy page. |
| IR3 due date with a tax agent (31 March) | Not on the pages read | Confirm on IRD. |
| Provisional tax standard uplift (105% / 110%) and $60,000 safe harbour | Not on the pages read | Confirm in IR289. |
| General LTC flow-through rule; IR4 for companies | Not read | Confirm on IRD. |
| A current IR1226 worksheet later than 2023 | Not found | Confirm on IRD forms page. |
| Budget 2026 landlord measures | One accounting-firm article | Confirm on Treasury or IRD tax policy sites. |
| Election outcome and any resulting tax or tenancy policy | News summaries only, result unsettled | Re-check after 27 November 2026. |
| 2023 Residential Property Managers Bill discharge date | Search summaries only | Low stakes; superseded by the 2026 proposal. |
| Whether the 2026 Registration Bill has been introduced, and its definition of property manager | HUD page last updated 24 March 2026 | Check Parliament's bills list. |
| Whether a rent-handling platform must register as a financial service provider or is an AML reporting entity | Statute text read; application is my inference | Legal advice before launch. |
| OPC rental compliance programme details; Experian as the renamed illion; "IPP 3A applies only to post-1 May 2026 collections"; 10-working-day bond change notification; change-of-landlord flow | Search summaries of primary pages, pages not opened | Open the pages. |
| Human Rights Review Tribunal damages ceiling | Not checked | Confirm if quoted in-app. |
| DIA Identity Check, NZTA licence verification, bank-sponsored direct debit rules | Not researched | Research if these become product options. |
| Automatic payments being the usual way rent is paid | General understanding only | Validate with user research. |
