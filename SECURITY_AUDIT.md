# Security Audit Report: PaperArchive

**Date**: May 24, 2026  
**Status**: ⚠️ CRITICAL VULNERABILITIES FOUND

---

## 🔴 CRITICAL ISSUES

### 1. **Supabase API Keys Exposed in Client-Side Code** ⚠️ CRITICAL

**Location**: `main.js` lines 4-5  
**Risk**: HIGH - API Key compromise allows full database access

```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
```

**Problem**:

- These keys are embedded in the client-side JavaScript bundle
- **Anyone who inspects browser DevTools → Network → JavaScript can see your keys**
- If these are "service_role" keys instead of "anon" keys, attackers can read/modify/delete all data
- Even "anon" keys can be abused if RLS isn't properly configured

**Impact**:

- ✅ If properly configured: Keys are "anon" with strict RLS → moderate risk
- ❌ If misconfigured: Full database read/write/delete access to all data

**Action Required**:

1. Verify in Supabase dashboard: Settings → API → Check if key is "anon" or "service_role"
2. If "service_role" → IMMEDIATELY revoke and regenerate
3. Check Supabase → Authentication → Row Level Security (RLS) policies

---

### 2. **No Row Level Security (RLS) Policy Protection** ⚠️ CRITICAL

**Location**: Supabase database configuration  
**Risk**: HIGH

**Problem**:

- No evidence of RLS policies restricting data access
- Even with "anon" key, any authenticated user could potentially:
  - Read all papers
  - Modify paper metadata
  - Delete papers
  - Access admin status data

**Impact**: Database is completely open if RLS is not enabled

**Action Required**:

```sql
-- Enable RLS on papers table
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read-only access
CREATE POLICY "Enable read access for all users" ON papers
  FOR SELECT USING (true);

-- Restrict write access to authenticated admins only
CREATE POLICY "Enable admin insert" ON papers
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    (SELECT is_admin FROM admin_users WHERE id = auth.uid()) = true
  );
```

---

### 3. **Admin Password Sent in Plain Text (If Not HTTPS)** ⚠️ CRITICAL

**Location**: `main.js` line 570 → `/api/admin-login`  
**Risk**: HIGH

**Problem**:

```javascript
async function doLogin() {
  const pass = document.getElementById("admin-pass").value;
  const res = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pass }), // ❌ PLAINTEXT PASSWORD
  });
}
```

**Impact**:

- If site is not HTTPS → password visible in network traffic
- Network sniffing/MITM attacks can capture credentials
- Password stored in localStorage history

**Action Required**:

1. ✅ Ensure site is **HTTPS only** (check Vercel/hosting settings)
2. ✅ Set `Strict-Transport-Security` header
3. ✅ Use stronger auth: API keys or JWT tokens instead of passwords
4. ✅ Implement rate limiting on login attempts

---

### 4. **No File Type Validation (Only Extension Check)** ⚠️ HIGH

**Location**: `main.js` lines 640-655  
**Risk**: MEDIUM-HIGH

**Problem**:

```javascript
const ext = file.name.split(".").pop();
const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

// ❌ NO MIME TYPE CHECK - could upload .exe, .sh, .zip as .pdf
// ❌ Only size check (5MB)
if (file.size > 5 * 1024 * 1024) {
  throw new Error(`Upload failed: file too large`);
}
```

**Impact**:

- Attackers could upload malware disguised as PDFs
- Malicious files served from Supabase storage
- Users could download infected files

**Action Required**:

```javascript
const ALLOWED_TYPES = ["application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error("Only PDF files allowed");
}

// Additional: Validate PDF header
const buffer = await file.slice(0, 4).arrayBuffer();
const header = new Uint8Array(buffer);
const isPDF =
  header[0] === 0x25 &&
  header[1] === 0x50 &&
  header[2] === 0x44 &&
  header[3] === 0x46; // %PDF
if (!isPDF) {
  throw new Error("Invalid PDF file");
}
```

---

### 5. **XSS Vulnerabilities (innerHTML with User Input)** ⚠️ HIGH

**Locations**: Multiple  
**Risk**: MEDIUM

**Problem**:

```javascript
// Line 285: Unsafe innerHTML
main.innerHTML = '<div class="empty"><p>Loading…</p></div>';

// Line 293: Error messages could contain malicious content
main.innerHTML = `<div class="empty">...${error}...</div>`;

// Line 1267: User input in innerHTML
document.getElementById("drop-text").innerHTML = "Click or drag files here";

// Line 595: Error message from user input
msg.innerHTML = `<div class="msg error">${e.message}</div>`;
```

**Impact**:

- If error messages contain user-controlled data, XSS is possible
- Script injection could steal credentials, modify data, redirect users

**Action Required**:

```javascript
// Use textContent instead of innerHTML for untrusted content
msg.textContent = e.message;

// Or use proper HTML escaping
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
msg.innerHTML = `<div class="msg error">${escapeHtml(e.message)}</div>`;
```

---

### 6. **No Server-Side Authentication on Admin Actions** ⚠️ HIGH

**Location**: `deletePaper()` function calls directly to Supabase  
**Risk**: MEDIUM-HIGH

**Problem**:

```javascript
async function deletePaper(id) {
  if (!confirm("Delete this paper permanently?")) return;

  const { error } = await _sb.from("papers").delete().eq("id", id);
  // ❌ No check if user is actually admin
  // ❌ Client-side isAdmin flag can be bypassed
}
```

**Impact**:

- Attacker could modify client-side JavaScript (DevTools)
- Set `isAdmin = true` → bypass all checks
- Delete any paper from the database
- Modify/delete other users' papers

**Action Required**: All admin operations must be validated server-side (in `/api/` endpoints)

---

### 7. **Weak Session Management** ⚠️ MEDIUM

**Location**: `main.js` isAdmin flag  
**Risk**: MEDIUM

**Problem**:

```javascript
let isAdmin = false; // ❌ In-memory only

async function doLogin() {
  // ... password verification ...
  if (res.ok && j.ok) {
    isAdmin = true; // ❌ Persists only in current session
    // Refreshing page → isAdmin = false again
  }
}
```

**Impact**:

- Session lost on page refresh
- No persistent authentication
- Users must re-login after every refresh
- Difficult to verify real admin status

**Action Required**:

```javascript
// Use HttpOnly, Secure cookies or persistent tokens
// Option 1: JWT Token (stored securely)
// Option 2: Session cookie (server-set)
// Option 3: Supabase Auth instead of password

// Implement after-login session check:
async function checkAdminStatus() {
  const token = localStorage.getItem("admin_token"); // if using tokens
  if (!token) return (isAdmin = false);

  const res = await fetch("/api/verify-admin", {
    headers: { Authorization: `Bearer ${token}` },
  });
  isAdmin = res.ok;
}
```

---

### 8. **No Rate Limiting on API Calls** ⚠️ MEDIUM

**Risk**: MEDIUM

**Problem**:

- No rate limiting on password attempts → brute force possible
- No rate limiting on file uploads → DoS possible
- No rate limiting on delete operations → data destruction possible

**Action Required**:

```javascript
// Implement rate limiting in /api/admin-login:
// - Max 5 attempts per IP per 15 minutes
// - Exponential backoff after failures

// Use middleware: npm install express-rate-limit
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, try again later",
});

app.post("/api/admin-login", loginLimiter, handler);
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **No CSRF Token Protection** ⚠️ MEDIUM

**Location**: All POST/DELETE requests  
**Problem**: Admin actions lack CSRF tokens → attackers could craft malicious forms to trick admins into deleting/modifying data

**Action Required**: Add CSRF token validation

---

### 10. **Unprotected Auto-Extract Endpoint** ⚠️ MEDIUM

**Location**: `runAutoExtract()` uses external proxy  
**Problem**:

- Downloads from `codetabs.com` proxy without verification
- Could fetch malicious PDFs
- No rate limiting on extraction

**Action Required**: Validate PDF content server-side before processing

---

### 11. **localStorage Stores Sensitive URLs** ⚠️ MEDIUM

**Location**: `main.js` line 693

```javascript
localStorage.setItem("ae_syllabus_url", syllabusUrl);
```

**Problem**: Sensitive URLs stored in localStorage, accessible to any script

**Action Required**: Use sessionStorage or remove after use

---

### 12. **No HTTPS Content-Security-Policy Header** ⚠️ MEDIUM

**Problem**: No CSP header to prevent inline script injection

**Action Required**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' fonts.googleapis.com 'unsafe-inline';
  img-src 'self' data:;
```

---

### 13. **No Input Validation on Text Fields** ⚠️ LOW-MEDIUM

**Location**: `addPaper()` function  
**Problem**:

```javascript
const subject =
  document.getElementById("f-subject").value.trim() || "Miscellaneous";
const cName = document.getElementById("f-filename").value.trim();
// ❌ No length validation, no character restrictions
```

**Action Required**:

```javascript
if (subject.length > 500 || !subject.match(/^[\w\s\-&'(),.]+$/)) {
  throw new Error("Invalid subject name");
}
```

---

## 🟢 LOW PRIORITY ISSUES

### 14. **No HTTPS Certificate Pinning**

- Consider implementing SSL certificate pinning for API calls

### 15. **No Security Headers**

- Missing: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

---

## 📋 IMMEDIATE ACTION CHECKLIST

**Do These NOW (Critical):**

- [ ] 1. Verify Supabase key type (anon vs service_role)
- [ ] 2. Enable RLS on all Supabase tables
- [ ] 3. Enable HTTPS on your hosting (Vercel should have this by default)
- [ ] 4. Implement file type validation (MIME + magic bytes)
- [ ] 5. Add server-side admin auth checks
- [ ] 6. Add rate limiting to `/api/admin-login`

**Do These SOON (High):**

- [ ] 7. Replace innerHTML with textContent for errors
- [ ] 8. Implement proper session management (JWT or cookies)
- [ ] 9. Add CSRF token protection
- [ ] 10. Add security headers (CSP, X-Frame-Options, etc.)

**Do These Later (Medium):**

- [ ] 11. Input validation on all form fields
- [ ] 12. Implement audit logging for admin actions
- [ ] 13. Add two-factor authentication for admin
- [ ] 14. Regular security scanning with npm audit

---

## 🔐 Recommended Architecture Changes

### Current (Insecure):

```
Client → Supabase API (with exposed API key)
Client → /api/admin-login (password in plaintext)
```

### Recommended (More Secure):

```
Client → /api/ (Node.js backend)
         ↓
       /api/admin-login (POST) → Session/JWT → Client
       /api/download (GET) → Stream from Supabase
       /api/delete (DELETE) → Verify auth → Supabase
       /api/upload (POST) → Validate file → Supabase
         ↓
      Supabase (with service role key, never exposed)
```

---

## ⚠️ CURRENT RISK ASSESSMENT

| Risk                    | Severity | Likelihood | Impact                     |
| ----------------------- | -------- | ---------- | -------------------------- |
| Exposed Supabase Key    | CRITICAL | HIGH       | Full DB compromise         |
| No RLS Policies         | CRITICAL | HIGH       | Data theft/destruction     |
| Plain-text Password     | CRITICAL | HIGH       | Account takeover           |
| File Upload Abuse       | HIGH     | MEDIUM     | Malware distribution       |
| XSS Vulnerabilities     | HIGH     | MEDIUM     | Session hijacking          |
| Client-side Auth Bypass | HIGH     | HIGH       | Admin privilege escalation |

---

## 🛠️ Quick Fixes (You Can Do Today)

```javascript
// Fix 1: Replace dangerous innerHTML
// BEFORE:
msg.innerHTML = `<div class="msg error">${e.message}</div>`;

// AFTER:
const errorDiv = document.createElement("div");
errorDiv.className = "msg error";
errorDiv.textContent = e.message;
msg.innerHTML = "";
msg.appendChild(errorDiv);

// Fix 2: Add file type validation
if (!file.type.startsWith("application/pdf")) {
  throw new Error("Only PDF files allowed");
}

// Fix 3: Add HTTPS requirement in main.js
if (location.protocol !== "https:" && location.hostname !== "localhost") {
  alert("⚠️ This site requires HTTPS for security. Please visit: https://...");
  location.href = "https://" + location.href.split("://")[1];
}
```

---

## 📞 Questions You Should Ask Yourself

1. **Is my Supabase key a PUBLIC "anon" key or a SECRET "service_role" key?**
   - Check: https://app.supabase.com → Settings → API → Copy-paste first 10 chars of key
   - "eyJhbGciOiJIUzI1NiIsInR5..." = anon key (relatively safe)
   - If different prefix, it might be service_role (DANGEROUS)

2. **Do I have RLS policies enabled in Supabase?**
   - Check: https://app.supabase.com → SQL Editor → Run: `SELECT * FROM information_schema.tables WHERE table_name = 'papers';`

3. **Is my site on HTTPS?**
   - If Vercel: Should be automatic (check Settings → Domains)
   - If self-hosted: Use Let's Encrypt (free SSL)

4. **Who can currently access the admin panel?**
   - Currently: Anyone who knows the password (no rate limiting)
   - Recommended: Only you (IP whitelist or 2FA)

---

**Report Status**: 🔴 NEEDS IMMEDIATE ACTION  
**Recommended**: Fix critical issues before going into production or accepting user uploads
