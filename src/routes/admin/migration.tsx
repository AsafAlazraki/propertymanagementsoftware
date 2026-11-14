import { createFileRoute } from '@tanstack/react-router'
import { Migration, migrationSearch } from '@/screens/admin/Migration'

export const Route = createFileRoute('/admin/migration')({ validateSearch: migrationSearch, component: Migration })
