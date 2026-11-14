# Loop & Pool - tech stack and UI research

Research date: 14 November 2026. Target: static site on GitHub Pages at `https://<user>.github.io/propertymanagementsoftware/`, all data mocked client-side, later swap to Supabase.

## How to read this

- **[V]** = verified today against the cited primary source (official docs, changelog, release page) or the npm registry (`npm view`).
- **[U]** = unverified today. It is prior knowledge or my inference. Spike it before relying on it.
- Versions are what `npm view <pkg> version` returned on 14 Nov 2026.
- Bundle sizes are from the bundlephobia API (whole-package, minified + gzip, not tree-shaken), so they are upper bounds.
- Browser support is from the Web Platform Status API (`api.webstatus.dev`) and caniuse raw data.

**Method limitation:** the web search tool was unavailable for this run (shared search budget exhausted). Everything was verified by fetching known official URLs directly and by querying the npm registry. That means I could confirm facts about tools I already knew to look at, but I could not run open-ended discovery searches for "newcomers of 2026". Pages fetched were summarised by a small model, so long release notes may have lost detail. Where a fetch failed or the page did not say, the item is marked [U].

---

## 1. Recommended stack

| Concern | Choice | Exact version | Why | Gotchas |
|---|---|---|---|---|
| Build tool | Vite (Rolldown + Oxc) | `vite` 8.3.8 | Purely static output, `base` handles the sub-path for all bundled assets, no server concepts to work around. Vite 8 GA 12 Mar 2026 [V] | Node 20.19+ or 22.12+ [V]. Public-folder URLs still need `import.meta.env.BASE_URL` [U] |
| UI runtime | React | `react` / `react-dom` 19.3.1, `@types/react` 19.3.0 | 19.3 (9 Sep 2026) made `<ViewTransition>` and Fragment refs stable [V] | `<ViewTransition>` only animates updates inside Transitions/Suspense, not plain `setState` [V] |
| Router | TanStack Router (file-based, pure client) | `@tanstack/react-router` 1.170.46, `@tanstack/router-plugin` 1.169.0 | Typed, schema-validated search params (ideal for map/list search state in the URL); runtime `/:id` routes work, unlike Next static export [V] | GitHub Pages has no rewrites: ship a `404.html` copy of `index.html` or use hash history [U]. `basepath`, auto code splitting, `viewTransition` option not re-verified today [U] |
| Alternative framework | Next.js App Router, `output: 'export'` | `next` 16.4.6 | Only if a move to Vercel/SSR is planned soon. Fully workable, see section 2 | No runtime dynamic params, no Server Actions/proxy/Cache Components, basePath not applied to image `src`, PWA path undocumented [V] |
| Language | TypeScript 7 for type-checking, TypeScript 6 API for tooling | `typescript` 7.0.2 (aliased as `@typescript/native`) + `@typescript/typescript6` 6.0.2 aliased as `typescript` | 7.0 is ~10x faster but ships no programmatic API; typescript-eslint needs `<6.1.0` [V] | `baseUrl` is a hard error in 7; `types` defaults to `[]`; `strict` defaults to true [V] |
| Styling | Tailwind CSS v4 | `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5 | CSS-first tokens via `@theme`, OKLCH palette, container queries built in [U for the last two] | v4.3 (8 May 2026) added first-party scrollbar utilities and more logical properties [V] |
| Component foundation | shadcn/ui on **Base UI** | `shadcn` CLI 4.23.0, `@base-ui/react` 1.9.0 | Base UI became shadcn's default in July 2026; you own the source, so the design system is fully custom [V] | Old package name `@base-ui-components/react` is frozen at 1.0.0-rc.0, do not install it [V] |
| Bottom sheet / drawer | Base UI Drawer (via shadcn Drawer) | in `@base-ui/react` 1.9.0 | Snap points, swipe directions, non-modal mode, virtual-keyboard handling. Vaul's README says "This repo is unmaintained" [V] | Snap-point offsets for vertical drawers must be applied in your own CSS [V] |
| Toasts | shadcn Toast (Base UI Toast) | in `@base-ui/react` 1.9.0 | One primitive layer; supports actions, promise, stacking, swipe [V] | `sonner` 2.0.8 is still fine (React 18/19 peers) if you prefer it [V] |
| Command palette | cmdk (shadcn Command) | `cmdk` 1.1.1 | Still what shadcn Command uses [V] | Last published Aug 2025; depends on `@radix-ui/react-dialog`, so a little Radix comes along [V] |
| Data tables | TanStack Table v9 | `@tanstack/react-table` 9.3.1 | v9 stable since 4 Aug 2026; tree-shakable `tableFeatures()` + `useTable`; shadcn Data Table guide uses v9 [V] | v8 tutorials (`useReactTable`) are now wrong [V] |
| Virtualisation | TanStack Virtual | `@tanstack/react-virtual` 3.14.26 | Headless, works with Table and lists | Dynamic row heights need `measureElement` [U] |
| Forms | React Hook Form + Zod 4 | `react-hook-form` 7.92.0, `@hookform/resolvers` 7.0.6, `zod` 4.6.7 | Mature, small (16 kB gz), resolvers accept zod 4 and Standard Schema [V] | With React Compiler prefer `useWatch` over `watch()` [U] |
| Charts | Recharts 3 through shadcn Chart, plus hand-written SVG sparklines | `recharts` 3.10.1 | shadcn Chart "now uses Recharts v3", themes with CSS variables, `accessibilityLayer` [V] | ~150 kB gz whole package and pulls Redux Toolkit; lazy-load chart routes [V] |
| Animation | CSS first (`@starting-style`, transitions) + React `<ViewTransition>`; Motion only for gestures/layout | `motion` 14.14.0 | Platform features now cover most UI motion; Motion for drag, shared layout, number tickers | Motion had two majors in 3 months (13.0 Aug 2026, 14.0 Oct 2026); pin exact [V] |
| Dates | date-fns v4 + tz | `date-fns` 4.4.0, `@date-fns/tz` 1.5.0 | Temporal is still missing from Safari and iOS Safari [V] | Store date-only values as `YYYY-MM-DD` strings, not `Date` |
| Icons | Lucide | `lucide-react` 1.72.0 | Default shadcn icon set, tree-shakable | v1 removed all brand icons (GitHub, Facebook, Instagram, etc.) [V] |
| Fonts | Self-hosted variable fonts | `@fontsource-variable/geist` 5.3.0, `@fontsource-variable/inter` 5.3.0 | No third-party requests, works offline | The `geist` npm package peer-depends on `next`, so it is Next-only [V] |
| Maps | MapLibre GL JS + OpenFreeMap vector tiles | `maplibre-gl` 6.18.0, `react-map-gl` 8.1.3 (`react-map-gl/maplibre`) | No API key or sign-up, vector styling to match the brand, smooth pinch zoom [V] | ~298 kB gz, WebGL2 required, v6 is ESM-only with named imports and explicit worker setup; OpenFreeMap has no SLA [V] |
| PDF generation | `@react-pdf/renderer` (generated notices) + print CSS (ad-hoc printing) | `@react-pdf/renderer` 4.9.0 | Declarative layout, real PDF blob you can store/zip; React 19 supported since 4.1.0 [V] | ~442 kB gz: dynamic-import it on demand [V] |
| PDF form filling (only if needed) | Cantoo fork of pdf-lib | `@cantoo/pdf-lib` 2.11.1 | Original `pdf-lib` 1.17.1 was last published May 2022 [V] | Fork quality not assessed [U] |
| PDF text extraction | PDF.js | `pdfjs-dist` 6.5.438 | Runs parsing in a worker; unpdf has no worker and needs Safari 18.4+ [V] | v6 raised minimum browsers and changed several APIs to Map/Set [V]. Scanned PDFs have no text layer |
| CSV | Papa Parse | `papaparse` 5.7.1 | 6.8 kB gz, worker + streaming, published Nov 2026 [V] | Turn on `header` and `skipEmptyLines` deliberately |
| ZIP export | fflate | `fflate` 0.8.3 | 12 kB gz vs JSZip 28 kB gz; async/worker API [V] | Build large zips in a worker to avoid jank |
| Async data layer | TanStack Query over a repository interface | `@tanstack/react-query` 5.107.1 | The swap-to-Supabase seam: only repository implementations change | TanStack DB is still `1.0.0-rc.1.5` and lists no Supabase collection; do not adopt yet [V] |
| Local mock database | Dexie (IndexedDB) | `dexie` 4.4.7, `dexie-react-hooks` 4.4.0 | Async like a real backend, stores photo Blobs, far beyond localStorage's 5 MiB [V] | Namespace the DB name: every `<user>.github.io` project shares one origin |
| UI / session state | Zustand with `persist` | `zustand` 5.1.0 | Tiny; theme, active role, filters | Version + migrate persisted state; do not put domain data here |
| PWA | vite-plugin-pwa (Workbox) | `vite-plugin-pwa` 2.0.0, `workbox-window` 7.4.1 | Generates precache manifest for static output; supports Vite 8 [V] | Use `registerType: 'prompt'`; scope/start_url must include the base path |
| Unit / component tests | Vitest + Testing Library | `vitest` 5.1.0, `@testing-library/react` 16.3.3, `fake-indexeddb` 6.2.8 | Shares Vite config; no dependency on the TypeScript API [V] | Needs Node 22.12+ / 24 / 26+ [V] |
| E2E + a11y tests | Playwright + axe | `@playwright/test` 1.65.1, `@axe-core/playwright` 4.14.0 | Device emulation for phone/tablet/ultrawide, automated WCAG checks | Axe catches roughly a third of issues; still do keyboard passes [U] |
| Lint | ESLint 10 flat config | `eslint` 10.15.0, `typescript-eslint` 8.72.2, `eslint-plugin-react-hooks` 7.1.1 | Hook + React Compiler rules | `eslint-plugin-jsx-a11y` 6.10.2 peers stop at ESLint 9 [V]; Biome 2.6.7 is the alternative |
| React Compiler | Opt in | `babel-plugin-react-compiler` 1.0.0, `@vitejs/plugin-react` 6.3.0, `@rolldown/plugin-babel` 0.3.1 | Stable 1.0; removes most manual memoisation [V] | In Vite 8 it needs `reactCompilerPreset` + the Rolldown Babel plugin, slower builds [V] |
| Later backend | Supabase JS | `@supabase/supabase-js` 2.119.0 | Works identically in an SPA | Not needed in the prototype; keep it out of the bundle until then |

---

## 2. Framework

### 2.1 Next.js 16.x static export - verified facts

Source: https://nextjs.org/docs/app/guides/static-exports (last updated 9 Aug 2026), https://nextjs.org/docs/app/guides/upgrading/version-16 (6 Nov 2026), https://nextjs.org/blog/next-16-3, https://nextjs.org/blog/next-16-4.

**Config needed for GitHub Pages under a sub-path**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const basePath = process.env.PAGES_BASE_PATH ?? '' // '/propertymanagementsoftware' in CI

const nextConfig: NextConfig = {
  output: 'export',            // emits ./out [V]
  basePath,                    // inlined at build time, cannot change without rebuild [V]
  trailingSlash: true,         // /me -> /me/index.html [V]; recommended for Pages [U]
  images: { unoptimized: true }, // default loader is unsupported in export [V]
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // reactCompiler: true,      // stable option, off by default [V]
  // Do NOT set cacheComponents / partialPrefetching (need the Node.js runtime) [V]
}
export default nextConfig
```

- `basePath`: applied automatically by `next/link` and the router. It is **not** applied to `next/image` `src` - "you will need to add the basePath in front of src" [V] https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath. The same goes for plain `<img>`, `fetch('/data.json')`, manifest icon paths and anything in `public/` [U for the non-image cases, but consistent with the doc].
- `assetPrefix`: do not use it for this. The docs say basePath "is better suited for hosting your application on a sub-path" and "We do not suggest you use a custom Asset Prefix for this use case"; assetPrefix only affects `/_next/static` and never the public folder [V] https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix.
- Official template `nextjs/deploy-github-pages`: `output: 'export'` plus `basePath: process.env.PAGES_BASE_PATH`, workflow uses `actions/configure-pages@v5` to supply the base path, uploads `./out`, deploys with `actions/deploy-pages@v4`, pnpm 10 / Node 22 [V] https://github.com/nextjs/deploy-github-pages.
- `.nojekyll`: only matters when publishing from a branch (Jekyll drops `_next`); Actions artifact deploys skip Jekyll [U]. Adding an empty `public/.nojekyll` is harmless.

**Not supported in static export (v16 list, verbatim categories)** [V]

Dynamic routes with `dynamicParams: true`; dynamic routes without `generateStaticParams()`; Route Handlers that rely on Request; cookies; rewrites; redirects; headers; Proxy; ISR; image optimisation with the default loader; Draft Mode; Server Actions; Intercepting Routes. Using any of them in `next dev` errors, as if `dynamic = 'error'` were set in the root layout.

Supported: Server Components (run at build), Client Components (prerendered to HTML at build, then hydrated), `GET` Route Handlers with `export const dynamic = 'force-static'`, `next/image` with a custom loader or `unoptimized`.

**Dynamic routes** [V] https://nextjs.org/docs/app/api-reference/functions/generate-static-params

- Every `[param]` segment must have `generateStaticParams()` returning every value at build time. There is no client-side fallback in export mode. An ID created at runtime in localStorage/IndexedDB (a new property, tenancy, notice) has no HTML file and cannot be routed as a path.
- No new option in 16.x fixes this for export. The 16.3/16.4 additions (loading shells for un-prerendered params, `ensureStatic`, `navigation()`, `prefetch()`) all require a server and Cache Components.
- With Cache Components, `generateStaticParams` must return at least one param; the docs mention a `__placeholder__` param trick, but that only satisfies validation.
- Practical consequence: in a Next export, detail pages for runtime entities must be query-string routes (`/landlord/property/?id=abc`) read with `useSearchParams` in a client component under `<Suspense>`. The page file exporting `generateStaticParams` cannot itself be a client component; split server page and client child [U, long-standing rule].

**Turbopack as default** [V]

- Used for both `next dev` and `next build`; no flag. A custom `webpack` config (including one injected by a plugin) makes `next build` fail unless you pass `--webpack`. This is what breaks webpack-based PWA plugins.
- Filesystem cache on by default for dev and build; `next dev` writes to `.next/dev`; a lockfile stops two instances.
- `next build` no longer prints route size / First Load JS. Use the bundle analyzer.
- 16.4: smaller CSS-module class names, export mangling, shared runtime chunk.

**React Compiler** [V]

- Compiler 1.0 is stable (`babel-plugin-react-compiler` 1.0.0, published 7 Oct 2025). In Next: `reactCompiler: true`, not on by default, slower builds because it runs through Babel.
- A Rust port inside Turbopack is experimental (`experimental.turbopackRustReactCompiler`, 16.3+; 16.4 cut its memory 30% and time 15%).
- react.dev: leave existing `useMemo`/`useCallback` in place; for new code rely on the compiler. https://react.dev/learn/react-compiler/introduction

**View Transitions** [V] https://nextjs.org/docs/app/guides/view-transitions (15 Oct 2026)

- "View transitions work in the App Router with no configuration." `experimental.viewTransition` was removed in 16.3.
- Uses React 19.3's stable `<ViewTransition>` and `addTransitionType`; `<Link transitionTypes={['nav-forward']}>` and `router.push(..., { transitionTypes })`.
- Needs transition types and `view-transition-class`: Chromium 125+, Safari 18.2+, Firefox 144+. Without support the app works and simply does not animate.
- Useful rules from the guide: put the wrapper in each `page.tsx` not the layout; add `default="none"` so named elements do not animate on unrelated transitions; set `::view-transition { pointer-events: none }`; zero durations under `prefers-reduced-motion`.
- Whether it behaves identically in a static export is not stated [U] (it is client-side, so it should).

**Breaking changes 15 -> 16 that matter** [V]

| Change | Effect on this project |
|---|---|
| Node 20.9+, TypeScript 5.1+, browsers Chrome/Edge/Firefox 111+, Safari 16.4+ | Fine |
| Async Request APIs only: `params`, `searchParams`, `cookies()`, `headers()` are Promises | In client components unwrap with `use(params)`; use the generated `PageProps<'/route'>` helpers (`next typegen`) |
| `next lint` removed; `next build` no longer lints; `eslint` key removed from config | Run ESLint/Biome yourself. `eslint-config-next` 16.4+ supports ESLint 10 |
| `middleware` renamed to `proxy` (Node runtime only) | Irrelevant: Proxy is unsupported in export |
| Caching: `cacheComponents` replaces PPR/dynamicIO flags; `revalidateTag(tag, profile)`; new `updateTag`, `refresh` | Irrelevant in export. Note `create-next-app` in 16.4 enables Cache Components by default and it "will become the default in Next.js 17" - you must switch it off for an export [V for the default; U for what the build does if you leave it on] |
| Parallel route slots need `default.js` | Only if you use slots |
| `next/image` defaults (`qualities: [75]`, no 16px size, local patterns for query strings) | Irrelevant with `unoptimized` |
| AMP, `serverRuntimeConfig`/`publicRuntimeConfig` removed | Use `NEXT_PUBLIC_*` env |
| Scroll-behaviour override removed | Add `data-scroll-behavior="smooth"` on `<html>` only if you use smooth scrolling |

**Useful 19.3 / 16.x additions for a client-data app** [V]

- `use(browser())` from `react-dom` (React 19.3): opts a component out of prerendering; the Suspense fallback becomes the build-time HTML. The Next SPA guide shows it for a `localStorage` draft. This is the sanctioned fix for hydration mismatches. https://nextjs.org/docs/app/guides/single-page-applications
- `next/font` downloads and self-hosts fonts at build time ("No requests are sent to Google by the browser"), works with Tailwind v4 via `@theme inline { --font-sans: var(--font-inter); }` [V]. Works in export because it is build-time [U, not stated explicitly].

### 2.2 TypeScript 7 verdict

Facts [V]:

- TypeScript 7.0 GA: 8 July 2026; npm `latest` is 7.0.2; 7.1 beta 20 Oct 2026. It is the Go-native compiler, typically 8-12x faster. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- "it does not ship with an API." A new API is expected in 7.1. Language-service plugins and embedded-language tooling (Vue, MDX, Astro, Svelte, Volar) still rely on 6.0.
- Microsoft's own guidance for tools that need the API (it names typescript-eslint): install side by side.
  ```json
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
  ```
  `npx tsc` then runs 7.0, while `import 'typescript'` resolves to 6.0.
- 7.0 defaults and removals: `strict: true`, `module: esnext`, `types: []`, `rootDir: ./`; hard errors for `baseUrl`, `moduleResolution: node/node10/classic`, `target: es5`, `esModuleInterop: false`.

Tool by tool:

| Tool | TypeScript 7 status | Evidence |
|---|---|---|
| Next.js 16.3+ / 16.4.6 | Supported for `next build` type-checking. Next calls the project-local `tsc` CLI by default (`experimental.useTypeScriptCli`) | [V] https://nextjs.org/docs/app/api-reference/config/typescript "Using TypeScript 7". Caveats: native diagnostics without Next code frames; checks the whole tsconfig project. The Next IDE TS plugin needs the JS language service, so expect to lose it under the TS 7 language server [U] |
| Vite 8 | Unaffected. Transforms with Oxc, never calls TypeScript | [V] Vite 8 announcement |
| Vitest 5.1.0 | Unaffected. No `typescript` peer dependency at all | [V] `npm view vitest peerDependencies` |
| typescript-eslint 8.72.2 | **Not supported.** Peer range `typescript >=4.8.4 <6.1.0` | [V] npm registry and https://typescript-eslint.io/users/dependency-versions/ |
| eslint-config-next 16.4.6 | Peer `typescript >=3.3.1` (loose), but it builds on typescript-eslint | [V] range; [U] behaviour |
| Biome 2.6.7 / oxlint 1.93.0 | Do not use the TypeScript API | [U] |

**Verdict:** do not pin 5.9. Use the documented dual install: TypeScript 7.0.2 as the `tsc` type-checker, and `@typescript/typescript6` 6.0.2 aliased as `typescript` so typescript-eslint keeps working. If that feels fragile, pin plain `typescript@6.0.2` (everything supports it) and revisit when typescript-eslint adopts the 7.1 API. Write the tsconfig for 7 from day one: no `baseUrl`, `"paths": { "@/*": ["./src/*"] }`, `"moduleResolution": "bundler"`, explicit `"types"`.

### 2.3 Next vs Vite - recommendation

**Recommendation: Vite 8 + TanStack Router as a pure client-rendered SPA.** Confidence: moderately high. Next static export is workable, but for this exact constraint set it carries weight you cannot use and has four specific traps.

Reasons, in order of weight:

1. **Runtime-created IDs.** Almost every detail screen in a property manager is "entity by ID", and the IDs are created in the browser. Next static export cannot route to a param that was not listed at build time [V]. You would be pushed to query-string URLs everywhere. A client router handles `/landlord/properties/$propertyId` natively.
2. **Nothing Next added in 16.x is usable.** Cache Components, Partial Prefetching, Instant Navigations, `proxy`, Server Actions, `updateTag`, ISR shells: all need a server [V]. The framework's direction (Cache Components default in 17) moves further from static export, not closer.
3. **Hydration mismatch as a whole class of bug.** In a Next export every client component is prerendered at build with no storage, then hydrated against real storage. Every screen needs `use(browser())` or a mounted gate. A pure CSR app has no prerendered HTML to mismatch.
4. **Sub-path assets.** Vite's `base` rewrites every bundled asset URL. Next's `basePath` skips image `src` and public files [V], the classic source of broken images on GitHub Pages.
5. **PWA.** vite-plugin-pwa 2.0.0 is built for static output. Serwist's Turbopack integration serves the worker from a Route Handler (`app/serwist/[path]/route.ts`) and its docs say nothing about `output: 'export'` or `basePath` [V]; `next-pwa` 5.6.0 was last published Aug 2022 and `@ducanh2912/next-pwa` 10.2.9 in Sept 2024 [V].
6. **Typed search params** suit a map/list search (bounds, filters, sort, selected listing in the URL) [V] https://tanstack.com/router/latest/docs/framework/react/guide/search-params.

What you give up, honestly:

- Per-route prerendered HTML (better first paint before JS). Mitigate with an inline app-shell skeleton in `index.html` and service-worker precache.
- Deep links on GitHub Pages return the `404.html` copy with a 404 status until the service worker is installed [U]. Hash history avoids that at the cost of uglier URLs.
- `next/font`'s automatic fallback metric adjustment. Fontsource plus a manual `size-adjust` fallback covers it.
- If the real product later needs SEO for public rental listings, you will want SSR. TanStack Start (`@tanstack/react-start` 1.169.5) is the upgrade path from TanStack Router; React Router 8 framework mode (`ssr: false` now, `true` later) is the other [V for versions and RR SPA mode: https://reactrouter.com/how-to/spa]. Components, design tokens, stores and repositories are framework-agnostic either way; only the routing shell moves.

Stay on Next only if the owner expects to move to Vercel with server rendering within the prototype's lifetime. If so, follow 2.1 and the rules in section 7.

**Vite essentials for this host**

```ts
// vite.config.ts (shape only; verify plugin option names when scaffolding)
export default defineConfig({
  base: '/propertymanagementsoftware/',
  plugins: [tanstackRouter({ autoCodeSplitting: true }), react(), tailwindcss(), VitePWA({ registerType: 'prompt' })],
})
```

- Router `basepath: '/propertymanagementsoftware'` [U]. Copy `dist/index.html` to `dist/404.html` in the deploy job [U]. Deploy with the same Pages actions as above, uploading `./dist`.
- GitHub Pages limits: 1 GB site, 100 GB/month soft bandwidth, 10-minute deploy timeout; not intended for commercial SaaS or sensitive transactions [V] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits. Fine for a prototype, not for production.

---

## 3. Component foundation

### 3.1 What changed in 2026

- **Base UI went stable and became the shadcn default.** `@base-ui/react` 1.0.0 shipped 11 Dec 2025 with 35 components; monthly minors since (1.9.0 on 9 Oct 2026). Drawer stable in 1.3.0 (Mar 2026), OTP Field stable in 1.6.0 (Jun 2026) [V] https://base-ui.com/react/overview/releases.
- **July 2026: "Base UI as the Default"** in shadcn/ui. `npx shadcn init` selects Base UI; `-b radix` keeps Radix; "Radix is not being deprecated", every update ships for both [V] https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default.
- **July 2026: React Aria as a third base** (`shadcn init --base aria`), all eight styles [V] https://ui.shadcn.com/docs/changelog/2026-07-react-aria.
- **shadcn CLI v4 (March 2026):** `init --preset`, `--template` (Next, Vite, TanStack Start, React Router, Astro, Laravel), `--monorepo`, `--base`, `add --dry-run/--diff/--view`, `info`, `docs`, `registry:base`, `registry:font`, shadcn/skills for coding agents [V] https://ui.shadcn.com/docs/changelog/2026-03-cli-v4. Later: `shadcn apply`, `preset`, `eject`, GitHub and private GitHub registries, a separate `cn` package (Sept 2026), `@shadcn/helpers`, shadcn/typeset [V titles only: https://ui.shadcn.com/docs/changelog].
- **Current shadcn component list (66):** includes Drawer, Sheet, Sidebar, Data Table, Chart, Calendar, Date Picker, Combobox, Command, Field, Input Group, Item, Empty, Spinner, Skeleton, Kbd, Button Group, Native Select, Toast, Resizable, Carousel, Input OTP, plus chat/AI pieces (Message, Bubble, Attachment, Trace, Code Block, Questionnaire) [V] https://ui.shadcn.com/docs/components. There is no "Sonner" entry in the list any more; "Toast" is the entry.

### 3.2 Comparison

| Library | Version (npm, 14 Nov 2026) | Health | React 19 / Tailwind 4 | Accessibility | Bundle / static export | Verdict |
|---|---|---|---|---|---|---|
| **shadcn/ui** (Base UI base) | CLI `shadcn` 4.23.0 | Very active: 30+ changelog entries in 2026 [V] | Yes / yes (Tailwind v4 since Feb 2025) [V] | Inherits Base UI | Copy-in source, you ship only what you add; pure client, export-safe | **Primary** |
| **Base UI** | `@base-ui/react` 1.9.0 | Monthly releases, MUI-backed, 37 components [V] | Peers `react ^17 \|\| ^18 \|\| ^19` [V]; unstyled, so Tailwind-agnostic | Strong (same team lineage as Radix/Floating UI) [U] | Tree-shakable; 1.7.0 notes bundle reductions [V] | The primitive layer |
| **Radix Primitives** | `radix-ui` 1.8.1, `@radix-ui/react-dialog` 1.3.1 (both 14 Oct 2026) | Still publishing; shadcn calls it "mature" and keeps full support [V]. GitHub Releases page is empty, so cadence is unclear [V] | Yes [U] | Strong [U] | Fine | Fine, but not the default any more |
| **React Aria Components** | `react-aria-components` 1.22.1 (9 Oct 2026) | Adobe, steady releases [V] | Peers through `^19.0.0-rc.1` [V]; Tailwind plugin `tailwindcss-react-aria-components` 2.2.0 | Best-in-class, incl. touch/screen-reader and i18n dates [U] | Heavier than Base UI [U] | Use if accessibility of date/range pickers and complex collections is the top priority |
| **Ark UI** | `@ark-ui/react` 5.40.0 (29 Oct 2026) | Active [V] | [U] | Good [U] | Headless, Zag state machines [U] | Gap-filler: signature pad, file upload, tour, date picker [U]. Docs fetch failed, so details are unverified |
| **HeroUI v3** | `@heroui/react` 3.2.7 (28 Oct 2026) | "v3 is now stable"; rebuilt on React Aria + Tailwind v4 [V] | Requires React >=19 and Tailwind >=4 [V] | Inherits React Aria | Pre-styled package; less control over the design language | Good product, wrong fit for a bespoke design system |
| **Mantine** | `@mantine/core` 9.8.0 (9.0 on 31 Mar 2026) | Very active; new `@mantine/schedule` package [V] | Requires React 19.2+; own CSS system, not Tailwind [V/U] | Good [U] | Works statically [U] | Skip: two styling systems |
| **coss ui** (ex Origin UI) | copy-in, no npm package | ~10.8k stars, Cal.com-sponsored, 56 components, built on Base UI [V] https://coss.com/ui/docs | Tailwind (version not stated) [V] | Inherits Base UI | Copy-in | Optional source of denser, production-style variants |
| **Kibo UI** | `kibo-ui` 1.1.5 (Apr 2026) | 41 components, 28 blocks; wraps Radix-based shadcn [V] | Not stated [V] | Varies | Copy-in | Skip unless you need a specific block; mixes Radix into a Base UI project |
| **Magic UI** | copy-in | ~78 free components [V] | Not stated [V] | Decorative | Animated marketing effects [V] | Landing page only, never in the app |
| **Aceternity UI** | - | Not checked [U] | [U] | [U] | Marketing effects [U] | Same as Magic UI |
| **Tremor** | `@tremor/react` 3.18.7, last published **Jan 2025** [V] | npm package is stale; repo describes itself as copy-and-paste components [V] | [U] | [U] | Depends on Recharts [U] | Skip; shadcn Chart covers it |
| **Park UI** | - | Not checked [U] | [U] | [U] | [U] | Skip |

"Newcomer that became the default in 2026": that is Base UI itself (via shadcn). I could not run discovery searches, so I cannot rule out something else I did not look at [U].

### 3.3 Recommendation

**One foundation: shadcn/ui (CLI 4.23.0) initialised with the Base UI base (`@base-ui/react` 1.9.0), Tailwind 4.3.5, your own tokens.** Treat the generated components as the starting point of the Loop & Pool design system: restyle them, do not ship the default look.

Add-ons:

- Base UI Drawer (bottom sheets with detents), Base UI Toast.
- cmdk 1.1.1 for the command palette (landlord + admin).
- TanStack Table 9.3.1 + TanStack Virtual 3.14.26.
- Recharts 3.10.1 through shadcn Chart.
- `react-day-picker` 10.0.2 (depends on date-fns 4 and @date-fns/tz [V]) for Calendar/Date Picker [U that shadcn's Calendar is on v10].
- Ark UI only for a missing primitive (for example a signature pad for inspections) [U].
- Cherry-pick ideas from coss ui for dense dashboard variants.
- No Magic UI / Aceternity inside the product surfaces.

All of these are client-only and work in a static build.

---

## 4. Building blocks

### 4.1 Drawer / bottom sheet

- **Base UI Drawer.** Vaul is unmaintained (README: "This repo is unmaintained", last npm publish 14 Dec 2024, 135 open issues) [V] https://github.com/emilkowalski/vaul. shadcn: "The drawer component now uses Base UI instead of Vaul" [V].
- Features [V] https://base-ui.com/react/components/drawer: `swipeDirection` (up/down/left/right), `snapPoints` (fractions, px, rem), `snapToSequentialPoints`, nested drawers, `modal={false}` plus `disablePointerDismissal` for a persistent sheet over a map, `Drawer.SwipeArea`, `Drawer.VirtualKeyboardProvider` (sets `--drawer-keyboard-inset`), indent/background scaling, detached triggers via `Drawer.createHandle()`.
- Pattern: Dialog/Sheet at >= 768px, Drawer below; shadcn documents this responsive-dialog composition [V].
- Gotchas: Vaul props `handleOnly`, `repositionInputs`, `shouldScaleBackground` have no direct equivalents; a drawer without `VirtualKeyboardProvider` ignores the on-screen keyboard [V].

### 4.2 Toasts, command palette

- shadcn Toast on Base UI Toast (July 2026): actions, status types, promises, stacking, swipe dismissal [V]. Sonner 2.0.8 (Aug 2026, 9.4 kB gz) remains a valid drop-in [V].
- cmdk 1.1.1: fine but slow-moving; brings `@radix-ui/react-dialog` ^1.1.6 [V]. Base UI Autocomplete/Combobox could replace it later [U].

### 4.3 Tables and virtualisation

- TanStack Table 9.0.0 landed 4 Aug 2026; 9.3.1 on 12 Oct 2026 [V]. API: `tableFeatures()` + `useTable({ features, data, columns })`; unlisted features are tree-shaken [V] https://ui.shadcn.com/docs/components/data-table.
- Whole package 31.6 kB gz before tree-shaking [V].
- Mobile: the shadcn guide does not address it [V]. Plan a card/list rendering below ~640px; never a horizontally scrolling 9-column table as the only view.

### 4.4 Forms and validation

- RHF 7.92.0 (16.4 kB gz) vs TanStack Form 1.33.5 (17.9 kB gz) [V sizes]. Both are healthy. RHF wins on ecosystem and examples; TanStack Form on type inference and Standard Schema-first design [U].
- Zod 4 (stable 9 Jul 2025; 4.6.7 now): ~14.7x faster string parsing, ~6.5x objects vs v3; core 5.36 kB gz for a trivial schema, `zod/mini` 1.88 kB gz; errors unified under `error`; string formats are top-level (`z.email()`); `z.toJSONSchema()` built in [V] https://zod.dev/v4. Whole package is 88.9 kB gz if not tree-shaken [V].
- Valibot 1.5.0: 14.7 kB gz whole package [V]; smallest option. Choose it only if bundle size dominates.
- TanStack Router accepts Zod 4 schemas directly for `validateSearch` [V], so one schema library serves forms, URL state and repository boundaries.

### 4.5 Charts

| Option | Version | Size (gz, whole pkg) | Notes |
|---|---|---|---|
| Recharts via shadcn Chart | 3.10.1 | 149.9 kB [V] | v3 since 23 Jun 2025; deps include Redux Toolkit, react-redux, immer, reselect, victory-vendor [V]. 3.11 canaries add themes and gradient fills [V] |
| visx | `@visx/visx` 4.0.0 (Jun 2026) | per-package | Maximum control, most work [U] |
| ECharts | 6.1.0 | 368 kB [V] | Canvas, huge feature set, weaker DOM accessibility [U] |
| lightweight-charts | 5.3.0 | - | Financial price series only [U] |
| Tremor | 3.18.7 (Jan 2025) | - | Stale on npm [V] |
| Hand-written SVG | - | 0 | Sparklines, progress rings, occupancy bars |

Recommendation: shadcn Chart (Recharts 3) for line/area/bar/donut, lazy-loaded per route, plus hand-written SVG for KPI sparklines. shadcn Chart rules [V]: give `ChartContainer` a height / `min-h-*` / `aspect-*`; use `var(--chart-1)` not `hsl(var(--chart-1))`; set `accessibilityLayer`.

### 4.6 Animation

- Order of preference: CSS transitions with `@starting-style` (Baseline since Aug 2024 [V]) for enter/exit; React `<ViewTransition>` for route and shared-element transitions; Motion only for drag, gesture-driven sheets you build yourself, layout/shared-layout animation and number tickers.
- Motion 14.14.0 (13 Nov 2026); `motion` wraps `framer-motion` 14.14.0; peers React 18/19; 64 kB gz for the full entry [V]. 13.0.0 on 5 Aug 2026 and 14.0.0 on 2 Oct 2026: fast major cadence, pin exact versions [V]. `LazyMotion` + `m` for smaller bundles [U].
- `tw-animate-css` 1.4.0 supplies shadcn's Tailwind v4 animation utilities [U].

### 4.7 Dates

- Temporal: Chrome 144 (Jan 2026), Firefox 139 (May 2025), Safari only in Technology Preview, not in iOS Safari 27.2 [V] webstatus + caniuse. Not usable natively. `temporal-polyfill` 1.0.8 is 19.5 kB gz [V] if you want `PlainDate` semantics.
- date-fns 4.4.0 with `@date-fns/tz` 1.5.0 (`TZDate`) [V versions; U API detail].
- Rule: rent due dates, lease start/end, notice periods are calendar dates. Store `YYYY-MM-DD` strings and only convert at the edge; store instants as UTC ISO strings. This avoids the off-by-one-day bug that plagues tenancy apps.

### 4.8 Icons and fonts

- Lucide 1.0.1 shipped 23 Mar 2026 (1.0.0 "was published unintentionally") [V]. Documented breaking change: brand icons removed (Chromium, Codepen, Codesandbox, Dribbble, Facebook, Figma, Framer, Github, Gitlab, Instagram, LinkedIn, Pocket, RailSymbol, Slack); use Simple Icons or official SVGs [V] https://lucide.dev/guide/react/migration. Other v1 changes (aliases, defaults) not confirmed [U].
- Fonts: variable fonts, self-hosted. Vite: `@fontsource-variable/geist` 5.3.0, `@fontsource-variable/geist-mono` 5.3.0, `@fontsource-variable/inter` 5.3.0 [V]. Next: `next/font` [V]. Geist also has Serif and Pixel families now [V] https://vercel.com/geist/introduction. "Inter 4" specifics not checked [U].

### 4.9 Maps

**Choice: MapLibre GL JS 6.18.0 + `react-map-gl` 8.1.3 (`react-map-gl/maplibre`) + OpenFreeMap styles.**

| | MapLibre GL + vector tiles | Leaflet + raster tiles |
|---|---|---|
| Version | 6.18.0 (11 Nov 2026), weekly releases [V] | 1.9.4 stable; 2.0.0-beta.4 announced 12 Nov 2026 [V] |
| Size (gz) | 297.6 kB [V] | 42.7 kB [V] |
| React wrapper | react-map-gl 8.1 supports MapLibre v4, v5, v6; peers `react >=16.3` [V] | react-leaflet 5.0.0 (Dec 2024), peers React 19 and Leaflet ^1.9 [V] |
| Tiles | OpenFreeMap: no sign-up or API key mentioned, styles Liberty/Bright/Positron/Dark/Fiord/3D, `https://tiles.openfreemap.org/styles/liberty` [V] | `tile.openstreetmap.org`: best-effort, no SLA, heavy use blocked without notice, no offline/prefetch; commercial services are told access "may be withdrawn at any point" [V] |
| Attribution | "(c) OpenMapTiles", "Data from OpenStreetMap" plus OpenFreeMap link; comes from the style's attribution control [V] | OSM attribution, visible, not hidden [V] |
| Styling | Full control (brand-matched light/dark styles) | Fixed raster look |
| Offline | Possible with a PMTiles extract hosted beside the app | Not permitted against OSM tiles [V] |

MapLibre v6 breaking changes (22 Jul 2026) [V] https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.0.0:

- ESM-only; UMD and CSP builds dropped. No default export: `import * as maplibregl` or named imports.
- WebGL1 removed; WebGL2 required. Catch failure with `.on('error')` and fall back to the list view.
- Worker is a real module URL. OpenFreeMap's own Vite example: `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` then `setWorkerUrl(workerUrl)` and `import 'maplibre-gl/dist/maplibre-gl.css'` [V] https://openfreemap.org/quick_start/.
- `styleimagemissing` is notify-only; `GeoJSONSource.setData` lost its second argument.

OpenFreeMap caveats [V] https://openfreemap.org/tos/: no warranty, may be discontinued without notice, requests go through Cloudflare, offline downloads limited to 3,000 tiles / 50 MB. Good for a prototype. For production either self-host it or use Protomaps.

Protomaps [V] https://docs.protomaps.com/basemaps/downloads: one PMTiles archive (planet ~120 GB), ODbL with OSM attribution, `pmtiles extract` cuts a region, "copy the tileset to your own cloud storage instead of hotlinking". `pmtiles` 4.5.0 is 7.7 kB gz [V]. A single-city extract committed under the 1 GB Pages limit would give true offline maps [U on resulting size].

Implementation notes: lazy-load the whole map route; render markers from a GeoJSON source with built-in clustering (or `supercluster` 9.1.0) [U]; keep the result list as the accessible equivalent of the map; provide zoom buttons (WCAG 2.5.7).

### 4.10 PDF

Generation:

| Option | Version | Size (gz) | Fit |
|---|---|---|---|
| `@react-pdf/renderer` | 4.9.0 (Aug 2026) | 442 kB [V] | Declarative pages, flexbox, embedded fonts, real Blob. React 19 since 4.1.0 [V] https://react-pdf.org/compatibility. Best for templated legal notices |
| `pdf-lib` | 1.17.1, last publish **May 2022** | 177 kB [V] | Unmaintained (279 open issues) [V]. Good API for filling/stamping existing PDFs |
| `@cantoo/pdf-lib` | 2.11.1 (Sept 2026) | - | Active fork [V version; U quality] |
| `jspdf` | 4.2.1 (Mar 2026; 4.0 Jan 2026) | 130 kB [V] | Imperative drawing; weak text layout |
| `pdfmake` | 0.3.14 (Nov 2026) | - | JSON document definition [U] |
| Print CSS | - | 0 | Best typography, zero bundle, but no programmatic file; output varies by browser |

Recommendation: `@react-pdf/renderer` loaded with `import()` only when a notice is generated, so the file can be stored in IndexedDB, attached to a tenancy and included in ZIP exports. Add a print stylesheet (`@page`, `break-inside: avoid`) for "print this screen". Generated legal notices are templates, not legal advice: keep the wording in reviewable data files and stamp a template version on each PDF.

Text extraction: `pdfjs-dist` 6.5.438 (1 Nov 2026) with its worker [V]. v6.0 (30 May 2026) raised minimum browsers, removed `getDocument()` without a parameter object, and changed several getters to Map/Set [V]. `unpdf` 2.1.0 bundles PDF.js 6.4.299, has no worker (main-thread parsing), and needs the global `Iterator` (Safari 18.4+) [V] https://github.com/unjs/unpdf - it targets serverless, so use pdfjs-dist in the browser.

### 4.11 CSV, ZIP

- Papa Parse 5.7.1 (11 Nov 2026), 6.8 kB gz [V].
- fflate 0.8.3 (Jul 2026), 12.1 kB gz vs JSZip 3.10.2 at 28.4 kB gz [V]. `client-zip` 2.5.1 is a streaming, store-only alternative [V version].

### 4.12 State, persistence and the Supabase seam

Architecture:

```
UI components
  -> hooks (TanStack Query: useQuery / useMutation, query keys per entity)
     -> repository interfaces (PropertyRepo, TenancyRepo, PaymentRepo, MediaRepo ...)  <- the seam
        -> LocalRepo (Dexie / IndexedDB, seeded from JSON)      [prototype]
        -> SupabaseRepo (@supabase/supabase-js 2.119.0)         [later]
Zustand (persist -> localStorage): theme, active persona/role, UI preferences only
```

- Every repository method is `async` and returns plain serialisable objects validated by Zod. That forces loading, empty and error states to exist from day one and makes the swap mechanical.
- Use string UUIDs (`crypto.randomUUID()`), `created_at`/`updated_at` ISO strings and snake_case-compatible shapes so rows map onto Postgres tables without a rewrite.
- TanStack Query 5.107.1 peers React 18/19 [V]. Set `staleTime` high for local data; invalidate on mutation.
- TanStack DB: docs point to a 1.0 release candidate (`@tanstack/react-db` 1.0.0-rc.1.5); collections for Query, Electric, TrailBase, RxDB, PowerSync, IndexedDB, LocalStorage; Supabase "isn't a listed collection type" [V] https://tanstack.com/db/latest/docs/overview. Promising, not yet the safe default.
- Dexie 4.4.7 (31 kB gz), `dexie-react-hooks` 4.4.0 [V]. `idb-keyval` 6.3.0 (0.8 kB gz) is enough if you only need a key-value blob store [V].
- Zustand 5.1.0 persist: `partialize`, `version` + `migrate`, `skipHydration` / `rehydrate()` [U - the docs URL I tried returned 404].
- **Shared origin:** all of `<user>.github.io/*` is one origin, so localStorage keys, IndexedDB database names and Cache Storage names collide with the owner's other Pages projects. Prefix everything (`loop-pool:*`, DB `loop-pool-v1`).

### 4.13 PWA and offline

Vite path (recommended): `vite-plugin-pwa` 2.0.0 (3 Oct 2026), peers Vite 3-8, `workbox-build`/`workbox-window` ^7.4.1 [V].

- `registerType: 'prompt'` and show a "New version available - Reload" toast. Auto-update with `skipWaiting` can swap code under an open form.
- Precache the app shell and hashed assets; runtime-cache map tiles with a capped, expiring cache; never precache the tile set.
- Manifest: `id`, `scope` and `start_url` all `/propertymanagementsoftware/`; maskable 192/512 icons; `display: 'standalone'`.
- `navigateFallback` to the cached `index.html` so deep links work offline [U option name].

Next path (if you stay on Next) [V unless marked]:

- Next's PWA guide points to Serwist for offline and notes static export means dropping Server Actions and config headers. https://nextjs.org/docs/app/guides/progressive-web-apps
- Serwist 9.5.13: `@serwist/next` quick start "is meant for webpack"; the Turbopack guide uses `@serwist/turbopack` with a Route Handler at `app/serwist/[path]/route.ts`; "configurator mode" (`next build && serwist build`, Serwist 9.4+) works with Turbopack. None of the three documents `output: 'export'` or `basePath`.
- Safest route [U]: after `next build`, run `@serwist/cli` or `workbox-build` `injectManifest` over `out/` and write `out/sw.js`, prefixing URLs with the base path. Spike this before committing.
- `beforeinstallprompt` "does not work on Safari iOS"; iOS needs a manual "Share -> Add to Home Screen" hint. Web Push on iOS 16.4+ only for installed home-screen apps.

Storage and iOS limits:

- Quotas [V] https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria: Safari 17+ about 60% of disk per origin for browser apps (home-screen apps get the same); Chromium 60% of disk; Firefox best-effort min(10% disk, 10 GiB). localStorage 5 MiB per origin.
- Eviction [V]: Safari deletes script-created data for an origin with no user interaction in seven days of browser use (when cross-site tracking prevention is on). MDN does not state an exemption for home-screen apps; WebKit says persistence is granted by heuristics, including whether the site is opened as a Home Screen Web App [V] https://webkit.org/blog/14403/updates-to-storage-policy/. Treat local data as losable.
- Do: call `navigator.storage.persist()` after a meaningful user action, show `navigator.storage.estimate()` in settings, catch `QuotaExceededError`, offer "Export all data (ZIP)".
- Offline photo capture: `<input type="file" accept="image/*" capture="environment">` [U]; downscale to about 1600 px long edge and re-encode (JPEG/WebP) before storing; store as Blob/ArrayBuffer rows in a Dexie `media` table with an `outbox` status; generate object URLs lazily and revoke them.
- Background Sync / Periodic Sync are not available in Safari [U]: flush the outbox on `online` and on app focus instead.
- GitHub Pages cannot set response headers, so you cannot send `Cache-Control: no-cache` for `sw.js` [U]. Browsers revalidate the worker script themselves, but keep the worker filename stable and never cache-bust it by renaming.

---

## 5. Modern CSS / platform features (late 2026)

Tailwind v4's own floor is Safari 16.4, Chrome 111, Firefox 128 [U]; Next 16's is Chrome/Edge/Firefox 111+, Safari 16.4+ [V].

Data: https://api.webstatus.dev (Baseline status and ship versions) cross-checked with caniuse raw JSON for anchor positioning and Temporal [V].

| Feature | Chrome | Firefox | Safari / iOS | Baseline | Use |
|---|---|---|---|---|---|
| Container size queries + `cqw/cqi` units | 105 | 110 | 16 | Widely (since Aug 2025) | **Everywhere.** Primary responsive tool for components |
| Container style queries | 111 | 151 (May 2026) | 18 | Newly (May 2026) | Progressive enhancement |
| `:has()` | 105 | 121 | 15.4 | Widely (Jun 2026) | **Everywhere** |
| Subgrid | 117 | 71 | 16 | Widely (Mar 2026) | **Everywhere** |
| `@starting-style` | 117 | 129 | 17.5 | Newly (Aug 2024; widely Feb 2027) | Use for enter animations; degrades to no animation |
| Anchor positioning | 125 partial | 147 partial (Jan 2026) | 26 partial, 27 full | Limited by strict definition; core works in all three engines (caniuse: 85% partial) | Progressive enhancement. Let Base UI's JS positioning handle popovers; use CSS anchors for simple tooltips/decorations |
| Popover API | 116 | 125 | 17 / iOS 18.3 | Newly (Jan 2025) | Use; Base UI already covers the complex cases |
| `popover="hint"` | 151 | 153 | No | Limited | Avoid |
| Invoker commands (`command`, `commandfor`) | 135 | 144 | 26.2 | Newly (Dec 2025) | Progressive enhancement only; older iOS lacks it |
| `<dialog>` | 37 | 98 | 15.4 | Widely | **Everywhere** |
| `<dialog closedby>` | 134 | 141 | No | Limited | Avoid relying on it |
| View transitions (same-document) | 111 | 144 (Oct 2025) | 18 | Newly (Oct 2025) | Progressive enhancement by nature |
| `view-transition-class`, transition types | 125 | 144 / 147 | 18.2 | Newly | Same |
| Cross-document view transitions | 126 | No | 18.2 | Limited | Irrelevant for an SPA |
| Scroll-driven animations | 115 | 159 (27 Oct 2026) | 26 | Newly (Oct 2026) | Decorative progressive enhancement only |
| `field-sizing: content` | 123 | 152 (Jun 2026) | 26.2 | Newly (Jun 2026) | Progressive enhancement; keep a `rows`/min-height fallback |
| `text-wrap: balance` | 114 | 121 | 17.5 | Newly (May 2024; widely this month) | **Use** on headings |
| `text-wrap: pretty` | 117 | No | 26 | Limited | Use; harmless where unsupported |
| `light-dark()` | 123 | 120 | 17.5 | Newly (May 2024; widely this month) | Use, but a class-based theme switch still needs `color-scheme` set per theme |
| OKLCH / Oklab | 111 | 113 | 15.4 | Widely | **Everywhere** |
| `color-mix()` | 111 | 113 | 16.2 | Widely | **Everywhere** |
| Relative colour syntax | 125 | 128 | 18 | Newly (Sept 2024; widely Mar 2027) | Use for derived hover/active tints with a static fallback token |
| `dvh` / `svh` / `lvh` | 108 | 101 | 15.4 | Widely | **Everywhere.** Replace `100vh` |
| `env(safe-area-inset-*)` | - | - | iOS 11.2+ [U] | [U] | **Everywhere**, with `viewport-fit=cover` |
| `interpolate-size` | 129 | No | No | Limited | Chromium-only nicety; accordions must work without it |
| Customisable `<select>` (`appearance: base-select`) | 135 | No | 27 (Sept 2026) | Limited | Progressive enhancement at most; use Base UI Select |
| CSS nesting | 120 | 117 | 17.2 | Widely | Everywhere |
| `@scope` | 143 | 146 | 26.4 | Newly (Mar 2026) | Not needed with Tailwind |
| `linear()` easing | 113 | 112 | 17.2 | Widely | Everywhere: spring-like easing without JS |
| `scrollbar-gutter` | 94 | 97 | 18.2 | Newly (Dec 2024) | Use to stop layout shift when dialogs lock scroll |
| `content-visibility` | 108 | 130 | 26 | Newly (Sept 2025) | Progressive enhancement for long lists |
| `inert` | 102 | 112 | 15.5 | Widely | Everywhere |
| `:user-valid` / `:user-invalid` | 119 | 88 | 16.5 | Widely | Everywhere: no red fields before the user types |
| `backdrop-filter` (unprefixed) | 76 | 103 | 18 | Newly (Sept 2024) | Use sparingly; test performance on mid-range Android |
| `text-box` trim | 133 | No | 18.2 | Limited | Enhancement only |
| Scroll-state container queries | 144 | No | No | Limited | Avoid |
| `overscroll-behavior` | yes | yes | reported "not shipped" by webstatus | Limited per webstatus | The data conflicts with my understanding that Safari 16+ supports it [U]. Test on a real iPhone; do not rely on it alone for scroll locking |
| Temporal (JS) | 144 | 139 | No | Limited | Polyfill or date-fns |

Safari is at 27.2 with 27.3 in beta [V] https://webkit.org/blog/. Supporting the two most recent iOS majors (26 and 27) is a reasonable floor for a 2026 prototype; anything "Newly available" in the table works there.

---

## 6. Design direction

Verified sources are cited inline. Statements about Mercury, Ramp, Monzo, Revolut, Airbnb's 2025 redesign, Zillow and Trade Me are practitioner observations that I could not verify against primary sources today [U]. The numeric scales below are my recommendation, informed by those sources, not quotations.

### 6.1 What the reference systems actually say

- **Linear** [V] https://linear.app/now/how-we-redesigned-the-linear-ui: themes generated in LCH from three variables (base, accent, contrast) instead of 98; elevation expressed through lightness and black/white opacities; Inter Display for headings, Inter for text; reduced chrome "to reduce visual noise"; text darker in light mode and lighter in dark mode for more contrast; obsessive alignment of labels, icons and buttons.
- **Vercel Geist** [V] https://vercel.com/geist/colors.md, https://vercel.com/geist/typography.md: ten-step scales with fixed jobs - 100/200/300 component background default/hover/active; 400/500/600 border default/hover/active; 700/800 high-contrast background and its hover; 900 secondary text and icons; 1000 primary text. Two page backgrounds, with "In most instances, you should use Background 1". Solid grey by default; alpha greys only when the background must show through. Copy 14 is "the most commonly used text style"; Label 13/12 for secondary and tertiary text; tabular figures for numbers.
- **Stripe** [V] https://stripe.com/blog/accessible-color-systems: build scales in a perceptually uniform space so every hue follows the same lightness curve; then contrast is predictable by step distance (five steps apart passes small text, four passes large text and icons).
- **Apple HIG** [V] (JSON endpoints under https://developer.apple.com/design/human-interface-guidelines/): Liquid Glass is "a distinct functional layer for controls and navigation elements" and "Don't use Liquid Glass in the content layer"; tab bars are for navigation not actions, use few tabs, single-word labels, never hide or disable tabs, badges only for critical information; sheets rest at detents (medium is about half height, large is full), include a grabber on resizable sheets, tapping the grabber cycles detents, nonmodal sheets let people keep using the parent view; iOS controls default 44x44 pt (minimum 28x28), text default 17 pt (minimum 11 pt), support 200% text enlargement; under Reduce Motion replace axis movement with fades and avoid animating into blurs.
- **Material 3 Expressive** [V] https://design.google/library/expressive-material-design-google-research: key actions were found up to four times faster when made larger and contained with strong colour; the gap between older and younger users disappeared; but "Banking interfaces ... need to respect established UI patterns", and removing text labels from actions hurt usability.
- **Android window size classes** [V] https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes: width compact < 600, medium 600-839, expanded 840-1199, large 1200-1599, extra-large >= 1600 dp; height compact < 480 (phones in landscape), where two panes are impractical; classes describe the window, not the device.
- **web.dev colour schemes** [V] https://web.dev/articles/building/a-color-scheme: avoid pure black and white; reduce saturation in dark themes so colours do not vibrate; alias scheme-agnostic tokens (`--surface1`, `--text1`) and set `color-scheme`.

### 6.2 Shared token system

- **Colour:** author every token in OKLCH. Three layers: primitives (12-step neutral with a slight brand-hue tint, plus brand, success, warning, danger, info scales on one shared lightness curve) -> semantic tokens (`--bg`, `--surface`, `--surface-raised`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-subtle`, `--primary`, `--on-primary`, status + status-subtle) -> component tokens only where needed. Adopt Geist's "each step has one job" rule.
- **Dark mode:** not an inversion. Page background around L 0.15-0.18, never pure black; each elevation level is a lighter surface (about +0.03 L), shadows nearly disappear; drop chroma on brand and status colours; re-check every pair.
- **Contrast floor:** body and muted text >= 4.5:1; large text, icons, input borders and focus rings >= 3:1. In practice no grey lighter than roughly Tailwind gray-500 for text on white [U exact step]. Write a unit test that checks token pairs.
- **Spacing:** 4 px base. Scale 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Focus:** one visible 2 px ring with 2 px offset in the primary colour, on `:focus-visible`, identical in every component.
- **Numbers:** `font-variant-numeric: tabular-nums` on every figure that can change or align; right-align numeric columns; format with `Intl.NumberFormat` (currency, compact).
- **Theming per surface:** one token set, three themes via a `data-surface="landlord|tenant|admin"` attribute that remaps radius, density and accent. Do not fork components.

### 6.3 (a) Landlord dashboard and admin console - calm, finance-grade

- **Type:** Geist Sans or Inter variable; Geist Mono for IDs, references and amounts in dense tables. Base 14 px/20. Scale: 12 (captions, table meta), 13 (secondary), 14 (body, table cells, controls), 16 (section titles), 20 (page title), 24-30 (dashboard headline), 28-36 semibold tabular for KPI figures. Negative tracking (about -0.01 to -0.02em) from 20 px up. Two weights in normal use (400/500), 600 for emphasis.
- **Density:** 32 px control height desktop, 36-40 px table rows, 16-20 px card padding, 24-32 px page gutters. Offer a comfortable/compact toggle rather than guessing.
- **Radius and elevation:** 6-8 px controls, 10-12 px cards. Structure comes from 1 px borders and surface steps, not shadows. Shadows only for things that float (menus, popovers, dialogs).
- **Colour use:** 90% neutral. One accent for primary actions and selection. Status colour appears only where status is the message (overdue, arrears, vacancy), paired with an icon or label, never colour alone.
- **Layout:** left sidebar (collapsible to icon rail), sticky page header with one primary action, content max-width about 1440-1600 px. KPI row -> trend chart -> "needs attention" list before any decorative chart. Every number is clickable through to its rows.
- **Motion:** almost none. 120-150 ms for hover/press, 200 ms for popovers, no bounce. Charts animate once on first reveal, not on every refetch.
- **Admin console:** same system, densest setting, command palette first (Cmd/Ctrl+K), bulk selection, saved filters, visible audit metadata.

### 6.4 (b) Tenant app - warm, consumer mobile

- **Type:** body 16 px/24 (also prevents iOS focus-zoom on inputs [U]); 14 secondary; 12 captions; headings 20, 24, 28, 34. A slightly rounder or more characterful display face for headings is appropriate (opinion); keep the body face the same as the dashboard for cohesion.
- **Shape:** 12 px controls, 16-20 px cards, 24-28 px top corners on sheets, full pills for chips and primary CTAs. Keep nested radii concentric (inner radius = outer radius minus padding).
- **Colour:** warm off-white background, tinted neutrals, one confident brand colour, photography does the heavy lifting. Translucent/blurred material only on the navigation layer (bottom bar, floating search pill, map controls), following the Liquid Glass rule above, and with a solid fallback under `prefers-reduced-transparency` [U media feature support].
- **Navigation:** bottom tab bar, 4-5 destinations, icon + single-word label, always visible outside modal flows, respects `env(safe-area-inset-bottom)`. Suggested: Search, Saved, Applications, Home (my tenancy: rent, maintenance), Profile. At >= 600 px it becomes a rail; at >= 840 px a sidebar.
- **Map / list search [U as reference claims, but consistent with HIG sheets]:** full-bleed map; a nonmodal bottom sheet with three detents (peek about 15-20% showing the count, half, full list); price pills as markers; tapping a pill selects it and snaps a card into view; "Search this area" pill appears after panning; filters open in a full-height sheet with a sticky "Show 42 homes" button; list/map toggle stays reachable with a thumb. Keep map state in the URL.
- **Touch:** 44 px minimum for every tap target, 48 px for primary actions, at least 8 px between adjacent targets; thumb-zone placement for primary CTAs.
- **Motion:** this is where expressive motion belongs. 150 ms exits, about 210 ms enters, about 400 ms for large moves such as sheet and shared-element transitions (the durations used in the Next view-transition guide [V]); ease-out for entering, ease-in for leaving, spring only for direct manipulation. Shared-element transition from listing card to listing detail. Everything collapses to a fade under `prefers-reduced-motion`.
- **Expressive emphasis, selectively:** make the one key action per screen larger and contained (Apply, Pay rent, Report an issue). Keep payments and legal screens conventional and calm.

### 6.5 States

- **Empty states:** every list and chart has one: what this area is for, why it is empty, one primary action. Distinguish "nothing yet" from "no results for these filters" (offer "Clear filters").
- **Loading:** skeletons that match final layout for content areas; no skeleton flash under about 200 ms (IndexedDB reads are usually faster, so delay them); spinners only inside buttons or for indeterminate short actions; optimistic updates for toggles and simple edits with an undo toast.
- **Errors:** inline next to the cause, in plain language, with a retry. A route-level error boundary per surface so one failure never blanks the app.
- **Offline:** a quiet persistent indicator, queued actions labelled "Will sync", never a blocking modal.

### 6.6 WCAG 2.2 AA items that are commonly missed

Source [V]: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

- **2.5.8 Target Size (Minimum):** 24x24 CSS px, or enough spacing that 24 px circles do not overlap. Icon buttons in table rows, chip close buttons, map pins and pagination dots are the usual failures.
- **2.4.11 Focus Not Obscured (Minimum):** a focused element must not be entirely hidden by sticky headers, bottom tab bars, cookie bars or sheets. Set `scroll-padding-block` to the height of sticky chrome.
- **2.5.7 Dragging Movements:** anything draggable needs a single-pointer alternative: zoom buttons on the map, number inputs beside a price-range slider, move up/down for reorder, tap-the-grabber for sheet detents, buttons for kanban moves.
- **3.3.7 Redundant Entry:** multi-step rental applications must not re-ask for data already given.
- **3.3.8 Accessible Authentication:** allow paste and password managers; no puzzle tests.
- **3.2.6 Consistent Help:** help/contact in the same place on every page.
- Older but still commonly failed [U]: 1.4.11 non-text contrast (input borders, focus rings 3:1), 1.4.10 reflow at 320 px, 1.4.4 text resize to 200%, 4.1.3 status messages (toasts in a live region), 1.4.1 use of colour.

### 6.7 Responsive strategy

Lay out components with **container queries**; use viewport breakpoints only for the app shell. Borrow the window size classes:

| Class | Width | Shell | Content |
|---|---|---|---|
| Compact | < 600 | Bottom tabs; sheets for secondary flows | Single column; tables become cards |
| Medium | 600-839 | Navigation rail | Two columns where natural; list-detail still stacked |
| Expanded | 840-1199 | Rail or collapsed sidebar | List-detail side by side; map + list side by side |
| Large | 1200-1599 | Full sidebar | Three zones possible: nav, list, detail |
| Extra-large | >= 1600 | Full sidebar | Cap content width (about 1440-1680 px) or add a contextual third pane; never stretch line length |

- Also check height: under 480 px tall (phones in landscape, unfolded flip phones) do not use two panes and shrink sticky chrome.
- Classes describe the window, not the device: a foldable unfolding, split-screen on a tablet and a resized desktop window must all re-flow live. Never branch on user agent.
- Use `@media (pointer: coarse)` to enlarge targets and `@media (hover: hover)` to gate hover-only affordances.
- Foldable hinge avoidance via viewport-segment media features is Chromium-only [U]; a centred gutter in two-pane layouts is the pragmatic answer.
- Test matrix: 360x800, 390x844, 412x915, 768x1024, 820x1180, 1024x768, 1366x768, 1440x900, 1920x1080, 2560x1080, 3440x1440.

---

## 7. Known pitfalls and prevention

| # | Pitfall | Prevention |
|---|---|---|
| 1 | **Hydration mismatch from persisted state** (Next export): build-time HTML has no storage, the browser does | Pure CSR avoids it. In Next: wrap storage-dependent UI in `<Suspense>` and call `use(browser())` (React 19.3) [V], or `next/dynamic` with `ssr: false`. Set the theme class with an inline script in `<head>` before paint |
| 2 | **Broken links and assets under the sub-path** | One `asset()` / `href()` helper built on `import.meta.env.BASE_URL` (or `NEXT_PUBLIC_BASE_PATH`). Never write a root-absolute `/...` string. Run Playwright against a preview served from `/propertymanagementsoftware/` and fail the build on any 404 or console error |
| 3 | **Runtime IDs in a static export** | Client router with a `404.html` fallback, or query-string routes in Next. Decide before writing the first detail page |
| 4 | **`100vh` on mobile** (content hidden behind browser chrome) | `min-height: 100dvh` for app shells, `svh` for elements that must never be covered. Pad with `env(safe-area-inset-*)`; add `viewport-fit=cover` |
| 5 | **Service worker serves a stale app forever** | `registerType: 'prompt'` with an in-app "Update available" action; hashed assets only in precache; never rename the worker file; ship a "reset app data" button; version the cache prefix; test update flow in CI |
| 6 | **Shared `github.io` origin** | Prefix localStorage keys, IndexedDB names and cache names; scope the worker and manifest to the sub-path |
| 7 | **Missing empty / loading / error states** | Async repositories from day one; a `<QueryBoundary>` wrapper that requires `empty`, `loading` and `error` renderers; seed data includes an empty portfolio persona; add a dev toggle for artificial latency and failure |
| 8 | **Inaccessible custom controls** (div buttons, fake selects, focus lost in dialogs) | Only build on Base UI primitives; lint hooks and a11y; axe in Playwright on every route; a keyboard-only pass per surface; visible `:focus-visible` everywhere |
| 9 | **Tables overflowing on phones** | Below about 640 px render rows as cards (label/value pairs) with the primary column as the title; if horizontal scroll is kept, make the first column sticky and show a scroll shadow; test at 320 px |
| 10 | **Low-contrast muted text and placeholder-as-label** | Token-pair contrast test in CI (4.5:1 text, 3:1 UI); real labels above inputs; placeholders only as examples |
| 11 | **Layout shift** | Width/height or `aspect-ratio` on every image and map container; skeletons that match final size; `scrollbar-gutter: stable`; self-hosted fonts with a metric-matched fallback; reserve space for async badges |
| 12 | **Scroll-lock and stacking bugs** (background scrolls under a sheet, iOS rubber-banding, body jump on dialog open, nested overlays) | Let Base UI Dialog/Drawer own scroll locking; one overlay root; no hand-written `overflow: hidden` on `body`; a z-index token scale; test nested sheet -> dialog -> toast on a real iPhone |
| 13 | **Storage loss and quota errors** | `navigator.storage.persist()`, quota meter, `QuotaExceededError` handling, compress photos before storing, one-tap ZIP export/import |
| 14 | **Schema drift in persisted mock data** | Version the Dexie schema and Zustand `persist`; write migrations; validate on read with Zod and fall back to re-seeding rather than crashing |
| 15 | **Date and money bugs** | Calendar dates as `YYYY-MM-DD` strings; money as integer minor units; all formatting through `Intl` |
| 16 | **Bundle bloat** (map 298 kB gz, react-pdf 442 kB gz, Recharts 150 kB gz, pdf.js) | Route-level code splitting; `import()` heavy libraries at the moment of use; budget check in CI |
| 17 | **Motion that ignores user settings** | Global `prefers-reduced-motion` rule; view transitions get zero duration; no parallax or auto-playing loops |
| 18 | **Generic "AI look"** (default shadcn greys, purple gradients, emoji as icons, every card identical, centre-aligned everything) | Own tokens before the first screen; one accent; real content and realistic seed data (addresses, rents, dates); consistent icon set; typographic hierarchy rather than boxes |
| 19 | **Following outdated tutorials** | TanStack Table v8 API, Vaul, `next lint`, `middleware.ts`, Tailwind v3 config files, `framer-motion` imports, `@base-ui-components/react`, default-import `maplibre-gl`, sync `params` are all out of date as of this research [V] |
| 20 | **Unpinned fast-moving dependencies** | Exact versions in `package.json`, commit the lockfile, Renovate/Dependabot grouped weekly |

---

## 8. Open items to spike before committing

1. **Framework decision** (Vite + TanStack Router vs Next export). If Next: prove query-string detail routes, the service-worker build over `out/`, and that `cacheComponents` is off.
2. TanStack Router on GitHub Pages: `basepath`, `404.html` fallback vs hash history, automatic code splitting, view-transition integration [U].
3. TypeScript dual install with the shadcn CLI and editor tooling [U].
4. MapLibre 6 worker setup under Vite 8 / Rolldown and on iOS Safari 26/27 [V snippet from OpenFreeMap; U on Vite 8 specifically].
5. `@react-pdf/renderer` 4.9.0 bundling under Vite 8 (its Yoga dependency has had ESM `__dirname` issues with esbuild [V]) and font embedding.
6. `eslint-plugin-jsx-a11y` on ESLint 10, or switch a11y linting to Biome [U].
7. iOS: installed-PWA storage persistence, camera capture, and sheet/keyboard behaviour on a real device.
8. `overscroll-behavior` support in Safari (data conflict noted in section 5).
9. Whether shadcn's Calendar uses `react-day-picker` 10, and whether its Command has a Base UI-native variant [U].

---

## 9. Sources

Framework and language
- https://nextjs.org/docs/app/guides/static-exports
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/blog/next-16-3
- https://nextjs.org/blog/next-16-4
- https://nextjs.org/docs/app/api-reference/config/typescript
- https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
- https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix
- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- https://nextjs.org/docs/app/api-reference/components/font
- https://nextjs.org/docs/app/api-reference/components/image
- https://nextjs.org/docs/app/guides/view-transitions
- https://nextjs.org/docs/app/guides/single-page-applications
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://github.com/nextjs/deploy-github-pages
- https://react.dev/blog/2026/09/09/react-19-3
- https://react.dev/learn/react-compiler/introduction
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://typescript-eslint.io/users/dependency-versions/
- https://vite.dev/blog/announcing-vite8
- https://reactrouter.com/how-to/spa
- https://tanstack.com/router/latest/docs/framework/react/overview
- https://tanstack.com/router/latest/docs/framework/react/guide/search-params
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Components
- https://ui.shadcn.com/docs/changelog
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://ui.shadcn.com/docs/changelog/2026-07-react-aria
- https://ui.shadcn.com/docs/changelog/2026-07-toast
- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- https://ui.shadcn.com/docs/components
- https://ui.shadcn.com/docs/components/drawer
- https://ui.shadcn.com/docs/components/command
- https://ui.shadcn.com/docs/components/data-table
- https://ui.shadcn.com/docs/components/chart
- https://base-ui.com/react/overview/releases
- https://base-ui.com/react/components/drawer
- https://github.com/emilkowalski/vaul
- https://github.com/radix-ui/primitives/releases
- https://heroui.com/docs/react/releases
- https://mantine.dev/changelog/9-0-0/
- https://coss.com/ui/docs
- https://www.kibo-ui.com/docs
- https://magicui.design/docs
- https://github.com/tremorlabs/tremor

Building blocks
- https://github.com/TanStack/table/releases
- https://zod.dev/v4
- https://github.com/recharts/recharts/releases
- https://motion.dev/changelog
- https://lucide.dev/guide/react/migration
- https://github.com/lucide-icons/lucide/releases/tag/1.0.0
- https://github.com/maplibre/maplibre-gl-js/releases
- https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.0.0
- https://visgl.github.io/react-map-gl/docs/whats-new
- https://openfreemap.org/quick_start/
- https://openfreemap.org/tos/
- https://docs.protomaps.com/basemaps/downloads
- https://operations.osmfoundation.org/policies/tiles/
- https://leafletjs.com/
- https://github.com/Hopding/pdf-lib
- https://react-pdf.org/compatibility
- https://github.com/mozilla/pdf.js/releases
- https://github.com/unjs/unpdf
- https://tanstack.com/db/latest/docs/overview
- https://serwist.pages.dev/docs/next/getting-started
- https://serwist.pages.dev/docs/next/turbo
- https://serwist.pages.dev/docs/next/config
- https://serwist.pages.dev/docs/cli
- https://vite-pwa-org.netlify.app/guide/
- https://tailwindcss.com/blog
- npm registry (`npm view`) and https://bundlephobia.com/api/size for versions, peer ranges, publish dates and sizes

Platform
- https://api.webstatus.dev/v1/features (Baseline status and ship versions)
- https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/css-anchor-positioning.json
- https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/temporal.json
- https://webkit.org/blog/
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

Design and accessibility
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- https://design.google/library/expressive-material-design-google-research
- https://vercel.com/geist/introduction
- https://vercel.com/geist/colors.md
- https://vercel.com/geist/typography.md
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://stripe.com/blog/accessible-color-systems
- https://web.dev/articles/building/a-color-scheme
