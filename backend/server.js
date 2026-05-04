require('dotenv').config();
const app = require('./src/app');
const migrateAll = require('./src/scripts/migrate-all');

const PORT = process.env.PORT || 5000;

// Run incremental migrations before accepting traffic
migrateAll()
  .catch((err) => console.error('⚠️  migrate-all error (server will still start):', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`✅ R.E.V.A Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  });
