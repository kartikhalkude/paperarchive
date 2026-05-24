// ══════════════════════════════════════════════
      // CONFIGURATION — Loaded from .env via Vite
      // ══════════════════════════════════════════════
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

      const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

      let PAPERS = [];
      let isAdmin = false;
      let activeYear = "All";
      const YEARS = ["All", "SE", "TE", "BE"];
      let activeType = "All";
      const TYPES = ["All", "Paper", "Study Material"];

      const SYLLABUS_MAP = {
        DISCRETE_MATHEMATICS: {
          year: "SE",
          sem: "3",
          canonicalName: "Discrete Mathematics",
        },
        LOGIC_DESIGN_AND_COMPUTER_ORGANIZATION: {
          year: "SE",
          sem: "3",
          canonicalName: "Logic Design and Computer Organization",
        },
        LOGIC_DESIGN_AND_COMPUTER_ARCHITECTURE: {
          year: "SE",
          sem: "3",
          canonicalName: "Logic Design and Computer Organization",
        },
        DATA_STRUCTURES_AND_ALGORITHMS: {
          year: "SE",
          sem: "3",
          canonicalName: "Data Structures and Algorithms",
        },
        OBJECT_ORIENTED_PROGRAMMING: {
          year: "SE",
          sem: "3",
          canonicalName: "Object Oriented Programming",
        },
        BASICS_OF_COMPUTER_NETWORK: {
          year: "SE",
          sem: "3",
          canonicalName: "Basics of Computer Network",
        },
        ENGINEERING_MATHEMATICS_III: {
          year: "SE",
          sem: "4",
          canonicalName: "Engineering Mathematics - III",
        },
        ENGINEERING_MATHEMATICS_3: {
          year: "SE",
          sem: "4",
          canonicalName: "Engineering Mathematics - III",
        },
        PROCESSOR_ARCHITECTURE: {
          year: "SE",
          sem: "4",
          canonicalName: "Processor Architecture",
        },
        PROCESSOR_ARCHITECTURE_AND_INTERFACING: {
          year: "SE",
          sem: "4",
          canonicalName: "Processor Architecture and Interfacing",
        },
        DATABASE_MANAGEMENT_SYSTEM: {
          year: "SE",
          sem: "4",
          canonicalName: "Database Management System",
        },
        DATABASE_MANAGEMENT_SYSTEMS: {
          year: "SE",
          sem: "4",
          canonicalName: "Database Management System",
        },
        COMPUTER_GRAPHICS: {
          year: "SE",
          sem: "4",
          canonicalName: "Computer Graphics",
        },
        SOFTWARE_ENGINEERING: {
          year: "SE",
          sem: "4",
          canonicalName: "Software Engineering",
        },
        THEORY_OF_COMPUTATION: {
          year: "TE",
          sem: "5",
          canonicalName: "Theory of Computation",
        },
        OPERATING_SYSTEM: {
          year: "TE",
          sem: "5",
          canonicalName: "Operating System",
        },
        OPERATING_SYSTEMS: {
          year: "TE",
          sem: "5",
          canonicalName: "Operating System",
        },
        MACHINE_LEARNING: {
          year: "TE",
          sem: "5",
          canonicalName: "Machine Learning",
        },
        HUMAN_COMPUTER_INTERACTION: {
          year: "TE",
          sem: "5",
          canonicalName: "Human Computer Interaction",
        },
        DESIGN_AND_ANALYSIS_OF_ALGORITHMS: {
          year: "TE",
          sem: "5",
          canonicalName: "Design and Analysis of Algorithms",
        },
        COMPUTER_NETWORK_AND_SECURITY: {
          year: "TE",
          sem: "6",
          canonicalName: "Computer Network and Security",
        },
        COMPUTER_NETWORKS_AND_SECURITY: {
          year: "TE",
          sem: "6",
          canonicalName: "Computer Network and Security",
        },
        DATA_SCIENCE_AND_BIG_DATA_ANALYTICS: {
          year: "TE",
          sem: "6",
          canonicalName: "Data Science and Big Data Analytics",
        },
        DATA_SCIENCE_AND_BIG_DATA_ANALYSIS: {
          year: "TE",
          sem: "6",
          canonicalName: "Data Science and Big Data Analytics",
        },
        WEB_APPLICATION_DEVELOPMENT: {
          year: "TE",
          sem: "6",
          canonicalName: "Web Application Development",
        },
        INFORMATION_AND_STORAGE_RETRIEVAL: {
          year: "BE",
          sem: "7",
          canonicalName: "Information Storage and Retrieval",
        },
        INFORMATION_STORAGE_AND_RETRIEVAL: {
          year: "BE",
          sem: "7",
          canonicalName: "Information Storage and Retrieval",
        },
        SOFTWARE_PROJECT_MANAGEMENT: {
          year: "BE",
          sem: "7",
          canonicalName: "Software Project Management",
        },
        DEEP_LEARNING: { year: "BE", sem: "7", canonicalName: "Deep Learning" },
        MOBILE_COMPUTING: {
          year: "BE",
          sem: "7",
          canonicalName: "Mobile Computing",
        },
        HIGH_PERFORMANCE_COMPUTING: {
          year: "BE",
          sem: "7",
          canonicalName: "High Performance Computing",
        },
        DISTRIBUTED_SYSTEMS: {
          year: "BE",
          sem: "8",
          canonicalName: "Distributed Systems",
        },
        DISTRIBUTED_SYSTEM: {
          year: "BE",
          sem: "8",
          canonicalName: "Distributed Systems",
        },
        STARTUP_AND_ECOSYSTEM: {
          year: "BE",
          sem: "8",
          canonicalName: "Startup and Ecosystem",
        },
      };

      // ── INIT ──
      document.addEventListener("DOMContentLoaded", () => {
        buildFilters();
        fetchPapers();
      });

      // ── FETCH ──
      async function fetchPapers() {
        const main = document.getElementById("main-content");
        main.innerHTML = '<div class="empty"><p>Loading…</p></div>';

        const { data, error } = await _sb
          .from("papers")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          main.innerHTML = `<div class="empty">
      <div class="empty-glyph">⚠</div>
      <p>Database error — check Supabase config</p>
    </div>`;
          console.error(error);
          return;
        }

        PAPERS = data || [];
        renderPapers();
      }

      // ── FILTERS ──
      function buildFilters() {
        document.getElementById("year-filters").innerHTML = YEARS.map(
          (y) =>
            `<button class="filter-tab ${y === activeYear ? "active" : ""}" onclick="setFilter('${y}')">${y}</button>`,
        ).join("");
        document.getElementById("type-filters").innerHTML = TYPES.map(
          (t) =>
            `<button class="filter-tab ${t === activeType ? "active" : ""}" onclick="setTypeFilter('${t}')">${t}</button>`,
        ).join("");
      }

      function setFilter(val) {
        activeYear = val;
        buildFilters();
        renderPapers();
      }

      function setTypeFilter(val) {
        activeType = val;
        buildFilters();
        renderPapers();
      }

      // ── RENDER ──
      function renderPapers() {
        const q = document.getElementById("search-input").value.toLowerCase();

        const filtered = PAPERS.filter((p) => {
          if (activeYear !== "All" && p.year !== activeYear) return false;
          if (activeType !== "All" && (p.type || "Paper") !== activeType)
            return false;
          if (
            q &&
            !`${p.title} ${p.subject} ${p.year} ${p.type || "Paper"}`
              .toLowerCase()
              .includes(q)
          )
            return false;
          return true;
        });

        document.getElementById("total-count").textContent =
          PAPERS.length + " papers";
        document.getElementById("results-count").textContent =
          filtered.length + " shown";

        const main = document.getElementById("main-content");

        if (!filtered.length) {
          main.innerHTML = `<div class="empty">
      <div class="empty-glyph">∅</div>
      <p>No papers found</p>
    </div>`;
          return;
        }

        // Group by subject
        const groups = {};
        filtered.forEach((p) => {
          const k = p.subject || "Miscellaneous";
          if (!groups[k]) groups[k] = [];
          groups[k].push(p);
        });

        let html = "";
        Object.keys(groups)
          .sort()
          .forEach((subj) => {
            const papers = groups[subj];
            html += `<div class="subject-section">
      <div class="subject-header">
        <span class="subject-name">${esc(subj)}</span>
        <span class="subject-tally">${papers.length} paper${papers.length > 1 ? "s" : ""}</span>
      </div>
      <div class="paper-list">
        ${papers.map((p) => rowHTML(p)).join("")}
      </div>
    </div>`;
          });

        main.innerHTML = html;
      }

      function rowHTML(p) {
        const fileLink = p.file_data || p.file_url || "#";
        const docType = p.type || "Paper";
        return `<div class="paper-row">
    <div class="paper-info">
      <span class="paper-year-badge">${esc(p.year)}</span>
      ${p.semester ? `<span class="paper-year-badge">Sem ${esc(p.semester)}</span>` : ""}
      <span class="paper-year-badge" style="border-style:dashed; color:var(--text);">${esc(docType)}</span>
      <span class="paper-title" title="${esc(p.title)}">${esc(p.title)}</span>
    </div>
    <div class="paper-actions">
      ${isAdmin ? `<span id="view-count-${p.id}" style="font-size:10px; color:var(--muted); margin-right:8px;" title="Total Views & Downloads">👁 ${p.views || 0}</span>` : ""}
      <a class="btn-action btn-view-sm" onclick="viewFile('${p.id}')" style="cursor:pointer">View</a>
      <a class="btn-action btn-dl" href="${fileLink}" download="${esc(p.title)}" title="Download" onclick="incrementViews('${p.id}')">↓</a>
      <button class="btn-del-row" onclick="deletePaper('${p.id}')" title="Delete">Delete</button>
    </div>
  </div>`;
      }

      function incrementViews(id) {
        const p = PAPERS.find((x) => x.id === id);
        if (!p) return;
        p.views = (p.views || 0) + 1;
        _sb
          .from("papers")
          .update({ views: p.views })
          .eq("id", id)
          .then(() => {
            if (isAdmin) {
              const sp = document.getElementById("view-count-" + id);
              if (sp) sp.textContent = "👁 " + p.views;
              else renderPapers();
            }
          });
      }

      function viewFile(id) {
        const p = PAPERS.find((x) => x.id === id);
        if (!p) return;
        const fileLink = p.file_data || p.file_url;
        if (!fileLink) return;

        incrementViews(id);

        if (!fileLink.startsWith("data:")) {
          window.open(fileLink, "_blank");
          return;
        }

        try {
          const arr = fileLink.split(",");
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");

          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (e) {
          console.error("Error viewing file", e);
          alert("Could not view file.");
        }
      }

      function esc(s) {
        return String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      // ── ADMIN ──
      function openAdmin() {
        if (isAdmin) {
          showToast("Already in admin mode");
          return;
        }
        document.getElementById("admin-pass").value = "";
        document.getElementById("login-msg").innerHTML = "";
        document.getElementById("login-modal").classList.add("open");
        setTimeout(() => document.getElementById("admin-pass").focus(), 100);
      }

      async function doLogin() {
        const pass = document.getElementById("admin-pass").value;
        document.getElementById("login-msg").innerHTML = "";
        try {
          const res = await fetch("/api/admin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pass }),
          });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j.ok) {
            isAdmin = true;
            document.body.classList.add("admin-mode");
            document.getElementById("admin-banner").classList.add("show");
            closeModal("login-modal");
            showToast("Admin mode active");
            renderPapers();
          } else {
            document.getElementById("login-msg").innerHTML =
              '<div class="msg error">Incorrect password</div>';
          }
        } catch (e) {
          console.error("Login error", e);
          document.getElementById("login-msg").innerHTML =
            '<div class="msg error">Login failed — try again</div>';
        }
      }

      function logoutAdmin() {
        isAdmin = false;
        document.body.classList.remove("admin-mode");
        document.getElementById("admin-banner").classList.remove("show");
        showToast("Logged out");
      }

      function openAddPaper() {
        document.getElementById("f-subject").value = "";
        document.getElementById("f-filename").value = "";
        document.getElementById("f-type").value = "Paper";
        document.getElementById("f-year").value = "SE";
        document.getElementById("f-sem").value = "3";
        document.getElementById("f-file").value = "";
        document.getElementById("drop-text").innerHTML =
          "Click or drag files here";
        document.getElementById("add-msg").innerHTML = "";
        document.getElementById("add-modal").classList.add("open");
      }

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
          msg.innerHTML =
            '<div class="msg error">Please select at least one file</div>';
          return;
        }

        btn.textContent = `Uploading ${files.length} file(s)…`;
        btn.disabled = true;
        msg.innerHTML = "";

        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let title = file.name.replace(/\.[^/.]+$/, "") || file.name;
            if (cName) {
              title = files.length > 1 ? `${cName} (${i + 1})` : cName;
            }

            if (file.size > 5 * 1024 * 1024) {
              throw new Error(
                `Upload failed: "${file.name}" is larger than 5MB. Please compress it first.`,
              );
            }

            const ext = file.name.split(".").pop();
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
          msg.innerHTML = `<div class="msg error">${e.message}</div>`;
        } finally {
          btn.textContent = "Upload to Database →";
          btn.disabled = false;
        }
      }

      function openAutoExtract() {
        document.getElementById("ae-url").value = "";
        document.getElementById("ae-status").innerText = "";
        const savedSyllabus = localStorage.getItem("ae_syllabus_url") || "";
        document.getElementById("ae-syllabus").value = savedSyllabus;
        document.getElementById("auto-extract-modal").classList.add("open");
      }

      async function runAutoExtract() {
        const url = document.getElementById("ae-url").value.trim();
        if (!url) return alert("Please enter a valid PDF URL.");

        const yearVal = document.getElementById("ae-year").value;
        const semVal = document.getElementById("ae-sem").value;
        const btn = document.getElementById("btn-ae");
        const status = document.getElementById("ae-status");

        btn.disabled = true;
        status.innerText = "Downloading PDF (via proxy)...";

        try {
          // ── DYNAMIC SYLLABUS SCANNING ──
          const syllabusUrl = document
            .getElementById("ae-syllabus")
            .value.trim();
          if (syllabusUrl) {
            status.innerText = "Downloading syllabus (via proxy)...";
            try {
              localStorage.setItem("ae_syllabus_url", syllabusUrl);
              const sProxyUrl =
                "https://api.codetabs.com/v1/proxy/?quest=" +
                encodeURIComponent(syllabusUrl);
              const sRes = await fetch(sProxyUrl);
              if (sRes.ok) {
                const sBuffer = await sRes.arrayBuffer();
                status.innerText = "Parsing syllabus content...";
                const sPdf = await pdfjsLib.getDocument({ data: sBuffer })
                  .promise;

                for (let pageNum = 1; pageNum <= sPdf.numPages; pageNum++) {
                  const sPage = await sPdf.getPage(pageNum);
                  const sTextContent = await sPage.getTextContent();
                  const sLines = sTextContent.items.map((t) => t.str);

                  for (let lineIdx = 0; lineIdx < sLines.length; lineIdx++) {
                    const line = sLines[lineIdx];
                    const codeMatch = line.match(/\b([234])14([45])\d{2}\b/);
                    if (codeMatch) {
                      const code = codeMatch[0];
                      const yearDigit = codeMatch[1];
                      const semDigit = codeMatch[2];

                      let year = "BE";
                      if (yearDigit === "2") year = "SE";
                      if (yearDigit === "3") year = "TE";

                      let sem = "7";
                      if (yearDigit === "2" && semDigit === "4") sem = "3";
                      if (yearDigit === "2" && semDigit === "5") sem = "4";
                      if (yearDigit === "3" && semDigit === "4") sem = "5";
                      if (yearDigit === "3" && semDigit === "5") sem = "6";
                      if (yearDigit === "4" && semDigit === "4") sem = "7";
                      if (yearDigit === "4" && semDigit === "5") sem = "8";

                      let subjectName = "";
                      let cleanLine = line
                        .replace(code, "")
                        .replace(/[:\-\(\)\d]/g, "")
                        .trim();
                      if (
                        cleanLine.length > 5 &&
                        !cleanLine.toUpperCase().includes("LAB") &&
                        !cleanLine.toUpperCase().includes("PRACTICAL")
                      ) {
                        subjectName = cleanLine;
                      } else if (lineIdx + 1 < sLines.length) {
                        let nextLine = sLines[lineIdx + 1]
                          .replace(/[:\-\(\)\d]/g, "")
                          .trim();
                        if (
                          nextLine.length > 5 &&
                          !nextLine.toUpperCase().includes("LAB") &&
                          !nextLine.toUpperCase().includes("PRACTICAL")
                        ) {
                          subjectName = nextLine;
                        }
                      }

                      if (subjectName) {
                        const key = subjectName
                          .toUpperCase()
                          .replace(/\s+/g, "_");
                        const cleanName = subjectName
                          .toLowerCase()
                          .split(/\s+/)
                          .map((w) => {
                            if (
                              [
                                "and",
                                "of",
                                "the",
                                "in",
                                "on",
                                "for",
                                "to",
                                "with",
                              ].includes(w)
                            )
                              return w;
                            return w.charAt(0).toUpperCase() + w.slice(1);
                          })
                          .join(" ");
                        SYLLABUS_MAP[key] = {
                          year,
                          sem,
                          canonicalName: cleanName,
                        };
                      }
                    }
                  }
                }
                console.log("Dynamically loaded syllabus map:", SYLLABUS_MAP);
              }
            } catch (se) {
              console.error("Error parsing syllabus:", se);
            }
          }

          const proxyUrl =
            "https://api.codetabs.com/v1/proxy/?quest=" +
            encodeURIComponent(url);
          const res = await fetch(proxyUrl);
          if (!res.ok)
            throw new Error(
              "Fetch failed. The proxy might be blocked or URL is invalid.",
            );

          const buffer = await res.arrayBuffer();
          const bufferForPdfLib = buffer.slice(0);

          status.innerText = "Parsing text content...";
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          const totalPages = pdf.numPages;

          let urlPapers = [];
          let currentPaper = null;
          let sessionStr = "";
          const decodedUrl = decodeURIComponent(url);
          const sessionMatch = decodedUrl.match(
            /(OCTOBER|APRIL|MAY|NOV|DEC)[a-z]*\s*\d{4}/i,
          );
          if (sessionMatch)
            sessionStr = sessionMatch[0].replace(/\s+/g, "_").toUpperCase();

          for (let i = 1; i <= totalPages; i++) {
            if (i % 5 === 0)
              status.innerText = `Scanning page ${i}/${totalPages}...`;

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const rawText = textContent.items.map((t) => t.str).join(" ");
            const textWithLines = textContent.items
              .map((t) => t.str)
              .join("\n");
            const noSpaceText = rawText.toLowerCase().replace(/\s/g, "");

            const codeMatch = rawText.match(/\[\d+\]\s*-\s*\d+/);
            const paperCode = codeMatch
              ? codeMatch[0].replace(/\s/g, "")
              : null;

            if (
              noSpaceText.includes("informationtechnology") ||
              noSpaceText.includes("infotech")
            ) {
              let subject = "Unknown_Subject";
              const subjMatch = textWithLines.match(
                /Information\s*Technology\)?\s*[\r\n]+([A-Z][A-Z\s\&\-\/]+[A-Z])/i,
              );
              if (subjMatch && subjMatch[1].trim().length > 3) {
                subject = subjMatch[1].trim().replace(/\s+/g, "_");
              } else if (paperCode) {
                subject = "Paper_" + paperCode;
              }

              let dynYear = null;
              if (rawText.match(/\bB\.?E\.?\b/i)) dynYear = "BE";
              else if (rawText.match(/\bT\.?E\.?\b/i)) dynYear = "TE";
              else if (rawText.match(/\bS\.?E\.?\b/i)) dynYear = "SE";

              let dynSem = null;
              const semMatchText =
                rawText.match(
                  /Semester\s*-\s*(I{1,3}|IV|V|VI|VII|VIII|1|2|3|4|5|6|7|8)\b/i,
                ) ||
                rawText.match(
                  /Sem-\s*(I{1,3}|IV|V|VI|VII|VIII|1|2|3|4|5|6|7|8)\b/i,
                );
              if (semMatchText) {
                let semNumStr = semMatchText[1].toUpperCase();
                if (["1", "I"].includes(semNumStr)) {
                  if (dynYear === "SE") dynSem = "3";
                  if (dynYear === "TE") dynSem = "5";
                  if (dynYear === "BE") dynSem = "7";
                } else if (["2", "II"].includes(semNumStr)) {
                  if (dynYear === "SE") dynSem = "4";
                  if (dynYear === "TE") dynSem = "6";
                  if (dynYear === "BE") dynSem = "8";
                } else if (["3", "III"].includes(semNumStr)) dynSem = "3";
                else if (["4", "IV"].includes(semNumStr)) dynSem = "4";
                else if (["5", "V"].includes(semNumStr)) dynSem = "5";
                else if (["6", "VI"].includes(semNumStr)) dynSem = "6";
                else if (["7", "VII"].includes(semNumStr)) dynSem = "7";
                else if (["8", "VIII"].includes(semNumStr)) dynSem = "8";
              }

              // Look up subject in the syllabus map to dynamically override year and semester
              const normalizedSubjectStr = subject
                .toUpperCase()
                .replace(/[^A-Z]/g, "");
              const syllabusKey = Object.keys(SYLLABUS_MAP).find(
                (k) => k.replace(/[^A-Z]/g, "") === normalizedSubjectStr,
              );

              let canonicalSubject = null;
              if (syllabusKey) {
                dynYear = SYLLABUS_MAP[syllabusKey].year;
                dynSem = SYLLABUS_MAP[syllabusKey].sem;
                canonicalSubject =
                  SYLLABUS_MAP[syllabusKey].canonicalName ||
                  syllabusKey.replace(/_/g, " ");
              }

              let subjectCode = null;
              const subCodeMatch = rawText.match(/\((\d{5,6}[A-Z]?)\)/);
              if (subCodeMatch) subjectCode = subCodeMatch[1];

              let pName = subject;
              if (sessionStr) pName += `_${sessionStr}`;
              pName = pName.replace(/_+/g, "_").replace(/_$/, "");

              currentPaper = {
                name: pName,
                code: paperCode,
                subjectCode,
                dynYear,
                dynSem,
                canonicalSubject,
                pages: [i],
                keepNext: 0,
              };
              urlPapers.push(currentPaper);

              const pMatch =
                noSpaceText.match(/totalnoofpages:(\d+)/) ||
                rawText.match(/Total\s*No\.\s*of\s*Pages\s*:\s*(\d+)/i);
              currentPaper.keepNext = pMatch ? parseInt(pMatch[1]) - 1 : 0;
            } else if (currentPaper && currentPaper.keepNext > 0) {
              currentPaper.pages.push(i);
              currentPaper.keepNext--;
            } else if (
              currentPaper &&
              currentPaper.code &&
              paperCode === currentPaper.code
            ) {
              currentPaper.pages.push(i);
            } else {
              currentPaper = null;
            }
          }

          if (urlPapers.length === 0)
            throw new Error("No IT papers found in this PDF.");

          status.innerText = `Found ${urlPapers.length} papers. Creating PDFs...`;

          const { PDFDocument } = PDFLib;
          const srcDoc = await PDFDocument.load(bufferForPdfLib);

          let successCount = 0;
          for (let p of urlPapers) {
            // Check if paper already exists (case-insensitive title check)
            status.innerText = `Checking duplicate for ${p.name}...`;
            const { data: existing, error: checkErr } = await _sb
              .from("papers")
              .select("id")
              .ilike("title", p.name)
              .limit(1);

            if (existing && existing.length > 0) {
              console.log(`Skipping duplicate paper: ${p.name}`);
              successCount++; // Count it as processed/success to avoid confusing the user
              continue;
            }

            status.innerText = `Extracting ${p.name}...`;
            const newDoc = await PDFDocument.create();
            const indices = p.pages.map((n) => n - 1).sort((a, b) => a - b);
            const copied = await newDoc.copyPages(srcDoc, indices);
            copied.forEach((page) => newDoc.addPage(page));
            const pdfBytes = await newDoc.save();

            const file = new File([pdfBytes], p.name + ".pdf", {
              type: "application/pdf",
            });

            status.innerText = `Uploading ${p.name}...`;

            const fname = `${p.name}.pdf`;

            const { error: upErr } = await _sb.storage
              .from("pdfs")
              .upload(fname, file);
            if (upErr) {
              console.error("Upload error:", upErr);
              continue;
            }

            const { data: urlData } = _sb.storage
              .from("pdfs")
              .getPublicUrl(fname);

            // Use heuristic subject as the subject column
            const finalSubject = p.name.includes("_")
              ? p.name.split("_").slice(0, -2).join(" ")
              : p.name;

            // Normalize extracted subject to Title Case to prevent duplicate casing groups (e.g. UPPERCASE vs Title Case)
            const ignored = [
              "AND",
              "OF",
              "THE",
              "IN",
              "ON",
              "FOR",
              "TO",
              "WITH",
            ];
            let cleanSubject = p.canonicalSubject;

            if (!cleanSubject) {
              cleanSubject = finalSubject
                .replace(/_/g, " ")
                .toLowerCase()
                .split(/\s+/)
                .map((w) => {
                  if (ignored.map((x) => x.toLowerCase()).includes(w)) return w;
                  return w.charAt(0).toUpperCase() + w.slice(1);
                })
                .join(" ");
            }

            let acronym = cleanSubject
              .toUpperCase()
              .split(/\s+/)
              .filter((w) => !ignored.includes(w) && w.length > 0)
              .map((w) => w[0])
              .join("");
            let formattedSubject = acronym
              ? `${acronym} - ${cleanSubject}`
              : cleanSubject;

            const finalYear = p.dynYear || yearVal || "All";
            const finalSem = p.dynSem || semVal || "";

            const { error: dbErr } = await _sb.from("papers").insert([
              {
                title: p.name,
                subject: formattedSubject,
                year: finalYear,
                semester: finalSem,
                type: "Paper",
                file_url: urlData.publicUrl,
              },
            ]);

            if (!dbErr) successCount++;
          }

          status.innerText = `Done! Successfully extracted & uploaded ${successCount} papers!`;
          showToast(`${successCount} paper(s) auto-uploaded`);
          setTimeout(() => closeModal("auto-extract-modal"), 2500);
          fetchPapers();
        } catch (err) {
          console.error(err);
          status.innerText = "Error: " + err.message;
        } finally {
          btn.disabled = false;
        }
      }

      async function deletePaper(id) {
        if (!confirm("Delete this paper permanently?")) return;

        const p = PAPERS.find((x) => x.id === id);

        const { error } = await _sb.from("papers").delete().eq("id", id);
        if (error) {
          showToast("Delete failed");
          return;
        }

        if (p && p.file_url) {
          try {
            const fname = new URL(p.file_url).pathname.split("/").pop();
            await _sb.storage.from("pdfs").remove([fname]);
          } catch (e) {
            console.warn("Storage delete failed", e);
          }
        }

        showToast("Paper deleted");
        fetchPapers();
      }

      // ── HELPERS ──
      function closeModal(id) {
        document.getElementById(id).classList.remove("open");
      }

      document.querySelectorAll(".overlay").forEach((o) => {
        o.addEventListener("click", (e) => {
          if (e.target === o) o.classList.remove("open");
        });
      });

      let _toastTimer;
      function showToast(m) {
        const t = document.getElementById("toast");
        t.textContent = m;
        t.classList.add("show");
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
      }

      // Expose functions globally for HTML inline handlers since this is a module now
      Object.assign(window, {
        openAdmin,
        doLogin,
        logoutAdmin,
        openAddPaper,
        addPaper,
        openAutoExtract,
        runAutoExtract,
        closeModal,
        setFilter,
        setTypeFilter,
        deletePaper,
        viewFile,
        renderPapers,
        incrementViews,
      });
    
// Ads auto-load sidebars
 (no consent required)

      function loadSideAds() {
        const adUrl = createAdDataUrl();
        const left = document.getElementById("ad-left");
        const right = document.getElementById("ad-right");
        if (left) left.style.display = "flex";
        if (right) right.style.display = "flex";

        if (left && !document.getElementById("ads-left-iframe")) {
          const f = document.createElement("iframe");
          f.id = "ads-left-iframe";
          f.src = adUrl;
          f.style.border = "0";
          f.style.width = "100%";
          f.style.height = "100%";
          f.setAttribute("loading", "lazy");
          left.querySelector(".ad-box").appendChild(f);
        }
        if (right && !document.getElementById("ads-right-iframe")) {
          const f = document.createElement("iframe");
          f.id = "ads-right-iframe";
          f.src = adUrl;
          f.style.border = "0";
          f.style.width = "100%";
          f.style.height = "100%";
          f.setAttribute("loading", "lazy");
          right.querySelector(".ad-box").appendChild(f);
        }
      }

      function unloadSideAds() {
        const lfr = document.getElementById("ads-left-iframe");
        if (lfr) lfr.remove();
        const rfr = document.getElementById("ads-right-iframe");
        if (rfr) rfr.remove();
        const left = document.getElementById("ad-left");
        if (left) left.style.display = "none";
        const right = document.getElementById("ad-right");
        if (right) right.style.display = "none";
      }

      function createAdDataUrl() {
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:system-ui}</style></head><body><script src="https://adcash.com/script/showAds.js"><\/script></body></html>`;
        return "data:text/html;charset=utf-8," + encodeURIComponent(html);
      }

      document.addEventListener("DOMContentLoaded", () => {
        // Auto-load side ads immediately (no consent)
        try {
          loadSideAds();
        } catch (e) {
          console.error("Ad load failed", e);
        }
      });