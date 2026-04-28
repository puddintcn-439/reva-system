import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConsignments, updateConsignmentStatus } from '../../services/api'
import toast from 'react-hot-toast'
import { Eye, X } from 'lucide-react'

const STATUS = {
  pending:   { label: 'Chờ xử lý',  cls: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Đã duyệt',   cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Đang xử lý', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Hoàn thành', cls: 'bg-gray-100 text-gray-600' },
  rejected:  { label: 'Từ chối',    cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Đã hủy',     cls: 'bg-gray-100 text-gray-400' },
}
const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—'

export default function Consignments() {
  const [filters, setFilters] = useState({ status: '', page: 1 })
  const [selected, setSelected] = useState(null)
  const [statusForm, setStatusForm] = useState({ status: '', admin_notes: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['consignments', filters],
    queryFn: () => getConsignments(filters).then((r) => r.data),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateConsignmentStatus(id, data),
    onSuccess: () => { qc.invalidateQueries(['consignments']); toast.success('Đã cập nhật trạng thái') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Yêu cầu ký gửi</h1>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="form-input w-48"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Họ tên', 'SĐT', 'Mã KH', 'Hình thức', 'Cơ sở', 'Ngày hẹn', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Đang tải...</td></tr>}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Chưa có yêu cầu nào</td></tr>
              )}
              {data?.data?.map((r) => {
                const s = STATUS[r.status] || STATUS.pending
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.consignor_code}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.request_type === 'direct' ? 'Trực tiếp' : 'Online'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]">{r.location_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(r); setStatusForm({ status: r.status, admin_notes: r.admin_notes || '' }) }}
                        className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data?.pagination && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>Tổng: {data.pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="px-3 py-1 border rounded disabled:opacity-40">← Trước</button>
              <span className="px-3 py-1">{filters.page} / {data.pagination.pages}</span>
              <button disabled={filters.page >= data.pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="px-3 py-1 border rounded disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Chi tiết yêu cầu</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Họ tên', selected.full_name],
                ['SĐT', selected.phone],
                ['Email', selected.email || '—'],
                ['Hình thức', selected.request_type === 'direct' ? 'Trực tiếp' : 'Online'],
                ['Cơ sở', selected.location_name || '—'],
                ['Ngày hẹn', selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString('vi-VN') : '—'],
                ['Ghi chú KH', selected.notes || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3"><span className="text-gray-400 w-28 shrink-0">{k}:</span><span>{v}</span></div>
              ))}

              <div className="border-t pt-3 mt-3">
                <label className="form-label">Cập nhật trạng thái</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="form-input mb-3"
                >
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <label className="form-label">Ghi chú nội bộ</label>
                <textarea
                  value={statusForm.admin_notes}
                  onChange={(e) => setStatusForm({ ...statusForm, admin_notes: e.target.value })}
                  rows={3}
                  className="form-input"
                />
                <button
                  onClick={() => {
                    updateMut.mutate({ id: selected.id, data: statusForm })
                    setSelected(null)
                  }}
                  className="btn-primary text-sm mt-3"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
