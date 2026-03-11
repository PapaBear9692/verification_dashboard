// sc_lot.js — shared across all pages (register, batch, code, dashboard)

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     LOT LOOKUP — async stub.
     Replace the body of fetchSecurityCodeCount() with your
     real API call when the backend is ready.

     Contract:
       • Receives a trimmed, upper-cased lot number string.
       • Returns  { count: <number> }   on success.
       • Returns  null                  when the lot is not found.
       • Throws   on network / server error (caller handles it).
  ============================================================ */
  async function fetchSecurityCodeCount(lotNumber) {
    const res = await fetch("/get/lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ lotNumber }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    return { count: data.available_codes };
  }

  /* ============================================================
     ELEMENTS — all resolved safely; null is expected on pages
     where a given section does not exist.
  ============================================================ */

  // Present on every page
  const backToTopBtn = document.getElementById("backToTopBtn");

  // ── Register Product (register page only) ──────────────────
  const productForm = document.getElementById("productForm");
  const brandInput  = document.getElementById("brandInput");
  const codeInput   = document.getElementById("codeInput");

  /* ============================================================
     LOT ASSIGNMENT TABLE
     • One editable column (Lot Number) — user types here.
     • One readonly column (Security Codes) — filled async.
     • New row appears automatically when the last row gets input.
     • tfoot shows the running total.
  ============================================================ */

  // Per-row debounce timers
  const _lotDebounceTimers = {};
  // Per-row cached counts  { rowId: number | null }
  const _lotCountCache     = {};
  let   _lotRowCounter     = 0;

  const lotTableBody = document.getElementById("lotTableBody");

  // ── Helpers ────────────────────────────────────────────────

  function updateSecCodeTotal() {
    const display = document.getElementById("totalSecCodes");
    if (!display) return;
    let total = 0;
    Object.values(_lotCountCache).forEach(v => {
      if (typeof v === "number" && v > 0) total += v;
    });
    display.textContent = total.toLocaleString();
  }

  function _setCodeCell(td, state, value) {
    // state: "empty" | "loading" | "found" | "not-found"
    td.className = "lot-code-cell " + (state === "found" ? "" : state);
    switch (state) {
      case "empty":
        td.innerHTML = `<span class="sec-code-display text-muted" style="font-size:0.82rem">—</span>`;
        break;
      case "loading":
        td.innerHTML = `<span class="sec-code-display"></span>`;
        break;
      case "found":
        td.innerHTML = `<span class="sec-code-display">${Number(value).toLocaleString()}</span>`;
        break;
      case "not-found":
        td.innerHTML = `<span class="sec-code-display">Not found</span>`;
        break;
    }
  }

  function _isLastRow(rowId) {
    if (!lotTableBody) return false;
    const rows = lotTableBody.querySelectorAll("tr[data-lot-row-id]");
    return rows.length > 0 && rows[rows.length - 1].dataset.lotRowId === String(rowId);
  }

  // ── Core: create one table row ──────────────────────────────

  function _createLotTableRow({ autoFocus = true } = {}) {
    if (!lotTableBody) return;
    _lotRowCounter++;
    const id = _lotRowCounter;
    _lotCountCache[id] = null;

    const tr = document.createElement("tr");
    tr.dataset.lotRowId = id;
    tr.classList.add("lot-row-new");

    tr.innerHTML = `
      <td><span class="lot-row-num">${id}</span></td>
      <td>
        <input type="text"
               class="form-control lot-input"
               id="lotInput${id}"
               placeholder="e.g. LOT-${String(id).padStart(3, "0")}"
               autocomplete="off">
      </td>
      <td class="lot-code-cell empty" id="lotCodeCell${id}">
        <span class="sec-code-display">—</span>
      </td>
      <td>
        <button type="button"
                class="btn-del-lot-row"
                title="Remove row"
                data-del-row="${id}">
          <i class="fas fa-times"></i>
        </button>
      </td>
    `;

    lotTableBody.appendChild(tr);

    // Wire input event
    const lotInput = tr.querySelector(`#lotInput${id}`);
    lotInput.addEventListener("input", () => _onLotInput(id));
    lotInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); _focusNextEmptyLot(id); }
    });

    // Wire delete button
    tr.querySelector(`[data-del-row="${id}"]`).addEventListener("click", () => _deleteLotRow(id));

    // Focus the new row's input only when explicitly requested
    if (autoFocus) setTimeout(() => lotInput.focus(), 40);
  }

  // ── Input handler (debounced async lookup) ──────────────────

  async function _onLotInput(rowId) {
    const lotInput = document.getElementById(`lotInput${rowId}`);
    const codeCell = document.getElementById(`lotCodeCell${rowId}`);
    if (!lotInput || !codeCell) return;

    const raw = lotInput.value.trim();

    // If empty, reset
    if (!raw) {
      _setCodeCell(codeCell, "empty", null);
      _lotCountCache[rowId] = null;
      lotInput.classList.remove("is-valid", "is-invalid", "field-no-match");
      updateSecCodeTotal();
      return;
    }

    // Debounce lookup — new row is only added AFTER a confirmed valid result
    clearTimeout(_lotDebounceTimers[rowId]);
    _setCodeCell(codeCell, "loading", null);

    _lotDebounceTimers[rowId] = setTimeout(async () => {
      try {
        const result = await fetchSecurityCodeCount(raw);
        if (result && typeof result.count === "number") {
          _lotCountCache[rowId] = result.count;
          _setCodeCell(codeCell, "found", result.count);
          lotInput.classList.remove("is-invalid", "field-no-match");
          lotInput.classList.add("is-valid");
          // Only now, if this is the last row, silently append a new empty row
          // without stealing focus from the current row
          if (_isLastRow(rowId)) _createLotTableRow({ autoFocus: false });
        } else {
          _lotCountCache[rowId] = null;
          _setCodeCell(codeCell, "not-found", null);
          lotInput.classList.add("field-no-match");
          lotInput.classList.remove("is-valid", "is-invalid");
        }
      } catch (_err) {
        _lotCountCache[rowId] = null;
        _setCodeCell(codeCell, "not-found", null);
      }
      updateSecCodeTotal();
    }, 450);
  }

  // ── Delete a row ─────────────────────────────────────────────

  function _deleteLotRow(rowId) {
    const tbody = lotTableBody;
    if (!tbody) return;
    const rows = tbody.querySelectorAll("tr[data-lot-row-id]");
    if (rows.length <= 1) {
      // Last row — just clear it
      const lotInput = document.getElementById(`lotInput${rowId}`);
      const codeCell = document.getElementById(`lotCodeCell${rowId}`);
      if (lotInput) { lotInput.value = ""; lotInput.className = "form-control lot-input"; }
      if (codeCell) _setCodeCell(codeCell, "empty", null);
      _lotCountCache[rowId] = null;
      updateSecCodeTotal();
      return;
    }
    const tr = tbody.querySelector(`tr[data-lot-row-id="${rowId}"]`);
    if (tr) {
      tr.style.transition = "opacity 0.18s";
      tr.style.opacity    = "0";
      setTimeout(() => {
        tr.remove();
        delete _lotCountCache[rowId];
        clearTimeout(_lotDebounceTimers[rowId]);
        updateSecCodeTotal();
      }, 180);
    }
  }

  // ── Focus helpers ────────────────────────────────────────────

  function _focusNextEmptyLot(currentRowId) {
    if (!lotTableBody) return;
    const rows = Array.from(lotTableBody.querySelectorAll("tr[data-lot-row-id]"));
    const ci   = rows.findIndex(r => r.dataset.lotRowId === String(currentRowId));
    for (let i = ci + 1; i < rows.length; i++) {
      const inp = rows[i].querySelector(".lot-input");
      if (inp && !inp.value.trim()) { inp.focus(); return; }
    }
  }

  // ── Initialise with one empty row ────────────────────────────
  if (lotTableBody) _createLotTableRow();

  // ── Keep these aliases so existing resetLotForm / submitLotAssignment still work ──

  // refreshAllLotLookups is a no-op alias (lookups now fire on input)
  function refreshAllLotLookups() {}

  // dynamicRowIndex kept so resetLotForm resets it cleanly
  let dynamicRowIndex = 0;

  // ── Batch forms (batch page only) ──────────────────────────
  const createForm = document.getElementById("createBatchForm");
  const exportForm = document.getElementById("exportBatchForm");

  // Batch create inputs
  const prodIdInput    = document.getElementById("prodIdInput");
  const genericInput   = document.getElementById("genericInput");
  const prodNameInput  = document.getElementById("prodNameInput");
  const batchInput     = document.getElementById("batchInput");
  const lotNoInput     = document.getElementById("lotNoInput");
  const mnfDateInput   = document.getElementById("mnfDateInput");
  const expDateInput   = document.getElementById("expDateInput");
  const batchSizeInput = document.getElementById("batchSizeInput");
  const uomInput       = document.getElementById("uomInput");

  // Export inputs — safe: only query when exportForm exists
  const exportBatchInput   = exportForm?.querySelector("input[name='exportBatch']")   ?? null;
  const exportTypeSelect   = exportForm?.querySelector("select[name='exportType']")   ?? null;
  const exportFormatSelect = exportForm?.querySelector("select[name='exportFormat']") ?? null;

  // Confirmation modal — safe: only initialise when element exists
  const modalEl = document.getElementById("batchConfirmModal");
  const modal   = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

  // Confirm display fields — all may be null on non-batch pages
  const confirmProdId    = document.getElementById("confirmProdId");
  const confirmGeneric   = document.getElementById("confirmGeneric");
  const confirmProdName  = document.getElementById("confirmProdName");
  const confirmBatch     = document.getElementById("confirmBatch");
  const confirmLotNo     = document.getElementById("confirmLotNo");
  const confirmMnfDate   = document.getElementById("confirmMnfDate");
  const confirmExpDate   = document.getElementById("confirmExpDate");
  const confirmBatchSize = document.getElementById("confirmBatchSize");
  const confirmUom       = document.getElementById("confirmUom");

  // Pending payload held between modal open → confirm click
  let pendingBatchPayload = null;

  // Inject timezone into any forms that exist on this page
  setTimeZoneHiddenInputs();


  /* ============================================================
     GLOBAL FUNCTIONS  (called via onclick / body onload)
  ============================================================ */

  // Called by <body onload="getTimeZone()">
  window.getTimeZone = function () {
    setTimeZoneHiddenInputs();
  };

  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.toggleLotConfirmPasswordVisibility = function () {
    const input = document.getElementById("lotConfirmPassword");
    const icon  = document.getElementById("lotConfirmPasswordEyeIcon");
    if (!input) return;
    const isHidden = input.type === "password";
    input.type     = isHidden ? "text" : "password";
    if (icon) {
      icon.classList.toggle("fa-eye",      !isHidden);
      icon.classList.toggle("fa-eye-slash", isHidden);
    }
  };

  /* ----------------------------------------------------------
     LOGOUT
  ---------------------------------------------------------- */
  window.logoutUser = async function () {
    try {
      const response = await fetch("/logout", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });

      let data = null;
      try { data = await response.json(); } catch (_) { data = null; }

      if (response.ok) {
        window.location.href = (data && data.redirect) ? data.redirect : "/login";
        return;
      }

      showToast((data && data.message) ? data.message : "Logout failed. Please try again.", "error");
    } catch {
      showToast("Server unavailable. Please try again.", "error");
    }
  };


  /* ----------------------------------------------------------
     REGISTER PRODUCT FORM
  ---------------------------------------------------------- */

  window.resetForm = function () {
    if (!productForm) return;
    productForm.reset();
    productForm.querySelectorAll(".is-invalid, .is-valid").forEach((el) => {
      el.classList.remove("is-invalid", "is-valid");
    });
  };

  window.submitProduct = async function () {
    if (!brandInput || !codeInput) return;

    const brand = brandInput.value.trim();
    const code  = codeInput.value.trim();

    let hasError = false;

    if (!brand || brand.length < 2) {
      brandInput.classList.add("is-invalid");
      brandInput.classList.remove("is-valid");
      hasError = true;
    } else {
      brandInput.classList.remove("is-invalid");
      brandInput.classList.add("is-valid");
    }

    if (!code || code.length < 2) {
      codeInput.classList.add("is-invalid");
      codeInput.classList.remove("is-valid");
      hasError = true;
    } else {
      codeInput.classList.remove("is-invalid");
      codeInput.classList.add("is-valid");
    }

    if (hasError) {
      showToast("Please fill in all required fields correctly.", "error");
      return;
    }

    const submitBtn = productForm?.querySelector(".btn-primary");
    setBtnLoading(submitBtn, true, "Registering...");

    try {
      const response = await fetch("/product/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ brand, code }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(data.message || "Registration failed. Please try again.", "error");
        return;
      }

      window.resetForm();
      showToast(data.message || "Product registered successfully.", "success");

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(submitBtn, false, '<i class="fas fa-save me-1"></i> Register Product');
    }
  };


  /* ----------------------------------------------------------
     LOT ASSIGNMENT FORM
  ---------------------------------------------------------- */

  window.resetLotForm = function () {
    const lotForm = document.getElementById("lotAssignForm");
    if (!lotForm) return;
    lotForm.reset();
    lotForm.querySelectorAll(".is-invalid, .is-valid, .field-no-match").forEach((el) => {
      el.classList.remove("is-invalid", "is-valid", "field-no-match");
    });
    // Clear all table rows and reset to one fresh empty row
    if (lotTableBody) lotTableBody.innerHTML = "";
    Object.keys(_lotCountCache).forEach(k => delete _lotCountCache[k]);
    Object.keys(_lotDebounceTimers).forEach(k => clearTimeout(_lotDebounceTimers[k]));
    _lotRowCounter = 0;
    dynamicRowIndex = 0;
    _createLotTableRow();
    updateSecCodeTotal();
  };

  // resetForm kept as alias so any legacy onclick="resetForm()" still works
  window.resetForm = window.resetLotForm;

  window.submitLotAssignment = async function () {
    const lotForm = document.getElementById("lotAssignForm");
    if (!lotForm) return;

    let hasError = false;

    // ── Validate Product Brand Name & Code (now in the same form) ──
    const brand = brandInput?.value.trim() ?? "";
    const code  = codeInput?.value.trim()  ?? "";

    if (!brand || brand.length < 2) {
      brandInput?.classList.add("is-invalid");
      brandInput?.classList.remove("is-valid");
      hasError = true;
    } else {
      brandInput?.classList.remove("is-invalid");
      brandInput?.classList.add("is-valid");
    }

    if (!code || code.length < 2) {
      codeInput?.classList.add("is-invalid");
      codeInput?.classList.remove("is-valid");
      hasError = true;
    } else {
      codeInput?.classList.remove("is-invalid");
      codeInput?.classList.add("is-valid");
    }

    // ── Validate Lot rows ──
    const rows = [];

    // Collect all table rows
    const allLotRows = lotTableBody
      ? Array.from(lotTableBody.querySelectorAll("tr[data-lot-row-id]"))
      : [];

    allLotRows.forEach((tr, i) => {
      const rowId    = tr.dataset.lotRowId;
      const lotInput = tr.querySelector(".lot-input");
      const lotVal   = lotInput?.value.trim() ?? "";
      const count    = _lotCountCache[rowId];

      // Skip completely empty trailing rows (auto-added blank row)
      if (!lotVal && count === null) return;

      if (!lotVal || lotVal.length < 2) {
        lotInput?.classList.add("is-invalid");
        lotInput?.classList.remove("is-valid");
        hasError = true;
      } else {
        lotInput?.classList.remove("is-invalid");
        lotInput?.classList.add("is-valid");
      }

      if (!count || isNaN(count) || count < 1) {
        hasError = true;
      }

      rows.push({ row: i + 1, lotNumber: lotVal });
    });

    if (hasError) {
      showToast("Please fill in all fields correctly.", "error");
      return;
    }

    // ── All valid — store payload and open confirmation modal ──
    _pendingLotPayload = { brand, code, lots: rows };

    // Populate modal summary
    const modalCode  = document.getElementById("lotConfirmCode");
    const modalBrand = document.getElementById("lotConfirmBrand");
    const modalBody  = document.getElementById("lotConfirmTableBody");
    const modalTotal = document.getElementById("lotConfirmTotal");

    if (modalCode)  modalCode.textContent  = code;
    if (modalBrand) modalBrand.textContent = brand;

    if (modalBody) {
      modalBody.innerHTML = rows.map((r, i) => `
        <tr>
          <td style="padding:0.45rem 0.8rem; border-bottom:1px solid #f0f1f5; color:#6b7280; font-size:0.82rem;">${i + 1}</td>
          <td style="padding:0.45rem 0.8rem; border-bottom:1px solid #f0f1f5;"><span class="font-monospace">${r.lotNumber}</span></td>
        </tr>
      `).join("");
    }

    if (modalTotal) modalTotal.textContent = rows.length;

    const lotModalEl = document.getElementById("lotAssignConfirmModal");
    if (lotModalEl) {
      // Clear password + error state each time modal opens
      const pwInput = document.getElementById("lotConfirmPassword");
      const pwError = document.getElementById("lotConfirmPasswordError");
      if (pwInput) { pwInput.value = ""; pwInput.classList.remove("is-invalid"); }
      if (pwError) pwError.style.display = "none";
      bootstrap.Modal.getOrCreateInstance(lotModalEl).show();
    }
  };

  // Pending payload between modal open → confirm click
  let _pendingLotPayload = null;

  window.confirmLotAssignment = async function () {
    if (!_pendingLotPayload) return;

    // Validate password field
    const pwInput = document.getElementById("lotConfirmPassword");
    const pwError = document.getElementById("lotConfirmPasswordError");
    const password = pwInput?.value ?? "";

    if (!password) {
      if (pwInput) pwInput.classList.add("is-invalid");
      if (pwError) pwError.style.display = "block";
      pwInput?.focus();
      return;
    }
    if (pwInput) pwInput.classList.remove("is-invalid");
    if (pwError) pwError.style.display = "none";

    const lotModalEl = document.getElementById("lotAssignConfirmModal");
    const confirmBtn = document.getElementById("lotConfirmSubmitBtn");
    setBtnLoading(confirmBtn, true, "Submitting…");

    try {
      const response = await fetch("/batch/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ..._pendingLotPayload, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(data.message || "Assignment failed. Please try again.", "error");
        return;
      }

      if (lotModalEl) bootstrap.Modal.getOrCreateInstance(lotModalEl).hide();
      _pendingLotPayload = null;
      window.resetLotForm();
      showToast(data.message || "Lot assignment submitted successfully.", "success");

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(confirmBtn, false, '<i class="fas fa-check-circle me-1"></i> Confirm & Submit');
    }
  };

  // submitProduct kept as alias so any legacy onclick="submitProduct()" still works
  window.submitProduct = window.submitLotAssignment;


  /* ----------------------------------------------------------
     EXPORT SECURITY CODE FORM
  ---------------------------------------------------------- */

  window.resetExportSecCodeForm = function () {
    const form = document.getElementById("exportSecCodeForm");
    if (!form) return;
    form.reset();
    form.querySelectorAll(".is-invalid, .is-valid").forEach(el =>
      el.classList.remove("is-invalid", "is-valid")
    );
  };

  window.submitExportSecCode = async function () {
    const form = document.getElementById("exportSecCodeForm");
    if (!form) return;

    const lotEl    = document.getElementById("exportLotInput");
    const formatEl = document.getElementById("exportFormatSelect");

    let hasError = false;

    const lotVal    = lotEl?.value.trim()    ?? "";
    const formatVal = formatEl?.value.trim() ?? "";

    if (!lotVal || lotVal.length < 2) {
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
      const response = await fetch("/security-code/export", {
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
      const defaultName = `${lotVal}_security_codes.${formatVal}`;
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileName    = parseFilenameFromHeader(disposition) || defaultName;

      downloadBlob(blob, fileName);
      showToast("Export successful.", "success");

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(exportBtn, false, '<i class="fas fa-file-export me-1"></i> Export');
    }
  };


  /* ----------------------------------------------------------
     CREATE BATCH FORM
  ---------------------------------------------------------- */

  window.resetCreateBatchForm = function () {
    if (!createForm) return;
    createForm.reset();
    pendingBatchPayload = null;
  };

  window.openBatchConfirmation = function () {
    if (!createForm || !modal) return;

    const payload = collectCreateBatchPayload();
    const error   = validateCreateBatch(payload);

    if (error) {
      showToast(error, "error");
      return;
    }

    fillBatchConfirmModal(payload);
    pendingBatchPayload = payload;
    modal.show();
  };

  window.confirmCreateBatch = async function () {
    if (!modal) return;

    if (!pendingBatchPayload) {
      showToast("Nothing to submit.", "error");
      return;
    }

    const confirmBtn = modalEl?.querySelector(".modal-footer .btn.btn-primary");
    setBtnLoading(confirmBtn, true, "Creating...");

    try {
      const response = await fetch("/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(pendingBatchPayload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(data.message || "Batch creation failed.", "error");
        return;
      }

      modal.hide();
      createForm?.reset();
      pendingBatchPayload = null;
      showToast(data.message || "Batch created successfully.", "success");

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(confirmBtn, false, "Confirm & Create");
    }
  };


  /* ----------------------------------------------------------
     EXPORT BATCH FORM
  ---------------------------------------------------------- */

  window.resetExportForm = function () {
    if (!exportForm) return;
    exportForm.reset();
  };

  window.exportBatchData = async function () {
    if (!exportForm) return;

    const payload = collectExportPayload();
    const error   = validateExport(payload);

    if (error) {
      showToast(error, "error");
      return;
    }

    const exportBtn = document.getElementById("exportBtn");
    setBtnLoading(exportBtn, true, "Exporting...");

    try {
      const response = await fetch("/batch/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.message || "Export failed.", "error");
        return;
      }

      const blob        = await response.blob();
      const fileExt     = payload.exportFormat.toLowerCase() === "csv" ? "csv" : "pdf";
      const defaultName = `${payload.batchNumber}_${payload.exportType}.${fileExt}`;
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const fileName    = parseFilenameFromHeader(contentDisposition) || defaultName;

      downloadBlob(blob, fileName);

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(exportBtn, false, '<i class="fas fa-file-export me-1"></i> Export');
    }
  };


  /* ============================================================
     SCROLL — BACK TO TOP VISIBILITY
  ============================================================ */

  window.addEventListener("scroll", () => {
    if (!backToTopBtn) return;
    backToTopBtn.style.display = window.scrollY > 300 ? "flex" : "none";
  });


  /* ============================================================
     HELPERS
  ============================================================ */

  function collectCreateBatchPayload() {
    return {
      P_PROD_ID:    Number((prodIdInput?.value    || "").trim()),
      P_GENERIC:           (genericInput?.value   || "").trim(),
      P_PROD_NAME:         (prodNameInput?.value  || "").trim(),
      P_BATCH:             (batchInput?.value     || "").trim(),
      P_LOT_NO:            (lotNoInput?.value     || "").trim(),
      P_MNF_DATE:          (mnfDateInput?.value   || "").trim(),
      P_EXP_DATE:          (expDateInput?.value   || "").trim(),
      P_BATCH_SIZE: Number((batchSizeInput?.value || "").trim()),
      P_UOM:               (uomInput?.value       || "").trim(),
      timezone: getTimezone(),
    };
  }

  function validateCreateBatch(p) {
    if (!p.P_PROD_ID || Number.isNaN(p.P_PROD_ID) || p.P_PROD_ID < 1)
      return "Product ID must be a positive number.";
    if (!p.P_GENERIC   || p.P_GENERIC.length   < 2) return "Generic name is too short.";
    if (!p.P_PROD_NAME || p.P_PROD_NAME.length < 2) return "Product name is too short.";
    if (!p.P_BATCH     || p.P_BATCH.length     < 3) return "Batch number looks too short.";
    if (!p.P_LOT_NO    || p.P_LOT_NO.length    < 2) return "Lot number is required.";
    if (!p.P_MNF_DATE)                               return "Please select a manufacturing date.";
    if (!p.P_EXP_DATE)                               return "Please select an expiry date.";
    if (!p.P_BATCH_SIZE || Number.isNaN(p.P_BATCH_SIZE) || p.P_BATCH_SIZE < 1)
      return "Batch size must be at least 1.";
    if (!p.P_UOM || p.P_UOM.length < 1)             return "Please enter UOM.";

    const mnf = new Date(p.P_MNF_DATE);
    const exp = new Date(p.P_EXP_DATE);
    if (String(mnf) === "Invalid Date") return "Manufacturing date is invalid.";
    if (String(exp) === "Invalid Date") return "Expiry date is invalid.";
    if (exp <= mnf)                     return "Expiry date must be after manufacturing date.";

    return null;
  }

  function fillBatchConfirmModal(p) {
    if (confirmProdId)    confirmProdId.textContent    = String(p.P_PROD_ID    || "—");
    if (confirmGeneric)   confirmGeneric.textContent   = p.P_GENERIC           || "—";
    if (confirmProdName)  confirmProdName.textContent  = p.P_PROD_NAME         || "—";
    if (confirmBatch)     confirmBatch.textContent     = p.P_BATCH             || "—";
    if (confirmLotNo)     confirmLotNo.textContent     = p.P_LOT_NO            || "—";
    if (confirmMnfDate)   confirmMnfDate.textContent   = p.P_MNF_DATE          || "—";
    if (confirmExpDate)   confirmExpDate.textContent   = p.P_EXP_DATE          || "—";
    if (confirmBatchSize) confirmBatchSize.textContent = String(p.P_BATCH_SIZE || "—");
    if (confirmUom)       confirmUom.textContent       = p.P_UOM               || "—";
  }

  function collectExportPayload() {
    return {
      batchNumber:  exportBatchInput?.value.trim()  ?? "",
      exportType:   exportTypeSelect?.value         ?? "",
      exportFormat: exportFormatSelect?.value       ?? "",
      timezone: getTimezone(),
    };
  }

  function validateExport(p) {
    if (!p.batchNumber || p.batchNumber.length < 3) return "Please enter a valid batch number.";
    if (!p.exportType)   return "Please select export content.";
    if (!p.exportFormat) return "Please select a file format.";
    return null;
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }

  function setTimeZoneHiddenInputs() {
    const tz = getTimezone();
    [createForm, exportForm].forEach((f) => {
      if (!f) return;
      let tzInput = f.querySelector("input[name='timezone']");
      if (!tzInput) {
        tzInput       = document.createElement("input");
        tzInput.type  = "hidden";
        tzInput.name  = "timezone";
        f.appendChild(tzInput);
      }
      tzInput.value = tz;
    });
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
    btn.innerHTML = loading ? `<i class="fas fa-spinner fa-spin me-1"></i> ${html}` : html;
  }

});