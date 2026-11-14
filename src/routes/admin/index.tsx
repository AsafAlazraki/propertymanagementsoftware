import { createFileRoute } from '@tanstack/react-router'
import { Overview } from '@/screens/admin/Overview'

export const Route = createFileRoute('/admin/')({ component: Overview })
