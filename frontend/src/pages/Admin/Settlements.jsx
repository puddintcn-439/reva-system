import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminSettlements, getSettlement, createSettlement, bulkCreateSettlements, markSettlementPaid, cancelSettlement, deleteSettlement, getConsignors,
} from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, X, Ban, ListChecks, Trash2 } from 'lucide-react'
import { fmtMoney as fmt } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

const STATUS = {
  pending:   { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-700' },
  paid:      { label: 'Đã thanh toán',  cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Đã hủy',         cls: 'bg-gray-100 text-gray-500' },
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const fmtISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const defaultPeriodStart = fmtISO(new Date(now.getFullYear(), now.getMonth(), 1))
const defaultPeriodEnd   = fmtISO(new Date(now.getFullYear(), now.getMonth() + 1, 0))

export default function Settlements() {
  const [filters, setFilters] = useState({ status: '', page: 1 })
  const [createModal, setCreateModal] = useState(false)
  const [bulkModal, setBulkModal]     = useState(false)
  const [detailId, setDetailId]       = useState(null)
  const [payModal, setPayModal]       = useState(null) // settlement to mark paid
  const [payNotes, setPayNotes]       = useState('')
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settlements', filters],
    queryFn: () => getAdminSettlements(filters).then((r) => r.data),
  })
  const { data: consignors = [] } = useQuery({
    queryKey: ['consignors', { limit: 200 }],
    queryFn: () => getConsignors({ limit: 200 }).then((r) => r.data.data),
  })
  const { data: detailData } = useQuery({
    queryKey: ['settlement-detail', detailId],
    queryFn: () => detailId ? getSettlement(detailId).then((r) => r.data.data) : null,
    enabled: !!detailId,
  })

  const createMut = useMutation({
    mutationFn: createSettlement,
    onSuccess: () => { qc.invalidateQueries(['admin-settlements']); setCreateModal(false); toast.success('Đã tạo quyết toán') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi tạo quyết toán'),
  })
  const payMut = useMutation({
    mutationFn: ({ id, notes }) => markSettlementPaid(id, notes),
    onSuccess: () => {
      qc.invalidateQueries(['admin-settlements'])
      toast.success('Đã đánh dấu thanh toán')
      setPayModal(null)
      setPayNotes('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const cancelMut = useMutation({
    mutationFn: cancelSettlement,
    onSuccess: () => { qc.invalidateQueries(['admin-settlements']); toast.success('Đã hủy quyết toán') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const bulkMut = useMutation({
    mutationFn: bulkCreateSettlements,
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-settlements'])
      setBulkModal(false)
      toast.success(res.data.message)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi tạo quyết toán'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteSettlement,
    onSuccess: () => { qc.invalidateQueries(['admin-settlements']); toast.success('Đã xóa quyết toán') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi xóa quyết toán'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    createMut.mutate(Object.fromEntries(fd.entries()))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quyết toán</h1>
        <div className="flex gap-2">
          <button onClick={() => setBulkModal(true)} className="btn-outline text-sm gap-2">
            <ListChecks size={16} /> Tạo tất cả
          </button>
          <button onClick={() => setCreateModal(true)} className="btn-primary text-sm gap-2">
            <Plus size={16} /> Tạo quyết toán
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="form-input w-48"
        >
          <option value="">Tất cả</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Mã QT', 'Khách hàng', 'Kỳ thanh toán', 'Tổng bán', 'Phí REVA', 'Khách nhận', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Đang tải...</td></tr>}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Chưa có quyết toán nào</td></tr>
              )}
              {data?.data?.map((s) => {
                const st = STATUS[s.status] || STATUS.pending
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}<p className="text-xs text-gray-400">{s.phone}</p></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                    <td className="px-4 py-3">{fmt(s.total_sale)}</td>
                    <td className="px-4 py-3 text-gray-400">{fmt(s.total_commission)}</td>
                    <td className="px-4 py-3 text-hun-green font-semibold">{fmt(s.total_payout)}</td>
                    <td className="px-4 py-3"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setDetailId(s.id)} className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100">
                          <Eye size={15} />
                        </button>
                        {s.status === 'pending' && (
                          <button
                            onClick={() => { setPayModal(s); setPayNotes('') }}
                            title="Xác nhận đã thanh toán"
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {(s.status === 'pending' || (Number(s.total_payout) === 0 && s.status !== 'cancelled')) && (
                          <button
                            onClick={() => { if (window.confirm(`Hủy quyết toán ${s.code}? Hành động này không thể hoàn tác.`)) cancelMut.mutate(s.id) }}
                            title="Hủy quyết toán"
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                        {Number(s.total_payout) === 0 && isAdmin && (
                          <button
                            onClick={() => { if (window.confirm(`Xóa vĩnh viễn quyết toán ${s.code}?`)) deleteMut.mutate(s.id) }}
                            title="Xóa quyết toán"
                            className="p-1.5 text-gray-400 hover:text-red-700 rounded hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk create modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Tạo quyết toán cho tất cả</h2>
              <button onClick={() => setBulkModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.target)
              bulkMut.mutate(Object.fromEntries(fd.entries()))
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Từ ngày *</label>
                  <input name="period_start" type="date" required className="form-input" defaultValue={defaultPeriodStart} />
                </div>
                <div>
                  <label className="form-label">Đến ngày *</label>
                  <input name="period_end" type="date" required className="form-input" defaultValue={defaultPeriodEnd} />
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                Hệ thống sẽ tự động tạo quyết toán cho <strong>tất cả khách hàng</strong> có sản phẩm đã bán trong kỳ này chưa được quyết toán. Khách có số tiền = 0 sẽ bỏ qua.
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setBulkModal(false)} className="btn-outline text-sm">Hủy</button>
                <button type="submit" disabled={bulkMut.isPending} className="btn-primary text-sm">
                  {bulkMut.isPending ? 'Đang tạo...' : 'Tạo tất cả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Tạo quyết toán mới</h2>
              <button onClick={() => setCreateModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="form-label">Khách hàng *</label>
                <select name="consignor_id" required className="form-input">
                  <option value="">-- Chọn khách hàng --</option>
                  {consignors.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Từ ngày *</label>
                  <input name="period_start" type="date" required className="form-input" defaultValue={defaultPeriodStart} />
                </div>
                <div>
                  <label className="form-label">Đến ngày *</label>
                  <input name="period_end" type="date" required className="form-input" defaultValue={defaultPeriodEnd} />
                </div>
              </div>
              <div>
                <label className="form-label">Ghi chú</label>
                <textarea name="notes" rows={2} className="form-input" />
              </div>
              <p className="text-xs text-gray-400">Hệ thống tự động tổng hợp sản phẩm đã bán trong khoảng thời gian này.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-outline text-sm">Hủy</button>
                <button type="submit" disabled={createMut.isPending} className="btn-primary text-sm">Tạo quyết toán</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6">
            <h3 className="font-bold text-lg mb-1 text-green-700">Xác nhận đã thanh toán</h3>
            <p className="text-sm text-gray-600 mb-1">
              Quyết toán <span className="font-mono font-semibold">{payModal.code}</span> — <span className="font-semibold">{payModal.full_name}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Số tiền cần chuyển: <span className="font-bold text-green-700">{fmt(payModal.total_payout)}</span>
            </p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 mb-4"
              rows={3}
              placeholder="Ghi chú thanh toán: số TK, mã GD, ngân hàng... (tùy chọn)"
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50"
              >Hủy</button>
              <button
                onClick={() => payMut.mutate({ id: payModal.id, notes: payNotes })}
                disabled={payMut.isPending}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 disabled:opacity-50"
              >{payMut.isPending ? 'Đang lưu...' : 'Xác nhận đã thanh toán'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailId && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Chi tiết quyết toán {detailData.code}</h2>
              <button onClick={() => setDetailId(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Tổng bán', value: fmt(detailData.total_sale) },
                  { label: 'Phí REVA',  value: fmt(detailData.total_commission) },
                  { label: 'Khách nhận', value: fmt(detailData.total_payout), bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="bg-hun-cream p-4 text-center border border-hun-beige">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`font-semibold ${bold ? 'text-hun-green text-lg' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>
              {detailData.notes && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2 mb-4">Ghi chú: {detailData.notes}</p>
              )}
              {detailData.payment_notes && detailData.status === 'paid' && (
                <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2 mb-4">
                  Thông tin thanh toán: {detailData.payment_notes}
                </p>
              )}

              {/* QR + mark paid — only show when pending and consignor has bank info */}
              {detailData.status === 'pending' && detailData.bank_id && detailData.bank_account_no && (
                <div className="border rounded-xl p-4 flex flex-col items-center gap-2 bg-blue-50 mb-6">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">QR thanh toán cho khách hàng</p>
                  <img
                    src={`https://img.vietqr.io/image/${detailData.bank_id}-${detailData.bank_account_no}-compact2.png?amount=${Number(detailData.total_payout)}&addInfo=QT${detailData.code}`}
                    alt="QR thanh toán"
                    className="w-52 h-52 object-contain"
                  />
                  <p className="text-xs text-gray-600 font-medium">{detailData.bank_account_name || detailData.full_name}</p>
                  <p className="text-xs text-gray-400">{detailData.bank_id} · {detailData.bank_account_no}</p>
                  <p className="text-sm font-bold text-blue-700">{fmt(detailData.total_payout)}</p>
                  <button
                    onClick={() => { setPayModal(detailData); setDetailId(null); setPayNotes('') }}
                    className="mt-2 flex items-center gap-2 bg-green-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-green-700"
                  >
                    <CheckCircle size={16} /> Đã chuyển khoản
                  </button>
                </div>
              )}
              {detailData.status === 'pending' && (!detailData.bank_id || !detailData.bank_account_no) && (
                <div className="border border-amber-200 rounded-lg px-4 py-3 bg-amber-50 text-sm text-amber-700 mb-4">
                  Khách hàng chưa có thông tin ngân hàng. Vào trang <strong>Khách hàng</strong> để cập nhật STK.
                </div>
              )}

              {detailData.items?.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {['Sản phẩm', 'Mã', 'Giá bán', 'Phí', 'KH nhận'].map((h) => (
                        <th key={h} className="text-left py-2 text-xs text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailData.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2">{item.product_name}</td>
                        <td className="py-2 text-xs text-gray-400">{item.product_code}</td>
                        <td className="py-2">{fmt(item.sale_price)}</td>
                        <td className="py-2 text-gray-400">{fmt(item.commission)}</td>
                        <td className="py-2 text-hun-green font-medium">{fmt(item.consignor_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
