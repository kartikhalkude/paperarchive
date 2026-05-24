# Security Fix Implementation Checklist

## 🔴 CRITICAL - Fix TODAY

### 1. Verify Supabase Key Type

**Time**: 5 minutes

- [ ] Go to https://app.supabase.com
- [ ] Select your "paperarchive" project
- [ ] Go to Settings → API
- [ ] Check which key is being used in your app:
  - [ ] Copy the "anon public" key's first 20 characters
  - [ ] Copy the "service_role secret" key's first 20 characters
  - [ ] Find which one appears in your code:
    ```bash
    # In terminal, search for your key:
    grep -r "eyJhbG" .
    ```
- [ ] **⚠️ IF using service_role key**: IMMEDIATELY REVOKE and regenerate
  - Go to Settings → API → Rotate Secret Key
  - Update your .env file

**Why**: Service_role keys can delete/modify all data, even bypassing RLS

---

### 2. Enable Row Level Security (RLS)

**Time**: 10 minutes

- [ ] Go to https://app.supabase.com → SQL Editor
- [ ] Run these SQL commands:

```sql
-- Enable RLS on papers table
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Create a policy for public read access
CREATE POLICY "public_read" ON papers
  FOR SELECT
  USING (true);

-- Create a policy for admin writes only
-- (You'll need an admin table - see below)
```

- [ ] If you don't have an admin table yet, create one:

```sql
-- Create admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now()
);

-- Create policy for admin delete
CREATE POLICY "admin_delete" ON papers
  FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admin_users));
```

- [ ] Go to Supabase → Authentication → Policies
- [ ] Verify policies are showing on the "papers" table

**Why**: Without RLS, anyone with your API key can delete everything

---

### 3. Switch from Password to Supabase Auth (Recommended)

**Time**: 30 minutes

- [ ] Enable Supabase Auth in your project:
  - Go to Settings → Authentication → Providers
  - Enable "Email" and optionally "GitHub"

- [ ] Replace password-based login in `main.js`:

```javascript
// Replace doLogin() with:
async function doLogin() {
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-pass").value;

  try {
    const { data, error } = await _sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    isAdmin = true; // In real app, verify with server
    showToast("Logged in");
  } catch (e) {
    alert("Login failed: " + e.message);
  }
}
```

- [ ] Update HTML password field to email:

  ```html
  <label>Admin Email</label>
  <input type="email" id="admin-email" placeholder="admin@example.com" />

  <label>Password</label>
  <input type="password" id="admin-pass" />
  ```

**Why**: Supabase Auth is more secure than plain passwords, includes rate limiting

---

### 4. Verify HTTPS is Enabled

**Time**: 5 minutes

- [ ] If hosting on Vercel:
  - [ ] Go to Vercel dashboard → Project Settings → Domains
  - [ ] Verify domain has SSL certificate (should show "✓ SSL Certificate installed")
  - [ ] Set "Enforce HTTPS" to ON

- [ ] If self-hosted:
  - [ ] Use Let's Encrypt (free): `certbot certonly --standalone -d yoursite.com`
  - [ ] Configure your server to redirect HTTP → HTTPS

- [ ] Test: Open site in browser
  - [ ] URL should show 🔒 lock icon
  - [ ] Try accessing with `http://` → should redirect to `https://`

**Why**: Passwords and API keys are sent in HTTPS. Without it, network sniffing can steal everything

---

### 5. Add File Upload Validation

**Time**: 15 minutes

- [ ] Replace the file validation code in `addPaper()` function:

```javascript
// Add this before uploading
const ALLOWED_MIME_TYPES = ["application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

for (let file of files) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    alert(`Only PDF files allowed. "${file.name}" is ${file.type}`);
    return;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    alert(`File "${file.name}" exceeds 5MB limit`);
    return;
  }

  // Validate PDF magic bytes (prevents uploading .exe as .pdf)
  const buffer = await file.slice(0, 4).arrayBuffer();
  const header = new Uint8Array(buffer);
  const isPDF =
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46; // %PDF

  if (!isPDF) {
    alert(`File "${file.name}" is not a valid PDF`);
    return;
  }
}
```

- [ ] Test by trying to upload:
  - [ ] A valid PDF → should succeed
  - [ ] A .txt file as .pdf → should fail
  - [ ] A file > 5MB → should fail

**Why**: Prevents malware uploads and file type abuse

---

## 🟡 HIGH PRIORITY - Fix This Week

### 6. Fix XSS Vulnerabilities

**Time**: 20 minutes

- [ ] Replace all dangerous `innerHTML` assignments in `main.js`:

**Search for patterns**:

```bash
grep -n "innerHTML = " main.js
```

**Replace pattern**:

```javascript
// BEFORE (UNSAFE):
element.innerHTML = `<div>${userInput}</div>`;

// AFTER (SAFE):
element.innerHTML = `<div>${esc(userInput)}</div>`;
```

- [ ] Update error handling:

```javascript
// BEFORE:
msg.innerHTML = `<div class="msg error">${e.message}</div>`;

// AFTER:
const errorDiv = document.createElement("div");
errorDiv.className = "msg error";
errorDiv.textContent = e.message; // Use textContent
msg.innerHTML = "";
msg.appendChild(errorDiv);
```

- [ ] Test: Try entering `<script>alert('XSS')</script>` in subject field
  - Should display as plain text, not execute

**Why**: XSS can steal credentials, hijack sessions, redirect users to phishing sites

---

### 7. Add Admin Verification on Server

**Time**: 30 minutes

- [ ] Create `/api/delete-paper.js`:

```javascript
// /api/delete-paper.js
module.exports = async (req, res) => {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Verify admin password (or use JWT token)
  const adminPass = process.env.ADMIN_PASS || "";
  const authHeader = req.headers["authorization"];

  // Simple auth check - in production use JWT
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  if (token !== adminPass) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing paper ID" });
    }

    // Delete from database
    // (Use your Supabase service role key here, NOT exposed to client)
    // const { error } = await supabase.from('papers').delete().eq('id', id);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Delete error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
```

- [ ] Update `deletePaper()` in `main.js` to use server endpoint:

```javascript
async function deletePaper(id) {
  if (!confirm("Delete this paper?")) return;

  try {
    const res = await fetch("/api/delete-paper", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.getElementById("admin-pass").value}`,
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("Delete failed: " + (await res.json()).error);
      return;
    }

    showToast("Paper deleted");
    fetchPapers();
  } catch (e) {
    alert("Error deleting paper");
  }
}
```

**Why**: Prevents client-side auth bypass (someone setting `isAdmin = true` in DevTools)

---

### 8. Add Rate Limiting

**Time**: 20 minutes (if using Node.js)

If NOT using Node.js backend, use Vercel rate limiting:

- [ ] In your `vercel.json`:

```json
{
  "functions": {
    "api/admin-login.js": {
      "maxDuration": 10,
      "memory": 128
    }
  }
}
```

If using Express.js:

- [ ] Install: `npm install express-rate-limit`

- [ ] Create `/api/middleware/rateLimit.js`:

```javascript
const rateLimit = require("express-rate-limit");

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, try again later",
  skip: (req) => req.ip === "127.0.0.1", // Skip localhost
});
```

- [ ] Use in `/api/admin-login.js`:

```javascript
const rateLimit = require("./middleware/rateLimit");

app.post("/api/admin-login", rateLimit, (req, res) => {
  // ... existing code
});
```

- [ ] Test by submitting login form 6 times quickly
  - 6th attempt should show: "Too many login attempts"

**Why**: Prevents brute force attacks on admin password

---

### 9. Add Security Headers

**Time**: 10 minutes

- [ ] Create or update `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

- [ ] Deploy and verify headers are present:
  - Open site, press F12 → Network → click HTML file
  - Check Response Headers for the new security headers

**Why**: Prevents various browser-based attacks (clickjacking, MIME type confusion, XSS)

---

### 10. Input Validation

**Time**: 15 minutes

- [ ] Add validation functions to `main.js`:

```javascript
function validateSubject(subject) {
  if (!subject || subject.trim().length === 0) {
    throw new Error("Subject cannot be empty");
  }
  if (subject.length > 500) {
    throw new Error("Subject cannot exceed 500 characters");
  }
  return subject.trim();
}

function validateFileName(filename) {
  if (filename.length > 200) {
    throw new Error("Filename too long");
  }
  // Remove dangerous characters
  return filename.replace(/[<>:"\/\\|?*]/g, "_");
}
```

- [ ] Use in `addPaper()`:

```javascript
const subject = validateSubject(document.getElementById("f-subject").value);
const cName = validateFileName(document.getElementById("f-filename").value);
```

**Why**: Prevents injection attacks and data corruption

---

## 🟢 MEDIUM PRIORITY - Fix This Month

### 11. CSRF Protection

**Time**: 30 minutes

- [ ] Add CSRF token generation to server
- [ ] Include token in forms
- [ ] Verify token on POST/DELETE requests

### 12. Implement Two-Factor Auth

- [ ] Enable 2FA for admin login
- [ ] Use TOTP (Google Authenticator)

### 13. Add Audit Logging

- [ ] Log all admin actions (login, upload, delete)
- [ ] Store in database with timestamp and IP

### 14. Regular Security Scanning

- [ ] Run: `npm audit` monthly
- [ ] Update dependencies: `npm update`

---

## ✅ Final Testing Checklist

After implementing fixes, test these scenarios:

- [ ] **HTTPS**: Site loads with 🔒 lock, `http://` redirects to `https://`
- [ ] **Login**: Can login with correct password, login fails with wrong password
- [ ] **File Upload**:
  - [ ] PDF uploads work
  - [ ] Non-PDF files are rejected
  - [ ] Files > 5MB are rejected
  - [ ] Malware files (renamed as .pdf) are rejected
- [ ] **Delete**: Only logged-in admin can delete
  - [ ] Logged out user cannot delete
  - [ ] Try setting `isAdmin = true` in DevTools console → shouldn't be able to delete
- [ ] **Rate Limiting**: Try logging in 6 times → 6th fails
- [ ] **XSS**: Enter `<script>alert('xss')</script>` in subject → should display as text
- [ ] **Performance**: Site loads < 2s on 3G connection

---

## 🚀 Deployment Checklist

Before going live:

- [ ] All critical fixes completed
- [ ] HTTPS enabled and enforced
- [ ] Environment variables set securely (never in code)
- [ ] RLS policies enabled on Supabase
- [ ] Admin role has strong, unique password (20+ characters)
- [ ] Backups enabled
- [ ] Monitoring/alerts set up
- [ ] Security headers in place
- [ ] CORS properly configured
- [ ] Rate limiting enabled

---

## 📞 Need Help?

- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- OWASP Security: https://owasp.org/
- npm audit: `npm audit --fix`

**Questions?** Compare your current security level against the audit report in `SECURITY_AUDIT.md`
