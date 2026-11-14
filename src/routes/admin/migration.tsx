import { createFileRoute } from '@tanstack/react-router'
import { Migration } from '@/screens/admin/Migration'
import { migrationSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/migration')({ validateSearch: migrationSearch, component: Migration })
