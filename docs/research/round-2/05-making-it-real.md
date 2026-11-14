# Round 2, report 05: making the simulated things real

Prepared 14 November 2026 for Loop & Pool. Question: for each thing the prototype simulates, what is the real way to do it in New Zealand in late 2026, who provides it, how you get access, what it costs, how long it takes, what the law requires, and what is the cheapest credible path for two people. Australia, briefly, at the end.

This builds on `docs/research/nz-tax-privacy-payments.md` (round one). It does not repeat it. Where this report corrects round one, section 0.3 says so.

## 0. How to read this

### 0.1 Confidence labels

| Label | Meaning |
|---|---|
| **[P]** | Read today on the provider's or regulator's own page, or in the statute or regulation text on legislation.govt.nz. For a vendor, [P] means "the vendor says so on its own site", nothing more. |
| **[R1]** | Carried from round one, where it was primary-verified. Not re-read today. |
| **[U]** | Unverified. Not confirmed on a provider's or regulator's own page today. Treat as a question to ask, not a fact. |

### 0.2 Limits of this research

- **Web search was not available.** The shared search allowance for this session was already used up before my first query. Everything here comes from opening known addresses directly and following links from those pages. I could not run discovery searches, so I cannot rule out providers or programmes I did not already know to look for.
- **mbie.govt.nz blocked every request** (bot protection, an "Incapsula incident" page). MBIE's open-banking pages, its accreditation guidance, the open-banking standards and the public register of accredited requestors were **not read**. The Customer and Product Data Act and all four sets of regulations were read in full on legislation.govt.nz instead, which is better evidence for fees and rules but says nothing about MBIE's processing times.
- Other failures: `tinz.net.nz` did not resolve; OAIC (Australia) returned 403; Trade Me's help centre and several Australian regulator pages refused the fetch tool but answered a plain direct request, and were read that way.
- Vendor pages were summarised by a small model before I saw them. Statute and regulation text was read directly. Where a price matters to a decision, re-open the page before signing anything.
- A general election was held on 7 November 2026 and a government had not been formed at the time of writing [R1]. The proposed registration of residential property managers (section 8.5) is the item most exposed to that.
- This is product research. It is not legal advice. Section 10.3 lists the questions that need a lawyer or a phone call.

### 0.3 Corrections to round one

| Round one said | What the regulations say | Source |
|---|---|---|
| Banks may charge capped fees: 5 cents per payment request, 1 cent per data call (from a law-firm summary of Cabinet decisions) | **Banks must not charge anything** for a regulated data service. Exceptions: a charge agreed for a higher level of performance than the Act requires; a charge agreed for responding in a non-default way the standards allow; and the customer's ordinary account fee for making a payment | Customer and Product Data (General Requirements) Regulations 2025, reg 9 (as at 8 Oct 2026) [P] |
| Accreditation fees and levies: not found | Application fee **$1,500** (or **$2,000** for an intermediary class); renewal **$1,000** (or **$1,700**); annual levy **$1,300** for a requestor with New Zealand revenue of $1 million or less, rising to $85,000 above $100 million. All plus GST | Customer and Product Data (Fees) Regulations 2025 (SL 2025/242) regs 5–7; (Levies) Regulations 2025 (SL 2025/243) Schedule 2 [P] |
| Reminder to customers "at least every 12 months" (secondary) | Confirmed: written notice of the scope of each live authorisation within 12 months of it being given and at least every 12 months after, including how to end it | General Requirements Regulations reg 12 [P] |
| Kiwibank account data from 1 December 2026 | Confirmed in the regulations (Schedule 1 clause 1 of the Designation Regulations). Akahu says Kiwibank "delivered the same APIs on 28 May 2026" | SL 2025/228 Sch 1 cl 1 [P]; akahu.nz transition article, updated 28 May 2026 [P vendor] |
| Trade Me rental listing fees unverified | Read today: see section 3 | Trade Me help centre "Property fees" [P] |

---

## 1. Summary

| The prototype simulates | The real thing | Gate | Cost to the platform | Lead time |
|---|---|---|---|---|
| Bank feed | Akahu, as accredited intermediary, reading the landlord's own account | Akahu contract, due diligence, privacy-notice review and app review. No MBIE accreditation of our own | "Typically" NZ$0.50–$2.50 per connected user per month [P vendor]; exact price by quote | Not published [U] |
| Bond Hub hand-off | Tenancy Bond API v3 (MBIE), or a guided hand-off to Bond Hub | MBIE API team approves the subscription; landlord consents with RealMe; landlord pre-registers direct debit or direct credit | No API fee stated [P] | Not published [U] |
| Listing syndication | Trade Me and realestate.co.nz both take private rental listings direct from the landlord. Trade Me's public API rules exclude apps that serve non-trade users | A commercial conversation with Trade Me Property; nothing self-serve | Listing fee is the landlord's, paid to the portal | Unknown; discretionary |
| Applicant checks | Centrix Tenancy Check (credit plus Tribunal files); Ministry of Justice criminal record (third-party contract, $13); identity by Stripe Identity (NZ$2) or Akahu ($1) | Subscriber agreement with the bureau; contract with Justice | Per check, passed on. Centrix price not public [U] | Unknown [U] |
| E-signing | Electronic signatures are valid for tenancy agreements if both parties agree. Build it, or buy it from US$30 a month | None | NZ$0 if built; US$30–$250 a month if bought | Days |
| Email and text delivery | Transactional email from US$0–$20 a month. Texts to NZ numbers need a dedicated short code; no branded sender names | Domain authentication for email; 5–6 weeks to provision a short code | Email cheap; text US$0.105 a segment plus short-code rental [U] | Email: a day. Text: 5–6 weeks |
| Billing (our own fees) | Stripe Billing, NZD | Stripe account for a NZ company | 2.65% + NZ$0.30 per domestic card charge, plus 0.7% of billed volume | Days |
| Payments to tradespeople, with commission | Stripe Connect with direct charges (the tradesperson is the merchant), or simply invoice the commission | Stripe Connect approval; legal check on AML and FSP position | NZ$0 if Stripe prices the connected accounts; otherwise NZ$2 per active account per month plus payout fees | Weeks, mostly the legal check |
| Storage and accounts | Supabase, Sydney region. No NZ region exists | None | US$25 a month to start | A day |
| Being a business | NZ company; privacy officer; terms; insurance by choice | Companies Office | NZ$148.05 once; NZ$57.20 a year | Days |

**The order that follows from this** is in section 11, and what it changes in the product today is in section 11.5: company, hosting and email first; the Akahu, Bond API and Trade Me conversations started in month one because their lead times are unknown; money to tradespeople last, after a lawyer has looked at it.

---

## 2. Bank feeds that read a landlord's own account

### 2.1 What exists

**The law.** The Customer and Product Data Act 2025 (2025 No 14, version as at 24 January 2026) [P] sets up the regime. Four sets of regulations, all in force from 1 December 2025, fill it in:

| Instrument | What it does | Read |
|---|---|---|
| Customer and Product Data (Designations for Banking and Other Deposit Taking) Regulations 2025, SL 2025/228 (as at 29 May 2026) | Names the banks, the data, the payment action and the classes of accreditation | [P] |
| Customer and Product Data (General Requirements) Regulations 2025, SL 2025/229 (as at 8 Oct 2026) | No-charge rule, 12-month notices, accreditation criteria, what an intermediary must check about its clients | [P] |
| Customer and Product Data (Fees) Regulations 2025, SL 2025/242 | Accreditation and renewal fees | [P] |
| Customer and Product Data (Levies) Regulations 2025, SL 2025/243 | Annual levies | [P] |

**Who must take part.** ANZ, ASB, BNZ, Westpac from 1 December 2025; Kiwibank designated from 1 June 2026, with its customer data excluded until 1 December 2026 (Designation Regs reg 2, reg 6, Sch 1 cl 1) [P]. Any other deposit taker may opt in (reg 6(2)) [P]. Smaller banks have no obligation; Akahu reaches them through its older "classic" connections, where it logs in as the customer [P vendor].

**What data is designated** (reg 7) [P]:

- the customer's name, whether the account is joint, and contact details;
- account identifiers, name, currency and type;
- balance, with its type and time;
- "particulars of each transaction for a relevant account that occurred during the **2-year period** before the time of the request", with the examples "data about the parties to the transaction", "data about the accounts involved" and "unique identifiers and codes";
- statements from the last 12 months.

A "relevant account" is a call account or credit-contract account in New Zealand dollars that the customer can see through an "electronic facility" and that is not closed (reg 7(4)) [P].

**The limit that matters to this product.** Until **1 June 2027**, "electronic facility" for the four big banks means only: ANZ goMoney; ASB Mobile Banking; BNZ Internet Banking – Personal; and Westpac One, excluding logins "in the name of a person other than an individual" and excluding Westpac One Business (Designation Regs Sch 1 cl 2, as amended 29 May 2026) [P]. In plain terms: an account is reachable today only if the landlord can see it in their **personal** banking app or login. Akahu's own table says the same from the other side: ANZ, "only business accounts that can be accessed using the ANZ goMoney mobile app", multi-signatory excluded; ASB, business accounts only "via a personal ASB customer account", and a customer without that link must phone ASB; BNZ, only "via a personal BNZ customer access number", with the same phone call; Westpac, only accounts reachable in Westpac One, multi-signatory excluded; "Kiwibank: All business accounts are supported", and it is the only bank Akahu says meets all its obligations [P vendor, developers.akahu.nz "feature support: accounts"]. A family trust or company that banks on a business platform, or whose account needs two signatories, may not connect until mid-2027.

**Who may ask a bank for data.** Only the customer, a "secondary user", or an accredited requestor acting within its class (Act s 43) [P]. Asking without being entitled, knowingly, is an offence: up to 5 years' imprisonment or $1 million for an individual, $5 million otherwise (s 44) [P].

**Accreditation classes** (Designation Regs reg 9) [P]: making data requests; making payment requests; acting as an intermediary for data requests; acting as an intermediary for payment requests. An accredited requestor "is acting as an intermediary" when, under a contract with a business that is **not** accredited, it passes that business identifiable customer data so the business can serve its own customer (reg 4(2)) [P]. That is exactly our position behind Akahu.

**What an intermediary must check about us.** MBIE must be satisfied the intermediary has adequate processes to verify each client's identity and to give reasonable assurance that the client has adequate security safeguards, processes that support the intermediary's compliance, processes against deception, and will comply with the Privacy Act (General Requirements Regs reg 16) [P]. This is why Akahu runs its own "accreditation" of apps.

### 2.2 Intermediaries

| Provider | What it says it offers | What its status covers for a client | Price | Source |
|---|---|---|---|---|
| **Akahu** | Enduring account and transaction data, one-off data, payments, identity and account-holder verification. "Official" connections to the five big banks, "classic" connections to smaller ones | Says it was accredited on 19 December 2025 in the intermediary class, "so Akahu customers do not need their own accreditation". Says it delivers consent disclosure, consent viewing and revocation, record retention and complaints handling for the client | "Typically between $0.50–$2.50 per user per month" for ongoing connectivity, including multiple connections, refreshes and enrichment; exact fee confirmed "once it understands the required functionality". $1.00 per identity or account verification. $0.15 per one-off payment request. No minimum stated. NZD, GST extra | akahu.nz/pricing; developers.akahu.nz "Official open banking"; akahu.nz/developer-terms (last updated 20 March 2025). Read 14 Nov 2026 [P vendor] |
| **BlinkPay** | Payments first. Its pricing page also lists "Data APIs (CDR)" included in the platform fee: confirmation of balance, account and identity, "Transaction Data Access" and statements | Round one saw the MBIE accreditation mark on its site [R1] | Base NZ$99 a month plus 0.59% per pay-by-bank transaction (to $100k a month); Plus NZ$179 plus 0.49%. 12-month commitment. GST extra. "Data consent" charges are mentioned but no amount was visible | blinkpay.co.nz/pricing, read 14 Nov 2026 [P vendor] |
| Others | I could not check MBIE's register (blocked) or search for other intermediaries | | | [U] |

Akahu's developer terms forbid using it "to provide an open banking intermediary or aggregator service" (cl 8.1.21) [P], which does not affect us. Two clauses do: Akahu may end the contract without cause on 90 days' notice (cl 6.3), and its liability is capped at the fees paid in the previous six months (cl 12.9) [P]. Insurance is not required of the developer; the terms say to "consider whether it is appropriate" (cl 7.10) [P].

### 2.3 How to get access through Akahu

Steps, from akahu.nz/accreditation-process and developers.akahu.nz "App accreditation" [P vendor]:

1. Talk to Akahu about the use; it sends Developer Terms and confirms the price.
2. Build against the API. A sandbox needs no accreditation and no fees. A "Personal App" lets a developer use their own real accounts, including official connections, free.
3. Reading enduring account data is **Tier 2**: sign the contract, pass background due diligence, have the privacy notice reviewed, and pass a full app review.
4. Give Akahu a trial account and show the requirements are met.

What the app review checks, all of which lands on our screens [P vendor]:

- TLS everywhere; app secret and user tokens never in the browser; OAuth `state` used properly; OWASP Top 10 and CIS Controls addressed.
- Sign-in. The general rule is "Server validated multi-factor authentication must be required for all users of your application's Akahu functionality". But "We have less strict authentication requirements if you are only requesting read access": a username with a strong password, or "a short lived, single use URL or 6+ digit code sent via SMS or email", is allowed. The rule that a web session must drop its multi-factor status after 2 hours applies only to apps using enduring payment consents. So a read-only feed can launch on emailed sign-in links; multi-factor sign-in becomes compulsory only if payments are ever added.
- A consumer information page shown just before connecting: what the user gets, the scope, whether access is one-off or ongoing, an accurate description of Akahu with its logo.
- A list of connected accounts visible whatever the user's plan; revoke per authorisation; a "Manage accounts" route back into Akahu's flow; revoke everything when the user deletes their account; handle the `TOKEN DELETE` webhook; tell the user when an account goes `INACTIVE`.
- Delete Akahu-sourced data when it is no longer reasonably required, including after the user revokes.
- First review and re-checks of fixes are free; later reviews cost $1,000 each. A penetration test is required only at Tier 3 (higher-risk enduring payments), which we do not need.

**Lead time:** not stated on any page [U]. Ask.

**Going direct instead** would mean our own accreditation: $1,500 application, $1,300 annual levy while revenue is under $1 million, a contract of insurance or equivalent that MBIE considers a reasonable level of cover (reg 15), FSP registration if otherwise required (reg 14), certificates for each bank, and five bank integrations to build and maintain [P]. Not credible for two people.

### 2.4 What arrives, how fast, for how long

**Fields** (developers.akahu.nz "The transaction model") [P vendor]:

| Field | Always there? | Note |
|---|---|---|
| `date` | Yes | "Often accurate only to the day". From official APIs it "may be missing a time component" |
| `description` | Yes | The bank's own text, whitespace tidied. The payer's name, when the bank shows it, is in here. **There is no separate payer-name field** |
| `amount`, `type` | Yes | Type falls back to plain `CREDIT` or `DEBIT` when unknown |
| `balance` | If available | |
| `meta.particulars`, `meta.code`, `meta.reference` | Optional | "Fields that are entered when a payment is made" |
| `meta.other_account` | Optional | The other party's account number |
| `merchant`, `category` | Enriched | |

`meta`, `merchant` and `category` are "enriched data" that "requires additional permissions". Personal Apps get them by default; a full app must ask Akahu [P vendor]. **Ask for `meta` in the first conversation: reference and other-account are what make rent matching reliable.**

**Speed** (developers.akahu.nz "Data refreshes", "Webhooks") [P vendor]:

- Scheduled refresh "once per 24 hours" by default. More often "may incur additional costs".
- Manual refresh on request, with a 15-minute rest period.
- A `TRANSACTION` webhook fires `INITIAL_UPDATE` after first connection and `DEFAULT_UPDATE` when "new transactions or updated existing transactions" arrive, and `DELETE` when the bank removes one. "Timely webhook delivery can't always be guaranteed"; order is not guaranteed; retries run for up to a day. Webhooks are not available to Personal Apps, so they cannot be tested until there is a full app.
- So: **next-day by default, not real time.** Transactions can change or disappear after first sight.

**History:** "a minimum of 2 years' transaction history is required to be available from all banks" [P vendor], matching reg 7(1)(d) [P].

**How long consent lasts.** An authorisation ends at the earliest of: a maximum period set by regulations "(if any)"; an event set by regulations; a time the customer chose; the customer ending it; or a time the requestor sets (Act s 38) [P]. **I found no maximum period in either set of regulations as at 8 October 2026** [P, by absence]. The open-banking standards could set one; they sit with MBIE and were not readable [U]. Akahu's documents give no expiry [P, by absence]. What is certain: the accredited requestor must send a written notice of each live authorisation at least every 12 months, with how to end it (reg 12) [P]; Akahu says it handles consent viewing and revocation [P vendor]; the customer can end it at the bank or at the requestor with immediate effect (Act s 40) [P]; and moving a user from a classic to an official connection means they authorise again with their bank [P vendor].

**Joint accounts:** one holder can authorise; the name data returned is only for the person who authorised (reg 7(2)) [P]. Akahu warns `meta.holder` "may be incomplete for joint accounts" [P vendor].

### 2.5 Legal obligations on us

- Privacy Act 2020 in full for the data we receive. Akahu reviews the privacy notice.
- Do not make connecting a bank a condition of the product unless it is "reasonably necessary" to provide it (Act s 42 applies to any person supplying goods or services) [P]. A manual route must exist.
- No Customer and Product Data Act accreditation, levy or insurance duty falls on us while we are the unaccredited client "B" of an intermediary. That is my reading of regs 4, 9 and 16 and of Akahu's statement; confirm with Akahu in writing.
- Reading data is not initiating payments. We never make a section 19 (payment) request. See section 8.4.

### 2.6 Risk

| Risk | Why | Mitigation |
|---|---|---|
| The account will not connect | Trust and company accounts on business banking platforms are outside the big four's obligation until 1 June 2027 | A first-class manual path: mark rent received, and import a bank CSV |
| Single supplier | 90-day termination without cause; liability capped at six months' fees | Keep the bank-feed seam (`rollForward`) provider-neutral; BlinkPay lists transaction data as an alternative |
| Cost on free users | Up to $2.50 a month per connected user, with or without revenue | Live feed on paid plans only |
| Matching quality | Reference fields are optional and need permission; dates are day-accurate; items can change | Match on amount and date window first, reference when present; show "as of" time; never auto-declare arrears off one missing day |
| Price | The public figure is a range | Get the number in writing before pricing plans |

### 2.7 Recommendation

Use Akahu at Tier 2, data only. Ask in the first call for: the per-user price for one enduring connection with daily refresh; the `meta` permission; webhook use; how consent expiry and the 12-month notice appear to the user; and whether a trust account seen through a personal login connects at each bank. Build the manual and CSV path first, because it is needed regardless.

---

## 3. Bond lodgement

### 3.1 What exists

- **Bond Hub** (mybond.tenancy.govt.nz) is how a landlord lodges, tops up, refunds and changes a bond. Paper forms ended on 29 June 2026 [R1]. Landlords sign in with RealMe, Microsoft or Google; tenants act through emailed or texted links and do not register [P, tenancy.govt.nz "Improving our tenancy bond service"].
- **Tenancy Bond API**, on MBIE's API platform. Version 3 is current: "New development must target version 3." Operations: register a landlord, lodge bonds, check request status, view and maintain bonds [P, portal.api.business.govt.nz/api/tenancy-bond].
- **Eleven integrated vendors** are named by Tenancy Services: Console (Reapit), Keyhook, MRI Palace, MyRent, Pando Loop Tenancy, Quinovic, RentHQ, Renti, RentManager NZ, Tenancy.co.nz and TenancyIQ [P]. One of them already trades with "Loop" in its product name; worth a trade-mark look before launch.
- Integrated software can do bulk lodgements, top-ups, status tracking, direct debit and direct credit payments "including from trust accounts", refund requests, and change-of-tenant and change-of-landlord requests [P, "Improving our tenancy bond service"]. The narrower page "Using property management software to complete bond transactions" (updated 29 June 2026) lists only lodgement, top-up, refund "depending on the software" and bulk lodgement [P]. The two pages disagree on tenant and landlord changes; ask MBIE.

### 3.2 How to get access

1. Register on the MBIE API portal and read the definition.
2. Subscribe to the Tenancy Bond API product. "Our API support team may request further information before the subscription can be approved." No eligibility criteria are published [P].
3. Build against the sandbox (`.../sandbox/tenancy-services/tenancy-bond/v3/`), which goes to a test copy of the bond system.
4. Request production keys.

Authentication is three-legged OAuth: the landlord signs in with the RealMe account they use with Tenancy Services, and that consent lets the software act for that landlord. Status checks use a separate two-legged subscription [P].

**Cost:** none stated [P]. **Lead time, certification steps, terms of use:** none published [U].

### 3.3 What a third-party tool may and may not do

| May | May not, or cannot |
|---|---|
| Act for a landlord who has consented through their own RealMe sign-in [P] | Act without that sign-in. There is no vendor-wide credential that lodges for anyone [P] |
| Lodge with payment by **direct debit or direct credit only** [P] | Take card or Account2Account payment; those are Bond Hub only [R1] |
| Rely on the landlord's own pre-registration: a signed Direct Debit Authority emailed to bond.finance@mbie.govt.nz, which returns a DDAUTHID to be kept private; or prior registration as a direct credit payer. Each lodgement then needs a signed payment form or remittance advice uploaded [P] | Register the payment method for the landlord. It is a form the landlord signs |
| Start a refund; the tenant must have a current email address with Tenancy Services [P] | Decide a refund. Every tenant must agree, and money goes to accounts the tenants enter themselves [R1] |

The landlord's duties do not move to the tool: lodge within 23 working days of receiving any bond money, give a receipt, never take more than four weeks' rent plus two for a pet bond [R1].

**The platform must never receive the bond.** The API supports paying from the landlord's own account. If bond money passed through a platform account, the platform would be holding other people's money (sections 8.3 and 8.4).

### 3.4 Risk

- For a landlord with one or two homes, the API route is *more* work than Bond Hub: RealMe consent, a signed direct-debit form emailed to MBIE, a signed form per lodgement. Bond Hub with a card takes minutes.
- Approval criteria and timing are unknown. Eleven vendors got through, so the door is open, but every one of them is a property-management system, most for professional managers.

### 3.5 Recommendation

**Month one: a better hand-off, not the API.** Give the landlord exactly what Bond Hub will ask for (address, weekly rent, bond amounts, each tenant's legal name, date of birth, email, entry date), the 23-working-day countdown, a link to Bond Hub, and a place to record the bond number when it comes back. That costs nothing and removes the real risk, which is forgetting.

**Quarter one: subscribe to the API and build in the sandbox**, so approval time becomes known. Go live with status tracking and refunds first, where integration saves the landlord something. Offer API lodgement to landlords with several homes and a direct-debit authority.

---

## 4. Listing syndication

### 4.1 What exists

**Trade Me Property.** A private landlord can list a rental directly. Fees today, per listing, up to 21 days, relist free on Bronze [P, help.trademe.co.nz "Property fees", read 14 Nov 2026; the page carries no date and warns that Trade Me A/B-tests prices]:

| Weekly rent | Gold | Silver | Bronze |
|---|---|---|---|
| Up to $299 | $179 | $159 | $119 |
| $300–$399 | $259 | $219 | $169 |
| $400–$599 | $339 | $319 | $219 |
| $600–$799 | $409 | $379 | $279 |
| $800–$999 | $449 | $419 | $299 |
| $1,000+ | $509 | $489 | $339 |

Flatmates-wanted listings are $9.90 for 14 days [P]. I did not find a separate price list for agents or property managers [U].

**Trade Me API.** There is no access fee for approved applications, but registration must be approved and "We retain the right to approve or decline applications for API access at our discretion" [P, developer.trademe.co.nz terms and use cases]. The public use-case page is blunt:

- "The Trade Me API exists for in-trade sellers to manage their own listings on Trade Me Marketplace"; that is the one use it says it will generally support;
- unsupported: "Applications built on top of the API to serve non-in-trade users (e.g. tools that help casual sellers list, or help buyers bid on or monitor listings), even if the application itself is commercial"; personal or non-commercial use; duplicating existing Trade Me functionality; combining Trade Me data with listings from other sites [P].

Property is handled apart from this: the developer site says only to contact api@trademe.co.nz for Property [P]. So there is **no self-serve route** by which a platform can push a private landlord's rental to Trade Me. At least one competitor does reach Trade Me from its own product (round one found reviewers saying so of myRent [R1]), so a commercial arrangement exists; its terms are not public [U].

**realestate.co.nz.** Its rentals page says "realestate.co.nz now allows rental listings from private landlords", with a "List a private rental" link into its listing tool [P]. Price, and any feed format for third parties, were not on the pages I could read [U].

**OneRoof.** Nothing on its public pages or FAQ says who may list or how [U].

### 4.2 What a platform that is not a licensed agent can list

- Letting a residential tenancy is not "real estate agency work": the Real Estate Agents Act excludes tenancies under the Residential Tenancies Act [R1]. No licence is needed to advertise a rental, as the landlord or for the landlord.
- The limits are the portals' own terms, and the tenancy law that applies to any advertisement: the rent must be stated (RTA s 22F) and nothing discriminatory may be advertised (RTA s 12) [R1].
- A platform that advertises and lets homes **for** owners starts to look like a property manager. See section 8.5 on the proposed registration regime.

### 4.3 Cost, risk, recommendation

- **Cost to the platform:** nothing for a hand-off. The landlord pays the portal. At the Nelson asking rent of about $590 [R1], a Bronze Trade Me listing is $219.
- **Risk:** promising "syndication" the portals have not agreed to; building on an API whose owner can decline or withdraw at will.
- **Recommendation:**
  1. Pool is the listing channel we own; make it good.
  2. Replace "syndication (simulated)" with a **listing kit**: the title, description, rent, bond, available date and photos, checked against s 22F, ready to paste, with a link to each portal's own create-listing page and the portal's price shown as the portal's price. Then record the listing's address so Loop can remind the landlord to take it down when the home is let.
  3. In month one, write to Trade Me Property and realestate.co.nz asking what a feed partnership needs. Treat an answer as a bonus.

---

## 5. Identity, credit and background checks

The Privacy Commissioner's limits on *when* each may be asked for are set out in round one, section 2.2, and are unchanged: consent may be collected on the application; the checks themselves are run only on a preferred applicant; ID images are destroyed once checked; one proof of affordability, chosen by the applicant; never bank statements showing transactions [R1]. New this round:

- The **Credit Reporting Privacy Code 2020, Amendment No 1**, issued March 2026, in force 1 May 2026, brings the code into line with IPP 3A [P, privacy.org.nz].
- **Rule 11(2)(b)(ii)** lets a credit reporter disclose credit information to "a prospective landlord, or that prospective landlord's agent, for the purpose of assessing the creditworthiness of that individual as a prospective tenant or as a guarantor of a tenancy", if the individual has authorised it and the access is under a subscriber agreement [P].
- The Code defines **"prospective landlord"** as "a person who has offered to grant a tenancy of premises to that individual, or who has entered into negotiations to grant a tenancy to that individual" [P]. So the stage gate is not only the Commissioner's guidance: a landlord who has not yet offered or begun negotiating is not someone a bureau may disclose to. A credit check on every applicant is outside the Code.
- **Schedule 3**: a subscriber must name its rule 11 purposes, confirm the purpose at each access, co-operate with compliance checks, and control which users have access. The credit reporter logs every access with time, date, purpose and user (rule 5(5)) [P].

### 5.1 Providers

| Check | Provider | Access | Price | Source |
|---|---|---|---|---|
| Credit plus Tenancy Tribunal files | **Centrix** "Tenancy Check": everything in a consumer credit report, a score, and "any related files from the Tenancy Tribunal" | A subscriber application. The page is addressed to landlords. An "integrated solution" is by enquiry | **Not published** | centrix.co.nz/get-reports/tenancy-check [P]; price [U] |
| Credit | Equifax NZ | Subscriber products and an XML developer centre. No tenancy product on the pages read | Not published | equifax.co.nz [P]; [U] |
| Credit, tenancy | Experian NZ (formerly illion) | Not re-read today | | [R1] |
| Criminal record | **Ministry of Justice** third-party online service | Register, and sign a "contract for the Online Delivery of Criminal Conviction Histories"; start by email to the Ministry's third-party applications address | **$13.00 per request**, pay as you go | justice.govt.nz, page updated 18 December 2025 [P] |
| Identity document check | **Stripe Identity** | Part of a Stripe account | **NZ$2.00 per verification** | stripe.com/en-nz/pricing [P vendor] |
| Name and account-holder check against the bank | **Akahu** | Tier 1 with Akahu | **NZ$1.00 per successful request** | akahu.nz/pricing [P vendor] |
| Government identity | **RealMe** verified identity | An integration project run with the RealMe team (SAML 2.0 or OpenID Connect; a test site exists). Eligibility for a private company, cost and timeline are not on the developer site | Not published | developers.realme.govt.nz [P]; [U] |
| Accredited digital identity services | Digital Identity Services Trust Framework | The Trust Framework Authority and Board now sit with the Government Digital Delivery Agency in the Public Service Commission. The page read names no accredited providers and gives no fees; it mentions "NZ Verify", the Government's app for checking digital credentials | | publicservice.govt.nz [P]; the rest [U] |

Other tenant-check brands exist (round one named some); none could be opened today [U].

### 5.2 Legal obligations

- Authorisation from the applicant, specific to each check, not bundled (Code rule 11; round one 2.3).
- IPP 3A since 1 May 2026: when information is collected from someone other than the applicant (a bureau, a referee, the Ministry), the applicant must be told who collected it and why, unless they already were. Put it in the application's privacy statement and log that it was shown [R1].
- The applicant can ask for a copy of any report obtained [R1].
- Whoever holds the subscriber agreement is the one the bureau audits.

### 5.3 The question that shapes the build

Who is the subscriber? Two shapes:

| Shape | How it works | Consequence |
|---|---|---|
| **Landlord orders the check** | Loop collects the consent, opens the gate when the applicant becomes preferred, and sends the landlord to the bureau. Loop records that a check was done and when the report must be deleted | No bureau contract for us. No credit reports in our database |
| **Platform orders for the landlord** | Loop holds the subscriber agreement and returns a result inside the product | Loop is the "prospective landlord's agent" in rule 11's words, holds credit information, is audited by the bureau, and looks more like a property manager |

### 5.4 Risk and recommendation

- **Risk:** running checks too early or on everyone (the Commissioner surveys rental application forms [R1]); keeping reports and ID images; becoming a de facto tenant database, which the Commissioner calls "problematic" [R1].
- **Recommendation:** start with the first shape. Keep the stage gate the prototype already has. Phone Centrix for the price, whether a private landlord can order one report without a subscription, and what an integration needs. Skip RealMe. For identity, keep "ID sighted, number recorded, image deleted"; add Stripe Identity at NZ$2 only if landlords ask for it.

---

## 6. E-signing

### 6.1 What the law requires

| Rule | Source |
|---|---|
| "The landlord must ensure that the tenancy agreement is in writing." The landlord must sign it before the tenancy starts and give the tenant a copy "whether or not the tenant has signed it". "The tenant must sign." Failing the first two is an unlawful act and an infringement offence | RTA s 13 (as at 1 Dec 2025) [P] |
| Every variation and renewal "shall be in writing and signed by both the landlord and the tenant", with a copy to the tenant before it takes effect | RTA s 13B [P] |
| An agreement, variation or renewal is not unenforceable just because it is not in writing | RTA s 13C [P] |
| A legal requirement for a signature is met by an electronic signature that "adequately identifies the signatory and adequately indicates the signatory's approval", and "is as reliable as is appropriate given the purpose for which, and the circumstances in which, the signature is required" | Contract and Commercial Law Act 2017 s 226(1) (as at 1 Oct 2026) [P] |
| Where the signature relates to information that must be given to a person, that person must consent to receiving the electronic signature | s 226(2) [P] |
| Nobody has to use or accept electronic form without consent; consent "may be inferred from a person's conduct" | s 220 [P] |
| Reliability is presumed if the means of signing is linked to and controlled by the signatory alone, and any later change to the signature, and to the document where integrity matters, is detectable | s 228 [P] |
| The Residential Tenancies Act is not among the enactments excluded from these rules. Excluded things include notices that must be given in person or by registered post, notices that must be attached or displayed, affidavits, powers of attorney and wills. Tenancy Tribunal procedure is excluded unless the Tribunal's own rules allow electronic means | CCLA s 218 and Schedule 5 [P] |
| "Electronic signatures may be used to sign a tenancy agreement if both parties agree." A scanned signature or a stylus counts but carries more risk; a digital signature using encryption is more secure | Tenancy Services, "Tenancy agreements", updated 29 June 2026 [P] |

No law requires a third-party signing service.

### 6.2 Options

| Option | Price | Note | Source |
|---|---|---|---|
| **Build it** | NZ$0 | Signed-in user, explicit "I agree to sign electronically", typed or drawn signature, timestamp, a hash of the final PDF stored with the record so any change shows, a copy emailed to every party | The statute above |
| BoldSign "Enterprise API" | From US$30 a month with 40 envelopes, then US$0.75 each; embedded signing; audit trail | The page showed two conflicting price sets for its other plans; confirm | boldsign.com, read 14 Nov 2026 [P vendor] |
| Documenso | Teams US$40 a month (embedding, API, unlimited documents, 5 users); Platform US$250 a month (white-label embedding) | Open source with a self-hosted option; licence terms per tier not stated on the page | documenso.com/pricing [P vendor] |
| Dropbox Sign API | Essentials from US$15 a month for 50 requests; Standard from US$250 a month | Which plans allow embedded signing was not clear | sign.dropbox.com [P vendor] |
| Docusign API | Page did not load | | [U] |

### 6.3 Risk and recommendation

- **Risk:** a dispute over who signed. The Tribunal weighs evidence; an audit trail (who, when, from which account, what document hash) is what answers it. A landlord who does not get a copy to the tenant before the start date commits an unlawful act whatever the signing method.
- **Recommendation:** build it. Capture consent to electronic signing as its own step for each party. Stamp the pack version on the document, as the prototype already does for notices. Store the PDF, its hash and the audit record together. Send the copy automatically and record that it went. Buy a provider only if a customer segment (trusts with outside trustees, for example) asks for a recognised certificate.

---

## 7. Messaging

### 7.1 Email as an address for service

| Rule | Source |
|---|---|
| An address for service "must give an address of a physical place in New Zealand" and "may, in addition, specify a Post Office box number or electronic address" | RTA s 13AB(2) [P] |
| "Electronic address means an email address, facsimile number, mobile telephone number, or instant messaging account through which information transmitted is readily accessible for subsequent reference" | s 13AB(3), inserted 20 March 2025 [P] |
| A notice may be "transmitted to the electronic address given by the landlord or the tenant as an address for service" | s 136(1)(d) [P] |
| Sent after 5 pm: treated as served the next working day | s 136(8) [P] |
| "In proving service of a document transmitted to an electronic address, it is sufficient to prove that the document was properly transmitted to that address" | s 136(10) [P] |
| Notice to any one of several tenants or landlords is enough | s 136(4) [P] |
| "Landlords and tenants can provide notice by an electronic address if it is provided as an additional address for service in the tenancy agreement. The physical address for service will still need to be provided." Changes must be notified within 10 working days | Tenancy Services, "Address for service", last updated 17 September 2026 [P] |

So an email address counts **only if that person gave it as an address for service**. An address typed into an application form, or a login email, is not one until the agreement (or a later written notice from that person) says so. A mobile number can be an address for service on the same terms.

For the product: the agreement template must capture each party's electronic address for service in so many words; a notice can only be "served by email" to that address; the send must be logged (time, address, provider message id, accepted or bounced) because that log is the proof; a bounce means not served, and the landlord must be told at once with the fallback methods and their extra days (delivered to the letterbox: second working day; posted: fourth) [P, s 136(6)–(7)]. Whether an in-app message counts as an "instant messaging account" has not been tested in anything I read [U]; do not rely on it.

### 7.2 The Unsolicited Electronic Messages Act 2007

(Version as at 28 October 2021 [P].)

- Covers email, text and other electronic messages. A **commercial** electronic message is one that markets or promotes goods, services, land, or a business opportunity (s 6(a)).
- **Not commercial**, among others: a message that "facilitates, completes, or confirms a commercial transaction that the recipient previously agreed to enter into"; one that "provides notification of factual information about a subscription, membership, account, loan, or similar relationship"; one that delivers what the recipient is entitled to under an earlier transaction (s 6(b)). Rent reminders, notices, receipts and sign-in emails sit here.
- A commercial message needs consent (s 9), accurate sender identity and contact details valid for 30 days (s 10), and a working, free unsubscribe that takes effect within 5 working days (ss 9(2), 11). The sender carries the burden of proving consent (s 9(3)).
- Penalty: up to $200,000 for an individual, $500,000 for an organisation (s 45).

Two traps: an upsell line inside a rent reminder can turn it into a commercial message; and a message to a **tenant** promoting Pool's paid features, or a tradesperson, is marketing to someone who may never have agreed to hear from us. The Privacy Commissioner separately says tenant contact details must not be used to promote an unrelated business [R1].

### 7.3 Providers

| Channel | Provider | Price | Source |
|---|---|---|---|
| Email | Resend | Free: 3,000 a month, 100 a day. Pro: US$20 a month for 50,000, US$0.90 per extra 1,000 | resend.com/pricing [P vendor] |
| Email | Postmark | US$15 a month for 10,000, US$1.80 per extra 1,000; 45 days of message history | postmarkapp.com/pricing [P vendor] |
| Text | Twilio | **US$0.105 per segment** to New Zealand from an international number; numbers from US$1.15 a month | twilio.com NZ pricing [P vendor] |

**Sender rules for texts to New Zealand numbers** (Twilio's NZ guidelines page; no date on it) [P vendor]:

- Alphanumeric sender names are **not supported** by NZ operators, registered or not.
- Domestic long numbers are not supported. An international number works through Twilio but the sender ID is not preserved.
- "Due to local carrier restrictions, NZ Operators have mandated Dedicated Short Codes." Provisioning takes **5–6 weeks**. No price is shown.
- "New Zealand's mobile operators require the content 'Reply to this SMS will be charged' to be added to every message sent to New Zealand."
- Loan, gambling, political and several other content types are prohibited.

I could not confirm these rules on an operator's or the Telecommunications Forum's own page [U]. A NZ-based text provider with a shared short code may be simpler and cheaper; none was priced today [U].

### 7.4 Risk and recommendation

- **Risk:** a notice "served" to an address that was never an address for service is not served, and the date maths built on it is wrong. Texts that arrive from an unfamiliar number look like scams.
- **Recommendation:** email first, from our own authenticated domain, with delivery logging tied to each notice. Resend's free tier covers a pilot; Pro at US$20 covers a thousand landlords. No texts in month one; push and email cover reminders. If landlords ask for texts, order a short code then and plan for the six weeks.

---

## 8. Payments: the platform's own fees, and the field-services marketplace

### 8.1 What exists

**Stripe, New Zealand, NZD** (stripe.com/en-nz/pricing, read 14 Nov 2026) [P vendor]:

| Item | Price |
|---|---|
| Domestic cards | 2.65% + NZ$0.30 |
| International cards | 3.5% + NZ$0.30 |
| NZ BECS Direct Debit | 1% + NZ$0.40, capped at NZ$4.00 |
| Billing (subscriptions) | 0.7% of billed volume |
| Invoicing | 0.4% per paid invoice |
| Dispute | NZ$25.00 |
| Identity | NZ$2.00 per verification |

**Stripe Connect, New Zealand** (stripe.com/en-nz/connect/pricing) [P vendor]:

| Model | Platform pays |
|---|---|
| "Stripe handles pricing for your users" | Nothing. Stripe bills the connected accounts directly |
| "You handle pricing for your users" | NZ$2 per monthly active account; 0.25% + NZ$0.25 per payout; the page also lists 0.25% of payout volume for funds routing |

The Connect page quotes slightly different card rates (2.7% + NZ$0.30) from the main pricing page; confirm with Stripe.

**Where the money sits** (docs.stripe.com/connect/charges) [P vendor]:

| Charge type | Whose balance the payment lands in | Who bears refunds and chargebacks | Platform's cut |
|---|---|---|---|
| **Direct charge** | The connected account's (the tradesperson's). "The payment appears in the connected account's balance, not in your platform's balance" | The connected account | An application fee, which "transfers to your platform's account balance" |
| Destination charge | The platform's, then "immediately" transferred | The platform | What it keeps back |
| Separate charges and transfers | The platform's, moved later | The platform | What it keeps back |

### 8.2 Three ways to take a commission, cheapest first

| Way | How | Money the platform touches |
|---|---|---|
| **A. Invoice it** | The tradesperson invoices the landlord and is paid bank to bank. The platform bills the tradesperson (or the landlord) its fee as an ordinary Stripe invoice or on the monthly subscription | Only its own fee |
| **B. Connect, direct charges, Stripe prices the accounts** | The landlord pays the tradesperson's Stripe account by card or bank debit; an application fee comes to the platform at the same moment | Only its own fee |
| C. Connect, destination or separate charges | The landlord pays the platform; the platform pays the tradesperson | The whole job price, however briefly |

### 8.3 Legal obligations

Statute text, read today or in round one. **How it applies to us is my reading, not a legal conclusion.**

- **Financial Service Providers (Registration and Dispute Resolution) Act 2008, s 5(1)** (as at 1 July 2026): "financial service" includes "(d) keeping, investing, administering, or managing money, securities, or investment portfolios on behalf of other persons" and "(f) operating a money or value transfer service" [P]. A business providing one must register and, with retail clients, join a dispute resolution scheme [R1]. If it came to that: application NZ$345, criminal history check NZ$13 a person, FMA levy NZ$690 on registration, annual confirmation NZ$75 plus GST plus a class levy [P, FSP register fee schedule, in effect from 1 July 2022].
- **AML/CFT Act 2009, s 5**: a "financial institution" includes a person who in the ordinary course of business is "transferring money or value for, or on behalf of, a customer" or "investing, administering, or managing funds or money on behalf of other persons" [R1]. If caught: risk assessment, compliance programme, customer due diligence, reporting, audit.
- **Financial Markets Conduct Act 2013.** I did not open it today. Its client-money rules attach to financial advice and financial products, which this product does not touch; "a regulated client money or property service" is a separate limb of the FSP Act definition (s 5(1)(ab)) [P]. Whether anything in the FMC Act reaches a trades marketplace: [U], and unlikely on its face.
- **Stripe's own rule**: for NZ BECS Direct Debit, "payment facilitators that process payments for sub-merchants" and "peer-to-peer money transfers" are prohibited or restricted [R1].

Way A and way B are designed so the platform never keeps or transfers anyone else's money: under a direct charge the funds are in the tradesperson's Stripe balance and Stripe is the payment service. Way C puts the job price in the platform's balance; avoid it.

### 8.4 What keeps rent out of scope

Rent is outside all of this only while every one of these stays true:

1. The tenant pays the landlord's bank account directly. The platform is never the payee.
2. The platform never initiates a rent payment. It makes data requests only, through the intermediary; it never makes or commissions a payment request under section 19 of the Customer and Product Data Act, and never uses Akahu's or BlinkPay's payment products for rent.
3. The platform holds no float, no trust account, no bond, no "rent in transit".
4. Arrears, part-payments and refunds are things the platform *counts and reminds about*, never things it moves.

Break any one and section 8.3 applies to the largest sums in the product. `docs/ARCHITECTURE.md` already records this as a product decision; this is the reason in statute.

### 8.5 The proposed regulation of residential property managers

- Cabinet agreed to a "light-touch" Residential Property Managers Registration Bill. HUD's page, last updated **24 March 2026**, still calls the regime "proposed" and says "Timing for introduction of a Bill will depend on the government's legislative priorities" [P]. Whether it was introduced before the election, and what a new government will do, I could not check [U].
- In scope: residential property managers and property management organisations. **Out of scope: private landlords.** Software platforms are not mentioned [P].
- Proposed duties: compulsory public registration renewed every two years; minimum age and training; organisations to "hold all client funds in separate accounts from operational funds"; records for seven years; audit on request; a code of conduct; offences for practising unregistered [P].

The open question is the Bill's definition of a property manager. A platform that only gives a self-managing landlord tools is on the landlord's side of the line. A platform that finds tenants, arranges repairs through its own network and takes a cut of them, for an owner who does little, drifts towards the other side. Holding no client money removes the heaviest duty either way.

### 8.6 Risk and recommendation

- **Risk:** the marketplace quietly becoming a payments business; disputes over a tradesperson's work landing on the platform (under destination charges they land there by design).
- **Recommendation:**
  - **Own fees:** Stripe Billing on cards from month two or three. About 4.2% of a NZ$34 subscription (2.65% + $0.30 + 0.7%).
  - **Marketplace:** launch on way A. The tradesperson is paid by the landlord directly; Loop charges a booking fee. Move to way B only when card payment at booking is clearly wanted, and only after a lawyer has confirmed the FSP and AML position and Stripe has approved the model in writing.
  - Never way C. Never rent.

---

## 9. Hosting and data residency

### 9.1 What exists

- **Supabase regions** (supabase.com/docs, read 14 Nov 2026) [P vendor]: seventeen AWS regions. **No New Zealand region.** The only one in Oceania is **Sydney (ap-southeast-2)**. Supabase also offers "general regions" (Americas, Europe, APAC) where it picks the location; APAC is anchored on Singapore. Its own advice: for data that must stay in one jurisdiction choose "a specific region rather than a general region grouping", and "Region selection is a data-location control, not proof of regulatory compliance."
- **Price** (supabase.com/pricing) [P vendor]: Free US$0 (500 MB database, no backups). **Pro from US$25 a month**: 8 GB database, 100 GB files, 100,000 monthly active users, daily backups kept 7 days, US$10 of compute credit covering one Micro instance. Compute: Micro US$10, Small US$15, Medium US$60. Point-in-time recovery US$100 a month per 7 days. **Team from US$599 a month** adds SOC 2 reports.
- Whether AWS now runs a New Zealand region that Supabase could adopt: AWS's region page was fetched but showed nothing conclusive [U]. It does not matter until Supabase lists one.

### 9.2 The Privacy Act's cross-border rule

- **IPP 12** applies when an agency *discloses* personal information to a foreign person or entity. It then needs one of: the recipient is subject to the Privacy Act; comparable safeguards, for example by contract using the Commissioner's model clauses; a prescribed country or binding scheme; or the individual's authorisation after being told the protection may be less [P, privacy.org.nz, principle 12].
- **Putting data with a hosting provider is not a disclosure.** Where agency A "holds information for or on behalf of another agency (B) (for example ... for safe custody or processing on behalf of B)", the information "is to be treated as being held by B, and not A"; "it does not matter whether A is outside New Zealand; or holds the information outside New Zealand"; and "the transfer of the information to A by B is not a use or disclosure of the information by B" (Privacy Act 2020 s 11, as at 8 October 2026) [P]. The exception: if the provider "uses or discloses the information for its own purposes", it holds it too (s 11(3)) [P].
- The Commissioner's guidance says the same and draws the consequence: "you'll be responsible for the personal information that you put in the cloud – not the cloud service provider" [P].

So Supabase in Sydney, an email service in the United States and similar processors do not trigger IPP 12 while they only process on our instructions. We stay answerable for security (IPP 5), for breaches at the provider, and for notifying them [R1].

Two real disclosures remain, and they are in New Zealand or to an agency acting for itself: a landlord seeing a preferred applicant's profile; and Stripe, which handles card and identity data for its own regulated purposes. Stripe needs a line in the privacy statement.

### 9.3 What to tell users

- Where the data is: "stored in Sydney, Australia, by our hosting provider, on our behalf".
- Who else processes it for us, by name and country: hosting, email delivery, bank-feed intermediary (New Zealand), payments.
- That New Zealand privacy law applies to it wherever it sits, and how to ask for access or correction (IPP 3; and IPP 3A for anything collected from someone else).
- For landlords: that **they** are an agency for their tenants' and applicants' information, and Loop holds it for them. This is the same structure one level up, and the terms should say it.

### 9.4 Risk and recommendation

- **Risk:** choosing "APAC" and landing in Singapore; running on the Free plan with no backups; a provider that trains on or mines customer data (which would end the s 11 position).
- **Recommendation:** Supabase Pro, **Sydney, chosen explicitly**. Read each processor's data-processing terms for "own purposes" use. Turn on point-in-time recovery before the first paying customer, not after. Name the privacy officer (section 10). SOC 2 on the Team plan can wait for a customer who asks.

---

## 10. Company and compliance basics

### 10.1 What is and is not required

| Question | Answer | Source |
|---|---|---|
| A licence to make property-management software? | None found. Residential letting and management is outside real estate agency work | Real Estate Agents Act 2008 s 4(1) [R1] |
| A company | Name reservation NZ$11.50; incorporation NZ$136.55; annual return NZ$57.20, all including GST | Companies Office schedule of fees, effective 1 July 2022, read 14 Nov 2026 [P] |
| A New Zealand Business Number | Comes with the company. An accreditation application would need one (Customer and Product Data Act s 109(c)); Akahu will want to identify us (reg 16) | [P] |
| GST | Registration is required once turnover from taxable activities passes $60,000 in 12 months | IRD [R1, read there for short-stay; the general threshold was not re-opened today] |
| Financial service provider registration | Only if section 8.3 bites. Designed out | FSP Act s 5 [P] |
| Customer and Product Data accreditation | Not while behind an intermediary | Section 2 |
| A privacy officer | **Required.** "An agency must appoint as privacy officers ... 1 or more individuals (within or outside the agency)" | Privacy Act 2020 s 201 [P] |
| Breach notification | Notify the Commissioner and affected people of a breach likely to cause serious harm, as soon as practicable; the Commissioner expects within 72 hours | [R1] |
| Registration as a property manager | Not law. Proposed; see 8.5 | [P] |
| Professional indemnity insurance | No statute found that requires it of a software company. The open-banking regulations require cover only of accredited requestors (reg 15) [P]. Akahu's terms say only to "consider" it [P]. Customers, and any lawyer, will expect professional indemnity and cyber cover. **No price found; needs a broker's quote** | [U] for price |

### 10.2 "General information, not legal advice"

What the statutes say about that line:

- **Lawyers and Conveyancers Act 2006** (as at 1 October 2026) [P]. It is an offence for a non-lawyer, "for gain or reward", to give "legal advice to any other person in relation to the direction or management of ... any proceedings that the other person is considering bringing, or has decided to bring, before any New Zealand court or New Zealand tribunal" (s 6 "reserved areas of work" para (a); s 24(1)(a)). The Tenancy Tribunal is a New Zealand tribunal. Filling in a prescribed form for someone is excused only where "no charge is made, directly or indirectly" (s 27(3)(c)). It is also an offence to use words "reasonably likely to cause" someone to believe a person "possesses special expertise in any branch of the law" when they do not (s 22(3)).
  - General legal information, statutory date calculators and notice templates are not reserved work on this wording. Advising a particular landlord whether to take a particular tenant to the Tribunal, what to claim, or how to run the case, inside a paid product, is close to the line.
  - The prototype's Tribunal pack already says "Loop does not file it and does not give legal advice: what you ask the Tribunal for, and why, is yours to write." Keep it that way, and hold the assistant to the same rule.
- **Fair Trading Act 1986 s 9**: "No person shall, in trade, engage in conduct that is misleading or deceptive or is likely to mislead or deceive" (as at 1 July 2026) [P]. A disclaimer does not cure a wrong date presented as right. Claims such as "always compliant" or "guaranteed lawful" are the exposure. "Checked against [source] on [date]", which the rule pack already carries, is the honest form.
- **Consumer Guarantees Act 1993 s 28**: services supplied to a consumer carry a guarantee of "reasonable care and skill"; **s 43**: the Act cannot be contracted out of, except in writing between parties who are both in trade, where it is fair and reasonable (as at 24 January 2026) [P]. Whether a one-home landlord is a "consumer" of this software was not researched [U]; write the terms as if they are.

Terms-of-service points that follow:

1. What the product is: information and tools for a landlord who makes their own decisions. What it is not: a lawyer, a property manager, an agent for service, or a holder of money.
2. Sources and dates on every rule; the pack version on every notice; a statement that the law can change between checks.
3. The landlord remains the landlord: serving notices, lodging bonds and meeting deadlines are theirs even when Loop prepares or sends.
4. Liability limits that do not pretend to exclude the Consumer Guarantees Act for consumers.
5. The privacy structure in 9.3: landlord as agency, Loop as holder on their behalf.
6. No tenant "ratings" or shared notes across landlords.
7. A complaints route and a real address.

### 10.3 Questions for a lawyer or a phone call

| Who | Question |
|---|---|
| Lawyer | Does way A or way B in 8.2 leave the platform outside the FSP Act and the AML/CFT Act? Does anything in the marketplace design bring it inside the proposed property-manager regime, and has that Bill moved since March 2026? |
| Lawyer | Where exactly is the s 24 line for the assistant and the Tribunal pack? Is a landlord a "consumer" under the Consumer Guarantees Act for this product? Review the terms and privacy statement |
| Akahu | Price per connected user; `meta` permission; consent expiry and the annual notice; trust and company accounts per bank before June 2027; time to accredit |
| Trade Me Property; realestate.co.nz | Is there a feed or partner route for a platform serving private landlords? On what terms? |
| Centrix | Price of a Tenancy Check; one-off orders by private landlords; what an integration requires |
| MBIE API team | Eligibility and approval time for the Tenancy Bond API; whether integrated software can change tenants and landlords; terms of use |
| Insurance broker | Professional indemnity and cyber cover for a two-person software company holding tenancy records |

---

## 11. Sequenced plan

### 11.1 Month one: the things everything else waits on

| Do | Why first |
|---|---|
| Incorporate; reserve the name; check the name against the existing "Pando Loop Tenancy" product; appoint a privacy officer | Akahu, Stripe, MBIE and the bureaus all contract with a company. A week, and NZ$148 |
| Brief a lawyer on the three perimeter questions in 10.3 | The answer decides how the marketplace is built. Cheaper before the build than after |
| Supabase Pro in Sydney; real accounts (emailed sign-in link or strong password, with multi-factor offered); apply the existing schema and row-level security | Nothing real can be stored without it. Akahu's review accepts these sign-in methods for read-only access |
| Transactional email on our own domain, with a delivery log per message | Sign-in needs it; notices "served by email" need the log as proof |
| Write the terms and the privacy statement (sections 9.3 and 10.2) | Akahu reviews the privacy notice. Nothing can be collected without one |
| **Open the conversations with unknown lead times:** Akahu (start in a Personal App the same day); MBIE Tenancy Bond API subscription; Trade Me Property and realestate.co.nz; Centrix | None publishes a timeline. Starting costs nothing and turns unknowns into dates |
| Ship the hand-offs that need nobody's permission: the Bond Hub checklist with its 23-working-day countdown; the listing kit; manual "rent received" and bank CSV import | They are the permanent fallback for every integration below, and they make the product usable before any integration lands |

### 11.2 Quarter one: the integrations that carry no money

| Do | Why now |
|---|---|
| Akahu live, Tier 2, data only: consumer information page, connected-accounts screen, revoke, account-deletion clean-up, daily refresh with webhooks, "as of" time on every figure | It is the product's main promise, and it is read-only |
| E-signing, built in-house, for agreements and variations, with the electronic address for service captured in the agreement | No dependency, no cost, and service by email depends on that captured address |
| Stripe Billing for the platform's own fees | Ordinary merchant payments. No third-party money |
| Bond API in the sandbox; go live with status tracking and refunds first | Approval time will be known by now; these are the parts that save a landlord effort |
| Applicant checks as a gated hand-off (landlord orders; Loop records consent, stage and deletion date) | Meets the Commissioner's staging without a bureau contract |
| Marketplace on way A: booking fee by invoice | Earns revenue without touching the job price |

### 11.3 Later: when a customer need or a legal answer unlocks it

| Do | Unlocked by |
|---|---|
| Stripe Connect with direct charges | The lawyer's answer and Stripe's written approval of the model |
| Bureau and Ministry of Justice integrations inside the product | Volume that justifies subscriber agreements, and a decision to hold credit reports |
| Portal feeds | A yes from Trade Me or realestate.co.nz |
| Text messages by short code | Landlords asking; six weeks' notice |
| Trust and company bank accounts at the big four | 1 June 2027, when the temporary limit in the regulations ends |
| SOC 2 (Supabase Team), penetration test | An enterprise or trustee customer asking |
| Australia | Section 13 |

### 11.4 The reason for the order

Three rules, in priority:

1. **Things with unknown lead times start first**, even though they finish later.
2. **Things that hold no money and no credit data go before things that might.** Every item in month one and quarter one keeps the platform outside financial-services law by design.
3. **Every integration ships after its manual fallback**, because the regulations themselves guarantee some landlords cannot connect until mid-2027, and the Act forbids making bank connection a condition of service unless it is reasonably necessary.

### 11.5 What this changes in the product now

These are findings that affect screens and plans already in the prototype. None needs an outside party's permission.

| Finding | Evidence | Change |
|---|---|---|
| Some landlords cannot connect a bank account until 1 June 2027: trusts and companies on business banking platforms, and any account needing two signatories. The demo landlord, a family trust with five homes, is the textbook case | Designation Regs Sch 1 cl 2; Akahu's bank table | Manual "rent received" and bank CSV import become a designed, permanent path, not an error state. The connect screen says plainly which accounts work at which bank |
| The feed is next-day by default, dates are day-accurate, and a transaction can change or vanish after first sight | Akahu "Data refreshes", "Webhooks", "Transaction model" | Every rent figure carries "as of" its last refresh. Arrears are not declared on the due day itself. The simulator (`rollForward`) should model lag and corrections so the screens are tested against them |
| Payer reference, code and other-account are optional and need a permission. There is no payer-name field | Akahu "Transaction model" | Matching must work on amount and date alone and say how sure it is. Give each tenancy a reference, but never depend on it |
| Each connected landlord costs up to NZ$2.50 a month, paying or not | akahu.nz/pricing | Live bank feed belongs to paid plans. The free plan's "rent tracking" is manual or CSV |
| An intermediary's client must offer a connected-accounts list on every plan, per-authorisation revoke, "manage accounts", clean-up on account deletion, a consumer information page before connecting, and sign-in by strong password or single-use emailed link at least. A written notice of each live authorisation is due at least yearly | Akahu "App accreditation"; General Requirements Regs reg 12 | Add these to Settings and onboarding now, simulated and labelled, so the real integration drops into finished screens |
| No self-serve route exists to push a private landlord's listing to Trade Me; its public API rules exclude tools for non-trade users | developer.trademe.co.nz use cases | Replace "Showing on Trade Me, realestate.co.nz (syndication is simulated)" with a listing kit and a recorded hand-off, showing the portal's own fee |
| A bureau may disclose a credit report only to a landlord who "has offered to grant a tenancy ... or who has entered into negotiations" | Credit Reporting Privacy Code, definition of "prospective landlord", rule 11(2)(b)(ii) | The existing stage gate is a legal requirement, not only good practice. Say so in the refusal sentence, with the source |
| An email address is an address for service only if the tenancy agreement (or a later notice from that person) gives it as one; a mobile number can be one too | RTA ss 13AB, 136; Tenancy Services | The agreement template captures it explicitly for each party. "Serve by email" is refused, with the reason, when it was not captured. A bounce reverses "served" |
| New Zealand texts cannot carry a brand name as sender and must say replies are charged | Twilio NZ guidelines | Do not design a "from Loop" text. Notifications are push and email first |
| Advising, for payment, on bringing or running a Tribunal case is reserved to lawyers | Lawyers and Conveyancers Act ss 6, 24, 27 | Keep the Tribunal pack as a record. The assistant must decline "should I take them to the Tribunal?" and say why |
| Under Stripe destination charges the job price sits in the platform's balance and the platform bears refunds and chargebacks | docs.stripe.com/connect/charges | The marketplace screens should show the tradesperson being paid by the landlord, with Loop's fee as a separate line, never "Loop pays your tradesperson" |
| A product already integrated with Tenancy Services is called "Pando Loop Tenancy" | Tenancy Services vendor list | Check the name before incorporating or registering a trade mark |

---

## 12. Monthly running cost at 100 and 1,000 landlords

**Assumptions, all mine and all adjustable.** 1.6 homes per landlord. Every landlord connects one bank login. 60% are on a paid plan averaging NZ$34 a month (the prototype's Pro price of $25 plus $15 for each extra home), paying by New Zealand card. About 25 emails per home per month. Signing built in-house. Marketplace on way A. No texts. Prices are the published ones cited above, before GST. US and NZ dollars are kept apart; no exchange rate was looked up.

| Line | Basis | 100 landlords | 1,000 landlords |
|---|---|---|---|
| Bank feed (Akahu) | NZ$0.50–$2.50 per connected user | NZ$50–$250 | NZ$500–$2,500 |
| Card fees on our own subscriptions | (2.65% + NZ$0.30 + 0.7%) on NZ$34, 60% paying | NZ$86 | NZ$863 |
| Stripe Connect | Way A: none | NZ$0 | NZ$0 |
| Bond API | No fee stated | NZ$0 | NZ$0 |
| Company annual return | NZ$57.20 a year | NZ$5 | NZ$5 |
| **NZ dollar subtotal** | | **NZ$141–$341** | **NZ$1,368–$3,368** |
| Hosting (Supabase Pro, Sydney) | US$25; at 1,000, Medium compute (+US$50) and point-in-time recovery (+US$100) | US$25 | US$175 |
| Email (Resend) | Pro, 50,000 a month | US$20 | US$20 |
| E-signing | Built | US$0 | US$0 |
| **US dollar subtotal** | | **US$45** | **US$195** |
| Subscription revenue on these assumptions | 60% × NZ$34 | NZ$2,040 | NZ$20,400 |

**Optional lines, not in the totals:**

| Line | Basis | 100 | 1,000 |
|---|---|---|---|
| Texts | 2 per home per month at US$0.105, plus short-code rental (price not found) | US$34 + rental | US$336 + rental |
| Bought e-signing | BoldSign API: US$30 with 40 envelopes, US$0.75 after; assume 10 and 100 envelopes a month | US$30 | US$75 |
| Stripe Connect, way B, platform-priced | NZ$2 per active tradesperson (assume 10 and 60), plus 0.25% + NZ$0.25 per payout | NZ$20 + payout fees | NZ$120 + payout fees |
| Applicant checks | Passed through to whoever orders: Justice NZ$13; Stripe Identity NZ$2; Akahu verification NZ$1; Centrix not published | | |

**Not priced, because no price was found:** insurance; legal fees; static hosting for the web app; error monitoring; a short code; Akahu review fees after the first (NZ$1,000 each).

**What the table shows.** The bank feed is the only cost that scales with landlords rather than revenue. At the top of Akahu's range it is 12% of subscription revenue, and every free-plan landlord who connects costs up to NZ$2.50 a month for nothing. The Akahu price is the number to pin down first.

---

## 13. Australia: only what differs

| Item | Difference | Source |
|---|---|---|
| Bank feeds | The Consumer Data Right. Accreditation is by the ACCC and requires fit-and-proper status, information security, internal dispute resolution to ASIC's RG 271, membership of an external dispute scheme, "adequate insurance", and an Australian address for service; then on-boarding and conformance testing before activation. A "sponsored" accreditation form exists. The representative and outsourced-provider models, by which an unaccredited business works under an accredited one, were not readable today | cdr.gov.au [P]; representative model [U] |
| | Intermediary example: Basiq, "$0.50 per user / month" for data "+ Platform access fee" (amount by enquiry; currency not stated on the page), "135+ financial institutions in AU and NZ", up to 20 refreshes per connection a day | basiq.io/pricing [P vendor] |
| Bonds | No national system. Each state and territory has its own authority and online service (NSW Rental Bonds Online, Victoria's RTBA, Queensland's RTA, and so on); the Northern Territory has none and the landlord holds the bond. Lodgement deadlines differ by state. Vendor APIs were not researched | `docs/research/au-tenancy-law.md` [R1]; APIs [U] |
| Listings | realestate.com.au and Domain policies on private landlords and feeds were not read | [U] |
| Applicant checks | State law is stricter than New Zealand's in places. Queensland bans asking for credit or bank transaction history and limits documents to two in each of three categories; tenancy-database use must be disclosed; New South Wales added a database listing ban in its September 2026 reforms | `au-tenancy-law.md` [R1] |
| E-signing | Governed by Commonwealth and state Electronic Transactions Acts; not read | [U] |
| Messaging | The Spam Act 2003 is the model New Zealand's Act was drawn from (the NZ Act cites it section by section) [P]. **Branded sender names are allowed but must be registered: "From 1 July 2026 ... texts sent with an organisation's name at the top of a message ... will need to have the sender ID registered"**, and registration relies on details held against an ABN. The opposite of New Zealand, where sender names are not supported at all | acma.gov.au [P] |
| Payments | Stripe Connect Australia: A$2 per active account, 0.25% + A$0.25 per payout; domestic cards 1.7% + A$0.30 | stripe.com/au [P vendor] |
| | AUSTRAC's new real-estate designated services cover brokering the "sale, purchase or transfer" of real estate; "leases of 30 years or less" are outside its definition of real estate. Ordinary residential letting is therefore not one of the new real-estate services. Start dates were not on the page read | austrac.gov.au, page dated 31 August 2026 [P]; dates [U] |
| | Whether a rent or trades payment flow needs an Australian financial services licence was not researched | [U] |
| Hosting | Supabase Sydney is onshore for Australian users. The Australian cross-border principle (APP 8) page was blocked | [P vendor]; APP 8 [U] |
| Company | A registered sender name needs an ABN. Property-management licensing in Australia is state by state and applies to agents; whether a software platform is caught was not researched | acma.gov.au [P]; licensing [U] |

The shape of the answer is the same as New Zealand's: read-only bank data through an accredited intermediary, hand-offs to each state's bond system, no money held. The work is in eight sets of state rules, which the rule-pack design already expects.

---

## 14. Sources read today

**Legislation (legislation.govt.nz)**

- Customer and Product Data Act 2025, as at 24 January 2026: https://www.legislation.govt.nz/act/public/2025/14/en/latest/
- Customer and Product Data (Designations for Banking and Other Deposit Taking) Regulations 2025, SL 2025/228, as at 29 May 2026: https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2025/228/en/latest/
- Customer and Product Data (General Requirements) Regulations 2025, SL 2025/229, as at 8 October 2026: https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2025/229/en/latest/
- Customer and Product Data (Fees) Regulations 2025, SL 2025/242: https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2025/242/en/latest/
- Customer and Product Data (Levies) Regulations 2025, SL 2025/243: https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2025/243/en/latest/
- Amendment regulations listed but not separately analysed: SL 2026/150, SL 2026/151, SL 2026/267
- Residential Tenancies Act 1986, as at 1 December 2025 (ss 13, 13AB, 13B, 13C, 136, 136A): https://www.legislation.govt.nz/act/public/1986/120/en/latest/
- Contract and Commercial Law Act 2017, as at 1 October 2026 (ss 218–228, Schedule 5): https://www.legislation.govt.nz/act/public/2017/5/en/latest/
- Unsolicited Electronic Messages Act 2007, as at 28 October 2021 (ss 6, 9–11, 45): https://www.legislation.govt.nz/act/public/2007/7/en/latest/
- Privacy Act 2020, as at 8 October 2026 (ss 11, 201): https://www.legislation.govt.nz/act/public/2020/31/en/latest/
- Financial Service Providers (Registration and Dispute Resolution) Act 2008, as at 1 July 2026 (s 5): https://www.legislation.govt.nz/act/public/2008/97/en/latest/
- Lawyers and Conveyancers Act 2006, as at 1 October 2026 (ss 6, 21–24, 27): https://www.legislation.govt.nz/act/public/2006/1/en/latest/
- Fair Trading Act 1986, as at 1 July 2026 (s 9): https://www.legislation.govt.nz/act/public/1986/121/en/latest/
- Consumer Guarantees Act 1993, as at 24 January 2026 (ss 28, 43): https://www.legislation.govt.nz/act/public/1993/91/en/latest/

**Regulators and government**

- Tenancy Services: https://www.tenancy.govt.nz/about-tenancy-services/improving-our-tenancy-bond-service/ ; https://www.tenancy.govt.nz/rent-bond-and-bills/bond/using-property-management-software-to-complete-bond-transactions/ ; https://www.tenancy.govt.nz/starting-a-tenancy/tenancy-agreements/ ; https://www.tenancy.govt.nz/starting-a-tenancy/tenancy-agreements/address-for-service/
- MBIE API portal: https://portal.api.business.govt.nz/api/tenancy-bond
- HUD: https://www.hud.govt.nz/our-work/regulation-of-residential-property-managers
- Privacy Commissioner: https://www.privacy.org.nz/privacy-principles/12/ ; https://www.privacy.org.nz/responsibilities/disclosing-personal-information-outside-new-zealand/ ; https://www.privacy.org.nz/privacy-principles/codes-of-practice/credit-reporting-privacy-code-2020/ and the consolidated code in force 1 May 2026 linked from it
- Ministry of Justice: https://www.justice.govt.nz/criminal-records/get-someone-elses/
- RealMe developers: https://developers.realme.govt.nz/
- Trust Framework: https://www.publicservice.govt.nz/about-the-commission/government-digital-delivery-agency/trust-framework-for-digital-identity
- Companies Office fees: https://companies-register.companiesoffice.govt.nz/help-centre/managing-your-online-account/schedule-of-fees/
- FSP register fees: https://fsp-register.companiesoffice.govt.nz/help-centre/paying-fees-and-levies/schedule-of-fees-and-levies/
- Australia: https://www.cdr.gov.au/for-providers/become-accredited-data-recipient ; https://www.acma.gov.au/sms-sender-id-register ; https://www.austrac.gov.au/new-austrac/designated-services-newly-regulated-entities/real-estate-designated-services

**Providers**

- Akahu: https://www.akahu.nz/pricing ; https://www.akahu.nz/accreditation-process ; https://www.akahu.nz/developer-terms ; https://www.akahu.nz/newsroom/transitioning-to-the-regulated-open-banking-system ; https://www.akahu.nz/business-account-coverage-consultation-on-open-banking-draft-amendment-regulations ; https://developers.akahu.nz/docs/app-accreditation ; https://developers.akahu.nz/docs/official-open-banking ; https://developers.akahu.nz/docs/official-open-banking-feature-support-accounts ; https://developers.akahu.nz/docs/official-open-banking-feature-support-data ; https://developers.akahu.nz/docs/official-open-banking-feature-support-connection-management ; https://developers.akahu.nz/docs/the-transaction-model ; https://developers.akahu.nz/docs/data-refreshes ; https://developers.akahu.nz/docs/reference-webhooks
- BlinkPay: https://www.blinkpay.co.nz/pricing
- Trade Me: https://help.trademe.co.nz/hc/en-us/articles/360032007872-Property-fees ; https://developer.trademe.co.nz/ ; https://developer.trademe.co.nz/getting-started ; https://developer.trademe.co.nz/api-overview/use-cases ; https://developer.trademe.co.nz/terms-and-conditions ; https://developer.trademe.co.nz/terms-and-conditions/business-rules
- realestate.co.nz: https://www.realestate.co.nz/residential/rental
- Centrix: https://www.centrix.co.nz/get-reports/tenancy-check/ ; Equifax NZ: https://www.equifax.co.nz/
- Stripe: https://stripe.com/en-nz/pricing ; https://stripe.com/en-nz/connect/pricing ; https://docs.stripe.com/connect/charges ; https://stripe.com/au/connect/pricing
- Supabase: https://supabase.com/docs/guides/platform/regions ; https://supabase.com/pricing
- Email and text: https://resend.com/pricing ; https://postmarkapp.com/pricing ; https://www.twilio.com/en-us/guidelines/nz/sms ; https://www.twilio.com/en-us/sms/pricing/nz
- Signing: https://documenso.com/pricing ; https://boldsign.com/electronic-signature-pricing/ ; https://sign.dropbox.com/products/dropbox-sign-api/pricing
- Basiq: https://www.basiq.io/pricing/

**Tried and failed**

| Address | What happened |
|---|---|
| mbie.govt.nz (open banking, accreditation, register) | Bot-protection page on every request |
| tinz.net.nz | Did not resolve |
| centrix.co.nz/pricing | 404; no public price list found |
| ecom.docusign.com API pricing | Connection dropped |
| oaic.gov.au APP 8 guidelines | 403 |
| rta.qld.gov.au web services page | 404 at the address tried |
| clicksend.com NZ pricing | Loaded, but showed Australian-dollar prices and no NZ sender rules; not used |
| dia.govt.nz anti-spam page | Loaded an index only; the Act itself was used instead |
| oneroof.co.nz | Loaded; says nothing about who may list |
