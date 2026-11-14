/**
 * People with access: who can see this organisation, what each of them can
 * do, and the one accountant seat that can look but not touch.
 */
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { DotsThree, UserPlus } from '@phosphor-icons/react'
import type { User } from '@/domain/types'
import { dateOf, fmtRelative } from '@/domain/rules/calendar'
import { useMe, useOrgId, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { checkInvitation, invitePerson, setAccess, withdrawInvitation, type Invitation } from '@/data/ops-mutations'
import { roleLabel } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/controls'
import { Avatar, Empty } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { ActionMenu, type MenuEntry } from '@/ui/overlays'
import { Sheet } from '@/ui/Sheet'
import { Section, Truth } from './shared'

const CAN: Record<string, string> = {
  landlord: 'Can do everything, including these settings.',
  co_owner: 'Can do everything, and is asked for second approvals.',
  advisor: 'Read-only. Can see the ledger and take the tax pack; cannot change anything.',
}

const SEATS: { value: Invitation['role']; title: string; body: string }[] = [
  { value: 'co_owner', title: 'Co-owner', body: CAN.co_owner },
  { value: 'advisor', title: 'Accountant', body: CAN.advisor },
]

function InviteForm({ onClose }: { onClose: () => void }) {
  const me = useMe()
  const orgId = useOrgId()
  const roleId = useId()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Invitation['role']>('co_owner')
  const [tried, setTried] = useState(false)
  const verdict = checkInvitation(orgId, { fullName, email, role })
  const failed = tried && !verdict.ok ? verdict : undefined

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Field label="Their name" error={failed?.field === 'name' ? failed.reason : undefined}>
        {(p) => <Input {...p} autoComplete="off" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
      </Field>
      <Field label="Their email" error={failed?.field === 'email' ? failed.reason : undefined}>
        {(p) => (
          <Input
            {...p}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <div>
        <p id={roleId} className="mb-2 text-[13px] font-medium text-ink">
          What they can do
        </p>
        <RadioGroup
          aria-labelledby={roleId}
          value={role}
          onValueChange={(v) => setRole(v as Invitation['role'])}
          className="grid gap-2"
        >
          {SEATS.map((s) => (
            <Radio.Root
              key={s.value}
              value={s.value}
              className="pressable block cursor-pointer rounded-lg bg-surface p-3.5 text-left shadow-card transition-[background-color,box-shadow] duration-150 data-checked:bg-accent-soft data-checked:shadow-[inset_0_0_0_2px_var(--accent)]"
            >
              <span className="block text-[14px] font-semibold text-ink">{s.title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">{s.body}</span>
            </Radio.Root>
          ))}
        </RadioGroup>
        {failed?.field === 'role' && <Refusal verdict={failed} className="mt-2" />}
      </div>
      <p className="rounded-md bg-sunken px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
        No email is sent in this prototype. The invitation is recorded here so you can see how it works.
      </p>
      <Button
        intent="primary"
        size="lg"
        block
        onClick={() => {
          setTried(true)
          const result = invitePerson(orgId, { fullName, email, role }, me.fullName)
          if (!result.ok) return
          toast.success(`${fullName.trim()} is invited`, {
            description: 'Recorded as invited. No email was sent: this is a prototype.',
          })
          onClose()
        }}
      >
        Record the invitation
      </Button>
    </div>
  )
}

export function PeopleSection() {
  const me = useMe()
  const day = useToday()
  const orgId = useOrgId()
  const users = useStore((s) => s.db.users)
  const ownerId = useStore((s) => s.db.orgs.find((o) => o.id === orgId)?.ownerUserId)
  const [inviting, setInviting] = useState(false)

  const people = useMemo(() => {
    const rank = (u: User) => (u.id === ownerId ? 0 : u.status === 'active' ? 1 : u.status === 'invited' ? 2 : 3)
    return users
      .filter((u) => u.orgId === orgId)
      .sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName))
  }, [users, orgId, ownerId])

  const change = (u: User, access: 'active' | 'deactivated') => {
    const verdict = setAccess(u.id, access, me)
    if (verdict.ok) toast(access === 'active' ? `${u.fullName} has access again` : `${u.fullName} no longer has access`)
    else toast.error(verdict.reason ?? 'That could not be changed', { description: verdict.fix })
  }

  const menuFor = (u: User): MenuEntry[] => {
    if (u.status === 'invited') {
      return [
        {
          label: 'Withdraw the invitation',
          tone: 'danger',
          onSelect: () => {
            withdrawInvitation(u.id, me.fullName)
            toast(`Invitation to ${u.fullName} withdrawn`)
          },
        },
      ]
    }
    if (u.status === 'deactivated') return [{ label: 'Give access back', onSelect: () => change(u, 'active') }]
    const why =
      u.id === ownerId
        ? 'The owner’s access cannot be removed.'
        : u.id === me.id
          ? 'You cannot remove your own access.'
          : undefined
    return [
      {
        label: 'Remove access',
        tone: 'danger',
        disabled: Boolean(why),
        reason: why,
        onSelect: () => change(u, 'deactivated'),
      },
    ]
  }

  return (
    <Section
      id="people"
      title="People with access"
      lede="Everyone who can open this organisation in Loop. The accountant seat is read-only: it is for the person who does the tax return."
      action={
        <Button intent="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setInviting(true)}>
          Give someone access
        </Button>
      }
    >
      {people.length === 0 && (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<UserPlus />}
            title="Nobody has access yet"
            body="This is the list of people who can open this organisation. Give the first person access to start it."
          />
        </div>
      )}
      <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
        {people.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 p-4 sm:px-5">
            <Avatar
              name={u.fullName}
              hue={u.hue}
              size={38}
              className={u.status === 'deactivated' ? 'opacity-50' : undefined}
            />
            <div className="min-w-0 flex-1 basis-44">
              <p className="truncate text-[14px] font-semibold text-ink">
                {u.fullName}
                {u.id === me.id && <span className="font-normal text-ink-3"> · you</span>}
              </p>
              <p className="truncate text-[13px] text-ink-2">{u.email}</p>
            </div>
            <div className="order-last min-w-0 basis-full md:order-none md:flex-[2] md:basis-60">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone={u.role === 'advisor' ? 'info' : 'neutral'} size="sm">
                  {u.id === ownerId ? 'Owner' : roleLabel(u.role)}
                </Badge>
                <span className="text-xs text-ink-3">
                  {u.status === 'invited'
                    ? 'Invited, not joined yet'
                    : u.status === 'deactivated'
                      ? 'Access removed'
                      : `Last here ${fmtRelative(dateOf(u.lastActiveAt), day)}`}
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{CAN[u.role] ?? 'Can open this organisation.'}</p>
            </div>
            <ActionMenu
              items={menuFor(u)}
              trigger={
                <Button intent="ghost" size="icon" aria-label={`Change access for ${u.fullName}`}>
                  <DotsThree weight="bold" className="size-5" aria-hidden />
                </Button>
              }
            />
          </li>
        ))}
      </ul>
      <Truth>
        This prototype has no sign-in, so nobody listed here can actually log in, and an invitation is recorded but
        never emailed.
      </Truth>

      <Sheet
        open={inviting}
        onOpenChange={(o) => !o && setInviting(false)}
        eyebrow="People with access"
        title="Give someone access"
      >
        {inviting && <InviteForm onClose={() => setInviting(false)} />}
      </Sheet>
    </Section>
  )
}
