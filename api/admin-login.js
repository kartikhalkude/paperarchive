// Simple serverless admin login for Vercel (keep the secret in environment variables)
// Set ADMIN_PASS (or VERCEL_ADMIN_PASS) in your Vercel project environment variables.

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const pass = parsed.pass || '';
      const ADMIN_PASS = process.env.ADMIN_PASS || process.env.VERCEL_ADMIN_PASS || '';

      if (!ADMIN_PASS) {
        console.warn('ADMIN_PASS not configured on server');
        return res.status(500).json({ ok: false, error: 'Server not configured' });
      }

      if (pass === ADMIN_PASS) {
        return res.status(200).json({ ok: true });
      }

      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    } catch (e) {
      console.error('admin-login parse error', e);
      return res.status(400).json({ ok: false, error: 'Bad request' });
    }
  });
};
