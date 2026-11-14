import { HardHat } from '@phosphor-icons/react'
import { Empty } from '@/ui/display'
import { Page } from './common'

/** Shown for a screen whose route exists but whose build has not landed yet. */
export function Building({ title }: { title: string }) {
  return (
    <Page>
      <Empty
        className="py-24"
        icon={<HardHat />}
        title={`${title} is being built`}
        body="This part of the prototype lands in the next push. Everything behind it — the rules, the records, the calculations — is already in place."
      />
    </Page>
  )
}
