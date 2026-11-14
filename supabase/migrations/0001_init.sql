-- Loop & Pool: the production schema.
--
-- The prototype keeps everything in one browser store (src/data/store.ts).
-- This is the same shape as tables, with the rule that makes it multi-tenant
-- written where it cannot be forgotten: every landlord-owned row carries
-- org_id, and Row-Level Security decides who may see it. A screen never
-- filters by organisation itself.
--
-- Status: written to mirror src/domain/types.ts. It has not been applied to a
-- live database yet; treat the first `supabase db push` as the test.

create extension if not exists pgcrypto;

/* ─────────────────────────────── who is who ─────────────────────────────── */

create type plan_tier as enum ('ledger_free', 'autopilot_pro', 'portfolio_trust');
create type org_status as enum ('active', 'trialing', 'past_due', 'suspended', 'churned');
create type org_role as enum ('owner', 'co_owner', 'accountant', 'agent');
create type jurisdiction as enum ('NZ', 'AU-NSW', 'AU-VIC', 'AU-QLD', 'AU-WA', 'AU-SA');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  identity_verified boolean not null default false,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'landlord' check (kind in ('landlord', 'partner_agency')),
  plan plan_tier not null default 'ledger_free',
  status org_status not null default 'trialing',
  jurisdiction jurisdiction not null default 'NZ',
  source text,
  notes text,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references orgs on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role org_role not null,
  primary key (org_id, user_id)
);

-- The three questions every policy asks. SECURITY DEFINER so a policy on
-- org_members does not have to read org_members through itself.
create function is_platform_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select coalesce((select is_platform_admin from profiles where id = auth.uid()), false) $$;

create function is_org_member(target uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from org_members where org_id = target and user_id = auth.uid()) $$;

-- An accountant's seat reads everything and changes nothing.
create function can_write_org(target uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from org_members where org_id = target and user_id = auth.uid() and role <> 'accountant') $$;

/* ─────────────────────────── homes and tenancies ────────────────────────── */

create table entities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  name text not null,
  type text not null check (type in ('individual', 'partnership', 'family_trust', 'ltc_company')),
  tax_id_masked text,
  gst_registered boolean not null default false,
  dual_approval_threshold numeric(12, 2)
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  entity_id uuid references entities,
  jurisdiction jurisdiction not null,
  address jsonb not null,             -- { line1, suburb, city, postcode }
  geo jsonb,
  facts jsonb not null default '{}',  -- beds, baths, floor area, year built, title type
  healthy_homes jsonb not null default '{}',
  insurance jsonb not null default '{}',
  sinking_fund jsonb not null default '{"ratePct":0,"balance":0,"autoApproveLimit":0}',
  assets jsonb not null default '[]',
  listing jsonb,                      -- one advertised rent; see check below
  created_at timestamptz not null default now(),
  -- Rent bidding is banned: a listing has exactly one positive advertised figure.
  constraint listing_has_one_price check (listing is null or (listing ->> 'advertisedWeeklyRent')::numeric > 0)
);

create table tenancies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  status text not null check (status in ('draft', 'active', 'notice_given', 'ended')),
  type text not null check (type in ('periodic', 'fixed')),
  start_date date not null,
  end_date date,
  weekly_rent numeric(10, 2) not null check (weekly_rent > 0),
  cadence text not null default 'weekly' check (cadence in ('weekly', 'fortnightly')),
  rent_due_weekday smallint not null check (rent_due_weekday between 0 and 6),
  rent_paid_to date not null,
  last_rent_increase date,
  bond jsonb not null default '{"amount":0,"petBond":0}',
  pets jsonb not null default '[]',
  notice_given jsonb,
  agreement_signed_on date,
  constraint fixed_term_has_end check (type = 'periodic' or end_date is not null)
);

create table tenancy_tenants (
  tenancy_id uuid not null references tenancies on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (tenancy_id, user_id)
);

create function is_tenant_of(target uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from tenancy_tenants where tenancy_id = target and user_id = auth.uid()) $$;

/* ───────────────────────────────── money ────────────────────────────────── */

-- The platform never holds rent. These rows describe money that moved between
-- two other people's bank accounts.
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  tenancy_id uuid references tenancies on delete set null,
  date date not null,
  kind text not null,
  amount numeric(12, 2) not null,
  category text not null,
  description text not null,
  bank_ref text,
  match text not null default 'none' check (match in ('auto', 'manual', 'unmatched', 'none')),
  due_date date,
  ticket_id uuid
);
create index on ledger_entries (org_id, date desc);

create table bank_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  date date not null,
  amount numeric(12, 2) not null,
  reference text not null,
  payer text not null,
  status text not null check (status in ('matched', 'suggested', 'unmatched', 'ignored')),
  suggested_tenancy_id uuid references tenancies on delete set null,
  confidence numeric(4, 3),
  ledger_id uuid references ledger_entries on delete set null
);

create table arrears_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  tenancy_id uuid not null references tenancies on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  note text not null
);

/* ──────────────────────── repairs, inspections, field ───────────────────── */

create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('trade', 'inspector', 'agent')),
  trade text not null,
  region text not null,
  vetting text not null default 'pending' check (vetting in ('vetted', 'pending', 'suspended')),
  checks jsonb not null default '{"identity":false,"insurance":false,"licence":false,"policeVet":false}',
  rates jsonb not null default '{}'
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  tenancy_id uuid references tenancies on delete set null,
  reported_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  title text not null,
  description text not null,
  category text not null,
  room text,
  triage jsonb not null,
  status text not null,
  mode text not null check (mode in ('auto_dispatch', 'quote_first')),
  provider_id uuid references providers,
  quote jsonb,
  scheduled_for timestamptz,
  entry_notice_served_at timestamptz,
  key_code jsonb,
  invoice jsonb,
  tenant_response jsonb,
  paid_from text check (paid_from in ('sinking_fund', 'owner', 'tenant')),
  events jsonb not null default '[]'
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  tenancy_id uuid references tenancies on delete set null,
  type text not null check (type in ('entry', 'routine', 'exit')),
  status text not null,
  mode text not null check (mode in ('diy', 'delegated')),
  provider_id uuid references providers,
  scheduled_for timestamptz,
  notice_served_at timestamptz,
  completed_at timestamptz,
  rooms jsonb not null default '[]',
  overall_score numeric(3, 1),
  summary text
);

create table field_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  type text not null,
  price numeric(10, 2) not null,
  platform_fee numeric(10, 2) not null,
  status text not null,
  provider_id uuid references providers,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz,
  completed_at timestamptz,
  note text
);

/* ───────────────────────── agreements and paperwork ─────────────────────── */

create table variations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  tenancy_id uuid not null references tenancies on delete cascade,
  type text not null,
  status text not null,
  requested_by text not null check (requested_by in ('tenant', 'landlord')),
  requested_at timestamptz not null default now(),
  respond_by date,
  summary text not null,
  detail jsonb not null default '{}',
  conditions jsonb not null default '[]',
  decline_ground text,
  signatures jsonb not null default '[]'
);

-- A notice is a record of what was said and when the law treats it as heard.
-- It is never edited after it is served: there is no update policy below.
create table notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  tenancy_id uuid not null references tenancies on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  served_on date not null,
  method text not null check (method in ('email', 'hand', 'letterbox', 'post')),
  deemed_received_on date not null,
  effective_on date not null,
  status text not null default 'served' check (status in ('draft', 'served', 'acknowledged', 'withdrawn')),
  title text not null,
  body text not null,
  rules_used text[] not null default '{}',
  pack_version text not null
);

create table docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  tenancy_id uuid references tenancies on delete set null,
  name text not null,
  kind text not null,
  storage_path text,
  added_at timestamptz not null default now(),
  source text not null check (source in ('uploaded', 'generated', 'imported'))
);

/* ─────────────────────────────── renters ────────────────────────────────── */

create table renter_profiles (
  user_id uuid primary key references profiles on delete cascade,
  headline text,
  bio text,
  household_size smallint,
  has_pets boolean not null default false,
  history jsonb not null default '[]',      -- verified facts only, never opinions
  refs jsonb not null default '[]',
  visible_to_landlords boolean not null default false
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  property_id uuid not null references properties on delete cascade,
  applicant_id uuid not null references profiles on delete cascade,
  stage text not null,
  submitted_at timestamptz not null default now(),
  -- There is no "offer" a renter can raise. The rent is the advertised rent.
  offered_weekly_rent numeric(10, 2) not null,
  move_in date,
  occupants smallint not null default 0,
  message text not null default '',
  viewing_at timestamptz,
  decided_at timestamptz,
  purge_on date,
  purged boolean not null default false
);

-- An application can never be made above the advertised rent.
create function application_at_advertised_rent() returns trigger language plpgsql as $$
begin
  if new.offered_weekly_rent > (select (listing ->> 'advertisedWeeklyRent')::numeric from properties where id = new.property_id) then
    raise exception 'An application cannot be above the advertised rent.';
  end if;
  return new;
end $$;
create trigger applications_no_bidding before insert or update of offered_weekly_rent on applications
  for each row execute function application_at_advertised_rent();

/* ───────────────────────────── the platform ─────────────────────────────── */

create table rule_sources (id text primary key, name text not null, url text not null, jurisdiction text not null, signal text not null, priority smallint not null, state jsonb not null default '{}');
create table rule_changes (id text primary key, jurisdiction jurisdiction not null, source_id text references rule_sources, detected_at timestamptz not null, title text not null, summary text not null, evidence_quote text not null, evidence_url text not null, patches jsonb not null default '[]', confidence text not null, impact text not null, status text not null, reviews jsonb not null default '[]', published_in_version text);
-- A published pack version is immutable: rolling back publishes another one.
create table pack_versions (id uuid primary key default gen_random_uuid(), jurisdiction jurisdiction not null, version text not null, published_at timestamptz not null default now(), published_by uuid not null references profiles, note text not null, overrides jsonb not null, change_ids text[] not null default '{}', unique (jurisdiction, version));
create table playbooks (id text primary key, name text not null, mode text not null check (mode in ('auto', 'approval')), stats jsonb not null default '{}');
create table incidents (id uuid primary key default gen_random_uuid(), org_id uuid references orgs on delete cascade, playbook_id text references playbooks, detected_at timestamptz not null default now(), status text not null, detail jsonb not null, resolved_by uuid references profiles, resolved_at timestamptz);
create table kb_entries (id uuid primary key default gen_random_uuid(), question text not null, answer text not null, sources jsonb not null default '[]', taught_by uuid references profiles, taught_at timestamptz not null default now());
create table copilot_turns (id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete set null, portal text not null, question text not null, answered boolean not null, helpful boolean, at timestamptz not null default now());
create table feedback (id uuid primary key default gen_random_uuid(), org_id uuid references orgs on delete set null, user_id uuid not null references profiles on delete cascade, portal text not null, screen text not null, kind text not null, body text not null, status text not null default 'new', reply text, created_at timestamptz not null default now());
create table admin_tasks (id uuid primary key default gen_random_uuid(), kind text not null, priority smallint not null, org_id uuid references orgs on delete cascade, title text not null, detail jsonb not null default '{}', status text not null default 'open', assigned_to uuid references profiles, created_at timestamptz not null default now());
create table autopilot_log (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs on delete cascade, at timestamptz not null default now(), kind text not null, body text not null);

-- Append-only. Nobody, platform admin included, has an update or delete policy.
create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references profiles on delete set null,
  on_behalf_of uuid references orgs on delete set null,
  action text not null,
  subject text not null,
  detail jsonb not null default '{}'
);

/* ─────────────────────────── row-level security ─────────────────────────── */

alter table profiles enable row level security;
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table tenancy_tenants enable row level security;
alter table renter_profiles enable row level security;
alter table applications enable row level security;
alter table providers enable row level security;
alter table notices enable row level security;
alter table audit_log enable row level security;
alter table pack_versions enable row level security;
alter table feedback enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_platform_admin());
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_platform_admin = (select p.is_platform_admin from profiles p where p.id = auth.uid()));

create policy "members see their org" on orgs for select using (is_org_member(id) or is_platform_admin());
create policy "owners change their org" on orgs for update using (can_write_org(id)) with check (can_write_org(id));
create policy "platform runs orgs" on orgs for all using (is_platform_admin()) with check (is_platform_admin());

create policy "members see the team" on org_members for select using (is_org_member(org_id) or is_platform_admin());
create policy "tenants see their link" on tenancy_tenants for select using (user_id = auth.uid() or is_platform_admin() or exists (select 1 from tenancies t where t.id = tenancy_id and is_org_member(t.org_id)));

-- Every landlord-owned table gets the same pair: members read, writers write.
do $$
declare t text;
begin
  foreach t in array array['entities', 'properties', 'tenancies', 'ledger_entries', 'bank_lines', 'arrears_events', 'tickets', 'inspections', 'field_tasks', 'variations', 'docs', 'autopilot_log', 'incidents']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "org reads" on %I for select using (is_org_member(org_id) or is_platform_admin())', t);
    execute format('create policy "org writes" on %I for all using (can_write_org(org_id)) with check (can_write_org(org_id))', t);
  end loop;
end $$;

-- A tenant sees their own tenancy, and the repairs, changes and notices that belong to it. Nothing about money owed to anyone else.
create policy "tenant reads tenancy" on tenancies for select using (is_tenant_of(id));
create policy "tenant reads repairs" on tickets for select using (tenancy_id is not null and is_tenant_of(tenancy_id));
create policy "tenant reports repairs" on tickets for insert with check (tenancy_id is not null and is_tenant_of(tenancy_id) and reported_by = auth.uid());
create policy "tenant reads changes" on variations for select using (is_tenant_of(tenancy_id));
create policy "tenant asks for changes" on variations for insert with check (is_tenant_of(tenancy_id) and requested_by = 'tenant');

-- Notices: readable by both sides, insertable by the landlord, never updated.
create policy "notice readers" on notices for select using (is_org_member(org_id) or is_tenant_of(tenancy_id) or is_platform_admin());
create policy "landlord serves" on notices for insert with check (can_write_org(org_id));

-- Renters own their profile. A landlord sees it only for a preferred applicant who has chosen to share it.
create policy "renter owns profile" on renter_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "landlord reads shared profile" on renter_profiles for select using (
  visible_to_landlords and exists (
    select 1 from applications a
    where a.applicant_id = renter_profiles.user_id and a.stage in ('preferred', 'checks', 'approved') and is_org_member(a.org_id)
  )
);

create policy "applicant sees own" on applications for select using (applicant_id = auth.uid());
create policy "applicant applies" on applications for insert with check (applicant_id = auth.uid());
create policy "applicant withdraws" on applications for update using (applicant_id = auth.uid()) with check (applicant_id = auth.uid());
-- Once purged, an application is no longer visible to the landlord at all.
create policy "landlord sees applicants" on applications for select using (is_org_member(org_id) and not purged);
create policy "landlord decides" on applications for update using (can_write_org(org_id) and not purged) with check (can_write_org(org_id));

create policy "anyone signed in sees vetted providers" on providers for select using (auth.uid() is not null and (vetting = 'vetted' or is_platform_admin()));
create policy "platform vets providers" on providers for all using (is_platform_admin()) with check (is_platform_admin());

create policy "everyone reads published packs" on pack_versions for select using (true);
create policy "platform publishes packs" on pack_versions for insert with check (is_platform_admin() and published_by = auth.uid());

create policy "own feedback" on feedback for select using (user_id = auth.uid() or is_platform_admin());
create policy "send feedback" on feedback for insert with check (user_id = auth.uid());
create policy "platform answers feedback" on feedback for update using (is_platform_admin()) with check (is_platform_admin());

create policy "audit is written by whoever acts" on audit_log for insert with check (actor = auth.uid());
create policy "audit readers" on audit_log for select using (is_platform_admin() or (on_behalf_of is not null and is_org_member(on_behalf_of)));

-- Platform-only tables: no policy for anyone else means no access for anyone else.
do $$
declare t text;
begin
  foreach t in array array['rule_sources', 'rule_changes', 'playbooks', 'kb_entries', 'copilot_turns', 'admin_tasks']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "platform only" on %I for all using (is_platform_admin()) with check (is_platform_admin())', t);
  end loop;
end $$;

/* ─────────────────────── deleting what must not be kept ─────────────────── */

-- Run daily (pg_cron). An unsuccessful applicant's details are removed on the
-- date set when they were declined; the row stays so the count is honest.
create function purge_applicants() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update applications set message = '', viewing_at = null, purged = true
   where purge_on is not null and purge_on <= current_date and not purged;
  get diagnostics n = row_count;
  return n;
end $$;
