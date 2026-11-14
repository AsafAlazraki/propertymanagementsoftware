# Loop & Pool

**Loop** puts a rental on autopilot for the person who owns it. **Pool** gives the person who lives in it a fair search, a one-tap application and a rental record that travels with them. One product, two sides of the same tenancy, built New Zealand-first on a rules engine that swaps jurisdictions as data.

This repository is a working prototype: every screen runs on made-up people and real, cited 2026 tenancy law.

> **Status:** in active build. The rules engine, demo world, shells and welcome screen are in; portal screens are landing push by push.

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

`npm test` runs the type check, the linter and the rules-engine tests. The date maths is pinned to Tenancy Services' own worked examples.

## What is where

| Path | What it holds |
| --- | --- |
| `src/domain/` | Pure TypeScript: the rule packs, statutory calculators, compliance score, action queue, assistant, self-healing engine and demo world. No React, no DOM. |
| `src/domain/jurisdictions/` | One rule pack per jurisdiction. `nz.ts` is live; the Australian states are previews. Every value carries its citation, source link and the date it was last checked. |
| `src/data/store.ts` | The local repository. Every tenant-owned record carries `orgId`; this is the seam where Supabase plugs in. |
| `src/ui/` | The component kit, on Base UI primitives. Three brands share it and differ only in `src/styles/tokens.css`. |
| `src/shell/`, `src/routes/` | The three portals: Loop (owners), Pool (renters), and the team console. |
| `regwatch/` | The legal sources the scheduled watcher reads. |
| `docs/research/` | The research the product is built on, with sources: NZ tenancy law, property standards, tax and privacy, Australian states, competitors, operations data, the stack, and the watch list. |

## Honest limits

- No accounts and no backend yet. "Signing in" is choosing a demo persona, and the interface says whose eyes you are looking through.
- The bank feed is simulated, and labelled as such.
- The assistant answers from the verified rule pack and your records; it is not a language model in this build, so it cannot invent a rule.
- The Australian packs are previews and drive no calculator.
- Nothing here is legal advice.
