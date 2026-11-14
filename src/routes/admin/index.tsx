import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/admin/')({ component: () => <Building title="Overview" /> })
