import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ChatbotWidget } from './components/ChatbotWidget'

const Properties = lazy(() => import('./pages/Properties'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard'))
const MyPage = lazy(() => import('./pages/mypage/MyPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return <div className="min-h-screen bg-white" aria-label="Loading" />
}

/** ROOMi is a browse-first marketplace; the root route intentionally opens search. */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <ChatbotWidget />
        <Routes>
          <Route path="/" element={<Navigate to="/properties" replace />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          {/* Airbnb-style public aliases: discovery is the browse home and
              /rooms/:id is the canonical-looking detail URL used in shares. */}
          <Route path="/discover" element={<Navigate to="/properties" replace />} />
          <Route path="/rooms/:id" element={<PropertyDetail />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/agent/*" element={<AgentDashboard />} />
          <Route path="/my-page/*" element={<MyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
