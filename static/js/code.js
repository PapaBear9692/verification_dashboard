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
     MODAL: Generate Codes Confirmation
  ====================== */

  const generateModal = createGenerateConfirmModal(); // { el, modal, open(payload), setLoading(bool), setError(msg), close() }

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

    const error = validateSearch(payload);
    if (error) {
      renderSearchError(error);
      return;
    }

    renderSearchLoading();

    try {
      const response = await fetch("/generate/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('input[name="csrf_token"]').value,
        },
        body: JSON.stringify(payload),
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

  // ✅ UPDATED: open modal instead of alert/confirm
  window.confirmGenerateCodes = function () {
    const payload = collectGeneratePayload();

    const error = validateGenerate(payload);
    if (error) {
      // show the modal with the error + current payload preview
      generateModal.open(payload);
      generateModal.setError(error);
      return;
    }

    generateModal.open(payload);
  };

  window.resetGenerateForm = function () {
    resetGenerateForm();
  };

  window.logoutUser = async function () {
    try {
      const response = await fetch("/logout", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      data = await response.json();

      if (response.ok) {
        window.location.href = data.redirect ;
      } else {
        Toastify({
          text: (data && data.message) ? data.message : "Logout failed. Please try again.",
          duration: 3000,
          gravity: "top",
          position: "center",
          style: { background: "#b00020" },
        }).showToast();
      }
    } catch (err) {
      Toastify({
        text: "Server unavailable. Please try again.",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
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
      timezone: getTimezone(),
    };
  }

  function validateSearch(p) {
    if (!p.query) return "Please enter a code or batch number.";

    if (p.searchType === "code") {
      if (p.query.length < 4) return "Code looks too short.";
    } else {
      if (p.query.length < 3) return "Batch number looks too short.";
    }
    return null;
  }

  function collectGeneratePayload() {
    return {
      count: Number(codeCountInput.value),
      timezone: getTimezone(),
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
      const response = await fetch("/generate/summary", { method: "GET" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;

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

  /* =====================
     MODAL IMPLEMENTATION
  ====================== */

  function createGenerateConfirmModal() {
    // Inject modal HTML once
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="generateConfirmModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">

            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-barcode me-2"></i>Confirm Code Generation
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body">
              <div id="genModalError" class="alert alert-danger d-none mb-3">
                <i class="fas fa-circle-exclamation me-1"></i>
                <span id="genModalErrorText"></span>
              </div>

              <p class="mb-2">You are about to generate the following payload:</p>

              <div class="border rounded p-3 bg-light">
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Count</span>
                  <span class="fw-semibold" id="genModalCount">—</span>
                </div>
              </div>

              <div class="small text-muted mt-3">
                Please verify the count before continuing. This action may take some time and cannot be undone.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="genModalCancelBtn">
                Cancel
              </button>
              <button type="button" class="btn btn-primary" id="genModalConfirmBtn">
                <i class="fas fa-barcode me-1"></i>
                Confirm Generate
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const el = document.getElementById("generateConfirmModal");
    const modal = new bootstrap.Modal(el, { backdrop: "static", keyboard: false });

    const countEl = document.getElementById("genModalCount");

    const errorBox = document.getElementById("genModalError");
    const errorText = document.getElementById("genModalErrorText");

    const confirmBtn = document.getElementById("genModalConfirmBtn");

    let currentPayload = null;

    // Confirm button handler
    confirmBtn.addEventListener("click", async () => {
      if (!currentPayload) return;

      // revalidate in case the form changed
      const err = validateGenerate(currentPayload);
      if (err) {
        setError(err);
        return;
      }

      setError(""); // clear
      setLoading(true);

      // Also apply a loading state to the main page button (best-effort)
      const mainBtn = generateForm.querySelector("button.btn.btn-primary");
      const restoreMainBtn = setMainGenerateBtnLoading(mainBtn, true);

      try {
        const response = await fetch("/generate/code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('#generateCodeForm input[name="csrf_token"]').value,
          },
          body: JSON.stringify(currentPayload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(data.message || "Code generation failed");
          window.location.href= data.redirect || "";
          return;
        }

        // success
        modal.hide();
        resetGenerateForm();
        loadCodeSummary();
        Toastify({
          text: data.message || "Codes generated successfully!",
          duration: 2000,
          gravity: "top",
          position: "center",
          style: {
            background: "#02630c", // Green success
          },
        }).showToast();

      } catch (err) {
        setError("Server unavailable. Please try again.");
      } finally {
        setLoading(false);
        restoreMainBtn();
      }
    });

    // Clear errors when modal closes
    el.addEventListener("hidden.bs.modal", () => {
      setError("");
      setLoading(false);
      currentPayload = null;
    });

    function open(payload) {
      currentPayload = payload;

      // payload preview
      countEl.textContent = String(payload?.count ?? "—");


      // reset states
      setError("");
      setLoading(false);

      modal.show();
    }

    function setLoading(isLoading) {
      confirmBtn.disabled = !!isLoading;
      confirmBtn.innerHTML = isLoading
        ? `<i class="fas fa-spinner fa-spin me-1"></i> Generating...`
        : `<i class="fas fa-barcode me-1"></i> Confirm Generate`;
    }

    function setError(message) {
      if (!message) {
        errorBox.classList.add("d-none");
        errorText.textContent = "";
        return;
      }
      errorBox.classList.remove("d-none");
      errorText.textContent = message;
    }

    function close() {
      modal.hide();
    }

    return { el, modal, open, setLoading, setError, close };
  }

  function setMainGenerateBtnLoading(btn, isLoading) {
    if (!btn) return () => {};

    const prevDisabled = btn.disabled;
    const prevHtml = btn.innerHTML;

    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Generating...`;
    }

    return function restore() {
      btn.disabled = prevDisabled;
      btn.innerHTML = prevHtml;
    };
  }
});
