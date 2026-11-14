import { useEffect, useLayoutEffect } from 'react'
import { useStore, type Prefs } from '@/data/store'

const KEY = 'loop-pool:theme'

function resolve(theme: Prefs['theme']): 'light' | 'dark' {
  if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return theme
}

/** Keeps <html data-theme> in step with the stored preference and the system setting. */
export function useThemeBinding(): void {
  const theme = useStore((s) => s.prefs.theme)
  useLayoutEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolve(theme)
    }
    apply()
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* private mode: the inline script in index.html falls back to the system setting */
    }
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])
}

/**
 * Puts the brand on <html>, not on a wrapper: sheets, menus and dialogs render
 * in a portal outside the app root and must still read the right palette.
 */
export function useBrand(brand: 'loop' | 'pool' | 'admin' | 'neutral'): void {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.brand
    if (brand === 'neutral') delete root.dataset.brand
    else root.dataset.brand = brand
    return () => {
      if (previous) root.dataset.brand = previous
      else delete root.dataset.brand
    }
  }, [brand])
}

/** The browser chrome colour follows the surface under it. */
export function useThemeColor(color: string): void {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', color)
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [color])
}

export function cycleTheme(current: Prefs['theme']): Prefs['theme'] {
  return current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
}
