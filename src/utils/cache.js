const Redis = require('ioredis');

// Support Vercel KV, Upstash, or generic Redis
const REDIS_URL = process.env.KV_URL || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
let redis = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', (err) => console.error('Redis Client Error', err));
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
  }
} else {
  console.warn('REDIS_URL not found. Caching will be in-memory (limited on Vercel).');
}

// In-memory fallback
const memoryCache = new Map();

/**
 * Get a value from cache
 * @param {string} key 
 */
async function get(key) {
  if (redis) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  }
  
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set a value in cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttl Seconds
 */
async function set(key, value, ttl = 86400) {
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      console.error('Cache set error:', err);
    }
    return;
  }
  
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttl * 1000)
  });
}

/**
 * Delete a value from cache
 * @param {string} key 
 */
async function del(key) {
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error('Cache del error:', err);
    }
    return;
  }
  memoryCache.delete(key);
}

/**
 * Disconnect from Redis
 */
async function disconnect() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

module.exports = {
  get,
  set,
  del,
  disconnect
};
