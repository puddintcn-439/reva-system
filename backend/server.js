require('dotenv').config();
const app = require('./src/app');
const migrateAll = require('./src/scripts/migrate-all');

const PORT = process.env.PORT || 5000;

// Run incremental migrations before accepting traffic
migrateAll()
  .catch((err) => console.error('⚠️  migrate-all error (server will still start):', err.message))
  .finally(async () => {
    try {
      const sysSettings = require('./src/config/systemSettings');
      const secret = await sysSettings.getJwtSecret();
      if (process.env.NODE_ENV === 'production') {
        if (!secret || typeof secret !== 'string' || secret.length < 32) {
          console.error('❌ JWT_SECRET is missing or too weak for production. Set JWT_SECRET and redeploy.');
          process.exit(1);
        }
      }
    } catch (err) {
      console.error('❌ Failed checking JWT secret during startup:', err.message);
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`✅ R.E.V.A Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  });
