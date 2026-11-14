import type { ReactElement, ReactNode } from 'react'
import { Tooltip } from '@base-ui/react/tooltip'
import { Popover } from '@base-ui/react/popover'
import { Menu } from '@base-ui/react/menu'
import { cn } from './cn'

/* Popups grow from the control that opened them, not from their own centre. */
const popupMotion =
  'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150 ease-out data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-instant:transition-none'

/** A hover/focus hint. The label must not carry information that is unavailable elsewhere. */
export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactElement; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={7} className="z-[70]">
          <Tooltip.Popup
            className={cn(
              popupMotion,
              'max-w-64 rounded-sm bg-ink px-2 py-1 text-xs font-medium text-bg shadow-pop duration-100',
            )}
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export const TipProvider = Tooltip.Provider

/** A small anchored panel for detail on demand. */
export function Pop({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  className,
  open,
  onOpenChange,
}: {
  trigger: ReactElement
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner side={side} align={align} sideOffset={8} collisionPadding={12} className="z-[60]">
          <Popover.Popup
            className={cn(
              popupMotion,
              'max-h-[var(--available-height)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg bg-surface p-4 text-ink shadow-pop outline-none',
              className,
            )}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const PopTitle = Popover.Title
export const PopClose = Popover.Close

export interface MenuEntry {
  label: string
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  /** Why the item is unavailable, as a sentence. Shown under the label. */
  reason?: string
  separatorBefore?: boolean
}

/** An action menu. Unavailable entries say why instead of silently greying out. */
export function ActionMenu({ trigger, items, align = 'end' }: { trigger: ReactElement; items: MenuEntry[]; align?: 'start' | 'end' }) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner align={align} sideOffset={6} collisionPadding={12} className="z-[60]">
          <Menu.Popup className={cn(popupMotion, 'min-w-48 max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md bg-surface p-1 text-ink shadow-pop outline-none')}>
            {items.map((item) => (
              <div key={item.label}>
                {item.separatorBefore && <Menu.Separator className="my-1 h-px bg-line" />}
                <Menu.Item
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={cn(
                    'flex min-h-9 cursor-default items-start gap-2.5 rounded-sm px-2.5 py-2 text-[13px] outline-none select-none coarse:min-h-11 coarse:items-center',
                    'data-highlighted:bg-sunken data-disabled:opacity-55',
                    item.tone === 'danger' ? 'text-danger-text' : 'text-ink',
                  )}
                >
                  {item.icon && <span className="mt-px shrink-0 text-ink-3 [&>svg]:size-4">{item.icon}</span>}
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    {item.reason && <span className="mt-0.5 block text-xs text-ink-3">{item.reason}</span>}
                  </span>
                </Menu.Item>
              </div>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
