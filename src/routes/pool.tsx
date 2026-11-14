import { createFileRoute } from '@tanstack/react-router'
import { ensureSession } from '@/app/session'
import { PoolShell } from '@/shell/PoolShell'

export const Route = createFileRoute('/pool')({
  beforeLoad: () => ensureSession('pool'),
  component: PoolShell,
})
