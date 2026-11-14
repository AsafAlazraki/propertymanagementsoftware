import type { ReactNode, RefObject } from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { Dialog } from '@base-ui/react/dialog'
import { X } from '@phosphor-icons/react'
import { cn } from './cn'
import { useMediaQuery } from './hooks'

/**
 * A task surface that leaves the page behind it in view.
 *
 * On a phone it rises from the bottom and can be flicked away; from tablet
 * width up it slides in from the right, where a long form has room. Either way
 * it leaves along the path it arrived on, and the header and footer stay put
 * while the body scrolls.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}) {
  const side = useMediaQuery('(min-width: 768px)')
  const width =
    size === 'xl'
      ? 'md:w-[min(56rem,calc(100vw-4rem))]'
      : size === 'lg'
        ? 'md:w-[min(44rem,calc(100vw-4rem))]'
        : 'md:w-[min(32rem,calc(100vw-4rem))]'

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection={side ? 'right' : 'down'}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'fixed inset-0 z-40 min-h-dvh bg-scrim opacity-[calc(1-var(--drawer-swipe-progress))]',
            'transition-opacity duration-[420ms] ease-drawer data-swiping:duration-0',
            'data-starting-style:opacity-0 data-ending-style:opacity-0',
          )}
        />
        <Drawer.Viewport
          className={cn('fixed inset-0 z-40 flex', side ? 'items-stretch justify-end' : 'items-end justify-center')}
        >
          <Drawer.Popup
            className={cn(
              'flex min-h-0 flex-col bg-surface text-ink shadow-sheet outline-none',
              'transition-transform duration-[420ms] ease-drawer data-swiping:duration-0 data-swiping:select-none',
              side
                ? cn(
                    'h-full w-full',
                    width,
                    '[transform:translateX(var(--drawer-swipe-movement-x))]',
                    'data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]',
                  )
                : cn(
                    'max-h-[calc(100dvh-2.5rem)] w-full rounded-t-xl',
                    '[transform:translateY(var(--drawer-swipe-movement-y))]',
                    'data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]',
                  ),
            )}
          >
            {!side && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />}
            <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 pt-4 pb-3.5 md:px-6 md:pt-5">
              <div className="min-w-0 flex-1">
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <Drawer.Title className="text-[17px] leading-snug font-semibold tracking-[-0.015em] text-balance">
                  {title}
                </Drawer.Title>
                {description && (
                  <Drawer.Description className="mt-1 text-[13px] text-ink-2">{description}</Drawer.Description>
                )}
              </div>
              <Drawer.Close
                aria-label="Close"
                className="pressable -mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-md text-ink-3 hoverable:hover:bg-sunken hoverable:hover:text-ink"
              >
                <X className="size-[18px]" weight="bold" />
              </Drawer.Close>
            </header>
            <Drawer.Content className="min-h-0 min-w-0 flex-1 touch-auto overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 md:px-6">
              {children}
            </Drawer.Content>
            {footer && (
              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-6">
                {footer}
              </footer>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/**
 * A centred modal, for a decision that must be made before anything else:
 * confirmations and document previews. Scales from 96% so it arrives rather
 * than appears; it is not anchored to a trigger, so it stays centred.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  finalFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'doc'
  /**
   * Where focus goes when the modal closes. Needed when it was opened from a
   * menu item: the item is gone by then, so focus would otherwise fall to the page.
   */
  finalFocus?: RefObject<HTMLElement | null>
}) {
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', doc: 'max-w-[52rem]' }[size]
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-scrim transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3 sm:p-6">
          <Dialog.Popup
            finalFocus={finalFocus}
            className={cn(
              'flex max-h-[calc(100dvh-1.5rem)] w-full flex-col rounded-xl bg-surface text-ink shadow-sheet outline-none',
              'transition-[transform,opacity] duration-200 ease-out',
              'data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0',
              width,
            )}
          >
            <header className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1 sm:px-6">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-[17px] leading-snug font-semibold tracking-[-0.015em] text-balance">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1.5 text-sm text-ink-2">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="pressable no-print -mt-1.5 -mr-2 grid size-10 shrink-0 place-items-center rounded-md text-ink-3 hoverable:hover:bg-sunken hoverable:hover:text-ink"
              >
                <X className="size-[18px]" weight="bold" />
              </Dialog.Close>
            </header>
            {children && (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
            )}
            {footer && (
              <footer className="no-print flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 pt-2 pb-5 sm:px-6">
                {footer}
              </footer>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
