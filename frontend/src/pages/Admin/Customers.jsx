import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { posGetCustomers, posGetCustomer } from '../../services/api'
import { Eye, X, Phone, ShoppingBag, Calendar, TrendingUp } from 'lucide-react'
import { fmtMoney as fmt } from '../../utils/format'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const PAYMENT_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', mixed: 'Kết hợp' }
const STATUS_LABELS  = { pending: 'Chưa thu', paid: 'Đã thu', cancelled: 'Đã hủy' }
const STATUS_CLS     = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

function CustomerDetail({ id, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-detail', id],
    queryFn: () => posGetCustomer(id).then(r => r.data.data),
    enabled: !!id,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{data?.name || '...'}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Phone size={13} /> {data?.phone}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <ShoppingBag size={18} className="mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-blue-700">{data?.purchase_count || 0}</p>
                <p className="text-xs text-blue-500">Lần mua</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <TrendingUp size={18} className="mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-green-700">{fmt(data?.total_spent || 0)}</p>
                <p className="text-xs text-green-500">Tổng chi tiêu</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Calendar size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-sm font-semibold text-gray-700">{fmtDate(data?.last_purchase_at)}</p>
                <p className="text-xs text-gray-400">Mua gần nhất</p>
              </div>
            </div>

            {/* Notes */}
            {data?.notes && (
              <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                <span className="font-medium">Ghi chú: </span>{data.notes}
              </div>
            )}

            {/* Purchase history */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Lịch sử mua hàng</h3>
              {!data?.sales?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có hóa đơn</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Mã HD', 'Thời gian', 'SP', 'Tổng tiền', 'PT', 'TT'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.sales.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs font-medium text-hun-brown">{s.invoice_code}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{fmtDateTime(s.created_at)}</td>
                          <td className="px-3 py-2 text-center text-xs">{s.item_count}</td>
                          <td className="px-3 py-2 font-medium tabular-nums">{fmt(s.final_amount)}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{PAYMENT_LABELS[s.payment_method] || s.payment_method}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_CLS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_LABELS[s.status] || s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [detailId, setDetailId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, search }],
    queryFn: () => posGetCustomers({ page, search, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const pagination = data?.pagination

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Khách hàng mua hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Tự động lưu từ lịch sử giao dịch POS</p>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          className="w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
        />
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Tên khách hàng', 'Số điện thoại', 'Số lần mua', 'Tổng chi tiêu', 'Mua gần nhất', 'Ngày tạo', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
              )}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Chưa có khách hàng nào</td></tr>
              )}
              {data?.data?.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {c.purchase_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-green-700">{fmt(c.total_spent || 0)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDateTime(c.last_purchase_at)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailId(c.id)}
                      className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100"
                      title="Xem chi tiết"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>Tổng: {pagination.total} khách hàng</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >‹</button>
              <span className="px-3 py-1">{page} / {pagination.pages}</span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >›</button>
            </div>
          </div>
        )}
        {pagination && pagination.pages <= 1 && data?.data?.length > 0 && (
          <div className="border-t px-4 py-3 text-xs text-gray-400">
            Tổng: {pagination.total} khách hàng
          </div>
        )}
      </div>

      {detailId && <CustomerDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
