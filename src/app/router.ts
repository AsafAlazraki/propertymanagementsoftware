import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

/**
 * `basepath` comes from Vite's base, so the same build works at the root in
 * development and under /propertymanagementsoftware/ on GitHub Pages.
 */
export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
