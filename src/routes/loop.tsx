import { createFileRoute } from '@tanstack/react-router'
import { ensureSession } from '@/app/session'
import { LoopShell } from '@/shell/LoopShell'

export const Route = createFileRoute('/loop')({
  beforeLoad: () => ensureSession('loop'),
  component: LoopShell,
})
