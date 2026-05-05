const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');

// ── helpers ───────────────────────────────────────────────────────────────────

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI service not configured — set GEMINI_API_KEY');
    err.statusCode = 503;
    throw err;
  }
  return new GoogleGenerativeAI(key);
}

function parseJsonResponse(text) {
  // Strip markdown code fences if model wraps response
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

// ── suggestProduct ────────────────────────────────────────────────────────────

/**
 * POST /api/ai/suggest-product
 * body: { name, condition_percent?, category_name? }
 * Returns: { suggested_price: number, description: string }
 */
const suggestProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, condition_percent, category_name } = req.body;
    // Sanitize user input to prevent prompt injection
    const safeName     = name.replace(/["`\\]/g, ' ').slice(0, 200);
    const condition    = condition_percent != null ? `${condition_percent}%` : 'không rõ';
    const safeCategory = category_name ? category_name.replace(/["`\\]/g, ' ').trim().slice(0, 100) : 'chưa phân loại';

    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Bạn là chuyên gia định giá đồ secondhand tại Việt Nam.

Sản phẩm: [${safeName}]
Danh mục: ${safeCategory}
Tình trạng: ${condition} (100% = mới nguyên, 80% = còn tốt, dưới 60% = cũ nhiều)

Hãy trả về JSON thuần (KHÔNG có markdown, KHÔNG có code fence):
{
  "suggested_price": <số nguyên VNĐ, phù hợp thị trường secondhand Việt Nam>,
  "description": "<3-4 câu mô tả hấp dẫn bằng tiếng Việt, nêu tình trạng và điểm nổi bật của sản phẩm>"
}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    let parsed;
    try {
      parsed = parseJsonResponse(text);
    } catch {
      logger.warn({ text }, 'AI returned non-JSON for suggestProduct');
      return res.status(502).json({ success: false, message: 'AI trả về dữ liệu không hợp lệ, vui lòng thử lại' });
    }

    const suggestedPrice = Number(parsed.suggested_price);
    const description    = String(parsed.description || '').trim();

    if (!suggestedPrice || suggestedPrice <= 0 || !description) {
      return res.status(502).json({ success: false, message: 'AI trả về dữ liệu thiếu thông tin' });
    }

    logger.info({ userId: req.user?.id, name }, 'AI product suggestion generated');
    res.json({ success: true, data: { suggested_price: suggestedPrice, description } });
  } catch (err) {
    next(err);
  }
};

// ── analyzeDashboard ──────────────────────────────────────────────────────────

/**
 * POST /api/ai/analyze-dashboard
 * body: { total_revenue, total_commission, items_sold, items_active, items_pending, period_months? }
 * Returns: { summary: string }
 */
const analyzeDashboard = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const {
      total_revenue, total_commission, items_sold,
      items_active, items_pending, period_months,
    } = req.body;

    const fmtVND = (n) => Number(n || 0).toLocaleString('vi-VN');
    const period = Number(period_months) || 1;

    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Bạn là chuyên gia phân tích kinh doanh cho cửa hàng secondhand REVA tại Việt Nam.

Số liệu kinh doanh trong ${period} tháng gần nhất:
- Tổng doanh thu: ${fmtVND(total_revenue)} VNĐ
- Hoa hồng REVA thu: ${fmtVND(total_commission)} VNĐ
- Sản phẩm đã bán: ${items_sold || 0} sản phẩm
- Sản phẩm đang bán (tồn kho active): ${items_active || 0} sản phẩm
- Sản phẩm chờ duyệt: ${items_pending || 0} sản phẩm

Hãy viết 3-4 câu nhận xét ngắn gọn: điểm tốt, điểm cần chú ý, và 1 gợi ý cải thiện cụ thể. Viết bằng tiếng Việt tự nhiên như chuyên gia tư vấn, không dùng bullet points, viết thành đoạn văn liên tục.`;

    const result  = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    logger.info({ userId: req.user?.id, period }, 'AI dashboard analysis generated');
    res.json({ success: true, data: { summary } });
  } catch (err) {
    next(err);
  }
};

module.exports = { suggestProduct, analyzeDashboard };
