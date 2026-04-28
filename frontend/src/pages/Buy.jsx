import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { submitPurchase } from '../services/api'
import { CheckCircle, AlertCircle } from 'lucide-react'

const PRICE_TABLE = [
  {
    type: 'Đồ No Brand',
    price: '80k – 100k / kg',
    icon: (
      <span className="w-14 h-14 mx-auto mb-4 rounded-full bg-hun-beige flex items-center justify-center text-hun-brown">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7.5C4 6 5 5 6.5 5h11C19 5 20 6 20 7.5V11c0 2-2 3.5-8 3.5S4 13 4 11V7.5z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 5v-1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    ),
  },
  {
    type: 'Đồ Brand',
    price: '150k – 200k / kg',
    icon: (
      <span className="w-14 h-14 mx-auto mb-4 rounded-full bg-hun-beige flex items-center justify-center text-hun-brown">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 9.5h16v7.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 9.5V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12.5a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    ),
  },
  {
    type: 'Phụ kiện',
    price: 'Báo giá theo chiếc',
    icon: (
      <span className="w-14 h-14 mx-auto mb-4 rounded-full bg-hun-beige flex items-center justify-center text-hun-brown">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 7l2.2-3.5a1 1 0 0 1 1.6-.2l1.5 1.8a1 1 0 0 1-.2 1.5L15 9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 11c-1.5 0-4 2-4 4.5 0 2 1.8 4 6 4s6-2 6-4c0-2.5-2.5-4.5-4-4.5H10z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 7c.7 1.4 1.8 2 3 2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    ),
  },
]

const CLOTHING_CRITERIA = [
  'Quần áo độ mới cao trên 90%',
  'Không thu đồ quá dày như áo dạ dài, đồ đính đá nhiều hay dây xích nặng',
]

const ACC_CRITERIA = [
  'Túi xách, giày dép cần được lau sạch, không bong tróc da',
]

export default function Buy() {
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      await submitPurchase(data)
      toast.success('Yêu cầu thu mua đã được ghi nhận!')
      setSubmitted(true)
      reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  return (
    <div>
      {/* Header */}
      <section className="py-16 bg-hun-cream border-b border-hun-beige">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-xs tracking-widest uppercase text-gray-400 hover:text-hun-brown mb-8 inline-block">
            ← Trang chủ
          </Link>
          <h1 className="section-title mb-2">Thu Mua</h1>
          <p className="text-gray-500">Nhận tiền ngay · Thu mua theo mùa và có chọn lọc</p>
        </div>
      </section>

      {/* Price table */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRICE_TABLE.map(({ type, price, icon }) => (
              <div key={type} className="card text-center hover:shadow-md transition-shadow">
                <span className="text-4xl mb-4 block">{icon}</span>
                <h3 className="font-serif text-lg font-semibold mb-2">{type}</h3>
                <p className="text-hun-brown font-medium">{price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Criteria */}
      <section className="py-16 bg-hun-cream">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-8">Tiêu Chí Nhận Thu Mua</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">Quần áo</h3>
              <ul className="space-y-3">
                {CLOTHING_CRITERIA.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-hun-green mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">Phụ kiện</h3>
              <ul className="space-y-3">
                {ACC_CRITERIA.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-hun-green mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-8">Đăng Ký Thu Mua</h2>

          {submitted ? (
            <div className="text-center py-16 border border-hun-green bg-hun-green/5">
              <CheckCircle size={48} className="text-hun-green mx-auto mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Đã ghi nhận!</h3>
              <p className="text-gray-600 text-sm mb-6">Chúng tôi sẽ liên hệ với bạn sớm.</p>
              <button onClick={() => setSubmitted(false)} className="btn-outline">Gửi yêu cầu khác</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Họ và tên *</label>
                  <input
                    {...register('full_name', { required: 'Bắt buộc' })}
                    className="form-input" placeholder="Nguyễn Thị A"
                  />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Số điện thoại *</label>
                  <input
                    {...register('phone', { required: 'Bắt buộc' })}
                    className="form-input" placeholder="09xx xxx xxx"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                <input {...register('email')} type="email" className="form-input" />
              </div>

              <div>
                <label className="form-label">Loại sản phẩm *</label>
                <select
                  {...register('item_type', { required: 'Chọn loại sản phẩm' })}
                  className="form-input"
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="no_brand">Đồ No Brand</option>
                  <option value="brand">Đồ Brand</option>
                  <option value="accessories">Phụ kiện</option>
                </select>
                {errors.item_type && <p className="text-red-500 text-xs mt-1">{errors.item_type.message}</p>}
              </div>

              <div>
                <label className="form-label">Số lượng ước tính (kg)</label>
                <input {...register('quantity_kg')} type="number" step="0.5" min="0" className="form-input" placeholder="Ví dụ: 2.5" />
              </div>

              <div>
                <label className="form-label">Mô tả thêm</label>
                <textarea {...register('description')} rows={3} className="form-input" placeholder="Mô tả loại đồ, số lượng, tình trạng..." />
              </div>

              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>Thu mua theo mùa và có chọn lọc. Chúng tôi sẽ liên hệ xác nhận trước khi đến.</p>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu thu mua'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
