const ExcelJS = require('exceljs');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');

// ── Style helpers ──────────────────────────────────────────────────────────────

const BRAND_BROWN = 'FF8B6F47';
const BRAND_CREAM = 'FFF5F0E8';
const WHITE       = 'FFFFFFFF';
const LIGHT_GRAY  = 'FFF5F5F5';
const HEADER_FONT = { name: 'Calibri', bold: true, size: 11, color: { argb: WHITE } };
const BODY_FONT   = { name: 'Calibri', size: 10 };

function styleHeader(row, bgArgb = BRAND_BROWN) {
  row.eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.font   = bgArgb === BRAND_BROWN ? HEADER_FONT : { ...HEADER_FONT, color: { argb: 'FF4A4A4A' }, bold: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });
  row.height = 22;
}

function styleBody(row, altBg = false) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = altBg
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } }
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
    cell.font = BODY_FONT;
    cell.border = {
      top:    { style: 'hair', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } },
      left:   { style: 'hair', color: { argb: 'FFE0E0E0' } },
      right:  { style: 'hair', color: { argb: 'FFE0E0E0' } },
    };
    cell.alignment = { vertical: 'middle' };
  });
  row.height = 18;
}

function addTitleBlock(sheet, title, subtitle) {
  sheet.mergeCells(1, 1, 1, sheet.columnCount || 8);
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font  = { name: 'Calibri', bold: true, size: 14, color: { argb: BRAND_BROWN } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 28;

  sheet.mergeCells(2, 1, 2, sheet.columnCount || 8);
  const subRow = sheet.getRow(2);
  subRow.getCell(1).value = subtitle;
  subRow.getCell(1).font  = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
  subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  subRow.height = 18;
  sheet.addRow([]); // blank spacer
}

const VND_FORMAT = '#,##0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const now = () => new Date().toLocaleDateString('vi-VN');

// ── Financial Export ───────────────────────────────────────────────────────────

/**
 * GET /api/reports/export/financial?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * Exports: Sheet1 Tổng quan, Sheet2 Doanh thu theo tháng, Sheet3 Top ký gửi, Sheet4 Quyết toán
 */
const exportFinancial = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const today    = new Date();
    const defFrom  = new Date(today); defFrom.setFullYear(defFrom.getFullYear() - 1);
    const dateFrom = req.query.date_from || defFrom.toISOString().slice(0, 10);
    const dateTo   = req.query.date_to   || today.toISOString().slice(0, 10);

    // Validate dates
    const from = new Date(dateFrom);
    const to   = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ (YYYY-MM-DD)' });
    }
    if (from > to) {
      return res.status(400).json({ success: false, message: 'Ngày bắt đầu phải trước ngày kết thúc' });
    }

    // ── Fetch all data in parallel ──
    const [overviewRes, monthlyRes, topConsignorsRes, settlementsRes] = await Promise.all([
      // 1. Overall KPIs in period
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'sold' AND sold_at BETWEEN $1 AND $2)   AS items_sold,
           COUNT(*) FILTER (WHERE status = 'active')                                AS items_active,
           COUNT(*) FILTER (WHERE status = 'pending')                               AS items_pending,
           COUNT(*) FILTER (WHERE status = 'returned')                              AS items_returned,
           COALESCE(SUM(sale_price)          FILTER (WHERE status = 'sold' AND sold_at BETWEEN $1 AND $2), 0) AS total_revenue,
           COALESCE(SUM(commission_amount)   FILTER (WHERE status = 'sold' AND sold_at BETWEEN $1 AND $2), 0) AS total_commission,
           COALESCE(SUM(consignor_amount)    FILTER (WHERE status = 'sold' AND sold_at BETWEEN $1 AND $2), 0) AS total_payout
         FROM products`,
        [dateFrom, dateTo]
      ),
      // 2. Monthly breakdown
      db.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', sold_at), 'MM/YYYY') AS thang,
           COUNT(*)                      AS so_san_pham,
           SUM(sale_price)               AS doanh_thu,
           SUM(commission_amount)        AS hoa_hong,
           SUM(consignor_amount)         AS tra_ky_gui
         FROM products
         WHERE status = 'sold' AND sold_at BETWEEN $1 AND $2
         GROUP BY DATE_TRUNC('month', sold_at)
         ORDER BY DATE_TRUNC('month', sold_at) ASC`,
        [dateFrom, dateTo]
      ),
      // 3. Top 20 consignors
      db.query(
        `SELECT
           co.code, co.full_name, co.phone,
           COUNT(p.id)               AS so_sp_ban,
           SUM(p.sale_price)         AS doanh_thu,
           SUM(p.commission_amount)  AS hoa_hong,
           SUM(p.consignor_amount)   AS tien_tra
         FROM consignors co
         JOIN products p ON p.consignor_id = co.id
           AND p.status = 'sold' AND p.sold_at BETWEEN $1 AND $2
         GROUP BY co.id, co.code, co.full_name, co.phone
         ORDER BY doanh_thu DESC
         LIMIT 20`,
        [dateFrom, dateTo]
      ),
      // 4. Settlements in period
      db.query(
        `SELECT
           s.code, co.full_name, co.phone,
           s.period_start, s.period_end,
           s.total_sale, s.total_commission, s.total_payout,
           s.status, s.paid_at, s.created_at
         FROM settlements s
         LEFT JOIN consignors co ON co.id = s.consignor_id
         WHERE s.created_at BETWEEN $1 AND $2
         ORDER BY s.created_at DESC
         LIMIT 2000`,
        [dateFrom, dateTo]
      ),
    ]);

    const wb       = new ExcelJS.Workbook();
    wb.creator     = 'REVA System';
    wb.created     = new Date();
    wb.modified    = new Date();
    const subtitle = `Kỳ: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)} | Xuất lúc: ${now()}`;

    // ── Sheet 1: Tổng quan ─────────────────────────────────────────────────────
    const sh1 = wb.addWorksheet('Tổng quan');
    sh1.columns = [
      { key: 'label', width: 34 },
      { key: 'value', width: 24 },
    ];
    addTitleBlock(sh1, 'BÁO CÁO TÀI CHÍNH — REVA', subtitle);

    const kv = overviewRes.rows[0];
    const kpis = [
      ['Chỉ số', 'Giá trị'],
      ['Sản phẩm đã bán (kỳ)', Number(kv.items_sold)],
      ['Sản phẩm đang bán (hiện tại)', Number(kv.items_active)],
      ['Sản phẩm chờ duyệt (hiện tại)', Number(kv.items_pending)],
      ['Sản phẩm đã trả (hiện tại)', Number(kv.items_returned)],
      ['---', '---'],
      ['Tổng doanh thu (kỳ)', Number(kv.total_revenue)],
      ['Tổng hoa hồng REVA (kỳ)', Number(kv.total_commission)],
      ['Tổng trả ký gửi viên (kỳ)', Number(kv.total_payout)],
    ];

    kpis.forEach((row, i) => {
      if (row[0] === '---') { sh1.addRow([]); return; }
      const r = sh1.addRow(row);
      if (i === 0) {
        styleHeader(r);
      } else {
        styleBody(r, i % 2 === 0);
        if (typeof row[1] === 'number' && (row[0].includes('doanh thu') || row[0].includes('hoa hồng') || row[0].includes('trả ký'))) {
          r.getCell(2).numFmt = VND_FORMAT;
        }
        r.getCell(1).font = { ...BODY_FONT, bold: true };
        r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        r.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    // ── Sheet 2: Doanh thu theo tháng ─────────────────────────────────────────
    const sh2 = wb.addWorksheet('Doanh thu theo tháng');
    sh2.columns = [
      { key: 'thang',      width: 14 },
      { key: 'so_sp',      width: 16 },
      { key: 'doanh_thu',  width: 22 },
      { key: 'hoa_hong',   width: 22 },
      { key: 'tra_ky_gui', width: 24 },
    ];
    addTitleBlock(sh2, 'DOANH THU THEO THÁNG', subtitle);

    const hdr2 = sh2.addRow(['Tháng', 'Số SP bán', 'Doanh thu', 'Hoa hồng REVA', 'Trả ký gửi viên']);
    styleHeader(hdr2);

    let totalSale = 0, totalComm = 0, totalPay = 0, totalItems = 0;
    monthlyRes.rows.forEach((row, i) => {
      const r = sh2.addRow([
        row.thang,
        Number(row.so_san_pham),
        Number(row.doanh_thu),
        Number(row.hoa_hong),
        Number(row.tra_ky_gui),
      ]);
      styleBody(r, i % 2 !== 0);
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).numFmt = VND_FORMAT;
      r.getCell(4).numFmt = VND_FORMAT;
      r.getCell(5).numFmt = VND_FORMAT;
      totalSale  += Number(row.doanh_thu);
      totalComm  += Number(row.hoa_hong);
      totalPay   += Number(row.tra_ky_gui);
      totalItems += Number(row.so_san_pham);
    });

    // Totals row
    const totRow2 = sh2.addRow(['TỔNG', totalItems, totalSale, totalComm, totalPay]);
    styleHeader(totRow2, 'FF6B5344');
    totRow2.getCell(3).numFmt = VND_FORMAT;
    totRow2.getCell(4).numFmt = VND_FORMAT;
    totRow2.getCell(5).numFmt = VND_FORMAT;

    // ── Sheet 3: Top ký gửi ────────────────────────────────────────────────────
    const sh3 = wb.addWorksheet('Top ký gửi');
    sh3.columns = [
      { key: 'stt',     width: 7 },
      { key: 'code',    width: 14 },
      { key: 'name',    width: 28 },
      { key: 'phone',   width: 16 },
      { key: 'count',   width: 14 },
      { key: 'revenue', width: 22 },
      { key: 'comm',    width: 22 },
      { key: 'payout',  width: 22 },
    ];
    addTitleBlock(sh3, 'TOP KÝ GỬI VIÊN', subtitle);

    const hdr3 = sh3.addRow(['#', 'Mã KGV', 'Họ tên', 'SĐT', 'SP đã bán', 'Doanh thu', 'Hoa hồng', 'Tiền nhận']);
    styleHeader(hdr3);

    topConsignorsRes.rows.forEach((row, i) => {
      const r = sh3.addRow([
        i + 1,
        row.code,
        row.full_name,
        row.phone,
        Number(row.so_sp_ban),
        Number(row.doanh_thu),
        Number(row.hoa_hong),
        Number(row.tien_tra),
      ]);
      styleBody(r, i % 2 !== 0);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(5).alignment = { horizontal: 'center' };
      r.getCell(6).numFmt = VND_FORMAT;
      r.getCell(7).numFmt = VND_FORMAT;
      r.getCell(8).numFmt = VND_FORMAT;
    });

    // ── Sheet 4: Quyết toán ────────────────────────────────────────────────────
    const sh4 = wb.addWorksheet('Quyết toán');
    sh4.columns = [
      { key: 'code',       width: 18 },
      { key: 'consignor',  width: 28 },
      { key: 'phone',      width: 16 },
      { key: 'from',       width: 14 },
      { key: 'to',         width: 14 },
      { key: 'sale',       width: 22 },
      { key: 'comm',       width: 22 },
      { key: 'payout',     width: 22 },
      { key: 'status',     width: 14 },
      { key: 'paid_at',    width: 18 },
    ];
    addTitleBlock(sh4, 'DANH SÁCH QUYẾT TOÁN', subtitle);

    const hdr4 = sh4.addRow([
      'Mã QT', 'Ký gửi viên', 'SĐT', 'Từ ngày', 'Đến ngày',
      'Tổng bán', 'Hoa hồng', 'Trả KGV', 'Trạng thái', 'Ngày TT',
    ]);
    styleHeader(hdr4);

    const STATUS_LABELS = { pending: 'Chờ thanh toán', paid: 'Đã thanh toán', cancelled: 'Đã hủy' };
    settlementsRes.rows.forEach((row, i) => {
      const r = sh4.addRow([
        row.code,
        row.full_name,
        row.phone,
        fmtDate(row.period_start),
        fmtDate(row.period_end),
        Number(row.total_sale),
        Number(row.total_commission),
        Number(row.total_payout),
        STATUS_LABELS[row.status] || row.status,
        row.paid_at ? fmtDate(row.paid_at) : '—',
      ]);
      styleBody(r, i % 2 !== 0);
      r.getCell(6).numFmt = VND_FORMAT;
      r.getCell(7).numFmt = VND_FORMAT;
      r.getCell(8).numFmt = VND_FORMAT;
      // Color status cell
      const statusCell = r.getCell(9);
      if (row.status === 'paid') statusCell.font = { ...BODY_FONT, color: { argb: 'FF1A7F37' }, bold: true };
      else if (row.status === 'pending') statusCell.font = { ...BODY_FONT, color: { argb: 'FF92600A' }, bold: true };
    });

    // ── Send response ──────────────────────────────────────────────────────────
    const filename = `REVA_TaichinhReport_${dateFrom}_${dateTo}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info({ userId: req.user?.id, dateFrom, dateTo }, 'financial report exported');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// ── Inventory Export ───────────────────────────────────────────────────────────

/**
 * GET /api/reports/export/inventory?status=&category_id=&location_id=
 * Exports: Sheet1 Tồn kho chi tiết, Sheet2 Tổng hợp theo trạng thái
 */
const exportInventory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { status, category_id, location_id } = req.query;

    const params = [];
    const conds  = [];
    let idx = 1;

    if (status)      { params.push(status);      conds.push(`p.status = $${idx++}`); }
    if (category_id) { params.push(category_id); conds.push(`p.category_id = $${idx++}`); }
    if (location_id) { params.push(location_id); conds.push(`p.location_id = $${idx++}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    // Limit 5000 rows to prevent memory issues
    params.push(5000);
    const [inventoryRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT
           p.code, p.name, p.status,
           p.sale_price, p.commission_amount, p.consignor_amount,
           p.condition_percent,
           COALESCE(c.name, 'Chưa phân loại') AS category_name,
           COALESCE(l.name, 'Chưa có') AS location_name,
           co.full_name AS consignor_name, co.code AS consignor_code,
           p.consign_start, p.consign_end, p.sold_at, p.created_at
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN locations l ON l.id = p.location_id
         LEFT JOIN consignors co ON co.id = p.consignor_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT $${idx}`,
        params
      ),
      db.query(
        `SELECT
           status,
           COUNT(*)            AS so_luong,
           COALESCE(SUM(sale_price), 0)          AS tong_gia_ban,
           COALESCE(SUM(commission_amount), 0)    AS tong_hoa_hong,
           COALESCE(SUM(consignor_amount), 0)     AS tong_tra_kgv
         FROM products
         GROUP BY status
         ORDER BY status`
      ),
    ]);

    const wb      = new ExcelJS.Workbook();
    wb.creator    = 'REVA System';
    wb.created    = new Date();
    wb.modified   = new Date();
    const subtitle = `Xuất lúc: ${now()}${status ? ` | Trạng thái: ${status}` : ''}`;

    // ── Sheet 1: Chi tiết tồn kho ──────────────────────────────────────────────
    const sh1 = wb.addWorksheet('Tồn kho chi tiết');
    sh1.columns = [
      { key: 'stt',           width: 7 },
      { key: 'code',          width: 16 },
      { key: 'name',          width: 32 },
      { key: 'status',        width: 16 },
      { key: 'category',      width: 20 },
      { key: 'location',      width: 20 },
      { key: 'consignor',     width: 26 },
      { key: 'co_code',       width: 14 },
      { key: 'condition',     width: 12 },
      { key: 'sale_price',    width: 20 },
      { key: 'commission',    width: 20 },
      { key: 'payout',        width: 20 },
      { key: 'consign_start', width: 14 },
      { key: 'consign_end',   width: 14 },
      { key: 'sold_at',       width: 18 },
    ];
    addTitleBlock(sh1, 'TỒN KHO SẢN PHẨM — REVA', subtitle);

    const hdr1 = sh1.addRow([
      '#', 'Mã SP', 'Tên sản phẩm', 'Trạng thái', 'Danh mục', 'Vị trí',
      'Ký gửi viên', 'Mã KGV', 'Tình trạng %',
      'Giá bán', 'Hoa hồng', 'Tiền KGV',
      'Bắt đầu KG', 'Kết thúc KG', 'Ngày bán',
    ]);
    styleHeader(hdr1);

    const STATUS_VN = {
      active:   'Đang bán',
      sold:     'Đã bán',
      pending:  'Chờ duyệt',
      returned: 'Trả hàng',
      expired:  'Hết hạn',
    };
    const STATUS_COLORS_ARGB = {
      active:   'FF1A7F37',
      sold:     'FF1A5276',
      pending:  'FF92600A',
      returned: 'FF666666',
      expired:  'FFB03A2E',
    };

    inventoryRes.rows.forEach((row, i) => {
      const r = sh1.addRow([
        i + 1,
        row.code,
        row.name,
        STATUS_VN[row.status] || row.status,
        row.category_name,
        row.location_name,
        row.consignor_name || '—',
        row.consignor_code || '—',
        row.condition_percent ? `${row.condition_percent}%` : '—',
        Number(row.sale_price),
        Number(row.commission_amount),
        Number(row.consignor_amount),
        fmtDate(row.consign_start),
        fmtDate(row.consign_end),
        row.sold_at ? fmtDate(row.sold_at) : '—',
      ]);
      styleBody(r, i % 2 !== 0);
      r.getCell(1).alignment  = { horizontal: 'center' };
      r.getCell(9).alignment  = { horizontal: 'center' };
      r.getCell(10).numFmt = VND_FORMAT;
      r.getCell(11).numFmt = VND_FORMAT;
      r.getCell(12).numFmt = VND_FORMAT;
      // Color status
      const statusCell = r.getCell(4);
      if (STATUS_COLORS_ARGB[row.status]) {
        statusCell.font = { ...BODY_FONT, color: { argb: STATUS_COLORS_ARGB[row.status] }, bold: true };
      }
    });

    // Freeze header rows (title=row1, subtitle=row2, blank=row3, header=row4)
    sh1.views = [{ state: 'frozen', ySplit: 4 }];

    // Auto-filter on header row
    sh1.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 15 } };

    // ── Sheet 2: Tổng hợp theo trạng thái ─────────────────────────────────────
    const sh2 = wb.addWorksheet('Tổng hợp');
    sh2.columns = [
      { key: 'status',   width: 18 },
      { key: 'count',    width: 14 },
      { key: 'sale',     width: 22 },
      { key: 'comm',     width: 22 },
      { key: 'payout',   width: 22 },
    ];
    addTitleBlock(sh2, 'TỔNG HỢP TỒN KHO', subtitle);

    const hdr2 = sh2.addRow(['Trạng thái', 'Số lượng', 'Tổng giá bán', 'Tổng hoa hồng', 'Tổng tiền KGV']);
    styleHeader(hdr2);

    summaryRes.rows.forEach((row, i) => {
      const r = sh2.addRow([
        STATUS_VN[row.status] || row.status,
        Number(row.so_luong),
        Number(row.tong_gia_ban),
        Number(row.tong_hoa_hong),
        Number(row.tong_tra_kgv),
      ]);
      styleBody(r, i % 2 !== 0);
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).numFmt = VND_FORMAT;
      r.getCell(4).numFmt = VND_FORMAT;
      r.getCell(5).numFmt = VND_FORMAT;
    });

    // Totals row
    const totals = summaryRes.rows.reduce(
      (acc, row) => ({
        count:  acc.count  + Number(row.so_luong),
        sale:   acc.sale   + Number(row.tong_gia_ban),
        comm:   acc.comm   + Number(row.tong_hoa_hong),
        payout: acc.payout + Number(row.tong_tra_kgv),
      }),
      { count: 0, sale: 0, comm: 0, payout: 0 }
    );
    const totRow = sh2.addRow(['TỔNG', totals.count, totals.sale, totals.comm, totals.payout]);
    styleHeader(totRow, 'FF6B5344');
    totRow.getCell(3).numFmt = VND_FORMAT;
    totRow.getCell(4).numFmt = VND_FORMAT;
    totRow.getCell(5).numFmt = VND_FORMAT;

    // ── Send response ──────────────────────────────────────────────────────────
    const filename = `REVA_TonKho_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info({ userId: req.user?.id, status, category_id, location_id, rows: inventoryRes.rows.length }, 'inventory report exported');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { exportFinancial, exportInventory };
