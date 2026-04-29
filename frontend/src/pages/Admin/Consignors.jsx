import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConsignors, getConsignor, updateConsignor } from '../../services/api'
import { Eye, X, Pencil } from 'lucide-react'
import { fmtMoney as fmt } from '../../utils/format'
import toast from 'react-hot-toast'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

export default function Consignors() {
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [detailId, setDetailId] = useState(null)
  const [editBank, setEditBank] = useState(false)
  const [bankForm, setBankForm] = useState({ bank_id: '', bank_account_no: '', bank_account_name: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['consignors', { page, search }],
    queryFn: () => getConsignors({ page, search, limit: 20 }).then((r) => r.data),
  })
  const { data: detail } = useQuery({
    queryKey: ['consignor-detail', detailId],
    queryFn: () => detailId ? getConsignor(detailId).then((r) => r.data.data) : null,
    enabled: !!detailId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateConsignor(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['consignor-detail', detailId])
      toast.success('Đã cập nhật thông tin ngân hàng')
      setEditBank(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi cập nhật'),
  })

  const openDetail = (id) => {
    setDetailId(id)
    setEditBank(false)
  }

  const STATUS_CLS = {
    active:  'bg-green-100 text-green-700',
    sold:    'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    returned:'bg-gray-100 text-gray-500',
    expired: 'bg-red-100 text-red-600',
  }
  const P_STATUS = { active:'Đang bán', sold:'Đã bán', pending:'Chờ', returned:'Trả', expired:'Hết hạn' }

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold">Khách hàng</h1></div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="form-input w-72"
          placeholder="Tìm theo tên, SĐT, mã..."
        />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Mã KH', 'Họ tên', 'SĐT', 'Email', 'SP đang ký gửi', 'SP đã bán', 'Ngày đăng ký', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Đang tải...</td></tr>}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Không tìm thấy</td></tr>
              )}
              {data?.data?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-hun-brown">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-center">{c.product_count || 0}</td>
                  <td className="px-4 py-3 text-center text-hun-green font-medium">{c.sold_count || 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(c.id)} className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>Tổng: {data.pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">← Trước</button>
              <span className="px-3 py-1">{page} / {data.pagination.pages}</span>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold">{detail.full_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detail.code} · {detail.phone}</p>
              </div>
              <button onClick={() => setDetailId(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Bank info */}
              <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Tài khoản ngân hàng</h3>
                  {!editBank && (
                    <button
                      onClick={() => {
                        setBankForm({
                          bank_id: detail.bank_id || '',
                          bank_account_no: detail.bank_account_no || '',
                          bank_account_name: detail.bank_account_name || '',
                        })
                        setEditBank(true)
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Pencil size={12} /> Chỉnh sửa
                    </button>
                  )}
                </div>
                {editBank ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Mã ngân hàng (VietQR)</label>
                        <input
                          value={bankForm.bank_id}
                          onChange={(e) => setBankForm(p => ({ ...p, bank_id: e.target.value.toUpperCase() }))}
                          className="form-input w-full text-sm"
                          placeholder="VD: TPB, VCB, TCB"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Số tài khoản</label>
                        <input
                          value={bankForm.bank_account_no}
                          onChange={(e) => setBankForm(p => ({ ...p, bank_account_no: e.target.value }))}
                          className="form-input w-full text-sm"
                          placeholder="Số tài khoản"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Tên chủ tài khoản</label>
                        <input
                          value={bankForm.bank_account_name}
                          onChange={(e) => setBankForm(p => ({ ...p, bank_account_name: e.target.value }))}
                          className="form-input w-full text-sm"
                          placeholder="Tên chủ TK"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Mã ngân hàng theo VietQR: TPB (TPBank), VCB (Vietcombank), TCB (Techcombank), MB (MBBank), VTB (Vietinbank), BIDV, ACB, MSB...</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMut.mutate({ id: detail.id, data: { ...detail, ...bankForm } })}
                        disabled={updateMut.isPending}
                        className="btn-primary text-sm py-1.5"
                      >
                        {updateMut.isPending ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button onClick={() => setEditBank(false)} className="btn-outline text-sm py-1.5">Hủy</button>
                    </div>
                  </div>
                ) : detail.bank_account_no ? (
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-400">Ngân hàng:</span> <strong>{detail.bank_id}</strong></p>
                    <p><span className="text-gray-400">STK:</span> <strong>{detail.bank_account_no}</strong></p>
                    <p><span className="text-gray-400">Chủ TK:</span> <strong>{detail.bank_account_name}</strong></p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có thông tin ngân hàng</p>
                )}
              </div>
              {/* Products */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Sản phẩm ký gửi ({detail.products?.length || 0})
              </h3>
              {detail.products?.length > 0 ? (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        {['Mã', 'Tên', 'Giá bán', 'KH nhận', 'Trạng thái'].map(h => (
                          <th key={h} className="text-left py-2 text-xs text-gray-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.products.map(p => (
                        <tr key={p.id}>
                          <td className="py-2 text-xs text-gray-400">{p.code}</td>
                          <td className="py-2">{p.name}</td>
                          <td className="py-2">{fmt(p.sale_price)}</td>
                          <td className="py-2 text-hun-green">{fmt(p.consignor_amount)}</td>
                          <td className="py-2"><span className={`badge ${STATUS_CLS[p.status] || ''}`}>{P_STATUS[p.status] || p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-gray-400 text-sm mb-6">Chưa có sản phẩm</p>}

              {/* Settlements */}
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Quyết toán ({detail.settlements?.length || 0})
              </h3>
              {detail.settlements?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {['Mã', 'Kỳ', 'Số tiền', 'Trạng thái'].map(h => (
                        <th key={h} className="text-left py-2 text-xs text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.settlements.map(s => (
                      <tr key={s.id}>
                        <td className="py-2 text-xs text-gray-400">{s.code}</td>
                        <td className="py-2 text-xs">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                        <td className="py-2 text-hun-green font-medium">{fmt(s.total_payout)}</td>
                        <td className="py-2">{s.status === 'paid' ? '✓ Đã trả' : 'Chờ thanh toán'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-gray-400 text-sm">Chưa có quyết toán</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
