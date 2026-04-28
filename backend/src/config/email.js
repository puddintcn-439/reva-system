const nodemailer = require('nodemailer');
const sysSettings = require('./systemSettings');

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

module.exports = { interpolate, sendMail };
