import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/pool/listing/$id')({ component: () => <Building title="Listing" /> })
