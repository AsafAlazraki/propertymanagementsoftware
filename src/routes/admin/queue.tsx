import { createFileRoute } from '@tanstack/react-router'
import { Queue } from '@/screens/admin/Queue'
import { queueSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/queue')({ validateSearch: queueSearch, component: Queue })
