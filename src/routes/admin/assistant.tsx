import { createFileRoute } from '@tanstack/react-router'
import { Assistant, assistantSearch } from '@/screens/admin/Assistant'

export const Route = createFileRoute('/admin/assistant')({ validateSearch: assistantSearch, component: Assistant })
