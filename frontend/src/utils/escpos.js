/**
 * ESC/POS utility cho máy in nhiệt 58mm
 * Sử dụng với Web Serial API (Chrome/Edge)
 */

// Bảng chuyển đổi ký tự tiếng Việt → ASCII (máy in nhiệt không hỗ trợ Unicode)
const VN_MAP = {
  à:'a',á:'a',ả:'a',ã:'a',ạ:'a',
  ă:'a',ằ:'a',ắ:'a',ẳ:'a',ẵ:'a',ặ:'a',
  â:'a',ầ:'a',ấ:'a',ẩ:'a',ẫ:'a',ậ:'a',
  è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',
  ê:'e',ề:'e',ế:'e',ể:'e',ễ:'e',ệ:'e',
  ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
  ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',
  ô:'o',ồ:'o',ố:'o',ổ:'o',ỗ:'o',ộ:'o',
  ơ:'o',ờ:'o',ớ:'o',ở:'o',ỡ:'o',ợ:'o',
  ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',
  ư:'u',ừ:'u',ứ:'u',ử:'u',ữ:'u',ự:'u',
  ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',
  đ:'d',
  À:'A',Á:'A',Ả:'A',Ã:'A',Ạ:'A',
  Ă:'A',Ằ:'A',Ắ:'A',Ẳ:'A',Ẵ:'A',Ặ:'A',
  Â:'A',Ầ:'A',Ấ:'A',Ẩ:'A',Ẫ:'A',Ậ:'A',
  È:'E',É:'E',Ẻ:'E',Ẽ:'E',Ẹ:'E',
  Ê:'E',Ề:'E',Ế:'E',Ể:'E',Ễ:'E',Ệ:'E',
  Ì:'I',Í:'I',Ỉ:'I',Ĩ:'I',Ị:'I',
  Ò:'O',Ó:'O',Ỏ:'O',Õ:'O',Ọ:'O',
  Ô:'O',Ồ:'O',Ố:'O',Ổ:'O',Ỗ:'O',Ộ:'O',
  Ơ:'O',Ờ:'O',Ớ:'O',Ở:'O',Ỡ:'O',Ợ:'O',
  Ù:'U',Ú:'U',Ủ:'U',Ũ:'U',Ụ:'U',
  Ư:'U',Ừ:'U',Ứ:'U',Ử:'U',Ữ:'U',Ự:'U',
  Ỳ:'Y',Ý:'Y',Ỷ:'Y',Ỹ:'Y',Ỵ:'Y',
  Đ:'D',
}

/** Bỏ dấu tiếng Việt để in trên máy in nhiệt */
export function removeAccents(str = '') {
  return str.replace(/[^\x00-\x7F]/g, c => VN_MAP[c] ?? '?')
}

/** Tạo ESC/POS bytes cho 1 nhãn sản phẩm (58mm) */
export function buildLabel(product) {
  const bytes = []
  const push = (...b) => b.forEach(x => bytes.push(x))

  // Encode text to bytes (ASCII only sau khi bỏ dấu)
  const text = (str) =>
    Array.from(removeAccents(str)).forEach(c => bytes.push(c.charCodeAt(0) & 0xFF))

  const LF = 0x0A
  const ESC = 0x1B
  const GS  = 0x1D

  // ── Initialize ───────────────────────────────────────────────────────────
  push(ESC, 0x40)               // ESC @ — khởi tạo máy in

  // ── Shop name: căn giữa, chữ nhỏ ─────────────────────────────────────────
  push(ESC, 0x61, 0x01)         // căn giữa
  push(ESC, 0x21, 0x00)         // cỡ chữ bình thường
  text('REVA Thanh Ly Ky Gui')
  push(LF)

  // ── Đường kẻ ─────────────────────────────────────────────────────────────
  text('--------------------------------')
  push(LF)

  // ── Tên sản phẩm: căn giữa, đậm ─────────────────────────────────────────
  push(ESC, 0x61, 0x01)         // căn giữa
  push(ESC, 0x45, 0x01)         // bold on
  push(ESC, 0x21, 0x01)         // double height
  const name = (product.name || '').substring(0, 30)
  text(name)
  push(LF)
  push(ESC, 0x45, 0x00)         // bold off
  push(ESC, 0x21, 0x00)         // cỡ chữ bình thường

  // ── Danh mục + độ mới ────────────────────────────────────────────────────
  const meta = [
    product.category_name,
    product.condition_percent != null ? `Do moi: ${product.condition_percent}%` : null,
  ].filter(Boolean).join(' | ')
  if (meta) {
    push(ESC, 0x61, 0x01)
    text(meta)
    push(LF)
  }

  // ── Giá: căn giữa, chữ to ────────────────────────────────────────────────
  push(ESC, 0x61, 0x01)         // căn giữa
  push(GS,  0x21, 0x31)         // double width + height (lớn)
  push(ESC, 0x45, 0x01)         // bold
  const price = Number(product.sale_price || 0).toLocaleString('vi-VN') + 'd'
  text(price)
  push(LF)
  push(ESC, 0x45, 0x00)
  push(GS,  0x21, 0x00)         // cỡ bình thường

  // ── QR Code (native ESC/POS) ──────────────────────────────────────────────
  const qrData = product.code || String(product.id)
  const qrBytes = Array.from(new TextEncoder().encode(qrData))
  const storeLen = qrBytes.length + 3  // cn(1) + fn(1) + m(1) + data
  const pL = storeLen & 0xFF
  const pH = (storeLen >> 8) & 0xFF

  push(ESC, 0x61, 0x01)         // căn giữa
  push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 8)          // QR size = 8 (dot modules)
  push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31)        // error correction: M
  push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...qrBytes) // store QR data
  push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)         // print QR
  push(LF)

  // ── Mã sản phẩm (text) ───────────────────────────────────────────────────
  push(ESC, 0x61, 0x01)
  push(ESC, 0x21, 0x00)
  if (product.code) {
    text(product.code)
    push(LF)
  }

  // ── Vị trí ───────────────────────────────────────────────────────────────
  if (product.location_name) {
    text('Vi tri: ' + product.location_name)
    push(LF)
  }

  // ── Feed + cắt giấy (partial cut) ────────────────────────────────────────
  push(LF, LF)
  push(GS, 0x56, 0x42, 0x00)  // GS V B 0 — partial cut

  return new Uint8Array(bytes)
}

/** Kết nối máy in qua Web Serial API */
export async function connectSerialPrinter(baudRate = 9600) {
  if (!navigator.serial) {
    throw new Error('Trình duyệt không hỗ trợ Web Serial API.\nVui lòng dùng Chrome hoặc Edge.')
  }
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate })
  return port
}

/** In danh sách sản phẩm ra cổng serial */
export async function printProducts(port, products, onProgress) {
  if (!port || !port.writable) throw new Error('Máy in chưa kết nối hoặc đã bị ngắt.')
  const writer = port.writable.getWriter()
  try {
    for (let i = 0; i < products.length; i++) {
      const bytes = buildLabel(products[i])
      await writer.write(bytes)
      onProgress?.(i + 1, products.length)
    }
  } finally {
    writer.releaseLock()
  }
}
