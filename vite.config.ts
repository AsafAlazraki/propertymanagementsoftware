import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'
// `URL` is imported rather than taken from the global: tsconfig.node.json has no DOM lib.
import { URL, fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * GitHub Pages serves 404.html for any address it has no file for. Writing the app
 * shell there means a deep link (or a refresh on one) opens the app at that address
 * instead of GitHub's own 404 page.
 */
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'loop-pool:spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const index = readFileSync(join(outDir, 'index.html'), 'utf8')
      writeFileSync(join(outDir, '404.html'), index)
    },
  }
}

/**
 * The GitHub Pages build is a mode, not a --base flag: Git Bash on Windows rewrites an
 * argument that starts with a slash into a Windows path (/x/ becomes C:/Program Files/Git/x/),
 * which silently corrupts every asset URL. `vite build --mode pages` cannot be mangled.
 */
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/propertymanagementsoftware/' : '/',
  plugins: [
    // Must run before react(): it rewrites route files before JSX is compiled.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
      semicolons: false,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      // `prompt`, not `autoUpdate`: a new build must never swap code under a half-finished
      // inspection. src/app/updates.ts applies an update silently if the page has only just
      // loaded, and otherwise offers it as a toast — so a refresh always shows the latest build.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        scope: './',
        start_url: './',
        name: 'Loop & Pool',
        short_name: 'Loop & Pool',
        description: 'Your rental on autopilot. One verified renter profile.',
        theme_color: '#0e1a2f',
        background_color: '#0e1a2f',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // pdf.js and the map are fetched on demand; keeping them out of the precache
        // keeps the first install small on a phone.
        globIgnores: ['**/pdf.worker*', '**/maplibre*'],
        maximumFileSizeToCacheInBytes: 3_000_000,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Every <user>.github.io project shares one origin, so cache names carry a prefix.
        cacheId: 'loop-pool',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/regwatch/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'loop-pool-regwatch', expiration: { maxEntries: 8 } },
          },
          {
            urlPattern: ({ url }) => /pdf\.worker|maplibre/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'loop-pool-on-demand', expiration: { maxEntries: 12 } },
          },
          {
            // Map tiles: a small, expiring cache. Never precached.
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'loop-pool-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
    }),
    spaFallback(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
  },
  server: { port: 5200, strictPort: true },
  preview: { port: 5201, strictPort: true },
}))
