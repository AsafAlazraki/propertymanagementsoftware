import { useEffect } from 'react'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

/** A page younger than this has nothing unsaved in it, so a new build can simply take over. */
const FRESH_MS = 8000

/**
 * Registers the service worker and decides what to do when a new build is
 * waiting. Just after load, it applies the update at once — so refreshing the
 * live site always lands on the latest build. Later than that, it asks: a
 * landlord halfway through an inspection must not have the page reload under
 * them.
 */
export function UpdatePrompt() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const loadedAt = performance.now()
    const update = registerSW({
      onNeedRefresh() {
        if (performance.now() - loadedAt < FRESH_MS) {
          void update(true)
          return
        }
        toast('A newer version is ready', {
          description: 'Your work is saved on this device.',
          duration: Infinity,
          action: { label: 'Update now', onClick: () => void update(true) },
        })
      },
    })
  }, [])
  return null
}
