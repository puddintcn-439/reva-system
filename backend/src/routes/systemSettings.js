const router = require('express').Router();
const ctrl = require('../controllers/systemSettingsController');
const { authenticate, requirePermission } = require('../middleware/auth');

const guard = [authenticate, requirePermission('settings:system')];

router.get('/',          ...guard, ctrl.getAll);
router.patch('/',        ...guard, ctrl.updateMany);
router.post('/test-smtp', ...guard, ctrl.testSmtp);

module.exports = router;
