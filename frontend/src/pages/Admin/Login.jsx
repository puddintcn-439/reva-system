import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import BrandLogo from '../../components/BrandLogo'

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form)
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hun-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <BrandLogo variant="stacked" size="md" align="center" className="mb-4" />
          <p className="text-xs tracking-widest text-gray-400 mt-1 uppercase">Quản trị hệ thống</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-hun-beige p-8 space-y-5">
          <div>
            <label className="form-label">Tên đăng nhập</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="form-input"
              placeholder="admin"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="form-input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-gray-400">
          © 2026 REVA Thanh Lý Ký Gửi
        </p>
      </div>
    </div>
  )
}
