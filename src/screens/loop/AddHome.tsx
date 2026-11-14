/**
 * Adding a home.
 *
 * What this does that nothing else does: it turns "I have a rental" into a
 * home Loop can look after, asking only what a person knows off the top of
 * their head. If they have the tenancy agreement as a PDF, Loop reads the
 * address, rent, bond, dates and names out of it and shows where each came
 * from. Everything not asked here is left as unknown and appears on the
 * home's checklist, rather than being assumed.
 */
import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, CheckCircle, FilePdf, MagicWand } from '@phosphor-icons/react'
import type { Property, Tenancy } from '@/domain/types'
import { readAgreement, type AgreementFacts } from '@/domain/agreementText'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { bondCaps, bondLodgement, checkBond } from '@/domain/rules/tenancy'
import { SUBURBS } from '@/domain/seed/world'
import { useMe, useOrgRows } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { calendarFor } from '@/domain/rules/core'
import { regionOf } from '@/domain/jurisdictions'
import { addHome } from '@/data/home-mutations'
import { Button } from '@/ui/Button'
import { Field, Input, Segmented, Select } from '@/ui/controls'
import { Callout } from '@/ui/display'
import { Refusal, Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const STEPS = ['The home', 'Who lives there', 'Check and add']

/** The text of a PDF, page by page. The library is loaded only when someone drops a file. */
async function pdfText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let n = 1; n <= Math.min(doc.numPages, 30); n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    let line = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      line += item.hasEOL ? '\n' : ' '
    }
    pages.push(line)
  }
  return pages.join('\n')
}

function FromPdf({ children }: { children: string | undefined }) {
  if (!children) return null
  return (
    <span className="mt-1 flex items-start gap-1 text-xs leading-relaxed text-accent-text">
      <MagicWand weight="fill" className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>Read from the PDF: “{children}”. Check it.</span>
    </span>
  )
}

export function AddHome({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pack = usePack()
  const day = useToday()
  const me = useMe()
  const navigate = useNavigate()
  const entities = useOrgRows('entities')
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [tried, setTried] = useState(false)
  const [reading, setReading] = useState<'idle' | 'busy' | 'none' | 'failed'>('idle')
  const [facts, setFacts] = useState<AgreementFacts>({})

  const [line1, setLine1] = useState('')
  const [suburb, setSuburb] = useState('')
  const [city, setCity] = useState('Nelson')
  const [postcode, setPostcode] = useState('')
  const [kind, setKind] = useState<Property['kind']>('house')
  const [beds, setBeds] = useState('3')
  const [baths, setBaths] = useState('1')
  const [titleType, setTitleType] = useState<Property['titleType']>('freehold')
  const [entityId, setEntityId] = useState('')
  const [value, setValue] = useState('')
  const [owing, setOwing] = useState('')

  const [let_, setLet] = useState<'let' | 'empty'>('let')
  const [tenants, setTenants] = useState('')
  const [rent, setRent] = useState('')
  const [rentDay, setRentDay] = useState('5')
  const [type, setType] = useState<Tenancy['type']>('periodic')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [bond, setBond] = useState('')
  const [bondRef, setBondRef] = useState('')

  const owner = entityId || entities[0]?.id || ''
  const weeklyRent = Number(rent)
  const bondAmount = Number(bond) || 0
  const names = tenants
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean)
  const bondCheck = weeklyRent > 0 ? checkBond(pack, weeklyRent, bondAmount) : { ok: true as const }
  const cal = calendarFor(pack, regionOf(city))
  const lodgement =
    let_ === 'let' && bondAmount > 0 && start && !bondRef.trim()
      ? bondLodgement(pack, cal, start, undefined, day)
      : null

  const bad0 = { line1: line1.trim().length < 4, suburb: !suburb.trim(), beds: !(Number(beds) >= 0 && beds !== '') }
  const bad1 =
    let_ === 'empty'
      ? {}
      : {
          tenants: names.length === 0,
          rent: !(weeklyRent > 0),
          start: !start || start > day,
          end: type === 'fixed' && (!end || end <= start),
          bond: !bondCheck.ok,
        }
  const anyBad = (o: Record<string, boolean>) => Object.values(o).some(Boolean)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setReading('busy')
    try {
      const found = readAgreement(await pdfText(file))
      setFacts(found)
      if (Object.keys(found).length === 0) return setReading('none')
      if (found.address) {
        const parts = found.address.value.split(',').map((p) => p.trim())
        setLine1(parts[0] ?? '')
        const known = Object.values(SUBURBS).find((s) =>
          parts.some((p) => p.toLowerCase().startsWith(s.name.toLowerCase())),
        )
        if (known) {
          setSuburb(known.name)
          setCity(known.city)
          setPostcode(known.postcode)
        } else if (parts[1]) setSuburb(parts[1])
        const code = /\b(\d{4})\b/.exec(parts.slice(1).join(' '))
        if (code) setPostcode(code[1])
      }
      if (found.weeklyRent) setRent(String(found.weeklyRent.value))
      if (found.bond) setBond(String(found.bond.value))
      if (found.startDate) setStart(found.startDate.value)
      if (found.endDate) setEnd(found.endDate.value)
      if (found.type) setType(found.type.value)
      if (found.tenants) setTenants(found.tenants.value.join(', '))
      setLet('let')
      setReading('idle')
    } catch {
      setReading('failed')
    }
  }

  const next = () => {
    setTried(true)
    if (step === 0 && anyBad(bad0)) return
    if (step === 1 && anyBad(bad1 as Record<string, boolean>)) return
    setTried(false)
    setStep((s) => s + 1)
  }

  const add = () => {
    if (!me.orgId || !owner) return
    const id = addHome(
      {
        orgId: me.orgId,
        entityId: owner,
        address: { line1, suburb, city, postcode },
        kind,
        beds: Number(beds),
        baths: Number(baths) || 1,
        titleType,
        currentValue: Number(value) || 0,
        mortgageBalance: Number(owing) || 0,
        tenancy:
          let_ === 'let'
            ? {
                tenants: names,
                weeklyRent,
                rentDueWeekday: Number(rentDay),
                type,
                startDate: start,
                endDate: type === 'fixed' ? end : undefined,
                bond: bondAmount,
                bondRef: bondRef.trim() || undefined,
              }
            : undefined,
      },
      me.fullName,
    )
    toast.success(`${line1} added`, {
      description: 'Its checklist is ready. Start with the things marked as not yet known.',
    })
    onClose()
    void navigate({ to: '/loop/properties/$id', params: { id }, search: { tab: 'compliance' } })
  }

  const found = Object.keys(facts).length
  const digits = (set: (v: string) => void) => (e: { target: { value: string } }) =>
    set(e.target.value.replace(/[^0-9]/g, ''))

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      eyebrow={`Step ${step + 1} of ${STEPS.length}`}
      title={step === 0 ? 'Add a home' : STEPS[step]}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <ol aria-label="Steps" className="grid grid-cols-3 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined}>
              <span aria-hidden className={cn('block h-1 rounded-full', i <= step ? 'bg-accent' : 'bg-sunken')} />
              <span className={cn('mt-1.5 block text-[11px]', i === step ? 'font-semibold text-ink' : 'text-ink-3')}>
                {s}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <div className="rounded-lg border border-dashed border-line-strong p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                  <FilePdf weight="fill" className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-[14px] font-semibold text-ink">Have the tenancy agreement as a PDF?</p>
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    Loop reads the address, rent, bond, dates and names from it. The file stays on this device.
                  </p>
                </div>
                <Button intent="secondary" loading={reading === 'busy'} onClick={() => fileRef.current?.click()}>
                  Choose the PDF
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Tenancy agreement PDF"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </div>
              <p aria-live="polite" className="mt-2 text-[13px]">
                {reading === 'idle' && found > 0 && (
                  <span className="flex items-center gap-1.5 text-ok-text">
                    <CheckCircle weight="fill" className="size-4" aria-hidden />
                    Found {found} {found === 1 ? 'thing' : 'things'}. Each is marked below and on the next step; check
                    them before you carry on.
                  </span>
                )}
                {reading === 'none' && (
                  <span className="text-ink-2">
                    Nothing in that PDF matched. It may be a scan (a picture of the page), which Loop cannot read. Fill
                    it in by hand below.
                  </span>
                )}
                {reading === 'failed' && (
                  <span className="text-danger-text">
                    That file could not be opened as a PDF. Try another, or fill it in by hand.
                  </span>
                )}
              </p>
            </div>

            <Field label="Street address" error={tried && bad0.line1 ? 'Add the number and street.' : undefined}>
              {(p) => (
                <>
                  <Input
                    {...p}
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    placeholder="12 Kererū Lane"
                    autoComplete="off"
                  />
                  <FromPdf>{facts.address?.from}</FromPdf>
                </>
              )}
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem]">
              <Field label="Suburb" error={tried && bad0.suburb ? 'Add the suburb.' : undefined}>
                {(p) => (
                  <Input
                    {...p}
                    list="add-home-suburbs"
                    value={suburb}
                    onChange={(e) => {
                      setSuburb(e.target.value)
                      const known = Object.values(SUBURBS).find(
                        (s) => s.name.toLowerCase() === e.target.value.trim().toLowerCase(),
                      )
                      if (known) {
                        setCity(known.city)
                        setPostcode(known.postcode)
                      }
                    }}
                  />
                )}
              </Field>
              <datalist id="add-home-suburbs">
                {Object.values(SUBURBS).map((s) => (
                  <option key={s.name} value={s.name} />
                ))}
              </datalist>
              <Field label="Town or city">
                {(p) => <Input {...p} value={city} onChange={(e) => setCity(e.target.value)} />}
              </Field>
              <Field label="Postcode" optional>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Kind of home">
                {(p) => (
                  <Select {...p} value={kind} onChange={(e) => setKind(e.target.value as Property['kind'])}>
                    <option value="house">House</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="unit">Unit</option>
                    <option value="apartment">Apartment</option>
                  </Select>
                )}
              </Field>
              <Field label="Bedrooms" error={tried && bad0.beds ? 'How many?' : undefined}>
                {(p) => <Input {...p} inputMode="numeric" value={beds} onChange={digits(setBeds)} />}
              </Field>
              <Field label="Bathrooms">
                {(p) => <Input {...p} inputMode="numeric" value={baths} onChange={digits(setBaths)} />}
              </Field>
              <Field label="Title">
                {(p) => (
                  <Select
                    {...p}
                    value={titleType}
                    onChange={(e) => setTitleType(e.target.value as Property['titleType'])}
                  >
                    <option value="freehold">Freehold</option>
                    <option value="unit_title">Unit title</option>
                    <option value="cross_lease">Cross lease</option>
                  </Select>
                )}
              </Field>
            </div>
            {entities.length > 1 && (
              <Field label="Who owns it?" hint="The name the tenancy and the tax return are in.">
                {(p) => (
                  <Select {...p} value={owner} onChange={(e) => setEntityId(e.target.value)}>
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              <Field label="Roughly what it is worth" optional hint="Your own estimate. It is only used to show yield.">
                {(p) => <Input {...p} inputMode="numeric" prefix="$" value={value} onChange={digits(setValue)} />}
              </Field>
              <Field label="What is owing on it" optional>
                {(p) => <Input {...p} inputMode="numeric" prefix="$" value={owing} onChange={digits(setOwing)} />}
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Segmented
              label="Is the home let?"
              value={let_}
              onChange={setLet}
              options={[
                { value: 'let', label: 'Someone lives there' },
                { value: 'empty', label: 'It is empty' },
              ]}
              className="w-full"
            />
            {let_ === 'empty' ? (
              <Callout tone="neutral" title="Nothing more to tell us yet">
                Add the home as it is. When you are ready to find a tenant, its checklist shows what has to be in place
                before it can be listed.
              </Callout>
            ) : (
              <>
                <Field
                  label="Tenants’ full names"
                  hint="Separate two names with a comma."
                  error={tried && bad1.tenants ? 'Add at least one name, as it is on the agreement.' : undefined}
                >
                  {(p) => (
                    <>
                      <Input
                        {...p}
                        value={tenants}
                        onChange={(e) => setTenants(e.target.value)}
                        placeholder="Sione Tupou, Grace O’Neill"
                        autoComplete="off"
                      />
                      <FromPdf>{facts.tenants?.from}</FromPdf>
                    </>
                  )}
                </Field>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  <Field label="Rent" error={tried && bad1.rent ? 'Add the weekly rent.' : undefined}>
                    {(p) => (
                      <>
                        <Input
                          {...p}
                          inputMode="numeric"
                          prefix="$"
                          suffix="a week"
                          value={rent}
                          onChange={digits(setRent)}
                        />
                        <FromPdf>{facts.weeklyRent?.from}</FromPdf>
                      </>
                    )}
                  </Field>
                  <Field label="Rent is due each">
                    {(p) => (
                      <Select {...p} value={rentDay} onChange={(e) => setRentDay(e.target.value)}>
                        {WEEKDAYS.map((d, i) => (
                          <option key={d} value={i}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                <Segmented
                  label="Kind of tenancy"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: 'periodic', label: 'Periodic — no end date' },
                    { value: 'fixed', label: 'Fixed term' },
                  ]}
                  className="w-full"
                />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  <Field
                    label="Tenancy started"
                    error={tried && bad1.start ? 'Add the date it began. It cannot be in the future here.' : undefined}
                  >
                    {(p) => (
                      <>
                        <Input {...p} type="date" max={day} value={start} onChange={(e) => setStart(e.target.value)} />
                        <FromPdf>{facts.startDate?.from}</FromPdf>
                      </>
                    )}
                  </Field>
                  {type === 'fixed' && (
                    <Field
                      label="Fixed term ends"
                      error={tried && bad1.end ? 'Add the end date, after the start.' : undefined}
                    >
                      {(p) => (
                        <>
                          <Input
                            {...p}
                            type="date"
                            min={start || undefined}
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                          />
                          <FromPdf>{facts.endDate?.from}</FromPdf>
                        </>
                      )}
                    </Field>
                  )}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                  <Field
                    label="Bond you hold or lodged"
                    hint={
                      weeklyRent > 0 ? `At most ${money(bondCaps(pack, weeklyRent).general)} at this rent.` : undefined
                    }
                  >
                    {(p) => (
                      <>
                        <Input
                          {...p}
                          inputMode="numeric"
                          prefix="$"
                          value={bond}
                          onChange={digits(setBond)}
                          placeholder="0"
                        />
                        <FromPdf>{facts.bond?.from}</FromPdf>
                      </>
                    )}
                  </Field>
                  <Field label="Bond reference" optional hint="From Tenancy Services, if it is lodged.">
                    {(p) => (
                      <Input {...p} value={bondRef} onChange={(e) => setBondRef(e.target.value)} autoComplete="off" />
                    )}
                  </Field>
                </div>
                <Refusal verdict={bondCheck} />
                {lodgement && (
                  <Callout
                    tone={lodgement.status === 'overdue' ? 'danger' : 'warn'}
                    title={
                      lodgement.status === 'overdue'
                        ? 'This bond is past its lodgement deadline'
                        : `This bond has to be lodged by ${fmtDate(lodgement.deadline, { year: 'always' })}`
                    }
                  >
                    {lodgement.status === 'overdue'
                      ? 'It should have been lodged already. Lodge it today; Loop will put it at the top of your list.'
                      : `${lodgement.workingDaysLeft} working days left, counted from the day the tenancy began. Loop will keep count.`}
                    <span className="mt-2 block">
                      <Why rule="bond.lodgement_deadline" />
                    </span>
                  </Callout>
                )}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <dl className="grid gap-px overflow-hidden rounded-lg bg-line text-[14px]">
              {[
                ['Home', `${line1}, ${suburb}`],
                ['Kind', `${beds}-bedroom ${kind}`],
                ...(let_ === 'let'
                  ? [
                      ['Tenants', names.join(' and ')],
                      ['Rent', `${money(weeklyRent)} a week, due ${WEEKDAYS[Number(rentDay)]}s`],
                      [
                        'Tenancy',
                        type === 'fixed'
                          ? `Fixed term, ${fmtDate(start, { year: 'always', weekday: false })} to ${fmtDate(end, { year: 'always', weekday: false })}`
                          : `Periodic, since ${fmtDate(start, { year: 'always', weekday: false })}`,
                      ],
                      [
                        'Bond',
                        bondAmount
                          ? `${money(bondAmount)}${bondRef.trim() ? `, lodged under ${bondRef.trim()}` : ', not yet lodged'}`
                          : 'None',
                      ],
                    ]
                  : [['Tenancy', 'Empty']]),
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 bg-surface px-4 py-2.5">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <section className="rounded-lg bg-sunken p-4">
              <h3 className="text-[13px] font-semibold text-ink">What Loop does the moment you add it</h3>
              <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-[13px] leading-relaxed text-ink-2">
                <li>
                  Opens a checklist of {pack.complianceChecks.length} things a rental must have. Every one starts as
                  “not yet known”: Loop does not assume a home is compliant.
                </li>
                {let_ === 'let' && bondAmount > 0 && !bondRef.trim() && (
                  <li>Starts the bond countdown and puts it in your list.</li>
                )}
                {let_ === 'let' && (
                  <li>
                    Watches for rent of {money(weeklyRent)} in your bank feed each week (the feed is simulated in this
                    prototype).
                  </li>
                )}
                {let_ === 'let' && names.length > 0 && (
                  <li>
                    Does not contact {names.length === 1 ? names[0].split(' ')[0] : 'the tenants'}. They are invited to
                    Pool only when you choose to.
                  </li>
                )}
              </ul>
            </section>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {step > 0 ? (
            <Button intent="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button intent="primary" trailing={<ArrowRight className="size-4" />} onClick={next}>
              Next
            </Button>
          ) : (
            <Button intent="primary" size="lg" onClick={add}>
              Add this home
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
