const db = require('../config/database');

/**
 * Audit logging middleware factory.
 * Usage: router.post('/', authenticate, audit('create', 'settlement'), ctrl.create)
 *
 * @param {string} action   - verb: create | update | delete | mark_paid | cancel | change_status
 * @param {string} resource - noun: settlement | product | consignment | user | purchase
 * @param {Function} [idFn] - optional fn(req) → resourceId; defaults to req.params.id
 */
const audit = (action, resource, idFn) => async (req, res, next) => {
  // We want to log AFTER the handler runs, so we wrap res.json
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const statusCode = res.statusCode || 200;

    // Only log successful mutating operations (2xx)
    if (statusCode >= 200 && statusCode < 300 && req.user) {
      const resourceId = idFn
        ? idFn(req)
        : (req.params.id || (body?.data?.id) || null);

      // Fire-and-forget — don't delay response
      db.query(
        `INSERT INTO audit_logs (user_id, username, action, resource, resource_id, details, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          req.user.id,
          req.user.username,
          action,
          resource,
          resourceId ? String(resourceId) : null,
          JSON.stringify({ body: req.body, params: req.params }),
          req.ip || req.headers['x-forwarded-for'] || null,
        ]
      ).catch((err) => console.error('[audit] write error:', err.message));
    }

    return originalJson(body);
  };

  next();
};

module.exports = { audit };
