import { createFileRoute } from '@tanstack/react-router'
import { Passport } from '@/screens/pool/Passport'

export const Route = createFileRoute('/pool/passport')({ component: Passport })
