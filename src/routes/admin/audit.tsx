import { createFileRoute } from '@tanstack/react-router'
import { Audit, auditSearch } from '@/screens/admin/Audit'

export const Route = createFileRoute('/admin/audit')({ validateSearch: auditSearch, component: Audit })
