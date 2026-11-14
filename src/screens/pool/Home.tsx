/**
 * Pool — Home.
 *
 * What this screen does that no other does: it tells a renter, in one glance,
 * that they are square with their landlord. Rent first, as a sentence. Then the
 * only two lists a renter needs — what is waiting on me, and what is moving
 * without me — and the facts that sit under a tenancy and are otherwise
 * impossible to find: where the bond is, who is coming and when, what notice
 * they owe you.
 *
 * Someone who is still looking gets a different screen for a different job:
 * where each application stands and what it has shared.
 */
import { fmtDate } from '@/domain/rules/calendar'
import { useMe } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { firstName, Heading, useMyApplications, useMyHome, useMyProfile } from './shared'
import { ApplicationCard } from './home/Applications'
import { Looking, SavedHomes } from './home/Looking'
import { Renting } from './home/Renting'

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

export function Home() {
  const me = useMe()
  const day = useToday()
  const home = useMyHome()
  const profile = useMyProfile()
  const applications = useMyApplications()
  const first = firstName(me.fullName)
  const open = applications.filter((a) => a.stage !== 'declined' && a.stage !== 'withdrawn').length

  return (
    <Page>
      <p className="eyebrow mb-4">
        {fmtDate(day, { year: 'never' })} · Kia ora, {first}
      </p>
      {home ? (
        <>
          <Renting home={home} />
          {applications.length > 0 && (
            <section aria-labelledby="moving-on" className="mt-10">
              <Heading id="moving-on" count={open}>
                Homes you have applied for
              </Heading>
              <div className="grid gap-4 xl:grid-cols-2">
                {applications.map((a) => (
                  <ApplicationCard key={a.id} application={a} />
                ))}
              </div>
            </section>
          )}
          {profile.savedPropertyIds.length > 0 && (
            <div className="mt-10">
              <SavedHomes profile={profile} />
            </div>
          )}
        </>
      ) : (
        <>
          <header className="mb-7 sm:mb-9">
            <h1 className="display max-w-[18ch] text-[34px] text-ink sm:text-[46px]">
              {open > 0 ? `${WORDS[open] ?? open} ${open === 1 ? 'application' : 'applications'} on the go.` : profile.externalTenancy ? `Good to have you, ${first}.` : 'Let’s find your place.'}
            </h1>
            <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              {open > 0
                ? 'Here is where each one stands, and exactly what the landlord can see about you so far. Nothing more is asked for until you are the one they want.'
                : 'Every home on Pool has one fixed weekly rent, and a landlord only ever sees what the stage you are at allows.'}
            </p>
          </header>
          <Looking applications={applications} />
        </>
      )}
    </Page>
  )
}
