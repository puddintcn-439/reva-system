import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posLookup, posSearch, posCreateSale, posLookupCustomer, posGetCustomers, posSales, posSale, posMarkPaid, getAdminLocations, getActiveBank } from '../../services/api'
import toast from 'react-hot-toast'
import {
  ScanBarcode, Trash2, ShoppingCart, Printer, RotateCcw,
  CreditCard, Banknote, SplitSquareHorizontal, ChevronDown,
  Search, Clock, X, Type, Plus, CheckCircle2, Loader2
} from 'lucide-react'
import { fmtMoney as fmt } from '../../utils/format'
import { saveReceiptPdf } from '../../utils/receipt'
import { useAuth } from '../../context/AuthContext'
import { useCommissionTiers } from '../../hooks/useCommissionTiers'

const PAYMENT_ICONS = {
  cash:     <Banknote size={14} />,
  transfer: <CreditCard size={14} />,
  mixed:    <SplitSquareHorizontal size={14} />,
}
const PAYMENT_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', mixed: 'Kết hợp' }

function QRTransfer({ amount, info, bank }) {
  if (!bank) return (
    <div className="border rounded-lg p-3 bg-gray-50 text-center text-sm text-gray-400">
      Chưa có tài khoản ngân hàng mặc định. Thêm tại ”Cài đặt → Ngân hàng„.
    </div>
  )
  const url = `https://img.vietqr.io/image/${bank.bank_id}-${bank.account_no}-compact2.png` +
    `?amount=${amount}&addInfo=${encodeURIComponent(info || 'Thanh toan REVA')}&accountName=${encodeURIComponent(bank.account_name)}`
  return (
    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200 text-center space-y-2">
      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Mã QR thanh toán</p>
      <img src={url} alt="VietQR" className="mx-auto w-44 h-44 rounded-lg" />
      <div className="text-xs text-gray-600 space-y-0.5">
        <p className="font-semibold text-gray-800">{bank.bank_name} · {bank.account_no}</p>
        <p>{bank.account_name}</p>
        <p className="text-blue-700 font-bold text-sm">{(amount || 0).toLocaleString('vi-VN')}đ</p>
      </div>
    </div>
  )
}

// ── Receipt HTML ─────────────────────────────────────────────────────────────
function buildReceiptHtml(sale, bank) {
  const itemCount = (sale.items || []).length
  const rows = (sale.items || []).map((item, i) => `
    <div class="item">
      <div class="item-row">
        <span class="item-no">${i + 1}</span>
        <span class="item-name">${item.product_name}</span>
        <span class="item-price">${fmt(item.sale_price)}</span>
      </div>
      ${item.product_code ? `<div class="item-sub">Mã: ${item.product_code}</div>` : ''}
    </div>`).join('')

  const qrAmount = sale.payment_method === 'mixed'
    ? Math.round(Number(sale.final_amount || 0) / 2)
    : Number(sale.final_amount || 0)
  const qrInfo = encodeURIComponent(`HD ${sale.invoice_code}`)
  const qrUrl = bank
    ? `https://img.vietqr.io/image/${bank.bank_id}-${bank.account_no}-compact2.png?amount=${qrAmount}&addInfo=${qrInfo}&accountName=${encodeURIComponent(bank.account_name || '')}`
    : ''
  const showQr = sale.payment_method === 'transfer' || sale.payment_method === 'mixed'

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Hóa đơn ${sale.invoice_code}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{
        font-family:'Courier New',Courier,monospace;
        font-size:9pt;
        width:80mm;
        margin:0 auto;
        padding:4mm 4mm 8mm;
        color:#000;
        background:#fff;
      }
      /* Header */
      .hdr{text-align:center;padding-bottom:3mm}
      .hdr-name{font-size:15pt;font-weight:900;letter-spacing:2px}
      .hdr-sub{font-size:8.5pt;font-weight:600;margin-top:.5mm}
      .hdr-loc{font-size:8pt;color:#444;margin-top:.5mm}
      /* Separator */
      hr{border:none;border-top:1px dashed #555;margin:2mm 0}
      hr.solid{border-top:1px solid #000}
      /* Title */
      .title-wrap{text-align:center;margin:2mm 0}
      .title{font-size:12pt;font-weight:900;letter-spacing:.5px}
      .inv-code{font-size:9pt;font-weight:700;margin-top:1.5mm;letter-spacing:1px}
      /* Meta table */
      .meta{width:100%;border-collapse:collapse;font-size:8.5pt;margin:1mm 0}
      .meta td{padding:.35mm 0;vertical-align:top;line-height:1.45}
      .meta .lbl{white-space:nowrap;color:#333;width:17mm}
      .meta .sep{width:4mm;color:#333}
      .meta .val{font-weight:600;word-break:break-word}
      /* Items */
      .items-hdr{display:flex;font-size:8pt;font-weight:700;padding:.8mm 0;border-bottom:1px solid #000;border-top:1px solid #000;margin:1mm 0}
      .col-no{width:6mm;flex-shrink:0}
      .col-name{flex:1}
      .col-price{width:24mm;text-align:right;flex-shrink:0}
      .item{padding:1.5mm 0;border-bottom:1px dashed #bbb}
      .item:last-child{border-bottom:none}
      .item-row{display:flex;align-items:baseline}
      .item-no{width:6mm;flex-shrink:0;font-size:8pt;color:#666}
      .item-name{flex:1;font-size:9pt;font-weight:600;line-height:1.35;word-break:break-word}
      .item-price{width:24mm;text-align:right;font-size:9pt;font-weight:700;flex-shrink:0}
      .item-sub{font-size:7.5pt;color:#888;padding-left:6mm;margin-top:.2mm}
      /* Totals table */
      .totals{width:100%;border-collapse:collapse;font-size:8.5pt;margin:.5mm 0}
      .totals td{padding:.45mm 0}
      .totals .lbl{color:#333}
      .totals .val{text-align:right;font-weight:600;white-space:nowrap}
      .totals .dis td{color:#c00}
      /* Grand total */
      .grand{display:flex;justify-content:space-between;align-items:baseline;padding:1.5mm 0}
      .grand-lbl{font-size:11pt;font-weight:900}
      .grand-val{font-size:13pt;font-weight:900}
      /* Payment rows */
      .pay-tbl{width:100%;border-collapse:collapse;font-size:8.5pt;margin:.5mm 0}
      .pay-tbl td{padding:.35mm 0}
      .pay-tbl .lbl{color:#555}
      .pay-tbl .val{text-align:right;font-weight:600}
      /* QR */
      .qr-box{border:1.5px solid #000;text-align:center;padding:3mm 2mm 2.5mm;margin:2mm 0}
      .qr-lbl{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2mm}
      .qr-box img{width:115px;height:115px;display:block;margin:0 auto 2mm}
      .qr-bank{font-size:9pt;font-weight:700}
      .qr-acct{font-size:8pt;color:#333;margin-top:.5mm}
      .qr-amt{font-size:8pt;color:#555;margin-top:1mm}
      /* Policy note */
      .policy{font-size:8pt;font-style:italic;color:#333;text-align:center;line-height:1.5;margin:1mm 0}
      /* Sale note */
      .sale-note{font-size:8pt;color:#444;line-height:1.4;margin:1mm 0}
      /* Footer */
      .footer{text-align:center;margin-top:2mm}
      .footer-main{font-size:11pt;font-weight:900;letter-spacing:.5px}
      .footer-sub{font-size:8pt;color:#555;margin-top:.5mm}
      @media print{@page{size:80mm auto;margin:0}body{padding:3mm 3mm 6mm}}
    </style>
  </head><body>

    <!-- HEADER -->
    <div class="hdr">
      <div class="hdr-name">REVA</div>
      <div class="hdr-sub">Thanh Lý Ký Gửi</div>
      ${sale.location_name ? `<div class="hdr-loc">${sale.location_name}</div>` : ''}
    </div>

    <hr>

    <!-- TITLE -->
    <div class="title-wrap">
      <div class="title">HÓA ĐƠN BÁN HÀNG</div>
      <div class="inv-code">${sale.invoice_code}</div>
    </div>

    <hr>

    <!-- META -->
    <table class="meta">
      <tr>
        <td class="lbl">Ngày bán</td>
        <td class="sep">:</td>
        <td class="val">${new Date(sale.created_at).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
      </tr>
      ${sale.created_by_name ? `<tr><td class="lbl">N/V</td><td class="sep">:</td><td class="val">${sale.created_by_name}</td></tr>` : ''}
      ${sale.customer_name ? `<tr><td class="lbl">KH</td><td class="sep">:</td><td class="val">${sale.customer_name}${sale.customer_phone ? ' - ' + sale.customer_phone : ''}</td></tr>` : ''}
      ${!sale.customer_name && sale.customer_phone ? `<tr><td class="lbl">SĐT</td><td class="sep">:</td><td class="val">${sale.customer_phone}</td></tr>` : ''}
    </table>

    <hr>

    <!-- ITEMS HEADER -->
    <div class="items-hdr">
      <span class="col-no">STT</span>
      <span class="col-name">Tên sản phẩm</span>
      <span class="col-price">Đơn giá</span>
    </div>

    <!-- ITEMS -->
    ${rows}

    <hr class="solid">

    <!-- TOTALS -->
    <table class="totals">
      <tr><td class="lbl">Tổng số lượng</td><td class="val">${itemCount}</td></tr>
      <tr><td class="lbl">Tổng tiền hàng</td><td class="val">${fmt(sale.total_amount ?? sale.final_amount)}</td></tr>
      ${Number(sale.discount_amount) > 0 ? `<tr class="dis"><td class="lbl">Chiết khấu</td><td class="val">- ${fmt(sale.discount_amount)}</td></tr>` : ''}
    </table>

    <hr class="solid">

    <!-- GRAND TOTAL -->
    <div class="grand">
      <span class="grand-lbl">Khách phải trả</span>
      <span class="grand-val">${fmt(sale.final_amount)}</span>
    </div>

    <hr>

    <!-- PAYMENT -->
    <table class="pay-tbl">
      <tr><td class="lbl">Phương thức TT</td><td class="val">${PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</td></tr>
    </table>

    ${showQr ? `
    <hr>
    <div class="qr-box">
      <div class="qr-lbl">Quét QR để thanh toán</div>
      ${bank
        ? `<img src="${qrUrl}" alt="VietQR" />
           <div class="qr-bank">${bank.bank_name} · ${bank.account_no}</div>
           <div class="qr-acct">${bank.account_name}</div>
           ${sale.payment_method === 'mixed' ? `<div class="qr-amt">Số tiền chuyển khoản: ${fmt(qrAmount)}</div>` : ''}`
        : `<div style="padding:4mm;font-size:8pt;color:#999">Chưa có tài khoản mặc định</div>`
      }
    </div>` : ''}

    ${sale.note ? `<hr><div class="sale-note">Ghi chú: ${sale.note}</div>` : ''}

    <hr>

    <!-- POLICY NOTE -->
    <div class="policy">Quý khách vui lòng đổi trả trong 24h<br>với sản phẩm lỗi của nhà sản xuất.</div>

    <hr>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-main">CẢM ƠN VÀ HẸN GẶP LẠI!</div>
      <div class="footer-sub">★ REVA - Thời trang ký gửi chất lượng ★</div>
    </div>

    <script>window.onload=()=>{window.print();window.close()}<\/script>
  </body></html>`
}

function buildReceiptHtmlNoAutoPrint(sale, bank) {
  return buildReceiptHtml(sale, bank).replace(
    /<script>window\.onload.*?<\/script>/,
    ''
  )
}

// ── Cart Item Row ─────────────────────────────────────────────────────────────
function CartItem({ item, onRemove }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.name}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
          <span className="font-mono">{item.code || '—'}</span>
          {item.category_name && <span>· {item.category_name}</span>}
          {item.condition_percent != null && <span>· {item.condition_percent}%</span>}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          REVA: {fmt(item.commission_amount)} · KG nhận: {fmt(item.consignor_amount)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-semibold tabular-nums">{fmt(item.sale_price)}</span>
        <button onClick={() => onRemove(item.id)}
          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main POS Component ────────────────────────────────────────────────────────

// ── MarkPaidButton ─────────────────────────────────────────────────────────
function MarkPaidButton({ sale, onConfirmed }) {
  const [loading, setLoading] = useState(false)
  const [ref, setRef] = useState('')

  const handleConfirm = async () => {
    if (!window.confirm('Xác nhận đã nhận được tiền từ khách hàng?')) return
    setLoading(true)
    try {
      const res = await posMarkPaid(sale.id, ref || undefined)
      onConfirmed(res.data.data || sale)
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi xác nhận thanh toán')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={ref}
        onChange={e => setRef(e.target.value)}
        placeholder="Mã tham chiếu ngân hàng (tuỳ chọn)"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
      />
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
          : <><CheckCircle2 size={16} /> Xác nhận đã nhận tiền</>
        }
      </button>
    </div>
  )
}

// ── Tab factory ──────────────────────────────────────────────────────────────
const makeTab = () => ({
  id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  cart: [],
  customer: { name: '', phone: '' },
  discount: '',
  paymentMethod: 'cash',
  note: '',
  locationId: '',
})

export default function POS() {
  const { user } = useAuth()
  const { calcCommission } = useCommissionTiers()
  const scanInputRef   = useRef(null)
  const searchInputRef = useRef(null)
  const dropdownRef    = useRef(null)
  const resolvedIdRef  = useRef(null)

  // ── Scanner state (shared, applies to active tab) ─────────────────────
  const [scanCode,     setScanCode]     = useState('')
  const [searchText,   setSearchText]   = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx,    setActiveIdx]    = useState(-1)
  const [inputMode,    setInputMode]    = useState('barcode')

  // ── Tabs ──────────────────────────────────────────────────────────────
  const [tabs,        setTabs]        = useState(() => [makeTab()])
  const [activeTabId, setActiveTabId] = useState(null)

  const resolvedId = activeTabId ?? tabs[0]?.id
  const activeTab  = tabs.find(t => t.id === resolvedId) ?? tabs[0]

  useEffect(() => { resolvedIdRef.current = resolvedId }, [resolvedId])

  const patchActive = (patch) =>
    setTabs(prev => prev.map(t =>
      t.id === resolvedIdRef.current ? { ...t, ...patch } : t
    ))

  const addTab = () => {
    if (tabs.length >= 5) { toast.error('Tối đa 5 đơn hàng cùng lúc'); return }
    const nt = makeTab()
    setTabs(prev => [...prev, nt])
    setActiveTabId(nt.id)
    setScanCode('')
    setSearchText('')
    setShowDropdown(false)
  }

  const removeTab = (id) => {
    setTabs(prev => {
      if (prev.length === 1) {
        const fresh = makeTab()
        setTimeout(() => setActiveTabId(fresh.id), 0)
        return [fresh]
      }
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      if (id === resolvedIdRef.current) {
        setActiveTabId(next[Math.min(idx, next.length - 1)].id)
      }
      return next
    })
  }

  const switchTab = (id) => {
    if (id === resolvedIdRef.current) return
    setActiveTabId(id)
    setScanCode('')
    setSearchText('')
    setShowDropdown(false)
  }

  // ── Derived state from active tab ────────────────────────────────────
  const cart          = activeTab?.cart          ?? []
  const customer      = activeTab?.customer      ?? { name: '', phone: '' }
  const discount      = activeTab?.discount      ?? ''
  const paymentMethod = activeTab?.paymentMethod ?? 'cash'
  const note          = activeTab?.note          ?? ''
  const locationId    = activeTab?.locationId    ?? ''

  const totalAmount     = cart.reduce((s, p) => s + Number(p.sale_price), 0)
  const discountAmt     = Math.min(Number(discount) || 0, totalAmount)
  const finalAmount     = totalAmount - discountAmt
  const totalCommission = cart.reduce((s, p) => s + Number(p.commission_amount || 0), 0)
  const totalConsignor  = cart.reduce((s, p) => s + Number(p.consignor_amount  || 0), 0)

  // ── Other global state ───────────────────────────────────────────────
  const [lastSale,              setLastSale]              = useState(null)
  const [showHistory,           setShowHistory]           = useState(false)
  const [pendingPaySale,        setPendingPaySale]        = useState(null)
  const [paidSale,              setPaidSale]              = useState(null)
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false)
  const [showPhoneSuggest,       setShowPhoneSuggest]       = useState(false)
  const phoneDropdownRef = useRef(null)
  const qc = useQueryClient()

  // Phone suggestions query — fires when user types >= 3 chars
  const phoneSuggestTrimmed = customer.phone.trim()
  const { data: phoneSuggestData } = useQuery({
    queryKey: ['phone-suggest', phoneSuggestTrimmed],
    queryFn: () => posGetCustomers({ search: phoneSuggestTrimmed, limit: 6 }).then(r => r.data.data),
    enabled: phoneSuggestTrimmed.length >= 3,
    staleTime: 15_000,
  })

  // Close phone dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(e.target))
        setShowPhoneSuggest(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Pick a customer suggestion
  const selectPhoneSuggestion = (c) => {
    setTabs(prev => prev.map(t =>
      t.id === resolvedIdRef.current
        ? { ...t, customer: { name: c.name, phone: c.phone } }
        : t
    ))
    setShowPhoneSuggest(false)
  }

  // Auto-fill customer name from exact phone lookup (on blur)
  const handlePhoneLookup = async (phone) => {
    const trimmed = phone.trim()
    if (trimmed.length < 9) return
    setCustomerLookupLoading(true)
    try {
      const res = await posLookupCustomer(trimmed)
      const found = res.data?.data
      if (found?.customer_name) {
        setTabs(prev => prev.map(t =>
          t.id === resolvedIdRef.current
            ? { ...t, customer: { name: found.customer_name, phone: trimmed } }
            : t
        ))
      }
    } catch {
      // not found — first-time customer, silently ignore
    } finally {
      setCustomerLookupLoading(false)
    }
  }


  // Pre-fill locationId from logged-in user's assigned location
  useEffect(() => {
    if (user?.location_id) {
      setTabs(prev => prev.map((t, i) =>
        i === 0 && !t.locationId ? { ...t, locationId: user.location_id } : t
      ))
    }
  }, [user?.location_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus scan input when switching tabs
  useEffect(() => { scanInputRef.current?.focus() }, [resolvedId])
  useEffect(() => {
    if (inputMode === 'barcode') scanInputRef.current?.focus()
    else { searchInputRef.current?.focus(); setSearchText('') }
  }, [inputMode])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => getAdminLocations().then(r => r.data.data),
  })

  const { data: activeBank } = useQuery({
    queryKey: ['active-bank'],
    queryFn: () => getActiveBank().then(r => r.data.data),
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['pos-sales'],
    queryFn: () => posSales({ limit: 20 }).then(r => r.data),
    enabled: showHistory,
  })

  const searchTrimmed = searchText.trim()
  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    queryKey: ['pos-search', searchTrimmed],
    queryFn: () => posSearch(searchTrimmed).then(r => r.data.data),
    enabled: inputMode === 'name' && searchTrimmed.length >= 1,
    staleTime: 10_000,
  })

  useEffect(() => {
    if (inputMode === 'name' && searchTrimmed.length >= 1) {
      setShowDropdown(true)
      setActiveIdx(-1)
    }
  }, [searchResults, searchTrimmed, inputMode])

  const addProductToCart = useCallback((product) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === resolvedIdRef.current)
      if (!tab) return prev
      if (tab.cart.some(c => c.id === product.id)) {
        toast.error(`"${product.name}" đã có trong giỏ`)
        return prev
      }
      const { commission, consignorAmount } = calcCommission(product.sale_price)
      const item = {
        ...product,
        commission_amount: product.commission_amount ?? commission,
        consignor_amount:  product.consignor_amount  ?? consignorAmount,
      }
      return prev.map(t =>
        t.id === resolvedIdRef.current ? { ...t, cart: [...t.cart, item] } : t
      )
    })
    toast.success(`Đã thêm: ${product.name}`, { duration: 1500 })
    setSearchText('')
    setShowDropdown(false)
    setActiveIdx(-1)
    searchInputRef.current?.focus()
  }, [calcCommission])

  const handleSearchKeyDown = (e) => {
    if (!showDropdown || !searchResults.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeIdx >= 0 ? searchResults[activeIdx] : searchResults[0]
      if (target) addProductToCart(target)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const lookupMut = useMutation({
    mutationFn: posLookup,
    onSuccess: (res) => {
      addProductToCart(res.data.data)
      setScanCode('')
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Không tìm thấy sản phẩm')
      setScanCode('')
    },
  })

  const handleScan = useCallback((e) => {
    e.preventDefault()
    const code = scanCode.trim()
    if (!code) return
    lookupMut.mutate(code)
  }, [scanCode, lookupMut])

  const removeFromCart = useCallback((id) => {
    setTabs(prev => prev.map(t =>
      t.id === resolvedIdRef.current
        ? { ...t, cart: t.cart.filter(p => p.id !== id) }
        : t
    ))
  }, [])

  const clearCart = () => {
    const tab = tabs.find(t => t.id === resolvedId)
    if (!tab?.cart.length) return
    if (!window.confirm('Xóa toàn bộ giỏ hàng của đơn này?')) return
    patchActive({ cart: [], discount: '' })
    scanInputRef.current?.focus()
  }

  const checkoutMut = useMutation({
    mutationFn: posCreateSale,
    onSuccess: async (res) => {
      const sale = res.data.data
      const tabId = resolvedIdRef.current
      try {
        const r = await posSale(sale.id)
        const fullSale = r.data.data
        setLastSale(fullSale)
        qc.invalidateQueries(['pos-sales'])
        qc.invalidateQueries(['admin-products'])
        const win = window.open('', '_blank', 'width=400,height=600')
        win.document.write(buildReceiptHtml(fullSale, activeBank))
        win.document.close()
        if (localStorage.getItem('pos_auto_save_pdf') === '1')
          saveReceiptPdf(buildReceiptHtmlNoAutoPrint(fullSale, activeBank), `REVA_${fullSale.invoice_code}.pdf`)
        setPendingPaySale(fullSale)
      } catch {
        setLastSale(sale)
        qc.invalidateQueries(['pos-sales'])
        qc.invalidateQueries(['admin-products'])
        const win2 = window.open('', '_blank', 'width=400,height=600')
        win2.document.write(buildReceiptHtml(sale, activeBank))
        win2.document.close()
        if (localStorage.getItem('pos_auto_save_pdf') === '1')
          saveReceiptPdf(buildReceiptHtmlNoAutoPrint(sale, activeBank), `REVA_${sale.invoice_code || sale.id}.pdf`)
        setPendingPaySale(sale)
      } finally {
        removeTab(tabId)
        scanInputRef.current?.focus()
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Lỗi tạo hóa đơn'),
  })

  const handleCheckout = () => {
    if (cart.length === 0)      { toast.error('Giỏ hàng trống'); return }
    if (!locationId)            { toast.error('Vui lòng chọn cơ sở'); return }
    if (!customer.name.trim())  { toast.error('Vui lòng nhập tên khách hàng'); return }
    if (!customer.phone.trim()) { toast.error('Vui lòng nhập số điện thoại khách hàng'); return }
    checkoutMut.mutate({
      items: cart.map(p => ({
        product_id:        p.id,
        product_name:      p.name,
        product_code:      p.code,
        sale_price:        p.sale_price,
        commission_amount: p.commission_amount,
        consignor_amount:  p.consignor_amount,
        consignor_id:      p.consignor_id,
      })),
      customer_name:   customer.name,
      customer_phone:  customer.phone,
      discount_amount: discountAmt,
      payment_method:  paymentMethod,
      note:            note || null,
      location_id:     locationId,
    })
  }

  const printLastSale = async () => {
    if (!lastSale) return
    try {
      const r = await posSale(lastSale.id)
      const full = r.data.data
      const win = window.open('', '_blank', 'width=400,height=600')
      win.document.write(buildReceiptHtml(full, activeBank))
      win.document.close()
    } catch {
      const win = window.open('', '_blank', 'width=400,height=600')
      win.document.write(buildReceiptHtml(lastSale, activeBank))
      win.document.close()
    }
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-6rem)] -m-6 p-6">

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0 border-b border-gray-200 pb-0">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 cursor-pointer transition-colors select-none ${
              tab.id === resolvedId
                ? 'bg-white border-gray-300 text-hun-black font-semibold shadow-sm'
                : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
            }`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="text-sm">Đơn {tabs.indexOf(tab) + 1}</span>
            {tab.cart.length > 0 && (
              <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center ${
                tab.id === resolvedId ? 'bg-hun-black text-white' : 'bg-gray-400 text-white'
              }`}>{tab.cart.length}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id) }}
              className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Đóng đơn"
            ><X size={12} /></button>
          </div>
        ))}
        <button
          onClick={addTab}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-hun-black hover:bg-gray-100 rounded-t-lg transition-colors"
          title="Thêm đơn mới"
        >
          <Plus size={14} /> Thêm đơn
        </button>
      </div>

      {/* ── Main 2-column layout ─────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Left: Scanner + Cart ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 gap-4">

          {/* Scanner / Search input */}
          <div className="bg-white border rounded-lg p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setInputMode('barcode')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  inputMode === 'barcode' ? 'bg-hun-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <ScanBarcode size={13} /> Quét mã vạch
              </button>
              <button
                onClick={() => setInputMode('name')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  inputMode === 'name' ? 'bg-hun-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Type size={13} /> Tìm theo tên
              </button>
              {(lookupMut.isPending || searchFetching) && (
                <span className="text-xs text-gray-400 animate-pulse ml-1">Đang tìm...</span>
              )}
            </div>

            {inputMode === 'barcode' && (
              <form onSubmit={handleScan} className="flex gap-2">
                <input
                  ref={scanInputRef}
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value)}
                  placeholder="Hướng máy quét vào mã vạch hoặc nhập mã thủ công..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hun-black"
                  autoComplete="off"
                />
                <button type="submit"
                  disabled={!scanCode.trim() || lookupMut.isPending}
                  className="px-4 py-2 bg-hun-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5">
                  <Search size={14} /> Tìm
                </button>
              </form>
            )}

            {inputMode === 'name' && (
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-hun-black">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
                    onFocus={() => searchText.trim() && setShowDropdown(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Gõ tên hoặc mã sản phẩm..."
                    className="flex-1 text-sm focus:outline-none"
                    autoComplete="off"
                  />
                  {searchText && (
                    <button onClick={() => { setSearchText(''); setShowDropdown(false); searchInputRef.current?.focus() }}
                      className="text-gray-300 hover:text-gray-500">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showDropdown && searchTrimmed.length >= 1 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {searchFetching && !searchResults.length ? (
                      <div className="px-4 py-3 text-sm text-gray-400 animate-pulse">Đang tìm kiếm...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Không tìm thấy sản phẩm nào</div>
                    ) : (
                      <ul>
                        {searchResults.map((p, idx) => {
                          const inCart = cart.some(c => c.id === p.id)
                          return (
                            <li key={p.id}>
                              <button
                                onMouseDown={(e) => { e.preventDefault(); addProductToCart(p) }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                  inCart ? 'opacity-40 cursor-not-allowed' :
                                  idx === activeIdx ? 'bg-gray-100' : 'hover:bg-gray-50'
                                }`}
                                disabled={inCart}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{p.name}</div>
                                  <div className="text-xs text-gray-400 flex gap-2 mt-0.5">
                                    {p.code && <span className="font-mono">{p.code}</span>}
                                    {p.category_name && <span>· {p.category_name}</span>}
                                    {p.condition_percent != null && <span>· {p.condition_percent}%</span>}
                                    {p.location_name && <span>· {p.location_name}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-sm font-semibold tabular-nums">{fmt(p.sale_price)}</span>
                                  {inCart ? (
                                    <span className="text-xs text-gray-400">Trong giỏ</span>
                                  ) : (
                                    <Plus size={14} className="text-gray-400" />
                                  )}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white border rounded-lg flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-gray-400" />
                <span className="font-medium text-sm">Giỏ hàng — Đơn {tabs.indexOf(activeTab) + 1}</span>
                {cart.length > 0 && (
                  <span className="bg-hun-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lastSale && (
                  <button onClick={printLastSale}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-hun-black border rounded px-2 py-1">
                    <Printer size={12} /> In lại HD {lastSale.invoice_code}
                  </button>
                )}
                <button onClick={clearCart}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500">
                  <RotateCcw size={12} /> Xóa giỏ
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                  <ScanBarcode size={40} />
                  <p className="text-sm">Quét mã vạch để thêm sản phẩm</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem key={item.id} item={item} onRemove={removeFromCart} />
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-4 py-2 shrink-0 bg-gray-50 text-xs text-gray-500 flex justify-between">
                <span>HUN giữ: {fmt(totalCommission)}</span>
                <span className="text-green-600">KG nhận: {fmt(totalConsignor)}</span>
              </div>
            )}
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(p => !p)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 self-start">
            <Clock size={12} /> Lịch sử hóa đơn gần đây <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="bg-white border rounded-lg overflow-hidden shrink-0 max-h-48">
              {historyLoading ? (
                <div className="text-center py-4 text-sm text-gray-400">Đang tải...</div>
              ) : (
                <div className="overflow-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['Mã HD','Thời gian','Khách','SP','Tổng tiền','PT'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historyData?.data?.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono font-medium">{s.invoice_code}</td>
                          <td className="px-3 py-1.5 text-gray-400">{new Date(s.created_at).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</td>
                          <td className="px-3 py-1.5">{s.customer_name || '—'}</td>
                          <td className="px-3 py-1.5 text-center">{s.item_count}</td>
                          <td className="px-3 py-1.5 font-medium tabular-nums">{fmt(s.final_amount)}</td>
                          <td className="px-3 py-1.5 text-gray-400">{PAYMENT_LABELS[s.payment_method]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Checkout panel ─────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Location — required */}
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Cơ sở <span className="text-red-500">*</span>
            </p>
            <select
              value={locationId}
              onChange={e => patchActive({ locationId: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black ${
                !locationId ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">-- Chọn cơ sở --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Customer info — required */}
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Thông tin khách hàng</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Tên khách <span className="text-red-500">*</span>
              </label>
              <input
                value={customer.name}
                onChange={e => patchActive({ customer: { ...customer, name: e.target.value } })}
                placeholder="Nhập tên khách hàng"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black ${
                  !customer.name.trim() ? 'border-red-300' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={phoneDropdownRef}>
                <input
                  value={customer.phone}
                  onChange={e => {
                    patchActive({ customer: { ...customer, phone: e.target.value } })
                    setShowPhoneSuggest(true)
                  }}
                  onFocus={() => customer.phone.trim().length >= 3 && setShowPhoneSuggest(true)}
                  onBlur={e => handlePhoneLookup(e.target.value)}
                  placeholder="Nhập SĐT để tra cứu tên KH"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black ${
                    !customer.phone.trim() ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {customerLookupLoading && (
                  <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}

                {/* Phone suggestion dropdown */}
                {showPhoneSuggest && phoneSuggestTrimmed.length >= 3 && phoneSuggestData?.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {phoneSuggestData.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); selectPhoneSuggestion(c) }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-400 font-mono text-xs">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Payment options */}
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Thanh toán</p>
            <div className="flex gap-2">
              {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => patchActive({ paymentMethod: key })}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                    paymentMethod === key
                      ? 'bg-hun-black text-white border-hun-black'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {PAYMENT_ICONS[key]}
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>

            {(paymentMethod === 'transfer' || paymentMethod === 'mixed') && finalAmount > 0 && (
              <QRTransfer
                amount={paymentMethod === 'mixed' ? Math.round(finalAmount / 2) : finalAmount}
                info={`Thanh toan REVA${customer.name ? ' - ' + customer.name : ''}`}
                bank={activeBank}
              />
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Giảm giá (đ)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={e => patchActive({ discount: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black"
              />
            </div>

            <textarea
              value={note}
              onChange={e => patchActive({ note: e.target.value })}
              rows={2}
              placeholder="Ghi chú hóa đơn..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-hun-black resize-none"
            />
          </div>

          {/* Total summary */}
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tạm tính ({cart.length} SP)</span>
              <span className="tabular-nums">{fmt(totalAmount)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Giảm giá</span>
                <span className="tabular-nums">- {fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Tổng cộng</span>
              <span className="tabular-nums">{fmt(finalAmount)}</span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !locationId || !customer.name.trim() || !customer.phone.trim() || checkoutMut.isPending}
            className="w-full py-4 bg-hun-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            <Printer size={18} />
            {checkoutMut.isPending ? 'Đang xử lý...' : 'Thanh toán & In hóa đơn'}
          </button>
          <p className="text-center text-xs text-gray-400">
            Hóa đơn sẽ tự động in sau khi thanh toán
          </p>
        </div>
      </div>

      {/* ── Modal chờ xác nhận thanh toán ───────────────────────────── */}
      {pendingPaySale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 size={22} className="text-yellow-500 animate-spin" />
              <div>
                <p className="font-semibold text-gray-800">Chờ xác nhận thanh toán</p>
                <p className="text-xs text-gray-400">HĐ: {pendingPaySale.invoice_code}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Số tiền cần nhận</p>
              <p className="text-3xl font-bold text-hun-black">{fmt(pendingPaySale.final_amount)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {pendingPaySale.payment_method === 'cash' ? 'Tiền mặt' : pendingPaySale.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt + Chuyển khoản'}
              </p>
            </div>
            {activeBank && pendingPaySale.payment_method !== 'cash' && (
              <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
                <img
                  src={`https://img.vietqr.io/image/${activeBank.bank_id}-${activeBank.account_no}-compact2.png?amount=${pendingPaySale.final_amount}&addInfo=HD${pendingPaySale.invoice_code}`}
                  alt="QR"
                  className="w-36 h-36 object-contain"
                />
                <p className="text-xs text-gray-500">{activeBank.bank_name} · {activeBank.account_no}</p>
              </div>
            )}
            <MarkPaidButton
              sale={pendingPaySale}
              onConfirmed={(paidData) => {
                setPendingPaySale(null)
                setPaidSale(paidData)
                setLastSale(paidData)
                qc.invalidateQueries(['pos-sales'])
              }}
            />
            <button
              onClick={() => { setLastSale(pendingPaySale); setPendingPaySale(null) }}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              Đóng (xử lý sau)
            </button>
          </div>
        </div>
      )}

      {/* ── Modal thanh toán thành công ──────────────────────────────── */}
      {paidSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4 text-center">
            <CheckCircle2 size={52} className="text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-bold text-gray-800">Thanh toán thành công!</p>
              <p className="text-sm text-gray-500 mt-1">HĐ: {paidSale.invoice_code}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-600">{fmt(paidSale.final_amount)}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const winP = window.open('', '_blank', 'width=400,height=600')
                  winP.document.write(buildReceiptHtml(paidSale, activeBank))
                  winP.document.close()
                }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-400 flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> In lại
              </button>
              <button
                onClick={() => { setLastSale(paidSale); setPaidSale(null); scanInputRef.current?.focus() }}
                className="flex-1 py-2.5 bg-hun-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
