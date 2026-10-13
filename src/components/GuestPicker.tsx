import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { useI18n } from '@/i18n'

export interface GuestCounts {
  adults: number
  children: number
  infants: number
  pets: number
}

export const DEFAULT_GUEST_COUNTS: GuestCounts = {
  adults: 1,
  children: 0,
  infants: 0,
  pets: 0,
}

export function totalGuests(counts: GuestCounts): number {
  return Math.max(1, counts.adults + counts.children)
}

export function guestSummary(counts: GuestCounts, guestLabel = 'guest', guestsLabel = 'guests'): string {
  const total = totalGuests(counts)
  return `${total} ${total === 1 ? guestLabel : guestsLabel}`
}

interface GuestPickerProps {
  value: GuestCounts
  onChange: (value: GuestCounts) => void
  className?: string
  compact?: boolean
  maxGuests?: number
  infantsAllowed?: boolean
  petsAllowed?: boolean
}

interface GuestRowProps {
  title: string
  description: string
  value: number
  min: number
  disableIncrement?: boolean
  onChange: (value: number) => void
}

function GuestRow({ title, description, value, min, disableIncrement = false, onChange }: GuestRowProps) {
  const { t } = useI18n()

  return (
    <div className="roomi-guest-picker__row">
      <div className="roomi-guest-picker__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className="roomi-guest-picker__stepper" aria-label={`${title} count`}>
        <button
          type="button"
          className="roomi-guest-picker__step-button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={t('common.decrease', { title })}
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <span aria-live="polite">{value}</span>
        <button
          type="button"
          className="roomi-guest-picker__step-button"
          onClick={() => onChange(value + 1)}
          disabled={disableIncrement}
          aria-label={t('common.increase', { title })}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export function GuestPicker({
  value,
  onChange,
  className = '',
  compact = false,
  maxGuests = 16,
  infantsAllowed = true,
  petsAllowed = true,
}: GuestPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const total = totalGuests(value)

  useEffect(() => {
    if (!open) return undefined

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const update = (key: keyof GuestCounts, nextValue: number) => {
    onChange({ ...value, [key]: Math.max(0, nextValue) })
  }
  const adultOrChildLimitReached = total >= Math.max(1, maxGuests)

  return (
    <div ref={rootRef} className={`roomi-guest-picker ${compact ? 'roomi-guest-picker--compact' : ''} ${className}`}>
      <button
        type="button"
        className="roomi-guest-picker__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="roomi-guest-picker__trigger-copy">
          <strong>{t('common.guests').toUpperCase()}</strong>
          <span>{guestSummary(value, t('common.guest'), t('common.guests'))}</span>
        </span>
        {open ? <ChevronUp size={20} strokeWidth={2.8} /> : <ChevronDown size={20} strokeWidth={2.8} />}
      </button>

      {open && (
        <div className="roomi-guest-picker__popover" role="dialog" aria-label={t('common.guestSelection')}>
          <GuestRow
            title={t('common.adults')}
            description={t('common.age13')}
            value={value.adults}
            min={1}
            disableIncrement={adultOrChildLimitReached}
            onChange={(nextValue) => update('adults', nextValue)}
          />
          <GuestRow
            title={t('common.children')}
            description={t('common.ages2to12')}
            value={value.children}
            min={0}
            disableIncrement={adultOrChildLimitReached}
            onChange={(nextValue) => update('children', nextValue)}
          />
          <GuestRow
            title={t('common.infants')}
            description={infantsAllowed ? t('common.under2') : t('common.notAllowedForStay')}
            value={value.infants}
            min={0}
            disableIncrement={!infantsAllowed}
            onChange={(nextValue) => update('infants', nextValue)}
          />
          <GuestRow
            title={t('common.pets')}
            description={petsAllowed ? t('common.serviceAnimal') : t('common.notAllowedForStay')}
            value={value.pets}
            min={0}
            disableIncrement={!petsAllowed}
            onChange={(nextValue) => update('pets', nextValue)}
          />
          <p className="roomi-guest-picker__hint">{t('common.guestCapacityHint')}</p>
        </div>
      )}
    </div>
  )
}
