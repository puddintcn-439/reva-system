/**
 * Tải xuống hoá đơn dạng PDF client-side.
 * Dùng html2pdf.js (cần cài đặt: npm install html2pdf.js).
 *
 * @param {string} htmlString  - Chuỗi HTML đầy đủ của hoá đơn
 * @param {string} filename    - Tên file PDF, vd: "REVA_HD0001.pdf"
 */
export async function saveReceiptPdf(htmlString, filename) {
  let iframe = null
  try {
    const mod = await import('html2pdf.js')
    const html2pdf = mod.default ?? mod

    // Tạo iframe ẩn để render receipt HTML mà không bị ảnh hưởng bởi CSS trang chính
    iframe = document.createElement('iframe')
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0',
      width: '120mm',
      height: '280mm',
      border: 'none',
      visibility: 'hidden',
    })
    // Write directly into the iframe document (avoids srcdoc onload unreliability)
    document.body.appendChild(iframe)
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    iframeDoc.open()
    iframeDoc.write(htmlString)
    iframeDoc.close()

    // Wait for images / fonts inside iframe to load
    await new Promise(resolve => setTimeout(resolve, 800))

    const body = iframeDoc.body
    if (!body) throw new Error('iframe body not found')

    await html2pdf()
      .set({
        margin: 0,
        filename,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: [80, 280], orientation: 'portrait' },
      })
      .from(body)
      .save()
  } catch (err) {
    console.error('[saveReceiptPdf]', err)
  } finally {
    // Cleanup iframe (only remove if it was created)
    try {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe)
    } catch (e) {
      // ignore cleanup errors
    }
  }
}
