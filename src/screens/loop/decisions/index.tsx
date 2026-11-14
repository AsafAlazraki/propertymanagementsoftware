import type { ActionItem } from '@/domain/actions'
import { Sheet } from '@/ui/Sheet'
import { useStore } from '@/data/store'
import { ArrearsDecision, BondDecision, QuoteDecision } from './money'
import { FixedTermDecision, InspectionDecision, PetDecision } from './tenancy'

/** Action kinds that are decided right here in a sheet. The rest open the screen where the work lives. */
export const DECIDED_IN_SHEET: ActionItem['kind'][] = ['bond', 'arrears', 'quote', 'pet', 'fixed_term', 'inspection']

/** Where an action leads when it is not decided in a sheet. */
export function destinationOf(a: ActionItem): { to: string; params?: Record<string, string>; search?: Record<string, string> } {
  switch (a.kind) {
    case 'compliance':
    case 'insurance':
      return { to: '/loop/properties/$id', params: { id: a.propertyId ?? a.refId } }
    case 'applications':
      return { to: '/loop/tenancies', search: { view: 'applicants' } }
    case 'rent_review':
      return { to: '/loop/tenancies', search: { review: a.refId } }
    case 'variation':
      return { to: '/loop/tenancies', search: { view: 'changes' } }
    case 'dispute':
      return { to: '/loop/repairs', search: { job: a.refId } }
    case 'bank':
      return { to: '/loop/money' }
    default:
      return { to: '/loop' }
  }
}

const EYEBROW: Partial<Record<ActionItem['kind'], string>> = {
  bond: 'Bond',
  arrears: 'Late rent',
  quote: 'Repair quote',
  pet: 'Pet request',
  fixed_term: 'Fixed term',
  inspection: 'Routine inspection',
}

/** One sheet for every in-place decision. It stays mounted while it closes, so the exit can animate. */
export function DecisionSheet({ action, onClose }: { action: ActionItem | null; onClose: () => void }) {
  const address = useStore((s) => s.db.properties.find((p) => p.id === action?.propertyId)?.address)
  return (
    <Sheet
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      size={action?.kind === 'quote' ? 'lg' : 'md'}
      eyebrow={action ? `${EYEBROW[action.kind] ?? ''}${address ? ` · ${address.line1}` : ''}` : undefined}
      title={action?.title ?? ''}
    >
      {action?.kind === 'bond' && <BondDecision tenancyId={action.refId} done={onClose} />}
      {action?.kind === 'arrears' && <ArrearsDecision tenancyId={action.refId} done={onClose} />}
      {action?.kind === 'quote' && <QuoteDecision ticketId={action.refId} done={onClose} />}
      {action?.kind === 'pet' && <PetDecision variationId={action.refId} done={onClose} />}
      {action?.kind === 'fixed_term' && <FixedTermDecision tenancyId={action.refId} actionId={action.id} done={onClose} />}
      {action?.kind === 'inspection' && <InspectionDecision inspectionId={action.refId} done={onClose} />}
    </Sheet>
  )
}
