import { createFileRoute } from '@tanstack/react-router'
import { Building } from '@/shell/Building'

export const Route = createFileRoute('/loop/money')({ component: () => <Building title="Money" /> })
