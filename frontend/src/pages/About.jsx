import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLocations } from '../services/api'
import { MapPin, Phone } from 'lucide-react'

const TIMELINE = [
  { year: '2021', label: 'Mở rộng quy mô' },
  { year: '2022', label: 'Tối ưu quy trình' },
  { year: '2024', label: 'Tách biệt phân khúc' },
  { year: '2026', label: 'Phát triển bền vững' },
]

export default function About() {
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations().then((r) => r.data.data),
  })

  return (
    <div>
      {/* Hero */}
      <section className="py-24 bg-hun-cream">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-xs tracking-widest uppercase text-gray-400 hover:text-hun-brown mb-8 inline-block">
            ← Trang chủ
          </Link>
          <h1 className="section-title mb-8">Chào bạn, chúng mình là REVA</h1>
          <div className="prose prose-lg text-gray-600 space-y-4 text-[15px] leading-relaxed">
            <p>
              Chúng mình chọn dịch vụ thanh lý – ký gửi với mong muốn cùng bạn nỗ lực xây dựng
              thời trang bền vững. Một hình thức bạn mang quần áo không sử dụng tới bên trung gian
              để thanh lý cho người cần.
            </p>
            <p>
              Nếu bạn yêu môi trường nhưng chưa thể cắt giảm ngay nhu cầu của mình thì hãy cùng
              REVA bắt đầu bằng việc tái sử dụng nhé!
            </p>
            <p>
              REVA sẵn lòng là cầu nối để giúp bạn tìm được thứ bạn cần, quần áo lại được tái
              vòng đời yêu thương.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="section-title text-center mb-14">Hành trình của REVA</h2>
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 h-full w-px bg-hun-beige hidden md:block" />
            <div className="space-y-10">
              {TIMELINE.map(({ year, label }, i) => (
                <div
                  key={year}
                  className={`flex items-center gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="card inline-block">
                      <p className="text-xs tracking-widest text-hun-gold uppercase mb-1">{year}</p>
                      <p className="font-serif text-lg font-semibold">{label}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-hun-black rounded-full flex items-center justify-center shrink-0 z-10">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Note */}
      <section className="py-6 bg-hun-beige border-y border-hun-beige">
        <div className="max-w-3xl mx-auto px-4 text-sm text-gray-600 text-center">
              <strong>Lưu ý:</strong> REVA hiện chỉ bán tại cửa hàng · Thời gian: <strong>10h – 20h30</strong> hàng ngày
        </div>
      </section>

      {/* Locations */}
      <section className="py-20 bg-hun-cream">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="section-title text-center mb-12">Cơ sở tại Hà Nội</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(locations || []).map((loc) => (
              <div key={loc.id} className="card hover:shadow-md transition-shadow">
                <span className="badge bg-hun-brown/10 text-hun-brown mb-3">{loc.type}</span>
                <h3 className="font-serif text-lg font-semibold mb-2">{loc.name}</h3>
                <p className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-hun-brown" />
                  {loc.address}
                </p>
                {loc.phone && (
                  <a href={`tel:${loc.phone}`} className="flex items-center gap-2 text-sm text-hun-brown hover:underline">
                    <Phone size={14} />
                    {loc.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
