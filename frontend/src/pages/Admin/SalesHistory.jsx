import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posSales, posSale, getActiveBank, posCancelSale, posMarkPaid } from '../../services/api'
import { Eye, Printer, Download, X, Search, Ban, CheckCircle2 } from 'lucide-react'
import { fmtMoney as fmt } from '../../utils/format'
import { saveReceiptPdf } from '../../utils/receipt'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—'

const PAYMENT_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', mixed: 'Kết hợp' }
const PAYMENT_COLORS = {
  cash: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  mixed: 'bg-purple-100 text-purple-700',
}
const STATUS_LABELS = { pending: 'Chưa thu', paid: 'Đã thu', cancelled: 'Đã hủy' }
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500 line-through',
}

// ── Receipt HTML ───────────────────────────────────────────────────────────
function buildReceiptHtml(sale, bank) {
  const items = sale.items || []

  const rows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        ${item.product_name}
        ${item.product_code ? `<div class="sub">#${item.product_code}</div>` : ''}
      </td>
      <td class="right">${fmt(item.sale_price)}</td>
    </tr>
  `).join('')

  const qrAmount = sale.payment_method === 'mixed'
    ? Math.round(Number(sale.final_amount) / 2)
    : Number(sale.final_amount)

  const qrUrl = bank
    ? `https://img.vietqr.io/image/${bank.bank_id}-${bank.account_no}-compact2.png?amount=${qrAmount}&addInfo=HD${sale.invoice_code}`
    : ''

  const showQr = ['transfer', 'mixed'].includes(sale.payment_method)

  return `
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body {
        font-family: monospace;
        width: 80mm;
        font-size: 10pt;
        padding: 6px;
      }

      .center { text-align: center }
      .right { text-align: right }

      .title {
        font-size: 16pt;
        font-weight: bold;
        letter-spacing: 2px;
      }

      .sub { font-size: 8pt; color: #666 }

      hr {
        border: none;
        border-top: 1px dashed #000;
        margin: 6px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      td {
        padding: 3px 0;
        vertical-align: top;
      }

      .bold { font-weight: bold }

      .total {
        font-size: 14pt;
        font-weight: bold;
      }

      .qr {
        text-align: center;
        margin-top: 8px;
      }

      .qr img {
        width: 120px;
      }
    </style>
  </head>

  <body>

    <div class="center title">REVA</div>
    <div class="center sub">THỜI TRANG KÝ GỬI</div>

    ${sale.location_name ? `<div class="center sub">${sale.location_name}</div>` : ''}

    <hr>

    <div class="center bold">HÓA ĐƠN BÁN HÀNG</div>
    <div class="center">${sale.invoice_code}</div>

    <hr>

    <table>
      <tr><td>Ngày bán</td><td class="right">${new Date(sale.created_at).toLocaleString('vi-VN')}</td></tr>
      ${sale.created_by_name ? `<tr><td>N/V</td><td class="right">${sale.created_by_name}</td></tr>` : ''}
      ${sale.customer_name ? `<tr><td>KH</td><td class="right">${sale.customer_name}${sale.customer_phone ? ' - ' + sale.customer_phone : ''}</td></tr>` : ''}
    </table>

    <hr>

    <table>
      <thead>
        <tr class="bold">
          <td>#</td>
          <td>Sản phẩm</td>
          <td class="right">Đơn giá</td>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <hr>

    <table>
      <tr>
        <td>Tổng SP</td>
        <td class="right">${items.length}</td>
      </tr>
      <tr>
        <td>Tạm tính</td>
        <td class="right">${fmt(sale.total_amount)}</td>
      </tr>

      ${Number(sale.discount_amount) > 0 ? `
      <tr>
        <td>Giảm giá</td>
        <td class="right">- ${fmt(sale.discount_amount)}</td>
      </tr>` : ''}

      <tr class="total">
        <td>Khách phải trả</td>
        <td class="right">${fmt(sale.final_amount)}</td>
      </tr>
    </table>

    <hr>

    <div>PTTT: ${PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</div>

    ${showQr ? `
      <div class="qr">
        <div>Quét QR để thanh toán</div>
        ${bank ? `<img src="${qrUrl}" /><div class="sub">${bank.bank_name} · ${bank.account_no}</div><div class="sub">${bank.account_name}</div>` : ''}
      </div>
    ` : ''}

    <hr>

    <div class="center sub">
      Đổi trả trong 24h với sản phẩm lỗi
    </div>

    <div class="center bold">
      CẢM ƠN VÀ HẸN GẶP LẠI!
    </div>

    <script>
      window.onload = () => {
        window.print()
        window.close()
      }
    </script>

  </body>
  </html>
  `
}

// PDF dùng cùng HTML với in hóa đơn, chỉ bỏ script autoprint
function buildReceiptHtmlNoAutoPrint(sale, bank) {
  return buildReceiptHtml(sale, bank).replace(
    /<script>[\s\S]*?window\.onload[\s\S]*?<\/script>/,
    ''
  )
}

// ── Print ──────────────────────────────────────────────────────────────────
async function printSale(sale, bank) {
  let fullSale = sale
  if (!sale.items) {
    try { const r = await posSale(sale.id); fullSale = r.data.data } catch (_) {}
  }
  const win = window.open('', '_blank', 'width=400,height=600')
  win.document.write(buildReceiptHtml(fullSale, bank))
  win.document.close()
}

// ── PDF (cùng format với in) ───────────────────────────────────────────────
async function downloadSalePdf(sale, bank) {
  let fullSale = sale
  if (!sale.items) {
    try { const r = await posSale(sale.id); fullSale = r.data.data } catch (_) {}
  }
  await saveReceiptPdf(
    buildReceiptHtmlNoAutoPrint(fullSale, bank),
    `REVA_${fullSale.invoice_code || fullSale.id}.pdf`
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SalesHistory() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)  // sale to cancel
  const [cancelReason, setCancelReason] = useState('')

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['pos-sales', search, page],
    queryFn: () => posSales({ search, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: activeBank } = useQuery({
    queryKey: ['active-bank'],
    queryFn: () => getActiveBank().then(r => r.data.data),
    retry: false,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => posCancelSale(id, reason),
    onSuccess: (_, { id }) => {
      toast.success('Đã hủy hóa đơn')
      queryClient.invalidateQueries(['pos-sales'])
      setCancelTarget(null)
      setCancelReason('')
      if (selectedSale?.id === id) setSelectedSale(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể hủy'),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id) => posMarkPaid(id),
    onSuccess: (_, id) => {
      toast.success('Đã xác nhận thanh toán')
      queryClient.invalidateQueries(['pos-sales'])
      if (selectedSale?.id === id) {
        setSelectedSale(prev => prev ? { ...prev, status: 'paid' } : null)
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể xác nhận'),
  })

  const sales = salesData?.data || []
  const total = salesData?.total || 0
  const totalPages = Math.ceil(total / 20)

  const openDetail = async (sale) => {
    if (sale.items) { setSelectedSale(sale); return }
    try {
      const r = await posSale(sale.id)
      setSelectedSale(r.data.data)
    } catch (_) {
      setSelectedSale(sale)
    }
  }

  const handlePdf = async () => {
    if (!selectedSale || pdfLoading) return
    setPdfLoading(true)
    try { await downloadSalePdf(selectedSale, activeBank) }
    finally { setPdfLoading(false) }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Lịch sử bán hàng</h1>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tìm theo mã hóa đơn, khách hàng..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hóa đơn</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Thời gian</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Khách hàng</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">TT thanh toán</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Trạng thái</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Tổng tiền</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && sales.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
            )}
            {sales.map(sale => (
              <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${sale.status === 'cancelled' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-mono font-semibold text-blue-600">{sale.invoice_code}</td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(sale.created_at)}</td>
                <td className="px-4 py-3 text-gray-700">{sale.customer_name || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[sale.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                    {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sale.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[sale.status] || sale.status || 'Chưa thu'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(sale.final_amount)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end items-center">
                    <button
                      onClick={() => openDetail(sale)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={16} />
                    </button>
                    {isAdmin && sale.status !== 'paid' && sale.status !== 'cancelled' && (
                      <button
                        onClick={() => { setCancelTarget(sale); setCancelReason('') }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Hủy hóa đơn"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Tổng {total} hóa đơn</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >← Trước</button>
            <span className="px-3 py-1">{page}/{totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >Sau →</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="font-bold text-lg">{selectedSale.invoice_code}</h2>
                <p className="text-sm text-gray-500">{fmtDate(selectedSale.created_at)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm space-y-1">
                {selectedSale.location_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chi nhánh</span>
                    <span className="font-medium">{selectedSale.location_name}</span>
                  </div>
                )}
                {selectedSale.created_by_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thu ngân</span>
                    <span className="font-medium">{selectedSale.created_by_name}</span>
                  </div>
                )}
                {selectedSale.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Khách hàng</span>
                    <span className="font-medium">{selectedSale.customer_name}</span>
                  </div>
                )}
                {selectedSale.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">SĐT</span>
                    <span className="font-medium">{selectedSale.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Thanh toán</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_COLORS[selectedSale.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                    {PAYMENT_LABELS[selectedSale.payment_method] || selectedSale.payment_method}
                  </span>
                </div>
              </div>

              {selectedSale.items && selectedSale.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Sản phẩm ({selectedSale.items.length})
                  </div>
                  <div className="divide-y">
                    {selectedSale.items.map((item, i) => (
                      <div key={i} className="px-3 py-2 flex justify-between items-start text-sm">
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          {item.product_code && <div className="text-xs text-gray-400 font-mono">{item.product_code}</div>}
                        </div>
                        <div className="font-semibold tabular-nums ml-2 shrink-0">{fmt(item.sale_price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính</span>
                  <span>{fmt(selectedSale.total_amount)}</span>
                </div>
                {Number(selectedSale.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Giảm giá</span>
                    <span>- {fmt(selectedSale.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Tổng cộng</span>
                  <span>{fmt(selectedSale.final_amount)}</span>
                </div>
              </div>

              {selectedSale.note && (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  Ghi chú: {selectedSale.note}
                </div>
              )}
            </div>

              {['transfer', 'mixed'].includes(selectedSale.payment_method) && activeBank && (
                <div className="border rounded-xl p-4 flex flex-col items-center gap-2 bg-blue-50 my-4">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                    {selectedSale.status === 'paid' ? 'Đã nhận thanh toán' : 'QR thanh toán'}
                  </p>
                  <img
                    src={`https://img.vietqr.io/image/${activeBank.bank_id}-${activeBank.account_no}-compact2.png?amount=${
                      selectedSale.payment_method === 'mixed'
                        ? Math.round(Number(selectedSale.final_amount) / 2)
                        : Number(selectedSale.final_amount)
                    }&addInfo=HD${selectedSale.invoice_code}`}
                    alt="QR thanh toán"
                    className="w-56 h-56 object-contain"
                  />
                  <p className="text-xs text-gray-500">{activeBank.bank_name} · {activeBank.account_no}</p>
                  {activeBank.account_name && <p className="text-xs text-gray-400">{activeBank.account_name}</p>}
                </div>
              )}

              {selectedSale.status === 'pending' && (
                <button
                  onClick={() => markPaidMutation.mutate(selectedSale.id)}
                  disabled={markPaidMutation.isPending}
                  className="mx-auto flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl px-6 py-3 mb-4 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {markPaidMutation.isPending ? 'Đang xử lý...' : 'Xác nhận đã thu tiền'}
                </button>
              )}


            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={handlePdf}
                disabled={pdfLoading}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Download size={15} />
                {pdfLoading ? 'Đang tạo...' : 'Lưu PDF'}
              </button>
              <button
                onClick={() => printSale(selectedSale, activeBank)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700"
              >
                <Printer size={15} />
                In lại
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-1 text-red-600">Hủy hóa đơn</h3>
            <p className="text-sm text-gray-600 mb-4">
              Hủy <span className="font-mono font-semibold">{cancelTarget.invoice_code}</span>?
              Tất cả sản phẩm trong hóa đơn sẽ được khôi phục về trạng thái <strong>đang bán</strong>.
            </p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              rows={2}
              placeholder="Lý do hủy (tùy chọn)..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50"
              >Không</button>
              <button
                onClick={() => cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason })}
                disabled={cancelMutation.isLoading}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm hover:bg-red-700 disabled:opacity-50"
              >{cancelMutation.isLoading ? 'Đang hủy...' : 'Xác nhận hủy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}