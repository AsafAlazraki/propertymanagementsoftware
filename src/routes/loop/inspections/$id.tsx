import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/loop/inspections/$id')({ component: () => <Building title="Inspection studio" /> })
