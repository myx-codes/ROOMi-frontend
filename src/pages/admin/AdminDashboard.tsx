import { Routes, Route, Navigate } from 'react-router-dom'
import { Home, Users, Newspaper, BarChart3 } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getMemberProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useI18n } from '@/i18n'
import AdminProperties from './AdminProperties'
import AdminUsers from './AdminUsers'
import AdminBookings from './AdminBookings'
import AdminAnalytics from './AdminAnalytics'

export default function AdminDashboard() {
  const { t, memberTypeLabel } = useI18n()
  const profile = getMemberProfile()

  const navItems = [
    { label: t('common.properties'), path: '/admin', icon: <Home className="w-4 h-4" /> },
    { label: t('common.users'), path: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: t('common.articles'), path: '/admin/articles', icon: <Newspaper className="w-4 h-4" /> },
    { label: t('common.analytics'), path: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  if (!profile) {
    return <Navigate to="/sign-in" replace />
  }

  if (profile.memberType !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar forceSolid />
      <div className="roomi-dashboard-shell">
        <DashboardLayout
          title={t('admin.dashboard')}
          navItems={navItems}
          basePath="/admin"
          showTopBar={false}
          contextBar={
            <div className="rounded-3xl border border-border bg-card/80 px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('admin.dashboard')}</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
                    {profile?.memberNick || profile?.memberFullName || t('admin.dashboard')}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('myPage.manageAccountDetails')}</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
                  {memberTypeLabel(profile?.memberType)}
                </Badge>
              </div>
            </div>
          }
        >
          <Routes>
            <Route index element={<AdminProperties />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="articles" element={<AdminBookings />} />
            <Route path="bookings" element={<Navigate to="/admin/articles" replace />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </DashboardLayout>
      </div>
      <Footer />
    </div>
  )
}
