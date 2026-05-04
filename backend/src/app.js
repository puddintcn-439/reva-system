const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const consignmentRoutes = require('./routes/consignments');
const settlementRoutes = require('./routes/settlements');
const locationRoutes = require('./routes/locations');
const announcementRoutes = require('./routes/announcements');
const purchaseRoutes = require('./routes/purchases');
const consignorRoutes = require('./routes/consignors');
const posRoutes = require('./routes/pos');
const emailRoutes = require('./routes/email');
const bankRoutes  = require('./routes/banks');
const systemSettingsRoutes = require('./routes/systemSettings');
const uploadRoutes = require('./routes/upload');
const { errorHandler } = require('./middleware/errorHandler');
const sysSettings = require('./config/systemSettings');

const app = express();

// Required for Vercel / reverse-proxy deployments (correct IP in rate-limiter)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS — dynamic: reads allowed origins from DB (with env fallback, cached 60s)
app.use(cors({
  origin: async (origin, callback) => {
    try {
      const allowed = await sysSettings.getAllowedOrigins();
      if (!origin) return callback(null, true);
      // Exact match OR wildcard pattern (e.g. https://*.vercel.app)
      const isAllowed = allowed.some((pattern) => {
        if (pattern === origin) return true;
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '[^.]+') + '$');
          return regex.test(origin);
        }
        return false;
      });
      if (isAllowed) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    } catch {
      // If DB not ready yet (e.g. first boot), fall back to env
      const fallback = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(o => o.trim());
      if (!origin || fallback.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limit on login to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.' },
});
app.use('/auth/login', loginLimiter);

// Stricter rate limit on public settlement lookup to prevent phone enumeration
const settlementLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu tra cứu. Vui lòng thử lại sau 15 phút.' },
});
app.use('/settlements/lookup', settlementLookupLimiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'R.E.V.A API Docs',
}));
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/consignments', consignmentRoutes);
app.use('/settlements', settlementRoutes);
app.use('/locations', locationRoutes);
app.use('/announcements', announcementRoutes);
app.use('/purchases', purchaseRoutes);
app.use('/consignors', consignorRoutes);
app.use('/pos', posRoutes);
app.use('/email', emailRoutes);
app.use('/banks', bankRoutes);
app.use('/system-settings', systemSettingsRoutes);
app.use('/upload', uploadRoutes);

// Health check — UptimeRobot monitors this endpoint
app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
