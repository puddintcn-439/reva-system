import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import BrandLogo from '../BrandLogo'

const NAV_LINKS = [
  { to: '/about',   label: 'GIỚI THIỆU' },
  { to: '/consign', label: 'KÝ GỬI' },
  { to: '/buy',     label: 'THU MUA' },
  { to: '/contact', label: 'TÌM REVA' },
  { to: '/sales',   label: 'XEM QUYẾT TOÁN' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-hun-cream border-b border-hun-beige sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="REVA trang chủ">
          <div className="md:hidden">
            <BrandLogo variant="mark" size="sm" />
          </div>
          <div className="hidden md:block">
            <BrandLogo variant="full" size="sm" />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-xs font-medium tracking-widest transition-colors ${
                  isActive ? 'text-hun-brown border-b border-hun-brown' : 'text-hun-black hover:text-hun-brown'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-hun-cream border-t border-hun-beige px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `text-sm font-medium tracking-widest py-2 border-b border-hun-beige ${
                  isActive ? 'text-hun-brown' : 'text-hun-black'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
