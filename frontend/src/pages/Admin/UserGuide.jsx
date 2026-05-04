import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { BookOpen, ChevronRight, ArrowUp } from 'lucide-react'

// Table of contents entries (mirroring the 17 sections in the guide)
const TOC = [
  { id: 1, label: 'Tổng quan hệ thống' },
  { id: 2, label: 'Trang dành cho khách hàng (Public)' },
  { id: 3, label: 'Đăng nhập hệ thống quản trị' },
  { id: 4, label: 'Phân quyền người dùng' },
  { id: 5, label: 'Tổng quan (Dashboard)' },
  { id: 6, label: 'Bán hàng tại quầy (POS)' },
  { id: 7, label: 'Lịch sử bán hàng & Hoàn trả' },
  { id: 8, label: 'Khách hàng mua' },
  { id: 9, label: 'Quản lý sản phẩm' },
  { id: 10, label: 'Khách hàng ký gửi (Consignors)' },
  { id: 11, label: 'Yêu cầu ký gửi (Consignments)' },
  { id: 12, label: 'Thu mua (Purchases)' },
  { id: 13, label: 'Quyết toán (Settlements)' },
  { id: 14, label: 'Cài đặt hệ thống (Settings)' },
  { id: 15, label: 'Quản lý tài khoản (Users)' },
  { id: 16, label: 'Quy trình nghiệp vụ đầu cuối' },
  { id: 17, label: 'Câu hỏi thường gặp & Xử lý sự cố' },
]

// Custom renderers — map markdown elements to Tailwind-styled elements
const components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-hun-black font-serif mt-0 mb-2 pb-3 border-b-2 border-hun-brown">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => {
    // Use the section number as id for TOC anchoring
    const text = typeof children === 'string' ? children : ''
    const match = text.match(/^(\d+)\./)
    const id = match ? `section-${match[1]}` : undefined
    return (
      <h2 id={id} className="text-xl font-bold text-hun-brown mt-10 mb-3 scroll-mt-20">
        {children}
      </h2>
    )
  },
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-hun-black mt-6 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-1">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 pl-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 pl-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-gray-700 leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-hun-brown bg-hun-cream/60 px-4 py-2 my-3 rounded-r text-sm text-gray-600 italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-gray-100 text-hun-brown px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    ) : (
      <pre className="bg-gray-900 text-green-300 rounded-lg p-4 overflow-x-auto my-3 text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-hun-black text-white">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="hover:bg-hun-cream/40 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-gray-700 text-xs">{children}</td>
  ),
  hr: () => <hr className="my-8 border-hun-beige" />,
  strong: ({ children }) => <strong className="font-semibold text-hun-black">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} className="text-hun-brown underline hover:text-hun-gold transition-colors" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

export default function UserGuide() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(1)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    fetch('/guide.md')
      .then(r => r.text())
      .then(text => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent('# Không tải được hướng dẫn\n\nVui lòng thử lại sau.')
        setLoading(false)
      })
  }, [])

  // Track scroll to highlight active TOC item and show scroll-top button
  useEffect(() => {
    const container = document.getElementById('guide-content')
    if (!container) return

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 400)

      // Find which section is currently in view
      for (let i = TOC.length; i >= 1; i--) {
        const el = document.getElementById(`section-${i}`)
        if (el && el.getBoundingClientRect().top < 160) {
          setActiveSection(i)
          break
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loading])

  const scrollToSection = (id) => {
    const el = document.getElementById(`section-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  const scrollToTop = () => {
    document.getElementById('guide-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex gap-0 -m-6 h-[calc(100vh-3.5rem)]">
      {/* Sidebar TOC */}
      <aside className="hidden xl:flex flex-col w-72 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 text-hun-brown">
            <BookOpen size={18} />
            <span className="font-semibold text-sm tracking-wide">Mục lục</span>
          </div>
        </div>
        <nav className="p-3 space-y-0.5">
          {TOC.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs leading-snug transition-colors ${
                activeSection === id
                  ? 'bg-hun-brown/10 text-hun-brown font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-hun-black'
              }`}
            >
              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeSection === id ? 'bg-hun-brown text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {id}
              </span>
              <span className="truncate">{label}</span>
              {activeSection === id && <ChevronRight size={12} className="shrink-0 ml-auto" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div id="guide-content" className="flex-1 overflow-y-auto bg-gray-50 relative">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex flex-col gap-4 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`h-4 bg-gray-200 rounded animate-pulse ${i % 3 === 0 ? 'w-1/3' : i % 3 === 1 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
          ) : (
            <article className="prose-custom">
              <ReactMarkdown components={components}>{content}</ReactMarkdown>
            </article>
          )}
        </div>

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-hun-brown text-white rounded-full shadow-lg hover:bg-hun-black transition-colors z-50"
            aria-label="Về đầu trang"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
