import { beforeEach, describe, expect, it } from 'vitest'
import { guardedStorage, useSaveState } from './store'

/** A browser store that can be told to refuse writes, the way a full or blocked localStorage does. */
function fakeStorage() {
  const kept = new Map<string, string>()
  const state: { refuse: Error | null } = { refuse: null }
  return {
    kept,
    state,
    getItem: (name: string) => kept.get(name) ?? null,
    removeItem: (name: string) => void kept.delete(name),
    setItem: (name: string, value: string) => {
      if (state.refuse) throw state.refuse
      kept.set(name, value)
    },
  }
}

describe('saving when the browser refuses a write', () => {
  beforeEach(() => useSaveState.setState({ failedAt: null, reason: null }))

  it('keeps going, and records when saving stopped and why', () => {
    const inner = fakeStorage()
    const storage = guardedStorage(inner)
    storage.setItem('k', 'one')
    expect(inner.kept.get('k')).toBe('one')
    expect(useSaveState.getState()).toEqual({ failedAt: null, reason: null })

    inner.state.refuse = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    expect(() => storage.setItem('k', 'two')).not.toThrow()
    const failed = useSaveState.getState()
    expect(failed.reason).toBe('full')
    expect(failed.failedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // What was on disk before is still there: the refused change is the one a reload would lose.
    expect(storage.getItem('k')).toBe('one')
  })

  it('keeps the time of the first refusal, so the warning can say how much is at risk', () => {
    const inner = fakeStorage()
    const storage = guardedStorage(inner)
    inner.state.refuse = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    storage.setItem('k', 'two')
    useSaveState.setState({ failedAt: '2026-11-14T00:04:00.000Z' })
    storage.setItem('k', 'three')
    expect(useSaveState.getState().failedAt).toBe('2026-11-14T00:04:00.000Z')
  })

  it('clears the flag on the first write that works again', () => {
    const inner = fakeStorage()
    const storage = guardedStorage(inner)
    inner.state.refuse = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    storage.setItem('k', 'two')
    inner.state.refuse = null
    storage.setItem('k', 'three')
    expect(inner.kept.get('k')).toBe('three')
    expect(useSaveState.getState()).toEqual({ failedAt: null, reason: null })
  })

  it('tells a full store apart from one the browser has blocked', () => {
    const inner = fakeStorage()
    const storage = guardedStorage(inner)
    inner.state.refuse = new DOMException('The operation is insecure.', 'SecurityError')
    storage.setItem('k', 'two')
    expect(useSaveState.getState().reason).toBe('blocked')
  })
})
