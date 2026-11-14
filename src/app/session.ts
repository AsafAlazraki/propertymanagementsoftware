/**
 * Who is using the app.
 *
 * The prototype has no accounts and does not pretend to: there is no password
 * field protecting nothing. A session is a choice of persona from the demo
 * world, shown plainly in the interface as "Viewing as …". In production this
 * file is where Supabase Auth plugs in; everything downstream already reads
 * the session the same way.
 */
import type { ID, Portal, Session } from '@/domain/types'
import { DEMO } from '@/domain/seed'
import { useStore } from '@/data/store'

export interface Persona {
  userId: ID
  orgId?: ID
  portal: Portal
  /** One line on who this is and why you would look through their eyes. */
  blurb: string
}

export const PERSONAS: Record<'landlord' | 'tenant' | 'applicant' | 'admin', Persona> = {
  landlord: { userId: DEMO.landlord, orgId: DEMO.org, portal: 'loop', blurb: 'Owns five Nelson rentals through a family trust.' },
  tenant: { userId: DEMO.tenant, portal: 'pool', blurb: 'Rents 14 Tōtara Rise from Hana. Has a repair and a pet request in flight.' },
  applicant: { userId: DEMO.applicant, portal: 'pool', blurb: 'Looking for her first place. No rental history yet.' },
  admin: { userId: DEMO.admin, portal: 'admin', blurb: 'Runs the platform: organisations, feedback, law changes, self-healing.' },
}

export function signInAs(persona: Persona): void {
  const session: Session = { userId: persona.userId, orgId: persona.orgId, portal: persona.portal, demoBanner: true }
  useStore.getState().setSession(session)
}

/**
 * Makes sure a portal has someone signed in. A deep link into /loop, /pool or
 * /admin opens as that portal's demo persona rather than bouncing to a gate.
 */
export function ensureSession(portal: Portal): void {
  const current = useStore.getState().session
  if (current?.portal === portal) return
  // A platform admin viewing an organisation keeps their own identity underneath.
  if (current?.impersonatedBy && portal === 'loop') return
  signInAs(portal === 'loop' ? PERSONAS.landlord : portal === 'pool' ? PERSONAS.tenant : PERSONAS.admin)
}

/** A platform admin opens an organisation as its owner. Recorded in the audit log by the caller. */
export function viewAsOrg(orgId: ID, ownerUserId: ID, adminId: ID): void {
  useStore.getState().setSession({ userId: ownerUserId, orgId, portal: 'loop', impersonatedBy: adminId, demoBanner: true })
}

export function stopViewingAs(): void {
  signInAs(PERSONAS.admin)
}

export function signOut(): void {
  useStore.getState().setSession(null)
}
