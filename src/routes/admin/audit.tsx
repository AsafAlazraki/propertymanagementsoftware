import { createFileRoute } from '@tanstack/react-router'
import { Audit } from '@/screens/admin/Audit'
import { auditSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/audit')({ validateSearch: auditSearch, component: Audit })
