# Round 2 · 02 — Best-in-class patterns worth adopting

Research date: 14 November 2026. Every URL below was read on that date unless a different page date is given.

**The question.** What are the best landlord and renter products in the world doing in 2026 that Loop & Pool does not, which of those flows are worth adopting, and what is the evidence that each one works?

**The short answer.** The prototype is already ahead of every product read on how it explains and enforces the law. Where it is behind is in the parts of a tenancy that two people do *together*: agreeing how to catch up on rent, agreeing what the home looked like on day one and on the last day, talking on the record, and moving in and out. The products that do those well share one habit: the renter gets their own half of the record, not a copy of the landlord's.

## How to read this document

- **Unverified** means I could not confirm the point on the vendor's own site in this session.
- **Vendor claim** means the only source for a number is the company's own marketing. No independent evidence was found for any of them.
- Quoted wording comes from the page as returned by the page reader. Re-read the page before putting any quote on a screen.
- **NZ law** in this document is taken from the repo's own research (`docs/research/nz-tenancy-law.md`, `nz-tax-privacy-payments.md`, `nz-property-compliance.md`, `operations-domain.md`), which records the section, source URL and how each value was verified. I re-read four Tenancy Services pages today and say so where I did. Nothing here is a new legal value; where a pattern would need one, it is listed under "New values the rule pack would need".
- "Repo today" was checked against the code under `src/screens/`, `src/domain/` and `src/data/` on the research date.

### Research limits

- **The session's web-search budget was already used up** (200 searches, shared across agents). Everything here comes from opening vendor pages directly. I could not search for reviews, changelogs or forum threads, so the evidence is weighted towards vendor pages. Review evidence from round one still stands and is not repeated.
- **Could not be read:** myRent (HTTP 403, as in round one), OpenRent's help centre (403), Inspection Express (`inspectionexpress.com` is a parked domain; `ipropertyexpress.com` returned 403), Flatmates.com.au (404 and 429), Innago's features page (404; the homepage carries no feature detail), Stessa's features index (404; the accounting page was read instead), zInspector's zTenant page (redirects to another host; the homepage was read instead).
- **Changelogs and release notes:** only TurboTenant's product-updates page could be read, and it listed nothing dated 2026 although individual update pages carry 2026 edit dates. No other vendor changelog was reached without search.
- **Tenancy.co.nz** is now "OnePortal", an end-to-end product for property managers. Only the first part of a very large page could be read. Nothing for self-managing landlords was found. The page also carries an unrelated outbound link to a shoe retailer, which is worth knowing before linking to it.
- **Rello** (`rello.com.au`) is not a renter product. It is a payments and finance platform for real-estate agencies and property sellers. Nothing on it applies to Pool.
- **Buildium, Baselane, Stessa, Avail:** read; little that round one did not already cover. What was new is cited under the patterns.

---

## What the repo has, and where the gaps are

From the code, on 14 November 2026.

| Area | Repo today | Gap this document addresses |
|---|---|---|
| Rent arrears | Staged actions, call script and log, 14-day notice with its working, "what you cannot do" (`src/screens/loop/decisions/money.tsx`); tenant sees days late and a runway (`src/screens/pool/home/RentHero.tsx`) | No repayment arrangement. `payment_plan_agreed` exists only as an event type in `src/domain/types.ts` |
| Inspections | Offline room-by-room studio with scores, flags, notes, photos and the last score per room (`src/screens/loop/inspections/Studio.tsx`); Pool shows the upcoming visit and the tenant's rights | The report is landlord-only. No tenant half, no photo comparison, no exit-to-bond flow. `EndTenancy.tsx` stops at "final inspection and bond refund come next" |
| Notices to the tenant | Served notices appear in Pool with source chips (`src/screens/pool/home/Renting.tsx`) | Pool does not run the calculators and say whether the notice meets the rules |
| Explaining law | `<Why>`, `<Working>`, `<Refusal>`, Rulebook, date calculators, rules-grounded assistant | No step-by-step paths through a situation, no glossary |
| Messaging | None. Only notices, ticket events and feedback to the team | No landlord–tenant thread, no language setting |
| Listings | Pool search, listing page, viewing slots, staged-privacy applicants | The landlord cannot create a listing. Listings exist only in seed data |
| Renter records | 12 on-time/late bars, JSON export, Rent Passport shared as text | No rent statement, no shareable link, no household application |
| Move-in / move-out | Bond status card in Pool | No checklist, meter readings, connections or refund tracker |
| Money and tax | Bank-feed matching, IR3R-shaped schedule, CSV exports, read-only accountant seat (`src/screens/loop/Money.tsx`) | No receipt photos, no trip log, no printable pack |
| Reminders | Action queue and "Coming up" dates | No calendar export, digest or channel preferences |
| Documents | Tenancy agreement PDF is read on "add a home"; `Records.tsx` lists rows with no files behind them | No intake for other documents. `Property.insurance` drives checks but has **no screen to enter it** |

---

## The patterns

Ordered by rank. The ranked table is at the end.

### 1. A written catch-up arrangement the tenant can see, with a hand-off to FastTrack

**What it is, and who does it best.** When rent is late, the best products move from reminding to *agreeing*: a top-up on each rent payment until the debt is cleared, recorded in writing, tracked automatically.

- **Tenancy Services** is the clearest source. Its overdue-rent page tells landlords to talk first, says "you could let them add an amount to their regular rent until they have paid the debt", and "Record any agreement in writing" (https://www.tenancy.govt.nz/rent-bond-and-bills/rent/overdue-rent/, read 14 Nov 2026).
- **FastTrack Resolution** turns an agreement the two parties have already reached into a Mediator's Order. The agreement must state the debt, worked out up to and including the day before the next payment is due, the repayment amount and frequency (weekly or fortnightly), a start date, and what happens if a payment is missed. A mediator contacts the tenant within two business days. The fee is $29. Once sealed, the order is enforceable like a Tribunal order (https://www.tenancy.govt.nz/disputes/fasttrack-resolution/, read 14 Nov 2026).
- **TurboTenant** lets a landlord switch on partial payments per lease, and says a payment plan can then be set up if the landlord allows it (https://www.turbotenant.com/online-rent-payments/).
- **DoorLoop's Rent Collection Agent** "tracks payment commitments, checks whether tenants follow through" and resumes collection if they do not (https://www.doorloop.com/features/rent-collection-agent).
- **August** escalates landlord alerts on the due date and at days 1, 3, 7 and 14, and tells the tenant "before the due date, on the day, and again if rent goes unpaid" (https://www.augustapp.com/features/reminders).
- **PropertyMe** schedules follow-up messages by the number of days in arrears (https://www.propertyme.com.au/features#automations).

**Evidence.** Rent arrears appear in 58.5% of NZ dispute applications (round one, Tenancy Services statistics). DoorLoop cites 88% on-time payment from its own user surveys, platform-wide, "results may vary" (vendor claim). Azibo claims a 10% increase in on-time payments (vendor claim, https://www.azibo.com/). No independent evidence on payment plans specifically was found.

**Why it matters.** A first-time landlord's instinct is either to do nothing or to serve a notice. A renter who is behind fears eviction and goes quiet. A visible plan gives both a third option, and it is the option the regulator recommends first.

**Repo today.** `ArrearsDecision` in `src/screens/loop/decisions/money.tsx` covers the call, the notice and the Tribunal file. The assistant mentions FastTrack in one sentence (`src/domain/copilot.ts`). There is no arrangement record and no tenant-side view of one.

**What changes for New Zealand.**

- No late fee, ever. A clause that charges a fixed sum on breach is of no effect (RTA s 32, `nz-tenancy-law.md` §4). This rules out the late-fee half of every US product read.
- The arrangement is a record between two people. It only becomes enforceable through FastTrack or the Tribunal (ss 55(1A)–(1B), 87–88, `nz-tenancy-law.md` §10d).
- FastTrack is **not** available for monthly rent, three or more tenants, tenants under 18, where a licensed interpreter is needed, or more than three issues (page read today). The screen must check these and say why when it refuses.
- The Privacy Commissioner allows a sitting tenant negotiating a repayment plan to choose to show spending information; the landlord may not demand it (`nz-tax-privacy-payments.md` §2.2).
- **Not checked:** whether an agreed arrangement changes what counts as "owing" for an overdue-rent (strike) notice or a 14-day notice. The screen must not imply either way until that is sourced.
- The product never holds rent. The plan changes what the bank-feed matcher *expects*; it does not move money.

**What to build.**

- In the arrears decision, a third choice beside "call" and "send the notice": **Agree a way to catch up**.
- Four fields, the same four FastTrack asks for: the debt (worked out to the day before the next payment, shown with `<Working>`), the top-up per rent payment, the start date (the next rent day), and what the two agree happens if a payment is missed.
- Both sign with the existing tap-to-sign. The record is filed to the tenancy and added to the Tribunal pack.
- **Pool:** the rent hero changes from "N days late" to "Catching up: 3 of 8 top-ups paid, $240 to go", with the agreement one tap away.
- The bank-feed matcher expects rent plus top-up. A short payment raises one action for the landlord and one honest line for the tenant.
- **Make it binding:** a FastTrack hand-off that checks eligibility against the published exclusions, lists what the mediator will ask, and reminds the landlord to confirm the tenant's phone number and that they can take a call in the next two business days.

**New values the rule pack would need.** FastTrack's eligibility list, the two-business-day contact window and the fee, each with the URL above.

---

### 2. The tenant completes their half of the entry report, and can send a check-in between inspections

**What it is, and who does it best.** The condition record is something both people make, on their own phones, with a time limit and an audit trail.

- **RentCheck** sends the tenant "a guided inspection from their phone": room-by-room prompts, required photos, "timestamped photos, notes, and condition ratings", pause and resume, countdown reminders "starting three days before the due date", then a review step where the manager can send a "revision request" (https://www.getrentcheck.com/tenant-guided-inspections).
- **PropertyMe** entry inspections are completed digitally, with tenants adding photos, comments and signatures (https://www.propertyme.com.au/features#paperless-inspections).
- **Inventory Hive** keeps "Audit-trailed tenant comment and photo feedback" (https://www.inventoryhive.co.uk/).
- **TurboTenant** condition reports are free and can be completed by "People without a TurboTenant account", who can "add notes, upload photos, and sign from any device" (https://www.turbotenant.com/condition-reports/). Since late 2025 a report can be assigned to any trusted third party by secure link (https://www.turbotenant.com/product-updates/condition-reports-assign-to-anyone/, page updated 30 Oct 2026).
- **zInspector zTenant** and **InventoryBase Self Service** offer the same for move-in, move-out and periodic checks (https://www.zinspector.com/, https://www.inventorybase.co.uk/).
- **RentBetter** sends the report to the tenant "for them to review and complete their part of the inspection if required" (https://rentbetter.com.au/features/condition-report).

**Evidence.** RentCheck: 88% of residents who start an inspection finish it, and a 4.8/5 resident satisfaction rating (vendor claims, https://www.getrentcheck.com/). zInspector: 10M+ inspections, zTenant rated 4.9 from 20,000+ tenant reviews (vendor claims). Inventory Hive: 4.9 from 352 reviews (shown on its own page). In NZ, "refund bond" appears in 42.6% of dispute applications and is the top issue in tenant applications (round one).

**Why it matters.** Tenancy Services says "Both the landlord and tenant(s) should sign, date, and keep a copy of the property inspection report" and "A tenant can't be blamed for any damage that was recorded when the tenancy started" (https://www.tenancy.govt.nz/starting-a-tenancy/new-to-tenancy/initial-property-inspection/, read 14 Nov 2026). A novice landlord skips this and loses the bond claim. A renter who never saw the report cannot contest it.

**Repo today.** `Studio.tsx` is landlord-only. The report (`src/screens/loop/inspections/Report.tsx`) has no tenant signature. Pool shows an upcoming inspection with the tenant's rights on notice, hours and frequency (`InspectionRow` in `src/screens/pool/home/Renting.tsx`), but the tenant cannot see the finished report, comment on it or sign it.

**What changes for New Zealand.**

- A tenant check-in is **voluntary**. It is not an inspection under s 48 and it must never be presented as a duty or carry a consequence for declining (entry rules, `nz-tenancy-law.md` §7).
- It does not replace the landlord's own inspection for insurance. Initio requires an agent to be physically present and allows remote inspections only in rare cases (`operations-domain.md` §4). The screen must say this.
- Photos are limited to "what shows how the property is cared for"; not people, not personal items (Privacy Commissioner guidance, `nz-tax-privacy-payments.md` §2.2). Tell the tenant this before the camera opens, since here the tenant is the photographer of their own home and may share less, not more.
- Inspection reports must be kept during the tenancy and for 12 months after (s 123A).

**What to build.**

- **Entry report, "Your half":** when the landlord finishes the entry inspection, Pool shows it room by room. For each room the tenant taps *Looks right* or adds a comment and a photo. Then both sign. The landlord sees only the differences. Each side keeps a copy.
- A response window set by Loop and marked "not law" (the page read gives no statutory period).
- **Check-in between inspections:** the landlord may ask for six guided photos (for example under the sinks, the heat-pump filter, a smoke alarm test). The request says it is optional and what it will be used for. Declining closes it with no trace on the tenant's record.
- Works offline with the same IndexedDB photo store the studio uses.

---

### 3. Entry against exit, side by side, ending in a bond claim both people can see

**What it is, and who does it best.**

- **Inventory Hive:** "Side-by-side comparisons to inventory in one report", with a "Full audit-trail of tenant comments and photos from inventory to check-out" (https://www.inventoryhive.co.uk/, read 14 Nov 2026).
- **Chapps Rental Inspector:** "Base each property inspection on the previous one", "assign responsibility and record any related costs", a pre-move-out inspection with "a to-do list of everything the tenant still needs to fix", meter readings with a photo of each, and a record of every key handed over (https://www.rentalinspectionapp.com/).
- **SnapInspect** lists "side-by-side comparisons" in its report builder (https://www.snapinspect.com/). **RentCheck** says you can "compare previous inspections with ease". **Cubbi HomeBook** "accurately tracks the condition of your property over time all in one place" (https://www.cubbi.com.au/full-management/homebook).
- **DoorLoop AI Inspections** adds "smart prompts for missing coverage" and a "rapid-shot photo flow" (https://www.doorloop.com/features/inspections).

**Evidence.** Chapps claims at least one hour saved per inspection; SnapInspect claims 75% of inspection time saved (vendor claims). No independent data on dispute reduction was found. The NZ bond figures under pattern 2 are the case for it.

**Why it matters.** The end of a tenancy is where a novice landlord over-claims and a renter gives up money they did not owe. A claim line that cannot be made without an entry photo, an exit photo and a cost is fairer to both.

**Repo today.** The studio shows last time's score and note, not last time's photo. Damage caps are enforced in repairs. `EndTenancy.tsx` ends before the final inspection. Pool's bond card shows lodgement only.

**What changes for New Zealand.**

- A tenant is never liable for fair wear and tear (s 49A). Careless damage is capped at the lesser of the insurance excess and four weeks' rent (s 49B(3)). Asking for more is itself an unlawful act, up to $1,800 (s 49D). The claim builder must refuse a total above the cap with the reason (`nz-tenancy-law.md` §9).
- The exit duty is "reasonably clean and tidy", not professionally cleaned (s 40(1)(e), §10g).
- Refunds run through Bond Hub. The landlord starts the request and every tenant agrees or disagrees online; a landlord has two months from termination to apply without the Tribunal (s 22A, §3).
- **A number to reconcile first:** `nz-tenancy-law.md` records a 10-working-day contest window under s 22A; `nz-tax-privacy-payments.md` §3.2 records a 12-working-day tenant response in Bond Hub. They may describe different steps. Resolve this in `docs/research/` before any countdown is shown.
- A pre-exit visit is an entry and needs the usual notice (s 48).

**What to build.**

- **Exit studio:** each room opens with the entry photo on the left and the camera on the right. The entry photo can be laid faintly over the viewfinder so the exit shot matches it.
- Per item, one verdict: *same*, *fair wear and tear*, *damage*. Damage asks which kind, because the kind sets the cap.
- A claim line needs three things: the entry photo, the exit photo and a cost with its evidence. Without all three it cannot be added, and the screen says which is missing.
- A running total against the cap, with `<Working>`.
- **Pool:** "What your landlord is asking to keep, and why", line by line, each with both photos. Agree or disagree per line. Disagreement goes to the Tribunal pack, not to an argument.
- **Before the last day:** a "leave it like this" list built from the entry report, sent with the lawful notice for a pre-exit visit.
- Meter readings and keys recorded at both ends (see pattern 10).

---

### 4. Pool checks the notice the tenant has just been served

**What it is.** When a rent increase or a notice lands, the renter's side runs the same calculators and says, in plain words, what it could check and what it could not.

**Who does it.** No product read does this for renters. The landlord-side precedents are **Avail's Rent Price Analysis**, a report of up to 10 comparables, six years of trends and vacancy (https://www.avail.com/landlords/rent-analysis, read 14 Nov 2026), and **DoorLoop's Lease Renewal Agent**, which shows its reasoning beside a recommendation that the manager can "Approve, adjust, or take it over" (https://www.doorloop.com/features/lease-renewal-agent). **PropertyMe** can start renewal tasks at a set interval, for example 90 days before expiry (https://www.propertyme.com.au/features#lease-renewals). **Tenancy Services' market rent tool** gives lower-quartile, median and upper-quartile rent from bond data, "updated monthly", covering "the previous 6 months", and says it "should not be used alone to determine the market rent of any property" (https://www.tenancy.govt.nz/rent-bond-and-bills/market-rent/, read 14 Nov 2026).

**Evidence.** None from a competitor, because none was found doing it. The case rests on round one: 91.4% of NZ renters in a self-selecting survey had never used a 14-day notice, and landlords file 84% of applications.

**Why it matters.** This is the cheapest way to make a renter fairly treated, and it uses rules the product already owns.

**Repo today.** `RentReview.tsx` applies the 12-month rule, works out the earliest date by service method and shows one suburb median. In Pool, `NoticeRow` in `Renting.tsx` shows the notice and its source chips but does not say whether it meets the rules.

**What changes for New Zealand.**

- Rent increase: written notice, at least 60 days, not within 12 months of the start or the last increase; on a fixed term only if the agreement allows it (s 24, `nz-tenancy-law.md` §4).
- A tenant on a periodic tenancy may apply for a market-rent assessment at any time; on a fixed term, within three months (s 25).
- No rent recommendation, on either side. RealPage settled with the US Department of Justice over algorithmic pricing (round one). The band is context, not advice.
- Pool must say "we checked these things" and never "this notice is valid". Validity is for the Tribunal.

**What to build.**

- **Pool, on any served notice:** a "What we checked" list. Each line is a rule with its `<Working>`: served on, deemed received on, earliest lawful date, date given. Then a line for what cannot be checked from the record.
- For a rent increase, a band showing where the new rent sits between the quartiles for that area and bedroom count, with the tool's own caveat beside it and a link to how to apply under s 25.
- **Loop, in RentReview:** the same band, and a "how your tenant will see this" preview before the notice is served.
- The same treatment for a fixed-term non-renewal: inside or outside the 90-to-21-day window (s 60A).

**New values the rule pack would need.** Market rent quartiles are data, not law. They need a dated source line and the caveat, and in the prototype they must be labelled as a snapshot.

---

### 5. Paths: a situation walked through from today to the end

**What it is, and who does it best.** A checklist that is built for *this* home and *this* tenancy, in order, with progress.

- **August:** "Every property gets its own checklist, tailored to its nation, type and tenancy", shown as a count ("5 /22 Completed tasks"), with a separate journey for Scotland "rather than adapted from English rules" (https://www.augustapp.com/features/compliance, read 14 Nov 2026).
- **Avail:** federal, state and local requirements "are automatically added for full compliance" to the lease through Local Assist (https://www.avail.com/landlords/rental-lease-agreement).
- **RentBetter:** a step-by-step checklist, a workshop and Q&As for people leaving an agent (see pattern 14).
- **Tenancy Services:** the overdue-rent page is itself written as scenarios.

**How each product explains law to a novice.**

| Product | Method | Source shown beside the rule? |
|---|---|---|
| Avail | Hides it: required clauses and disclosures are added to the lease for you | Not on the pages read |
| August | Step-by-step checklist per property, with separate guide articles | Not on the pages read |
| PropertyMe AiMe Comply | AI answers, "state-based", described as "general guidance, not legal advice" | Not on the page read |
| Goodlord | A "Renters' Rights Act assistant" and hub; the page content could not be read | Unverified |
| TurboTenant | AI lease audit and state-specific leases (round one) | Unverified |
| OpenRent | Agreement prepared and updated by tenancy lawyers; advises against custom clauses | Not on the pages read |
| Loop & Pool | Rule, citation, source link, date checked and the working, at the moment it applies | Yes |

The observation is limited to the pages read, but on those pages nobody else shows the source next to the rule. The prototype's lead here is real. What the others do better is *sequence*: they tell a novice what comes next.

**Repo today.** The Rulebook lists rules and calculators. The assistant answers about 25 topics. The decision screens handle one moment each. There is no walk-through and no glossary.

**What changes for New Zealand.** Nothing new in law. Every step must be a rule already in the pack, or be marked "good practice, not law".

**What to build.**

- A **Paths** tab in the Rulebook, and the same in Pool. Each path is a timeline with today marked on it. Each step is a rule chip, the calculator that applies, and the one button that does the thing.
- First paths, all from rules the pack already has: rent is late; I want to raise the rent; the fixed term is ending; my tenant asked for a pet; I want to sell; something has broken; the tenancy is ending.
- Pool mirrors: I have had a notice; I cannot pay this week; I want a pet; something is broken and nothing is happening; I am moving out.
- A **glossary** popover on the dozen words a novice trips on: periodic, fixed term, address for service, working day, notice to remedy, exemplary damages. Each definition cites its section.
- The assistant's answers link into the matching path instead of ending at a paragraph.

---

### 6. A rent statement the renter can download

**What it is, and who does it best.**

- **Ailo** gives renters "a clear, current view of your rent cycle, tenancy ledger and payment history whenever you need it" (https://ailo.io/renters, read 14 Nov 2026).
- **RentBetter:** "Payments are tracked, the ledger is automatically updated, and receipts are sent to you and your tenant" (https://rentbetter.com.au/features/rental-payments).
- **Azibo** tenants can view their full payment history, to share with future landlords (https://www.azibo.com/rent-payments).
- **Managed App:** "Access your ledgers and history" (https://managedapp.com.au/renters).

**Evidence.** Ailo reports 100,000+ renters on its renter page (vendor claim). No outcome data.

**Why it matters.** Proof of past rent is one of the few kinds of evidence of ability to pay that a NZ renter may choose to give at the preferred-applicant stage (`nz-tax-privacy-payments.md` §2.2). It is the renter's best reference, and today it is locked in a bar chart.

**Repo today.** `RentHero` shows 12 bars. "Download my data" gives JSON.

**What changes for New Zealand.**

- A landlord must give a receipt within 72 hours unless rent arrives by automatic payment from the tenant's own account, and must give a written statement of the period a payment relates to when asked in writing (s 29, `nz-tenancy-law.md` §4).
- Rent records are kept for seven tax years (s 30).

**What to build.**

- **Pool → Rent statement.** Pick a period. Each line: due date, date paid, amount, days early or late, running balance. One total: "52 of 52 paid, 50 on time".
- Print or save as PDF through a print stylesheet. It is headed with who produced it and from what (the landlord's records in Loop), so it does not look like a bank document.
- A button that makes the s 29(3) request in writing. In Loop it becomes an action that is already fulfilled, since the statement exists.
- The statement is what the Rent Passport attaches as "proof of past rent payments".

---

### 7. A listing the landlord builds, with a lawful pre-screen and viewings that ask the sitting tenant first

**What it is, and who does it best.**

- **TurboTenant:** "Build your listing in under 10 minutes", a generated title and description, automatic questions to enquirers, and a scheduler where "Once a renter picks a time, we book them and send reminders" (https://www.turbotenant.com/rental-advertising/, read 14 Nov 2026).
- **Hemlane:** showing times with a start, a duration and an attendee limit; automatic replies with next steps; listing details saved for the next turnover (https://www.hemlane.com/features/).
- **OpenRent:** "Takes less than 5 minutes to create your listing"; listings are removed once let ("No Dead Listings") (https://www.openrent.co.uk/landlords-advertise-property-for-rent-on-rightmove-and-zoopla, https://www.openrent.co.uk/).
- **Landlord Studio:** custom screening questions, limited per plan (https://www.landlordstudio.com/features).

**Evidence.** TurboTenant: "Our landlords average 28 leads per listing" and a tenant "in less than 30 days". OpenRent: average time to let 7 days, and "Most landlords start receiving viewings within 12 hours". All vendor claims with no method given.

**Why it matters.** The prototype's loop is open at this point. A landlord can add a home, run a tenancy and end it, but cannot advertise it. Pool's search has nothing a Loop user made.

**Repo today.** `src/screens/pool/Listing.tsx` and its `ViewingSheet` exist. `Applicants.tsx` handles staged privacy. `parseAdvertisedRent` refuses ranges and "offers over" but is used only in the admin migration screen. No Loop screen creates a listing.

**What changes for New Zealand.** This is where the US pattern must change most.

- The rent must be stated as one amount, and the landlord must not invite or encourage a higher offer (ss 22F, 22G, `nz-tenancy-law.md` §2). No "best offer", no auction, no counter-bid field.
- At the viewing stage a landlord may collect "name and contact details only". Pets and smoking may be asked only if they are restricted. Income, employment status and credit questions at enquiry, which TurboTenant, Hemlane and RentRedi all automate, are out (`nz-tax-privacy-payments.md` §2.2).
- Showing a tenanted home to prospective tenants needs the current tenant's **prior consent**; notice is not enough (s 48(3), §7). The scheduler is a consent flow.
- Inspection photos may not be used for marketing without consent (same privacy source).
- Prospective tenants must be told if the home is on the market (s 47(2)).
- The advertisement must be kept during the tenancy and for 12 months after (s 123A(1)(f)).
- No letting fee to a tenant (s 17A).

**What to build.**

- **Loop → List this home.** The form starts filled from the home's record: bedrooms, bathrooms, Healthy Homes facts, chattels.
- One rent field. Anything other than a single amount is refused with the section.
- Photos chosen from the home's own inspection photos, with a consent request to the sitting tenant where their belongings are in frame.
- Viewing slots. If the home is tenanted, the slots go to the tenant in Pool to accept, move or decline before any are published.
- An enquiry collects a name and a contact, nothing else.
- On publish, a snapshot of the advertisement is filed to Records with its date.
- The listing comes down when an applicant is accepted. The self-healing engine already knows this fault.
- Syndication to Trade Me and others is labelled simulated.

---

### 8. A home guide, and a QR code in the cupboard

**What it is, and who does it best.**

- **TurboTenant Home Guide** (April 2025; page updated 26 Aug 2025): the landlord shares "utility setup instructions, HOA rules, or even how to change the air filter" so renters can answer their own questions (https://www.turbotenant.com/product-updates/introducing-home-guide/, read 14 Nov 2026).
- **Tapi:** tenants report faults by scanning a QR code in the home, which the page says may be under the kitchen sink. There is no login or app (https://www.tapihq.com/solutions/tenants).
- **Canopy MyHome** stores the tenancy agreement and inventory for the length of the tenancy and sends reminders (https://www.canopy.rent/renters).
- **August:** a per-document "Share with tenant(s)" switch; tenants "view and download, but not edit or delete"; an activity tracker shows when a document was opened (https://www.augustapp.com/features/documents).

**Evidence.** TurboTenant's claims are qualitative. Tapi reports one customer saving "up to 75% of the team's time" across the product, not this feature (vendor claim).

**Why it matters.** Half of a first-time landlord's messages are "where is the water shut-off". For a renter at 10pm with water on the floor, the answer has to be on the wall, not in an inbox.

**Repo today.** Pool has seasonal tips (`src/screens/pool/home/tips.ts`) and self-help inside the fault report. `Records.tsx` holds documents the tenant cannot see.

**What changes for New Zealand.** No statutory content. The guide may hold facts about the home, not rules. Anything that sounds like a rule ("you must ventilate daily") is either a pack rule with its source or is left out.

**What to build.**

- **Loop → a Home guide tab per home**, with fixed sections so a novice knows what to write: water shut-off, switchboard, heating and ventilation, alarms, rubbish days, what is an emergency and who to call, where the fibre box is, appliance manuals.
- Sections fill from records where the product already knows (assets, smoke alarm locations, heater model).
- A share switch on each document in Records, with "opened on" shown to the landlord.
- A printable card with a QR code that opens Pool's fault report for that home. In the prototype it opens the route; it is labelled as a demo link.
- **Pool:** the guide sits beside the fault report, and self-help steps point into it.

---

### 9. One thread per tenancy, on the record

**What it is, and who does it best.**

- **August:** "Choose Direct for one tenant, Group for a household, or Broadcast for everyone." "Tenants on the app get it instantly. Anyone else gets it by email or SMS", and replies return to the same thread. "Read receipts so you know when a tenant has seen it." "Every message timestamped and kept in one place." The landlord can switch tenant messaging off (https://www.augustapp.com/features/messaging, read 14 Nov 2026).
- **Ailo:** "Keep the question, the answer and the context together" (https://ailo.io/renters).
- **PropertyMe Chat:** no message limits, read receipts, push (https://www.propertyme.com.au/features#chat).
- **DoorLoop:** "Track every message, including who viewed it and when" (https://www.doorloop.com/features/communication-tools).
- **Translation:** RentRedi's tenant app follows the phone's language ("Language follows the tenant's device settings"; page published 13 Nov 2026, https://rentredi.com/spanish-tenant-app). SnapInspect translates reports into "any global language" (https://www.snapinspect.com/ai-powered-multi-language-property-inspection-software). zInspector takes an inspection spoken in any language and writes the report in English (https://www.zinspector.com/). None of the three says it translates messages or notices.
- **Tapi** chooses not to offer chat: "No, we communicate through email."

**Evidence.** No outcome numbers. August links its archived threads to ombudsman and deposit disputes. The regulator's advice in round one was "document everything".

**Why it matters.** A novice landlord's records are scattered across texts and emails. When a dispute comes, neither side can show what was said.

**Repo today.** No landlord–tenant messaging and no language setting anywhere in `src/`.

**What changes for New Zealand.**

- A landlord must keep "notices and correspondence with the tenant" during the tenancy and for 12 months after (s 123A(1)(g), `nz-tenancy-law.md` §5). The thread is that record.
- A message is **not** service of a notice. Electronic service counts only to an electronic address the person gave as an address for service (s 136(1)(d), §1). The thread must show notices as notices, served by their own route, and say so.
- Broadcast marketing to tenants is out: tenant contact details must not be used to promote an unrelated business (Privacy Commissioner, `nz-tax-privacy-payments.md` §2.2).
- A translation of a notice is a courtesy, never the legal text. Show both, label the translation. Which languages to offer first is a product decision; no source was checked.

**What to build.**

- A thread per tenancy in Loop and Pool. Notices, variations, inspections and repair events post into it as system lines, so the thread is also the shared timeline the product lacks.
- "Seen" shown to both sides.
- Openers for hard conversations (rent is late, booking an inspection, a heads-up before a rent increase), written from the rule pack with source chips. They are starting points to edit, not letters to send.
- Export to PDF for the Tribunal pack, with the existing redaction.
- A language preference on the Pool profile.
- **Needs a backend:** delivery by email or text to people not in the app, replies coming back to the thread, and any real translation. In the prototype the thread works between the demo personas and the delivery is labelled simulated.

---

### 10. Moving in and moving out, as two checklists that belong to the renter

**What it is, and who does it best.**

- **Goodlord Tili:** "a digital home-moving assistant" for energy, water, council tax and broadband, "free to use" (https://www.goodlord.com/tenant-solutions/tili, read 14 Nov 2026).
- **Canopy:** bundled utilities, removals, renter insurance from £22.44 a month, and MyHome for documents (https://www.canopy.rent/renters).
- **Renti (NZ):** "Supercharged utility connections" with twelve partner logos. The names are not in the page text; three appear from image filenames to be Lodestone, Spark and Genesis (unverified) (https://www.renti.co/renters).
- **RentBetter:** connections through Move Me In. The page does not say whether RentBetter is paid for referrals (https://rentbetter.com.au/extras/utilities).
- **Kolmeo Plus:** "Electricity, gas, broadband setup", removalists and storage (https://kolmeo.com/tenants). Round one found Kolmeo's core plan becomes free once referral income reaches $1 per property.
- **Chapps Rental Inspector:** meter readings and keys recorded inside the handover report (https://www.rentalinspectionapp.com/).
- **Ailo:** renters can see upcoming inspections and look back at past ones (https://ailo.io/renters).

**Evidence.** No adoption or satisfaction numbers on any page read. The commercial evidence is that several platforms fund themselves this way.

**Why it matters.** Move-in week is when a renter forms their view of the landlord, and when a novice landlord forgets a step that costs them later.

**Repo today.** Pool has a bond card. Nothing else for moving in or out.

**What changes for New Zealand.**

- The tenant pays electricity, gas, phone and internet, and water only where it is charged on consumption (s 39, `nz-tenancy-law.md` §4). That is why meter readings matter at both ends.
- A copy of the signed agreement must reach the tenant before the tenancy starts, with the Healthy Homes and insurance statements (ss 13, 13A, §5).
- A landlord must permit fibre installation in most cases and answer a request within 21 days (s 45B, §8).
- Connections must be the renter's own choice, started by them. No contact details go anywhere until they tap. Any payment to the platform is stated beside the link.
- Refund steps follow Bond Hub (see the number to reconcile under pattern 3).

**What to build.**

- **Pool → Moving in.** Built from the tenancy: sign the agreement; pay the bond and watch the lodgement countdown from the renter's side; complete your half of the entry report; photograph the meters; set up your automatic payment with your reference; power and internet (links out, with a plain line on whether Pool earns anything); keys received, counted.
- **Pool → Moving out.** Notice dates with their working; the "leave it like this" list; final meter photos; keys returned; the bond refund as a tracker with each step and who is waiting on whom.
- **Loop** sees the same list from the other side, as one row per step, so neither has to ask.

**New values the rule pack would need.** None for the checklist. Any named provider needs a real agreement and a disclosure line.

---

### 11. A tax-time pack: receipt on the expense, trips logged, one bundle for the accountant

**What it is, and who does it best.**

- **Hammock:** a tax statement "updated in real-time" and mapped to the UK return's categories, an estimate of the bill, "all your receipts in one place", and "Invite your accountant to access" reports and documents. Prices from £8 a month for one to three properties (https://www.usehammock.com/property-tax-software/, https://www.usehammock.com/, read 14 Nov 2026).
- **Baselane:** "Instantly generate tax packages with ledgers, receipts, and statements for every entity and property" (https://www.baselane.com/tax-preparation).
- **Stessa:** the app's smart scan "processes and categorizes your receipts with just a few clicks" (https://www.stessa.com/accounting/).
- **Landlord Studio:** a receipt scanner and a mileage tracker on every plan, including the free one (https://www.landlordstudio.com/features). **Lendlord** also logs property visits for tax (https://www.lendlord.io/solutions/manage/portfolio-management/).

**Evidence.** Stessa says investors save "up to $4,000" and "100+ hours" a year (its own customer survey, July 2022). Hammock says a tax statement takes "30 minutes" with real-time bookkeeping. Both are vendor claims.

**Repo today.** `Money.tsx` produces an IR3R-shaped schedule and two CSV exports. `AddExpense` has NZ tax categories and a repair-or-improvement explainer but no receipt photo. An accountant can be invited read-only (`src/screens/loop/settings/People.tsx`).

**What changes for New Zealand.**

- Travel to inspect or repair is deductible, by IRD kilometre rates with a logbook; with no records the deduction is limited (`nz-tax-privacy-payments.md` §1.2).
- Tax records are kept seven years (same file, §1.3).
- Do not show a "tax bill". That depends on the owner's other income. Show net rental income for the tax year so far and the existing ring-fencing and interest notes. Nothing here is tax advice, and the screen says so.

**What to build.**

- Camera or file on `AddExpense`. The image is stored with the ledger line, using the photo store the inspection studio already has.
- A trip log: date, which home, purpose, kilometres. It feeds the schedule's "other" line.
- **For my accountant** becomes a bundle: the schedule per home as a printable page, the ledger CSV, and the receipts in a zip named by ledger line.
- A count on the Money screen of expenses with no receipt, as a gentle prompt before 31 March.

**New values the rule pack would need.** The IRD kilometre rate for the year, with its source, before any trip is turned into dollars.

---

### 12. Deadlines in your own calendar, a short digest, and a say over what reaches you

**What it is, and who does it best.**

- **Lendlord:** "see every property job on one calendar, spot what's overdue, and sync it all to your own calendar" (https://www.lendlord.io/solutions/manage/portfolio-management/, read 14 Nov 2026).
- **August:** reminders by "push, email, or SMS", "at multiple points before each deadline, not just once", and custom recurring reminders such as boiler servicing and mortgage review dates (https://www.augustapp.com/features/reminders).
- **Hammock:** "instant notifications about all payments" plus periodic summaries (https://www.usehammock.com/property-tax-software/).
- **Ailo:** investors "See the moment rent is paid", with optional email when income is transferred (https://ailo.io/investors).
- **PropertyMe:** compliance tracking for smoke alarms, pool certificates and insurance renewals, with colour alerts (https://www.propertyme.com.au/features#compliance).

**Evidence.** None quantified.

**Repo today.** The action queue and "Coming up" are the only reminders. No calendar file, no digest, no preferences. Smoke alarms recur yearly; nothing else does.

**What changes for New Zealand.** Each calendar entry should carry its working and the pack version in the description, so a date in someone's calendar can still be traced to its rule. Preventative items that are not law (gutters yearly is a product default in `nz-property-compliance.md`) are marked "good practice, not law". How often a tenant may be reminded about rent before it stops being reasonable was not checked; keep the cadence modest and visible to both.

**What to build.**

- **Add to my calendar:** a calendar file of every dated obligation for a home or the whole portfolio.
- **Since you were last here:** one card at the top of the command centre. Rent in, rent late, deadlines that moved closer, anything a tenant sent.
- A home-care plan per home made from its assets and Healthy Homes items, each with its label.
- Preferences: which events, which channel. Email, text and push are labelled simulated until there is a backend.

---

### 13. Drop in a document; it files itself and suggests the reminder

**What it is, and who does it best.** **August's Magic Upload:** "August scans uploaded documents for expiry dates", links each document "to the right property and tenancy automatically", and the landlord can "accept, adjust, or dismiss each suggested reminder". Documents can also be forwarded to a personal address (https://www.augustapp.com/features/documents, read 14 Nov 2026). August's compliance page adds: "Upload a certificate and August reads the expiry date, then sends reminders before it's due."

**Evidence.** August reports 3,000+ UK landlords and tenants (vendor claim). No accuracy figures.

**Repo today.** "Add a home" reads a tenancy agreement PDF and marks each field "Read from the PDF … Check it". `Records.tsx` lists documents with no files. The insurance record that drives the inspection rhythm and the insurance statement has no entry screen.

**What changes for New Zealand.** The insurance statement in the agreement must include the excess (s 13A(2), `nz-tenancy-law.md` §5), and insurers set inspection intervals (AMI at least every six months, Initio every three; `nz-property-compliance.md`). An insurance schedule is therefore the most useful second document to read. Anything read from a document is shown as read, never as verified.

**What to build.**

- **Records → Add a document.** Drop a PDF. The existing reader pulls insurer, policy number, renewal date and excess from an insurance schedule; or the test date from a smoke-alarm invoice; or the dates from a Healthy Homes report.
- Each field appears as "Read from the PDF … Check it", as on "add a home".
- Suggested reminders with accept, change or dismiss.
- The file itself is kept, so Records stops being a list of names.
- A typed form for the same fields, so the insurance policy can be entered by hand today.
- **Needs a backend:** forwarding by email, and reading photographed paper.

---

### 14. A switch kit for taking over from a property manager

**What it is.** **RentBetter's Agent Switch Kit**, free: a step-by-step checklist, a termination letter to the agent, an email to the tenant, and Q&As (https://rentbetter.com.au/toolkit/agent-switch-kit, read 14 Nov 2026). The page does not describe notice periods, documents to request or bond transfer.

**Evidence.** No numbers. It is RentBetter's way in for owners who already have a tenant; RentBetter says it is profitable and raised A$5m in September 2026 (round one). About 55% of NZ private rentals are managed (HUD, round one), so most prospective Loop users arrive this way.

**Repo today.** `savingsVsManager` shows the saving. The team console can import a rent roll from CSV. Nothing guides the owner through the change.

**What changes for New Zealand.**

- When the landlord's contact details or address for service change, the tenant must be told within 10 working days (s 16), and Tenancy Services too while a bond is held (s 21A) (`nz-tenancy-law.md` §§3, 5).
- The records to collect are the ones the landlord must hold: agreement and variations, inspection reports, maintenance and Healthy Homes records, the advertisement, correspondence (s 123A), and rent records for seven tax years (s 30).
- The notice period for ending a management agreement is a matter of that contract. The kit must say so and state no period.
- The change of landlord in Bond Hub is recorded in repo research as secondary-verified only. Verify before building that step.

**What to build.** A path (pattern 5) called "Taking over from a property manager": the list of records to ask for and why each matters; a letter to the manager; a letter to the tenant with the new payment details and address for service; the two 10-working-day clocks with their working; then "add a home" with the agreement PDF.

---

### 15. "Was it fixed?", and a visit time the tenant picks

**What it is, and who does it best.**

- **Kolmeo CustomerGauge** sends a short survey at "lease commencements, routine inspections, maintenance completions, and tenancy vacate" (https://kolmeo.com/customergauge, read 14 Nov 2026).
- **TurboTenant's** showing scheduler ("Once a renter picks a time, we book them and send reminders") and **Hemlane's** slots show the booking pattern, though for viewings, not repairs.
- **Tapi** tells the tenant when a trade is assigned but does not let them book. No product read confirmed tenant-picked slots for repairs (unverified).

**Evidence.** None quantified.

**Repo today.** The tenant sees a five-step status and a timeline (`src/screens/pool/repairs/TicketSheet.tsx`). Provider ratings are display only. Entry-notice checks exist for repairs. Slot picking exists only for viewings.

**What changes for New Zealand.** Entry for necessary repairs needs at least 24 hours' notice, between 8am and 7pm, unless the tenant consents "at, or immediately before, the time of entry" (s 48, `nz-tenancy-law.md` §7). A slot chosen days earlier may not be that consent, so the notice is still served.

**What to build.** One question in Pool when a job is marked done: *fixed*, *not fixed*, or *fixed, but*. "Not fixed" reopens the ticket with its clock intact. Answers feed the provider's rating. When a tradesperson is assigned, the tenant picks from offered times, and the entry notice is generated for the chosen one.

---

### 16. Applying as a household, with co-tenants and a guarantor

**What it is, and who does it best.**

- **Snug:** apply solo or as a household; a joint application is one tick (https://snug.com/renter, read 14 Nov 2026).
- **Canopy:** a guarantor "can join the process seamlessly" and completes a RentPassport "just like tenants" (https://www.canopy.rent/renters, https://www.canopy.rent/agents).
- **Avail:** renters can split payments with roommates (https://www.avail.com/landlords/online-rent-collection). **TurboTenant:** roommates can split rent where partial payments are on.
- **August:** a Group thread for a household.
- **OpenRent** admits the gap: it "does not currently offer multiple Verified Tenant applications" (https://www.openrent.co.uk/verified-tenant).
- **Flatmates.com.au** could not be read (unverified).

**Evidence.** None quantified.

**Repo today.** Housemates are listed. There is a `flatmate_change` variation type. No joint application, rent shares or guarantor.

**What changes for New Zealand.**

- A guarantee is the one extra form of security a landlord may take (s 18A(3)(b)(ii), `nz-tenancy-law.md` §3).
- For occupants who will not be on the agreement, a landlord may collect names only (`nz-tax-privacy-payments.md` §2.2).
- A change of tenant on the bond needs every tenant's response, and one "disagree" cancels it (§3.2 of the same file).
- Rent shares are a record of who pays what. The product never collects or splits money.
- The difference in law between a tenant and a flatmate who is not on the agreement was not checked for this report.

**What to build.** In Pool, "Applying with others": invite co-applicants, each with their own Passport and their own consent at each privacy stage. The landlord sees one household with per-person verified facts. A rent-shares view gives each person a reference so the bank-feed matcher can add the parts up. A flatmate change ends in the Bond Hub steps. **Needs a backend** to be real: separate people on separate devices.

---

### 17. A Rent Passport that travels: a link with an expiry, a view log and a way to take it back

**What it is, and who does it best.**

- **Canopy:** "Fill it out once and use it whenever you move." The renter shares the completed passport and, if no agent invited them, can connect with any prospective agent or landlord. Agents request one "via email or using a share link" (https://www.canopy.rent/renters, https://www.canopy.rent/agents, read 14 Nov 2026).
- **Snug:** "Reuse a profile to apply anywhere"; a background check costs $19.95 and lasts six months (https://snug.com/renter).
- **OpenRent Verified Tenant:** £10, a badge on every enquiry, valid 60 days (https://www.openrent.co.uk/verified-tenant).

**Evidence.** Canopy: referencing in "an average of 1.75 days", 140,000 references a year, 1,000+ agent partners. OpenRent: "Landlords are 89% more likely to rent to Verified Tenants". All vendor claims.

**Repo today.** `src/screens/pool/Passport.tsx` shares a text summary through the share sheet or clipboard. A renter can link an off-platform tenancy and invite that landlord.

**What changes for New Zealand.** A landlord may keep an application for re-use only if the applicant asks; unsuccessful applicants' details are kept only briefly; credit checks happen only at the preferred-applicant stage (`nz-tax-privacy-payments.md` §§2.2–2.4). So the link carries verified facts, never documents, and it expires. The renter never pays. Nothing about a share may affect ranking.

**What to build.** Share → choose which facts, how long (7, 14 or 30 days, marked as Pool's choice, not law), and to whom. A log of when it was opened. Revoke at any time. A printable page. **Needs a backend:** a link someone else can open and trust. A locally made file or code could not be verified by the person receiving it, so the prototype must not present one as verified.

---

### 18. Smaller patterns

| Pattern | Who does it (read 14 Nov 2026) | Repo today | What to build |
|---|---|---|---|
| Coverage prompts in the inspection studio | DoorLoop: "smart prompts for missing coverage" (https://www.doorloop.com/features/inspections). zInspector: walk and talk, report written for you, works offline (https://www.zinspector.com/) | Scores, flags, notes, photos, automatic summary | "You have not photographed the smoke alarm in the hall." Dictation through the phone keyboard needs no code. AI-written condition text needs a backend and a rule that it never invents a finding |
| Fixed-rate end dates and a portfolio view | Lendlord: values, equity, mortgages and cash flow in one view; a one-click wealth report. August: custom reminders for "mortgage review dates" | Balance, rate, LVR, yield and a sinking-fund forecast per home | Add the fixed-rate end date and remind ahead of it. One portfolio page. No lending advice |
| One-tap approvals with the reason shown | :Different: maintenance options "ready for a 'tap' to instantly approve" (https://different.com.au/). DoorLoop: "Every agent starts with your approval on each action" | Auto-approve limit and quotes already exist | Nothing new; the repo matches this |
| Guest links for people without an account | TurboTenant condition reports by secure link; Tapi's no-login concierge; August's email and text fallback | Invite to an off-platform landlord only | Referees, a relative inspecting for an owner overseas, a tradesperson's invoice. Needs a backend. Note s 16A: a landlord out of NZ for more than 21 days must appoint an agent |

---

## Seen and rejected

| Pattern | Who does it | Why not |
|---|---|---|
| Automatic late fees | Avail, TurboTenant, Baselane, Stessa, Hemlane, Azibo, Landlord Studio | Of no effect in NZ (RTA s 32). Also the opposite of what works: the regulator says talk first |
| Holding or routing rent | OpenRent (a unique account per tenancy), Managed App (renter wallet), Baselane (banking) | The product never holds rent. Doing so plausibly brings financial-service and AML duties (`nz-tax-privacy-payments.md` §3.4) |
| Holding deposit forfeited if the tenant withdraws | OpenRent Rent Now (one week's rent) | Key money is prohibited; the only exception is an option fee of up to one week's rent that is refunded or applied to rent (s 17). Not worth the risk |
| Paid priority for renters | OpenRent Verified Tenant (£10 moves enquiries "to the top of landlords inboxes"; "Tenant Insights" shows rival interest) | Pool never charges a renter, and showing rival interest is pressure to offer more. Keep the verified badge; drop the fee and the rivalry |
| A match score | Snug (factors include "market conditions") | Round one: regulatory action against scores; SA bans ratings that reflect higher offers |
| Income and credit questions at first enquiry | TurboTenant, Hemlane, RentRedi | Viewing stage is name and contact only under Privacy Commissioner guidance |
| Bank statements and payslips uploaded to a profile | Snug ("Add tenant ledgers, payslips, bank statements") | Transaction-level bank statements are on the never-collect list |
| "Always optimal rent" and AI rent recommendations | Cubbi, DoorLoop's renewal agent | RealPage precedent; the product gives context, not a price |
| AI agents that talk to tenants and act on their own | DoorLoop (five agents), AppFolio, Buildium | The assistant never guesses. A person decides. Independent evidence is thin and the failures are public (round one) |
| Rent reporting to credit bureaus, paid by the renter | TurboTenant ($4.99 a month, TransUnion), RentRedi, Avail CreditBoost, Azibo | Whether positive rent data can go on NZ credit files is still unverified, and it charges the renter. The Rent Passport already does the job without a bureau. RentRedi's "13% increase in on-time payments" is its own data |
| Rewards and card fees on rent | Renti Rewards, Azibo (2.99%), TurboTenant (3.49%) | Fees fall on renters; the product does not touch payments |
| Selling insurance or rent guarantees | OpenRent (£299 a year), Goodlord, Canopy, Baselane, Azibo | Regulatory position in NZ not researched; commission conflicts with "fairly treated". Track the landlord's own policy instead (pattern 13) |
| Staff-shot video condition report, "Maximum Bond" | Cubbi ("The renter does not get their bond back until the place is as it was when they moved in") | Adversarial framing and wrong for NZ: fair wear and tear is never the tenant's cost |
| Self-guided tours with ID and biometrics | Hemlane | Biometric Processing Privacy Code; tenanted homes need the tenant's consent to any showing |
| Broadcasts, campaigns and announcements to tenants | DoorLoop, August (Broadcast) | A one-to-four home landlord has no audience; tenant contacts must not be used for promotion |
| Landlord community forum | TurboTenant | Peers giving legal advice with no source is the thing this product exists to replace |
| Satisfaction dashboards and revenue attribution | Kolmeo CustomerGauge | An agency tool. Only the one-question pulse is kept (pattern 15) |
| Cash rent at retail counters | RentRedi (90,000+ US locations) | Not relevant to NZ |

---

## Ranked table

Value is to a first-time landlord or a renter. Differentiation is against the NZ field found in rounds one and two, where myRent's current feature set remains unverified. Effort is for the prototype. "Backend" means the pattern cannot be shown honestly without one.

| Rank | Pattern | Value to user | Differentiation | Effort | Needs a real backend |
|---|---|---|---|---|---|
| 1 | Catch-up arrangement the tenant can see, with FastTrack hand-off | High, both sides | High | Medium | No |
| 2 | Tenant completes their half of the entry report; optional check-ins | High, both sides | High | Medium | No |
| 3 | Entry against exit, side by side, ending in a shared bond claim | High, both sides | High | Large | No |
| 4 | Pool checks the notice the tenant was served, with a market-rent band | High, renter | High | Small | No |
| 5 | Paths and a glossary | High, landlord | High | Medium | No |
| 6 | Rent statement the renter can download | Medium to high, renter | Medium | Small | No |
| 7 | Listing builder with lawful pre-screen and consent-based viewings | High, landlord | Medium | Large | No (syndication: yes) |
| 8 | Home guide, shared documents and a QR code for faults | Medium, both | Medium | Small | No |
| 9 | One thread per tenancy, on the record | High, both | Medium | Medium | Partly: thread no; delivery and translation yes |
| 10 | Moving in and moving out checklists, with meter readings and a refund tracker | High, renter | Medium | Medium | No (real connections: yes) |
| 11 | Tax-time pack: receipts, trips, accountant bundle | Medium to high, landlord | Low to medium | Medium | No |
| 12 | Calendar export, digest and reminder preferences | Medium, landlord | Low | Small | Calendar and digest no; email, text and push yes |
| 13 | Document intake that suggests reminders; insurance entry | Medium, landlord | Low to medium | Medium | No (email-in and photo reading: yes) |
| 14 | Switch kit for leaving a property manager | Medium, landlord | Medium | Small | No |
| 15 | "Was it fixed?" and tenant-picked visit times | Medium, renter | Low | Small | No |
| 16 | Household applications, co-tenants, guarantor, rent shares | High for shared homes | Medium | Large | Yes |
| 17 | Passport link with expiry, view log and revoke | Medium to high, renter | Medium | Medium | Yes |
| 18 | Coverage prompts in the inspection studio | Low to medium | Low | Small | No (AI wording: yes) |
| 19 | Fixed-rate end dates and a portfolio view | Low to medium, landlord | Low | Small | No |

---

## Before any of this is built

1. **Reconcile the bond refund response window** (10 working days in one research file, 12 in the other) and record the answer in `docs/research/`.
2. **Source the new values** named above: FastTrack eligibility and timings, the IRD kilometre rate, the market-rent data line. Each needs a file in `docs/research/` and an entry in the rule pack before a screen reads it.
3. **Check two points of law not covered by existing research:** whether an agreed catch-up arrangement affects overdue-rent notices, and the status of a flatmate who is not on the agreement.
4. **Re-read myRent by hand.** It is the one direct NZ competitor and its site blocks automated reading. Whether it already has tenant-countersigned inspections, a listing builder or messaging decides how much of the "differentiation" column holds.
5. **Vendor numbers are marketing.** Not one statistic in this document was independently verified. None should appear on a Loop or Pool screen.

---

## Products read, and what each gave

| Product | Pages read | Main thing taken |
|---|---|---|
| Avail | Lease builder, rent analysis, rent collection | Local clauses added automatically; rent report contents; roommate split |
| TurboTenant | Product updates, Home Guide, condition reports (two pages), rental advertising, rent payments, rent reporting, Maintenance AI | Home Guide; reports anyone can complete by link; listing and showing flow |
| RentRedi | Features, Spanish tenant app, credit reporting | Device-language tenant app |
| Stessa | Home, accounting | Receipt scan |
| Baselane | Home, tax preparation | Tax package contents |
| Hemlane | Features | Showing slots with attendee limit |
| Innago | Home only | Nothing confirmed (unverified) |
| DoorLoop | Features, three agent pages, inspections, communications | Commitment tracking; coverage prompts; reasoning shown with approvals |
| Buildium | Features | Nothing new confirmed |
| Azibo | Home, rent payments | Payment history to share with future landlords |
| OpenRent | Home, Rent Now, Verified Tenant, rent collection, advertising | Rent Now sequence; verified badge (fee rejected) |
| Goodlord | Home, Tili, Renters' Rights Act assistant (unreadable) | Move-in connections |
| Hammock | Home, property tax | Real-time tax statement, accountant invite |
| Lendlord | Home, portfolio management | Calendar sync, trip log |
| August | Home, compliance, messaging, documents, reminders | Per-property checklist; thread design; document intake; reminder cadence |
| Canopy | Home, renters, agents | Passport sharing, guarantor, MyHome |
| RentBetter | Home, condition report, rental payments, utilities, switch kit | Switch kit; tenant's part of the report |
| :Different | Home | One-tap approvals |
| Cubbi | Home, HomeBook, digital inspections, new renter move-in | Condition tracked over time (framing rejected) |
| Managed App | Home, renters | Renter ledger (wallet rejected) |
| Kolmeo | Home, tenants, CustomerGauge | Pulse after a repair; connections |
| PropertyMe | Features | Tenants add photos, comments and signatures to entry reports; arrears schedules |
| myRent | Blocked | Unverified |
| Renti | Home, renters | Utility connections in NZ |
| Tenancy.co.nz | Home, partly | Now a property-manager product |
| Inspection Express | Blocked | Unverified |
| Chapps | Home, Rental Inspector | Inspection built on the previous one; responsibility and cost per item; meters and keys |
| SnapInspect | Home, remote inspections, multi-language | Side-by-side reports; translated reports |
| zInspector | Home | Tenant inspections; spoken inspections |
| RentCheck, Inventory Hive, InventoryBase | Home and feature pages | Tenant-led inspection flow; side-by-side check-out; audit trail of tenant comments |
| Landlord Studio | Features | Receipt scanner and trip log on the free plan |
| Tapi, Bricks+Agent (PropTech Labs) | Home, tenants | QR code, no login |
| Flatmates.com.au | Blocked | Unverified |
| Rello | Home | Not a renter product |
| Ailo | Home, renters, investors | Renter ledger; inspections visible to the renter |
| Snug | Home, renter | Household applications (score rejected) |
| Tenancy Services | Overdue rent, FastTrack Resolution, initial property inspection, market rent | The NZ shape of patterns 1, 2 and 4 |
