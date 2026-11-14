# Loop & Pool

A property-management platform built from Sam's spec (`docs/spec/`): **Loop** for owners, **Pool** for renters, and a **team console** for the people who run it. New Zealand first; a jurisdiction is a data file. This repo is the prototype: local-first, demo data, hosted on GitHub Pages, architected to move to Supabase.

**The product's job is to make a first-time landlord competent and a renter fairly treated.** Complex law made plain, and beautiful. When two designs both work, the simpler one wins.

## Honesty

- **The law is never written from memory.** Every statutory value lives in a rule pack (`src/domain/jurisdictions/`) with its citation, source URL and the date it was checked. A new value needs a source in `docs/research/`. Screens read rules through `usePack()`; they never hard-code "21 days".
- **Publishing is not commencement.** A value published ahead of the date it comes into force is held until then (`resolvePack(code, versions, on)`). Wherever `rule.plain` is printed, `<RuleMoves>` is printed with it. Sentences read their numbers from the pack; `no-typed-law.test.ts` checks the assistant and the action queue.
- **Show the working.** A date comes with the steps that produced it (`<Working>`), a rule with its source (`<Why>`). Loop's own safety margin is always marked "not law".
- **A refusal is a sentence with its reason, where it is refused** (`<Refusal>`). Never a silently disabled control.
- **It is a prototype of a real product.** Every part is meant to work for a paying customer. `docs/GOING-LIVE.md` logs what each simulated or on-device part needs and where the real version plugs in; change its row in the same commit as the feature. Build to that seam: screens call a mutation, never the stand-in behind it.
- **Demo data is labelled.** People are invented; simulated things (bank feed, integrations) say so on screen. Nothing fake is presented as real, and there is no password field that protects nothing.
- **The assistant never guesses.** It answers from the rule pack or a taught entry, with sources, or says it does not know and sends the question to a person.
- **Report what was measured.** A failing test is a bug to fix, never an assertion to soften.

## How a screen gets built

1. Say what this screen does that no other screen does. If the answer is nothing, it is a copy.
2. Design it for its own job. Three brands share one kit and differ in `src/styles/tokens.css`; they must not share compositions. Never "same treatment as X".
3. Read tokens, never a literal colour, font or radius. Light and dark both come from tokens.
4. Use the kit (`src/ui/`) on Base UI primitives. A library in `package.json` is there to be used: motion for things that move with purpose, NumberFlow (`<Money>`, `<Num>`) for every figure that can change.
5. It works at six sizes: 390×844, 844×390, 834×1112, 1280×800, 1440×900, 1920×1080. Tables become cards on a phone. Nothing overflows sideways.
6. Every list has an empty state that says what the area is for and the one thing to do.
7. **It is not done until it has been opened in a browser and looked at.** Built is not good.

## Shape

- `src/domain` is pure: no React, no DOM, no store. Rules, calculators, the demo world, the assistant, self-healing.
- `src/data/store.ts` is the only persistence. Every tenant-owned record carries `orgId`; landlord screens read through `useOrgRows`. Screens change data through `src/data/*mutations.ts`, never by writing to the store directly.
- `src/routes/*` are thin: each imports a screen from `src/screens/<portal>/`. A route's `validateSearch` parser lives in a module that imports no component (`screens/admin/search.ts`, `screens/pool/*/params.ts`); a parser exported from a screen pulls that screen into every portal's first download.
- A calendar date is a `YYYY-MM-DD` string. Never `.slice(0, 10)` an instant — use `dateOf()`.
- A grid child that holds a scroller or truncated text needs `grid-cols-[minmax(0,1fr)]` or `min-w-0`. A horizontally scrolling box that contains `sr-only` text must be `relative`. Either one, missed, widens the page on a phone.
- `src/domain/watcher.ts` has no imports on purpose: the nightly script loads it with Node directly.
- All `<user>.github.io` projects share one origin: storage keys, database names and cache names are prefixed `loop-pool`.

## Commands

- `npm test` — typecheck, lint, unit tests. Must pass before every push.
- `npm run dev` — the app on port 5200.
- `npm run e2e` — every screen at the six sizes, against the Pages build (build it first), in about two minutes. Fails on a thrown error, a sideways scroll or a placeholder.
- `npm run e2e:clicks` — presses every control in each portal and checks every sheet fits on a phone. About 45 minutes for all three; `npm run e2e:clicks -- -g pool` (or `loop`, `admin`) runs one.
- `node scripts/reg-watch.mjs --dry` — read the official sources and report, writing nothing. Without `--dry` it updates `public/regwatch/feed.json` and `regwatch/state/`.
- `npm run build:pages` then `npm run preview:pages` — the GitHub Pages build at `/propertymanagementsoftware/` on port 5201. Never pass `--base /x/` on the command line: Git Bash rewrites it into a Windows path.

## Working

- The Rulewatch workflow commits to `main` once a day. `git pull --rebase` before pushing.
- Lint warnings fail the deploy. Read the output of `npm test` before committing; a chained command does not stop on a warning.
- Commit and push `main` at every checkpoint; the owner watches the live site. While agents are writing, `git add` by path.
- At most two build agents at once on this machine, and browser checks run alone.
