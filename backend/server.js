require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ R.E.V.A Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
