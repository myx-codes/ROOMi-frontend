import { DollarSign, TrendingUp, CalendarCheck, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_BOOKINGS_FOR_MY_PROPERTIES } from '@/graphql/user/query'
import { useI18n } from '@/i18n'

type BookingStatus = 'CONFIRMED' | 'WAITING' | 'CANCELLED' | 'FINISHED'

type ApiBooking = {
  _id: string
  bookingStatus: BookingStatus
  bookingCheckIn?: string | null
  bookingCheckOut?: string | null
  bookingGuests: number
  totalPrice?: number | null
  propertyData?: {
    _id: string
    propertyTitle?: string | null
  } | null
  memberData?: {
    _id: string
    memberNick?: string | null
  } | null
}

type TotalCounter = {
  total?: number | null
}

type GetBookingsForMyPropertiesResponse = {
  getBookingsForMyProperties: {
    list: ApiBooking[]
    metaCounter?: TotalCounter[] | TotalCounter | null
  }
}

type GetBookingsForMyPropertiesVariables = {
  input: {
    page: number
    limit: number
  }
}

function resolveTotal(metaCounter?: TotalCounter[] | TotalCounter | null): number | null {
  if (!metaCounter) return null
  if (Array.isArray(metaCounter)) {
    return typeof metaCounter[0]?.total === 'number' ? metaCounter[0].total : null
  }
  return typeof metaCounter.total === 'number' ? metaCounter.total : null
}

export default function AgentEarnings() {
  const { t, formatNumber, bookingStatusShortLabel } = useI18n()
  const { data, loading, error } = useQuery<
    GetBookingsForMyPropertiesResponse,
    GetBookingsForMyPropertiesVariables
  >(GET_BOOKINGS_FOR_MY_PROPERTIES, {
    variables: {
      input: {
        page: 1,
        limit: 50,
      },
    },
    fetchPolicy: 'network-only',
  })

  const bookings = useMemo(() => {
    return (data?.getBookingsForMyProperties?.list || []).map((booking) => ({
      id: booking._id,
      propertyTitle: booking.propertyData?.propertyTitle || t('common.property'),
      guestName: booking.memberData?.memberNick || t('common.guest'),
      checkIn: booking.bookingCheckIn || '',
      checkOut: booking.bookingCheckOut || '',
      guests: booking.bookingGuests,
      total: booking.totalPrice ?? 0,
      status: booking.bookingStatus,
    }))
  }, [data, t])

  const totalCount = resolveTotal(data?.getBookingsForMyProperties?.metaCounter)
  const totalRevenue = useMemo(
    () => bookings.reduce((sum, booking) => sum + booking.total, 0),
    [bookings],
  )
  const revenueByStatus = useMemo(() => {
    return bookings.reduce(
      (acc, booking) => {
        acc[booking.status] += booking.total
        return acc
      },
      {
        CONFIRMED: 0,
        WAITING: 0,
        CANCELLED: 0,
        FINISHED: 0,
      } as Record<BookingStatus, number>,
    )
  }, [bookings])
  const averageBooking = bookings.length ? Math.round(totalRevenue / bookings.length) : 0

  const stats = [
    { label: t('agent.totalEarnings'), value: `${formatNumber(totalRevenue)} UZS`, icon: DollarSign },
    { label: `${bookingStatusShortLabel('CONFIRMED')} — ${t('common.earnings').toLowerCase()}`, value: `${formatNumber(revenueByStatus.CONFIRMED)} UZS`, icon: TrendingUp },
    { label: `${bookingStatusShortLabel('FINISHED')} — ${t('common.earnings').toLowerCase()}`, value: `${formatNumber(revenueByStatus.FINISHED)} UZS`, icon: CalendarCheck },
    { label: t('agent.averageBooking'), value: `${formatNumber(averageBooking)} UZS`, icon: Sparkles },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">{t('common.earnings')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('agent.revenueOverview')} · {t('agent.bookingsCount', { count: totalCount ?? bookings.length })}
        </p>
      </div>

      {loading && bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.loadingBookings')}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{t('common.failedToLoadBookings', { message: error.message })}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-6">
                <s.icon className="w-5 h-5 text-gold mb-3" />
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/70 p-5">
              <h3 className="font-display text-lg font-semibold text-foreground">{t('agent.revenueByStatus')}</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['CONFIRMED', revenueByStatus.CONFIRMED],
                  ['FINISHED', revenueByStatus.FINISHED],
                  ['WAITING', revenueByStatus.WAITING],
                  ['CANCELLED', revenueByStatus.CANCELLED],
                ].map(([status, value]) => (
                  <div key={status} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">{bookingStatusShortLabel(status)}</span>
                    <span className="text-sm font-semibold text-foreground">{formatNumber(value as number)} UZS</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-5">
              <h3 className="font-display text-lg font-semibold text-foreground">{t('agent.earningsNote')}</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {t('agent.earningsNoteDescription')}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {t('agent.earningsAutoCalculated')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
