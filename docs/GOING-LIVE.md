# Going live: the log

This prototype is built to become the real product. Every screen works on demo data in one browser; this file is the running record of what each part needs before it works for a paying customer. It is kept up to date, not written once.

**The rule for keeping it.** Anything simulated, kept only on the device, or labelled "demo" on screen has a row here. When a feature is added or changed, its row changes in the same commit. If a row cannot say where the real version plugs in, the feature is not built to the seam yet.

Vendor facts (prices, access rules, lead times) are not repeated here. They live in `docs/research/round-2/05-making-it-real.md`, with sources and dates, and each row points at its section.

## 1. Where things stand

"Seam" is the place in the code where the real version replaces the stand-in without the screens changing.

| Part | Today | To make it real | Seam | Research |
| --- | --- | --- | --- | --- |
| **Sign-in** | Choosing a demo persona. No passwords, because a password field that protects nothing would be a lie. | Email sign-in with verification; sessions; invitations that are really sent; two-step sign-in for owners. | `src/app/session.ts` | — |
| **Organisations and access** | Every record carries `orgId`; screens read through `useOrgRows`. Enforced only by the client. | Row-level security in the database, so one customer can never read another's rows whatever the client does. | `supabase/migrations/0001_init.sql` (written, applied nowhere) | — |
| **The data** | One browser's `localStorage`. | Postgres. Each function in `src/data/*mutations.ts` becomes a server action of the same name, and the rule checks run again there: a client is never trusted with the law. | `src/data/store.ts`, `src/data/*mutations.ts` | — |
| **Plans and billing** | Plans and prices are data (`src/domain/finance.ts`). Nothing is charged; Settings says so. | Card on file, monthly charge, receipts, plan changes mid-month, failed-payment handling. See section 2. | `changeOrgPlan`, `Org.status` | §8 |
| **What happens when an account is unpaid** | Suspension shows the owner a notice and switches nothing off; the notice says so. | Read-only with export, enforced on the server. See section 2.3. | `SuspendedBar`, `Org.status` | — |
| **Photos** | Kept in the browser's IndexedDB, downscaled. | Private file storage; the on-device copy becomes the upload queue, so photos still save with no signal. | `src/data/photos.ts` | — |
| **Document files** | A file attached to a document row is kept in IndexedDB. Rows that came with the demo have none. Loop shows what its records hold for each document, and its own notices in full. | Private file storage with per-organisation access; virus scanning on upload; real PDFs for the documents Loop writes (today they download as a web page). | `src/data/files.ts`, `src/data/doc-mutations.ts`, `src/domain/documents.ts` | — |
| **Bank feed** | Made up: a simulated feed pays each tenant's rent on its due date. Labelled. | A read-only feed of the landlord's own account through an intermediary. Manual entry and CSV import stay as a permanent path, because some account types may not connect. | `rollForward` in `src/domain/seed/simulate.ts`; `fileBankLine` | §2 |
| **Rent** | Loop never holds rent, in the prototype or in production. It reads the landlord's account and keeps count. | Unchanged. This is a product decision with a regulatory reason. | — | §8 |
| **Bond lodgement** | Loop counts the working days and keeps the reference the landlord types in. It lodges nothing. | The bond authority's API, starting in its sandbox; until then a deep link and the countdown. | `recordBondLodged` | §3 |
| **Notices** | The notice text, dates and working are real. "Served by email" records the notice and sends nothing; the screen says so and refuses email where there is no address for service. | Real delivery, with proof of sending kept against the notice; the tenant's address for service captured properly. | `serveNotice` in `src/data/tenancy-mutations.ts` | §7 |
| **Reminders and digests** | None are sent. Deadlines appear when the app is opened. | A scheduled job that reads the same action queue and sends email, and text for the urgent ones. | `landlordActions` in `src/domain/actions.ts` | §7 |
| **Signing** | Agreements and variations are recorded as agreed. Nobody signs anything. | E-signing with an audit trail. | `respondToPet`, `proposeClause` | §6 |
| **Listings** | Listings exist in demo data and appear only in Pool. Marking one for outside sites sends nothing. A landlord cannot create one yet. | Listing creation; a hand-off kit first, a feed to outside sites if one can be negotiated. | `src/screens/pool/search` | §4 |
| **Applicant checks** | Stages and what may be asked at each are real rules. No identity, credit or reference check is run. | Check providers, run only at the stage the law allows and only with consent. | `moveApplication`, `decideIdentity` | §5 |
| **Tradespeople and field services** | Invented businesses. Jobs are "booked" in the store; nobody is contacted or paid. | A vetted network, dispatch messages, and a way to take the platform's fee. The fee model needs legal advice first. | `approveQuote`, `markPaidOut` | §8 |
| **Keeping the law current** | Real. A scheduled job reads the official sources every day and reports what moved; a person reviews and publishes; a published change waits for its commencement date. | Already real. In production the published versions live in the database instead of a browser. | `scripts/reg-watch.mjs`, `resolvePack` | — |
| **AI draft of a law change** | Written, optional, never run against the live service. | A key in the repository's secrets, then a supervised first run. A person still approves everything. | `scripts/reg-watch.mjs` | `03` |
| **The assistant** | Answers only from the rule pack and answers a person taught it, with sources, or says it does not know. No model is involved. | The same, with a model allowed to understand the question and phrase the answer, never to supply a fact. | `src/domain/copilot.ts` | `03` |
| **Self-healing** | Real logic on the demo data, run on demand from the team console. | The same checks on a schedule, with the same approve-before-acting rule. | `src/domain/healing.ts` | — |
| **Team console** | Works on the one browser's data. "View as owner" is a switch of persona, written to the audit log. | Staff accounts with their own permissions; support access that is time-limited and visible to the customer. | `viewAsOwner` in `src/data/admin-mutations.ts` | — |
| **Export and deletion** | An owner or renter can download everything held about them. Reset wipes the demo. | The same export from the server; deletion on request and at the end of each retention period, on a schedule. | `src/screens/loop/settings/export.ts` | — |

## 2. Selling it: the public site, self-serve sign-up and the monthly card

The intention: a public site that explains the business and the brand, from which a landlord can sign up, put a card down, and use the product month to month. An account that is not paid cannot be used. Nothing in this section is built. It is here because these choices reach into parts that are.

### 2.1 The public site

- **Separate from the app, same brand.** The site tells the story, shows the product and takes sign-ups; the app starts at sign-in. Today the app's first page is a persona chooser, which becomes the "try the demo" door.
- **It has to be findable.** The app is drawn in the browser, which search engines read badly. The public pages should be built ahead of time as plain pages.
- **Proof, not adjectives.** The strongest material is already in the product: the Rulebook (every rule with its source and the date it was checked), the daily law watch, and the working shown beside every date. Public, plain-English rule pages would be useful to any landlord and bring them in.
- **Pages it needs:** what Loop does for an owner; what Pool does for a renter; pricing; how the law is kept current; who is behind it; terms; privacy; "general information, not legal advice".
- **The demo stays.** "Try it with a made-up portfolio" is the existing prototype, with no sign-up.

### 2.2 From stranger to customer

1. Sign up with an email and verify it.
2. Create the organisation and say who owns the homes (person, partnership, trust, company).
3. Add the first home. Reading the tenancy agreement from a PDF already works.
4. Choose a plan. The plan data already says what each includes.
5. Card details, taken by the payments provider's own form so card numbers never touch Loop.
6. Invite the tenant to Pool, and any co-owner or accountant.

Open choices: whether there is a free plan, a free trial, or both; and whether the card is asked for before or after the first home is in.

### 2.3 The life of a paid account

`Org.status` already has the states: `trialing`, `active`, `past_due`, `suspended`, `churned`. What each has to mean:

| State | What the owner can do | What Loop does |
| --- | --- | --- |
| Trialing | Everything in the plan | Says when the trial ends, well before it does |
| Active | Everything in the plan | Charges monthly, sends a receipt |
| Past due | Everything, for a grace period | Warns before the card expires, retries, emails, shows a bar in the app. The demo's own feedback has a customer saying they only found out when the bar appeared |
| Suspended | Read everything, export everything, pay. Nothing else | Stops automatic work for the account |
| Churned | Nothing after a stated period | Keeps the records for the period the law and the terms require, then deletes them |

Consequences to design for, not after:

- **A landlord's legal duties do not stop when their card fails.** They must still be able to produce their records, and a deadline does not move. Suspension has to be read-only with export, never a locked door. Whether deadline reminders keep going out during suspension is a decision to make deliberately.
- **A tenant is not the customer.** If the owner stops paying, the renter in Pool still needs to report an urgent repair and see their own records. Pool access must not hang off the owner's billing state without thought.
- **Enforcement belongs on the server.** One function answers "may this organisation do this?", from its plan and its state. Every server action asks it; the screens use the same answer to show a refusal with its reason, never a dead button.
- **Plan limits are the same mechanism.** "One home on the free plan" and "suspended accounts cannot serve a notice" are both entitlements.
- **Changing plan mid-month, adding a sixth home, and cancelling** each need a stated rule for what is charged.
- **The team console becomes the billing desk:** payment events in the audit log, a manual grace extension, refunds, and the "called before suspending" step the demo's task queue already asks for.
- **Tax on the subscription, and the fee on tradespeople's work,** need an accountant and a lawyer before a price is published.

### 2.4 A sensible order

1. Database, sign-in and row-level security: nothing else is real without them.
2. Billing and entitlements, with suspension enforced.
3. Real notice delivery and reminders, because they are why a landlord pays.
4. The public site and self-serve sign-up, once there is something to sign up to.
5. File storage, then the bank feed, then signing.
6. The bond API, listings and the provider network, as their outside conversations allow.

The outside conversations with lead times nobody publishes (bank-feed access, the bond API, a listing feed) should start first, in parallel with step 1.

## 3. Decisions waiting on a person

- Free plan, free trial, or both; card before or after the first home.
- What a suspended account keeps: reminders? tenant access in Pool? for how long before churn?
- How long records are kept after an account closes, stated in the terms.
- The name. The research found two clashes (`docs/research/round-2/00-what-next.md`).
- Whether Pool is free to renters forever, and what a renter keeps if their landlord leaves.
- The fee model for tradespeople's work, after legal advice.
