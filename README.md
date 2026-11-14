# Loop & Pool

**Loop** puts a rental on autopilot for the person who owns it. **Pool** gives the person who lives in it a fair search, a one-tap application and a rental record that travels with them. A **team console** is where the people who run the platform see every customer, review every change to the law and approve what the self-healing engine proposes. One product, three front doors.

This repository is a working prototype: every screen runs on made-up people and real, cited 2026 New Zealand tenancy law. It is built from Sam's specification in `docs/spec/`, checked and corrected against primary sources in `docs/research/`.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

`npm run dev` serves the app on port 5200. `npm test` runs the type check, the linter and the unit tests; the date maths is pinned to Tenancy Services' own worked examples. Node 24 is expected.

There is no sign-in. Choosing a door on the welcome screen puts you in the shoes of a demo person, and the interface always says whose.

| Door | Who you are | Start at |
| --- | --- | --- |
| Loop | Hana Whitaker, who owns five homes in Nelson through a family trust | `/loop` |
| Pool | Mia Thompson, who rents one of them (or Chloe Martin, who is looking) | `/pool` |
| Team console | Riley Chen, on the platform team | `/admin` |

## What is where

| Path | What it holds |
| --- | --- |
| `src/domain/` | Pure TypeScript, no React and no DOM: rule packs, statutory calculators, the compliance score, the action queue, fault triage, notice wording, the assistant, the self-healing engine, Rulewatch and the demo world. |
| `src/domain/jurisdictions/` | One rule pack per place. `nz.ts` is live; five Australian states are researched previews that drive nothing. Every value carries its citation, its source link and the date it was last checked. |
| `src/data/` | `store.ts` is the only persistence. Screens change data through the `*mutations.ts` files, never directly. Every landlord-owned row carries `orgId`. |
| `src/ui/` | The component kit, on Base UI primitives. Three brands share it and differ only in `src/styles/tokens.css`. |
| `src/screens/`, `src/routes/` | The screens, by portal. Routes are thin files that mount a screen. |
| `scripts/reg-watch.mjs`, `regwatch/` | The scheduled watcher, the sources it reads and what it remembers between runs. |
| `supabase/migrations/` | The production schema with Row-Level Security. Not applied anywhere yet. |
| `docs/` | Sam's spec, the research with its sources, and `ARCHITECTURE.md`. |

## How the rules stay current

1. **A scheduled job reads the official pages.** `.github/workflows/regwatch.yml` runs `scripts/reg-watch.mjs` once a day. It fetches each source in `regwatch/sources.json`, takes the one region of the page that carries the law, and compares it line by line with the last reading. A bot-challenge page or a missing region is recorded as "could not read", never as a change.
2. **What moved is published as a feed.** `public/regwatch/feed.json` carries which sources were read, which changed, and a few short quoted lines of what was added. `regwatch/state/` holds hashes only, so committing it republishes nobody's page.
3. **A person decides.** In the team console, Rulewatch shows the change, the quote it rests on, nine computed guardrails, and what the real calculators would answer before and after. High-impact rules need two different reviewers. Publishing creates a new pack version; rolling back creates another.
4. **Every calculator picks it up, on the day the law does.** Screens read rules only through `usePack()`, so a published change reaches every date, limit and sentence in the product at once. A change published ahead of its commencement date is held until that date: the calculators keep the law as it is, and the rule, the Rulebook and the assistant say what is coming and when.

An AI draft is optional and never decides anything. If the repository has an `ANTHROPIC_API_KEY` secret, each detected change is sent to Claude (`claude-opus-5-5`) for a plain-English summary and, at most, a proposed patch. The draft is kept only if its quote appears in the page word for word, and its confidence is worked out from the evidence, not taken from the model. Without the secret the watcher works exactly the same and reviewers read the raw lines. This path has been written but not yet run against the live API.

To read the sources by hand:

```bash
node scripts/reg-watch.mjs --dry
```

## Deploying

`.github/workflows/pages.yml` runs the checks on every push to `main`, builds with the base path `/propertymanagementsoftware/` and publishes `dist` to the `gh-pages` branch. To serve it, the repository's Pages setting must be "Deploy from a branch: `gh-pages`". GitHub Pages serves a private repository only on a paid plan.

```bash
npm run build:pages
```

```bash
npm run preview:pages
```

## Honest limits

- **No accounts and no backend.** Data lives in this browser. The schema that would hold it is in `supabase/migrations/0001_init.sql` and has not been applied to a live database.
- **Simulated, and labelled so on screen:** the bank feed, payments and payouts, the Bond Hub hand-off, listing syndication, tradespeople and inspectors, email and text delivery, and billing.
- **The assistant is not a language model.** It answers from the verified rule pack, the team's taught answers and your own records, with its sources, or says it does not know and passes the question to a person.
- **The Australian packs are previews.** They are researched and compared, and no calculator runs on them.
- **Photos in listings are illustrations**, drawn from each home's record, and marked as such.
- **Nothing here is legal, tax or financial advice.**
