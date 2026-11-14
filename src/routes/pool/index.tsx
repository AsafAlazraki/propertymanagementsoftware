import { createFileRoute } from '@tanstack/react-router'
import { Home } from '@/screens/pool/Home'

export const Route = createFileRoute('/pool/')({ component: Home })
