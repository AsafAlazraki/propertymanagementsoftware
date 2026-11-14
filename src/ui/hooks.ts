import { useEffect, useState, useSyncExternalStore } from 'react'

/** Live media-query match. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * The layout class of the viewport, decided on width and height together.
 * A phone on its side is wide but has no room for a bottom bar or a sticky
 * header stack, so it is `compact` in height even though it is `md` in width.
 */
export function useViewport() {
  const md = useMediaQuery('(min-width: 768px)')
  const lg = useMediaQuery('(min-width: 1024px)')
  const xl = useMediaQuery('(min-width: 1280px)')
  const short = useMediaQuery('(max-height: 520px)')
  return {
    /** Bottom tab bar + sheets from the bottom. */
    phone: !md,
    /** Icon rail. */
    rail: md && (!lg || short),
    /** Full sidebar. */
    sidebar: lg && !short,
    wide: xl,
    short,
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

/**
 * The last non-empty value. A sheet whose subject is cleared when it closes
 * would go blank for the length of its exit; this keeps the content until the
 * next subject arrives.
 */
export function useLast<T>(value: T | null | undefined): T | null | undefined {
  const [last, setLast] = useState(value)
  if (value != null && value !== last) setLast(value)
  return value ?? last
}

/** A value that follows `value` after it has been stable for `ms`. */
export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Runs `fn` when the key combo is pressed. `mod` is ⌘ on Apple and Ctrl elsewhere. */
export function useHotkey(combo: string, fn: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const needMod = parts.includes('mod')
    const needShift = parts.includes('shift')
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target?.matches?.('input, textarea, select, [contenteditable="true"]')
      if (typing && !needMod) return
      if (e.key.toLowerCase() !== key) return
      if (needMod !== (e.metaKey || e.ctrlKey)) return
      if (needShift !== e.shiftKey) return
      fn(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo, fn])
}
