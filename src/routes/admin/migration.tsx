import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/admin/migration')({ component: () => <Building title="Migration" /> })
