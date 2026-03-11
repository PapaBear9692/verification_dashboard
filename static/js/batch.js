// sc_lot.js — shared across all pages (register, batch, code, dashboard)

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     LOT NUMBER → SECURITY CODES LOOKUP MAP
     Lot numbers are globally unique — independent of product.
     Keys are matched case-insensitively and trimmed.
     ── Add / edit entries here as new lots are registered ──
  ============================================================ */
  const LOT_CODE_MAP = {
    "LOT-001": 500,
    "LOT-002": 750,
    "LOT-003": 1000,
    "LOT-004": 250,
    "LOT-005": 600,
    // Add more lots:
    // "LOT-XXX": <security code count>,
  };

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

  // ── Lot Assignment (register page only) ────────────────────
  const LOT_ROWS = [
    { lot: document.getElementById("lotInput1"), count: document.getElementById("secCodeCount1") },
    { lot: document.getElementById("lotInput2"), count: document.getElementById("secCodeCount2") },
    { lot: document.getElementById("lotInput3"), count: document.getElementById("secCodeCount3") },
  ];

  // ── Live total of security codes ───────────────────────────
  // Reads all rendered count inputs dynamically (supports added rows)
  function updateSecCodeTotal() {
    const container = document.getElementById("lotRowsContainer");
    if (!container) return;
    const total = Array.from(container.querySelectorAll(".sec-code-count-input"))
      .reduce((sum, el) => {
        const v = Number(el.value);
        return sum + (isNaN(v) || v < 0 ? 0 : v);
      }, 0);
    const display = document.getElementById("totalSecCodes");
    if (display) display.textContent = total.toLocaleString();
  }

  // Count inputs are readonly — users cannot type in them.
  // updateSecCodeTotal() is called directly inside lookupAndFill() after each
  // auto-fill so no input listener on count inputs is actually needed.
  // attachCountListener is kept as a no-op shim so addLotRow() still compiles
  // cleanly if the design ever changes to allow manual entry.
  function attachCountListener(countEl) { /* readonly — wired via lookupAndFill */ }

  // Lookup lot number in the flat map and auto-fill the paired count input
  function lookupAndFill(lotEl, countEl) {
    if (!lotEl || !countEl) return;

    const lotKey = lotEl.value.trim().toUpperCase();
    const match  = Object.keys(LOT_CODE_MAP).find(k => k.toUpperCase() === lotKey);

    if (match) {
      countEl.value = LOT_CODE_MAP[match];
      countEl.classList.remove("is-invalid", "field-no-match");
      countEl.classList.add("is-valid");
    } else {
      countEl.value = "";
      if (lotKey.length > 0) {
        countEl.classList.add("field-no-match");
        countEl.classList.remove("is-valid", "is-invalid");
      } else {
        countEl.classList.remove("field-no-match", "is-valid", "is-invalid");
      }
    }
    updateSecCodeTotal();
  }

  // Re-run all lot lookups (e.g. called when brand/code change — kept as no-op guard)
  function refreshAllLotLookups() {
    const container = document.getElementById("lotRowsContainer");
    if (!container) return;
    const lotInputs   = container.querySelectorAll("input[id^='lotInput']");
    const countInputs = container.querySelectorAll(".sec-code-count-input");
    lotInputs.forEach((lot, i) => lookupAndFill(lot, countInputs[i]));
  }

  // Wire lot-input → auto-fill on a row (works for static + dynamic rows)
  function attachLotListener(lotEl, countEl) {
    if (!lotEl) return;
    lotEl.addEventListener("input", () => lookupAndFill(lotEl, countEl));
  }

  // Attach to 3 static rows
  LOT_ROWS.forEach(({ lot, count }) => attachLotListener(lot, count));

  // ── Add Row ─────────────────────────────────────────────────
  let dynamicRowIndex = LOT_ROWS.length; // starts at 3

  window.addLotRow = function () {
    const container = document.getElementById("lotRowsContainer");
    if (!container) return;

    dynamicRowIndex++;
    const idx = dynamicRowIndex;

    const rowDiv = document.createElement("div");
    rowDiv.className = "row g-2 mb-3 justify-content-center dynamic-lot-row";
    rowDiv.dataset.rowIndex = idx;

    rowDiv.innerHTML = `
      <div class="col-md-3">
        <label class="form-label">
          Lot Number <span class="text-danger">*</span>
        </label>
        <input type="text" class="form-control lot-input"
               id="lotInput${idx}" placeholder="e.g. LOT-00${idx}" required>
        <div class="invalid-feedback">Please enter a valid lot number.</div>
        <div class="valid-feedback">Looks good!</div>
      </div>
      <div class="col-md-3">
        <div class="d-flex align-items-end gap-2">
          <div class="flex-grow-1">
            <label class="form-label">
              Number of Security Codes <span class="text-danger">*</span>
            </label>
            <input type="number" class="form-control sec-code-count-input lot-code-result"
                   id="secCodeCount${idx}"
                   placeholder="Auto-filled from lot number"
                   readonly tabindex="-1">
            <div class="invalid-feedback">Please enter a positive number.</div>
            <div class="valid-feedback">Looks good!</div>
          </div>
          <button type="button"
                  class="btn btn-remove-row mb-0"
                  onclick="removeLotRow(this)"
                  title="Remove row">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(rowDiv);

    // Wire up live total + lookup listeners on the new row
    const newCountEl = rowDiv.querySelector(".sec-code-count-input");
    const newLotEl   = rowDiv.querySelector(".lot-input");
    attachCountListener(newCountEl);
    attachLotListener(newLotEl, newCountEl);

    // Focus the new lot input for convenience
    rowDiv.querySelector(".lot-input")?.focus();
  };

  window.removeLotRow = function (btn) {
    const row = btn.closest(".dynamic-lot-row");
    if (row) {
      row.remove();
      updateSecCodeTotal();
    }
  };

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
    // Clear all validation states including amber no-match style
    lotForm.querySelectorAll(".is-invalid, .is-valid, .field-no-match").forEach((el) => {
      el.classList.remove("is-invalid", "is-valid", "field-no-match");
    });
    // Remove any dynamically added rows
    const container = document.getElementById("lotRowsContainer");
    if (container) {
      container.querySelectorAll(".dynamic-lot-row").forEach(r => r.remove());
    }
    dynamicRowIndex = LOT_ROWS.length; // reset counter back to 3

    // Reset the live total back to 0
    const totalEl = document.getElementById("totalSecCodes");
    if (totalEl) totalEl.textContent = "0";
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

    // Collect ALL rows — static (LOT_ROWS) + any dynamically added ones
    const container = document.getElementById("lotRowsContainer");
    const allLotInputs   = container
      ? Array.from(container.querySelectorAll("input[id^='lotInput']"))
      : LOT_ROWS.map(r => r.lot).filter(Boolean);
    const allCountInputs = container
      ? Array.from(container.querySelectorAll(".sec-code-count-input, input[id^='secCodeCount']"))
      : LOT_ROWS.map(r => r.count).filter(Boolean);

    // De-duplicate (static rows have both a class match and id match)
    const uniqueCounts = [...new Set(allCountInputs)];
    const uniqueLots   = [...new Set(allLotInputs)];

    uniqueLots.forEach((lot, idx) => {
      const count    = uniqueCounts[idx];
      const lotVal   = lot?.value.trim()   ?? "";
      const countVal = count?.value.trim() ?? "";
      const countNum = Number(countVal);

      if (!lotVal || lotVal.length < 2) {
        lot?.classList.add("is-invalid");
        lot?.classList.remove("is-valid");
        hasError = true;
      } else {
        lot?.classList.remove("is-invalid");
        lot?.classList.add("is-valid");
      }

      // count is auto-filled from map; if empty the lot number wasn't found
      if (!countVal || isNaN(countNum) || countNum < 1) {
        count?.classList.add("is-invalid");
        count?.classList.remove("is-valid", "field-no-match");
        hasError = true;
      } else {
        count?.classList.remove("is-invalid", "field-no-match");
        count?.classList.add("is-valid");
      }

      rows.push({ row: idx + 1, lotNumber: lotVal, securityCodes: countNum });
    });

    if (hasError) {
      showToast("Please fill in all fields correctly.", "error");
      return;
    }

    const submitBtn = lotForm.querySelector(".btn-primary");
    setBtnLoading(submitBtn, true, "Submitting...");

    try {
      const response = await fetch("/lot/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ brand, code, lots: rows }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(data.message || "Assignment failed. Please try again.", "error");
        return;
      }

      window.resetLotForm();
      showToast(data.message || "Assignment submitted successfully.", "success");

    } catch {
      showToast("Server unavailable. Please try again.", "error");
    } finally {
      setBtnLoading(submitBtn, false, '<i class="fas fa-check-circle me-1"></i> Submit Assignment');
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