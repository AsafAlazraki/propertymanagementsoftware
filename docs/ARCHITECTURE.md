# Architecture

How Loop & Pool is put together, why, and what changes when it stops being a prototype.

## The shape

```
src/domain      pure TypeScript — rules, calculators, the demo world. No React, no DOM, no store.
src/data        the store, and the only functions allowed to change it
src/ui          the component kit (Base UI primitives, tokens)
src/shell       the three portal frames
src/screens     one folder per portal; each screen does one job
src/routes      thin files that mount a screen (TanStack Router, file-based)
```

Dependencies point one way: screens use data and domain; data uses domain; domain uses nothing. That is what lets the same calculators run in a unit test, in the browser, and inside the Rulewatch "what would change" table.

### The law is data

A jurisdiction is a file: `src/domain/jurisdictions/nz.ts`. Each rule is a value with its plain-English text, citation, source URL, how it was verified and when. Calculators in `src/domain/rules/` take a pack and return an answer **with its steps**, so every date on screen can show its working. Screens read rules only through `usePack()`.

`resolvePack(code, versions, on)` lays admin-published overrides over the shipped file, as the law stands on the day `on` (today, unless a date is passed). Publishing a change in the team console therefore changes what every calculator returns, with no deploy, and every notice records the pack version that produced it.

Publishing is not commencement. Each override carries the date it comes into force (`RulePackVersion.commences`). Before that date the rule keeps its value and gains `upcoming`; from that date the value moves and the rule gains `revised`, because its plain-English text was written for the shipped value. `<RuleMoves>` prints both, and goes wherever `rule.plain` goes. Sentences outside the pack read their numbers from it too: `src/domain/no-typed-law.test.ts` fails if a number of days, weeks, months or hours is typed into the assistant or the action queue.

Loop's own safety margin is a field on the pack (`safetyBufferDays`) and is marked "not law" wherever it appears.

### Multi-tenancy

Every landlord-owned row carries `orgId`. Landlord screens read through `useOrgRows`, which filters by the signed-in organisation; nothing else is allowed to. The team console reads across organisations and can "view as owner", which sets `session.impersonatedBy` and shows a banner for as long as it lasts.

In production this filter moves from the client to the database. `supabase/migrations/0001_init.sql` is the same data as tables, with Row-Level Security policies built on three functions — `is_org_member`, `can_write_org`, `is_platform_admin` — plus `is_tenant_of` for the renter's side. The policies encode product rules that must not depend on a screen behaving:

- an application cannot be above the advertised rent (a trigger, not a form check);
- a served notice has no update policy, so it cannot be edited afterwards;
- a landlord can read a renter's profile only for a preferred applicant who has chosen to share it;
- the audit log is append-only for everyone;
- an unsuccessful applicant's details are removed on a schedule.

### Self-healing, with a person in the loop

`src/domain/healing.ts` sweeps the records for faults it knows how to mend: a bond marked lodged with no reference, a confident rent match left unapplied, a listing still live on a let home, a job assigned to an unvetted provider, personal details kept past their date. Each fault is an incident tied to a playbook. A playbook either asks first or runs on its own.

It learns by counting. Each approval or rejection is recorded on the playbook. After three approvals with no rejection the console **suggests** making it automatic; a person accepts or declines. Nothing promotes itself, and an automatic playbook can be put back on approval at any time.

### Staying current with the law

See "How the rules stay current" in the README. The pieces:

| Piece | Where | Job |
| --- | --- | --- |
| Source registry | `regwatch/sources.json` | 65 official pages, feeds and APIs, each with the region to read, how often, and what was observed when it was tested |
| Reader | `src/domain/watcher.ts` | Region extraction, line hashing, comparison. No imports, so the nightly script and the unit tests run the same file |
| Job | `scripts/reg-watch.mjs`, `.github/workflows/regwatch.yml` | Polite fetching, state, the feed, the optional draft |
| Review | `src/domain/regwatch.ts`, team console → Rulewatch | Guardrails, impact analysis, two-reviewer approval, publish, roll back |

The design follows the evidence in `docs/research/regulatory-watch-sources.md`: models hallucinate on specific legal questions often enough that none is allowed to decide. Detection is a diff. A model may draft. A person approves.

## From prototype to production

| Today | Production | Where the seam is |
| --- | --- | --- |
| zustand store in `localStorage` | Supabase Postgres with RLS | `src/data/store.ts` and the `*mutations.ts` files: each mutation becomes a server action of the same name, where the rule checks run again |
| Choosing a demo persona | Supabase Auth | `src/app/session.ts` |
| Photos in IndexedDB | Supabase Storage | `src/data/photos.ts` |
| Simulated bank feed | An open-banking provider that reads the landlord's own account | `rollForward` in `src/domain/seed/simulate.ts` is the stand-in |
| Simulated tradespeople, notices "served by email" | Real messaging and a provider network | the mutation that records the event is where the send goes |
| Rule overrides in the browser store | `pack_versions` table, read by every client | `resolvePack` |
| Assistant answers from rules and taught entries | The same, with a model allowed to phrase the answer but not to supply facts | `src/domain/copilot.ts` |
| GitHub Pages | Any static host; the app is a static bundle plus an API | `vite.config.ts` |

The platform never holds rent, in either column. Rent moves from the tenant's bank to the landlord's; Loop reads the landlord's feed and keeps count. That is a product decision with a regulatory reason, recorded in the rule pack's upcoming changes.

## Conventions that are easy to break

- A calendar date is a `YYYY-MM-DD` string. Never `.slice(0, 10)` an instant; use `dateOf()`.
- A refusal is a sentence with its reason (`<Refusal>`), never a silently disabled control.
- Tokens only: no literal colour, font or radius in a screen.
- A grid child that holds a scroller or truncated text needs `grid-cols-[minmax(0,1fr)]` or `min-w-0`, or it will widen the page on a phone.
- Screen-reader-only text inside a horizontally scrolling box needs the box to be `relative`, or it widens the page.
- All `<user>.github.io` projects share one origin: storage keys, database names and cache names are prefixed `loop-pool`.
