import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/pool/me')({ component: () => <Building title="Me" /> })
