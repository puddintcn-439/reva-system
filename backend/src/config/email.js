const nodemailer = require('nodemailer');
const sysSettings = require('./systemSettings');

// Lazy-require db to avoid circular dependency (db → sysSettings → email → db)
const getDb = () => require('./database');

/**
 * Create transporter from DB config (falls back to env if DB not yet configured).
 */
const createTransporter = async () => {
  const cfg = await sysSettings.getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    // Dev fallback: log to console
    return null;
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
};

/**
 * Replace {{variable}} placeholders in template text.
 */
const interpolate = (text, vars = {}) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

/**
 * Send an email using a template body and subject.
 * @param {string} to  Recipient email
 * @param {string} subject  Already-interpolated subject
 * @param {string} body     Already-interpolated plain text body
 */
const sendMail = async (to, subject, body) => {
  const transporter = await createTransporter();
  const cfg = await sysSettings.getSmtpConfig();
  const from = cfg.from || 'REVA <noreply@reva.vn>';

  if (!transporter) {
    // Dev mode: print to console
    console.log(`[EMAIL DEV] To: ${to}\nSubject: ${subject}\n${body}\n---`);
    return { messageId: 'dev-console' };
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  });
  return info;
};

/**
 * Look up an email_templates row by key, interpolate vars, and send.
 * Silently logs errors — never throws, so callers don't crash.
 *
 * @param {string} templateKey  Key in email_templates table
 * @param {string} to           Recipient address
 * @param {Object} vars         Variables for {{placeholder}} substitution
 */
const sendTemplateEmail = async (templateKey, to, vars = {}) => {
  if (!to) return; // no email on file — skip silently
  try {
    const db = getDb();
    const tpl = await db.query('SELECT subject, body FROM email_templates WHERE key = $1', [templateKey]);
    if (!tpl.rows.length) {
      console.warn(`[EMAIL] Template "${templateKey}" not found — skipping`);
      return;
    }
    const { subject, body } = tpl.rows[0];
    await sendMail(to, interpolate(subject, vars), interpolate(body, vars));
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${templateKey}" to ${to}:`, err.message);
  }
};

module.exports = { interpolate, sendMail, sendTemplateEmail };
