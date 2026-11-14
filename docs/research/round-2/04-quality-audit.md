# Round 2, report 04: quality audit

Prepared 14 November 2026 for Loop & Pool. A read-only review of `src/` and the built copy in `dist/`: accessibility against WCAG 2.2 AA, performance, offline and install, copy and language, and robustness. No source was changed, no browser or build was run.

## 0. How to read this

**Defect** means it breaks one of the project's own rules (`CLAUDE.md`, `docs/ARCHITECTURE.md`), a WCAG 2.2 A/AA criterion, or a person using the product. **Polish** means it works and could be better. Every finding gives the file and line, who it affects, and the fix.

**What was measured, and how.** Numbers come from four small Node scripts run against the repository as it stood:

- Contrast: `src/styles/tokens.css` parsed, the cascade resolved for `<html data-brand data-theme>` (specificity first, then source order), OKLCH converted to sRGB (channels clipped and rounded to 8 bits, which is what Chrome and Safari paint), WCAG 2.x ratio computed.
- Bundles: every file in `dist/assets`, raw bytes and gzip level 9 via `node:zlib`; the entry's static import closure walked from the built files.
- Precache: the manifest inside `dist/sw.js`, each entry sized on disk.
- Store size: the project's own `buildSeed` → `rollForward` → `sweep`, run in Node 24, then `JSON.stringify` in the shape `zustand/persist` writes.

**Limits.** Nothing was looked at in a browser, so rendering claims are from reading code. `dist/` was rebuilt three times while it was being read (the hashes of `index-*.js` changed; the sizes did not), so files are named without hashes. Tokens marked "outside sRGB" below would be a little more saturated on a P3 screen; the ratios are for sRGB. Where this report mentions the law it quotes the repository's own research notes, never memory.

**Already clean (one line each).**

- Accessible names: 409 `<button>`, `<Button>`, `<Link>` and `<a>` elements scanned; none is without text, `aria-label` or screen-reader text.
- Form labelling: all 120 `<Field>` uses spread their `id`/`aria-describedby`/`aria-invalid` onto a control; all 142 inputs, selects and textareas have a label.
- Headings: every screen has one `h1`; `h2`/`h3` nest sensibly. Landmarks, the skip link and `aria-current` are in all three shells.
- Colour alone: statuses are an icon and a word everywhere checked (`Status`, `Flag`, `Badge`, compliance rows).
- Charts: `ChartFrame` gives every chart a `role="img"` name and a real table on request; `Segments` carries its values in the label and the legend.
- Images: four `<img>` elements, all with `alt`. No `autoFocus`, no positive `tabIndex`, no `dangerouslySetInnerHTML`.
- CSS motion: the global `prefers-reduced-motion` rule in `app.css:188` covers every CSS animation and transition, including the inline ones.
- Te reo Māori: place and personal names carry their macrons (Tāhunanui, Tōtara, Pūriri, Mānuka, Wakatū, Kererū, Māpua, Hēnare, whānau). One possible miss is in C-12.

---

## 1. Accessibility

### 1.1 Contrast

All text pairs the brief listed pass in all six scopes. The table is the computed ratio.

| Pair | Needs | loop light | loop dark | pool light | pool dark | admin light | admin dark |
|---|---|---:|---:|---:|---:|---:|---:|
| ink on bg | 4.5 | 16.10 | 17.20 | 15.76 | 16.90 | 16.85 | 17.44 |
| ink on surface | 4.5 | 17.12 | 15.99 | 16.38 | 15.38 | 18.18 | 16.43 |
| ink on sunken | 4.5 | 15.09 | 17.75 | 14.60 | 17.70 | 15.84 | 17.95 |
| ink-2 on bg | 4.5 | 7.56 | 9.97 | 7.79 | 9.96 | 7.87 | 10.18 |
| ink-2 on surface | 4.5 | 8.05 | 9.26 | 8.10 | 9.06 | 8.49 | 9.60 |
| ink-2 on sunken | 4.5 | 7.09 | 10.28 | 7.22 | 10.43 | 7.40 | 10.49 |
| ink-3 on bg | 4.5 | 5.15 | 6.69 | 5.25 | 6.74 | 5.11 | 6.79 |
| ink-3 on surface | 4.5 | 5.48 | 6.22 | 5.46 | 6.13 | 5.52 | 6.39 |
| ink-3 on sunken | 4.5 | 4.83 | 6.90 | 4.87 | 7.06 | 4.81 | 6.99 |
| accent-ink on accent | 4.5 | 5.46 | 9.85 | 4.62 | 7.15 | 6.42 | 7.88 |
| accent-text on accent-soft | 4.5 | 6.36 | 8.10 | 5.19 | 6.38 | 6.54 | 7.26 |
| accent-text on surface | 4.5 | 7.17 | 10.50 | 6.01 | 7.77 | 7.54 | 9.07 |
| ok-text on ok-soft | 4.5 | 7.07 | 8.61 | 6.94 | 8.95 | 7.07 | 8.61 |
| warn-text on warn-soft | 4.5 | 6.84 | 8.93 | 6.84 | 8.93 | 6.84 | 8.93 |
| danger-text on danger-soft | 4.5 | 6.45 | 7.18 | 6.45 | 7.18 | 6.45 | 7.18 |
| info-text on info-soft | 4.5 | 6.61 | 7.80 | 6.61 | 7.80 | 6.61 | 7.80 |
| nav-ink on nav | 4.5 | 15.78 | 17.61 | 16.38 | 17.61 | 16.67 | 17.90 |
| nav-ink on nav-2 | 4.5 | 13.55 | 15.79 | 15.36 | 15.79 | 14.72 | 16.28 |
| nav-ink-2 on nav | 4.5 | 8.36 | 8.70 | 5.46 | 8.70 | 8.51 | 8.85 |
| nav-ink-2 on nav-2 | 4.5 | 7.18 | 7.80 | 5.12 | 7.80 | 7.51 | 8.05 |
| ink-3 on accent-soft (the source line in `Why`) | 4.5 | 4.86 | 4.80 | 4.71 | 5.03 | 4.79 | 5.12 |

Thinnest margins: ink-3 on sunken in light (4.81–4.87) and accent-ink on accent in Pool light (4.62). Neither has room for an opacity modifier on top.

Pairs that fail, all found by looking at what the code actually puts together (bold is under the threshold):

| Pair, and where it is used | Needs | loop light | loop dark | pool light | pool dark | admin light | admin dark |
|---|---|---:|---:|---:|---:|---:|---:|
| white on danger: `Button` danger, tab count badge | 4.5 | 5.39 | **3.15** | 5.39 | **3.15** | 5.39 | **3.15** |
| line-strong on surface: outline of every input, select, textarea, checkbox, custom radio | 3 | **1.64** | **1.72** | **1.68** | **1.83** | **1.69** | **1.69** |
| Switch off: track (line-strong) on surface | 3 | **1.64** | **1.72** | **1.68** | **1.83** | **1.69** | **1.69** |
| Switch off: white thumb on its track | 3 | **1.64** | 10.44 | **1.70** | 9.31 | **1.69** | 10.93 |
| Switch on: white thumb on accent | 3 | 5.61 | **1.88** | 4.72 | **2.55** | 6.63 | **2.44** |
| accent-ink at 80% on accent: weekday and month on the chosen day (`decisions/tenancy.tsx:370,372`, Loop only) | 4.5 | **4.09** | 6.46 | – | – | – | – |
| ink-2 at 70% on surface: topic counts (`Rulebook.tsx:151`, Loop only) | 4.5 | **3.72** | 5.14 | – | – | – | – |
| accent-text on nav-2: the `§` in `<Why tone="nav">` (decorative) | 4.5 | **2.15** | 10.50 | – | – | **2.22** | 9.07 |
| warn fill on surface: `Ring`, `DayTrack`, score arcs | 3 | **2.36** | 9.44 | **2.34** | 8.95 | **2.36** | 9.74 |
| warn fill on sunken: `Bar` | 3 | **2.08** | 10.48 | **2.08** | 10.30 | **2.05** | 10.64 |
| series-3 on surface | 3 | **2.82** | 5.27 | **2.79** | 5.00 | **2.82** | 5.44 |
| series-4 on surface | 3 | **2.17** | 5.85 | **2.15** | 5.54 | **2.17** | 6.03 |
| focus ring on surface / bg / sunken / nav (passes, for the record) | 3 | 4.39 / 4.13 / 3.87 / 4.09 | 10.18+ | 4.68 / 4.51 / 4.18 / – | 7.30+ | 5.30 / 4.91 / 4.62 / 3.58 | 8.68+ |

Series 3 and 4 are acknowledged in `tokens.css:20` and covered by the table view, so they are not counted as defects.

Tokens outside sRGB (clipped for this calculation): loop light `accent, accent-hover, accent-text, focus, ok, ok-text, warn-soft, danger-soft, info-soft`; loop dark `accent-ink, danger-text, info-text`; pool light `surface, accent-ink, accent-soft, accent-line, glow, ok, ok-text` plus the three inherited `-soft` tones; pool dark and admin dark `accent, accent-hover, accent-text, glow, focus, danger-text, info-text`; admin light `accent-ink, accent-soft, glow, ok, ok-text` plus the three `-soft` tones.

**A-01 · Defect · `src/ui/Button.tsx:24`, `src/shell/common.tsx:163`.** `text-white` on `bg-danger` is 3.15:1 in dark in every brand. It is the label of "Reset the demo", "Serve this notice by email" and the unread count on a phone tab. Affects anyone with low vision in dark mode. Fix: a token, so no literal colour is needed either.

```css
/* tokens.css — :root,[data-brand='loop'] */   --danger-ink: oklch(1 0 0);
/* tokens.css — [data-theme='dark']:root … */  --danger-ink: oklch(0.2 0.06 25);  /* 5.82:1 on dark danger */
/* app.css @theme inline */                    --color-danger-ink: var(--danger-ink);
```
Then `text-white` → `text-danger-ink` in both files.

**A-02 · Defect · `src/ui/controls.tsx:11` and `:125`; `src/screens/admin/kit.tsx:156,174`; the hand-drawn radio dots at `decisions/tenancy.tsx:194`, `pool/Listing.tsx:211`.** A field is a white box on a white card; its 1px `--line-strong` outline is all that marks it, at 1.64–1.83:1 (WCAG 1.4.11 asks for 3:1). Affects low-vision users on every form in all three portals. Fix: one new token used only for control boundaries.

```css
/* light */ --field-line: oklch(0.6 0.02 258);   /* 3.91–3.94:1 on surface */
/* dark  */ --field-line: oklch(0.58 0.02 260);  /* 3.98–4.33:1 on surface */
```
Replace `var(--line-strong)` with `var(--field-line)` in `fieldBase`, the checkbox, `SearchBox`, `Filter` and the radio dots.

**A-03 · Defect · `src/ui/controls.tsx:100–102`.** The Switch. Off, in light: the track is 1.64:1 against the card and the white thumb 1.64:1 against the track, so the control is barely there. On, in dark: the white thumb is 1.88–2.55:1 on the accent track, so the thumb's position, which is the non-colour signal, cannot be seen. Fix:

```tsx
className="… bg-ink-3 … data-checked:bg-accent …"                       // track: ink-3 is 5.46–6.39:1 on surface
<BaseSwitch.Thumb className="size-5 rounded-full bg-surface data-checked:bg-accent-ink …" />   // thumb: 5.5:1 or better off, 4.6–9.9:1 on
```

**A-04 · Defect · `src/screens/loop/decisions/tenancy.tsx:370,372`; `src/screens/loop/Rulebook.tsx:151`.** `opacity-80` and `opacity-70` on 11px text take two passing pairs under 4.5:1 (4.09 and 3.72). Fix: delete `opacity-80`; replace `opacity-70` with `text-ink-3` (and nothing when the row is selected).

**A-05 · Defect (honesty) · `src/styles/tokens.css:13`.** The comment says every pair "is checked for WCAG AA by `src/styles/tokens.test.ts`". That file does not exist, which is how A-01 to A-04 got through. Fix: add the test (parse the blocks, resolve the cascade for six scopes, convert, assert each pair in the two tables above against 4.5 or 3), or remove the sentence. The conversion is 20 lines:

```ts
const lin = ([L, C, H]: number[]) => { const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => Math.min(1, Math.max(0, c))) }
const Y = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]          // linear channels
const ratio = (a: number[], b: number[]) => (Math.max(Y(a), Y(b)) + 0.05) / (Math.min(Y(a), Y(b)) + 0.05)
```

**A-06 · Polish · `src/ui/display.tsx:104,130`, `src/ui/Law.tsx:114`, `CommandCentre.tsx:223,295`, `property/Compliance.tsx:343`.** The amber fill is 2.05–2.36:1 on light surfaces. The figure beside it always carries the value, so nothing is lost, but the picture is faint. Fix: a separate `--warn-fill: oklch(0.62 0.15 70)` for marks (3.75:1 on surface, 3.3:1 on sunken), leaving `--warn` for the support-view bar.

**A-07 · Polish · `src/ui/Law.tsx:34`.** On the navy cards (`Inspections.tsx:419`, `tenancies/Applicants.tsx:233`) the `§` is 2.15:1. Fix: `tone === 'nav' ? 'text-glow' : 'text-accent-text'`.

**A-08 · Polish · `src/styles/tokens.css:170–174`.** Pool points `--nav` at `--surface`, but in dark the rule `[data-theme='dark']:root` (specificity 0,2,0) beats `[data-brand='pool']` (0,1,0), so Pool dark gets Loop's navy `--nav`, `--nav-2`, `--nav-ink`. No Pool screen uses these tokens today, so nothing shows. Fix: repeat the five aliases inside the Pool dark block.

**A-09 · Polish · `src/shell/common.tsx:121`, `src/routes/index.tsx:67`.** Two literal colours (`text-[oklch(0.25_0.06_70)]`, `text-[oklch(0.8_0.15_80)]`) against the "tokens only" rule. The first measures 6.86:1 and 8.51:1, so it is a rule matter, not a contrast one. Fix: `--warn-ink` token.

### 1.2 Kit and shells

**A-10 · Defect · `index.html:11`, no route sets a title.** All 43 routes are titled "Loop & Pool" (WCAG 2.4.2). Affects screen-reader users, anyone with several tabs, browser history and the installed app's task switcher. Fix: the router's own head support.

```tsx
// each route file
export const Route = createFileRoute('/loop/money')({ head: () => ({ meta: [{ title: 'Money · Loop' }] }), … })
// src/routes/__root.tsx, inside Root()
<HeadContent />   // import { HeadContent } from '@tanstack/react-router'
```

**A-11 · Defect · `src/routes/__root.tsx:15`, `LoopShell.tsx:211`, `PoolShell.tsx:85`, `AdminShell.tsx:159`.** A route change moves neither focus nor a live region, so a screen-reader user who activates a nav link hears nothing and stays on the link. Fix: `tabIndex={-1}` on each `<main id="main">`, and in `Root`:

```tsx
const path = useRouterState({ select: (s) => s.location.pathname })
const first = useRef(true)
useEffect(() => { if (first.current) { first.current = false; return } document.getElementById('main')?.focus({ preventScroll: true }) }, [path])
```

**A-12 · Defect · `src/screens/loop/CommandCentre.tsx:124`, `src/screens/pool/home/Renting.tsx:34`, `src/screens/pool/Passport.tsx:183`, `src/screens/pool/Repairs.tsx:39`, `src/screens/pool/repairs/TicketSheet.tsx:135,163`.** These `motion` animations (enter, exit, `layout`) run from JavaScript, so the CSS rule in `app.css:188` does not reach them, and none checks the setting. `Studio`, `ReportFlow`, `MapCanvas`, `ResultsSheet` and `Search` do. Breaks the project's own rule that every animation respects `prefers-reduced-motion`; affects people with vestibular disorders on both portals' landing screens. Fix: one wrapper in the kit, used by those five files, so no other route pays for the library.

```tsx
// src/ui/motion.tsx
import { MotionConfig } from 'motion/react'
export const Motion = ({ children }: { children: ReactNode }) => <MotionConfig reducedMotion="user">{children}</MotionConfig>
```
Also `src/shell/Assistant.tsx:247` and `src/screens/admin/Healing.tsx:75` call `scrollIntoView({ behavior: 'smooth' })` unconditionally, which overrides the CSS `scroll-behavior`. Fix: `behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`, as `Search.tsx:143` already does.

**A-13 · Defect · `src/screens/pool/search/ResultsSheet.tsx:87`.** On a phone-width screen (and on a desktop at 400% zoom, which is the same layout) the results list is 0px tall while the sheet is at "peek", but its cards stay in the tab order. Focus lands on links nobody can see (WCAG 2.4.7, 2.4.11). Fix: the component already has `detent`, so mark the list inert while it is hidden: `<motion.div inert={detent === 'peek'} style={{ height: listHeight }} …>` (or the same attribute on a plain `<div>` around `{children}` if `motion` does not pass it through).

**A-14 · Defect · eight hand-built radio groups: `decisions/tenancy.tsx:184,357,377`, `tenancies/EndTenancy.tsx:123`, `loop/Rulebook.tsx:129`, `pool/Listing.tsx:206`, `pool/Me.tsx:383`, `admin/Assistant.tsx:204`.** Each is `role="radiogroup"` around `<button role="radio">`. Every button is its own tab stop and the arrow keys do nothing, which is not what a screen reader announces a radio group to be. The kit already does this properly in `Segmented` and `Studio.tsx:312` with Base UI. Fix: one kit component and swap the eight.

```tsx
// src/ui/controls.tsx
export function Choices<T extends string>({ label, value, onChange, className, children }: { label: string; value: T | ''; onChange: (v: T) => void; className?: string; children: ReactNode }) {
  return <RadioGroup aria-label={label} value={value} onValueChange={(v) => onChange(v as T)} className={className}>{children}</RadioGroup>
}
export const Choice = Radio.Root   // each option: <Choice value="renew" className="… data-checked:bg-accent-soft">
```

**A-15 · Defect · `src/screens/admin/kit.tsx:345`.** On a phone the whole card is one button with `aria-label="Open Whitaker Family Trust"`, which replaces everything inside it. A screen-reader user gets the name and none of the status, counts or money the card shows. Fix: drop `aria-label` on the card button (its content is its name); keep it on the table's primary cell at `:318`.

**A-16 · Polish · `src/ui/Law.tsx:32,41`.** Two things in `Why`. The popover is a dialog with no name: wrap the rule label in `PopTitle` (`<PopTitle render={<p className="text-[15px] leading-snug font-semibold text-ink" />}>{r.label}</PopTitle>`). And when a custom `label` is passed ("No rent bidding", "How long details are kept") the `aria-label` no longer contains the visible words (WCAG 2.5.3, speech control): replace the `aria-label` with `<span className="sr-only">The rule: {r.label}. </span>` before the visible text.

**A-17 · Polish · scroll boxes with no focusable child: `CommandCentre.tsx:341`, `src/ui/charts.tsx:180`, `admin/Migration.tsx:321`.** Chrome and Firefox make them keyboard-scrollable; Safari does not. Fix: `tabIndex={0} role="region" aria-label="…"` (for the chart table, `aria-labelledby={id}`).

**A-18 · Polish · `src/screens/admin/kit.tsx:144`.** `/` focuses the search box from anywhere, a single-character shortcut with no way to turn it off (WCAG 2.1.4). Fix: honour a `prefs.shortcuts` switch in the account menu, or bind it only while focus is inside the table region.

**A-19 · Polish · toasts that carry the only way back: `src/screens/loop/Money.tsx:152,166,274`.** "Undo" disappears after sonner's default four seconds (WCAG 2.2.1). Fix: `duration: 10_000` on those three, and `closeButton` on the `Toaster` in `__root.tsx:20`.

**A-20 · Polish · target size on touch.** Everything meets WCAG 2.5.8 (24px). These miss the 44px the brief sets for coarse pointers:

| Control | File | Size on a coarse pointer |
|---|---|---|
| `Button` `sm` and `iconSm` | `src/ui/Button.tsx:30,34` | 40px |
| `Why` chip | `src/ui/Law.tsx:28` | 32px |
| `Segmented` `sm` / `md` | `src/ui/controls.tsx:167` | 36 / 40px |
| `Switch` | `src/ui/controls.tsx:100` | 24px high |
| Sheet and modal close | `src/ui/Sheet.tsx:76,137` | 40px |
| Chart table toggle | `src/ui/charts.tsx:170` | 40px |
| Loop phone search button, compact account button | `LoopShell.tsx:202`, `common.tsx:97` | 40px |
| Results sheet handle | `ResultsSheet.tsx:82` | 28px (the 44px List/Map button beside it does the same job) |
| Table sort headings, citation links | `admin/kit.tsx:287`, `property/Compliance.tsx:445` | about 16px high |

Fix: change `coarse:h-10`/`coarse:size-10` to `11` in `Button`, give `Why` `coarse:h-11`, give the Switch root `coarse:h-7 coarse:w-12` with a larger thumb.

**A-21 · Polish · smaller things.**

- Nav badges read as a bare number ("Command 3"): `LoopShell.tsx:84–97`, `common.tsx:162`, `AdminShell.tsx:88`. Add `<span className="sr-only"> waiting</span>`.
- On a phone, a screen under "More" leaves no tab marked current: `LoopShell.tsx:227`, `AdminShell.tsx:172`. Style the More button as active when the path is not a primary one.
- `src/shell/Palette.tsx:81,87`: the input has `outline-none` and no replacement, and one or two letters that match nothing leave a blank list. Add `focus-visible:shadow-[inset_0_-2px_0_var(--focus)]` and a `<Command.Empty>`.
- `src/screens/loop/AddHome.tsx:213`: moving between the three steps is silent. Put `aria-live="polite"` on the step list at `:217`.
- About 1,000 font sizes are arbitrary pixels (`text-[13px]` 433 times) against 315 in rem, so a reader's browser font-size preference is mostly ignored. Zoom still works, so WCAG 1.4.4 passes.
- `src/shell/Assistant.tsx:44` shows `⌘K` on Windows, where the shortcut is Ctrl K.

---

## 2. Performance

### 2.1 What is in `dist/assets`

139 files. JavaScript: 123 files, 6,126 KB raw, 1,827 KB gzip. CSS: 2 files, 173 KB raw, 28 KB gzip. Fonts: 14 `woff2`, 210 KB.

| File | Raw KB | Gzip KB | What it is | When it loads |
|---|---:|---:|---|---|
| `pdf.worker.min-*.mjs` | 1,242 | 370 | pdf.js worker | On choosing a PDF in Add a home |
| `MapCanvas-*.js` | 1,050 | 284 | MapLibre and the map component | Pool search |
| **`index-*.js`** | **999** | **289** | **Entry: React, router, and everything in 2.2** | **Every visit** |
| `maplibre-gl-worker-*.js` | 507 | 144 | Map worker | Pool search |
| `pdf-*.js` | 434 | 129 | pdf.js | With the PDF |
| `common-*.js` | 296 | 95 | Base UI, sonner, NumberFlow | Every visit |
| `react-*.js` | 135 | 45 | `motion/react` (named after its entry file) | Loop and Pool landing screens |
| `session-*.js` | 132 | 42 | Store, demo world, NZ and five AU packs | Every visit |
| `loop-*.js` | 70 | 23 | Loop shell and cmdk | Loop |
| `_id-*.js` | 65 | 18 | Property screen | On open |
| `pool-*.js` | 64 | 19 | Pool home | Pool |
| `tenancies-*.js` | 64 | 19 | Tenancies | On open |
| `repairs-*.js` (Pool) | 53 | 15 | Pool repairs | On open |
| `labels-*.js` | 52 | 13 | Team-console labels and icons | **Every visit** |
| `tenancy-*.js` | 49 | 15 | Rules engine | Every visit |
| `search-*.js` | 46 | 16 | Pool search | On open |
| `settings-*.js` | 44 | 14 | Loop settings | On open |
| `admin-mutations-*.js` | 43 | 14 | Team-console mutations | **Every visit** |
| `IconBase.es-*.js` + 48 icon files | 199 | 65 | Phosphor icons, one file each | Mixed |
| `index-*.css` | 103 | 18 | All styles | Every visit |
| `MapCanvas-*.css` | 70 | 10 | MapLibre's stylesheet | Pool search |

### 2.2 The first load, by portal

The entry and what it imports statically is 45 files: **1,809 KB raw, 551 KB gzip**, before the route's own code. `index.html` carries 44 `modulepreload` links.

| First screen | Entry closure | Plus | Total gzip | Total raw |
|---|---:|---|---:|---:|
| Welcome `/` | 551 | route 5 | **556 KB** | 1,825 KB |
| Loop `/loop` | 551 | shell 30, command centre 78 (45 of it `motion`) | **659 KB** | 2,132 KB |
| Pool `/pool` | 551 | shell 6, home 83 (45 of it `motion`) | **640 KB** | 2,077 KB |
| Team console `/admin` | 551 | shell 4, overview 5 | **560 KB** | 1,841 KB |

Add 18 KB of CSS and the fonts in use: Geist 29 KB and Geist Mono 23 KB, their Latin Extended files (16 and 14 KB) as soon as a macron is on screen, and in Pool Bricolage 40 KB (plus 18).

Lazy and working as intended: every Loop and Pool screen, MapLibre, pdf.js, cmdk, the assistant.

**Not lazy, and the reason:** ten of the eleven team-console routes are 71-byte files that re-export from the entry, for example `import{Q as e}from"./index-….js";export{e as component}`. The screens themselves, Recharts and PapaParse are inside `index-*.js`.

**P-01 · Defect · the single biggest win · `src/routes/admin/assistant.tsx:2`, `audit.tsx:2`, `feedback.tsx:2`, `healing.tsx:2`, `migration.tsx:2`, `network.tsx:2`, `orgs.tsx:2`, `people.tsx:2`, `queue.tsx:2`, `rules.tsx:2`.** Each imports its search-parameter parser from the screen module:

```ts
import { Audit, auditSearch } from '@/screens/admin/Audit'
export const Route = createFileRoute('/admin/audit')({ validateSearch: auditSearch, component: Audit })
```

The router plugin splits `component` into a lazy chunk but `validateSearch` has to stay in the route tree, so the whole screen module comes with it, and with it everything the module imports: `Feedback.tsx:21` → `@/ui/charts` → `recharts` (with Redux Toolkit, Immer and d3); `Audit.tsx:12` and `migration/validate.ts:11` → `papaparse`; `labels.tsx`; `admin-mutations.ts`. All ten screens are 328 KB of source. In the built entry, Recharts' own markers span 352 KB and the team-console code and PapaParse sit around it from about byte 430 KB to the end at 999 KB.

Who it affects: everyone. A renter opening Pool on a phone downloads the operations console and a charting library they will never see.

Fix, the way Pool already does it (`src/screens/pool/search/params.ts`, `repairs/params.ts`): one file with no React and no screen imports.

```ts
// src/screens/admin/search.ts — imports only './format' and '@/domain/*'
import { oneOf, text } from './format'
export const SPANS = ['today', 'week', 'month', 'all'] as const          // moved from Audit.tsx:26, with BY, BOXES, KINDS, MOODS, ORDERS, SHOWS, SORTS, PLANS, GROUP_IDS, STATUSES, IDENTITIES, PRIORITIES, VIEWS from their screens
export function auditSearch(s: Record<string, unknown>): AuditSearch { … }
// …the other nine parsers, unchanged

// src/routes/admin/audit.tsx
import { Audit } from '@/screens/admin/Audit'
import { auditSearch } from '@/screens/admin/search'
```

Three plain arrays have to move too, or the parsers drag their files back in: `ORG_STATUS_ORDER` and `TASK_KINDS` (`labels.tsx:61,92`, a file full of icons), `PACK_VIEWS` (`rules/Packs.tsx:23`), `SOURCE_STATES` (`rules/Sources.tsx:22`).

Expected effect, estimated from the marker offsets and not from a build: about 570 KB leaves `index-*.js`, and `labels`, `admin-mutations` and parts of `format`/`hooks` stop being preloaded. Roughly 200 KB gzip, a little over a third of every first load. Then add a guard so it cannot come back: a unit test that fails if any file under `src/routes/` imports a value other than the component from a `*.tsx` screen.

**P-02 · Defect · `vite.config.ts:74–77`.** The comment says pdf.js and the map are kept out of the precache "to keep the first install small on a phone". The patterns `**/pdf.worker*` and `**/maplibre*` do not match `MapCanvas-*.js` (1,050 KB), `MapCanvas-*.css` (70 KB) or `pdf-*.js` (434 KB), so all three are precached. The precache is **150 entries, 4,864 KB raw, about 1,633 KB over the wire**, fetched in the background on the first visit. It also takes all 14 font files, 8 of which (Cyrillic, Vietnamese, symbols: 70 KB) an `en-NZ` app never shows. Affects first-time visitors on mobile data. Fix:

```ts
globIgnores: ['**/pdf*', '**/MapCanvas*', '**/maplibre*', '**/regwatch/**', '**/*cyrillic*', '**/*vietnamese*', '**/*symbols2*'],
// runtimeCaching, second rule:
urlPattern: ({ url }) => /pdf|MapCanvas|maplibre/.test(url.pathname),
```
That takes about 495 KB gzip off the install. Keep both Latin and Latin Extended fonts: the macrons live in Latin Extended.

**P-03 · Polish · `src/data/store.ts:60`.** `db: freshDb()` builds the whole demo world, rolls it forward and runs the healing sweep as the module loads, on every visit, and then hydration throws it away. It took 56 ms in Node on this machine; expect a few times that on a phone, on the main thread, before first paint. Fix: build it only when there is no usable stored copy. The check has to parse, because a store that fails to parse must still fall back to a fresh world, as it does today.

```ts
function hasStoredDb(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem('loop-pool:store') ?? 'null')
    return saved?.version === SEED_VERSION && Boolean(saved.state?.db)
  } catch { return false }
}
// …
db: hasStoredDb() ? (null as unknown as Db) : freshDb(),    // hydration replaces it before anything renders
```
Parsing 245 KB twice costs a millisecond or two; building the world costs the 56.

**P-04 · Polish · `src/screens/loop/CommandCentre.tsx:12`, `src/screens/pool/home/Renting.tsx:7`.** Each landing screen brings in all of `motion` (135 KB raw, 45 KB gzip) for one list's enter and exit. Fix that keeps the library and the feel: `LazyMotion` with `domMax` loaded on demand and `m.li` in place of `motion.li`.

**P-05 · Polish · `src/domain/jurisdictions/index.ts:13`.** The five Australian preview packs, which "drive nothing", are in the `session` chunk every visitor loads. They are read on two screens (Loop's Rulebook compare tab, the team console's Rule packs). Fix: `export const loadPreviewPacks = () => import('./au')` and call it from those two.

**P-06 · Polish · `vite.config.ts`.** 49 Phosphor icons are 49 files, about 30 of them preloaded on every visit. Group them into one chunk with the bundler's chunk-grouping option (check its name for Vite 8.3; it was `advancedChunks` in Rolldown).

**P-07 · Polish · `vite.config.ts:109–110`, `src/vite-env.d.ts:4–5`.** `__BUILD_TIME__` and `__BUILD_SHA__` are defined and never used. The owner watches the live site and cannot tell which build is on screen. Fix: show them in Settings → Appearance ("Build a1b2c3d, 14 Nov 12:08").

Images: there are none to optimise; `PropertyArt` is inline SVG and the five PWA icons total 40 KB.

---

## 3. Offline and install

**Configuration as written** (`vite.config.ts:50–102`): `registerType: 'prompt'`; precache of `js, css, html, svg, png, woff2, json`; `navigateFallback: 'index.html'`; cache names prefixed `loop-pool`; runtime rules for `/regwatch/` (network first), pdf worker and map worker (cache first, 12 entries), map tiles (stale-while-revalidate, 400 entries, 14 days).

**What works offline**, once the first visit's install has finished: every one of the 43 routes, every calculator, the assistant, all reading and writing of records (they live in `localStorage`), taking and viewing photos (IndexedDB), the Rulewatch feed as it was at the last deploy. Deep links work through the navigation fallback, and through `404.html` on GitHub Pages for a first visit.

**What does not:**

| Thing | Why | What the person is told |
|---|---|---|
| The map, if search was never opened online | Style, tiles and the map worker come from the network; only the worker and visited tiles are cached | "The map could not be loaded just now, which usually means no connection. Here is the same search as a list." Good. |
| Reading a PDF agreement, if never done online | `pdf.worker.min-*.mjs` is not precached (`.mjs` is not in `globPatterns`) and is cached only after first use | "That file could not be opened as a PDF." Wrong: see O-04. |
| Links to legislation, Bond Hub, `tel:` | External | Nothing; expected. |
| Anything, on a first visit with no connection | No service worker yet | The browser's own error. |

**What the person is told about offline itself:** nothing, except in the inspection studio, which shows "Saved on this device" or "Offline" (`Studio.tsx:735–755`). Nothing says when the app has finished installing and is safe to take up a valley.

**O-01 · Defect · `vite.config.ts:74` with `:84–88`.** `json` is in `globPatterns`, so `regwatch/feed.json` is precached. Two consequences. First, the precache route is registered before the runtime routes, so the `NetworkFirst` rule for `/regwatch/` never runs: `fetch(FEED_URL, { cache: 'no-cache' })` in `rules/feed.ts:25` and the Refresh button in Rulewatch → Sources are answered from the precache. Second, `.github/workflows/regwatch.yml:44–66` commits the feed every day and redeploys, which changes that one precache entry, which makes a new service worker, which makes **every user see "A newer version is ready" every day** although no code changed. Affects everyone with the app open or installed; it teaches people to dismiss the one prompt that matters. Fix: `'**/regwatch/**'` in `globIgnores` (included in P-02).

**O-02 · Defect (honesty) · `src/app/updates.tsx:26` against `src/data/store.ts:84–87`.** The update toast says "Your work is saved on this device." When the new build has a different `SEED_VERSION` (now 2, `seed/index.ts:44`), `migrate` replaces the whole database with a fresh demo and keeps only the theme. Everything the person entered is gone, right after being told it was safe. Fix, two lines each side:

```ts
// updates.tsx:26 — say only what is always true
description: 'Finish what you are typing first. Saved records stay on this device unless the update rebuilds the demo data.',
// store.ts:86 — leave a mark when it happens
return { db: freshDb(), session: null, prefs: { ...(old?.prefs ?? DEFAULT_PREFS), rebuiltOn: today() } } as Store
```
and the shells show it once, then clear it: `toast('The demo data was rebuilt for this version', { description: 'Records entered before the update were replaced.' })`.

**O-03 · Defect · `src/app/updates.tsx:19–31`.** Only `onNeedRefresh` is handled. There is no `onOfflineReady` (so nobody learns the app now works offline), no `onRegisterError` (a failed registration is silent), and no update check after load, so an installed app left open keeps running an old build until it is closed. Fix:

```ts
const update = registerSW({
  onNeedRefresh() { … },
  onOfflineReady() { toast('Ready to use offline', { description: 'Everything except the map and reading a PDF now works with no signal.' }) },
  onRegisteredSW(_url, r) { if (r) { const check = () => void r.update(); setInterval(check, 60 * 60 * 1000); document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check()) } },
  onRegisterError() { /* leave the app working online; log once */ },
})
```

**O-04 · Defect · `src/screens/loop/AddHome.tsx:155–157,268–272`.** Any failure reading a PDF, including pdf.js or its worker not loading because there is no connection, shows "That file could not be opened as a PDF. Try another". The file is blamed for the network. Fix: `catch { setReading(navigator.onLine ? 'failed' : 'offline') }` and a third message: "Reading a PDF needs a connection the first time. Fill it in by hand, or try again when you are online."

**O-05 · Polish · `src/app/updates.tsx:6,21–23`.** Inside the first eight seconds an update reloads the page without asking. A fast typist, or anyone on a deep link into a half-filled sheet, loses what they typed. Fix: reload at once only if nothing is focused in a field and no sheet is open (`!document.querySelector('[role="dialog"]')`).

**O-06 · Polish · `vite.config.ts:56–72`.** The manifest has `lang: "en"` in the built file where the page is `en-NZ`; `start_url: './'` opens the door-chooser on every launch even when a persona is stored (send a stored session to its portal in `routes/index.tsx`); `theme_color` and `background_color` are Loop's navy, so Pool's cream app launches on a navy splash; there are no `screenshots` or `shortcuts`, and no in-app prompt to install. None of this stops installation.

---

## 4. Copy and language

**C-01 · Defect · statutory numbers typed into sentences.** The calculators read the pack and show their steps correctly. The words around them do not. `CLAUDE.md` says screens "never hard-code '21 days'", `README.md` says a published change "reaches every date and limit in the product at once", and `src/domain/copilot.ts:7–8` says the assistant "cannot make a number up, because it never writes one — it reads them". If Rulewatch publishes a change to any of these, the date on screen moves and the sentence beside it keeps the old number.

| File:line | Hard-coded | Read it from |
|---|---|---|
| `src/domain/actions.ts:80` | "the 23 working days ran out" | `b.totalWorkingDays` |
| `src/domain/actions.ts:110` | "At 21 days in arrears" | `rules['arrears.tribunal_threshold']` |
| `src/domain/actions.ts:124,125` | "a 14-day notice", "a 14-day clock" | `rules['arrears.remedy_notice']` |
| `src/domain/copilot.ts:102,104` | "once every 12 months … 60 days" | `rent_increase.*` |
| `src/domain/copilot.ts:132,135` | "four weeks … 23 working days … two weeks … $1,500" | `bond.*`, `pack.penalties` |
| `src/domain/copilot.ts:156,158,187,189` | "48 hours to 14 days … 8 am and 7 pm … four weeks … 24 hours" | `entry.*` |
| `src/domain/copilot.ts:209,235,237` | "90 and 21 days", "90 … 42 … 21 days" | `fixed_term.notice_window`, `termination.*` |
| `src/domain/copilot.ts:253,256,289,292,293,316,396,399,442,467,481,482,496` | 21, 14, 21, 5/3/90/28, four weeks, 42, 90, 30, two weeks, 48 h/14/7, 2/7, 23 | the matching rule |
| `src/domain/rules/tenancy.ts:149,202,210,218` | "12 months", "four weeks", "48 hours", "14 days" in refusal reasons | `pack.rules[…]` (`checkInspectionSlot` has `pack`; `checkRentIncreaseDate` needs it passed in) |
| `src/domain/rules/text.ts:67,75–76,85,102–105,130,156–157,166` | Clause-scanner titles and reasons | the rule each finding cites |
| `src/data/mutations.ts:71,105,330` | "14-day notice", "the 24 hours", "the 48-hour notice", written into records | `durationText(pack.rules[…].value)` |
| `src/screens/loop/decisions/money.tsx:60` | "23 working days to lodge it" | `` `${b.totalWorkingDays} working days` `` |
| `src/screens/loop/decisions/money.tsx:233,246,252,380` | "at least 14 days", "the 14-day notice", "21 days or more", "24 hours of notice" | the rule |
| `src/screens/loop/decisions/tenancy.tsx:108,118,218,219,242,269` | "two weeks of rent", "up to $1,500", "60-day notice", "12 months", "90 days from you, 21 from…" | `bond.pet_max_weeks`, `pack.penalties`, `rent_increase.*`, `termination.*` |
| `src/screens/loop/property/Property.tsx:64,70` | "23 working days from receipt", "Twelve months after it was last set" | the rule |
| `src/screens/loop/property/Records.tsx:84` | "24 hours for repairs, 48 for an inspection" | `entry.*` |

Fix pattern, already used correctly at `rules/tenancy.ts:115,185`:

```ts
const lodge = pack.rules['bond.lodgement_deadline'].value
`…and the ${durationText(lodge)} ran out on ${fmtDate(b.deadline)}.`
```
For the assistant, build each headline from the rules it cites, and add a test that greps `copilot.ts`, `actions.ts` and `screens/` for a digit followed by "days", "weeks", "months", "hours" outside a template expression.

**C-02 · Defect · `src/domain/healthyHomes.ts:142,144,149,153,175,185` and onward.** The healthy homes thresholds (1.5 kW, 2.4 kW, the 80% tolerance, 1 July 2019, R 3.3 and R 2.9, 120 mm, and the rest) are constants in a calculator, not values in the pack. They have no `sourceUrl`, no `lastVerified`, cannot be shown by `<Why>` and cannot be changed through Rulewatch. Fix: a `healthyHomes` block in `JurisdictionPack` with the same `Rule<T>` shape, read by `checkHeating` and friends.

**C-03 · Defect · the product only knows Nelson.** `src/domain/jurisdictions/index.ts:49–51` returns a region for Nelson, Tasman, Richmond, Stoke and Motueka and `undefined` for everywhere else; `nz.ts:65–67` holds one anniversary day. `AddHome.tsx:315` accepts any town. A home in any other province gets working-day counts with no anniversary day, silently, while the welcome screen promises "every notice lawful to the day" (`routes/index.tsx:49`). The repository's own research says "Engine needs a province per address" (`docs/research/nz-tenancy-law.md:34`). Around it:

- `decisions/money.tsx:60` and `copilot.ts:134` say "Nelson Anniversary Day" whatever the home's region.
- `property/Compliance.tsx:101–102` sets `coldZone = true` for every home, with the reason in a comment.
- `home-mutations.ts:55` pins an unknown suburb at Nelson Central on the map.

Fix now: refuse honestly. In `AddHome`, when `regionOf(city)` is undefined, show `<Refusal verdict={{ ok: false, reason: 'Loop only knows the working-day calendar for Nelson and Tasman so far.', fix: 'You can add this home, but its deadlines will leave out your province’s anniversary day. Check them against Tenancy Services.' }} />`, and read the label from `pack.regionalHolidays[region]?.label`. Fix properly: the other anniversary days, with sources, in the pack.

**C-04 · Defect · `src/domain/rules/calendar.ts:15`.** The comment says the Act "excludes 25 December – 15 January". The pack says 24 December to 3 January (`nz.ts:48,52`), the tests pin that (`rules.test.ts:29–34`), and the research records the other range as "Wrong for the RTA" (`nz-tenancy-law.md:576`). It is only a comment, but it is the law stated from memory, wrongly, in the file every date passes through. Fix: "for example, New Zealand's pack closes 24 December – 3 January".

**C-05 · Defect (honesty) · "served by email" when nothing is sent.** `README.md` lists email delivery as "simulated, and labelled so on screen". `settings/People.tsx:88,99` does label it. The legal notices do not: `tenancies/RentReview.tsx:85` ("Notice served by email"), `tenancies/EndTenancy.tsx:106`, `decisions/money.tsx:242`, `decisions/tenancy.tsx:279,405` ("The tenants have been told in writing"), `property/Compliance.tsx:336,339`. Worse, a tenancy added by hand has `email: ''` (`home-mutations.ts:87`), and the email method is still offered and still reports success. A first-time landlord trying the prototype on their real rental could believe they have served a notice. Fix: in the two notice flows (`RentReview.tsx`, `EndTenancy.tsx`), look up the first tenant's user record and refuse the method when it has no address,

```tsx
{method === 'email' && !tenant?.email && <Refusal verdict={{ ok: false, reason: `There is no email address on file for ${first}.`, fix: 'Choose another way to give the notice, or add their address first.' }} />}
```
and say what happened: `toast.success('Notice recorded as served', { description: 'This prototype sends no email. Give the tenant the copy yourself.' })`.

**C-06 · Defect · figures with no source in the repository.**

- `src/routes/index.tsx:49`: "the roughly $3,500 a year per rental a property manager would charge". Not in `docs/research/`. Fix: compute it from `savingsVsManager` at a stated rent, or say "8% of the rent, plus GST".
- `src/screens/loop/decisions/money.tsx:253`: "The application costs $29." Not in the pack. Fix: `pack.tribunal.filingFee` with its citation.
- `src/screens/loop/CommandCentre.tsx:460`: "a manager at 8% + GST" is typed beside a figure computed from `PM_ASSUMPTIONS.managementPct`. Fix: interpolate the constant.
- `src/domain/copilot.ts:73`: `external(…, lastVerified = '2026-11-14', verified = 'primary')`. Every outside citation is shown as "read at source 14 Nov 2026" by default, whether or not anyone read it. Fix: make both arguments required.

**C-07 · Polish · authority names typed in.** `pack.bondAuthority.name` and `pack.regulator.name` exist and `settings/Device.tsx:52–55` uses them. Elsewhere "Tenancy Services" and "Bond Hub" are literals: `actions.ts:81,89`, `mutations.ts:34`, `compliance.ts:87`, `healing.ts:118–119,215`, `AddHome.tsx:512`, `decisions/money.tsx:70–110`, `decisions/tenancy.tsx:108`, `pool/home/Renting.tsx:376,397`.

**C-08 · Polish · one thing, several names.**

| Thing | Names in use | Where |
|---|---|---|
| The 0–100 figure | "Sleep-at-night score" on screen, "Compliance score" in its accessible name and on the property card | `CommandCentre.tsx:228` vs `:241`; `Properties.tsx:126`; `property/Compliance.tsx:348–349` |
| A second sign-off | "second approval", "second approver", "second trustee", "two-trustee threshold" | `settings/Owners.tsx:46,59`; `admin/Orgs.tsx:181`; `decisions/money.tsx:346,349` (says "the trust" even for a partnership or an individual) |
| The read-only seat | "Accountant", "advisers", role key `advisor` | `shell/common.tsx:25`; `admin/People.tsx:36,262` |
| Someone who does a job | "tradesperson", "provider", "trades", "vetted local person", "Field provider" | `property/Records.tsx:20` ("Out with a provider"); `admin/Network.tsx`; `shell/common.tsx:29–30` |
| The first Loop screen | "Command" in the nav, "command centre" in its label | `LoopShell.tsx:43` vs `:140` |
| A rental | "Properties" as the heading, "Five homes" as the title, "Add a home" as the button | `Properties.tsx:68–69,87` |

Pick one of each. "Home" is the word the rest of the product leans on.

**C-09 · Polish · words a first-time landlord may not know, used bare.** "LVR" (`CommandCentre.tsx:438`, `property/Money.tsx:165`), "skim rate" (`property/Money.tsx:83`), "exemplary damages" (`property/Compliance.tsx:374`), "as a variation" (`property/Compliance.tsx:336`), "periodic tenancy" (`decisions/tenancy.tsx:171`; `AddHome.tsx:454` explains it well: "Periodic — no end date"). Fix: a five-word gloss on first use, as the command centre already does for "Sinking fund · for repairs and replacements".

**C-10 · Polish · counting.** "1 working days left" (`AddHome.tsx:530`), "across 1 homes" (`CommandCentre.tsx:581`), "in 1 days" (`rules/compliance.ts:138`), "1 weeks" (`tenancies/RentReview.tsx:178`). `plural()` is already in `rules/format`.

**C-11 · Polish · demo examples on the welcome screen.** `routes/index.tsx:66–69,126–143` shows "7 working days left", "$350 limit", "$580 matched", "97 · 99% paid on time" as a live-looking slice. The footer says the people are made up; the slice itself is unlabelled. Fix: a small "Example" caption, as `PropertyArt` has "Illustration".

**C-12 · Polish · macrons.** `src/domain/seed/index.ts:484`: a dog named "Tui"; the bird is tūī. Everything else checked is correct.

---

## 5. Robustness

**R-01 · Defect · `src/data/mutations.ts:92–109` with `src/screens/loop/decisions/money.tsx:302,349,379–380`.** The quote sheet works out `needsSecond` and tells the owner "Your approval sends it to the second trustee before anything is booked." Then `approveQuote` books the tradesperson, serves the entry notice and the toast says "Approved and booked". The second-approval threshold set in Settings → Owners is shown and never applied, although `ops-mutations.ts:396–398` is written around the promise that Loop "may never spend alone what one owner cannot approve alone". Affects every trust and partnership. Fix:

```ts
// Ticket gains `approvals?: ID[]`
export function approveQuote(ticketId: ID, by: ID): Verdict & { waiting?: boolean } {
  …
  const property = state.properties.find((p) => p.id === tk.propertyId)
  const entity = state.entities.find((e) => e.id === property?.entityId)
  const first = tk.approvals?.[0]
  if (entity?.dualApprovalThreshold !== undefined && tk.quote.amount > entity.dualApprovalThreshold && (!first || first === by)) {
    db.update('tickets', ticketId, { approvals: [by], events: [...tk.events, { at: nowIso(), by: 'landlord', text: 'Approved by one owner. Waiting for the second.' }] })
    return { ok: true, waiting: true }
  }
  // …book as now
}
```
and the screen toasts "Sent to the second owner" when `waiting`.

**R-02 · Defect (honesty) · `src/screens/admin/Orgs.tsx:97–98,276,299` and `admin-mutations.ts:133`.** The team console says a suspended owner "sees Loop read-only" and "is shown this reason". Nothing in `src/shell`, `src/screens/loop` or the mutation files reads `org.status` or `suspendedReason`. Open Hope Street Trust with "View as owner": no notice, and every action works. Fix, smallest honest version first:

```tsx
// src/shell/common.tsx, rendered in LoopShell under ViewingAsBar
export function SuspendedBar() {
  const org = useStore((s) => s.db.orgs.find((o) => o.id === s.session?.orgId))
  if (org?.status !== 'suspended') return null
  return <div role="status" className="bg-danger-soft px-4 py-2 text-center text-[13px] text-danger-text">This account is suspended: {org.suspendedReason ?? 'no reason was recorded'}. You can read everything; changes are switched off.</div>
}
```
and a guard the landlord mutations call first: `const writable = (orgId: ID): Verdict => db.get().orgs.find((o) => o.id === orgId)?.status === 'suspended' ? refuse('This account is suspended.', 'Contact the Loop team to lift it.') : OK`. Until that exists, change the console's wording to "is marked suspended".

**R-03 · Defect · `src/shell/common.tsx:68–74`.** "Reset the demo" sits in the account menu of all three portals, one row under the theme switch, and fires on a single tap. Settings puts the same action behind a confirmation that says "This cannot be undone" (`settings/Data.tsx:91–116`). The menu version also calls `resetDemo()` directly, skipping `resetDemoData()`, so every photo already taken stays in IndexedDB with nothing pointing at it and no way to clear it. Fix: the menu item opens the same `Modal`, and its confirm calls `resetDemoData()`.

**R-04 · Defect · `src/data/store.ts:82`, with `src/data/admin-mutations.ts:527` and `src/screens/admin/Migration.tsx:173`.** Measured: the persisted store is **245 KB** on day one (ledger 75 KB, properties 55 KB, rule sources 22 KB) and grows about 130 KB a year from the simulated bank feed alone. That is comfortable inside a 5 MB origin quota, which every `<user>.github.io` project shares. Two things are not comfortable. A rent-roll import has no row limit and each row becomes a property, a tenancy and a user, about 2.5 KB: a roll of around 1,900 rows fills the quota. And when the quota is hit, `localStorage.setItem` throws inside zustand's `set`, which is inside the mutation: memory has the change, disk does not, everything after that line in the mutation (the audit line, the toast) is skipped, and the person sees nothing. On reload the work is gone. Fix:

```ts
// store.ts
export const useSaveState = create(() => ({ failedAt: null as ISODateTime | null }))
const safe: StateStorage = {
  getItem: (k) => localStorage.getItem(k),
  removeItem: (k) => localStorage.removeItem(k),
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); useSaveState.setState({ failedAt: null }) }
    catch { useSaveState.setState((s) => ({ failedAt: s.failedAt ?? new Date().toISOString() })) }
  },
}
storage: createJSONStorage(() => safe),
```
with a bar in the three shells while `failedAt` is set ("This browser is out of room. Nothing since 12:04 has been saved. Download your data, then reset."), and in `Migration.tsx` a `<Refusal>` above 500 rows.

**R-05 · Defect · dates that are only guarded by the picker.** `max` and `min` on `<input type="date">` do not stop a typed or cleared value.

- `src/screens/loop/tenancies/EndTenancy.tsx:182`: clearing "When did you receive the notice?" sets `receivedOn` to `''`. Run through the project's own `planTermination`, that gives `endsOn: "NaN-NaN-NaN"`; the button reads "Record it — ends undefined NaN undefined NaN", and pressing it stores that as the tenancy's end date. A date next March is accepted as "received" too. Fix: `onChange={(e) => e.target.value && e.target.value <= day && setReceivedOn(e.target.value)}`.
- `src/screens/loop/Money.tsx:195,226`: `bad` checks the property, the amount and the description, not the date. A cleared date is saved as `''`: `fmtDate('')` prints "undefined undefined undefined 0" in the ledger and `taxYearOf('')` is 0, so the cost is in no tax year. A future date is accepted. Fix: `date: !date || date > today()` in `bad`, with "Choose the day it was paid, today or earlier." Also `round2(value)` before saving: `1.999` is accepted as typed.

The Pool forms (`Looking.tsx:96`, `Passport.tsx`, `Listing.tsx:257`) and `AddHome.tsx:120–121` validate properly and are the pattern to copy.

**R-06 · Defect · claims that are not checked.**

- `src/screens/loop/Repairs.tsx:811` with `src/data/mutations.ts:189,207,216`: the toast says "Sent to a vetted tradesperson." whenever the job is small enough to send. If no vetted tradesperson matches, `logRepair` files it as "yours to arrange" and the toast still says sent. Fix: `logRepair` returns `{ id, sentTo?: string }` and the toast reads it. Loop also matches providers with its own string test at `:188–189` while Pool uses `providerFor` (`triage.ts:665`), so the same fault can find someone from one portal and nobody from the other. Use `providerFor` in both.
- `src/data/mutations.ts:307–330` with `decisions/tenancy.tsx:327,405,411`: a delegated inspection takes the first vetted inspector anywhere, and if there is none it still inserts an accepted booking with no provider, logs "Booked a local inspector" and toasts "Inspector booked and notice served". The team console can suspend inspectors, so this is reachable. Fix: `if (mode === 'delegated' && !inspector) return refuse('No vetted inspector is available.', 'Do it yourself, or ask the Loop team.')`, shown with `<Refusal>`.
- `src/screens/loop/decisions/money.tsx:197`: "Call Sione" is `href="tel:"` when the tenant has no number, which is every tenant added through Add a home. Fix: a `<Refusal>` with "No phone number on file" in its place.

**R-07 · Defect · a new or empty organisation.** Reachable today: Blue Penguin Lettings has no homes, and "View as owner" opens Loop as its owner.

- `src/domain/rules/compliance.ts:173` returns 100 for no homes, so `CommandCentre.tsx:214–233` shows a full dial, "100 out of 100" and "Every check passes", and `:499–503` says "You are up to date. Every deadline is met and every request is answered." Nothing has been checked. Fix: `portfolioScore` returns `number | null`; with no homes the command centre shows one empty state: what Loop does, and "Add your first home".
- `src/screens/loop/Properties.tsx:92`: an empty `<ul>` under "No homes · Worth $0.00M, with $0.00M of it yours. 0 are let." There is no empty state, against the rule that every list has one. Fix: `rows.length === 0 ? <Empty icon={<HouseLine />} title="No homes yet" body="Add the first one and Loop opens its checklist, starts its deadlines and watches for its rent." action={<Button intent="primary" onClick={…}>Add a home</Button>} /> : <ul>…`.
- `src/screens/loop/AddHome.tsx:169`: `if (!me.orgId || !owner) return`. With no owning entity the last button does nothing and says nothing. Every seeded organisation has one, so this is latent. Fix: a `<Refusal>` on step 1 pointing at Settings → Owners.

**R-08 · Defect · unknown is stored as zero and then used as a fact.** `src/data/home-mutations.ts:60–67,77` sets floor area, year built, mortgage rate and annual costs to `0` for a home added by hand ("left as unknown rather than guessed"). `finance.ts:88` then computes interest as `balance × 0`, so `CommandCentre.tsx:584–589` reports cash flow "after interest" with no interest in it, and net yield with no costs. `pool/Listing.tsx:481,538` would print "0 m²" and "Built 0." if such a home were listed; `loop/property/Property.tsx:142,148` guards for exactly this. Fix: make those fields `number | undefined`, have `propertyFinance` return `interest: undefined` when the rate is not known, and say "interest not on record" beside the figure. Ask for the rate in Add a home, next to "What is owing on it".

**R-09 · Defect · a pet bond that is agreed and never recorded.** `respondToPet` (`src/data/mutations.ts:236–258`) writes "A pet bond of $X" into the conditions and adds the pet to the tenancy before the renter has signed; `signVariation` (`src/data/pool-mutations.ts:373–383`) signs it. Neither sets `tenancy.bond.petBond`, which stays 0, so the renter's bond card (`pool/home/Renting.tsx:342,386`) never shows it and no lodgement countdown starts for it. The research notes that the deadline "runs from each payment" (`nz-tenancy-law.md:83`). Fix: keep the amount on the variation (`detail.petBond`), and on signing `db.update('tenancies', t.id, { bond: { ...t.bond, petBond }, pets: [...] })`; add the pet there too rather than at consent, which removes the clean-up in `declineVariation`.

**R-10 · Polish · mutations that return nothing when they do nothing.** `ops-mutations.ts` returns a `Verdict` everywhere and is the model. `mutations.ts` does not: `recordBondLodged:32`, `logArrearsCall:42`, `requestConciergeCall:50`, `sendRemedyNotice:70`, `approveQuote:95`, `declineQuote:113`, `respondToPet:239`, `offerRenewal:262`, `giveNonRenewalNotice:280`, `scheduleInspection:305`, `fileBankLine:390` all `return` silently, after which the screen toasts success. Also `pool-mutations.ts:131,154,184,311,376,389` and `admin-mutations.ts:125`. In the prototype the record is nearly always there; behind a server it will not always be. Fix: return `Verdict` and toast only on `ok`.

**R-11 · Polish · rules applied in one place and not another.**

- `admin-mutations.ts:123–128`: the team can move a five-home organisation to a one-home plan; `ops-mutations.ts:376–382` refuses the same change from Loop. Call `checkPlan` in both.
- `src/data/mutations.ts:80,318`: these two notices record `deemedReceivedOn: today()` whatever the hour, while every other path uses `deemedReceived(pack, cal, …)`. Pass the calculated date in, as `giveNonRenewalNotice` does.
- `src/domain/db.ts:85` and `CommandCentre.tsx:376,563`: snoozed items are one list for all organisations, the count includes other organisations' and long-resolved items, and "Bring back" clears everyone's. Store `{ orgId, id }` and count only what is hidden now. A statutory deadline (a bond due, rent 21 days behind) can be snoozed with no end; bring priority-1 items back when their clock changes.

**R-12 · Polish · smaller things.**

- `AddHome.tsx:113`: bedrooms has no upper bound and `roomsFor` makes one inspection room per bedroom. Cap at 20.
- `pool/Listing.tsx:343`: a viewing earlier today still shows as bookable (`dateOf(t) >= day`). Compare instants: `t > new Date().toISOString()`.
- `routes/__root.tsx:65`: the error screen prints `error.message` as is, including "Portal screens render inside a shell that guarantees one."
- `store.ts:89–93`: the bank feed rolls forward only when the app starts; a tab left open over midnight shows yesterday's feed against today's deadlines.
- Controls disabled without a sentence: `admin/Audit.tsx:136`, `loop/Money.tsx:682` (export with nothing to export), `shell/Assistant.tsx:295`. Minor against the refusal rule; the cause is visible each time.
- `rules/calendar.ts:153` (`beyondCoverage`) is used for deemed receipt only; a bond or termination date past 2028 is not marked as an estimate. Nothing reaches that far yet.

---

## 6. The fifteen that matter most

1. P-01 · ten `src/routes/admin/*.tsx` import their screens for `validateSearch`: the console, Recharts and PapaParse ship to every visitor.
2. R-01 · the second-approval threshold is shown and not applied.
3. R-02 · suspension is promised to the team and invisible, and unenforced, in Loop.
4. C-01 · statutory numbers typed into the assistant, the action queue, refusals and screens.
5. C-05 · "Notice served by email" with no email sent, even with no address on file.
6. R-04 · a full `localStorage` loses work silently; imports are uncapped.
7. O-01 · the daily feed is precached: a dead network-first rule and a daily update prompt.
8. A-01 · white on red is 3.15:1 in dark.
9. A-02 · field outlines are 1.64–1.83:1.
10. A-03 · the Switch is not visible off in light, nor readable on in dark.
11. A-10 · 43 routes, one page title.
12. A-12 · five screens animate regardless of the reduced-motion setting.
13. C-03 · only Nelson's calendar is known and other towns are accepted without a word.
14. R-03 · one tap in the account menu wipes the demo and orphans its photos.
15. R-05 · a cleared date becomes a tenancy's end date or a ledger entry's date.
