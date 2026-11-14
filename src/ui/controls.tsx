import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from './cn'

const fieldBase =
  'w-full rounded-md bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-150 placeholder:text-ink-3 focus:shadow-[inset_0_0_0_2px_var(--focus)] disabled:bg-sunken disabled:text-ink-3 aria-invalid:shadow-[inset_0_0_0_2px_var(--danger)]'

/** Label, control, hint and error in one unit, wired together for assistive tech. */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  /** A sentence saying what is wrong and how to fix it. Replaces the hint while present. */
  error?: ReactNode
  optional?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  className?: string
}) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-3">Optional</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p id={describedBy} role={error ? 'alert' : undefined} className={cn('mt-1.5 text-xs', error ? 'text-danger-text' : 'text-ink-3')}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export function Input({ className, prefix, suffix, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { prefix?: ReactNode; suffix?: ReactNode }) {
  if (!prefix && !suffix) return <input {...rest} className={cn(fieldBase, 'h-10 px-3 coarse:h-11', className)} />
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-3">{prefix}</span>}
      <input {...rest} className={cn(fieldBase, 'h-10 px-3 coarse:h-11', prefix && 'pl-8', suffix && 'pr-12', className)} />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-ink-3">{suffix}</span>}
    </div>
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...rest} className={cn(fieldBase, 'min-h-24 px-3 py-2.5 leading-relaxed [field-sizing:content]', className)} />
}

/** The platform's own picker: the best select on a phone is the one the phone ships. */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={cn(fieldBase, 'h-10 appearance-none pr-9 pl-3 coarse:h-11', className)}>
        {children}
      </select>
      <CaretDown aria-hidden weight="bold" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink-3" />
    </div>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-2">{description}</span>}
      </label>
      <BaseSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative mt-0.5 flex h-6 w-10 shrink-0 rounded-full bg-line-strong p-0.5 transition-colors duration-200 ease-out data-checked:bg-accent data-disabled:opacity-50"
      >
        <BaseSwitch.Thumb className="size-5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)] transition-transform duration-200 ease-out data-checked:translate-x-4" />
      </BaseSwitch.Root>
    </div>
  )
}

export function Checkbox({
  checked,
  onCheckedChange,
  children,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={cn('flex min-h-6 cursor-pointer items-start gap-2.5 text-sm text-ink coarse:min-h-11 coarse:items-center', disabled && 'opacity-50')}>
      <BaseCheckbox.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line-strong)] transition-colors duration-150 data-checked:bg-accent data-checked:shadow-none coarse:mt-0"
      >
        <BaseCheckbox.Indicator className="text-accent-ink transition-transform duration-150 ease-out data-starting-style:scale-50">
          <Check weight="bold" className="size-3" />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span className="min-w-0">{children}</span>
    </label>
  )
}

/** A small set of mutually exclusive choices shown at once. Radio semantics, segmented look. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  /** Read to assistive tech; the visual group has no visible label. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className={cn('inline-flex max-w-full rounded-md bg-sunken p-0.5', className)}
    >
      {options.map((o) => (
        <Radio.Root
          key={o.value}
          value={o.value}
          className={cn(
            'pressable inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--r-md)-2px)] px-3 font-medium whitespace-nowrap text-ink-2 transition-[background-color,color,box-shadow] duration-150',
            'data-checked:bg-surface data-checked:text-ink data-checked:shadow-card',
            size === 'sm' ? 'h-7 text-xs coarse:h-9' : 'h-9 text-[13px] coarse:h-10',
          )}
        >
          {o.icon}
          <span className="truncate">{o.label}</span>
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}

/** Sections of one screen. The underline slides between tabs rather than jumping. */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  children,
  className,
}: {
  value: T
  onChange: (value: T) => void
  tabs: { value: T; label: ReactNode; count?: number }[]
  children?: ReactNode
  className?: string
}) {
  return (
    <BaseTabs.Root value={value} onValueChange={(v) => onChange(v as T)} className={className}>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <BaseTabs.List className="relative flex w-max min-w-full gap-1 border-b border-line">
          {tabs.map((t) => (
            <BaseTabs.Tab
              key={t.value}
              value={t.value}
              className="flex h-10 items-center gap-1.5 px-3 text-[13px] font-medium whitespace-nowrap text-ink-3 outline-offset-[-2px] transition-colors duration-150 data-active:text-ink hoverable:hover:text-ink coarse:h-11"
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="num rounded-full bg-sunken px-1.5 text-[11px] leading-[18px] text-ink-2">{t.count}</span>
              )}
            </BaseTabs.Tab>
          ))}
          <BaseTabs.Indicator className="absolute bottom-[-1px] left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-full bg-accent transition-[translate,width] duration-200 ease-out" />
        </BaseTabs.List>
      </div>
      {children}
    </BaseTabs.Root>
  )
}

export const TabPanel = BaseTabs.Panel
