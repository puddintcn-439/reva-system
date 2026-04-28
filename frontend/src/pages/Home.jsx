import { Link } from 'react-router-dom'
import { ArrowRight, Leaf, RefreshCw, Heart } from 'lucide-react'

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center text-center px-4 bg-hun-cream">
        <p className="text-xs tracking-[0.4em] uppercase text-hun-brown mb-6">
          Thời trang bền vững · Hà Nội
        </p>
        <h1 className="font-serif text-6xl md:text-8xl font-bold text-hun-black mb-6 leading-none">
          REVA
        </h1>
        <p className="text-lg md:text-xl text-gray-600 italic font-serif mb-10 max-w-md">
          "Go green before green goes."
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/consign" className="btn-primary">
            Ký Gửi Ngay <ArrowRight size={16} className="ml-2" />
          </Link>
          <Link to="/about" className="btn-outline">
            Tìm Hiểu Thêm
          </Link>
        </div>
      </section>

      {/* What we do */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-14 h-14 bg-hun-green/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <RefreshCw className="text-hun-green" size={24} />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Ký Gửi</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Mang trang phục không dùng đến REVA. Chúng tôi treo bán 50–60 ngày và
                chuyển khoản khi đến hạn.
              </p>
              <Link to="/consign" className="inline-block mt-4 text-xs tracking-widest uppercase text-hun-brown hover:underline">
                Xem chi tiết →
              </Link>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-hun-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Heart className="text-hun-gold" size={24} />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Thu Mua</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Muốn nhận tiền ngay? REVA thu mua đồ no-brand và brand với giá theo kg
                hoặc theo chiếc.
              </p>
              <Link to="/buy" className="inline-block mt-4 text-xs tracking-widest uppercase text-hun-brown hover:underline">
                Xem chi tiết →
              </Link>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-hun-brown/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Leaf className="text-hun-brown" size={24} />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3">Bền Vững</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Mỗi sản phẩm tái sử dụng là một bước nhỏ hướng tới thời trang bền vững
                và bảo vệ môi trường.
              </p>
              <Link to="/about" className="inline-block mt-4 text-xs tracking-widest uppercase text-hun-brown hover:underline">
                Về chúng tôi →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Fee overview */}
      <section className="py-20 bg-hun-cream">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-hun-brown mb-4">Phí Ký Gửi</p>
          <h2 className="section-title mb-12">Minh bạch &amp; Công bằng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { range: 'Dưới 60k',     fee: '20k / sản phẩm',  bg: 'bg-white' },
              { range: '60k – 130k',   fee: '30k / sản phẩm',  bg: 'bg-hun-beige' },
              { range: 'Trên 130k',    fee: '25% / sản phẩm',  bg: 'bg-white' },
            ].map(({ range, fee, bg }) => (
              <div key={range} className={`${bg} border border-hun-beige p-6`}>
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">{range}</p>
                <p className="font-serif text-2xl font-semibold text-hun-black">{fee}</p>
                <p className="text-xs text-gray-400 mt-1">REVA nhận</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            Không bán được → Không mất phí
          </p>
          <Link to="/consign" className="btn-primary inline-flex mt-8">
            Đăng ký ký gửi <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </section>

      {/* Lookup CTA */}
      <section className="py-16 bg-hun-black text-white text-center px-4">
        <h2 className="font-serif text-3xl font-semibold mb-4">Tra cứu quyết toán</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
          Kiểm tra trạng thái bán hàng và số tiền cần nhận của bạn tại đây.
        </p>
        <Link to="/sales" className="btn-outline border-white text-white hover:bg-white hover:text-hun-black">
          Xem quyết toán →
        </Link>
      </section>
    </div>
  )
}