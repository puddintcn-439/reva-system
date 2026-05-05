import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ClipboardList, Receipt,
  Users, ShoppingBag, Settings, LogOut, Menu, X, ScanBarcode, History, UserCog, UserCheck, BookOpen, MessageSquare,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// permission: which permission is needed to see this nav item (undefined = any authenticated user)
const NAV = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Tổng quan',         permission: 'dashboard:view' },
  { to: '/admin/pos',           icon: ScanBarcode,     label: 'Bán hàng (POS)',     permission: 'pos:sale' },
  { to: '/admin/sales-history', icon: History,         label: 'Lịch sử bán hàng',  permission: 'pos:history' },
  { to: '/admin/customers',     icon: UserCheck,       label: 'Khách hàng mua',     permission: 'pos:history' },
  { to: '/admin/products',      icon: Package,         label: 'Sản phẩm',           permission: 'products:view' },
  { to: '/admin/consignors',    icon: Users,           label: 'Khách hàng',         permission: 'consignors:view' },
  { to: '/admin/consignments',  icon: ClipboardList,   label: 'Yêu cầu ký gửi',     permission: 'consignments:view' },
  { to: '/admin/purchases',     icon: ShoppingBag,     label: 'Thu mua',             permission: 'purchases:view' },
  { to: '/admin/settlements',   icon: Receipt,         label: 'Quyết toán',          permission: 'settlements:view' },
  { to: '/admin/settings',      icon: Settings,        label: 'Cài đặt',             permission: 'settings:manage' },
  { to: '/admin/inbox',         icon: MessageSquare,   label: 'Hộp thư nội bộ',      permission: 'inbox:view' },
  { to: '/admin/guide',         icon: BookOpen,        label: 'Hướng dẫn sử dụng',  permission: undefined },
]

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', manager: 'Quản lý', staff: 'Nhân viên', cashier: 'Thu ngân', accountant: 'Kế toán', inventory: 'Quản lý kho', viewer: 'Chỉ xem' }
const ROLE_CLS   = { superadmin: 'bg-red-700 text-white', admin: 'bg-hun-brown text-white', manager: 'bg-indigo-600 text-white', staff: 'bg-blue-600 text-white', cashier: 'bg-gray-500 text-white', accountant: 'bg-green-700 text-white', inventory: 'bg-orange-600 text-white', viewer: 'bg-gray-400 text-white' }

export default function AdminLayout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Filter nav items the current user is allowed to see
  const visibleNav = [
    ...NAV.filter(({ permission }) => !permission || can(permission)),
    ...(can('users:manage') ? [{ to: '/admin/users', icon: UserCog, label: 'Tài khoản' }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const Sidebar = () => (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-hun-black text-white flex flex-col
      transform transition-transform duration-200 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0
    `}>
      <div className="p-6 border-b border-gray-800">
        <h1 className="font-serif text-xl font-bold tracking-widest">REVA Admin</h1>
        <p className="text-xs text-gray-400 mt-1">{user?.full_name || user?.username}</p>
        {user?.role && (
          <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_CLS[user.role] || 'bg-gray-500 text-white'}`}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-hun-brown text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4 shrink-0">
          <button
            className="lg:hidden p-1.5 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Xin chào, <strong>{user?.full_name || user?.username}</strong>
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
