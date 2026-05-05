import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getDashboardReports, exportFinancialReport, analyzeDashboard } from '../../services/api'
import { Package, Users, Receipt, ClipboardList, TrendingUp, Award, BarChart2, FileDown, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtMoney as fmt, downloadBlobResponse } from '../../utils/format'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────────────────────
const SHORT_MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

function fmtPeriod(isoStr, period) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (period === 'month') return `${SHORT_MONTHS[d.getMonth()]}/${d.getFullYear()}`
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function fmtK(v) {
  if (v == null) return '0'
  const n = Number(v)
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`
  return n.toString()
}

const CHART_COLORS = ['#8b6f47','#c9a84c','#4a7c59','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6']

// Custom tooltip
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI card skeleton ─────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white border rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState('day')
  const [months, setMonths] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [aiInsightLoading, setAiInsightLoading] = useState(false)

  const handleAnalyzeDashboard = async () => {
    if (!data) return
    setAiInsightLoading(true)
    try {
      const res = await analyzeDashboard({
        total_revenue:    data.products?.total_revenue,
        total_commission: data.products?.total_commission,
        items_sold:       data.products?.sold_count,
        items_active:     data.products?.active_count,
        items_pending:    data.products?.pending_count,
        period_months:    months,
      })
      setAiInsight(res.data.data.summary)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phân tích AI')
    } finally {
      setAiInsightLoading(false)
    }
  }

  const handleExportFinancial = async () => {
    setExporting(true)
    try {
      const today   = new Date()
      const yearAgo = new Date(today); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      const toISO   = (d) => d.toISOString().slice(0, 10)
      const res = await exportFinancialReport({ date_from: toISO(yearAgo), date_to: toISO(today) })
      downloadBlobResponse(res)
      toast.success('Đã xuất báo cáo tài chính')
    } catch {
      toast.error('Lỗi xuất báo cáo')
    } finally {
      setExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats().then((r) => r.data.data),
    refetchInterval: 30000,
  })

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['dashboard-reports', period, months],
    queryFn: () => getDashboardReports({ period, months }).then((r) => r.data.data),
    staleTime: 60_000,
  })

  const stats = [
    {
      title: 'Sản phẩm đang bán',
      value: data?.products?.active_count || 0,
      sub: `${data?.products?.sold_count || 0} đã bán`,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      to: '/admin/products',
    },
    {
      title: 'Khách hàng ký gửi',
      value: data?.consignors?.total || 0,
      sub: 'Tổng cộng',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      to: '/admin/consignors',
    },
    {
      title: 'Quyết toán chờ',
      value: data?.settlements?.pending_count || 0,
      sub: `Cần trả: ${fmt(data?.settlements?.pending_payout)}`,
      icon: Receipt,
      color: 'bg-amber-50 text-amber-600',
      to: '/admin/settlements',
    },
    {
      title: 'Yêu cầu ký gửi',
      value: data?.consignment_requests?.pending || 0,
      sub: 'Chưa xử lý',
      icon: ClipboardList,
      color: 'bg-green-50 text-green-600',
      to: '/admin/consignments',
    },
  ]

  // Prepare chart data
  const chartData = (reports?.revenue_chart || []).map((r) => ({
    label: fmtPeriod(r.period, period),
    'Doanh thu': Number(r.revenue) || 0,
    'REVA thu':  Number(r.commission) || 0,
    'Trả KH':    Number(r.payout) || 0,
  }))

  const categoryData = (reports?.category_breakdown || []).map((r) => ({
    name: r.category,
    revenue: Number(r.revenue) || 0,
    items: Number(r.items_sold) || 0,
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-1">Thống kê hoạt động của cửa hàng</p>
        </div>
        <button
          onClick={handleExportFinancial}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-hun-brown text-white text-sm font-medium rounded-lg hover:bg-hun-brown/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <FileDown size={16} />
          {exporting ? 'Đang xuất...' : 'Xuất báo cáo tài chính'}
        </button>
        <button
          onClick={handleAnalyzeDashboard}
          disabled={aiInsightLoading || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-600 text-sm font-medium rounded-lg hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles size={16} />
          {aiInsightLoading ? 'Đang phân tích...' : 'Phân tích AI'}
        </button>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ title, value, sub, icon: Icon, color, to }) => (
            <Link key={title} to={to} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-hun-brown transition-colors">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* AI Insight panel */}
      {aiInsight && (
        <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <Sparkles size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-purple-600 mb-1 uppercase tracking-wide">Nhận xét AI</p>
            <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
          </div>
          <button
            onClick={() => setAiInsight('')}
            className="text-purple-300 hover:text-purple-500 flex-shrink-0"
          ><X size={16} /></button>
        </div>
      )}

      {/* Revenue highlight bar */}
      {data?.products && (
        <div className="bg-hun-black text-white rounded-lg p-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">Doanh thu tổng (sản phẩm đã bán)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Tổng bán ra</p>
              <p className="font-serif text-3xl font-bold">{fmt(data.products.total_revenue)}</p>
            </div>
            <div className="sm:border-l sm:border-gray-700 sm:pl-6">
              <p className="text-xs text-amber-400 mb-1">REVA thu</p>
              <p className="font-serif text-3xl font-bold text-amber-400">{fmt(data.products.total_commission)}</p>
            </div>
            <div className="sm:border-l sm:border-gray-700 sm:pl-6">
              <p className="text-xs text-gray-400 mb-1">Trả khách hàng</p>
              <p className="font-serif text-3xl font-bold text-gray-300">{fmt(data.products.total_payout_all)}</p>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-gray-800">
            <Link to="/admin/products?status=sold" className="text-sm text-gray-400 hover:text-white transition-colors">
              Xem chi tiết sản phẩm đã bán →
            </Link>
          </div>
        </div>
      )}

      {/* ── Reports section ─────────────────────────────────────────────── */}
      <div>
        {/* Section header + filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-hun-brown" />
            <h2 className="text-lg font-semibold text-gray-900">Báo cáo doanh thu</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Period toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
              {[['day','Theo ngày'],['month','Theo tháng']].map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => setPeriod(v)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${period === v ? 'bg-white shadow text-hun-brown' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Range selector */}
            <select
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hun-brown/30"
            >
              <option value={1}>1 tháng</option>
              <option value={3}>3 tháng</option>
              <option value={6}>6 tháng</option>
              <option value={12}>12 tháng</option>
            </select>
          </div>
        </div>

        {reportsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border rounded-lg p-6 animate-pulse h-72">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="h-48 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Row 1: Revenue area chart (full width) */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-hun-brown" />
                <h3 className="text-sm font-semibold text-gray-700">Biểu đồ doanh thu</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {period === 'day' ? 'Doanh thu theo ngày' : 'Doanh thu theo tháng'} – {months} tháng gần nhất
              </p>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-gray-400 text-sm">Chưa có dữ liệu trong khoảng thời gian này</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b6f47" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b6f47" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area type="monotone" dataKey="Doanh thu" stroke="#8b6f47" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="REVA thu"  stroke="#c9a84c" strokeWidth={2} fill="url(#gradCommission)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="Trả KH"    stroke="#4a7c59" strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Row 2: Category bar + Top consignors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category breakdown */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 size={16} className="text-hun-brown" />
                  <h3 className="text-sm font-semibold text-gray-700">Doanh thu theo danh mục</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">{months} tháng gần nhất</p>
                {categoryData.length === 0 ? (
                  <div className="flex items-center justify-center h-52 text-gray-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={110} />
                      <Tooltip formatter={(v) => fmt(v)} cursor={{ fill: '#f5f0eb' }} />
                      <Bar dataKey="revenue" name="Doanh thu" radius={[0, 4, 4, 0]}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top consignors */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={16} className="text-hun-brown" />
                  <h3 className="text-sm font-semibold text-gray-700">Top 10 khách hàng ký gửi</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">{months} tháng gần nhất – theo doanh thu</p>
                {(!reports?.top_consignors?.length) ? (
                  <div className="flex items-center justify-center h-52 text-gray-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                  <div className="space-y-2 max-h-[232px] overflow-y-auto pr-1">
                    {reports.top_consignors.map((c, i) => {
                      const maxRev = Number(reports.top_consignors[0].total_revenue) || 1
                      const pct = Math.round((Number(c.total_revenue) / maxRev) * 100)
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className={`w-6 text-center text-xs font-bold shrink-0 ${i < 3 ? 'text-hun-brown' : 'text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <Link to={`/admin/consignors`} className="text-xs font-medium text-gray-800 truncate hover:text-hun-brown">{c.full_name}</Link>
                              <span className="text-xs font-semibold text-gray-700 ml-2 shrink-0">{fmt(c.total_revenue)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                            </div>
                            <div className="flex gap-3 mt-0.5 text-[10px] text-gray-400">
                              <span>{c.items_sold} sp</span>
                              <span>REVA: {fmt(c.total_commission)}</span>
                              <span>KH: {fmt(c.total_payout)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
