require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

pool.query(
  "DELETE FROM role_permissions WHERE permission = 'dashboard:view' AND role != 'admin'"
).then(r => {
  console.log('Deleted rows:', r.rowCount);
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
