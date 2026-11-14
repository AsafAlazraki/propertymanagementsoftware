import { createFileRoute } from '@tanstack/react-router'
import { Queue, queueSearch } from '@/screens/admin/Queue'

export const Route = createFileRoute('/admin/queue')({ validateSearch: queueSearch, component: Queue })
