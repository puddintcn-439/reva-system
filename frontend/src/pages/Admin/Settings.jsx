import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import {
  getAdminAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAdminLocations, createLocation, updateLocation, deleteLocation,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  getExpiringProducts, sendExpiringReminders,
  getBankAccounts, createBankAccount, updateBankAccount, setActiveBank, deleteBankAccount,
  changePassword, getSystemSettings, saveSystemSettings, testSmtp, getPublicSettings, recalcCommissions,
} from '../../services/api'
import { getAiUsage } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X, Send, CheckSquare, Square, Star, FlaskConical } from 'lucide-react'
import { fmtMoney } from '../../utils/format'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('announcements')
  const { can } = useAuth()

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold">Cài đặt</h1></div>
      <div className="flex gap-4 border-b mb-8">
        {[
          { id: 'announcements', label: 'Thông báo' },
          { id: 'locations',    label: 'Cơ sở' },
          { id: 'banks',        label: 'Ngân hàng' },
          { id: 'commission',   label: 'Phí ký gửi' },
          { id: 'receipt',      label: 'Hoá đơn' },
          { id: 'expiring',     label: 'Sắp hết hạn' },
          { id: 'email',        label: 'Mẫu Email' },
          ...(can('settings:system') ? [{ id: 'system', label: 'Hệ thống' }] : []),
          { id: 'password',     label: 'Mật khẩu' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id ? 'border-hun-black text-hun-black' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'announcements' && <AnnouncementsTab />}
      {activeTab === 'locations'    && <LocationsTab />}
      {activeTab === 'banks'        && <BanksTab />}
      {activeTab === 'commission'   && <CommissionTab />}
      {activeTab === 'receipt'      && <ReceiptTab />}
      {activeTab === 'expiring'     && <ExpiringTab />}
      {activeTab === 'email'        && <EmailTemplatesTab />}
      {activeTab === 'system'       && <SystemSettingsTab />}
      {activeTab === 'password'     && <PasswordTab />}
    </div>
  )
}

function ReceiptTab() {
  const [autoSave, setAutoSave] = useState(localStorage.getItem('pos_auto_save_pdf') === '1')

  const toggle = () => {
    const next = !autoSave
    setAutoSave(next)
    localStorage.setItem('pos_auto_save_pdf', next ? '1' : '0')
    toast.success(next ? 'Bật lưu PDF tự động' : 'Tắt lưu PDF tự động')
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-medium mb-4">Tuỳ chọn hoá đơn</h3>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-medium text-sm">Tự động lưu PDF khi thanh toán &amp; in</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sau khi tạo hoá đơn thành công ở POS, hệ thống sẽ tự động tải xuống file PDF vào máy.
            </p>
          </div>
          <button
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              autoSave ? 'bg-hun-black' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={autoSave}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                autoSave ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Trạng thái hiện tại: <span className={`font-semibold ${autoSave ? 'text-green-600' : 'text-gray-500'}`}>{autoSave ? 'Bật' : 'Tắt'}</span>
        </p>
      </div>
    </div>
  )
}

function AnnouncementsTab() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [newContent, setNewContent] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => getAdminAnnouncements().then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => { qc.invalidateQueries(['admin-announcements', 'announcements']); setNewContent(''); toast.success('Đã thêm') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateAnnouncement(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-announcements', 'announcements']); setEditing(null); toast.success('Đã lưu') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => { qc.invalidateQueries(['admin-announcements', 'announcements']); toast.success('Đã xóa') },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border rounded-lg p-5">
        <h3 className="font-medium mb-4">Thêm thông báo mới</h3>
        <div className="flex gap-3">
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="form-input flex-1"
            placeholder="Nội dung thông báo..."
          />
          <button
            onClick={() => newContent && createMut.mutate({ content: newContent })}
            className="btn-primary text-sm shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg divide-y">
        {isLoading && <div className="p-6 text-center text-gray-400">Đang tải...</div>}
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-start gap-3">
            {editing === item.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  defaultValue={item.content}
                  id={`ann-${item.id}`}
                  className="form-input flex-1 text-sm"
                />
                <button
                  onClick={() => updateMut.mutate({ id: item.id, data: { content: document.getElementById(`ann-${item.id}`).value, is_active: item.is_active, sort_order: item.sort_order } })}
                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                ><Save size={16} /></button>
                <button onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm">{item.content}</p>
                  <span className={`text-xs ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                </div>
                <button onClick={() => setEditing(item.id)} className="p-1.5 text-gray-400 hover:text-hun-black rounded"><Edit2 size={14} /></button>
                <button
                  onClick={() => { if (window.confirm('Xóa thông báo này?')) deleteMut.mutate(item.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                ><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LocationsTab() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => getAdminLocations().then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: createLocation,
    onSuccess: () => { qc.invalidateQueries(['admin-locations', 'locations']); setShowAdd(false); toast.success('Đã thêm') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateLocation(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-locations', 'locations']); setEditing(null); toast.success('Đã lưu') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      qc.invalidateQueries(['admin-locations'])
      qc.invalidateQueries(['locations-public'])
      toast.success('Đã xóa cơ sở')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi xóa'),
  })

  const LocationForm = ({ data = {}, onSave, onCancel }) => (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); onSave(Object.fromEntries(fd.entries())) }} className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Tên cơ sở</label>
          <input name="name" defaultValue={data.name} required className="form-input text-sm" />
        </div>
        <div>
          <label className="form-label">Loại</label>
          <input name="type" defaultValue={data.type} className="form-input text-sm" placeholder="HSSV, BRAND..." />
        </div>
        <div className="col-span-2">
          <label className="form-label">Địa chỉ</label>
          <input name="address" defaultValue={data.address} required className="form-input text-sm" />
        </div>
        <div>
          <label className="form-label">SĐT</label>
          <input name="phone" defaultValue={data.phone} className="form-input text-sm" />
        </div>
        <div>
          <label className="form-label">Link Google Maps</label>
          <input name="map_url" defaultValue={data.map_url} className="form-input text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-outline text-xs px-3 py-2">Hủy</button>
        <button type="submit" className="btn-primary text-xs px-3 py-2">Lưu</button>
      </div>
    </form>
  )

  return (
    <div className="max-w-2xl space-y-4">
      {!showAdd && (
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm gap-2">
          <Plus size={16} /> Thêm cơ sở
        </button>
      )}
      {showAdd && (
        <LocationForm onSave={(d) => createMut.mutate(d)} onCancel={() => setShowAdd(false)} />
      )}
      <div className="space-y-3">
        {locations.map((loc) => editing === loc.id ? (
          <LocationForm key={loc.id} data={loc} onSave={(d) => updateMut.mutate({ id: loc.id, data: { ...d, is_active: true } })} onCancel={() => setEditing(null)} />
        ) : (
          <div key={loc.id} className="bg-white border rounded-lg p-4 flex items-start justify-between">
            <div>
              <span className="text-xs text-hun-brown font-medium">{loc.type}</span>
              <p className="font-medium mt-0.5">{loc.name}</p>
              <p className="text-sm text-gray-500">{loc.address}</p>
              {loc.phone && <p className="text-sm text-gray-400">{loc.phone}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(loc.id)} className="p-1.5 text-gray-400 hover:text-hun-black rounded">
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => { if (window.confirm(`Xóa cơ sở "${loc.name}"?`)) deleteMut.mutate(loc.id) }}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PasswordTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return toast.error('Mật khẩu xác nhận không khớp')
    if (form.newPassword.length < 6) return toast.error('Mật khẩu mới phải ít nhất 6 ký tự')
    setLoading(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Đổi mật khẩu thành công')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4 bg-white border rounded-lg p-6">
      {[
        { label: 'Mật khẩu hiện tại', key: 'currentPassword' },
        { label: 'Mật khẩu mới', key: 'newPassword' },
        { label: 'Xác nhận mật khẩu mới', key: 'confirm' },
      ].map(({ label, key }) => (
        <div key={key}>
          <label className="form-label">{label}</label>
          <input
            type="password"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="form-input"
            required
          />
        </div>
      ))}
      <button type="submit" disabled={loading} className="btn-primary text-sm w-full">
        {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
      </button>
    </form>
  )
}

function ExpiringTab() {
  const [days, setDays] = useState(3)
  const [selected, setSelected] = useState(new Set())
  const [templateKey, setTemplateKey] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['expiring-products', days],
    queryFn: () => getExpiringProducts(days).then((r) => r.data.data),
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => getEmailTemplates().then((r) => r.data.data),
  })

  const sendMut = useMutation({
    mutationFn: sendExpiringReminders,
    onSuccess: (res) => {
      toast.success(res.data.message)
      setSelected(new Set())
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi gửi email'),
  })

  const allIds = products.map((p) => p.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))
  const toggle = (id) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleSend = () => {
    if (!templateKey) {
      toast.error('Vui lòng chọn mẫu email trước khi gửi')
      return
    }
    const ids = selected.size > 0 ? [...selected] : []
    if (!window.confirm(`Gửi email nhắc nhở cho ${ids.length || products.length} sản phẩm?`)) return
    sendMut.mutate({ days, template_key: templateKey, product_ids: ids.length ? ids : undefined })
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const daysLeft = (d) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
    return diff
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Hiển thị sản phẩm hết hạn trong</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="form-input w-24 text-sm">
            <option value={1}>1 ngày</option>
            <option value={3}>3 ngày</option>
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            onChange={(e) => setTemplateKey(e.target.value)}
            className={`form-input w-56 text-sm ${!templateKey ? 'border-amber-400' : ''}`}
          >
            <option value="">-- Chọn mẫu email --</option>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSend}
          disabled={sendMut.isPending || products.length === 0 || !templateKey}
          className="btn-primary text-sm gap-2"
        >
          <Send size={15} />
          {sendMut.isPending ? 'Đang gửi...' : `Gửi nhắc nhở${selected.size > 0 ? ` (${selected.size})` : ' tất cả'}`}
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-gray-400 hover:text-hun-black">
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              {['Sản phẩm', 'Khách hàng ký gửi', 'Email', 'Giá bán', 'Hết hạn', 'Còn lại'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
            {!isLoading && !products.length && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có sản phẩm nào sắp hết hạn trong {days} ngày tới</td></tr>
            )}
            {products.map((p) => {
              const left = daysLeft(p.consign_end)
              return (
                <tr key={p.id} className={`hover:bg-gray-50 ${selected.has(p.id) ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(p.id)} className="text-gray-400 hover:text-hun-black">
                      {selected.has(p.id) ? <CheckSquare size={16} className="text-hun-black" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.code}</p>
                  </td>
                  <td className="px-4 py-3">{p.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    {p.consignor_email
                      ? <span className="text-green-600">{p.consignor_email}</span>
                      : <span className="text-red-400 text-xs">Chưa có email</span>}
                  </td>
                  <td className="px-4 py-3">{fmtMoney(p.sale_price)}</td>
                  <td className="px-4 py-3">{fmt(p.consign_end)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${
                      left === 0 ? 'text-red-600' : left <= 1 ? 'text-orange-500' : 'text-amber-500'
                    }`}>{left === 0 ? 'Hôm nay' : `${left} ngày`}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmailTemplatesTab() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null) // template key
  const [draft, setDraft] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newTpl, setNewTpl] = useState({ key: '', name: '', subject: '', body: '', variables: '' })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => getEmailTemplates().then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      qc.invalidateQueries(['email-templates'])
      setShowAdd(false)
      setNewTpl({ key: '', name: '', subject: '', body: '', variables: '' })
      toast.success('Đã thêm template')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi tạo template'),
  })

  const updateMut = useMutation({
    mutationFn: ({ key, data }) => updateEmailTemplate(key, data),
    onSuccess: () => {
      qc.invalidateQueries(['email-templates'])
      setEditing(null)
      toast.success('Đã lưu mẫu email')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi lưu template'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => { qc.invalidateQueries(['email-templates']); toast.success('Đã xóa template') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi xóa'),
  })

  const startEdit = (tpl) => {
    setEditing(tpl.key)
    setDraft({ name: tpl.name, subject: tpl.subject, body: tpl.body, variables: tpl.variables || '' })
  }

  const FIELD = (label, key, el = 'input', rows = 3) => (
    <div key={key}>
      <label className="form-label">{label}</label>
      {el === 'textarea'
        ? <textarea rows={rows} value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="form-input text-sm font-mono text-xs" />
        : <input value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="form-input text-sm" />
      }
    </div>
  )

  return (
    <div className="max-w-3xl space-y-4">
      {/* Add new */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm gap-2">
          <Plus size={16} /> Thêm template
        </button>
      ) : (
        <div className="bg-white border rounded-lg p-5 space-y-3">
          <h3 className="font-medium">Template mới</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Key (mã định danh) *</label>
              <input
                value={newTpl.key}
                onChange={(e) => setNewTpl({ ...newTpl, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="form-input text-sm font-mono"
                placeholder="vd: discount_reminder"
              />
            </div>
            <div>
              <label className="form-label">Tên hiển thị *</label>
              <input value={newTpl.name} onChange={(e) => setNewTpl({ ...newTpl, name: e.target.value })} className="form-input text-sm" placeholder="vd: Nhắc giảm giá" />
            </div>
          </div>
          <div>
            <label className="form-label">Tiêu đề email *</label>
            <input value={newTpl.subject} onChange={(e) => setNewTpl({ ...newTpl, subject: e.target.value })} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label">Nội dung *</label>
            <textarea rows={8} value={newTpl.body} onChange={(e) => setNewTpl({ ...newTpl, body: e.target.value })} className="form-input text-sm font-mono text-xs" placeholder="Dùng {{tên_biến}} để chèn dữ liệu động" />
          </div>
          <div>
            <label className="form-label">Biến có thể dùng (phân cách bằng dấu phẩy)</label>
            <input value={newTpl.variables} onChange={(e) => setNewTpl({ ...newTpl, variables: e.target.value })} className="form-input text-sm" placeholder="vd: full_name,product_name,sale_price" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-outline text-sm">Hủy</button>
            <button
              onClick={() => createMut.mutate(newTpl)}
              disabled={createMut.isPending || !newTpl.key || !newTpl.name || !newTpl.subject || !newTpl.body}
              className="btn-primary text-sm"
            >
              {createMut.isPending ? 'Đang lưu...' : 'Thêm'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-gray-400">Đang tải...</p>}
      {templates.map((tpl) => (
        <div key={tpl.key} className="bg-white border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <p className="font-medium">{tpl.name}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{tpl.key}</p>
            </div>
            {editing === tpl.key ? (
              <div className="flex gap-2">
                <button
                  onClick={() => updateMut.mutate({ key: tpl.key, data: draft })}
                  disabled={updateMut.isPending}
                  className="btn-primary text-xs px-3 py-1.5 gap-1"
                ><Save size={13} /> Lưu</button>
                <button onClick={() => setEditing(null)} className="btn-outline text-xs px-3 py-1.5"><X size={13} /></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => startEdit(tpl)} className="p-1.5 text-gray-400 hover:text-hun-black rounded" title="Sửa">
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Xóa template "${tpl.name}"?`)) deleteMut.mutate(tpl.key) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  title="Xóa"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="p-5 space-y-3">
            {editing === tpl.key ? (
              <>
                {FIELD('Tên template', 'name')}
                {FIELD('Tiêu đề email', 'subject')}
                {FIELD('Nội dung', 'body', 'textarea', 10)}
                {FIELD('Biến có thể dùng', 'variables')}
                {draft.variables && (
                  <p className="text-xs text-gray-400">
                    Preview: {draft.variables.split(',').map((v) => (
                      <code key={v} className="mx-1 bg-gray-100 px-1 rounded">{`{{${v.trim()}}}`}</code>
                    ))}
                  </p>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tiêu đề</p>
                  <p className="text-sm">{tpl.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nội dung</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded p-3 text-xs">{tpl.body}</pre>
                </div>
                {tpl.variables && (
                  <p className="text-xs text-gray-400">
                    Biến: {tpl.variables.split(',').map((v) => (
                      <code key={v} className="mx-1 bg-gray-100 px-1 rounded">{`{{${v.trim()}}}`}</code>
                    ))}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Danh sách mã ngân hàng VietQR phổ biến
const BANK_LIST = [
  { id: 'TPB',   name: 'TPBank' },
  { id: 'MB',    name: 'MBBank' },
  { id: 'VCB',   name: 'Vietcombank' },
  { id: 'TCB',   name: 'Techcombank' },
  { id: 'BIDV',  name: 'BIDV' },
  { id: 'VTB',   name: 'VietinBank' },
  { id: 'ACB',   name: 'ACB' },
  { id: 'VPB',   name: 'VPBank' },
  { id: 'STB',   name: 'Sacombank' },
  { id: 'HDB',   name: 'HDBank' },
  { id: 'MSB',   name: 'MSB' },
  { id: 'OCB',   name: 'OCB' },
  { id: 'SHB',   name: 'SHB' },
  { id: 'EIB',   name: 'Eximbank' },
  { id: 'NAB',   name: 'Nam A Bank' },
]

const EMPTY_BANK = { bank_id: 'TPB', bank_name: 'TPBank', account_no: '', account_name: '' }

function BanksTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_BANK)
  const [editForm, setEditForm] = useState({})

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => getBankAccounts().then((r) => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); setShowAdd(false); setForm(EMPTY_BANK); toast.success('Đã thêm') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateBankAccount(id, data),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); setEditing(null); toast.success('Đã lưu') },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const activeMut = useMutation({
    mutationFn: setActiveBank,
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); qc.invalidateQueries(['active-bank']); toast.success('Đã chọn làm tài khoản thanh toán') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteBankAccount,
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); qc.invalidateQueries(['active-bank']); toast.success('Đã xóa') },
  })

  const BankForm = ({ value, onChange, onSave, onCancel, loading }) => (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Ngân hàng *</label>
          <select
            value={value.bank_id}
            onChange={(e) => {
              const found = BANK_LIST.find((b) => b.id === e.target.value)
              onChange({ ...value, bank_id: e.target.value, bank_name: found?.name || e.target.value })
            }}
            className="form-input text-sm"
          >
            {BANK_LIST.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Số tài khoản *</label>
          <input
            value={value.account_no}
            onChange={(e) => onChange({ ...value, account_no: e.target.value })}
            className="form-input text-sm"
            placeholder="0123456789"
          />
        </div>
        <div className="col-span-2">
          <label className="form-label">Tên chủ tài khoản *</label>
          <input
            value={value.account_name}
            onChange={(e) => onChange({ ...value, account_name: e.target.value.toUpperCase() })}
            className="form-input text-sm uppercase"
            placeholder="NGUYEN VAN A"
          />
        </div>
      </div>
      {/* QR preview */}
      {value.bank_id && value.account_no && (
        <div className="flex items-center gap-4 bg-white border rounded-lg p-3">
          <img
            src={`https://img.vietqr.io/image/${value.bank_id}-${value.account_no}-compact2.png?accountName=${encodeURIComponent(value.account_name || '')}`}
            alt="QR preview"
            className="w-20 h-20 rounded"
          />
          <div className="text-xs text-gray-600">
            <p className="font-semibold text-gray-800">{value.bank_name} · {value.account_no}</p>
            <p>{value.account_name}</p>
            <p className="text-gray-400 mt-1">Xem trước QR</p>
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-outline text-sm">Hủy</button>
        <button
          onClick={onSave}
          disabled={loading || !value.account_no || !value.account_name}
          className="btn-primary text-sm"
        >
          {loading ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tài khoản <span className="text-amber-600 font-medium">mặc định</span> sẽ hiển thị QR trong POS khi thanh toán chuyển khoản.</p>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm gap-2 shrink-0">
            <Plus size={16} /> Thêm
          </button>
        )}
      </div>

      {showAdd && (
        <BankForm
          value={form}
          onChange={setForm}
          onSave={() => createMut.mutate(form)}
          onCancel={() => { setShowAdd(false); setForm(EMPTY_BANK) }}
          loading={createMut.isPending}
        />
      )}

      {isLoading && <p className="text-gray-400">Đang tải...</p>}

      <div className="space-y-3">
        {banks.map((b) => editing === b.id ? (
          <BankForm
            key={b.id}
            value={editForm}
            onChange={setEditForm}
            onSave={() => updateMut.mutate({ id: b.id, data: editForm })}
            onCancel={() => setEditing(null)}
            loading={updateMut.isPending}
          />
        ) : (
          <div key={b.id} className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
            b.is_active ? 'border-amber-400 ring-1 ring-amber-300' : ''
          }`}>
            <img
              src={`https://img.vietqr.io/image/${b.bank_id}-${b.account_no}-compact2.png?accountName=${encodeURIComponent(b.account_name)}`}
              alt="QR"
              className="w-16 h-16 rounded shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{b.bank_name} <span className="text-gray-400 font-normal text-sm">({b.bank_id})</span></p>
                {b.is_active && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Mặc định</span>
                )}
              </div>
              <p className="text-sm text-gray-600 font-mono">{b.account_no}</p>
              <p className="text-sm text-gray-500">{b.account_name}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {!b.is_active && (
                <button
                  onClick={() => activeMut.mutate(b.id)}
                  title="Chọn làm tài khoản thanh toán"
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50"
                >
                  <Star size={13} /> Chọn mặc định
                </button>
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(b.id); setEditForm({ bank_id: b.bank_id, bank_name: b.bank_name, account_no: b.account_no, account_name: b.account_name }) }}
                  className="p-1.5 text-gray-400 hover:text-hun-black rounded"
                ><Edit2 size={14} /></button>
                <button
                  onClick={() => { if (window.confirm(`Xóa tài khoản ${b.account_no}?`)) deleteMut.mutate(b.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                ><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS TAB (SMTP + CORS)
// ─────────────────────────────────────────────────────────────────
function SystemSettingsTab() {
  const queryClient = useQueryClient()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await getSystemSettings()
      return res.data.data
    },
  })

  // Build local form state from rows
  const toForm = (rows) => Object.fromEntries(rows.map(r => [r.key, r.value === '••••••••' ? '' : (r.value ?? '')]))
  const [form, setForm] = useState({})
  const [testEmail, setTestEmail] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [aiUsageDate, setAiUsageDate] = useState(new Date().toISOString().slice(0,10))
  const [aiUsageRows, setAiUsageRows] = useState([])

  if (!isLoading && !initialized && rows.length) {
    setForm(toForm(rows))
    setInitialized(true)
  }

  const saveMut = useMutation({
    mutationFn: saveSystemSettings,
    onSuccess: () => {
      toast.success('Đã lưu cài đặt hệ thống')
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      setInitialized(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi lưu cài đặt'),
  })

  const testMut = useMutation({
    mutationFn: () => testSmtp(testEmail),
    onSuccess: (res) => toast.success(res.data.message),
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi SMTP'),
  })

  const f = (key) => form[key] ?? ''
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const LABEL = {
    smtp_host: 'SMTP Host', smtp_port: 'SMTP Port', smtp_secure: 'SMTP Secure (true/false)',
    smtp_user: 'SMTP Username (email)', smtp_pass: 'SMTP App Password', smtp_from: 'From (tên + email)',
    client_urls: 'Frontend URLs (CORS)', jwt_secret: 'JWT Secret',
  }

  if (isLoading) return <div className="p-6 text-gray-400">Đang tải...</div>

  return (
    <div className="max-w-2xl space-y-8">

      {/* SMTP */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-base mb-2">Cấu hình Email (SMTP)</h3>
        <p className="text-xs text-gray-500">Các thay đổi có hiệu lực ngay — không cần restart server.</p>

        {['smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','smtp_secure'].map(key => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{LABEL[key]}</label>
            <input
              type={key === 'smtp_pass' ? 'password' : 'text'}
              value={f(key)}
              onChange={e => set(key, e.target.value)}
              placeholder={key === 'smtp_pass' ? 'Nhập để thay đổi' : ''}
              className="input-field text-sm"
            />
          </div>
        ))}

        {/* Test SMTP */}
        <div className="pt-2 border-t flex gap-2 items-center">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="Email nhận thử..."
            className="input-field text-sm flex-1"
          />
          <button
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending || !testEmail}
            className="btn-outline text-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <FlaskConical size={14} />
            {testMut.isPending ? 'Đang gửi...' : 'Gửi thử'}
          </button>
        </div>
      </div>

      {/* CORS */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-base mb-2">CORS — Frontend URLs</h3>
        <p className="text-xs text-gray-500">
          Nhập các domain frontend được phép, phân cách bằng dấu phẩy.<br/>
          Ví dụ: <code className="bg-gray-100 px-1 rounded">https://reva.vn,https://www.reva.vn</code>
        </p>
        <textarea
          value={f('client_urls')}
          onChange={e => set('client_urls', e.target.value)}
          rows={3}
          className="input-field text-sm font-mono"
        />
      </div>

      {/* Bảo mật */}
      <div className="bg-white border rounded-lg p-6 space-y-5">
        <h3 className="font-medium text-base mb-2">Bảo mật</h3>

        {/* JWT Secret */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-600">JWT Secret</label>
          <input
            type="password"
            value={f('jwt_secret')}
            onChange={e => set('jwt_secret', e.target.value)}
            placeholder="Nhập để thay đổi (để trống = dùng biến môi trường JWT_SECRET)"
            className="input-field text-sm font-mono"
          />
          <div className="text-xs text-gray-500 space-y-1 pt-1">
            <p><strong>JWT Secret là gì?</strong> Chuỗi bí mật dùng để ký và xác minh token đăng nhập (JWT). Ai có chuỗi này có thể tạo token giả mạo — cần giữ tuyệt mật.</p>
            <p><strong>Cách tạo:</strong> Chạy lệnh sau trong terminal server:</p>
            <code className="block bg-gray-100 px-2 py-1 rounded font-mono text-xs">
              node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
            </code>
            <p className="text-amber-600 font-medium">⚠ Thay đổi JWT Secret sẽ đăng xuất tất cả người dùng ngay lập tức (token cũ không còn hợp lệ).</p>
            <p>Nếu để trống, hệ thống sẽ dùng biến môi trường <code className="bg-gray-100 px-1 rounded">JWT_SECRET</code> trong file <code className="bg-gray-100 px-1 rounded">.env.production</code>.</p>
          </div>
        </div>

        {/* DB Password — read-only info */}
        <div className="space-y-1.5 pt-4 border-t">
          <label className="block text-xs font-medium text-gray-600">DB Password (thông tin)</label>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 text-xs text-gray-600 space-y-1.5">
            <p><strong>DB Password là gì?</strong> Mật khẩu kết nối tới cơ sở dữ liệu PostgreSQL. Đây là thông tin xác thực đầu tiên cần có để hệ thống hoạt động.</p>
            <p><strong>Không thể lưu vào DB</strong> vì cần mật khẩu để kết nối DB trước — vòng tròn phụ thuộc (chicken-and-egg).</p>
            <p><strong>Cách đặt:</strong> Thêm vào file <code className="bg-gray-100 px-1 rounded">.env.production</code> trên server:</p>
            <code className="block bg-gray-100 px-2 py-1 rounded font-mono">DB_PASSWORD=mật_khẩu_của_bạn</code>
            <p>Sau đó restart container/server để áp dụng.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => saveMut.mutate(form)}
        disabled={saveMut.isPending}
        className="btn-primary"
      >
        {saveMut.isPending ? 'Đang lưu...' : 'Lưu cài đặt hệ thống'}
      </button>

      {/* AI usage viewer (admin) */}
      <div className="bg-white border rounded-lg p-6 mt-6">
        <h3 className="font-medium text-base mb-2">AI Usage (admin)</h3>
        <div className="flex items-center gap-2 mb-3">
          <input type="date" value={aiUsageDate} onChange={(e) => setAiUsageDate(e.target.value)} className="form-input" />
          <button onClick={async () => { const res = await getAiUsage(aiUsageDate); setAiUsageRows(res.data.data) }} className="btn-outline">Tải</button>
        </div>
        <div className="text-sm text-gray-600">
          {aiUsageRows.length === 0 ? <p className="text-xs text-gray-400">Chưa có dữ liệu cho ngày này</p> : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th>User</th><th>Endpoint</th><th>Calls</th>
                </tr>
              </thead>
              <tbody>
                {aiUsageRows.map(r => (
                  <tr key={`${r.user_id}-${r.endpoint}`} className="border-t"><td>{r.username || r.user_id}</td><td>{r.endpoint}</td><td>{r.calls}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
function CommissionTab() {
  const qc = useQueryClient()
  const DEFAULT_TIERS = [
    { max: 60000,  type: 'fixed',   amount: 20000, label: 'Dưới 60k' },
    { max: 130000, type: 'fixed',   amount: 30000, label: '60k – 130k' },
    { max: null,   type: 'percent', amount: 25,    label: 'Trên 130k' },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => getPublicSettings().then(r => r.data.data),
  })

  const { can } = useAuth()
  const [tiers, setTiers] = useState(null)
  const [applyToAll, setApplyToAll] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (!isLoading && !initialized) {
    setTiers(data?.commission_tiers || DEFAULT_TIERS)
    setInitialized(true)
  }

  const saveMut = useMutation({
    mutationFn: (t) => saveSystemSettings({ commission_tiers: JSON.stringify(t) }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['public-settings'] })
      toast.success('Đã lưu công thức phí ký gửi')
      if (applyToAll && can('settings:system')) {
        try {
          const res = await recalcCommissions({ scope: 'all' })
          toast.success(`Đã cập nhật hoa hồng cho ${res.data.updated} sản phẩm`)
          qc.invalidateQueries({ queryKey: ['admin-products'] })
        } catch (e) {
          toast.error(e.response?.data?.message || 'Lỗi khi cập nhật hoa hồng cho sản phẩm')
        }
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const update = (i, field, val) => setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))

  const addTier = () => setTiers(prev => [...prev, { max: null, type: 'fixed', amount: 0, label: '' }])
  const removeTier = (i) => setTiers(prev => prev.filter((_, idx) => idx !== i))

  const fmtPreview = (tier) => {
    if (tier.type === 'percent') return `${tier.amount}% / sản phẩm`
    return `${Number(tier.amount).toLocaleString('vi-VN')}đ / sản phẩm`
  }

  if (isLoading || !tiers) return <div className="p-6 text-gray-400">Đang tải...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-medium text-base mb-1">Công thức phí ký gửi</h3>
        <p className="text-xs text-gray-500 mb-5">
          Các bậc giá được áp dụng theo thứ tự tăng dần. Bậc cuối (không có giá trần) là mặc định cho mọi giá cao hơn.
        </p>

        {can('settings:system') && (
          <div className="mb-4 flex items-center gap-3">
            <label className="form-label text-sm mb-0">Áp dụng cho toàn bộ sản phẩm</label>
            <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} className="h-4 w-4" />
            <p className="text-xs text-gray-500">Bật để áp quy tắc mới cho cả sản phẩm cũ (bao gồm đã lưu commission_amount).</p>
          </div>
        )}

        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-3">
              <div className="col-span-3">
                <label className="text-xs text-gray-400 block mb-1">Nhãn</label>
                <input
                  value={tier.label || ''}
                  onChange={e => update(i, 'label', e.target.value)}
                  className="form-input w-full text-sm"
                  placeholder="VD: Dưới 60k"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Giá trần (VND)</label>
                <input
                  type="number"
                  value={tier.max ?? ''}
                  onChange={e => update(i, 'max', e.target.value === '' ? null : Number(e.target.value))}
                  className="form-input w-full text-sm"
                  placeholder="Trống = không giới hạn"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Loại phí</label>
                <select
                  value={tier.type}
                  onChange={e => update(i, 'type', e.target.value)}
                  className="form-input w-full text-sm"
                >
                  <option value="fixed">Cố định (đ)</option>
                  <option value="percent">Phần trăm (%)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">
                  {tier.type === 'percent' ? 'Phần trăm (%)' : 'Số tiền (đ)'}
                </label>
                <input
                  type="number"
                  value={tier.amount}
                  onChange={e => update(i, 'amount', Number(e.target.value))}
                  className="form-input w-full text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Xem trước</label>
                <p className="text-sm font-semibold text-hun-green">{fmtPreview(tier)}</p>
              </div>
              <div className="col-span-1 flex items-end pb-1">
                <button
                  onClick={() => removeTier(i)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                  title="Xóa bậc"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addTier}
          className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <Plus size={15} /> Thêm bậc
        </button>
      </div>

      {/* Preview */}
      <div className="bg-hun-cream border border-hun-beige rounded-lg p-5">
        <p className="text-xs font-medium text-hun-brown uppercase tracking-widest mb-4">Xem trước hiển thị trang chủ</p>
        <div className="grid grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <div key={i} className="bg-white border border-hun-beige p-4 text-center">
              <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">{tier.label || `Bậc ${i + 1}`}</p>
              <p className="font-serif text-lg font-semibold">{fmtPreview(tier)}</p>
              <p className="text-xs text-gray-400 mt-1">REVA nhận</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => saveMut.mutate(tiers)}
        disabled={saveMut.isPending}
        className="btn-primary"
      >
        {saveMut.isPending ? 'Đang lưu...' : 'Lưu công thức phí'}
      </button>
    </div>
  )
}