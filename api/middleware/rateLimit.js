// /api/middleware/rateLimit.js
// Simple in-memory rate limiter for serverless functions
// Note: In production with multiple instances, use Redis

const attempts = new Map(); // { ip: [timestamps] }

function getRateLimiter(windowMs = 15 * 60 * 1000, maxAttempts = 5) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Skip localhost
    if (ip === '127.0.0.1' || ip === '::1') {
      return next();
    }

    // Clean old attempts
    if (!attempts.has(ip)) {
      attempts.set(ip, []);
    }

    const ipAttempts = attempts.get(ip);
    const recentAttempts = ipAttempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        ok: false,
        error: 'Too many attempts. Please try again in 15 minutes.',
        retryAfter: windowMs / 1000
      });
    }

    recentAttempts.push(now);
    attempts.set(ip, recentAttempts);

    // Cleanup old IP entries periodically
    if (attempts.size > 1000) {
      for (let [key, times] of attempts.entries()) {
        if (times.filter(t => now - t < windowMs).length === 0) {
          attempts.delete(key);
        }
      }
    }

    next();
  };
}

module.exports = getRateLimiter;
