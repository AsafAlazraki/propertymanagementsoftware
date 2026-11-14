/**
 * The shape of the whole dataset. In the prototype it is one persisted object;
 * in production each key is a table (see supabase/migrations/0001_schema.sql).
 */
import type {
  AdminTask,
  Application,
  ArrearsEvent,
  AuditEntry,
  BankLine,
  CopilotTurn,
  Doc,
  Feedback,
  FieldTask,
  ID,
  Incident,
  Inspection,
  ISODate,
  ISODateTime,
  KbEntry,
  KeyEvent,
  LedgerEntry,
  LegalEntity,
  MigrationBatch,
  Notice,
  Org,
  Playbook,
  Property,
  Provider,
  RenterProfile,
  RuleChange,
  RulePackVersion,
  RuleSource,
  Tenancy,
  Ticket,
  User,
  Variation,
} from './types'

export interface AutopilotEntry {
  id: ID
  orgId: ID
  at: ISODateTime
  kind: 'rent' | 'reminder' | 'dispatch' | 'quote' | 'deadline' | 'sinking' | 'compliance' | 'listing' | 'inspection'
  text: string
}

export interface Db {
  seedVersion: number
  seededOn: ISODate
  /** The last calendar day the simulated bank feed was rolled up to. */
  simulatedThrough: ISODate
  orgs: Org[]
  entities: LegalEntity[]
  users: User[]
  properties: Property[]
  tenancies: Tenancy[]
  ledger: LedgerEntry[]
  bankLines: BankLine[]
  arrearsEvents: ArrearsEvent[]
  tickets: Ticket[]
  providers: Provider[]
  inspections: Inspection[]
  fieldTasks: FieldTask[]
  keyEvents: KeyEvent[]
  variations: Variation[]
  notices: Notice[]
  docs: Doc[]
  renterProfiles: (RenterProfile & { id: ID })[]
  applications: Application[]
  feedback: Feedback[]
  adminTasks: AdminTask[]
  ruleSources: RuleSource[]
  ruleChanges: RuleChange[]
  packVersions: RulePackVersion[]
  incidents: Incident[]
  playbooks: Playbook[]
  copilotTurns: CopilotTurn[]
  kb: KbEntry[]
  audit: AuditEntry[]
  migrations: MigrationBatch[]
  /** What autopilot did without being asked — the feed on the command centre. */
  autopilotLog: AutopilotEntry[]
  /** Action-queue items the landlord has snoozed, by stable action id. */
  dismissedActions: string[]
}
