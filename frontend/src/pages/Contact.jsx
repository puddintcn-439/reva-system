import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLocations } from '../services/api'
import { MapPin, Phone, Clock } from 'lucide-react'

export default function Contact() {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations().then((r) => r.data.data),
  })

  return (
    <div>
      <section className="py-16 bg-hun-cream border-b border-hun-beige">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-xs tracking-widest uppercase text-gray-400 hover:text-hun-brown mb-8 inline-block">
            ← Trang chủ
          </Link>
          <h1 className="section-title mb-2">Tìm REVA</h1>
          <p className="text-gray-500 flex items-center gap-2 mt-3">
            <Clock size={16} className="text-hun-brown" />
            Khung giờ làm việc: 10h – 20h30 hàng ngày
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Đang tải...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {locations.map((loc) => (
                <div key={loc.id} className="card hover:shadow-lg transition-shadow group">
                  <span className="badge bg-hun-brown/10 text-hun-brown text-xs mb-4 inline-block">
                    {loc.type}
                  </span>
                  <h3 className="font-serif text-xl font-semibold mb-4">{loc.name}</h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-hun-brown mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">{loc.address}</p>
                    </div>
                    {loc.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-hun-brown shrink-0" />
                        <a
                          href={`tel:${loc.phone}`}
                          className="text-sm text-hun-brown font-medium hover:underline"
                        >
                          {loc.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-hun-brown shrink-0" />
                      <p className="text-sm text-gray-600">10h – 20h30</p>
                    </div>
                  </div>

                  {loc.map_url && (
                    <a
                      href={loc.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline w-full mt-5 text-xs"
                    >
                      Xem bản đồ
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-hun-cream border-t border-hun-beige">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl font-semibold mb-4">Có câu hỏi?</h2>
          <p className="text-gray-600 text-sm mb-8">
            Bạn có thể gọi trực tiếp đến các hotline cơ sở trong khung giờ hoạt động để được tư vấn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consign" className="btn-primary">Đăng ký ký gửi</Link>
            <Link to="/buy" className="btn-outline">Đăng ký thu mua</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
