/**
 * The local repository.
 *
 * The prototype keeps every record in one persisted store so it runs on a
 * static host with no backend. This file is the seam: screens never touch
 * localStorage, they call `useRows`, `insert`, `update` and `remove`, which is
 * the same shape a Supabase-backed repository exposes (see docs/ARCHITECTURE.md).
 *
 * Multi-tenancy: every tenant-owned row carries `orgId`, and landlord screens
 * read through `useOrgRows`, which filters on the session's organisation — the
 * client-side twin of the Row-Level Security policies in supabase/migrations.
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { ID, ISODateTime, Portal, Session, User } from '@/domain/types'
import type { AutopilotEntry, Db } from '@/domain/db'
import { buildSeed, SEED_VERSION } from '@/domain/seed'
import { rollForward } from '@/domain/seed/simulate'
import { today } from '@/domain/rules/calendar'
import { sweep } from '@/domain/healing'

type ArrayKeys<T> = { [K in keyof T]: T[K] extends { id: ID }[] ? K : never }[keyof T]
export type { Db }
export type Collection = ArrayKeys<Db>
export type Row<K extends Collection> = Db[K][number]

export interface Prefs {
  theme: 'light' | 'dark' | 'system'
  /** Whether the first-run tour for each portal has been seen. */
  toured: Partial<Record<Portal, boolean>>
  mapStyle: 'streets' | 'light'
}

interface Store {
  db: Db
  session: Session | null
  prefs: Prefs
  insert: <K extends Collection>(key: K, row: Row<K>) => void
  insertMany: <K extends Collection>(key: K, rows: Row<K>[]) => void
  update: <K extends Collection>(key: K, id: ID, patch: Partial<Row<K>>) => void
  remove: <K extends Collection>(key: K, id: ID) => void
  patchDb: (fn: (db: Db) => Partial<Db>) => void
  setSession: (session: Session | null) => void
  setPrefs: (patch: Partial<Prefs>) => void
  resetDemo: () => void
}

/** A new demo world, brought up to today, with the first self-healing sweep already run. */
function freshDb(): Db {
  const day = today()
  const seeded = rollForward(buildSeed(day), day)
  return { ...seeded, ...sweep(seeded, day).patch }
}

/* ───────────────────────────────── saving ───────────────────────────────── */

/**
 * Whether this browser is keeping what the store writes.
 *
 * Every change rewrites the whole store to localStorage, which every
 * `<user>.github.io` project shares and which holds about 5 MB. When a write
 * is refused the change is still in memory and the app carries on, but nothing
 * since `failedAt` is on disk, so a reload would lose it. The shells watch this
 * and tell the person once (`StorageWatch` in src/shell/common.tsx). Because
 * each write is the whole store, the first write that succeeds again saves
 * everything, and clears the flag.
 */
export interface SaveState {
  /** When the first refused write happened, or null while saving works. */
  failedAt: ISODateTime | null
  /** `full` is the quota; `blocked` is anything else the browser refused with. */
  reason: 'full' | 'blocked' | null
}

export const useSaveState = create<SaveState>(() => ({ failedAt: null, reason: null }))

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

/** Wraps a browser store so a refused write is recorded instead of thrown into the middle of a mutation. */
export function guardedStorage(inner: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): StateStorage {
  return {
    getItem: (name) => inner.getItem(name),
    removeItem: (name) => inner.removeItem(name),
    setItem: (name, value) => {
      try {
        inner.setItem(name, value)
        if (useSaveState.getState().failedAt) useSaveState.setState({ failedAt: null, reason: null })
      } catch (e) {
        if (!useSaveState.getState().failedAt) {
          useSaveState.setState({ failedAt: new Date().toISOString(), reason: isQuotaError(e) ? 'full' : 'blocked' })
        }
      }
    },
  }
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      db: freshDb(),
      session: null,
      prefs: { theme: 'system', toured: {}, mapStyle: 'streets' },
      insert: (key, row) => set((s) => ({ db: { ...s.db, [key]: [row, ...(s.db[key] as unknown[])] } })),
      insertMany: (key, rows) => set((s) => ({ db: { ...s.db, [key]: [...rows, ...(s.db[key] as unknown[])] } })),
      update: (key, id, patch) =>
        set((s) => ({
          db: {
            ...s.db,
            [key]: (s.db[key] as { id: ID }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)),
          },
        })),
      remove: (key, id) =>
        set((s) => ({ db: { ...s.db, [key]: (s.db[key] as { id: ID }[]).filter((r) => r.id !== id) } })),
      patchDb: (fn) => set((s) => ({ db: { ...s.db, ...fn(s.db) } })),
      setSession: (session) => set({ session }),
      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
      resetDemo: () => set({ db: freshDb() }),
    }),
    {
      name: 'loop-pool:store',
      version: SEED_VERSION,
      // Reading `localStorage` inside the callback keeps the old behaviour where there is none
      // (tests, a locked-down browser): the middleware catches that and runs without persistence.
      storage: createJSONStorage(() => guardedStorage(localStorage)),
      // A new seed shape replaces the stored demo rather than trying to migrate it.
      migrate: (persisted) => {
        const old = persisted as Partial<Store> | undefined
        return {
          db: freshDb(),
          session: null,
          prefs: old?.prefs ?? { theme: 'system', toured: {}, mapStyle: 'streets' },
        } as Store
      },
      // The simulated bank feed catches up to today every time the app opens.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const day = today()
        if (state.db.simulatedThrough < day) state.patchDb((db) => rollForward(db, day))
      },
    },
  ),
)

/* ───────────────────────────────── reading ──────────────────────────────── */

/** A whole collection, or the rows a predicate keeps. Pass `deps` for anything the predicate closes over. */
export function useRows<K extends Collection>(key: K, keep?: (row: Row<K>) => boolean, deps: unknown[] = []): Row<K>[] {
  const rows = useStore((s) => s.db[key]) as Row<K>[]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (keep ? rows.filter(keep) : rows), [rows, ...deps])
}

export function useRow<K extends Collection>(key: K, id: ID | undefined): Row<K> | undefined {
  const rows = useStore((s) => s.db[key]) as Row<K>[]
  return useMemo(() => (id ? rows.find((r) => r.id === id) : undefined), [rows, id])
}

export function useSession(): Session | null {
  return useStore((s) => s.session)
}

/** The signed-in user. Throws outside a portal shell, where a session always exists. */
export function useMe(): User {
  const session = useStore((s) => s.session)
  const users = useStore((s) => s.db.users)
  const me = useMemo(() => users.find((u) => u.id === session?.userId), [users, session?.userId])
  if (!me) throw new Error('No signed-in user. Portal screens render inside a shell that guarantees one.')
  return me
}

export function useOrgId(): ID {
  const orgId = useStore((s) => s.session?.orgId)
  if (!orgId) throw new Error('This screen needs an organisation in the session.')
  return orgId
}

/** Rows of a tenant-owned collection that belong to the session's organisation. */
export function useOrgRows<K extends Collection>(
  key: K,
  keep?: (row: Row<K>) => boolean,
  deps: unknown[] = [],
): Row<K>[] {
  const orgId = useStore((s) => s.session?.orgId)
  const rows = useStore((s) => s.db[key]) as Row<K>[]
  return useMemo(
    () => rows.filter((r) => (r as { orgId?: ID }).orgId === orgId && (!keep || keep(r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, orgId, ...deps],
  )
}

/* ───────────────────────────────── writing ──────────────────────────────── */

export const db = {
  get: () => useStore.getState().db,
  insert: <K extends Collection>(key: K, row: Row<K>) => useStore.getState().insert(key, row),
  insertMany: <K extends Collection>(key: K, rows: Row<K>[]) => useStore.getState().insertMany(key, rows),
  update: <K extends Collection>(key: K, id: ID, patch: Partial<Row<K>>) => useStore.getState().update(key, id, patch),
  remove: <K extends Collection>(key: K, id: ID) => useStore.getState().remove(key, id),
  patch: (fn: (db: Db) => Partial<Db>) => useStore.getState().patchDb(fn),
}

export function newId(prefix: string): ID {
  return `${prefix}_${nanoid(10)}`
}

export function nowIso(): ISODateTime {
  return new Date().toISOString()
}

/** Every admin action and every state-changing automation leaves a line here. */
export function audit(actor: string, action: string, target: string, detail?: string, orgId?: ID): void {
  db.insert('audit', { id: newId('aud'), at: nowIso(), actor, action, target, detail, orgId })
}

/** A line in the landlord's autopilot feed. */
export function logAutopilot(orgId: ID, kind: AutopilotEntry['kind'], text: string): void {
  db.patch((d) => ({
    autopilotLog: [{ id: newId('ap'), orgId, at: nowIso(), kind, text }, ...d.autopilotLog].slice(0, 200),
  }))
}
