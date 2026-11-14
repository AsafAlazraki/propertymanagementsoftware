/**
 * The platform's own records: what the people who run Loop & Pool see in the
 * admin console. Feedback, the action queue, the legal sources being watched,
 * detected law changes, self-healing playbooks, and the assistant's gaps.
 *
 * Rows that describe a law change say where they came from. `origin: 'demo'`
 * marks a seeded record; anything the scheduled watcher finds arrives with
 * `origin: 'watcher'` from public/regwatch/feed.json.
 */
import type {
  AdminTask,
  AuditEntry,
  CopilotTurn,
  Feedback,
  ID,
  Incident,
  ISODate,
  ISODateTime,
  JurisdictionCode,
  KbEntry,
  MigrationBatch,
  Org,
  Playbook,
  Property,
  Provider,
  RuleChange,
  RulePackVersion,
  RuleSource,
  Tenancy,
  User,
} from '../types'
import type { Db } from '../db'
import type { prng } from './world'
import sources from '../../../regwatch/sources.json'

interface Ctx {
  day: ISODate
  D: (n: number) => ISODate
  T: (n: number, h?: number, m?: number) => ISODateTime
  orgs: Org[]
  users: User[]
  properties: Property[]
  tenancies: Tenancy[]
  providers: Provider[]
  rand: ReturnType<typeof prng>
}

type PlatformSlice = Pick<
  Db,
  'feedback' | 'adminTasks' | 'ruleSources' | 'ruleChanges' | 'packVersions' | 'incidents' | 'playbooks' | 'copilotTurns' | 'kb' | 'audit' | 'migrations'
>

interface SourceRow {
  id: string
  name: string
  url: string
  type: string
  jurisdiction: string
  signal: string
  fetchOk: boolean
  frequency: string
  priority: number
}

export function buildPlatform({ D, T, orgs, users, tenancies }: Ctx): PlatformSlice {
  const ownerOf = (orgId: ID) => orgs.find((o) => o.id === orgId)?.ownerUserId ?? 'u_hana'
  const tenantIn = (orgId: ID) => tenancies.find((t) => t.orgId === orgId)?.tenantIds[0] ?? 'u_mia'

  /* ─────────────────────────────── feedback ─────────────────────────────── */

  let f = 0
  const fb = (
    userId: ID,
    portal: Feedback['portal'],
    screen: string,
    kind: Feedback['kind'],
    sentiment: Feedback['sentiment'],
    area: string,
    text: string,
    daysAgo: number,
    status: Feedback['status'] = 'new',
    votes = 0,
    extra: Partial<Feedback> = {},
  ): Feedback => ({
    id: `fb_${++f}`,
    userId,
    orgId: users.find((u) => u.id === userId)?.orgId,
    portal,
    screen,
    kind,
    text,
    sentiment,
    area,
    status,
    votes,
    createdAt: T(-daysAgo, 8 + (f % 11), (f * 13) % 60),
    ...extra,
  })

  const feedback: Feedback[] = [
    fb('u_hana', 'loop', 'Command centre', 'praise', 'positive', 'Action queue', 'The bond countdown saved me. I genuinely thought I had a month, not 23 working days.', 0, 'new', 6),
    fb(ownerOf('org_ropata'), 'loop', 'Money', 'idea', 'neutral', 'Bank feeds', 'Can I split one bank payment across two properties? My tenant in the front unit pays for both in one go.', 1, 'new', 4),
    fb('u_mia', 'pool', 'Repairs', 'praise', 'positive', 'Maintenance', 'Being able to see that the quote is with the landlord — instead of wondering if anyone read my message — is honestly the best bit.', 1, 'new', 9),
    fb(ownerOf('org_patel'), 'loop', 'Notices', 'question', 'neutral', 'Notices', 'If I email a rent increase notice at 5:30 pm does that count as today or tomorrow? The calculator says tomorrow but my old spreadsheet says today.', 2, 'triaged', 2, { adminReply: 'Tomorrow. Since March 2025 anything sent after 5 pm counts as received on the next working day (s 136(8)). The calculator shows this as its own step.' }),
    fb(tenantIn('org_tasman'), 'pool', 'Home', 'complaint', 'negative', 'Rent tracking', 'My rent shows as late but I paid on the due date. I think my bank sent it after midnight.', 2, 'new', 1),
    fb(ownerOf('org_chenli'), 'loop', 'Inspections', 'bug', 'negative', 'Inspection studio', 'Photos taken with no signal showed as "waiting" for ten minutes after I was back on wifi. They did upload eventually.', 3, 'planned', 5, { adminNote: 'Outbox only flushes on the online event; it should also flush when the app regains focus.' }),
    fb(ownerOf('org_mckenzie'), 'loop', 'Rulebook', 'praise', 'positive', 'Rulebook', 'I did not know I needed the tenant’s consent to show buyers through. I had always just given 48 hours. Thank you for the plain English.', 3, 'new', 11),
    fb('u_daniel', 'pool', 'Search', 'idea', 'neutral', 'Search', 'A filter for "bike storage" would be great. Also commute time to the hospital.', 4, 'triaged', 7),
    fb(ownerOf('org_tasman'), 'loop', 'Tax pack', 'idea', 'neutral', 'Tax', 'Our accountant wants the IR3R figures per owner, not per property — the LTC has two shareholders at 60/40.', 5, 'planned', 8),
    fb(ownerOf('org_fonoti'), 'loop', 'Onboarding', 'praise', 'positive', 'Onboarding', 'Uploaded my tenancy agreement and it pulled out the rent, the bond number and the dates. I checked them all and they were right.', 6, 'new', 3),
    fb('u_wiremu', 'pool', 'Home', 'complaint', 'negative', 'Reminders', 'I got a reminder text at 7 am on a day I was already going to pay. Could it wait until lunchtime?', 0, 'new', 2),
    fb(ownerOf('org_okafor'), 'loop', 'Pricing', 'question', 'neutral', 'Billing', 'On the free plan do I still get the legal date reminders, or only on Autopilot?', 7, 'triaged', 1, { adminReply: 'You get the reminders and the compliance checklist on Ledger Free. Generating the notices themselves is part of Autopilot Pro.' }),
    fb('u_aleks', 'pool', 'Passport', 'idea', 'neutral', 'Rent Passport', 'Let me add my rental history from before I joined, with the old landlord confirming it by email.', 8, 'shipped', 14, { adminReply: 'Shipped. Add a past tenancy from your Passport and we will email your old landlord a one-tap confirmation.' }),
    fb(ownerOf('org_brightwater'), 'loop', 'Billing', 'complaint', 'negative', 'Billing', 'My card expired and I only found out when the app went read-only. An email a week before would have helped.', 9, 'planned', 3),
    fb(tenantIn('org_chenli'), 'pool', 'Repairs', 'bug', 'negative', 'Maintenance', 'The self-help card for "no hot water" told me to check a switch I could not find. A photo of what a cylinder switch looks like would help.', 10, 'triaged', 6),
    fb(ownerOf('org_kowalczyk'), 'loop', 'Services', 'idea', 'positive', 'Field services', 'Would pay for a gardener visit between tenancies the same way I book an inspection.', 12, 'new', 4),
    fb('u_emma', 'pool', 'Applications', 'praise', 'positive', 'Applications', 'Applying without uploading three months of bank statements felt almost suspicious. Nice to be treated like an adult.', 2, 'new', 12),
    fb(ownerOf('org_hope'), 'loop', 'Billing', 'complaint', 'negative', 'Billing', 'Account suspended with no phone call. I have three tenancies in here.', 12, 'triaged', 0, { adminNote: 'Two billing emails bounced — the address on file is out of date. Call the mobile number.' }),
  ]

  /* ─────────────────────────── admin action queue ───────────────────────── */

  const adminTasks: AdminTask[] = [
    { id: 'at_drill', kind: 'rule_change_review', title: 'Review a detected law change: tenant notice period', detail: 'High-impact change to a termination rule. Needs two reviewers before it can be published.', refId: 'rc_drill', priority: 'p1', status: 'open', createdAt: T(0, 6, 30), dueAt: T(2, 17) },
    { id: 'at_hope', kind: 'billing_issue', title: 'Hope Street Trust is suspended and has not been called', detail: 'Three active tenancies are read-only. Both billing emails bounced; a mobile number is on file.', orgId: 'org_hope', priority: 'p1', status: 'open', createdAt: T(-12, 9), dueAt: T(0, 17) },
    { id: 'at_election', kind: 'rule_change_review', title: 'New Parliament: decide what to watch', detail: 'All bills lapsed at dissolution. Official results are due 27 November.', refId: 'rc_election', priority: 'p2', status: 'open', createdAt: T(-6, 9) },
    { id: 'at_oliver', kind: 'provider_vetting', title: 'Vet new inspector: Oliver Schmidt', detail: 'Identity and insurance received. Police vetting and referee check outstanding.', refId: 'pr_oliver', priority: 'p2', status: 'open', createdAt: T(-3, 11) },
    { id: 'at_glass', kind: 'provider_vetting', title: 'Vet new trade: Clearpane Glass', detail: 'Public liability certificate has not been uploaded.', refId: 'pr_glass', priority: 'p3', status: 'in_progress', createdAt: T(-6, 14), assignee: 'Mere Parata' },
    { id: 'at_chloe', kind: 'identity_review', title: 'Identity check needs a person: Chloe Martin', detail: 'Automatic match failed — the name on the licence is "Chloé". Photo and details otherwise agree.', refId: 'u_chloe', priority: 'p2', status: 'open', createdAt: T(0, 7) },
    { id: 'at_gap1', kind: 'copilot_gap', title: 'The assistant could not answer: "Can I charge for a lost garage remote?"', detail: 'Asked by a landlord. No verified rule matched, so it said so and sent it here.', refId: 'ct_9', priority: 'p3', status: 'open', createdAt: T(-1, 15) },
    { id: 'at_gap2', kind: 'copilot_gap', title: 'Marked unhelpful: "What happens to the bond if one flatmate leaves?"', detail: 'A tenant marked the answer unhelpful: it explained refunds, not a change of tenant.', refId: 'ct_11', priority: 'p3', status: 'open', createdAt: T(-2, 10) },
    { id: 'at_fb', kind: 'feedback_followup', title: 'Reply owed: rent shown as late after an on-time payment', detail: 'Bank posted after midnight. Decide whether to count bank posting date or payment initiation date.', refId: 'fb_5', priority: 'p2', status: 'open', createdAt: T(-2, 12) },
    { id: 'at_done1', kind: 'identity_review', title: 'Identity check: Lucy Fraser', detail: 'Passport and selfie matched on manual review.', refId: 'u_lucy', priority: 'p3', status: 'done', createdAt: T(-26, 9), resolution: 'Verified by Mere Parata.' },
  ]

  /* ────────────────────────────── Rulewatch ─────────────────────────────── */

  const ruleSources: RuleSource[] = (sources as SourceRow[]).map((s, i) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    type: s.type as RuleSource['type'],
    jurisdiction: s.jurisdiction as RuleSource['jurisdiction'],
    signal: s.signal as RuleSource['signal'],
    frequency: s.frequency as RuleSource['frequency'],
    priority: s.priority as RuleSource['priority'],
    lastCheckedAt: s.fetchOk ? T(s.frequency === 'daily' ? 0 : -(i % 5), 5, 30) : T(-(i % 5) - 1, 5, 30),
    lastChangedAt: undefined,
    health: s.fetchOk ? 'ok' : 'unreachable',
  }))

  const RTA = 'https://www.legislation.govt.nz/act/public/1986/120/en/latest/'
  const ruleChanges: RuleChange[] = [
    {
      id: 'rc_drill',
      jurisdiction: 'NZ',
      sourceId: 'nz-legislation-rta-1986-xml',
      detectedAt: T(0, 5, 31),
      title: 'Practice run: tenant notice period 21 → 28 days',
      summary:
        'This is a practice item, not a real change to the law. It exists so the team can rehearse the review path: read the evidence, approve it twice (termination rules need two reviewers), publish, and watch every notice calculator pick up the new value. Reject it to leave the live rule at 21 days.',
      evidenceQuote: '[Practice text] “…the tenant shall give the landlord at least 28 days’ notice of termination, in any case.”',
      evidenceUrl: `${RTA}#DLM95514`,
      patches: [{ ruleKey: 'termination.tenant_periodic_notice', from: { n: 21, unit: 'days' }, to: { n: 28, unit: 'days' }, effectiveFrom: D(30) }],
      confidence: 'medium',
      impact: 'high',
      status: 'pending_review',
      origin: 'demo',
      reviews: [],
    },
    {
      id: 'rc_election',
      jurisdiction: 'NZ',
      sourceId: 'nz-parliament-bills-rss',
      detectedAt: T(-6, 6, 2),
      title: 'Parliament dissolved: every tenancy bill has lapsed',
      summary:
        'A general election was held on 7 November 2026 and official results are due on 27 November. The two members’ bills that touched tenancy (a boarding-house landlord register, and curtains as a healthy homes requirement) lapsed and return only if the new House reinstates them. Nothing in the rule pack changes today. Termination rules have been reversed by each of the last two governments, so the notice periods stay on the daily watch list.',
      evidenceQuote: 'The Act’s page lists “Related Bill (0)” and “Amendment Papers (0)”.',
      evidenceUrl: RTA,
      patches: [],
      confidence: 'high',
      impact: 'medium',
      status: 'pending_review',
      origin: 'demo',
      reviews: [],
    },
    {
      id: 'rc_wa',
      jurisdiction: 'AU-WA',
      sourceId: 'au-wa-consumer-protection-renting',
      detectedAt: T(-9, 6, 4),
      title: 'Western Australia: end of no-grounds terminations announced',
      summary:
        'The WA Government announced on 4 May 2026 that it will remove without-grounds terminations. There is no Bill and no start date. The proposed patch below is what the preview pack would become; it should not be published until an Act passes and a commencement date is known.',
      evidenceQuote: 'Announcement of 4 May 2026 on the WA rent reforms page; no legislation introduced.',
      evidenceUrl: 'https://www.consumerprotection.wa.gov.au/wa-rent-reforms',
      patches: [{ ruleKey: 'termination.no_cause_allowed', from: true, to: false, effectiveFrom: '2027-07-01' }],
      confidence: 'low',
      impact: 'high',
      status: 'pending_review',
      origin: 'demo',
      reviews: [],
    },
    {
      id: 'rc_pets',
      jurisdiction: 'NZ',
      sourceId: 'nz-tenancy-services-law-changes',
      detectedAt: T(-360, 6),
      title: 'Pet consent rules and pet bonds commence',
      summary: 'From 1 December 2025 a landlord must answer a written pet request within 21 days and may refuse only on reasonable grounds; a pet bond of up to two weeks of rent is allowed on top of the general bond.',
      evidenceQuote: '“A landlord must not require the payment of a pet bond of an amount that is more than 2 weeks’ rent payable under the tenancy agreement.”',
      evidenceUrl: `${RTA}#LMS1561960`,
      patches: [
        { ruleKey: 'bond.pet_max_weeks', from: null, to: 2, effectiveFrom: '2025-12-01' },
        { ruleKey: 'pets.response_deadline', from: null, to: { n: 21, unit: 'days' }, effectiveFrom: '2025-12-01' },
      ],
      confidence: 'high',
      impact: 'high',
      status: 'published',
      origin: 'demo',
      reviews: [
        { by: 'Riley Chen', at: T(-358, 10), verdict: 'approve', note: 'Read against ss 18AA and 42E on legislation.govt.nz.' },
        { by: 'Mere Parata', at: T(-357, 9), verdict: 'approve' },
      ],
      publishedInVersion: '2025.12.0',
    },
    {
      id: 'rc_bondhub',
      jurisdiction: 'NZ',
      sourceId: 'nz-tenancy-services-news-rss',
      detectedAt: T(-140, 6),
      title: 'Bond Hub is now the only way to lodge, top up or refund a bond',
      summary: 'Tenancy Services stopped accepting paper bond forms on 29 June 2026. No statutory value changed — the 23-working-day deadline is the same — so there is no rule patch. In-app guidance and the bond hand-off were updated.',
      evidenceQuote: '“Paper forms are no longer accepted — all bond transactions must be done through Bond Hub or connected property management software.”',
      evidenceUrl: 'https://www.tenancy.govt.nz/about-tenancy-services/news/faster-simpler-bond-management-is-now-live/',
      patches: [],
      confidence: 'high',
      impact: 'low',
      status: 'no_action',
      origin: 'demo',
      reviews: [{ by: 'Riley Chen', at: T(-139, 11), verdict: 'no_action', note: 'Guidance text only.' }],
    },
    {
      id: 'rc_fee',
      jurisdiction: 'NZ',
      sourceId: 'nz-legislation-rt-fees-regs-1998-xml',
      detectedAt: T(-136, 6),
      title: 'Tenancy Tribunal application fee rises to $29',
      summary: 'The filing fee increased from $28 to $29 on 1 July 2026. The Tribunal pack and the assistant’s answers were updated; no calculator depends on it.',
      evidenceQuote: 'Residential Tenancies (Fees) Regulations 1998, regulation 2(1), as amended by SL 2026/119.',
      evidenceUrl: 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/1998/244/en/latest/',
      patches: [],
      confidence: 'high',
      impact: 'low',
      status: 'no_action',
      origin: 'demo',
      reviews: [{ by: 'Mere Parata', at: T(-135, 9), verdict: 'no_action' }],
    },
  ]

  const packVersions: RulePackVersion[] = [
    { id: 'pv_nz_2025_12', jurisdiction: 'NZ', version: '2025.12.0', publishedAt: T(-357, 9, 30), publishedBy: 'Mere Parata', note: 'Pet consent rules and pet bonds.', overrides: {}, changeIds: ['rc_pets'] },
    { id: 'pv_nz_2026_11', jurisdiction: 'NZ', version: '2026.11.0', publishedAt: T(-1, 16), publishedBy: 'Riley Chen', note: 'Full re-verification against the consolidated Act as at 1 December 2025: working-day definition, service of notices, penalties schedule.', overrides: {}, changeIds: [] },
  ]

  /* ─────────────────────────── self-healing engine ──────────────────────── */

  const playbooks: Playbook[] = [
    { id: 'pb_dupe_bank', name: 'Duplicate bank line', watches: 'The same payer, amount, reference and date arriving twice from a bank feed.', fix: 'Ignore the second line and note why. No ledger entry is touched.', mode: 'auto', runs: 41, approvals: 0, rejections: 0, promotionSuggested: false, lastRunAt: T(-2, 5) },
    { id: 'pb_privacy_purge', name: 'Applicant data past its purge date', watches: 'An unsuccessful application still holding personal details after its deletion date.', fix: 'Delete the message and contact details; keep an anonymous row for counts.', mode: 'auto', runs: 17, approvals: 0, rejections: 0, promotionSuggested: false, lastRunAt: T(-1, 5) },
    { id: 'pb_fuzzy_match', name: 'Confident rent match left unapplied', watches: 'A bank line matched to a tenancy at 90% confidence or better that nobody has confirmed.', fix: 'Apply the match and record it as automatic.', mode: 'approval', runs: 9, approvals: 7, rejections: 2, promotionSuggested: false, lastRunAt: T(-4, 5) },
    { id: 'pb_stale_listing', name: 'Listing still live on a let home', watches: 'A live listing on a property that has an active tenancy.', fix: 'Pause the listing on Pool and the syndicated sites, and tell the owner.', mode: 'approval', runs: 2, approvals: 2, rejections: 0, promotionSuggested: false, lastRunAt: T(-20, 5) },
    { id: 'pb_bond_ref', name: 'Bond marked lodged with no reference', watches: 'A tenancy whose bond has a lodged date but no Tenancy Services reference.', fix: 'Ask the owner for the reference; if none exists, reopen the lodgement countdown.', mode: 'approval', runs: 3, approvals: 3, rejections: 0, promotionSuggested: true, lastRunAt: T(-33, 5) },
    { id: 'pb_unvetted', name: 'Job assigned to an unvetted provider', watches: 'An open repair or field task assigned to a provider whose vetting is pending or suspended.', fix: 'Hold the job, offer it to the next vetted provider, and tell the owner.', mode: 'approval', runs: 1, approvals: 1, rejections: 0, promotionSuggested: false, lastRunAt: T(-50, 5) },
    { id: 'pb_stale_source', name: 'Legal source not checked', watches: 'A watched source that has not been read successfully for more than seven days.', fix: 'Retry, then raise it: rules that depend on the source are shown as "not recently verified".', mode: 'approval', runs: 6, approvals: 6, rejections: 0, promotionSuggested: false, lastRunAt: T(-3, 5) },
  ]

  const incidents: Incident[] = [
    { id: 'inc_h1', playbookId: 'pb_dupe_bank', orgId: 'org_tasman', detectedAt: T(-2, 5, 1), severity: 'low', title: 'Duplicate bank line ignored', signal: 'Two identical lines: $610.00, “RENT ORCHARD WAY”, same payer, same day.', diagnosis: 'The bank feed re-sent a transaction after a timeout.', proposedFix: 'Ignore the second line.', risk: 'safe', status: 'auto_healed', refs: [], resolvedAt: T(-2, 5, 1), resolvedBy: 'Playbook', outcomeNote: 'Second line ignored. Ledger unchanged; books still balance.' },
    { id: 'inc_h2', playbookId: 'pb_privacy_purge', orgId: 'org_ropata', detectedAt: T(-1, 5, 2), severity: 'medium', title: 'Unsuccessful applicant’s details deleted', signal: 'An application declined 31 days earlier still held a message and phone number.', diagnosis: 'The nightly purge was skipped during a deploy.', proposedFix: 'Delete the personal details.', risk: 'safe', status: 'auto_healed', refs: [], resolvedAt: T(-1, 5, 2), resolvedBy: 'Playbook', outcomeNote: 'Personal details removed one day late. Anonymous row kept for counts.' },
  ]

  /* ───────────────────────────── assistant review ───────────────────────── */

  let c = 0
  const turn = (userId: ID, portal: CopilotTurn['portal'], daysAgo: number, question: string, answered: boolean, intent?: string, rating?: CopilotTurn['rating'], review: CopilotTurn['review'] = 'none'): CopilotTurn => ({
    id: `ct_${++c}`,
    userId,
    orgId: users.find((u) => u.id === userId)?.orgId,
    portal,
    at: T(-daysAgo, 9 + (c % 9), (c * 17) % 60),
    question,
    answered,
    intent,
    rating,
    review,
  })
  const copilotTurns: CopilotTurn[] = [
    turn('u_hana', 'loop', 0, 'When can I next put the rent up at Tōtara Rise?', true, 'rent_increase', 'up'),
    turn(ownerOf('org_patel'), 'loop', 0, 'How much notice for an inspection?', true, 'inspection', 'up'),
    turn('u_mia', 'pool', 1, 'Can my landlord say no to a cat?', true, 'pets', 'up'),
    turn(ownerOf('org_chenli'), 'loop', 1, 'Tenant is three weeks behind, what now?', true, 'arrears', 'up'),
    turn(ownerOf('org_mckenzie'), 'loop', 2, 'Do I need permission to show buyers through?', true, 'viewings', 'up'),
    turn('u_aleks', 'pool', 2, 'What happens when my fixed term ends?', true, 'fixed_term'),
    turn(ownerOf('org_okafor'), 'loop', 3, 'Is mortgage interest deductible?', true, 'tax_interest', 'up'),
    turn(ownerOf('org_fonoti'), 'loop', 3, 'How long do I have to lodge a bond?', true, 'bond', 'up'),
    turn(ownerOf('org_ropata'), 'loop', 1, 'Can I charge for a lost garage remote?', false, undefined, undefined, 'queued'),
    turn(ownerOf('org_tasman'), 'loop', 4, 'Does a trust need its own IR3R per property?', false, undefined, undefined, 'queued'),
    turn(tenantIn('org_chenli'), 'pool', 2, 'What happens to the bond if one flatmate leaves?', true, 'bond', 'down', 'queued'),
    turn('u_wiremu', 'pool', 5, 'Can I be charged a late fee?', true, 'late_fee', 'up'),
    turn(ownerOf('org_kowalczyk'), 'loop', 6, 'Who pays for the water?', true, 'water', 'up', 'taught'),
  ]

  const kb: KbEntry[] = [
    {
      id: 'kb_water',
      keywords: ['water', 'water bill', 'water rates', 'water charges'],
      question: 'Who pays for the water?',
      answer: 'The tenant pays for water only where it is charged by how much is used and the home has its own meter. Fixed charges — and all water where there is no separate meter — are the landlord’s. Send the tenant a copy of the bill when you pass the charge on.',
      citation: 'RTA 1986, s 39',
      sourceUrl: `${RTA}#DLM95084`,
      portal: 'both',
      taughtBy: 'Mere Parata',
      taughtAt: T(-5, 14),
      fromTurnId: 'ct_13',
    },
    {
      id: 'kb_smoking',
      keywords: ['smoking', 'smoke', 'cigarettes', 'vaping', 'vape'],
      question: 'Can I ban smoking?',
      answer: 'The agreement can prohibit smoking tobacco indoors. It cannot ban smoking everywhere on the property unless that is consistent with the tenant’s other rights, and the rule does not cover vaping.',
      citation: 'RTA 1986, s 43AA',
      sourceUrl: 'https://www.tenancy.govt.nz/law-changes/',
      portal: 'both',
      taughtBy: 'Riley Chen',
      taughtAt: T(-30, 10),
    },
  ]

  /* ─────────────────────────────── audit trail ──────────────────────────── */

  let a = 0
  const log = (daysAgo: number, hour: number, actor: string, action: string, target: string, detail?: string, orgId?: ID): AuditEntry => ({ id: `aud_${++a}`, at: T(-daysAgo, hour, (a * 11) % 60), actor, action, target, detail, orgId })
  const audit: AuditEntry[] = [
    log(0, 7, 'Rulewatch', 'Detected change', 'Residential Tenancies Act 1986', 'Queued for review as rc_drill.'),
    log(0, 5, 'Rulewatch', 'Checked sources', '59 of 65 sources read', 'Six are unreachable from the scheduled runner.'),
    log(1, 16, 'Riley Chen', 'Published rule pack', 'NZ 2026.11.0', 'Full re-verification against the consolidated Act.'),
    log(1, 5, 'Playbook', 'Auto-healed', 'Applicant data past its purge date', 'One application.', 'org_ropata'),
    log(2, 14, 'Mere Parata', 'Taught the assistant', '“Who pays for the water?”', 'From a landlord’s unanswered question.'),
    log(2, 5, 'Playbook', 'Auto-healed', 'Duplicate bank line', 'One line ignored.', 'org_tasman'),
    log(3, 11, 'Mere Parata', 'Started vetting', 'Oliver Schmidt'),
    log(6, 10, 'Riley Chen', 'Viewed as owner', 'Chen & Li Partnership', 'Support request about an unmatched payment. Read-only.', 'org_chenli'),
    log(9, 9, 'Billing', 'Marked past due', 'Brightwater Investments', 'Card expired.', 'org_brightwater'),
    log(12, 9, 'Billing', 'Suspended', 'Hope Street Trust', 'Third failed charge.', 'org_hope'),
    log(20, 15, 'Riley Chen', 'Approved fix', 'Listing still live on a let home', 'Listing paused; owner notified.', 'org_mckenzie'),
    log(26, 9, 'Mere Parata', 'Verified identity', 'Lucy Fraser', 'Manual review.'),
    log(33, 10, 'Riley Chen', 'Approved fix', 'Bond marked lodged with no reference', 'Third clean approval — promotion to automatic suggested.', 'org_patel'),
  ]

  const migrations: MigrationBatch[] = [
    {
      id: 'mig_1',
      name: 'Blue Penguin rent roll — Nelson and Tasman',
      createdAt: T(-152, 10),
      rows: 64,
      imported: 61,
      invitesSent: 61,
      invitesAccepted: 38,
      status: 'invited',
      issues: [
        { row: 17, field: 'bond_reference', problem: 'Missing. Tenancy Services could not match the address.' },
        { row: 33, field: 'weekly_rent', problem: 'Reads "$560-$580". A rent must be one figure.' },
        { row: 52, field: 'tenant_email', problem: 'Not a valid email address.' },
      ],
    },
  ]

  return { feedback, adminTasks, ruleSources, ruleChanges, packVersions, incidents, playbooks, copilotTurns, kb, audit, migrations }
}

export type { JurisdictionCode }
