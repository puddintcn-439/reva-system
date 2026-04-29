import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import { useRef, useState, useCallback } from 'react'
import { X, Printer, Usb, Loader2 } from 'lucide-react'
import { connectSerialPrinter, printProducts } from '../utils/escpos'
import { fmtMoney as fmt } from '../utils/format'

// ─── Label component ────────────────────────────────────────────────────────
// mode: 'a4' → nằm ngang 60×40mm  |  'mini' → thẳng đứng 54mm rộng
function Label({ product, codeType, mode }) {
  const codeValue = product.code || product.id

  if (mode === 'mini') {
    return (
      <div className="label-card label-mini">
        <div className="mini-shop">REVA Thanh Lý Ký Gửi</div>
        <div className="mini-name">{product.name}</div>
        {product.category_name && <div className="mini-meta">{product.category_name} {product.condition_percent != null ? `· ${product.condition_percent}%` : ''}</div>}
        <div className="mini-price">{fmt(product.sale_price)}</div>
        <div className="mini-code-wrap">
          {codeType === 'qr'
            ? <QRCodeSVG value={codeValue} size={80} level="M" />
            : <Barcode value={codeValue} format="CODE128" width={1.2} height={40} displayValue={true} fontSize={9} margin={0} />
          }
        </div>
        {product.location_name && <div className="mini-meta">{product.location_name}</div>}
      </div>
    )
  }

  // A4 horizontal layout
  return (
    <div className="label-card">
      <div className="label-left">
        {codeType === 'qr' ? (
          <QRCodeSVG value={codeValue} size={72} level="M" />
        ) : (
          <Barcode value={codeValue} format="CODE128" width={1.2} height={36} displayValue={false} margin={0} />
        )}
        <div className="label-code">{product.code || '—'}</div>
      </div>
      <div className="label-right">
        <div className="label-shop">REVA Thanh Lý Ký Gửi</div>
        <div className="label-name">{product.name}</div>
        {product.category_name && <div className="label-meta">{product.category_name}</div>}
        {product.condition_percent != null && <div className="label-meta">Độ mới: {product.condition_percent}%</div>}
        <div className="label-price">{fmt(product.sale_price)}</div>
        {product.location_name && <div className="label-meta">{product.location_name}</div>}
      </div>
    </div>
  )
}

// ─── Print CSS by mode ───────────────────────────────────────────────────────
function getPrintHtml(content, mode) {
  const a4Css = `
    .labels-wrap {
      display: grid;
      grid-template-columns: repeat(3, 60mm);
      gap: 0;
      padding: 8mm;
    }
    .label-card {
      width: 60mm; height: 40mm;
      display: flex; gap: 3mm; padding: 3mm;
      page-break-inside: avoid; overflow: hidden;
      border: 0.3mm dashed #aaa;
    }
    .label-left { display:flex; flex-direction:column; align-items:center; gap:1mm; flex-shrink:0; }
    .label-left svg { width:18mm !important; height:18mm !important; }
    .label-code { font-size:5pt; font-family:monospace; color:#555; text-align:center; word-break:break-all; }
    .label-right { flex:1; display:flex; flex-direction:column; gap:.5mm; overflow:hidden; min-width:0; }
    .label-shop { font-size:5pt; color:#888; text-transform:uppercase; letter-spacing:.3pt; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .label-name { font-size:7pt; font-weight:bold; line-height:1.2; max-height:8mm; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .label-meta { font-size:6pt; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .label-price { font-size:10pt; font-weight:bold; margin-top:auto; }
    @media print { @page { margin:8mm; size:A4; } }
  `

  const miniCss = `
    .labels-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 0;
      width: 54mm;
      margin: 0 auto;
    }
    .label-card {
      width: 54mm;
      display: flex; flex-direction: column; align-items: center;
      padding: 2mm 2mm;
      page-break-inside: avoid; overflow: hidden;
      border-bottom: 0.4mm dashed #888;
    }
    .mini-shop { font-size:5.5pt; color:#888; text-transform:uppercase; letter-spacing:.3pt; margin-bottom:.5mm; text-align:center; }
    .mini-name { font-size:8pt; font-weight:bold; text-align:center; line-height:1.3; max-height:10mm; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:1mm; }
    .mini-meta { font-size:6pt; color:#555; text-align:center; margin-bottom:.5mm; }
    .mini-price { font-size:14pt; font-weight:bold; text-align:center; margin-bottom:1.5mm; }
    .mini-code-wrap { display:flex; justify-content:center; margin-bottom:1mm; }
    .mini-code-wrap svg { max-width:50mm !important; }
    @media print { @page { margin:0; size:58mm auto; } body { width:58mm; } }
  `

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>In tem nhãn - REVA</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; background:#fff; -webkit-print-color-adjust:exact; }
    ${mode === 'mini' ? miniCss : a4Css}
  </style>
</head>
<body>
  <div class="labels-wrap">${content}</div>
  <script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export default function ProductLabelModal({ products, onClose }) {
  const printRef = useRef()
  const [codeType, setCodeType] = useState('qr')     // 'qr' | 'barcode'
  const [mode, setMode]         = useState('mini')   // 'a4' | 'mini'

  // Web Serial API state
  const [printer, setPrinter]       = useState(null)   // SerialPort object
  const [printProgress, setProgress] = useState(null)  // null | { done, total }
  const [serialError, setSerialError] = useState('')

  const connectPrinter = useCallback(async () => {
    setSerialError('')
    try {
      const port = await connectSerialPrinter(9600)
      setPrinter(port)
    } catch (e) {
      if (e.name !== 'AbortError' && e.name !== 'NotFoundError') setSerialError(e.message)
    }
  }, [])

  const disconnectPrinter = useCallback(async () => {
    try { await printer?.close() } catch {}
    setPrinter(null)
    setProgress(null)
  }, [printer])

  const handleDirectPrint = useCallback(async () => {
    let port = printer
    if (!port) {
      setSerialError('')
      try {
        port = await connectSerialPrinter(9600)
        setPrinter(port)
      } catch (e) {
        if (e.name !== 'AbortError' && e.name !== 'NotFoundError') setSerialError(e.message)
        return
      }
    }
    setProgress({ done: 0, total: products.length })
    setSerialError('')
    try {
      await printProducts(port, products, (done, total) => setProgress({ done, total }))
    } catch (e) {
      setSerialError(e.message)
      // Port có thể bị lỗi, reset
      setPrinter(null)
    }
    setProgress(null)
  }, [printer, products])

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=700,height=600')
    win.document.write(getPrintHtml(printRef.current.innerHTML, mode))
    win.document.close()
  }

  const descMap = {
    a4:   '3 cột · 60×40mm · khổ A4',
    mini: '1 cột · 54mm · máy in mini cuộn',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-semibold">In tem nhãn sản phẩm</h2>
            <p className="text-xs text-gray-400 mt-0.5">{products.length} tem · {descMap[mode]}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">

            {/* Printer mode */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 text-sm">
              <button onClick={() => setMode('mini')}
                className={`px-3 py-1 rounded-md transition-colors ${mode === 'mini' ? 'bg-white shadow text-hun-black font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                Mini
              </button>
              <button onClick={() => setMode('a4')}
                className={`px-3 py-1 rounded-md transition-colors ${mode === 'a4' ? 'bg-white shadow text-hun-black font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                A4
              </button>
            </div>

            {/* QR / Barcode */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 text-sm">
              <button onClick={() => setCodeType('qr')}
                className={`px-3 py-1 rounded-md transition-colors ${codeType === 'qr' ? 'bg-white shadow text-hun-black font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                QR
              </button>
              <button onClick={() => setCodeType('barcode')}
                className={`px-3 py-1 rounded-md transition-colors ${codeType === 'barcode' ? 'bg-white shadow text-hun-black font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                Mã vạch
              </button>
            </div>

            {/* Direct print via Web Serial */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleDirectPrint}
                disabled={printProgress !== null}
                title={printer ? 'In trực tiếp qua USB/Serial' : 'Kết nối máy in & in trực tiếp'}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  printer
                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {printProgress !== null
                  ? <><Loader2 size={14} className="animate-spin" /> {printProgress.done}/{printProgress.total}</>  
                  : <><Usb size={14} /> {printer ? 'In trực tiếp' : 'Kết nối máy in'}</>
                }
              </button>
              {printer && (
                <button
                  onClick={disconnectPrinter}
                  title="Ngắt kết nối máy in"
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-hun-black text-white text-sm rounded-lg hover:bg-gray-800">
              <Printer size={15} /> In (cửa sổ)
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Serial error banner */}
        {serialError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>⚠ {serialError}</span>
            <button onClick={() => setSerialError('')} className="ml-2 text-red-400 hover:text-red-600"><X size={14}/></button>
          </div>
        )}

        {/* Printer status bar */}
        {printer && !serialError && (
          <div className="px-6 py-1.5 bg-green-50 border-b border-green-200 text-green-700 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
            Đã kết nối máy in qua Web Serial{printProgress ? ` — Đang in ${printProgress.done}/${printProgress.total}...` : ''}
          </div>
        )}

        {/* Preview */}
        <div className="overflow-auto p-6 flex-1 bg-gray-50">
          <div ref={printRef} className={mode === 'mini' ? 'flex flex-col items-center gap-0 w-fit mx-auto' : 'flex flex-wrap gap-0'}>
            {products.map((p) => (
              <Label key={p.id} product={p} codeType={codeType} mode={mode} />
            ))}
          </div>
        </div>
      </div>

      {/* Screen preview styles */}
      <style>{`
        /* ── A4 label ── */
        .label-card {
          background: #fff;
        }
        .label-card:not(.label-mini) {
          width: 220px; height: 147px;
          display: flex; gap: 10px; padding: 10px;
          border: 1px dashed #aaa;
        }
        .label-left { display:flex; flex-direction:column; align-items:center; gap:4px; flex-shrink:0; }
        .label-code { font-size:9px; font-family:monospace; color:#888; text-align:center; }
        .label-right { flex:1; display:flex; flex-direction:column; gap:2px; overflow:hidden; min-width:0; }
        .label-shop { font-size:9px; color:#aaa; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .label-name { font-size:12px; font-weight:700; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .label-meta { font-size:10px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .label-price { font-size:16px; font-weight:700; margin-top:auto; }

        /* ── Mini label ── */
        .label-mini {
          width: 200px;
          display: flex; flex-direction:column; align-items:center;
          padding: 10px 8px;
          border-bottom: 1.5px dashed #aaa;
        }
        .mini-shop { font-size:9px; color:#aaa; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; text-align:center; }
        .mini-name { font-size:13px; font-weight:700; text-align:center; line-height:1.3; margin-bottom:4px; }
        .mini-meta { font-size:10px; color:#666; text-align:center; margin-bottom:2px; }
        .mini-price { font-size:20px; font-weight:700; text-align:center; margin-bottom:8px; }
        .mini-code-wrap { display:flex; justify-content:center; margin-bottom:4px; }
      `}</style>
    </div>
  )
}
