import { createFileRoute } from '@tanstack/react-router'
import { Me } from '@/screens/pool/Me'

export const Route = createFileRoute('/pool/me')({ component: Me })
