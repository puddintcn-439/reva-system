import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

// Public layout & pages (eager — small, needed immediately)
import PublicLayout from './components/Layout/PublicLayout'
import Home     from './pages/Home'

// Public pages — lazy loaded
const About    = lazy(() => import('./pages/About'))
const Consign  = lazy(() => import('./pages/Consign'))
const Buy      = lazy(() => import('./pages/Buy'))
const Contact  = lazy(() => import('./pages/Contact'))
const Sales    = lazy(() => import('./pages/Sales'))

// Admin — all lazy loaded (heavy, authenticated-only)
const AdminLayout   = lazy(() => import('./components/Layout/AdminLayout'))
const AdminLogin    = lazy(() => import('./pages/Admin/Login'))
const Dashboard     = lazy(() => import('./pages/Admin/Dashboard'))
const Products      = lazy(() => import('./pages/Admin/Products'))
const Consignments  = lazy(() => import('./pages/Admin/Consignments'))
const Settlements   = lazy(() => import('./pages/Admin/Settlements'))
const Consignors    = lazy(() => import('./pages/Admin/Consignors'))
const Purchases     = lazy(() => import('./pages/Admin/Purchases'))
const Settings      = lazy(() => import('./pages/Admin/Settings'))
const POS           = lazy(() => import('./pages/Admin/POS'))
const SalesHistory  = lazy(() => import('./pages/Admin/SalesHistory'))
const Users         = lazy(() => import('./pages/Admin/Users'))

function PageLoader() {
  return <div className="min-h-screen flex items-center justify-center bg-hun-cream text-hun-brown text-sm tracking-widest">Đang tải...</div>
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
  return user ? children : <Navigate to="/admin/login" replace />
}

/** Redirect if user does not have the required permission */
function PermissionRoute({ permission, children }) {
  const { user, can } = useAuth()
  if (!user) return <Navigate to="/admin/login" replace />
  if (permission && !can(permission)) return <Navigate to="/admin/pos" replace />
  return children
}

/** Redirect to the first accessible page after login */
function DefaultAdminRedirect() {
  const { user, can } = useAuth()
  if (!user) return <Navigate to="/admin/login" replace />
  if (can('dashboard:view')) return <Navigate to="/admin/dashboard" replace />
  if (can('pos:sale')) return <Navigate to="/admin/pos" replace />
  if (can('pos:history')) return <Navigate to="/admin/sales-history" replace />
  return <Navigate to="/admin/products" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="about"   element={<About />} />
                <Route path="consign" element={<Consign />} />
                <Route path="buy"     element={<Buy />} />
                <Route path="contact" element={<Contact />} />
                <Route path="sales"   element={<Sales />} />
              </Route>

              {/* Admin login */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin protected */}
              <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
                <Route index element={<DefaultAdminRedirect />} />
                <Route path="dashboard"    element={<PermissionRoute permission="dashboard:view"><Dashboard /></PermissionRoute>} />
                <Route path="pos"          element={<PermissionRoute permission="pos:sale"><POS /></PermissionRoute>} />
                <Route path="sales-history" element={<PermissionRoute permission="pos:history"><SalesHistory /></PermissionRoute>} />
                <Route path="consignments" element={<PermissionRoute permission="consignments:view"><Consignments /></PermissionRoute>} />
                <Route path="products"     element={<PermissionRoute permission="products:view"><Products /></PermissionRoute>} />
                <Route path="consignors"   element={<PermissionRoute permission="consignors:view"><Consignors /></PermissionRoute>} />
                <Route path="settlements"  element={<PermissionRoute permission="settlements:view"><Settlements /></PermissionRoute>} />
                <Route path="purchases"    element={<PermissionRoute permission="purchases:view"><Purchases /></PermissionRoute>} />
                <Route path="settings"     element={<PermissionRoute permission="settings:manage"><Settings /></PermissionRoute>} />
                <Route path="users"        element={<PermissionRoute permission="users:manage"><Users /></PermissionRoute>} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
