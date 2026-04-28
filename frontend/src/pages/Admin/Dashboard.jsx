import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../../services/api'
import { Package, Users, Receipt, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtMoney as fmt } from '../../utils/format'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats().then((r) => r.data.data),
    refetchInterval: 30000,
  })

  const stats = [
    {
      title: 'Sản phẩm đang bán',
      value: data?.products?.active_count || 0,
      sub: `${data?.products?.sold_count || 0} đã bán`,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      to: '/admin/products',
    },
    {
      title: 'Khách hàng',
      value: data?.consignors?.total || 0,
      sub: 'Tổng khách ký gửi',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      to: '/admin/consignors',
    },
    {
      title: 'Quyết toán chờ',
      value: data?.settlements?.pending_count || 0,
      sub: `Cần trả: ${fmt(data?.settlements?.pending_payout)}`,
      icon: Receipt,
      color: 'bg-amber-50 text-amber-600',
      to: '/admin/settlements',
    },
    {
      title: 'Yêu cầu ký gửi',
      value: data?.consignment_requests?.pending || 0,
      sub: 'Chưa xử lý',
      icon: ClipboardList,
      color: 'bg-green-50 text-green-600',
      to: '/admin/consignments',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">Thống kê hoạt động của cửa hàng</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ title, value, sub, icon: Icon, color, to }) => (
            <Link key={title} to={to} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-hun-brown transition-colors">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Revenue highlight */}
      {data?.products && (
        <div className="mt-8 bg-hun-black text-white rounded-lg p-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">Doanh thu tổng (sản phẩm đã bán)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Tổng bán ra</p>
              <p className="font-serif text-3xl font-bold">{fmt(data.products.total_revenue)}</p>
            </div>
            <div className="sm:border-l sm:border-gray-700 sm:pl-6">
              <p className="text-xs text-amber-400 mb-1">REVA thu</p>
              <p className="font-serif text-3xl font-bold text-amber-400">{fmt(data.products.total_commission)}</p>
            </div>
            <div className="sm:border-l sm:border-gray-700 sm:pl-6">
              <p className="text-xs text-gray-400 mb-1">Trả khách hàng</p>
              <p className="font-serif text-3xl font-bold text-gray-300">{fmt(data.products.total_payout_all)}</p>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-gray-800">
            <Link to="/admin/products?status=sold" className="text-sm text-gray-400 hover:text-white transition-colors">
              Xem chi tiết sản phẩm đã bán →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
