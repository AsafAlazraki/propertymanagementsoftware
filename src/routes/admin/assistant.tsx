import { createFileRoute } from '@tanstack/react-router'
import { Assistant } from '@/screens/admin/Assistant'
import { assistantSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/assistant')({ validateSearch: assistantSearch, component: Assistant })
