import { createFileRoute } from '@tanstack/react-router'
import { Settings } from '@/screens/loop/Settings'

export const Route = createFileRoute('/loop/settings')({ component: Settings })
