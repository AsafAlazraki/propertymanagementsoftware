import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/admin/rules')({ component: () => <Building title="Rulewatch" /> })
