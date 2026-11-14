# Loop & Pool

A property-management platform built from Sam's spec (`docs/spec/`): **Loop** for owners, **Pool** for renters, and a **team console** for the people who run it. New Zealand first; a jurisdiction is a data file. This repo is the prototype: local-first, demo data, hosted on GitHub Pages, architected to move to Supabase.

**The product's job is to make a first-time landlord competent and a renter fairly treated.** Complex law made plain, and beautiful. When two designs both work, the simpler one wins.

## Honesty

- **The law is never written from memory.** Every statutory value lives in a rule pack (`src/domain/jurisdictions/`) with its citation, source URL and the date it was checked. A new value needs a source in `docs/research/`. Screens read rules through `usePack()`; they never hard-code "21 days".
- **Show the working.** A date comes with the steps that produced it (`<Working>`), a rule with its source (`<Why>`). Loop's own safety margin is always marked "not law".
- **A refusal is a sentence with its reason, where it is refused** (`<Refusal>`). Never a silently disabled control.
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
- `src/routes/*` are thin: each imports a screen from `src/screens/<portal>/`.
- A calendar date is a `YYYY-MM-DD` string. Never `.slice(0, 10)` an instant — use `dateOf()`.
- All `<user>.github.io` projects share one origin: storage keys, database names and cache names are prefixed `loop-pool`.

## Commands

- `npm test` — typecheck, lint, unit tests. Must pass before every push.
- `npm run dev` — the app on port 5200.
- `npm run build:pages` then `npm run preview:pages` — the GitHub Pages build at `/propertymanagementsoftware/` on port 5201. Never pass `--base /x/` on the command line: Git Bash rewrites it into a Windows path.

## Working

- Commit and push `main` at every checkpoint; the owner watches the live site. While agents are writing, `git add` by path.
- At most two build agents at once on this machine, and browser checks run alone.
