// ✅ SECURITY: Serverless admin login with rate limiting
// Set ADMIN_PASS (or VERCEL_ADMIN_PASS) in your Vercel project environment variables.

const getRateLimiter = require('./middleware/rateLimit');
const rateLimiter = getRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

module.exports = (req, res) => {
  // ✅ SECURITY: Apply rate limiting first
  return rateLimiter(req, res, () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    let body = '';
    req.on('data', (chunk) => {
      if (body.length > 1000) {
        req.destroy();
        return res.status(413).json({ ok: false, error: 'Payload too large' });
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const pass = parsed.pass || '';
        const ADMIN_PASS = process.env.ADMIN_PASS || process.env.VERCEL_ADMIN_PASS || '';

        if (!ADMIN_PASS) {
          console.warn('ADMIN_PASS not configured on server');
          return res.status(500).json({ ok: false, error: 'Server not configured' });
        }

        // ✅ SECURITY: Constant-time comparison to prevent timing attacks
        if (pass.length !== ADMIN_PASS.length) {
          return res.status(401).json({ ok: false, error: 'Invalid credentials' });
        }

        let isValid = true;
        for (let i = 0; i < pass.length; i++) {
          if (pass[i] !== ADMIN_PASS[i]) {
            isValid = false;
          }
        }

        if (isValid) {
          // ✅ SECURITY: Set secure cookie instead of relying on client-side storage
          res.setHeader('Set-Cookie', `admin_token=${pass}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);
          return res.status(200).json({ ok: true });
        }

        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
      } catch (e) {
        console.error('admin-login parse error', e);
        return res.status(400).json({ ok: false, error: 'Bad request' });
      }
    });
  });
};
