const fs = require('fs');
const path = require('path');
const backendDir = path.join(__dirname, '..');
const covPath = path.join(backendDir, 'coverage', 'coverage-final.json');
if (!fs.existsSync(covPath)) {
  console.error('coverage-final.json not found at', covPath);
  process.exit(2);
}
const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
const items = [];
for (const abs in cov) {
  const data = cov[abs];
  const s = data.s || {};
  const values = Object.values(s);
  const total = values.length;
  const hit = values.filter(v => v>0).length;
  const pct = total ? (hit / total * 100) : 100;
  const rel = path.relative(backendDir, abs).replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (rel.includes('src/')) items.push({ file: rel, total, hit, pct: Math.round(pct * 10) / 10 });
}
items.sort((a, b) => a.pct - b.pct);
console.log(JSON.stringify(items, null, 2));
