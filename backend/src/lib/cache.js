/* Lightweight cache abstraction: Redis when configured, otherwise in-memory Map.
 * Exports: get(key), set(key, value, ttlSeconds), del(key)
 */
let client = null;
let usingRedis = false;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL;
    client = url ? new Redis(url) : new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });
    usingRedis = true;
    client.on('error', (e) => console.error('Redis error', e && e.message));
    client.on('connect', () => console.log('Redis connected'));
  } catch (err) {
    console.error('Failed to initialize Redis client, falling back to memory cache:', err && err.message);
    client = null;
    usingRedis = false;
  }
}

const mem = new Map();

async function get(key) {
  if (usingRedis && client) {
    try {
      const v = await client.get(key);
      return v;
    } catch (e) {
      return mem.get(key) || null;
    }
  }
  return mem.get(key) || null;
}

async function set(key, value, ttlSeconds) {
  if (usingRedis && client) {
    try {
      if (ttlSeconds) {
        await client.set(key, value, 'EX', Number(ttlSeconds));
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (e) {
      mem.set(key, value);
      return false;
    }
  }
  mem.set(key, value);
  if (ttlSeconds) {
    setTimeout(() => mem.delete(key), Number(ttlSeconds) * 1000);
  }
  return true;
}

async function del(key) {
  if (usingRedis && client) {
    try { await client.del(key); return true; } catch (e) { mem.delete(key); return false; }
  }
  mem.delete(key);
  return true;
}

module.exports = { get, set, del };
