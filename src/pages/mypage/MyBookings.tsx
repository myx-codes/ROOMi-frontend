import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { CheckCircle, Clock, XCircle, CircleDot, MapPin } from 'lucide-react'
import { GET_MY_BOOKINGS, GET_PROPERTIES } from '@/graphql/user/query'
import { CANCEL_BOOKING } from '@/graphql/user/mutation'
import { useI18n } from '@/i18n'
import { getMemberProfile } from '@/lib/auth'

type BookingStatus =
  | 'REQUESTED'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'WAITING'
  | 'FINISHED'

type ApiBooking = {
  _id: string
  bookingStatus: BookingStatus
  bookingStart?: string | null
  bookingEnd?: string | null
  bookingCheckIn?: string | null
  bookingCheckOut?: string | null
  bookingGuests: number
  totalPrice?: number | null
  currency?: string | null
  bookingPrice?: number | null
  propertyId: string
  createdAt: string
  propertyData?: {
    _id: string
    propertyType?: string | null
    propertyTitle: string
    propertyLocation?: string | null
    propertyAddress?: string | null
  } | null
}

type GetMyBookingsResponse = {
  getMyBookings: {
    list: ApiBooking[]
  }
}

type GetMyBookingsVariables = {
  input: {
    page: number
    limit: number
    bookingStatus?: BookingStatus
  }
}

type ApiProperty = {
  _id: string
  propertyType?: string | null
  propertyTitle?: string | null
  propertyLocation?: string | null
}

type GetPropertiesResponse = {
  getProperties: {
    list: ApiProperty[]
  }
}

type GetPropertiesVariables = {
  input: {
    page: number
    limit: number
    sort?: string
    direction?: 'ASC' | 'DESC'
    search: Record<string, never>
  }
}

const statusConfig = {
  REQUESTED: { icon: Clock, color: 'text-gold bg-gold/20' },
  AWAITING_PAYMENT: { icon: Clock, color: 'text-gold bg-gold/20' },
  CONFIRMED: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  WAITING: { icon: Clock, color: 'text-gold bg-gold/20' },
  CANCELLED: { icon: XCircle, color: 'text-destructive bg-destructive/10' },
  EXPIRED: { icon: XCircle, color: 'text-muted-foreground bg-muted' },
  COMPLETED: { icon: CircleDot, color: 'text-muted-foreground bg-muted' },
  FINISHED: { icon: CircleDot, color: 'text-muted-foreground bg-muted' },
}

const DELETED_BOOKINGS_NAMESPACE = 'roomi_deleted_bookings'

function getDeletedBookingsStorageKey(): string {
  const memberId = getMemberProfile()?._id?.trim() || 'guest'
  return `${DELETED_BOOKINGS_NAMESPACE}_${memberId}`
}

function readLocallyDeletedBookingIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(getDeletedBookingsStorageKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function writeLocallyDeletedBookingIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getDeletedBookingsStorageKey(), JSON.stringify(Array.from(new Set(ids))))
}

function canCancelByDate(checkInRaw?: string | null): boolean {
  if (!checkInRaw) return false

  const checkInDate = new Date(checkInRaw)
  if (Number.isNaN(checkInDate.getTime())) return false

  const endOfCheckInDay = new Date(checkInDate)
  endOfCheckInDay.setHours(23, 59, 59, 999)

  return Date.now() <= endOfCheckInDay.getTime()
}

function hasCheckInPassed(checkInRaw?: string | null): boolean {
  if (!checkInRaw) return false

  const checkInDate = new Date(checkInRaw)
  if (Number.isNaN(checkInDate.getTime())) return false

  const endOfCheckInDay = new Date(checkInDate)
  endOfCheckInDay.setHours(23, 59, 59, 999)

  return Date.now() > endOfCheckInDay.getTime()
}

function canCancelBooking(status: BookingStatus, checkInRaw?: string | null): boolean {
  if (!['REQUESTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'WAITING'].includes(status)) return false
  return canCancelByDate(checkInRaw)
}

function canDeleteBooking(status: BookingStatus, checkInRaw?: string | null): boolean {
  return ['CANCELLED', 'EXPIRED', 'COMPLETED', 'FINISHED'].includes(status) || hasCheckInPassed(checkInRaw)
}

function formatLocation(value?: string | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export default function MyBookings() {
  const { t, formatDate, formatNumber, propertyTypeLabel, bookingStatusShortLabel } = useI18n()
  const [triedPageZero, setTriedPageZero] = useState(false)
  const [locallyDeletedBookingIds, setLocallyDeletedBookingIds] = useState<string[]>(
    readLocallyDeletedBookingIds,
  )
  const [cancelBookingMutation, { loading: cancellingBooking }] = useMutation(CANCEL_BOOKING)

  const { data, loading, error, refetch } = useQuery<GetMyBookingsResponse, GetMyBookingsVariables>(GET_MY_BOOKINGS, {
    variables: {
      input: {
        page: 1,
        limit: 10,
      },
    },
    fetchPolicy: 'network-only',
  })

  const { data: propertiesData } = useQuery<GetPropertiesResponse, GetPropertiesVariables>(GET_PROPERTIES, {
    variables: {
      input: {
        page: 1,
        limit: 200,
        sort: 'createdAt',
        direction: 'DESC',
        search: {},
      },
    },
    fetchPolicy: 'cache-first',
  })

  useEffect(() => {
    const isEmpty = !loading && !error && (data?.getMyBookings?.list || []).length === 0
    if (isEmpty && !triedPageZero) {
      setTriedPageZero(true)
      void refetch({ input: { page: 1, limit: 10 } })
    }
  }, [data, error, loading, refetch, triedPageZero])

  useEffect(() => {
    writeLocallyDeletedBookingIds(locallyDeletedBookingIds)
  }, [locallyDeletedBookingIds])

  const cancelBooking = async (bookingId: string, bookingStatus: BookingStatus, checkInRaw?: string | null) => {
    if (!canCancelBooking(bookingStatus, checkInRaw)) {
      const message = t('myPage.cancelAllowedUntil')
      window.alert(`${t('myPage.cannotCancelBooking')}: ${message}`)
      return
    }

    await cancelBookingMutation({ variables: { bookingId } })
    await refetch()
    window.alert(`${t('myPage.cancelledSuccessfully')}: ${t('myPage.bookingCancelled')}`)
  }

  const deleteBooking = async (bookingId: string, bookingStatus: BookingStatus, checkInRaw?: string | null) => {
    if (!canDeleteBooking(bookingStatus, checkInRaw)) {
      const message = t('myPage.deleteAllowed')
      window.alert(`${t('myPage.cannotDeleteBooking')}: ${message}`)
      return
    }

    const confirmation = window.confirm(`${t('myPage.deleteBookingTitle')}\n\n${t('myPage.deleteBookingText')}`)
    if (!confirmation) return

    setLocallyDeletedBookingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]))

    window.alert(`${t('myPage.cancelledSuccessfully')}: ${t('myPage.bookingDeleteSuccess')}`)
  }

  const myBookings = useMemo(
    () => {
      const propertyById = new Map((propertiesData?.getProperties?.list || []).map((item) => [item._id, item]))

      return (data?.getMyBookings?.list || [])
        .filter((booking) => !locallyDeletedBookingIds.includes(booking._id))
        .map((booking) => {
        const propertyFromList = propertyById.get(booking.propertyId)
        const propertyType = booking.propertyData?.propertyType || propertyFromList?.propertyType
        const propertyTitle = booking.propertyData?.propertyTitle || propertyFromList?.propertyTitle
        const propertyLocation = booking.propertyData?.propertyLocation || propertyFromList?.propertyLocation

        const checkInRaw = booking.bookingCheckIn || booking.bookingStart || null
        const checkOutRaw = booking.bookingCheckOut || booking.bookingEnd || null

        return {
          id: booking._id,
          propertyTypeLabel: propertyTypeLabel(propertyType),
          propertyTitle: propertyTitle || propertyTypeLabel(propertyType),
          propertyLocation: formatLocation(propertyLocation),
          checkInRaw,
          checkOutRaw,
          bookedAt: booking.createdAt,
          guests: booking.bookingGuests,
          total: booking.totalPrice ?? booking.bookingPrice ?? 0,
          currency: booking.currency || 'UZS',
          status: booking.bookingStatus,
        }
      })
    },
    [data, locallyDeletedBookingIds, propertiesData, propertyTypeLabel],
  )

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">{t('common.bookings')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('agent.bookingsCount', { count: myBookings.length })}</p>
      </div>

      {myBookings.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">{t('common.noBookings')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myBookings.map((b) => {
            const cfg = statusConfig[b.status]
            const Icon = cfg.icon
            const isCancelled = b.status === 'CANCELLED'
            const canCancel = canCancelBooking(b.status, b.checkInRaw)
            const canDelete = canDeleteBooking(b.status, b.checkInRaw)

            return (
              <div key={b.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-display text-lg font-semibold text-foreground">{b.propertyTitle}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{t('common.type')}: {b.propertyTypeLabel}</p>
                    {b.propertyLocation && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {b.propertyLocation}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('common.stay')}: {formatDate(b.checkInRaw)} → {formatDate(b.checkOutRaw)} · {b.guests} {b.guests > 1 ? t('common.guests') : t('common.guest')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('common.bookedOn')}: {formatDate(b.bookedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatNumber(b.total)} {b.currency}</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />{bookingStatusShortLabel(b.status)}
                    </span>
                    <div className="mt-2 flex flex-col items-end gap-2">
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(b.id, b.status, b.checkInRaw)}
                          disabled={cancellingBooking}
                          className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold gentle-animation ${
                            canCancel
                              ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {t('myPage.cancelBookingAction')}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void deleteBooking(b.id, b.status, b.checkInRaw)}
                          className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground gentle-animation hover:bg-muted hover:text-destructive"
                        >
                          {t('myPage.deleteBookingAction')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground mt-4">{t('common.loadingBookings')}</p>}
      {error && <p className="text-sm text-destructive mt-4">{t('common.failedToLoadBookings', { message: error.message })}</p>}
    </div>
  )
}
