# What next: round two, in one page

Five pieces of work were done on 14 November 2026, after every screen was built and checked. Each has its own report in this folder; this page is what they add up to.

| Report | Question |
| --- | --- |
| `01-landlord-and-renter-pain.md` | What do New Zealand landlords and renters struggle with that the product does not solve yet? |
| `02-best-in-class-patterns.md` | What do the best products elsewhere do that this one does not? |
| `03-trustworthy-ai.md` | Where would a model help, and how must each use be built to be trusted? |
| `04-quality-audit.md` | What would a careful person still fix in the build? |
| `05-making-it-real.md` | What does it take to make each simulated thing real in New Zealand? |

**A limit on all of it.** The session's web-search allowance was already spent, so the researchers read known pages directly rather than searching. Reviews, several forums and some vendor help centres were out of reach; each report lists what it could not read and marks what it could not verify. Treat the rankings as a strong first read, not a census.

## Fixed straight away

The audit found defects, not just polish. These were fixed the same day:

- A quote above the owner's second-approval line was booked on one person's yes, while the screen promised a second. It now waits for a different owner.
- The assistant and the action queue typed statutory numbers into their sentences, so a published law change would have moved the calculators and left the words behind. Sentences now read the rule pack, and a test fails if a number of days, weeks, months or hours is typed into them again.
- A notice "served by email" sent nothing and did not say so. It now says it is recorded, and refuses email where there is no address for service.
- "Copy" said "copied" when the browser had refused.
- Contrast failures (white on red in dark mode, form outlines, the switch), animations that ignored reduced motion, a one-tap demo reset, a cleared date that saved nonsense, and a storage-full error that lost work silently.
- Every first visit downloaded the whole team console. Route search parsers now live in their own small files so each portal loads only itself: what the browser fetches before the first screen went from 45 files and 551 KB (gzip) to 15 files and 236 KB.

Three more were found while fixing those:

- **Publishing a law change brought the law forward.** A change dated 1 July 2027 that the team published today would have moved every calculator today. A published value is now held until its commencement date. Until then the rule, the Rulebook and the assistant say what is coming and when; on the day it switches by itself.
- **A changed figure kept its old sentence.** A rule's plain-English text is written for the shipped value. Wherever that text is shown, a published change now prints above it: what the figure is now, what it was, and that the explanation predates it.
- **The assistant could not answer one of the questions it suggests** ("How much notice do I give to move out?"), missed "terminate" and "evicted", and a taught answer about smoking answered every smoke-alarm question. All fixed, with a test that asks every suggested question in both portals.

Left as it is, and labelled on screen: suspending an account in the team console shows the owner a notice and switches nothing off.

## Build next, in order

All of these work in the local-first prototype. The order is by how much evidence there is that people need it.

1. **Bond settlement at move-out.** Entry and exit condition side by side, itemised lines the renter answers one by one, ending in a claim both sides have seen. Bond refunds appear in 41% of Tribunal applications (`01`), and inspection products elsewhere make the comparison the centrepiece (`02`). Before any countdown is shown, reconcile the two response windows in round one's notes (10 working days in one file, 12 in another).
2. **Creating a listing.** A landlord cannot list a home today; listings exist only in the demo data (`02`). Build it as a listing kit with a hand-off, because the portals' feeds are by negotiation and exclude tools for non-trade users (`05`). One fixed price, name-and-contact-only enquiries, and viewings the sitting tenant agrees to.
3. **A rent statement for the renter**, every period shown, with "this line is wrong" (`01`).
4. **A visible repair clock, and the renter's own notice to remedy.** A third of surveyed renters had never heard of one (`01`).
5. **A written catch-up arrangement** for arrears that the tenant can see, with the mediation hand-off (`02`). One point of law to check first: whether an arrangement affects overdue-rent notices.
6. **Water and outgoings pass-through.** 17% of applications, and missed in round one (`01`).
7. **Leaving a fixed term early**, with a costs sheet limited to actual costs (`01`).
8. **Entering insurance details.** They drive the inspection rhythm and there is no screen for them (`02`).
9. **Rent review in both directions**, and "is my rent in line?" for renters. Rents fell through 2025 (`01`).
10. **Manual rent entry and bank CSV import as a permanent path**, not a fallback. Until mid-2027 the big banks need only expose accounts visible in personal banking, so trust and two-signatory accounts may not connect (`05`). The demo landlord is exactly that case.
11. **Paths and a glossary**: walk-throughs for a situation ("my tenant has stopped paying"), in the product's own plain words (`02`).

## Needs a backend

One thread per tenancy with email and text fallback; a Rent Passport link that expires and can be revoked; reminders and a digest; a read-only bank feed through an intermediary; signing; billing; the bond API in its sandbox. `05` gives the order, the costs it could confirm, and the conversations with unpublished lead times that should start first.

## Where a model belongs

Six uses, each with the one guardrail it cannot do without (`03`): understanding the question (it returns an intent from a closed list; the calculators answer), reading agreements and invoices (it points at the words; code confirms them), drafting messages from facts (placeholders only; code fills the values), translating fixed content (a qualified person signs each string), a second reader on repair reports (it can raise urgency, never lower it), and inspection photo notes (suggestions the inspector confirms; never a score, cause or cost).

Three to refuse: a free-form legal assistant, anything that scores or ranks applicants, and verdicts from photos.

## Assumptions the research challenges

- **A former landlord is not a neutral referee.** Posts describe retaliatory references after Tribunal cases. The Rent Passport should weigh the ledger above a reference and let a renter contest one.
- **"Warm and dry" on a listing repeats the landlord's own assessment.** Many renters told their home complied still report damp. Say whose assessment it is.
- **No-cause termination may not survive the election.** It is a dated value the watcher is already tracking; the screens should not treat it as settled.
- **The Tribunal record is one bundle.** The arrears track wants an arrears-only claim.

## Needs a lawyer or a phone call

- Whether taking commission on tradespeople's work stays outside financial-services and anti-money-laundering law, and whether the proposed regulation of property managers could reach a platform.
- The bank-feed intermediary's price, how long consent lasts, and whether trust accounts connect.
- Whether a listing feed to the main portal is available at all to a tool like this.
- That paid advice on running a Tribunal case is reserved to lawyers. The record the product builds is the landlord's own, and it says so; keep it that way.
- The name. "Pando Loop Tenancy" is already an integrated bond vendor, and "RentPassport" is another company's product.
