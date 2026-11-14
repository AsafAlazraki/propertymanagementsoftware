import { createFileRoute } from '@tanstack/react-router'
import { ensureSession } from '@/app/session'
import { AdminShell } from '@/shell/AdminShell'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => ensureSession('admin'),
  component: AdminShell,
})
