import { useState } from 'react'
import { Link } from 'react-router-dom'
import { lookupSettlement } from '../services/api'
import { Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import { fmtMoney as fmt } from '../utils/format'

const statusConfig = {
  pending: { label: 'Chưa thanh toán', icon: Clock,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
  paid:    { label: 'Đã thanh toán',   icon: CheckCircle,   color: 'text-green-600 bg-green-50 border-green-200' },
  cancelled:{ label: 'Đã hủy',        icon: XCircle,       color: 'text-red-600 bg-red-50 border-red-200' },
}

const PRODUCT_STATUS = {
  active:   { label: 'Đang bán',      cls: 'bg-green-100 text-green-700' },
  pending:  { label: 'Chờ duyệt',    cls: 'bg-yellow-100 text-yellow-700' },
  sold:     { label: 'Đã bán',        cls: 'bg-blue-100 text-blue-700' },
  returned: { label: 'Trả hàng',      cls: 'bg-gray-100 text-gray-500' },
  expired:  { label: 'Hết hạn',      cls: 'bg-red-100 text-red-600' },
}

const CONSIGN_STATS = [
  { key: 'active',   label: 'Đang bán',          color: 'text-green-600' },
  { key: 'pending',  label: 'Chờ duyệt',        color: 'text-yellow-600' },
  { key: 'sold',     label: 'Đã bán (tổng)',    color: 'text-blue-600' },
  { key: 'returned', label: 'Trả hàng',          color: 'text-gray-400' },
]

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

export default function Sales() {
  const [code, setCode]         = useState('')
  const [results, setResults]   = useState(null)
  const [consignmentSummary, setConsignmentSummary] = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)
    setConsignmentSummary(null)
    try {
      const res = await lookupSettlement(code.trim())
      setResults(res.data.data)
      setConsignmentSummary(res.data.consignment_summary || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra.')
    } finally {
      setLoading(false)
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
          <h1 className="section-title mb-4">Xem Quyết Toán</h1>
          <p className="text-gray-500 text-sm">
            Nhập mã khách hàng, mã quyết toán hoặc <strong>số điện thoại</strong> để tra cứu trạng thái bán hàng và số tiền cần nhận.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="py-16 bg-white">
        <div className="max-w-xl mx-auto px-4">
          <form onSubmit={handleSearch} className="flex gap-0">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Mã khách, mã QT hoặc số điện thoại"
              className="flex-1 form-input rounded-none border-r-0"
              style={{ textTransform: 'uppercase' }}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary rounded-none shrink-0"
            >
              <Search size={18} />
            </button>
          </form>

          {loading && (
            <div className="text-center py-12 text-gray-400">Đang tìm kiếm...</div>
          )}

          {error && (
            <div className="mt-6 p-4 border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {results && results.length === 0 && (
            <div className="mt-6 text-center py-12 text-gray-400">
              Không tìm thấy quyết toán nào.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="mt-8 space-y-8">
              <p className="text-sm text-gray-500">
                Tìm thấy <strong>{results.length}</strong> quyết toán cho{' '}
                <strong>{results[0].full_name}</strong>
              </p>

              {results.map((s) => {
                const cfg = statusConfig[s.status] || statusConfig.pending
                const StatusIcon = cfg.icon
                return (
                  <div key={s.id} className="border border-hun-beige">
                    {/* Settlement header */}
                    <div className="p-5 border-b border-hun-beige flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Kỳ quyết toán</p>
                        <p className="font-semibold">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</p>
                        <p className="text-xs text-gray-400 mt-1">Mã: {s.code}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border ${cfg.color}`}>
                        <StatusIcon size={14} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 divide-x divide-hun-beige">
                      {[
                        { label: 'Tổng bán được', value: fmt(s.total_sale) },
                        { label: 'Phí R.E.V.A',     value: fmt(s.total_commission) },
                        { label: 'Bạn nhận',       value: fmt(s.total_payout), bold: true },
                      ].map(({ label, value, bold }) => (
                        <div key={label} className="p-4 text-center">
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className={`font-semibold ${bold ? 'text-hun-green text-lg' : 'text-sm'}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Items */}
                    {s.items?.length > 0 && (
                      <div className="p-5 border-t border-hun-beige">
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Chi tiết sản phẩm</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-hun-beige">
                                <th className="text-left py-2 text-xs text-gray-500 font-medium">Sản phẩm</th>
                                <th className="text-right py-2 text-xs text-gray-500 font-medium">Giá bán</th>
                                <th className="text-right py-2 text-xs text-gray-500 font-medium">Phí</th>
                                <th className="text-right py-2 text-xs text-gray-500 font-medium">Bạn nhận</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.items.map((item) => (
                                <tr key={item.id} className="border-b border-hun-beige/50">
                                  <td className="py-2">
                                    {item.product_name}
                                    {item.product_code && <span className="text-xs text-gray-400 ml-1">({item.product_code})</span>}
                                  </td>
                                  <td className="py-2 text-right text-gray-600">{fmt(item.sale_price)}</td>
                                  <td className="py-2 text-right text-gray-400">{fmt(item.commission)}</td>
                                  <td className="py-2 text-right font-medium text-hun-green">{fmt(item.consignor_amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {s.status === 'paid' && s.paid_at && (
                      <div className="px-5 pb-4 text-xs text-gray-400">
                        Đã thanh toán ngày: {fmtDate(s.paid_at)}
                      </div>
                    )}
                  </div>
                )
              })}

            </div>
          )}

          {/* Consignment status section */}
          {consignmentSummary && results?.length > 0 && (
            <div className="border border-hun-beige mt-10">
              <div className="p-5 border-b border-hun-beige bg-hun-cream">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Tình trạng hàng ký gửi</p>
                <p className="font-semibold">{results[0].full_name}</p>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-hun-beige border-b border-hun-beige">
                {CONSIGN_STATS.map(({ key, label, color }) => {
                  const count = Number(consignmentSummary.by_status.find(r => r.status === key)?.count || 0)
                  return (
                    <div key={key} className="p-4 text-center">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`text-xl font-bold ${count > 0 ? color : 'text-gray-300'}`}>{count}</p>
                    </div>
                  )
                })}
              </div>

              {/* Active / pending products */}
              {consignmentSummary.active_products?.length > 0 && (
                <div className="p-5 border-b border-hun-beige">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Sản phẩm đang ký gửi</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hun-beige">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Sản phẩm</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Trạng thái</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Giá bán</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Bạn nhận</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Hết hạn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consignmentSummary.active_products.map((p) => {
                          const dLeft = p.consign_end ? Math.ceil((new Date(p.consign_end) - new Date()) / 86400000) : null
                          const st = PRODUCT_STATUS[p.status] || PRODUCT_STATUS.active
                          return (
                            <tr key={p.id} className="border-b border-hun-beige/50">
                              <td className="py-2 pr-2">
                                <span className="font-medium">{p.name}</span>
                                {p.code && <span className="text-xs text-gray-400 ml-1">({p.code})</span>}
                              </td>
                              <td className="py-2 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="py-2 text-right text-gray-600">{fmt(p.sale_price)}</td>
                              <td className="py-2 text-right font-medium text-hun-green">{fmt(p.consignor_amount)}</td>
                              <td className={`py-2 text-right text-xs ${dLeft !== null && dLeft <= 3 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {p.consign_end ? fmtDate(p.consign_end) : '—'}
                                {dLeft !== null && dLeft >= 0 && dLeft <= 7 && <span className="ml-1">({dLeft}d)</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sold but not yet settled */}
              {consignmentSummary.pending_payout?.length > 0 && (
                <div className="p-5 border-b border-hun-beige">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
                    Đã bán — Chờ quyết toán ({consignmentSummary.pending_payout.length} sản phẩm)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hun-beige">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Sản phẩm</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Giá bán</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Bạn nhận</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Ngày bán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consignmentSummary.pending_payout.map((p) => (
                          <tr key={p.id} className="border-b border-hun-beige/50">
                            <td className="py-2 pr-2">
                              <span className="font-medium">{p.name}</span>
                              {p.code && <span className="text-xs text-gray-400 ml-1">({p.code})</span>}
                            </td>
                            <td className="py-2 text-right text-gray-600">{fmt(p.sale_price)}</td>
                            <td className="py-2 text-right font-medium text-hun-green">{fmt(p.consignor_amount)}</td>
                            <td className="py-2 text-right text-xs text-gray-400">{fmtDate(p.sold_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-hun-beige font-medium">
                          <td className="pt-2 text-sm">Tổng chờ quyết toán</td>
                          <td></td>
                          <td className="pt-2 text-right text-hun-green">
                            {fmt(consignmentSummary.pending_payout.reduce((s, p) => s + Number(p.consignor_amount || 0), 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {consignmentSummary.active_products?.length === 0 && consignmentSummary.pending_payout?.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">Không có sản phẩm đang ký gửi hoặc chờ quyết toán.</div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-hun-cream border-t border-hun-beige text-center">
        <p className="text-sm text-gray-600 mb-4">Không tìm được mã? Liên hệ trực tiếp cửa hàng để được hỗ trợ.</p>
        <Link to="/contact" className="btn-outline">Liên hệ R.E.V.A</Link>
      </section>
    </div>
  )
}
