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

  // Back-to-top
  const backToTopBtn = document.getElementById("backToTopBtn");

  // Hidden timezone input
  setTimeZoneHiddenInput();

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
      const response = await fetch("generate/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("logout", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
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

  window.resetExportSecCodeForm = function () {
    const form = document.getElementById("exportSecCodeForm");
    if (!form) return;
    form.reset();
    form.querySelectorAll(".is-invalid, .is-valid").forEach(el =>
      el.classList.remove("is-invalid", "is-valid")
    );
  };

  window.submitExportSecCode = async function () {
    const form     = document.getElementById("exportSecCodeForm");
    if (!form) return;

    const lotEl    = document.getElementById("exportLotInput");
    const formatEl = document.getElementById("exportFormatSelect");
    const lotVal   = lotEl?.value.trim()    ?? "";
    const formatVal= formatEl?.value.trim() ?? "";
    let hasError   = false;

    if (!lotVal || lotVal.length !== 6) {
      lotEl?.classList.add("is-invalid");
      lotEl?.classList.remove("is-valid");
      hasError = true;
    } else {
      lotEl?.classList.remove("is-invalid");
      lotEl?.classList.add("is-valid");
    }

    if (!formatVal) {
      formatEl?.classList.add("is-invalid");
      formatEl?.classList.remove("is-valid");
      hasError = true;
    } else {
      formatEl?.classList.remove("is-invalid");
      formatEl?.classList.add("is-valid");
    }

    if (hasError) {
      showToast("Please fill in all fields correctly.", "error");
      return;
    }

    const exportBtn = document.getElementById("exportSecCodeBtn");
    setBtnLoading(exportBtn, true, "Exporting...");

    try {
      const response = await fetch("generate/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ lotNumber: lotVal, fileFormat: formatVal }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.message || "Export failed. Please try again.", "error");
        return;
      }

      const blob        = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${lotVal}_Scratch_Codes.${formatVal === 'excel' ? 'xlsx' : formatVal}`;


      downloadBlob(blob, filename);
      showToast("Export successful.", "success");
      resetExportSecCodeForm();

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(exportBtn, false, '<i class="fas fa-file-export me-1"></i> Export');
    }
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
  function showToast(text, type = "success") {
    Toastify({
      text,
      duration: 3500,
      gravity: "top",
      position: "center",
      style: { background: type === "error" ? "#b00020" : "#02630c" },
    }).showToast();
  }

  function setBtnLoading(btn, loading, html) {
    if (!btn) return;
    btn.disabled  = loading;
    btn.innerHTML = loading
      ? `<i class="fas fa-spinner fa-spin me-1"></i> ${html}`
      : html;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseFilenameFromHeader(contentDisposition) {
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(contentDisposition);
    const name  = match ? (match[1] || match[2]) : null;
    return name ? decodeURIComponent(name) : null;
  }

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
    
    const alphanumericRegex = /^[A-Z0-9]+$/;

    if (p.searchType === "code") {
      if (p.query.length !== 12) return "Code must be exactly 12 characters long.";
      if (!alphanumericRegex.test(p.query)) return "Code must contain only uppercase letters and numbers.";
    } else { // batch
      if (p.query.length !== 6) return "Batch number must be exactly 6 characters long.";
      if (!alphanumericRegex.test(p.query)) return "Batch number must contain only uppercase letters and numbers.";
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
    const result = data.results;

    if (!result || !result.data) {
      searchResults.innerHTML = `
        <div class="alert alert-warning mb-0">
          <i class="fas fa-triangle-exclamation me-1"></i> No results found.
        </div>
      `;
      return;
    }

    if (result.type === 'batch_summary') {
      const summary = result.data;
      searchResults.innerHTML = `
        <div class="fw-semibold">Batch Summary</div>
        <div class="card mt-2">
          <div class="card-body">
            <h5 class="card-title">Lot Number: ${escapeHtml(summary['Lot Number'])}</h5>
            <p class="card-text">Product Name: ${escapeHtml(summary['Product Name'])}</p>
            <p class="card-text">Product Code: ${escapeHtml(summary['Product Code'])}</p>
            <p class="card-text">Assigned Batch Number: ${escapeHtml(summary['Assigned Batch Number'])}</p>
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Total Codes
                <span class="badge bg-primary rounded-pill">${summary['Total Codes']}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Used Codes
                <span class="badge bg-danger rounded-pill">${summary['Used Codes']}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Available Codes
                <span class="badge bg-success rounded-pill">${summary['Available Codes']}</span>
              </li>
            </ul>
          </div>
        </div>
      `;
    } else if (result.type === 'code_details') {
        const details = result.data;
        let detailsHtml = '<div class="fw-semibold">Code Details</div><table class="table table-sm table-striped mt-2">';
        for (const key in details) {
            detailsHtml += `<tr><th scope="row">${escapeHtml(key)}</th><td>${escapeHtml(details[key])}</td></tr>`;
        }
        detailsHtml += '</table>';
        searchResults.innerHTML = detailsHtml;
    }
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
        const response = await fetch("generate/code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentPayload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(data.message || "Code generation failed");
        return;
      }

      // success
      modal.hide();
      resetGenerateForm();
      Toastify({
        text: data.message || "Codes generated successfully!",
        duration: 2000,
        gravity: "top",
        position: "center",
        style: {
          background: "#02630c", // Green success
        },
      }).showToast();

      if (data.lot_number) {
        exportNewCodes(data.lot_number);
      }
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

  function exportNewCodes(lotNumber) {
    const formatVal = 'excel';

    const exportBtn = document.getElementById("exportSecCodeBtn");
    setBtnLoading(exportBtn, true, "Exporting New Codes...");

    fetch("generate/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ lotNumber: lotNumber, fileFormat: formatVal }),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errData => {
          throw new Error(errData.message || "Export failed. Please try again.");
        });
      }
      return response.blob().then(blob => ({ blob, response }));
    })
    .then(({ blob, response }) => {
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${lotNumber}_Scratch_Codes.xlsx`;
      
      downloadBlob(blob, filename);
      showToast("New codes exported successfully.", "success");
    })
    .catch(error => {
      showToast(error.message, "error");
    })
    .finally(() => {
      setBtnLoading(exportBtn, false, '<i class="fas fa-file-export me-1"></i> Export');
    });
  }
});
