// static/js/code.js

document.addEventListener("DOMContentLoaded", () => {
  // Forms
  const searchForm = document.getElementById("searchCodeForm");
  const generateForm = document.getElementById("generateCodeForm");

  // Search inputs
  const searchInput = searchForm.querySelector("input[name='searchInput']");
  const searchByCode = document.getElementById("searchByCode");
  const searchByBatch = document.getElementById("searchByBatch");
  const searchResults = document.getElementById("searchResults");

  // Generate inputs
  const codeCountInput = generateForm.querySelector("input[name='genCodeCount']");

  // Summary fields
  const totalCodesEl = document.getElementById("totalCodes");
  const availableCodesEl = document.getElementById("availableCodes");
  const usedCodesEl = document.getElementById("usedCodes");

  // Back-to-top
  const backToTopBtn = document.getElementById("backToTopBtn");

  // Hidden timezone input
  setTimeZoneHiddenInput();

  // Load summary on page load
  loadCodeSummary();

  // Enter key triggers search (nice UX)
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchCodes();
    }
  });

  /* =====================
     EXPOSE GLOBAL FUNCTIONS
     (because HTML uses onclick/onload)
  ====================== */

  window.getTimeZone = function () {
    setTimeZoneHiddenInput();
  };

  window.searchCodes = async function () {
    clearSearchResults();
    const payload = collectSearchPayload();

    /* =====================
       FRONTEND VALIDATION
    ====================== */
    const error = validateSearch(payload);
    if (error) {
      renderSearchError(error);
      return;
    }

    renderSearchLoading();

    try {
      const response = await fetch("/codes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        renderSearchError(data.message || "Search failed");
        return;
      }

      renderSearchResults(data, payload.searchType);
    } catch (err) {
      renderSearchError("Server unavailable. Please try again.");
    }
  };

  window.resetSearchForm = function () {
    searchForm.reset();
    searchByCode.checked = true;
    clearSearchResults();
  };

  window.confirmGenerateCodes = async function () {
    const payload = collectGeneratePayload();

    /* =====================
       FRONTEND VALIDATION
    ====================== */
    const error = validateGenerate(payload);
    if (error) {
      alert(error);
      return;
    }

    const ok = window.confirm(`Generate ${payload.count} codes?`);
    if (!ok) return;

    // button loading state (best-effort: find the button by its label action)
    const btn = generateForm.querySelector("button.btn.btn-primary");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Generating...`;
    }

    try {
      const response = await fetch("/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || "Code generation failed");
        return;
      }

      // success
      alert(data.message || "Codes generated successfully");
      resetGenerateForm();
      loadCodeSummary();
    } catch (err) {
      alert("Server unavailable. Please try again.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-barcode me-1"></i> Generate Codes`;
      }
    }
  };

  window.resetGenerateForm = function () {
    resetGenerateForm();
  };

  window.logoutUser = async function () {
    // Adjust endpoint if needed
    try {
      await fetch("/logout", { method: "POST" });
    } catch (_) {
      // ignore network errors; still redirect
    } finally {
      window.location.href = "/login";
    }
  };

  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =====================
     BACK TO TOP VISIBILITY
  ====================== */
  window.addEventListener("scroll", () => {
    if (!backToTopBtn) return;
    backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
  });

  /* =====================
     HELPER FUNCTIONS
  ====================== */

  function collectSearchPayload() {
    const type = searchByBatch.checked ? "batch" : "code";
    return {
      searchType: type,
      query: searchInput.value.trim(),
      timezone: getTimezone()
    };
  }

  function validateSearch(p) {
    if (!p.query) return "Please enter a code or batch number.";

    if (p.searchType === "code") {
      // codes often include letters/numbers; keep flexible but avoid very short
      if (p.query.length < 4) return "Code looks too short.";
    } else {
      // batch may be like BATCH-2026-001 etc.
      if (p.query.length < 3) return "Batch number looks too short.";
    }
    return null;
  }

  function collectGeneratePayload() {
    return {
      count: Number(codeCountInput.value),
      timezone: getTimezone()
    };
  }

  function validateGenerate(p) {
    if (!p.count || Number.isNaN(p.count)) return "Please enter number of codes.";
    if (p.count < 1) return "Number of codes must be at least 1.";
    if (p.count > 200000) return "Too many codes at once. Please generate in smaller batches.";
    return null;
  }

  async function loadCodeSummary() {
    try {
      const response = await fetch("/codes/summary", { method: "GET" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) return;

      // expected keys: total, available, used
      if (typeof data.total !== "undefined") totalCodesEl.textContent = data.total;
      if (typeof data.available !== "undefined") availableCodesEl.textContent = data.available;
      if (typeof data.used !== "undefined") usedCodesEl.textContent = data.used;
    } catch (_) {
      // fail silently
    }
  }

  function renderSearchLoading() {
    searchResults.innerHTML = `
      <div class="alert alert-info mb-0">
        <i class="fas fa-spinner fa-spin me-1"></i> Searching...
      </div>
    `;
  }

  function renderSearchError(message) {
    searchResults.innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="fas fa-circle-exclamation me-1"></i> ${escapeHtml(message)}
      </div>
    `;
  }

  function renderSearchResults(data, type) {
    // You can shape your backend response however you want.
    // This renderer supports:
    // - data.results as array
    // - each result can be {code, batch, status, created_at, used_at}
    const results = Array.isArray(data.results) ? data.results : [];

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="alert alert-warning mb-0">
          <i class="fas fa-triangle-exclamation me-1"></i> No results found.
        </div>
      `;
      return;
    }

    const title = type === "batch" ? "Batch Results" : "Code Results";

    const rows = results
      .map((r, idx) => {
        const code = r.code ?? "—";
        const batch = r.batch ?? "—";
        const status = r.status ?? "—";
        const createdAt = r.created_at ?? "—";
        const usedAt = r.used_at ?? "—";

        const statusBadge =
          String(status).toLowerCase() === "used"
            ? `<span class="badge text-bg-danger">Used</span>`
            : String(status).toLowerCase() === "available"
              ? `<span class="badge text-bg-success">Available</span>`
              : `<span class="badge text-bg-secondary">${escapeHtml(String(status))}</span>`;

        return `
          <tr>
            <td>${idx + 1}</td>
            <td><code>${escapeHtml(String(code))}</code></td>
            <td>${escapeHtml(String(batch))}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(String(createdAt))}</td>
            <td>${escapeHtml(String(usedAt))}</td>
          </tr>
        `;
      })
      .join("");

    searchResults.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-semibold">${escapeHtml(title)}</div>
        <div class="text-muted small">Found: ${results.length}</div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Created</th>
              <th>Used</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  function clearSearchResults() {
    searchResults.innerHTML = "";
  }

  function resetGenerateForm() {
    generateForm.reset();
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }

  function setTimeZoneHiddenInput() {
    const tz = getTimezone();

    // Attach timezone to BOTH forms
    [searchForm, generateForm].forEach((f) => {
      let tzInput = f.querySelector("input[name='timezone']");
      if (!tzInput) {
        tzInput = document.createElement("input");
        tzInput.type = "hidden";
        tzInput.name = "timezone";
        f.appendChild(tzInput);
      }
      tzInput.value = tz;
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
