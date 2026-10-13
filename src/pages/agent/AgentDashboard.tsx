import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Home, CalendarCheck, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@apollo/client/react'
import { useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getMemberProfile } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useI18n } from '@/i18n'
import { GET_AGENT_DASHBOARD_OVERVIEW } from '@/graphql/user/query'
import AgentProperties from './AgentProperties'
import AgentBookings from './AgentBookings'
import AgentEarnings from './AgentEarnings'
import AgentUnits from './AgentUnits'

type AgentDashboardOverview = {
  getAgentDashboardOverview: {
    propertyStats: {
      totalProperties: number
      activeProperties: number
      holdProperties: number
      bookedProperties: number
      dynamicPricingProperties: number
      averagePropertyPrice: number
      totalPropertyViews: number
      totalPropertyLikes: number
    }
    bookingStats: {
      totalBookings: number
      confirmedBookings: number
      waitingBookings: number
      cancelledBookings: number
      finishedBookings: number
      upcomingBookings: number
      totalRevenue: number
      averageBookingValue: number
    }
    recentProperties: Array<{
      _id: string
      propertyTitle: string
      propertyType: string
      propertyStatus: string
      propertyPrice: number
      propertyViews: number
      propertyLikes: number
      dynamicPricingEnabled: boolean
      createdAt: string
    }>
    recentBookings: Array<{
      _id: string
      bookingStatus: string
      bookingStart: string
      bookingEnd: string
      totalPrice: number
      bookingGuests: number
      propertyTitle?: string | null
      memberNick?: string | null
      createdAt: string
    }>
  }
}

export default function AgentDashboard() {
  const {
    t,
    memberTypeLabel,
    memberStatusLabel,
    bookingStatusShortLabel,
    propertyTypeLabel,
    propertyStatusLabel,
    formatDate,
    formatNumber,
  } = useI18n()
  const profile = getMemberProfile()
  const location = useLocation()
  const { data: overviewData } = useQuery<AgentDashboardOverview>(GET_AGENT_DASHBOARD_OVERVIEW, {
    skip: !profile || profile.memberType !== 'AGENT',
    fetchPolicy: 'network-only',
  })

  const overview = overviewData?.getAgentDashboardOverview
  const propertyStats = overview?.propertyStats
  const bookingStats = overview?.bookingStats
  const recentProperties = overview?.recentProperties || []
  const recentBookings = overview?.recentBookings || []

  const navItems = [
    { label: t('agent.myProperties'), path: '/agent/properties', icon: <Home className="w-4 h-4" /> },
    { label: t('common.bookings'), path: '/agent/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: t('common.earnings'), path: '/agent/earnings', icon: <DollarSign className="w-4 h-4" /> },
  ]

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/agent/bookings')) return t('common.bookings')
    if (location.pathname.startsWith('/agent/earnings')) return t('common.earnings')
    return t('agent.myProperties')
  }, [location.pathname, t])

  const contextBar = profile ? (() => {
    const accountHeader = (
      <div className="rounded-3xl border border-border bg-card/80 px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('agent.dashboard')}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
              {profile.memberNick || profile.memberFullName || t('agent.dashboard')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('myPage.manageAccountDetails')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
              {memberTypeLabel(profile.memberType)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {profile.memberStatus ? `${t('common.status')}: ${memberStatusLabel(profile.memberStatus)}` : ''}
            </span>
          </div>
        </div>
      </div>
    )

    if (location.pathname.startsWith('/agent/bookings')) {
      return (
        <div className="space-y-4">
          {accountHeader}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('common.bookings')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.totalBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(bookingStats?.confirmedBookings ?? 0)} {t('agent.confirmed').toLowerCase()} · {formatNumber(bookingStats?.upcomingBookings ?? 0)} {t('agent.upcoming').toLowerCase()}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.confirmed')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.confirmedBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.activeReservations')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.pending')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.waitingBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.needsAction')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.completed')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.finishedBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.finishedStays')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('common.bookings')}</h3>
              <span className="text-xs text-muted-foreground">{t('agent.recentCount', { count: 6 })}</span>
            </div>
            <div className="space-y-3">
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noBookings')}</p>
              ) : (
                recentBookings.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.propertyTitle || t('common.property')}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.memberNick || t('common.guest')} · {formatDate(item.bookingStart)} → {formatDate(item.bookingEnd)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatNumber(item.bookingGuests)} {item.bookingGuests === 1 ? t('common.guest') : t('common.guests')}</p>
                      <p>{bookingStatusShortLabel(item.bookingStatus)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )
    }

    if (location.pathname.startsWith('/agent/earnings')) {
      return (
        <div className="space-y-4">
          {accountHeader}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('common.earnings')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.totalRevenue ?? 0)} UZS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.allTimeRevenue')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.averageBooking')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.averageBookingValue ?? 0)} UZS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.averageBookingValue')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.confirmedBookings')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.confirmedBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.revenueGeneratingStays')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">{t('agent.waitingBookings')}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {formatNumber(bookingStats?.waitingBookings ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('agent.awaitingConfirmation')}</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {accountHeader}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs text-muted-foreground">{t('common.properties')}</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatNumber(propertyStats?.totalProperties ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(propertyStats?.activeProperties ?? 0)} {t('agent.active').toLowerCase()} · {formatNumber(propertyStats?.holdProperties ?? 0)} {t('agent.hold').toLowerCase()}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs text-muted-foreground">{t('agent.dynamicPricing')}</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatNumber(propertyStats?.dynamicPricingProperties ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(propertyStats?.totalPropertyViews ?? 0)} {t('agent.views')} · {formatNumber(propertyStats?.totalPropertyLikes ?? 0)} {t('agent.likes')}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs text-muted-foreground">{t('agent.averagePrice')}</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatNumber(propertyStats?.averagePropertyPrice ?? 0)} UZS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('agent.activeListings')}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs text-muted-foreground">{t('agent.booked')}</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {formatNumber(propertyStats?.bookedProperties ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('agent.activeReservationsListings')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{t('common.properties')}</h3>
            <span className="text-xs text-muted-foreground">{t('agent.recentCount', { count: 6 })}</span>
          </div>
          <div className="space-y-3">
            {recentProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('agent.noPropertiesYet')}</p>
            ) : (
              recentProperties.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.propertyTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {propertyTypeLabel(item.propertyType)} · {propertyStatusLabel(item.propertyStatus)} · {item.dynamicPricingEnabled ? t('agent.dynamicOn') : t('agent.static')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatNumber(item.propertyPrice)} UZS</p>
                    <p>{formatDate(item.createdAt, { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  })() : null

  return (
    <div className="min-h-screen bg-background">
      <Navbar forceSolid />
      <div className="roomi-dashboard-shell">
        <DashboardLayout
          title={pageTitle}
          navItems={navItems}
          basePath="/agent"
          showTopBar={false}
          contextBar={contextBar}
        >
          <Routes>
            <Route index element={<Navigate to="/agent/properties" replace />} />
            <Route path="properties" element={<AgentProperties />} />
            <Route path="bookings" element={<AgentBookings />} />
            <Route path="earnings" element={<AgentEarnings />} />
            <Route path="units/:propertyId" element={<AgentUnits />} />
            <Route path="*" element={<Navigate to="/agent/properties" replace />} />
          </Routes>
        </DashboardLayout>
      </div>
      <Footer />
    </div>
  )
}
