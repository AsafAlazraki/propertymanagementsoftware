/**
 * Photos kept on this device: a grid of them, and the one opened large.
 * The studio can remove a photo; a finished report can only look.
 */
import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import { usePhotoUrl } from '@/data/photos'
import { Button } from '@/ui/Button'
import { Modal } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

function Tile({ id, label, onOpen }: { id: ID; label: string; onOpen: () => void }) {
  const url = usePhotoUrl(id)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}`}
      className="pressable block aspect-square w-full overflow-hidden rounded-md bg-sunken"
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="skeleton block size-full" />
      )}
    </button>
  )
}

function Viewer({
  id,
  label,
  onClose,
  onRemove,
}: {
  id: ID | null
  label: string
  onClose: () => void
  onRemove?: (id: ID) => void
}) {
  const url = usePhotoUrl(id ?? undefined)
  return (
    <Modal
      open={id !== null}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={label}
      footer={
        <>
          {onRemove && id && (
            <Button
              intent="dangerSoft"
              icon={<Trash className="size-4" aria-hidden />}
              onClick={() => {
                onRemove(id)
                onClose()
              }}
            >
              Remove this photo
            </Button>
          )}
          <Button intent="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {url ? (
        <img src={url} alt={label} className="max-h-[68dvh] w-full rounded-md bg-sunken object-contain" />
      ) : (
        <div className="skeleton aspect-[4/3] w-full" />
      )}
    </Modal>
  )
}

/** A room's photos. Pass `onRemove` only where removing is allowed. */
export function PhotoGrid({
  ids,
  room,
  onRemove,
  className,
}: {
  ids: ID[]
  room: string
  onRemove?: (id: ID) => void
  className?: string
}) {
  const [open, setOpen] = useState<ID | null>(null)
  if (ids.length === 0) return null
  const at = open ? ids.indexOf(open) + 1 : 0
  return (
    <>
      <ul className={cn('grid grid-cols-4 gap-2 sm:grid-cols-5', className)}>
        {ids.map((id, i) => (
          <li key={id}>
            <Tile id={id} label={`photo ${i + 1} of ${ids.length}, ${room}`} onOpen={() => setOpen(id)} />
          </li>
        ))}
      </ul>
      <Viewer
        id={open}
        label={open ? `${room} — photo ${at} of ${ids.length}` : room}
        onClose={() => setOpen(null)}
        onRemove={onRemove}
      />
    </>
  )
}
