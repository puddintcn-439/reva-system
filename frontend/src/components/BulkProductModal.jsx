import { useState, useCallback } from 'react'
import { X, Plus, Trash2, Check } from 'lucide-react'
import { fmtMoney as fmt } from '../utils/format'

const calcCommission = (price) => {
  price = Number(price)
  if (!price) return { commission: 0, consignorAmount: 0 }
  if (price < 60000)  return { commission: 20000, consignorAmount: price - 20000 }
  if (price <= 130000) return { commission: 30000, consignorAmount: price - 30000 }
  const c = Math.round(price * 0.25)
  return { commission: c, consignorAmount: price - c }
}

const EMPTY_ROW = () => ({
  _id:              Math.random().toString(36).slice(2),
  name:             '',
  category_id:      '',
  condition_percent: 90,
  sale_price:       '',
  code:             '',
})

export default function BulkProductModal({ categories, locations, consignors, onSubmit, onClose, loading }) {
  const today = new Date().toISOString().slice(0, 10)
  const threeMonths = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10)

  // Shared fields applied to all rows
  const [shared, setShared] = useState({
    consignor_id:  '',
    location_id:   '',
    consign_start: today,
    consign_end:   threeMonths,
    status:        'active',
  })

  const [rows, setRows] = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()])

  const setSharedField = (k, v) => setShared(prev => ({ ...prev, [k]: v }))

  const setRowField = useCallback((id, k, v) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [k]: v } : r))
  }, [])

  const addRow = () => setRows(prev => [...prev, EMPTY_ROW()])

  const removeRow = (id) => setRows(prev => prev.filter(r => r._id !== id))

  const validRows = rows.filter(r => r.name.trim() && Number(r.sale_price) > 0)

  const handleSubmit = () => {
    if (validRows.length === 0) return
    const products = validRows.map(({ _id, ...r }) => ({
      ...r,
      condition_percent: Number(r.condition_percent) || 90,
      sale_price: Number(r.sale_price),
    }))
    onSubmit({ products, shared })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-semibold">Thêm nhiều sản phẩm cùng lúc</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {validRows.length}/{rows.length} dòng hợp lệ (có tên + giá bán)
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Shared fields */}
        <div className="px-6 py-3 bg-gray-50 border-b shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Thông tin chung (áp dụng cho tất cả dòng)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="form-label text-xs">Khách hàng ký gửi</label>
              <select
                value={shared.consignor_id}
                onChange={e => setSharedField('consignor_id', e.target.value)}
                className="form-input text-sm"
              >
                <option value="">-- Chọn --</option>
                {consignors.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Cơ sở</label>
              <select
                value={shared.location_id}
                onChange={e => setSharedField('location_id', e.target.value)}
                className="form-input text-sm"
              >
                <option value="">-- Chọn --</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Ngày bắt đầu</label>
              <input
                type="date"
                value={shared.consign_start}
                onChange={e => setSharedField('consign_start', e.target.value)}
                className="form-input text-sm"
              />
            </div>
            <div>
              <label className="form-label text-xs">Ngày kết thúc</label>
              <input
                type="date"
                value={shared.consign_end}
                onChange={e => setSharedField('consign_end', e.target.value)}
                className="form-input text-sm"
              />
            </div>
            <div>
              <label className="form-label text-xs">Trạng thái</label>
              <select
                value={shared.status}
                onChange={e => setSharedField('status', e.target.value)}
                className="form-input text-sm"
              >
                <option value="active">Đang bán</option>
                <option value="pending">Chờ duyệt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-6">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Tên sản phẩm *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Danh mục</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Độ mới %</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Giá bán *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Phí REVA</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Bạn nhận</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Mã SP</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const { commission, consignorAmount } = calcCommission(row.sale_price)
                const isValid = row.name.trim() && Number(row.sale_price) > 0
                return (
                  <tr
                    key={row._id}
                    className={`border-b transition-colors ${isValid ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-3 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <input
                        value={row.name}
                        onChange={e => setRowField(row._id, 'name', e.target.value)}
                        placeholder="Tên sản phẩm..."
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.category_id}
                        onChange={e => setRowField(row._id, 'category_id', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
                      >
                        <option value="">--</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.condition_percent}
                        onChange={e => setRowField(row._id, 'condition_percent', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={row.sale_price}
                        onChange={e => setRowField(row._id, 'sale_price', e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-gray-400 text-xs tabular-nums">
                      {row.sale_price ? fmt(commission) : '—'}
                    </td>
                    <td className={`px-3 py-1.5 text-xs tabular-nums font-medium ${consignorAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {row.sale_price ? fmt(consignorAmount) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={row.code}
                        onChange={e => setRowField(row._id, 'code', e.target.value)}
                        placeholder="Tự động"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-hun-black"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => removeRow(row._id)}
                        className="p-1 text-gray-300 hover:text-red-500 rounded"
                        title="Xóa dòng"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0 bg-white">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-hun-black border border-dashed border-gray-300 hover:border-hun-black rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={15} /> Thêm dòng
          </button>

          <div className="flex items-center gap-3">
            {validRows.length > 0 && (
              <span className="text-xs text-gray-500">
                Tổng: {fmt(validRows.reduce((s, r) => s + Number(r.sale_price), 0))} —
                Bạn nhận: {fmt(validRows.reduce((s, r) => s + calcCommission(r.sale_price).consignorAmount, 0))}
              </span>
            )}
            <button onClick={onClose} className="btn-outline text-sm">Hủy</button>
            <button
              onClick={handleSubmit}
              disabled={validRows.length === 0 || loading}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} />
              {loading ? 'Đang lưu...' : `Thêm ${validRows.length} sản phẩm`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
