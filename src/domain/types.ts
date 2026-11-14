/**
 * Loop & Pool — domain contract.
 *
 * Pure types: no React, no DOM, no storage. Every tenant-owned record carries
 * `orgId`; that column is what Row-Level Security filters on in production
 * (see supabase/migrations) and what the local repository filters on today.
 */

export type ID = string
/** Calendar date, `YYYY-MM-DD`, always interpreted in the property's local time. */
export type ISODate = string
/** Instant, full ISO-8601. */
export type ISODateTime = string

export type JurisdictionCode = 'NZ' | 'AU-NSW' | 'AU-VIC' | 'AU-QLD' | 'AU-WA' | 'AU-SA'
export type PlanTier = 'ledger_free' | 'autopilot_pro' | 'portfolio_trust'
export type Portal = 'loop' | 'pool' | 'admin'
export type Role =
  | 'landlord'
  | 'co_owner'
  | 'advisor'
  | 'tenant'
  | 'prospective_renter'
  | 'tradesperson'
  | 'field_provider'
  | 'platform_admin'

/* ───────────────────────── organisations & people ───────────────────────── */

export type OrgStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'churned'
export type OrgSource = 'founding_migration' | 'organic' | 'referral' | 'investor_association'

export interface Org {
  id: ID
  name: string
  kind: 'landlord' | 'partner_agency'
  jurisdiction: JurisdictionCode
  region: string
  plan: PlanTier
  status: OrgStatus
  source: OrgSource
  createdAt: ISODateTime
  lastActiveAt: ISODateTime
  ownerUserId: ID
  /** Set when a platform admin suspends the organisation. Shown to the owner as a sentence. */
  suspendedReason?: string
  adminNotes?: string
}

export interface LegalEntity {
  id: ID
  orgId: ID
  name: string
  type: 'individual' | 'partnership' | 'family_trust' | 'ltc_company'
  taxIdMasked: string
  gstRegistered: boolean
  /** Spend above this needs a second trustee/owner to approve. */
  dualApprovalThreshold?: number
}

export interface User {
  id: ID
  /** Landlord-side users belong to an org. Renters and providers do not. */
  orgId?: ID
  role: Role
  fullName: string
  email: string
  phone: string
  identityVerified: boolean
  defaultPortal: Portal
  onboardingStep: 0 | 1 | 2 | 3
  createdAt: ISODateTime
  lastActiveAt: ISODateTime
  status: 'active' | 'invited' | 'deactivated'
  hue: number
}

/* ─────────────────────────────── properties ─────────────────────────────── */

export type TitleType = 'freehold' | 'unit_title' | 'cross_lease'
export type StandardStatus = 'compliant' | 'non_compliant' | 'unknown' | 'exempt'

export interface HealthyHomesStandard {
  status: StandardStatus
  /** What was measured or installed, in the landlord's words. */
  detail?: string
  checkedAt?: ISODate
}

export interface HealthyHomes {
  heating: HealthyHomesStandard
  insulation: HealthyHomesStandard
  ventilation: HealthyHomesStandard
  moisture: HealthyHomesStandard
  draught: HealthyHomesStandard
  /** When the signed compliance statement was last given to the tenant. */
  statementSignedAt?: ISODate
}

export interface CapexAsset {
  id: ID
  kind: string
  label: string
  installedYear: number
  lifespanYears: number
  replaceCost: number
}

export interface KeySet {
  id: ID
  label: string
  holder: 'landlord' | 'tenant' | 'depot' | 'lockbox' | 'provider'
  location: string
}

export interface Listing {
  status: 'draft' | 'live' | 'paused' | 'let'
  headline: string
  description: string
  /** The one advertised figure. The rules engine refuses ranges, blanks and offers above it. */
  advertisedWeeklyRent: number
  availableFrom: ISODate
  publishedAt?: ISODateTime
  syndication: { pool: boolean; trademe: boolean; realestate: boolean }
  petsConsidered: boolean
  viewingTimes: ISODateTime[]
  features: string[]
  views: number
}

export interface Property {
  id: ID
  orgId: ID
  entityId: ID
  jurisdiction: JurisdictionCode
  address: { line1: string; suburb: string; city: string; postcode: string }
  geo: { lat: number; lng: number }
  titleType: TitleType
  bodyCorpRulesAttached?: boolean
  kind: 'house' | 'townhouse' | 'unit' | 'apartment'
  beds: number
  baths: number
  parking: number
  floorArea: number
  yearBuilt: number
  purchasePrice: number
  purchaseYear: number
  currentValue: number
  mortgageBalance: number
  mortgageRatePct: number
  /** Seed for the generated illustration; a prototype has no photographs. */
  art: { style: number; hue: number }
  onboardingMode: 'first_time_rental' | 'existing_tenancy_import'
  healthyHomes: HealthyHomes
  smokeAlarms: { lastChecked?: ISODate; type: 'photoelectric_10yr' | 'hardwired' | 'unknown'; expiryYear?: number }
  meth: { status: 'clear' | 'untested' | 'contaminated' | 'remediated'; testedAt?: ISODate }
  insurance: {
    insurer?: string
    policyRef?: string
    renewsOn?: ISODate
    excess?: number
    /** RTA requires an insurance statement in the tenancy agreement. */
    statementInAgreement: boolean
    inspectionIntervalWeeks?: number
  }
  sinkingFund: { ratePct: number; balance: number; autoApproveLimit: number }
  assets: CapexAsset[]
  keys: KeySet[]
  listing?: Listing
  annualCosts: { rates: number; insurance: number; bodyCorp: number }
}

/* ──────────────────────────────── tenancies ─────────────────────────────── */

export interface Pet {
  name: string
  kind: string
  approvedAt?: ISODate
}

export interface Tenancy {
  id: ID
  orgId: ID
  propertyId: ID
  tenantIds: ID[]
  status: 'draft' | 'active' | 'notice_given' | 'ended'
  type: 'periodic' | 'fixed'
  startDate: ISODate
  /** Fixed-term end date; absent for periodic. */
  endDate?: ISODate
  weeklyRent: number
  cadence: 'weekly' | 'fortnightly'
  /** 0 = Sunday … 6 = Saturday */
  rentDueWeekday: number
  /** Rent is paid up to and including this date. Arrears derive from it. */
  rentPaidTo: ISODate
  lastRentIncrease?: ISODate
  bond: {
    amount: number
    petBond: number
    receivedOn?: ISODate
    lodgedOn?: ISODate
    bondRef?: string
  }
  pets: Pet[]
  agreementSignedOn?: ISODate
  noticeGiven?: { by: 'landlord' | 'tenant'; on: ISODate; ground: string; endsOn: ISODate }
  /** How it got here — drives onboarding copy. */
  origin: 'pool_application' | 'imported' | 'manual'
}

export type LedgerKind =
  | 'rent'
  | 'expense'
  | 'sinking_skim'
  | 'sinking_draw'
  | 'bond_received'
  | 'bond_lodged'
  | 'tenant_invoice'
  | 'tenant_invoice_payment'
  | 'subscription'
  | 'field_task'

export interface LedgerEntry {
  id: ID
  orgId: ID
  propertyId: ID
  tenancyId?: ID
  date: ISODate
  kind: LedgerKind
  /** Positive = money in to the owner, negative = money out. */
  amount: number
  /** Key into the jurisdiction's tax categories. */
  category: string
  description: string
  bankRef?: string
  match: 'auto' | 'manual' | 'unmatched' | 'none'
  /** Period this rent payment covers, for the punctuality score. */
  dueDate?: ISODate
  ticketId?: ID
}

/** A raw line from the bank feed, before it is reconciled to a ledger entry. */
export interface BankLine {
  id: ID
  orgId: ID
  date: ISODate
  amount: number
  reference: string
  payer: string
  status: 'matched' | 'suggested' | 'unmatched' | 'ignored'
  ledgerId?: ID
  suggestedTenancyId?: ID
  confidence?: number
}

export type ArrearsStage = 'none' | 'day1_checkin' | 'formal_notice' | 'remedy_notice' | 'tribunal_ready'

export interface ArrearsEvent {
  id: ID
  orgId: ID
  tenancyId: ID
  at: ISODateTime
  kind:
    | 'reminder_sent'
    | 'landlord_called'
    | 'concierge_requested'
    | 'concierge_reported'
    | 'formal_notice_sent'
    | 'remedy_notice_sent'
    | 'tribunal_pack_prepared'
    | 'payment_plan_agreed'
    | 'cleared'
  note?: string
}

/* ─────────────────────────────── maintenance ────────────────────────────── */

export type Urgency = 'emergency' | 'urgent' | 'routine'
export type TicketStatus =
  | 'submitted'
  | 'quote_requested'
  | 'quote_ready'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_invoice'
  | 'tenant_verifying'
  | 'disputed'
  | 'closed'

export interface TicketEvent {
  at: ISODateTime
  by: 'tenant' | 'landlord' | 'system' | 'provider' | 'admin'
  text: string
}

export interface Ticket {
  id: ID
  orgId: ID
  propertyId: ID
  tenancyId?: ID
  reportedBy: ID
  createdAt: ISODateTime
  title: string
  description: string
  category: string
  room?: string
  photoIds: ID[]
  triage: {
    urgency: Urgency
    confidence: number
    reasoning: string
    /** True when the description suggests tenant-caused damage. A flag to check, never a finding. */
    possibleTenantFault: boolean
    suggestedTrade: string
    selfHelpTried?: string
  }
  status: TicketStatus
  mode: 'auto_dispatch' | 'quote_first'
  providerId?: ID
  quote?: {
    amount: number
    lines: { label: string; amount: number }[]
    submittedAt: ISODateTime
    /** Set when the quote is over the owner's second-approval line and one owner has said yes. */
    firstApproval?: { by: string; at: ISODateTime }
  }
  scheduledFor?: ISODateTime
  entryNoticeServedAt?: ISODateTime
  keyCode?: { code: string; validFrom: ISODateTime; validTo: ISODateTime; depot: string }
  invoice?: { amount: number; submittedAt: ISODateTime; cause: 'wear_and_tear' | 'tenant_damage'; providerNote: string }
  tenantResponse?: { verdict: 'accepted' | 'disputed'; at: ISODateTime; note?: string }
  paidFrom?: 'sinking_fund' | 'owner' | 'tenant'
  events: TicketEvent[]
}

export interface Provider {
  id: ID
  name: string
  kind: 'trade' | 'inspector' | 'agent'
  trade: string
  region: string
  rating: number
  jobs: number
  vetting: 'vetted' | 'pending' | 'suspended'
  /** Trade licence / insurance checks, as recorded by a platform admin. */
  checks: { identity: boolean; insurance: boolean; licence: boolean; policeVet: boolean }
  calloutFee: number
  hourlyRate: number
  responseHours: number
  joinedAt: ISODateTime
}

/* ─────────────────────────────── inspections ────────────────────────────── */

export interface InspectionRoom {
  name: string
  /** 1 (needs action) … 5 (excellent). Undefined until inspected. */
  score?: number
  note?: string
  photoIds: ID[]
  flags: string[]
}

export interface Inspection {
  id: ID
  orgId: ID
  propertyId: ID
  tenancyId?: ID
  type: 'routine' | 'entry' | 'exit'
  status: 'proposed' | 'notice_served' | 'in_progress' | 'completed' | 'cancelled'
  mode: 'diy' | 'delegated'
  providerId?: ID
  scheduledFor?: ISODateTime
  noticeServedAt?: ISODateTime
  completedAt?: ISODateTime
  rooms: InspectionRoom[]
  overallScore?: number
  summary?: string
}

export interface FieldTask {
  id: ID
  orgId: ID
  propertyId: ID
  type: 'routine_inspection' | 'viewing' | 'entry_exit_report' | 'tribunal_representation'
  price: number
  platformFee: number
  status: 'requested' | 'accepted' | 'scheduled' | 'completed' | 'paid_out' | 'cancelled'
  providerId?: ID
  requestedAt: ISODateTime
  scheduledFor?: ISODateTime
  completedAt?: ISODateTime
  inspectionId?: ID
  note?: string
}

export interface KeyEvent {
  id: ID
  orgId: ID
  propertyId: ID
  keySetId: ID
  at: ISODateTime
  action: 'deposited' | 'code_issued' | 'collected' | 'returned' | 'code_expired'
  actor: string
  note?: string
}

/* ──────────────────────── variations, notices, documents ────────────────── */

export type VariationType = 'pet_request' | 'flatmate_change' | 'term_extension' | 'custom_clause' | 'minor_change'

export interface Variation {
  id: ID
  orgId: ID
  tenancyId: ID
  type: VariationType
  status: 'requested' | 'awaiting_tenant' | 'awaiting_landlord' | 'signed' | 'declined' | 'withdrawn'
  requestedBy: 'tenant' | 'landlord'
  requestedAt: ISODateTime
  /** Statutory response deadline, where one applies. */
  respondBy?: ISODate
  summary: string
  detail: Record<string, string | number | boolean>
  conditions: string[]
  declineGround?: string
  signatures: { by: 'tenant' | 'landlord'; name: string; at: ISODateTime }[]
}

export type NoticeType =
  | 'rent_increase'
  | 'entry_inspection'
  | 'entry_repairs'
  | 'termination_periodic'
  | 'termination_owner_occupy'
  | 'termination_sale'
  | 'fixed_term_non_renewal'
  | 'arrears_reminder'
  | 'remedy_14_day'

export interface Notice {
  id: ID
  orgId: ID
  tenancyId: ID
  type: NoticeType
  createdAt: ISODateTime
  servedOn: ISODate
  method: 'email' | 'hand' | 'letterbox' | 'post'
  /** When the law treats it as received. */
  deemedReceivedOn: ISODate
  effectiveOn: ISODate
  status: 'draft' | 'served' | 'acknowledged' | 'withdrawn'
  title: string
  body: string
  rulesUsed: string[]
  packVersion: string
}

export interface Doc {
  id: ID
  orgId: ID
  propertyId: ID
  tenancyId?: ID
  name: string
  kind:
    | 'tenancy_agreement'
    | 'healthy_homes_statement'
    | 'insurance'
    | 'bond_receipt'
    | 'inspection_report'
    | 'body_corp_rules'
    | 'meth_report'
    | 'invoice'
    | 'notice'
    | 'other'
  addedAt: ISODateTime
  sizeKb: number
  source: 'uploaded' | 'generated' | 'imported'
}

/* ───────────────────────────── Pool: renters ────────────────────────────── */

export interface RenterProfile {
  userId: ID
  headline: string
  bio: string
  employment: string
  householdSize: number
  hasPets: boolean
  petDetail?: string
  moveInFrom?: ISODate
  budgetWeekly?: number
  references: { name: string; relation: string; verified: boolean }[]
  creditCheckedAt?: ISODate
  /** History rows feed the Rent Passport. Only verified facts, never opinions. */
  history: {
    address: string
    from: ISODate
    to?: ISODate
    onTimePct: number
    careScore: number
    verifiedBy: 'loop_ledger' | 'landlord_reference' | 'self_reported'
  }[]
  /** Listings the renter has saved. */
  savedPropertyIds: ID[]
  visibleToLandlords: boolean
  /** A renter may link a tenancy with a landlord who is not on Loop. */
  externalTenancy?: { address: string; weeklyRent: number; landlordName: string; since: ISODate; invitedLandlord: boolean }
}

export type ApplicationStage = 'interest' | 'viewing_booked' | 'preferred' | 'checks' | 'approved' | 'declined' | 'withdrawn'

export interface Application {
  id: ID
  orgId: ID
  propertyId: ID
  applicantId: ID
  stage: ApplicationStage
  submittedAt: ISODateTime
  /** Locked to the advertised rent. An offer above it is refused by the rules engine. */
  offeredWeeklyRent: number
  moveIn: ISODate
  occupants: number
  message: string
  viewingAt?: ISODateTime
  decidedAt?: ISODateTime
  /** Personal data for an unsuccessful application is purged on this date. */
  purgeOn?: ISODate
  purged?: boolean
}

/* ─────────────────────────── platform (admin) ───────────────────────────── */

export interface Feedback {
  id: ID
  orgId?: ID
  userId: ID
  portal: Portal
  screen: string
  kind: 'bug' | 'idea' | 'praise' | 'question' | 'complaint'
  text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  area: string
  status: 'new' | 'triaged' | 'planned' | 'shipped' | 'declined'
  votes: number
  createdAt: ISODateTime
  adminReply?: string
  adminNote?: string
}

export type AdminTaskKind =
  | 'concierge_call'
  | 'identity_review'
  | 'provider_vetting'
  | 'maintenance_dispute'
  | 'rule_change_review'
  | 'healing_approval'
  | 'copilot_gap'
  | 'feedback_followup'
  | 'billing_issue'

export interface AdminTask {
  id: ID
  kind: AdminTaskKind
  title: string
  detail: string
  orgId?: ID
  refId?: ID
  priority: 'p1' | 'p2' | 'p3'
  status: 'open' | 'in_progress' | 'done' | 'dismissed'
  createdAt: ISODateTime
  dueAt?: ISODateTime
  assignee?: string
  resolution?: string
}

/** A source the regulatory watcher polls. Mirrors regwatch/sources.json. */
export interface RuleSource {
  id: ID
  name: string
  url: string
  type: 'atom' | 'rss' | 'html' | 'json'
  jurisdiction: JurisdictionCode | 'AU'
  signal: 'legislation' | 'bills' | 'regulator' | 'tax' | 'privacy' | 'tribunal' | 'holidays' | 'data'
  frequency: 'daily' | 'weekly'
  priority: 1 | 2 | 3
  lastCheckedAt?: ISODateTime
  lastChangedAt?: ISODateTime
  health: 'ok' | 'changed' | 'unreachable' | 'never_checked'
}

export interface RulePatch {
  ruleKey: string
  from: unknown
  to: unknown
  effectiveFrom: ISODate
}

export interface RuleChange {
  id: ID
  jurisdiction: JurisdictionCode
  sourceId: ID
  detectedAt: ISODateTime
  title: string
  /** Plain-English summary. Drafted by the model, corrected by the reviewer. */
  summary: string
  /** Verbatim text the summary rests on. No quote, no patch. */
  evidenceQuote: string
  evidenceUrl: string
  patches: RulePatch[]
  confidence: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  status: 'pending_review' | 'needs_second_review' | 'approved' | 'published' | 'rejected' | 'no_action'
  /** Whether this row came from the live watcher feed or the demo seed. */
  origin: 'watcher' | 'demo'
  reviews: { by: string; at: ISODateTime; verdict: 'approve' | 'reject' | 'no_action'; note?: string }[]
  publishedInVersion?: string
}

export interface RulePackVersion {
  id: ID
  jurisdiction: JurisdictionCode
  version: string
  publishedAt: ISODateTime
  publishedBy: string
  note: string
  /** ruleKey → value overrides applied on top of the shipped pack. */
  overrides: Record<string, unknown>
  /**
   * ruleKey → the date its new value comes into force. A value published ahead
   * of that date is held until then: the calculators keep returning the old
   * value, and the rule shows what is coming. No entry means "from publication".
   */
  commences?: Record<string, ISODate>
  changeIds: ID[]
}

export type IncidentStatus = 'detected' | 'auto_healed' | 'awaiting_approval' | 'approved' | 'rejected' | 'monitoring'

export interface Incident {
  id: ID
  playbookId: ID
  orgId?: ID
  detectedAt: ISODateTime
  severity: 'low' | 'medium' | 'high'
  title: string
  /** What the check saw, with the figures. */
  signal: string
  diagnosis: string
  proposedFix: string
  risk: 'safe' | 'needs_approval'
  status: IncidentStatus
  refs: { collection: string; id: ID }[]
  resolvedAt?: ISODateTime
  resolvedBy?: string
  outcomeNote?: string
}

export interface Playbook {
  id: ID
  name: string
  watches: string
  fix: string
  /** `auto` runs without a person; `approval` waits for an admin. Promotion is a human decision. */
  mode: 'auto' | 'approval'
  runs: number
  approvals: number
  rejections: number
  /** Set by the learning loop once enough clean approvals accumulate; an admin still has to accept it. */
  promotionSuggested: boolean
  lastRunAt?: ISODateTime
}

export interface CopilotTurn {
  id: ID
  userId: ID
  orgId?: ID
  portal: Portal
  at: ISODateTime
  question: string
  answered: boolean
  intent?: string
  rating?: 'up' | 'down'
  /** Reviewer's status for unanswered or down-voted turns. */
  review: 'none' | 'queued' | 'taught' | 'dismissed'
}

/** An answer a human admin taught the assistant after a gap. */
export interface KbEntry {
  id: ID
  keywords: string[]
  question: string
  answer: string
  citation?: string
  sourceUrl?: string
  portal: Portal | 'both'
  taughtBy: string
  taughtAt: ISODateTime
  fromTurnId?: ID
}

export interface AuditEntry {
  id: ID
  at: ISODateTime
  actor: string
  action: string
  target: string
  orgId?: ID
  detail?: string
}

export interface MigrationBatch {
  id: ID
  name: string
  createdAt: ISODateTime
  rows: number
  imported: number
  invitesSent: number
  invitesAccepted: number
  status: 'draft' | 'validated' | 'imported' | 'invited'
  issues: { row: number; field: string; problem: string }[]
}

/* ───────────────────────────────── session ──────────────────────────────── */

export interface Session {
  userId: ID
  orgId?: ID
  portal: Portal
  /** Set while a platform admin is viewing an organisation as its owner. */
  impersonatedBy?: ID
  demoBanner: boolean
}
