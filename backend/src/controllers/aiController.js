const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const crypto = require('crypto');
const { get: cacheGet, set: cacheSet } = require('../lib/aiCache');
const { checkAndIncrementUsage, getUsageByDate } = require('../lib/aiUsage');

// Daily quotas (per-user)
const SUGGEST_DAILY_QUOTA = Number(process.env.AI_SUGGEST_DAILY_QUOTA) || 100;
const ANALYZE_DAILY_QUOTA = Number(process.env.AI_ANALYZE_DAILY_QUOTA) || 5;

// Cache TTL for dashboard analysis (ms). Can be tuned via ENV.
const ANALYZE_CACHE_TTL = Number(process.env.AI_ANALYZE_CACHE_TTL_MS) || 60 * 60 * 1000;

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

/** Map Gemini API errors to friendly HTTP responses */
function handleGeminiError(err, res) {
  const msg = err.message || '';
  if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
    // Extract retry-after if present
    const retryMatch = msg.match(/retry in (\d+)/i);
    const retryAfter = retryMatch ? `${retryMatch[1]} giây` : 'vài phút';
    return res.status(429).json({
      success: false,
      message: `AI đang bận, vui lòng thử lại sau ${retryAfter}`,
    });
  }
  if (msg.includes('403') || msg.includes('API_KEY') || msg.includes('permission')) {
    return res.status(503).json({
      success: false,
      message: 'AI service chưa được cấu hình đúng, vui lòng liên hệ admin',
    });
  }
  return null; // not a known Gemini error, propagate to next()
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
    const safeName     = name.replace(/["`'\\[\]{}]/g, ' ').slice(0, 200);
    const condition    = condition_percent != null ? `${condition_percent}%` : 'không rõ';
    const safeCategory = category_name ? category_name.replace(/["`'\\[\]{}]/g, ' ').trim().slice(0, 100) : 'chưa phân loại';

    // Enforce per-user daily quota for suggest-product
    const usageRes = await checkAndIncrementUsage(req.user?.id, 'suggest-product', SUGGEST_DAILY_QUOTA);
    if (!usageRes.allowed) {
      return res.status(429).json({ success: false, message: 'Đã vượt hạn mức gọi AI gợi ý trong ngày. Vui lòng thử lại sau.' });
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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
    const handled = handleGeminiError(err, res);
    if (!handled) next(err);
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

    let {
      total_revenue, total_commission, items_sold,
      items_active, items_pending, period_months,
    } = req.body;

    // If client sends full orders array, aggregate it server-side to reduce tokens
    if (Array.isArray(req.body.orders) && req.body.orders.length) {
      try {
        const orders = req.body.orders;
        total_revenue = orders.reduce((s, o) => s + Number(o.total || o.amount || o.price || 0), 0);
        items_sold = orders.reduce((s, o) => s + Number(o.quantity || 1), 0);
        total_commission = orders.reduce((s, o) => s + Number(o.commission || 0), 0);
      } catch (e) {
        // ignore aggregation errors and fallback to provided values
      }
    }

    const fmtVND = (n) => Number(n || 0).toLocaleString('vi-VN');
    const period = Number(period_months) || 1;

    // Build a normalized cache key from numeric metrics (stable ordering)
    const normalized = {
      total_revenue: Number(total_revenue) || 0,
      total_commission: Number(total_commission) || 0,
      items_sold: Number(items_sold) || 0,
      items_active: Number(items_active) || 0,
      items_pending: Number(items_pending) || 0,
      period: Number(period) || 1,
    };
    const cacheKey = 'ai:dashboard:' + crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const cached = cacheGet(cacheKey);
    if (cached) {
      logger.info({ userId: req.user?.id, period, cacheKey }, 'AI dashboard analysis returned from cache');
      return res.json({ success: true, data: { summary: cached, cached: true } });
    }

    // Enforce per-user daily quota for analyze-dashboard
    const usageRes = await checkAndIncrementUsage(req.user?.id, 'analyze-dashboard', ANALYZE_DAILY_QUOTA);
    if (!usageRes.allowed) {
      return res.status(429).json({ success: false, message: 'Đã vượt hạn mức phân tích AI trong ngày. Vui lòng thử lại sau hoặc nâng cấp gói.' });
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `Bạn là chuyên gia phân tích kinh doanh cho cửa hàng secondhand REVA tại Việt Nam.

Số liệu kinh doanh trong ${period} tháng gần nhất:
- Tổng doanh thu: ${fmtVND(normalized.total_revenue)} VNĐ
- Hoa hồng REVA thu: ${fmtVND(normalized.total_commission)} VNĐ
- Sản phẩm đã bán: ${normalized.items_sold || 0} sản phẩm
- Sản phẩm đang bán (tồn kho active): ${normalized.items_active || 0} sản phẩm
- Sản phẩm chờ duyệt: ${normalized.items_pending || 0} sản phẩm

Hãy viết 3-4 câu nhận xét ngắn gọn: điểm tốt, điểm cần chú ý, và 1 gợi ý cải thiện cụ thể. Viết bằng tiếng Việt tự nhiên như chuyên gia tư vấn, không dùng bullet points, viết thành đoạn văn liên tục.`;

    const result  = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // Cache the generated summary to avoid repeat costs for identical inputs
    try {
      cacheSet(cacheKey, summary, ANALYZE_CACHE_TTL);
    } catch (e) {
      // non-fatal — continue even if caching fails
      logger.warn({ err: e.message }, 'AI cache set failed');
    }

    logger.info({ userId: req.user?.id, period }, 'AI dashboard analysis generated');
    res.json({ success: true, data: { summary } });
  } catch (err) {
    const handled = handleGeminiError(err, res);
    if (!handled) next(err);
  }
};

// Admin: fetch ai usage rows for a given date (YYYY-MM-DD)
const getUsage = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = await getUsageByDate(date);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { suggestProduct, analyzeDashboard, getUsage };
