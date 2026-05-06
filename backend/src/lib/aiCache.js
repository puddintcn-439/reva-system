// Lightweight in-memory cache for AI responses.
// Not distributed — suitable as a first step (can be swapped for Redis later).
const cache = new Map();

function set(key, value, ttlMs = 60 * 60 * 1000) {
  const expires = Date.now() + ttlMs;
  cache.set(key, { value, expires });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function del(key) {
  cache.delete(key);
}

function clear() {
  cache.clear();
}

module.exports = { set, get, del, clear };
