/**
 * People.
 *
 * What this screen does that no other does: it is the directory of every
 * person with an account, whichever side of a tenancy they are on. An
 * organisation is a customer; a person is someone who can sign in. The roles
 * down the side are the question people actually bring here — "show me the
 * renters", "who on the team has access" — so they are a rail of their own
 * rather than one more dropdown.
 */
import { useMemo, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { MagnifyingGlass, SealCheck, UserMinus, UserPlus, UsersThree } from '@phosphor-icons/react'
import type { Role, User } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { decideIdentity, setUserStatus } from '@/data/admin-mutations'
import { Page, roleLabel } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Avatar, Callout, Empty, Fact, Facts } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { DataTable, Filter, Head, SearchBox, Status, Tally, Toolbar, type Column } from './kit'
import { IDENTITY, USER_STATUS } from './labels'
import { daysSince, matches, whenExact, whenShort } from './format'
import { useLast } from './hooks'
import { GROUP_IDS, STATUSES, type GroupId, type PeopleSearch } from './search'

/** Roles gathered the way the team thinks about them. */
const GROUP: Record<GroupId, { label: string; roles: Role[] }> = {
  owners: { label: 'Owners and their advisers', roles: ['landlord', 'co_owner', 'advisor'] },
  renters: { label: 'Renters', roles: ['tenant', 'prospective_renter'] },
  providers: { label: 'Trades and field providers', roles: ['tradesperson', 'field_provider'] },
  team: { label: 'Platform team', roles: ['platform_admin'] },
}

const route = getRouteApi('/admin/people')

const inGroup = (u: User, id: GroupId) => GROUP[id].roles.includes(u.role)

export function PersonDetail({ user, orgName }: { user: User; orgName?: string }) {
  const me = useMe()
  const day = useToday()
  const tenancies = useStore((s) => s.db.tenancies)
  const properties = useStore((s) => s.db.properties)
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const homes = useMemo(
    () =>
      tenancies
        .filter((t) => t.tenantIds.includes(user.id) && (t.status === 'active' || t.status === 'notice_given'))
        .map((t) => properties.find((p) => p.id === t.propertyId)?.address)
        .filter((a) => a !== undefined),
    [tenancies, properties, user.id],
  )
  const id = IDENTITY[user.identityVerified ? 'yes' : 'no']
  const status = USER_STATUS[user.status]
  const idle = daysSince(user.lastActiveAt, day)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex items-center gap-3.5">
        <Avatar name={user.fullName} hue={user.hue} size={52} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{user.fullName}</p>
          <p className="truncate text-[13px] text-ink-2">{user.email}</p>
          {user.phone && <p className="num text-[13px] text-ink-3">{user.phone}</p>}
        </div>
      </div>

      <Facts>
        <Fact label="Role">{roleLabel(user.role)}</Fact>
        <Fact label="Organisation">
          {user.orgId && orgName ? (
            <Link to="/admin/orgs" search={{ org: user.orgId }} className="rounded-sm underline decoration-line-strong underline-offset-2">
              {orgName}
            </Link>
          ) : (
            <span className="font-normal text-ink-3">{user.role === 'platform_admin' ? 'Loop & Pool' : 'None: renters and providers stand on their own'}</span>
          )}
        </Fact>
        {homes.length > 0 && <Fact label={homes.length === 1 ? 'Rents' : 'Rents at'}>{homes.map((a) => `${a.line1}, ${a.suburb}`).join('; ')}</Fact>}
        <Fact label="Account">
          <Status tone={status.tone} icon={status.icon} strong>
            {status.label}
          </Status>
        </Fact>
        <Fact label="Identity">
          <Status tone={id.tone} icon={id.icon} strong>
            {id.label}
          </Status>
        </Fact>
        <Fact label="Joined">{fmtDate(dateOf(user.createdAt), { weekday: false, year: 'always' })}</Fact>
        <Fact label="Last active">
          <span title={whenExact(user.lastActiveAt)}>{idle === 0 ? 'Today' : idle === 1 ? 'Yesterday' : `${idle} days ago`}</span>
        </Fact>
      </Facts>

      <section>
        <h3 className="eyebrow mb-2">Identity</h3>
        {user.identityVerified ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[44ch] text-[13px] text-ink-2">Verified. Withdraw it only if the check turns out to have been wrong; they will be asked to verify again.</p>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => {
                decideIdentity(user.id, false, me.fullName, 'Verification withdrawn from the People screen.')
                toast('Verification withdrawn', { description: `${user.fullName} will be asked to verify again.` })
              }}
            >
              Withdraw verification
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <Callout tone="neutral">The prototype holds no identity documents, so there is nothing to compare here. Marking someone verified records that a person on the team did the check, and who.</Callout>
            <div>
              <Button
                intent="primary"
                icon={<SealCheck weight="fill" className="size-4" />}
                onClick={() => {
                  decideIdentity(user.id, true, me.fullName, 'Checked by hand from the People screen.')
                  toast.success(`${user.fullName} is verified`)
                }}
              >
                Mark identity verified
              </Button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="eyebrow mb-2">Access</h3>
        {refusal && <Refusal verdict={refusal} className="mb-3" />}
        {user.status === 'deactivated' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[44ch] text-[13px] text-ink-2">This account cannot sign in. Reactivating restores everything it could see before.</p>
            <Button
              intent="secondary"
              icon={<UserPlus className="size-4" />}
              onClick={() => {
                const v = setUserStatus(user.id, 'active', me)
                if (!v.ok) return setRefusal(v)
                toast.success(`${user.fullName} can sign in again`)
              }}
            >
              Reactivate
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[44ch] text-[13px] text-ink-2">Deactivating stops this person signing in. Their records, and anything they signed, stay exactly as they are.</p>
            <Button
              intent="dangerSoft"
              icon={<UserMinus className="size-4" />}
              onClick={() => {
                const v = setUserStatus(user.id, 'deactivated', me)
                if (!v.ok) return setRefusal(v)
                toast(`${user.fullName} is deactivated`)
              }}
            >
              Deactivate
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

export function People() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const day = useToday()
  const users = useStore((s) => s.db.users)
  const orgs = useStore((s) => s.db.orgs)
  const set = (patch: Partial<PeopleSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])

  const rows = useMemo(
    () =>
      users
        .filter((u) => search.group === undefined || inGroup(u, search.group))
        .filter((u) => search.status === undefined || u.status === search.status)
        .filter((u) => search.identity === undefined || u.identityVerified === (search.identity === 'verified'))
        .filter((u) => matches([u.fullName, u.email, u.phone, u.orgId ? orgName.get(u.orgId) : undefined], search.q ?? ''))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users, orgName, search.group, search.status, search.identity, search.q],
  )

  const open = users.find((u) => u.id === search.user)
  const shown = useLast(open)
  const filtered = search.group !== undefined || search.status !== undefined || search.identity !== undefined || Boolean(search.q)
  const clear = () => set({ q: undefined, group: undefined, status: undefined, identity: undefined })

  const columns: Column<User>[] = [
    {
      id: 'person',
      header: 'Person',
      primary: true,
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={u.fullName} hue={u.hue} size={26} />
          <span className="min-w-0">
            <span className={cn('block truncate font-medium', u.status === 'deactivated' ? 'text-ink-3 line-through decoration-line-strong' : 'text-ink')}>{u.fullName}</span>
            <span className="block truncate text-xs text-ink-3">{u.email}</span>
          </span>
        </span>
      ),
    },
    { id: 'role', header: 'Role', width: 'w-36', cell: (u) => <span className="block truncate text-ink-2">{roleLabel(u.role)}</span> },
    { id: 'org', header: 'Organisation', width: 'w-52', from: '2xl', cell: (u) => <span className="block truncate text-ink-2">{u.orgId ? orgName.get(u.orgId) ?? '–' : <span className="text-ink-3">–</span>}</span> },
    {
      id: 'identity',
      header: 'Identity',
      width: 'w-32',
      from: 'md',
      cell: (u) => {
        const lamp = IDENTITY[u.identityVerified ? 'yes' : 'no']
        return (
          <Status tone={lamp.tone} icon={lamp.icon} strong={!u.identityVerified}>
            {lamp.label}
          </Status>
        )
      },
    },
    {
      id: 'status',
      header: 'Account',
      width: 'w-[7.5rem]',
      cell: (u) => (
        <Status tone={USER_STATUS[u.status].tone} icon={USER_STATUS[u.status].icon} strong={u.status !== 'active'}>
          {USER_STATUS[u.status].label}
        </Status>
      ),
    },
    { id: 'seen', header: 'Last active', width: 'w-32', from: 'xl', cell: (u) => <span className="block truncate text-ink-2" title={whenExact(u.lastActiveAt)}>{whenShort(u.lastActiveAt, day)}</span> },
  ]

  return (
    <Page wide>
      <Head title="People" lede="Everyone who can sign in: owners and their advisers, renters, trades, and the team. Invented people, for the demo; the checks and the audit trail are real." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[13.5rem_minmax(0,1fr)] xl:gap-6">
        <nav aria-label="Roles" className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <ul className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 xl:mx-0 xl:grid xl:gap-0.5 xl:overflow-visible xl:px-0">
            {[{ id: undefined, label: 'Everyone', count: users.length }, ...GROUP_IDS.map((id) => ({ id, label: GROUP[id].label, count: users.filter((u) => inGroup(u, id)).length }))].map((g) => {
              const active = search.group === g.id
              return (
                <li key={g.id ?? 'all'} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ group: g.id })}
                    className={cn(
                      'flex h-8 w-full items-center justify-between gap-3 rounded-md px-2.5 text-[13px] whitespace-nowrap transition-colors coarse:h-10',
                      active ? 'bg-accent-soft font-medium text-accent-text' : 'bg-surface text-ink-2 shadow-card hoverable:hover:text-ink xl:bg-transparent xl:shadow-none xl:hoverable:hover:bg-sunken',
                    )}
                  >
                    <span>{g.label}</span>
                    <span className="num text-xs opacity-80">{g.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          <Toolbar>
            <SearchBox value={search.q ?? ''} onChange={(q) => set({ q: q || undefined })} label="Search people" placeholder="Name, email or organisation" />
            <Filter label="Account" value={search.status ?? 'all'} onChange={(v) => set({ status: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...STATUSES.map((s) => ({ value: s, label: USER_STATUS[s].label }))]} />
            <Filter
              label="Identity"
              value={search.identity ?? 'all'}
              onChange={(v) => set({ identity: v === 'all' ? undefined : v })}
              options={[
                { value: 'all', label: 'Any' },
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Not verified' },
              ]}
            />
          </Toolbar>

          <DataTable
            caption="People"
            rows={rows}
            columns={columns}
            rowKey={(u) => u.id}
            selected={search.user}
            onOpen={(u) => set({ user: u.id })}
            openLabel={(u) => `Open ${u.fullName}`}
            card={(u) => {
              const lamp = IDENTITY[u.identityVerified ? 'yes' : 'no']
              return (
                <span className="flex items-center gap-3">
                  <Avatar name={u.fullName} hue={u.hue} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{u.fullName}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {roleLabel(u.role)}
                      {u.orgId && orgName.get(u.orgId) ? ` · ${orgName.get(u.orgId)}` : ''}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <Status tone={USER_STATUS[u.status].tone} icon={USER_STATUS[u.status].icon}>
                        {USER_STATUS[u.status].label}
                      </Status>
                      <Status tone={lamp.tone} icon={lamp.icon}>
                        {lamp.label}
                      </Status>
                    </span>
                  </span>
                </span>
              )
            }}
            empty={
              filtered ? (
                <Empty icon={<MagnifyingGlass />} title="Nobody matches" body="No account fits this role, these filters and this search together." action={<Button onClick={clear}>Clear filters</Button>} />
              ) : (
                <Empty icon={<UsersThree />} title="No accounts yet" body="Everyone who can sign in to Loop, Pool or this console is listed here. People arrive by signing up, by invitation from an owner, or through a rent-roll import." />
              )
            }
          />
          <Tally shown={rows.length} total={users.length} noun="person" plural="people" />
        </div>
      </div>

      <Sheet open={open !== undefined} onOpenChange={(o) => !o && set({ user: undefined })} eyebrow={shown ? roleLabel(shown.role) : undefined} title={shown?.fullName ?? ''}>
        {shown && <PersonDetail key={shown.id} user={shown} orgName={shown.orgId ? orgName.get(shown.orgId) : undefined} />}
      </Sheet>
    </Page>
  )
}
