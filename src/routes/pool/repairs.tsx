import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/pool/repairs')({ component: () => <Building title="Repairs" /> })
