import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { value: 'admin',       label: 'Admin' },
  { value: 'manager',     label: 'Quản lý' },
  { value: 'staff',       label: 'Nhân viên' },
  { value: 'cashier',     label: 'Thu ngân' },
  { value: 'accountant',  label: 'Kế toán' },
  { value: 'inventory',   label: 'Quản lý kho' },
  { value: 'viewer',      label: 'Chỉ xem' },
]

const ROLE_CLS = {
  admin:      'bg-hun-brown text-white',
  manager:    'bg-indigo-600 text-white',
  staff:      'bg-blue-600 text-white',
  cashier:    'bg-gray-500 text-white',
  accountant: 'bg-green-700 text-white',
  inventory:  'bg-orange-600 text-white',
  viewer:     'bg-gray-400 text-white',
}

const EMPTY_FORM = { username: '', full_name: '', email: '', role: 'staff', password: '', location_id: '' }

export default function Users() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal]   = useState(null) // { mode: 'add'|'edit'|'pw', data: {} }
  const [form, setForm]     = useState(EMPTY_FORM)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })

  // ── fetch ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users').then(r => r.data.users),
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data.data || []),
  })

  // ── mutations ──────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (body) => api.post('/auth/users', body),
    onSuccess: () => { qc.invalidateQueries(['users']); close(); toast.success('Đã tạo tài khoản') },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi tạo tài khoản'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/auth/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['users']); close(); toast.success('Đã cập nhật') },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi cập nhật'),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/auth/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Đã xóa tài khoản') },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi xóa tài khoản'),
  })

  const changePw = useMutation({
    mutationFn: ({ id, password }) => api.put(`/auth/users/${id}`, { password }),
    onSuccess: () => { close(); toast.success('Đã đổi mật khẩu') },
    onError: (e) => toast.error(e.response?.data?.error || 'Lỗi đổi mật khẩu'),
  })

  // ── helpers ────────────────────────────────────────────────────
  const open = (mode, data = {}) => {
    setModal({ mode, data })
    if (mode === 'add')  setForm(EMPTY_FORM)
    if (mode === 'edit') setForm({ username: data.username, full_name: data.full_name || '', email: data.email || '', role: data.role, password: '', location_id: data.location_id || '' })
    if (mode === 'pw')   setPwForm({ password: '', confirm: '' })
  }
  const close = () => setModal(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (modal.mode === 'add')  create.mutate(form)
    if (modal.mode === 'edit') update.mutate({ id: modal.data.id, ...form })
  }

  const handlePw = (e) => {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirm) { toast.error('Mật khẩu không khớp'); return }
    changePw.mutate({ id: modal.data.id, password: pwForm.password })
  }

  const handleDelete = (u) => {
    if (!window.confirm(`Xóa tài khoản "${u.username}"?`)) return
    remove.mutate(u.id)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-hun-brown">Quản lý tài khoản</h1>
        <button onClick={() => open('add')} className="flex items-center gap-2 px-4 py-2 bg-hun-brown text-white rounded-lg hover:bg-hun-brown/90">
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Tên đăng nhập</th>
                <th className="px-4 py-3 text-left">Họ tên</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Cơ sở</th>
                <th className="px-4 py-3 text-left">Tạo lúc</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === me?.id && <span className="ml-2 text-xs text-gray-400">(bạn)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_CLS[u.role] || 'bg-gray-200'}`}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.location_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => open('edit', u)} title="Sửa" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => open('pw', u)} title="Đổi mật khẩu" className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded">
                        <KeyRound size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u)} title="Xóa" className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (modal.mode === 'add' || modal.mode === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {modal.mode === 'add' ? 'Thêm tài khoản mới' : 'Chỉnh sửa tài khoản'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên đăng nhập *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" required
                  value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  disabled={modal.mode === 'edit'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" required
                  value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cơ sở kinh doanh</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.location_id} onChange={e => setForm(p => ({ ...p, location_id: e.target.value }))}>
                  <option value="">— Không gắn cơ sở —</option>
                  {locations.filter(l => l.is_active).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              {modal.mode === 'add' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mật khẩu *</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" required
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-hun-brown text-white rounded-lg text-sm hover:bg-hun-brown/90">
                  {modal.mode === 'add' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {modal?.mode === 'pw' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Đổi mật khẩu — {modal.data.username}</h2>
            <form onSubmit={handlePw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mật khẩu mới *</label>
                <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" required
                  value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu *</label>
                <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" required
                  value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-hun-brown text-white rounded-lg text-sm hover:bg-hun-brown/90">Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
