import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getLocations, submitConsignment } from '../services/api'
import { CheckCircle } from 'lucide-react'

const FEE_TABLE = [
  { range: 'Dưới 60k',   fee: '20.000đ / sản phẩm', note: 'Bạn nhận: Giá bán – 20k' },
  { range: '60k – 130k', fee: '30.000đ / sản phẩm', note: 'Ví dụ: 130k → bạn nhận 100k' },
  { range: 'Trên 130k',  fee: '25%',                 note: 'REVA nhận 25% giá bán' },
]

const CRITERIA = [
  'Nhận từ 5 sản phẩm: quần áo nữ, túi xách, giày dép, phụ kiện, nước hoa, mỹ phẩm',
  'Quần áo độ mới cao trên 90%, trẻ trung và thanh lịch',
  'Nhận đồ hè (tháng 02–08), nhận đồ đông (tháng 09–01)',
  'Túi xách, giày dép cần được làm sạch, không bong tróc',
  'Phụ kiện trang sức nhận hàng có thương hiệu hoặc từ xưởng',
  'Hỗ trợ thanh lý xả kho cho các shop / xưởng',
]

export default function Consign() {
  const [activeTab, setActiveTab] = useState('direct')
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations().then((r) => r.data.data),
  })

  const onSubmit = async (data) => {
    try {
      await submitConsignment({ ...data, request_type: activeTab })
      toast.success('Yêu cầu ký gửi đã được ghi nhận!')
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
          <h1 className="section-title mb-2">Ký Gửi</h1>
          <p className="text-gray-500">Nhận tiền sau 50 – 60 ngày</p>
        </div>
      </section>

      {/* Fee table */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-8">Phí Ký Gửi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {FEE_TABLE.map(({ range, fee, note }) => (
              <div key={range} className="border border-hun-beige p-5 bg-hun-cream">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{range}</p>
                <p className="font-serif text-xl font-semibold text-hun-black mb-1">{fee}</p>
                <p className="text-xs text-gray-400">{note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-hun-green font-medium">
            ✓ Không bán được → Không mất phí
          </p>
        </div>
      </section>

      {/* Criteria */}
      <section className="py-16 bg-hun-cream">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-8">Tiêu Chí Nhận Ký Gửi</h2>
          <ul className="space-y-3">
            {CRITERIA.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle size={16} className="text-hun-green mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-8">Đăng Ký Ký Gửi</h2>

          {submitted ? (
            <div className="text-center py-16 border border-hun-green bg-hun-green/5">
              <CheckCircle size={48} className="text-hun-green mx-auto mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Đã ghi nhận!</h3>
              <p className="text-gray-600 text-sm mb-6">
                Chúng tôi sẽ liên hệ với bạn sớm để xác nhận lịch hẹn.
              </p>
              <button onClick={() => setSubmitted(false)} className="btn-outline">
                Gửi yêu cầu khác
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex mb-8 border border-hun-beige">
                {[
                  { id: 'direct', label: 'Ký Gửi Trực Tiếp', desc: 'Khuyên dùng cho khách nội thành' },
                  { id: 'online', label: 'Ký Gửi Online',     desc: 'Gửi đồ qua đường bưu điện' },
                ].map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 p-4 text-left transition-colors ${
                      activeTab === id ? 'bg-hun-black text-white' : 'bg-white text-hun-black hover:bg-hun-cream'
                    }`}
                  >
                    <p className="text-sm font-medium tracking-wide">{label}</p>
                    <p className={`text-xs mt-0.5 ${activeTab === id ? 'text-gray-300' : 'text-gray-500'}`}>{desc}</p>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Họ và tên *</label>
                    <input
                      {...register('full_name', { required: 'Vui lòng nhập họ tên' })}
                      className="form-input"
                      placeholder="Nguyễn Thị A"
                    />
                    {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      {...register('phone', { required: 'Vui lòng nhập số điện thoại' })}
                      className="form-input"
                      placeholder="09xx xxx xxx"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input" placeholder="email@example.com" />
                </div>

                {activeTab === 'direct' && (
                  <div>
                    <label className="form-label">Cơ sở muốn đến</label>
                    <select {...register('location_id')} className="form-input">
                      <option value="">-- Chọn cơ sở --</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} – {l.address}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'direct' && (
                  <div>
                    <label className="form-label">Ngày muốn đến</label>
                    <input {...register('scheduled_date')} type="date" className="form-input" />
                  </div>
                )}

                <div>
                  <label className="form-label">Ghi chú (mô tả sản phẩm muốn ký gửi)</label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="form-input"
                    placeholder="Ví dụ: 10 áo sơ mi nữ, 5 quần jeans, 3 túi xách..."
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu ký gửi'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Steps for direct */}
      <section className="py-16 bg-hun-cream">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-2xl font-semibold mb-10 text-center">Quy trình ký gửi trực tiếp</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: 1, text: 'Gọi hotline để xếp lịch (10h–20h30)' },
              { n: 2, text: 'Mang tới REVA, thoả thuận giá bán trực tiếp' },
              { n: 3, text: 'Đồ được treo bán 50–60 ngày' },
              { n: 4, text: 'Tra cứu & nhận chuyển khoản khi đến hạn' },
            ].map(({ n, text }) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 bg-hun-black text-white rounded-full flex items-center justify-center font-serif text-xl font-bold mx-auto mb-4">
                  {n}
                </div>
                <p className="text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
