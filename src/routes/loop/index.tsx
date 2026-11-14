import { createFileRoute } from '@tanstack/react-router'
import { CommandCentre } from '@/screens/loop/CommandCentre'

export const Route = createFileRoute('/loop/')({ component: CommandCentre })
