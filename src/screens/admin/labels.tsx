/** Every state the console shows, as the word and the icon that go with it. One place, so a state reads the same on every screen. */
import {
  ArrowsClockwise,
  Bug,
  CaretDoubleUp,
  CaretUp,
  ChatCircleDots,
  CheckCircle,
  CircleDashed,
  ClockCountdown,
  CreditCard,
  Eye,
  FirstAid,
  Flask,
  HandHeart,
  Heart,
  HourglassMedium,
  IdentificationCard,
  Lightbulb,
  MegaphoneSimple,
  Minus,
  MinusCircle,
  PauseCircle,
  Phone,
  Prohibit,
  Question,
  Robot,
  Scales,
  SealCheck,
  SealWarning,
  ShieldCheck,
  SmileyMeh,
  SmileySad,
  Smiley,
  Sparkle,
  UserCircleDashed,
  Warning,
  WarningCircle,
  WarningOctagon,
  Wrench,
  XCircle,
} from '@phosphor-icons/react'
import type { AdminTask, AdminTaskKind, Feedback, Incident, JurisdictionCode, OrgSource, OrgStatus, Playbook, Provider, RuleChange, User } from '@/domain/types'
import type { Verification } from '@/domain/jurisdictions/types'
import type { GuardrailStatus, SourceState } from '@/domain/regwatch'
import type { Icon, Tone } from './kit'

export interface Lamp {
  label: string
  tone: Tone
  icon: Icon
}

export const ORG_STATUS: Record<OrgStatus, Lamp> = {
  active: { label: 'Active', tone: 'ok', icon: CheckCircle },
  trialing: { label: 'On trial', tone: 'info', icon: Flask },
  past_due: { label: 'Past due', tone: 'warn', icon: CreditCard },
  suspended: { label: 'Suspended', tone: 'danger', icon: Prohibit },
  churned: { label: 'Left', tone: 'neutral', icon: MinusCircle },
}
export const ORG_STATUS_ORDER: OrgStatus[] = ['active', 'trialing', 'past_due', 'suspended', 'churned']

export const ORG_SOURCE: Record<OrgSource, string> = {
  founding_migration: 'Founding migration',
  organic: 'Organic',
  referral: 'Referral',
  investor_association: 'Investors’ association',
}

export const USER_STATUS: Record<User['status'], Lamp> = {
  active: { label: 'Active', tone: 'ok', icon: CheckCircle },
  invited: { label: 'Invited', tone: 'info', icon: HourglassMedium },
  deactivated: { label: 'Deactivated', tone: 'neutral', icon: MinusCircle },
}

export const IDENTITY: Record<'yes' | 'no', Lamp> = {
  yes: { label: 'Verified', tone: 'ok', icon: SealCheck },
  no: { label: 'Not verified', tone: 'warn', icon: UserCircleDashed },
}

export const TASK_KIND: Record<AdminTaskKind, { label: string; icon: Icon }> = {
  concierge_call: { label: 'Concierge call', icon: Phone },
  identity_review: { label: 'Identity review', icon: IdentificationCard },
  provider_vetting: { label: 'Provider vetting', icon: ShieldCheck },
  maintenance_dispute: { label: 'Repair dispute', icon: Wrench },
  rule_change_review: { label: 'Law change', icon: Scales },
  healing_approval: { label: 'Fix to approve', icon: FirstAid },
  copilot_gap: { label: 'Assistant gap', icon: Robot },
  feedback_followup: { label: 'Follow-up', icon: ChatCircleDots },
  billing_issue: { label: 'Billing', icon: CreditCard },
}
export const TASK_KINDS = Object.keys(TASK_KIND) as AdminTaskKind[]

export const PRIORITY: Record<AdminTask['priority'], Lamp & { word: string }> = {
  p1: { label: 'P1', word: 'Today', tone: 'danger', icon: CaretDoubleUp },
  p2: { label: 'P2', word: 'This week', tone: 'warn', icon: CaretUp },
  p3: { label: 'P3', word: 'When there is time', tone: 'neutral', icon: Minus },
}

export const TASK_STATUS: Record<AdminTask['status'], Lamp> = {
  open: { label: 'Open', tone: 'info', icon: CircleDashed },
  in_progress: { label: 'In progress', tone: 'accent', icon: ArrowsClockwise },
  done: { label: 'Done', tone: 'ok', icon: CheckCircle },
  dismissed: { label: 'Dismissed', tone: 'neutral', icon: MinusCircle },
}

export const FEEDBACK_KIND: Record<Feedback['kind'], { label: string; icon: Icon }> = {
  bug: { label: 'Bug', icon: Bug },
  idea: { label: 'Idea', icon: Lightbulb },
  praise: { label: 'Praise', icon: Heart },
  question: { label: 'Question', icon: Question },
  complaint: { label: 'Complaint', icon: MegaphoneSimple },
}

export const SENTIMENT: Record<Feedback['sentiment'], Lamp> = {
  positive: { label: 'Positive', tone: 'ok', icon: Smiley },
  neutral: { label: 'Neutral', tone: 'neutral', icon: SmileyMeh },
  negative: { label: 'Negative', tone: 'danger', icon: SmileySad },
}

export const FEEDBACK_STATUS: Record<Feedback['status'], Lamp> = {
  new: { label: 'New', tone: 'accent', icon: Sparkle },
  triaged: { label: 'Triaged', tone: 'info', icon: Eye },
  planned: { label: 'Planned', tone: 'warn', icon: ClockCountdown },
  shipped: { label: 'Shipped', tone: 'ok', icon: CheckCircle },
  declined: { label: 'Declined', tone: 'neutral', icon: MinusCircle },
}
export const FEEDBACK_FLOW: Feedback['status'][] = ['new', 'triaged', 'planned', 'shipped']

export const CHANGE_STATUS: Record<RuleChange['status'], Lamp> = {
  pending_review: { label: 'Awaiting review', tone: 'warn', icon: HourglassMedium },
  needs_second_review: { label: 'Needs a second reviewer', tone: 'warn', icon: HourglassMedium },
  approved: { label: 'Approved, not published', tone: 'info', icon: SealCheck },
  published: { label: 'Published', tone: 'ok', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'neutral', icon: XCircle },
  no_action: { label: 'No action needed', tone: 'neutral', icon: MinusCircle },
}

export const IMPACT: Record<RuleChange['impact'], Lamp> = {
  high: { label: 'High impact', tone: 'danger', icon: WarningOctagon },
  medium: { label: 'Medium impact', tone: 'warn', icon: WarningCircle },
  low: { label: 'Low impact', tone: 'neutral', icon: Minus },
}

export const CONFIDENCE: Record<RuleChange['confidence'], string> = {
  high: 'Strong evidence',
  medium: 'Primary source only',
  low: 'Thin evidence',
}

export const GUARDRAIL: Record<GuardrailStatus, Lamp> = {
  pass: { label: 'Met', tone: 'ok', icon: CheckCircle },
  warn: { label: 'Check', tone: 'warn', icon: Warning },
  fail: { label: 'Not met', tone: 'danger', icon: XCircle },
  na: { label: 'Does not apply', tone: 'neutral', icon: Minus },
}

export const SOURCE_STATE: Record<SourceState, Lamp> = {
  ok: { label: 'Read, no change', tone: 'ok', icon: CheckCircle },
  changed: { label: 'Changed', tone: 'accent', icon: Sparkle },
  stale: { label: 'Stale', tone: 'warn', icon: ClockCountdown },
  unreachable: { label: 'Unreachable', tone: 'danger', icon: XCircle },
  never_checked: { label: 'Never read', tone: 'neutral', icon: CircleDashed },
}

export const VERIFIED: Record<Verification, Lamp> = {
  primary: { label: 'Read at source', tone: 'ok', icon: SealCheck },
  secondary: { label: 'Official guidance', tone: 'info', icon: SealCheck },
  unverified: { label: 'Not verified', tone: 'warn', icon: SealWarning },
}

export const INCIDENT_STATUS: Record<Incident['status'], Lamp> = {
  detected: { label: 'Detected', tone: 'info', icon: CircleDashed },
  auto_healed: { label: 'Fixed automatically', tone: 'ok', icon: FirstAid },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warn', icon: HourglassMedium },
  approved: { label: 'Approved and applied', tone: 'ok', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'neutral', icon: XCircle },
  monitoring: { label: 'Monitoring', tone: 'info', icon: Eye },
}

export const SEVERITY: Record<Incident['severity'], Lamp> = {
  high: { label: 'High', tone: 'danger', icon: WarningOctagon },
  medium: { label: 'Medium', tone: 'warn', icon: WarningCircle },
  low: { label: 'Low', tone: 'neutral', icon: Minus },
}

export const PLAYBOOK_MODE: Record<Playbook['mode'], Lamp> = {
  auto: { label: 'Automatic', tone: 'accent', icon: ArrowsClockwise },
  approval: { label: 'Needs approval', tone: 'neutral', icon: HandHeart },
}

export const VETTING: Record<Provider['vetting'], Lamp> = {
  vetted: { label: 'Vetted', tone: 'ok', icon: ShieldCheck },
  pending: { label: 'Vetting in progress', tone: 'warn', icon: HourglassMedium },
  suspended: { label: 'Suspended', tone: 'danger', icon: PauseCircle },
}

export const JURISDICTION_NAME: Record<JurisdictionCode, string> = {
  NZ: 'New Zealand',
  'AU-NSW': 'New South Wales',
  'AU-VIC': 'Victoria',
  'AU-QLD': 'Queensland',
  'AU-WA': 'Western Australia',
  'AU-SA': 'South Australia',
}
