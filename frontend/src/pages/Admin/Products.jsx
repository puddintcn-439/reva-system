import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminProducts, getCategories, getAdminLocations, getConsignors,
  createProduct, updateProduct, deleteProduct, bulkCreateProducts,
  returnProduct, expireBatch, uploadImage, exportInventoryReport, suggestProduct,
} from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, Check, Printer, Tag, ListPlus, CornerDownLeft, Clock, Upload, FileDown, Sparkles } from 'lucide-react'
import ProductLabelModal from '../../components/ProductLabelModal'
import BulkProductModal from '../../components/BulkProductModal'
import { fmtMoney as fmt, downloadBlobResponse } from '../../utils/format'

const STATUS_LABELS = {
  active: { label: 'Đang bán',   cls: 'bg-green-100 text-green-700' },
  sold:   { label: 'Đã bán',     cls: 'bg-blue-100 text-blue-700' },
  pending:{ label: 'Chờ duyệt',  cls: 'bg-yellow-100 text-yellow-700' },
  returned:{ label: 'Trả hàng', cls: 'bg-gray-100 text-gray-600' },
  expired:{ label: 'Hết hạn',   cls: 'bg-red-100 text-red-600' },
}

const pad = (n) => String(n).padStart(2, '0')
const fmtISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

const emptyForm = () => {
  const today = new Date()
  const end60 = new Date(today); end60.setDate(end60.getDate() + 60)
  return {
    name: '', condition_percent: 90, sale_price: '', description: '',
    category_id: '', location_id: '', consignor_id: '',
    consign_start: fmtISO(today), consign_end: fmtISO(end60),
    image_url: '', code: '', status: 'active',
  }
}

export default function Products() {
  const [filters, setFilters]   = useState({ status: '', category_id: '', consignor_id: '', price_min: '', price_max: '', page: 1 })
  const [modal, setModal]       = useState(null) // null | { mode: 'create'|'edit', data: {} }
  const [imageUrl, setImageUrl] = useState('')
  const [exportingInventory, setExportingInventory] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const aiSuggestCacheRef = useRef(new Map())
  const formRef = useRef(null)

  const handleExportInventory = async () => {
    setExportingInventory(true)
    try {
      const params = {}
      if (filters.status)      params.status      = filters.status
      if (filters.category_id) params.category_id = filters.category_id
      const res = await exportInventoryReport(params)
      downloadBlobResponse(res)
      toast.success('Đã xuất tồn kho')
    } catch {
      toast.error('Lỗi xuất tồn kho')
    } finally {
      setExportingInventory(false)
    }
  }

  const handleAISuggest = async () => {
    if (!formRef.current) return
    const els = formRef.current.elements
    const name = els['name']?.value?.trim()
    if (!name) { toast.error('Nhập tên sản phẩm trước'); return }
    const conditionPercent = Number(els['condition_percent']?.value) || 90
    const categoryId = els['category_id']?.value
    const categoryName = categories.find((c) => c.id === categoryId)?.name || ''
    const key = `ai:suggest:${name}|${conditionPercent}|${categoryName}`
    const cached = aiSuggestCacheRef.current.get(key) || (() => { try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null } })()
    if (cached) {
      if (els['sale_price'])  els['sale_price'].value  = cached.suggested_price
      if (els['description']) els['description'].value = cached.description
      toast.success('AI đã gợi ý giá và mô tả (cached)!')
      return
    }

    setAiLoading(true)
    try {
      const res = await suggestProduct({ name, condition_percent: conditionPercent, category_name: categoryName })
      const { suggested_price, description } = res.data.data
      if (els['sale_price'])  els['sale_price'].value  = suggested_price
      if (els['description']) els['description'].value = description
      const payload = { suggested_price, description }
      aiSuggestCacheRef.current.set(key, payload)
      try { sessionStorage.setItem(key, JSON.stringify(payload)) } catch (e) {}
      toast.success('AI đã gợi ý giá và mô tả!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const openModal = (m) => {
    setModal(m)
    setImageUrl(m?.data?.image_url || '')
  }
  const [selected, setSelected] = useState(new Set())
  const [labelModal, setLabelModal] = useState(null) // array of products to print
  const [bulkModal, setBulkModal]   = useState(false)
  const [returnModal, setReturnModal] = useState(null) // product to return
  const [returnReason, setReturnReason] = useState('')
  const qc = useQueryClient()

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = (rows) => {
    if (rows.every(r => selected.has(r.id))) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', filters],
    queryFn: () => getAdminProducts(filters).then((r) => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then((r) => r.data.data),
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => getAdminLocations().then((r) => r.data.data),
  })
  const { data: consignors = [] } = useQuery({
    queryKey: ['consignors', { page: 1, limit: 100 }],
    queryFn: () => getConsignors({ limit: 100 }).then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { qc.invalidateQueries(['admin-products']); setModal(null); toast.success('Đã thêm sản phẩm') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-products']); setModal(null); toast.success('Đã cập nhật') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { qc.invalidateQueries(['admin-products']); toast.success('Đã xóa') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const returnMut = useMutation({
    mutationFn: ({ id, reason }) => returnProduct(id, reason),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      setReturnModal(null)
      setReturnReason('')
      toast.success('Đã đánh dấu rút hàng')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const expireMut = useMutation({
    mutationFn: expireBatch,
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-products'])
      const count = res.data.count
      toast.success(count > 0 ? `Đã chuyển ${count} sản phẩm hết hạn` : 'Không có sản phẩm nào hết hạn')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const bulkMut = useMutation({
    mutationFn: bulkCreateProducts,
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-products'])
      setBulkModal(false)
      toast.success(`Đã thêm ${res.data.count} sản phẩm`)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const uploadImgMut = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('image', file); return uploadImage(fd) },
    onSuccess: (res) => setImageUrl(res.data.url),
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi upload ảnh'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    if (modal.mode === 'create') createMut.mutate(payload)
    else updateMut.mutate({ id: modal.data.id, data: payload })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Sản phẩm</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => {
                const rows = data?.data?.filter(p => selected.has(p.id)) || []
                setLabelModal(rows)
              }}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
            >
              <Tag size={15} /> In {selected.size} tem
            </button>
          )}
          <button onClick={() => setBulkModal(true)} className="btn-outline text-sm gap-2">
            <ListPlus size={16} /> Thêm nhiều
          </button>
          <button
            onClick={() => {
              if (window.confirm('Chuyển tất cả sản phẩm quá hạn nhận hàng sang trạng thái Hết hạn?'))
                expireMut.mutate()
            }}
            disabled={expireMut.isPending}
            className="btn-outline text-sm gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
            title="Hết hạn hàng loạt"
          >
            <Clock size={16} /> {expireMut.isPending ? 'Đang xử lý...' : 'Hết hạn hàng loạt'}
          </button>
          <button onClick={() => openModal({ mode: 'create', data: emptyForm() })} className="btn-primary text-sm gap-2">
            <Plus size={16} /> Thêm sản phẩm
          </button>
          <button
            onClick={handleExportInventory}
            disabled={exportingInventory}
            className="inline-flex items-center gap-2 px-3 py-2 border border-hun-brown text-hun-brown text-sm font-medium rounded-lg hover:bg-hun-brown/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            title="Xuất tồn kho theo bộ lọc hiện tại"
          >
            <FileDown size={15} />
            {exportingInventory ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="form-input w-44"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
          className="form-input w-44"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.consignor_id}
          onChange={(e) => setFilters({ ...filters, consignor_id: e.target.value, page: 1 })}
          className="form-input w-48"
        >
          <option value="">Tất cả người ký gửi</option>
          {consignors.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Giá từ"
            value={filters.price_min}
            onChange={(e) => setFilters({ ...filters, price_min: e.target.value, page: 1 })}
            className="form-input w-28"
            min="0"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Đến"
            value={filters.price_max}
            onChange={(e) => setFilters({ ...filters, price_max: e.target.value, page: 1 })}
            className="form-input w-28"
            min="0"
          />
        </div>

        {(filters.status || filters.category_id || filters.consignor_id || filters.price_min || filters.price_max) && (
          <button
            onClick={() => setFilters({ status: '', category_id: '', consignor_id: '', price_min: '', price_max: '', page: 1 })}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border rounded-lg hover:border-red-300"
          >
            <X size={14} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!data?.data?.length && data.data.every(r => selected.has(r.id))}
                    onChange={() => toggleAll(data?.data || [])}
                    className="rounded"
                  />
                </th>
                {['Mã', 'Tên sản phẩm', 'Danh mục', 'Cơ sở', 'Giá bán', 'Phí REVA', 'Bạn nhận', 'Trạng thái', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
              )}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Chưa có sản phẩm nào</td></tr>
              )}
              {data?.data?.map((p) => {
                const s = STATUS_LABELS[p.status] || STATUS_LABELS.active
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${selected.has(p.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.code}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.location_name || '—'}</td>
                    <td className="px-4 py-3 font-medium">{fmt(p.sale_price)}</td>
                    <td className="px-4 py-3 text-gray-400">{fmt(p.commission_amount)}</td>
                    <td className="px-4 py-3 text-hun-green font-medium">{fmt(p.consignor_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setLabelModal([p])}
                          title="In tem"
                          className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => openModal({ mode: 'edit', data: p })}
                          title="Chỉnh sửa"
                          className="p-1.5 text-gray-400 hover:text-hun-black rounded hover:bg-gray-100"
                        >
                          <Edit2 size={15} />
                        </button>
                        {(p.status === 'active' || p.status === 'pending') && (
                          <button
                            onClick={() => { setReturnModal(p); setReturnReason('') }}
                            title="Rút hàng về"
                            className="p-1.5 text-gray-400 hover:text-orange-500 rounded hover:bg-orange-50"
                          >
                            <CornerDownLeft size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('Xóa sản phẩm này?')) deleteMut.mutate(p.id)
                          }}
                          title="Xóa"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>Tổng: {data.pagination.total} sản phẩm</span>
            <div className="flex gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >← Trước</button>
              <span className="px-3 py-1">{filters.page} / {data.pagination.pages}</span>
              <button
                disabled={filters.page >= data.pagination.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Modal */}
      {bulkModal && (
        <BulkProductModal
          categories={categories}
          locations={locations}
          consignors={consignors}
          loading={bulkMut.isPending}
          onSubmit={(payload) => bulkMut.mutate(payload)}
          onClose={() => setBulkModal(false)}
        />
      )}

      {/* Label Modal */}
      {labelModal && (
        <ProductLabelModal
          products={labelModal}
          onClose={() => setLabelModal(null)}
        />
      )}

      {/* Rút hàng Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6">
            <h3 className="font-bold text-lg mb-1 text-orange-600">Rút hàng về</h3>
            <p className="text-sm text-gray-600 mb-3">
              Sản phẩm <span className="font-semibold">{returnModal.name}</span>{returnModal.code && <> (<span className="font-mono text-xs">{returnModal.code}</span>)</>} sẽ được đánh dấu là <strong>đã trả lại chủ hàng</strong>.
            </p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
              rows={2}
              placeholder="Lý do rút hàng (tùy chọn)..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReturnModal(null)}
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50"
              >Hủy</button>
              <button
                onClick={() => returnMut.mutate({ id: returnModal.id, reason: returnReason })}
                disabled={returnMut.isPending}
                className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm hover:bg-orange-600 disabled:opacity-50"
              >{returnMut.isPending ? 'Đang xử lý...' : 'Xác nhận rút hàng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{modal.mode === 'create' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Tên sản phẩm *</label>
                  <div className="flex gap-2">
                    <input name="name" defaultValue={modal.data.name} required className="form-input flex-1" />
                    <button
                      type="button"
                      onClick={handleAISuggest}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      title="AI gợi ý giá và mô tả"
                    >
                      <Sparkles size={14} />
                      {aiLoading ? 'Đang hỏi AI...' : 'Gợi ý AI'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Mã sản phẩm</label>
                  <input name="code" defaultValue={modal.data.code} className="form-input" placeholder="Tự động tạo nếu bỏ trống" />
                </div>
                <div>
                  <label className="form-label">Độ mới (%)</label>
                  <input name="condition_percent" type="number" min="0" max="100" defaultValue={modal.data.condition_percent || 90} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Giá bán (đ) *</label>
                  <input name="sale_price" type="number" required defaultValue={modal.data.sale_price} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Trạng thái</label>
                  <select name="status" defaultValue={modal.data.status || 'active'} className="form-input">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Danh mục</label>
                  <select name="category_id" defaultValue={modal.data.category_id || ''} className="form-input">
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Cơ sở</label>
                  <select name="location_id" defaultValue={modal.data.location_id || ''} className="form-input">
                    <option value="">-- Chọn cơ sở --</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Khách hàng ký gửi</label>
                  <select name="consignor_id" defaultValue={modal.data.consignor_id || ''} className="form-input">
                    <option value="">-- Chọn khách hàng --</option>
                    {consignors.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày bắt đầu ký gửi</label>
                  <input name="consign_start" type="date" defaultValue={modal.data.consign_start?.slice(0,10)} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Ngày kết thúc ký gửi</label>
                  <input name="consign_end" type="date" defaultValue={modal.data.consign_end?.slice(0,10)} className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Ảnh sản phẩm</label>
                  <input type="hidden" name="image_url" value={imageUrl} readOnly />
                  <div className="flex items-center gap-3">
                    {imageUrl && (
                      <img src={imageUrl} alt="preview" className="h-16 w-16 object-cover rounded border flex-shrink-0" />
                    )}
                    <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 ${uploadImgMut.isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={14} />
                      {uploadImgMut.isPending ? 'Đang tải...' : (imageUrl ? 'Đổi ảnh' : 'Chọn ảnh')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImgMut.mutate(f) }}
                      />
                    </label>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl('')} className="text-xs text-red-500 hover:underline">Xóa ảnh</button>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Mô tả</label>
                  <textarea name="description" rows={3} defaultValue={modal.data.description} className="form-input" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-sm">Hủy</button>
                <button type="submit" className="btn-primary text-sm">
                  <Check size={16} className="mr-1" />
                  {modal.mode === 'create' ? 'Thêm' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
