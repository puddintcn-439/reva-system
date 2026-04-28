import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLocations } from '../../services/api'
import BrandLogo from '../BrandLogo'

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/reva.thanhly',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/reva.thanhly',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'Zalo',
    href: 'https://zalo.me/revathanhlykygui',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.974-1.393A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-1.5 6h1v1.5l2-1.5v5l-2-1.5V13h-1V8zm4.5 5H8v-1h7v1z"/>
      </svg>
    ),
  },
]

export default function Footer() {
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-public'],
    queryFn: () => getLocations().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <footer className="bg-hun-black text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand + Social */}
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-widest mb-3">REVA</h3>
            <p className="text-gray-400 text-sm italic mb-4">"Go green before green goes."</p>
            <p className="text-gray-400 text-xs mb-5">Khung giờ làm việc: 10h – 20h30</p>
            <div className="flex gap-3">
              {SOCIALS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-4">Dịch vụ</h4>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/consign', label: 'Ký Gửi' },
                { to: '/buy',     label: 'Thu Mua' },
                { to: '/sales',   label: 'Xem Quyết Toán' },
                { to: '/about',   label: 'Giới Thiệu' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-gray-300 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-4">Địa chỉ</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              {locations.map((loc) => (
                <li key={loc.id}>
                  {loc.map_url ? (
                    <a href={loc.map_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors group">
                      <span className="font-medium text-white block">{loc.name}</span>
                      <span className="text-gray-400 text-xs group-hover:text-gray-300">📍 {loc.address}</span>
                    </a>
                  ) : (
                    <>
                      <span className="font-medium text-white block">{loc.name}</span>
                      <span className="text-gray-400 text-xs">📍 {loc.address}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs text-gray-500">
          © 2026 REVA Thanh Lý Ký Gửi · Hà Nội
        </div>
      </div>
    </footer>
  )
}

