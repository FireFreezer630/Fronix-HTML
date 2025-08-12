const NodeCache = require('node-cache');

// Create a new cache instance with a standard TTL of 10 minutes
const cache = new NodeCache({ stdTTL: 600 });

// Helper to mark a key as warm-up in progress and store a timestamp
function markWarming(key) {
  cache.set(`${key}:warming`, Date.now(), 120);
}
function isWarming(key) {
  const startedAt = cache.get(`${key}:warming`);
  return typeof startedAt === 'number' && Date.now() - startedAt < 120000;
}
function clearWarming(key) {
  cache.del(`${key}:warming`);
}

cache.markWarming = markWarming;
cache.isWarming = isWarming;
cache.clearWarming = clearWarming;

module.exports = cache;