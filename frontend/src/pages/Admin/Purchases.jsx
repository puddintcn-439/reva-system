import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchaseRequests, updatePurchaseStatus } from '../../services/api'
import toast from 'react-hot-toast'
import { Eye, X } from 'lucide-react'

const STATUS = {
  pending:   { label: 'Chờ xử lý',  cls: 'bg-yellow-100 text-yellow-700' },
  contacted: { label: 'Đã liên hệ', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Từ chối',    cls: 'bg-red-100 text-red-600' },
}
const TYPE_LABELS = { no_brand: 'No Brand', brand: 'Brand', accessories: 'Phụ kiện' }
const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—'

export default function Purchases() {
  const [filters, setFilters] = useState({ status: '', page: 1 })
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', filters],
    queryFn: () => getPurchaseRequests(filters).then((r) => r.data),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePurchaseStatus(id, data),
    onSuccess: () => { qc.invalidateQueries(['purchases']); toast.success('Đã cập nhật') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold">Yêu cầu thu mua</h1></div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} className="form-input w-48">
          <option value="">Tất cả</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Họ tên', 'SĐT', 'Loại đồ', 'Số lượng', 'Cơ sở', 'Trạng thái', 'Ngày gửi', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Đang tải...</td></tr>}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Chưa có yêu cầu nào</td></tr>
              )}
              {data?.data?.map((r) => {
                const s = STATUS[r.status] || STATUS.pending
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.phone}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[r.item_type] || r.item_type}</td>
                    <td className="px-4 py-3 text-gray-500">{r.quantity_kg ? `${r.quantity_kg} kg` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.location_name || '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(r)} className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Chi tiết yêu cầu thu mua</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Họ tên', selected.full_name],
                ['SĐT', selected.phone],
                ['Email', selected.email || '—'],
                ['Loại đồ', TYPE_LABELS[selected.item_type] || selected.item_type],
                ['Số lượng', selected.quantity_kg ? `${selected.quantity_kg} kg` : '—'],
                ['Cơ sở', selected.location_name || '—'],
                ['Mô tả', selected.description || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3"><span className="text-gray-400 w-24 shrink-0">{k}:</span><span>{v}</span></div>
              ))}

              <div className="border-t pt-3 mt-3">
                <label className="form-label">Cập nhật trạng thái</label>
                <select
                  defaultValue={selected.status}
                  onChange={(e) => {
                    updateMut.mutate({ id: selected.id, data: { status: e.target.value } })
                    setSelected(null)
                  }}
                  className="form-input"
                >
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
