import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { User, CalendarCheck, Heart, CreditCard } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useI18n } from '@/i18n'
import { getAuthChangedEventName, getMemberProfile } from '@/lib/auth'
import MyProfile from './MyProfile'
import MyBookings from './MyBookings'
import MyFavorites from './MyFavorites'
import MyPayments from './MyPayments'
import AgentProperties from '../agent/AgentProperties'
import AgentBookings from '../agent/AgentBookings'
import AgentEarnings from '../agent/AgentEarnings'

export default function MyPage() {
  const { t } = useI18n()
  const [memberType, setMemberType] = useState(getMemberProfile()?.memberType)

  useEffect(() => {
    const syncMemberType = () => {
      setMemberType(getMemberProfile()?.memberType)
    }

    const authEvent = getAuthChangedEventName()
    window.addEventListener('storage', syncMemberType)
    window.addEventListener(authEvent, syncMemberType)

    return () => {
      window.removeEventListener('storage', syncMemberType)
      window.removeEventListener(authEvent, syncMemberType)
    }
  }, [])

  const isAgent = memberType === 'AGENT'
  const isAdmin = memberType === 'ADMIN'

  const navItems = [
    { label: t('common.profile'), path: '/my-page', icon: <User className="w-4 h-4" /> },
    { label: t('common.bookings'), path: '/my-page/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: t('common.favorites'), path: '/my-page/favorites', icon: <Heart className="w-4 h-4" /> },
    { label: t('common.payments'), path: '/my-page/payments', icon: <CreditCard className="w-4 h-4" /> },
  ]

  const agentNavItems = [
    { label: t('agent.myProperties'), path: '/my-page', icon: <User className="w-4 h-4" /> },
    { label: t('common.bookings'), path: '/my-page/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: t('common.earnings'), path: '/my-page/earnings', icon: <CreditCard className="w-4 h-4" /> },
  ]

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar forceSolid />
      <div className="roomi-dashboard-shell">
        <DashboardLayout
          title={isAgent ? t('agent.dashboard') : t('myPage.myAccount')}
          navItems={isAgent ? agentNavItems : navItems}
          basePath="/my-page"
          showTopBar={false}
        >
          <Routes>
            {isAgent ? (
              <>
                <Route index element={<AgentProperties />} />
                <Route path="bookings" element={<AgentBookings />} />
                <Route path="earnings" element={<AgentEarnings />} />
              </>
            ) : (
              <>
                <Route index element={<MyProfile />} />
                <Route path="bookings" element={<MyBookings />} />
                <Route path="favorites" element={<MyFavorites />} />
                <Route path="payments" element={<MyPayments />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/my-page" replace />} />
          </Routes>
        </DashboardLayout>
      </div>
      <Footer />
    </div>
  )
}
