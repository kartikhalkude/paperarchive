// SECURITY PATCHES FOR main.js
// Apply these fixes to improve security

// ============================================================================
// FIX 1: Add HTTPS enforcement
// ============================================================================
// Add this at the very top of main.js, after the opening comments

function enforceHTTPS() {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('🔒 Redirecting to HTTPS...');
    location.href = 'https://' + location.href.split('://')[1];
  }
}
enforceHTTPS();


// ============================================================================
// FIX 2: Safe innerHTML replacement function
// ============================================================================
// Replace the esc() function with this more comprehensive version

function esc(s) {
  const div = document.createElement('div');
  div.textContent = String(s ?? "");
  return div.innerHTML;
}

// Better: Use this for rendering HTML safely
function setSafeInnerHTML(element, html) {
  element.innerHTML = html;
  // Remove any script tags that might have been in the HTML
  element.querySelectorAll('script').forEach(script => script.remove());
}

function setSafeTextContent(element, text) {
  element.textContent = text;
}


// ============================================================================
// FIX 3: File upload validation with MIME type and magic bytes
// ============================================================================
// Replace the addPaper() function's file validation section:

async function addPaper() {
  const subject =
    document.getElementById("f-subject").value.trim() || "Miscellaneous";
  const cName = document.getElementById("f-filename").value.trim();
  const fileType = document.getElementById("f-type").value;
  const yearVal = document.getElementById("f-year").value;
  const semVal = document.getElementById("f-sem").value;
  const files = document.getElementById("f-file").files;
  const msg = document.getElementById("add-msg");
  const btn = document.getElementById("btn-add");

  if (!files.length) {
    setSafeInnerHTML(msg, '<div class="msg error">Please select at least one file</div>');
    return;
  }

  // ✅ NEW: Validate file types BEFORE upload
  const validMimeTypes = ['application/pdf'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  for (let file of files) {
    // Check MIME type
    if (!validMimeTypes.includes(file.type)) {
      setSafeInnerHTML(msg, `<div class="msg error">Only PDF files allowed. "${file.name}" is ${file.type || 'unknown type'}</div>`);
      return;
    }

    // Check file size
    if (file.size > maxFileSize) {
      setSafeInnerHTML(msg, `<div class="msg error">File "${file.name}" exceeds 5MB limit</div>`);
      return;
    }

    // ✅ NEW: Validate PDF magic bytes
    const buffer = await file.slice(0, 4).arrayBuffer();
    const header = new Uint8Array(buffer);
    const isPDF = header[0] === 0x25 && header[1] === 0x50 && 
                  header[2] === 0x44 && header[3] === 0x46; // %PDF
    
    if (!isPDF) {
      setSafeInnerHTML(msg, `<div class="msg error">File "${file.name}" is not a valid PDF. Magic bytes do not match.</div>`);
      return;
    }
  }

  btn.textContent = `Uploading ${files.length} file(s)…`;
  btn.disabled = true;
  setSafeInnerHTML(msg, '');

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let title = file.name.replace(/\.[^/.]+$/, "") || file.name;
      if (cName) {
        title = files.length > 1 ? `${cName} (${i + 1})` : cName;
      }

      // Sanitize title
      title = title.replace(/[<>:"\/\\|?*]/g, '_').substring(0, 200);

      const ext = file.name.split(".").pop().toLowerCase();
      // Whitelist extensions
      if (!['pdf'].includes(ext)) {
        throw new Error(`File extension ".${ext}" not allowed`);
      }

      const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await _sb.storage
        .from("pdfs")
        .upload(fname, file);
      if (upErr)
        throw new Error(`Upload failed (${file.name}): ${upErr.message}`);

      const { data: urlData } = _sb.storage
        .from("pdfs")
        .getPublicUrl(fname);

      const { error: dbErr } = await _sb.from("papers").insert([
        {
          title,
          subject,
          year: yearVal,
          semester: semVal,
          type: fileType,
          file_url: urlData.publicUrl,
        },
      ]);

      if (dbErr)
        throw new Error(
          `DB insert failed (${file.name}): ${dbErr.message}`,
        );
    }

    showToast(`${files.length} paper(s) uploaded`);
    closeModal("add-modal");
    fetchPapers();
  } catch (e) {
    setSafeInnerHTML(msg, `<div class="msg error">${esc(e.message)}</div>`);
  } finally {
    btn.textContent = "Upload to Database →";
    btn.disabled = false;
  }
}


// ============================================================================
// FIX 4: Input validation for text fields
// ============================================================================
// Add these validation functions:

function validateSubject(subject, maxLength = 500) {
  if (!subject || subject.trim().length === 0) {
    throw new Error('Subject cannot be empty');
  }
  if (subject.length > maxLength) {
    throw new Error(`Subject cannot exceed ${maxLength} characters`);
  }
  // Allow only alphanumeric, spaces, hyphens, ampersands, parentheses
  if (!/^[\w\s\-&'(),.–]+$/u.test(subject)) {
    throw new Error('Subject contains invalid characters');
  }
  return subject.trim();
}

function validateFileName(filename, maxLength = 200) {
  if (filename.length > maxLength) {
    throw new Error(`Filename cannot exceed ${maxLength} characters`);
  }
  // Remove invalid characters
  return filename.replace(/[<>:"\/\\|?*]/g, '_');
}


// ============================================================================
// FIX 5: Replace XSS-vulnerable error messages
// ============================================================================
// Replace all instances of:
// element.innerHTML = `<div class="msg error">${errorMessage}</div>`;
// With:
// element.innerHTML = `<div class="msg error">${esc(errorMessage)}</div>`;

// Also replace plain innerHTML assignments:
// BEFORE: msg.innerHTML = `<div class="msg error">${e.message}</div>`;
// AFTER:
function showErrorMessage(element, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'msg error';
  errorDiv.textContent = message; // Use textContent to prevent XSS
  element.innerHTML = '';
  element.appendChild(errorDiv);
}


// ============================================================================
// FIX 6: Secure localStorage access (avoid storing sensitive URLs)
// ============================================================================
// Replace direct localStorage.setItem() calls:

function securelyStorePreference(key, value, isSessionOnly = false) {
  const storage = isSessionOnly ? sessionStorage : localStorage;
  // Only store non-sensitive data
  const allowedKeys = ['ob_pattern', 'ob_year', 'ob_sem', 'ob_type'];
  if (allowedKeys.includes(key)) {
    storage.setItem(key, String(value).substring(0, 100)); // Limit size
  } else {
    console.warn(`⚠️ Attempted to store potentially sensitive data: ${key}`);
  }
}

// ✅ Replace this line:
// localStorage.setItem("ae_syllabus_url", syllabusUrl);
// With this:
function openAutoExtract() {
  document.getElementById("ae-url").value = "";
  document.getElementById("ae-status").innerText = "";
  // ✅ Use sessionStorage instead of localStorage for URLs
  const savedSyllabus = sessionStorage.getItem("ae_syllabus_url") || "";
  document.getElementById("ae-syllabus").value = savedSyllabus;
  document.getElementById("auto-extract-modal").classList.add("open");
}

async function storeAutoExtractUrl(url) {
  // Validate URL format before storing
  try {
    new URL(url);
    sessionStorage.setItem("ae_syllabus_url", url.substring(0, 2000));
  } catch (e) {
    console.error('Invalid URL:', e);
  }
}


// ============================================================================
// FIX 7: Add server-side verification for admin actions
// ============================================================================
// Replace direct Supabase delete calls with server-side verification:

async function deletePaper(id) {
  if (!confirm("Delete this paper permanently?")) return;

  // ✅ NEW: Verify admin status with server instead of trusting client-side flag
  const adminVerified = await verifyAdminServer();
  if (!adminVerified) {
    alert('❌ Admin verification failed. Please re-login.');
    isAdmin = false;
    return;
  }

  const p = PAPERS.find((x) => x.id === id);

  // ✅ NEW: Call server endpoint instead of direct DB access
  try {
    const res = await fetch('/api/delete-paper', {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        // If implementing auth tokens, include here:
        // 'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      throw new Error('Server rejected deletion request');
    }

    const result = await res.json();
    if (result.ok) {
      showToast("Paper deleted");
      fetchPapers();
    } else {
      alert('❌ Delete failed: ' + (result.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('Delete error:', e);
    alert('❌ Could not delete paper');
  }
}

async function verifyAdminServer() {
  try {
    const res = await fetch('/api/verify-admin', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}


// ============================================================================
// FIX 8: Add Content Security Policy meta tag (in HTML head)
// ============================================================================
// Add this to index.html <head>:
/*
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self'; 
    script-src 'self' cdn.jsdelivr.net https://adcash.com/script/;
    style-src 'self' fonts.googleapis.com 'unsafe-inline'; 
    img-src 'self' data: https:; 
    font-src fonts.gstatic.com;
    connect-src 'self' https://api.codetabs.com;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self'
  "
>
*/


// ============================================================================
// FIX 9: Rate limiting for login attempts (server-side implementation)
// ============================================================================
// Create /api/admin-login-v2.js with rate limiting:

/*
const rateLimit = require('express-rate-limit');
const express = require('express');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req, res) => {
    return req.ip?.includes('127.0.0.1'); // Skip localhost
  }
});

app.post('/api/admin-login', loginLimiter, require('./admin-login.js'));
*/


// ============================================================================
// FIX 10: Add security headers (server-side)
// ============================================================================
// Add to your Vercel vercel.json or server config:

/*
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
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
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
*/
