// static/js/batch.js

document.addEventListener("DOMContentLoaded", () => {
  /* =====================
     ELEMENTS
  ====================== */

  // Forms
  const createForm = document.getElementById("createBatchForm");
  const exportForm = document.getElementById("exportBatchForm");

  /* =====================
     Create Batch inputs (UPDATED HTML IDs)
     Parameters:
     P_PROD_ID, P_GENERIC, P_PROD_NAME, P_BATCH, P_LOT_NO, P_MNF_DATE, P_EXP_DATE, P_BATCH_SIZE, P_UOM
  ====================== */
  const prodIdInput = document.getElementById("prodIdInput");
  const genericInput = document.getElementById("genericInput");
  const prodNameInput = document.getElementById("prodNameInput");
  const batchInput = document.getElementById("batchInput");
  const lotNoInput = document.getElementById("lotNoInput");
  const mnfDateInput = document.getElementById("mnfDateInput");
  const expDateInput = document.getElementById("expDateInput");
  const batchSizeInput = document.getElementById("batchSizeInput");
  const uomInput = document.getElementById("uomInput");

  // Export inputs (by name)
  const exportBatchInput = exportForm.querySelector("input[name='exportBatch']");
  const exportTypeSelect = exportForm.querySelector("select[name='exportType']");
  const exportFormatSelect = exportForm.querySelector("select[name='exportFormat']");

  // Modal + confirm fields
  const modalEl = document.getElementById("batchConfirmModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  const confirmProdId = document.getElementById("confirmProdId");
  const confirmGeneric = document.getElementById("confirmGeneric");
  const confirmProdName = document.getElementById("confirmProdName");
  const confirmBatch = document.getElementById("confirmBatch");
  const confirmMnfDate = document.getElementById("confirmMnfDate");
  const confirmExpDate = document.getElementById("confirmExpDate");
  const confirmBatchSize = document.getElementById("confirmBatchSize");
  const confirmUom = document.getElementById("confirmUom");

  // ✅ IMPORTANT:
  // Your HTML currently DOES NOT have <div id="confirmLotNo"></div>
  // So we must not require it in JS, otherwise it breaks.
  // We'll handle it safely:
  const confirmLotNo = document.getElementById("confirmLotNo"); // may be null

  // Back-to-top
  const backToTopBtn = document.getElementById("backToTopBtn");

  // Keep payload between modal open and confirm click
  let pendingBatchPayload = null;

  // timezone hidden inputs
  setTimeZoneHiddenInputs();

  /* =====================
     GLOBAL FUNCTIONS (HTML onclick/onload)
  ====================== */

  window.getTimeZone = function () {
    setTimeZoneHiddenInputs();
  };

  // ✅ FIXED LOGOUT:
  // Your pasted JS had 2 bugs:
  // 1) `data = await response.json()` missing `const/let` (creates error in strict mode)
  // 2) If /logout returns HTML (redirect), response.json() throws and logout "does nothing"
  window.logoutUser = async function () {
    try {
      const response = await fetch("/logout", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin", // ✅ make sure session cookie is sent
      });

      // Try JSON; if it fails, fallback to redirect
      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      if (response.ok) {
        // If backend returns {redirect:"/login"} use it, else fallback
        const redirectUrl = data && data.redirect ? data.redirect : "/login";
        window.location.href = redirectUrl;
        return;
      }

      Toastify({
        text: (data && data.message) ? data.message : "Logout failed. Please try again.",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
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

  window.resetCreateBatchForm = function () {
    createForm.reset();
    pendingBatchPayload = null;
  };

  window.openBatchConfirmation = function () {
    const payload = collectCreateBatchPayload();

    const error = validateCreateBatch(payload);
    if (error) {
      Toastify({
        text: error,
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
      return;
    }

    fillBatchConfirmModal(payload);

    pendingBatchPayload = payload;
    modal.show();
  };

  window.confirmCreateBatch = async function () {
    if (!pendingBatchPayload) {
      Toastify({
        text: "Nothing to submit.",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
      return;
    }

    const confirmBtn = modalEl.querySelector(".modal-footer .btn.btn-primary");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Creating...`;
    }

    try {
      const response = await fetch("/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(pendingBatchPayload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        Toastify({
          text: data.message || "Batch creation failed",
          duration: 3000,
          gravity: "top",
          position: "center",
          style: { background: "#b00020" },
        }).showToast();
        return;
      }

      modal.hide();
      createForm.reset();
      pendingBatchPayload = null;

      Toastify({
        text: data.message || "Batch created successfully",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: " #02630c" },
      }).showToast();
    } catch (err) {
      Toastify({
        text: "Server unavailable. Please try again.",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `Confirm & Create`;
      }
    }
  };

  window.resetExportForm = function () {
    exportForm.reset();
  };

  window.exportBatchData = async function () {
    const payload = collectExportPayload();

    const error = validateExport(payload);
    if (error) {
      Toastify({
        text: error,
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
      return;
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Exporting...`;
    }

    try {
      const response = await fetch("/batch/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        Toastify({
          text: errData.message || "Export failed",
          duration: 3000,
          gravity: "top",
          position: "center",
          style: { background: "#b00020" },
        }).showToast();
        return;
      }

      const blob = await response.blob();

      const fileExt = payload.exportFormat.toLowerCase() === "csv" ? "csv" : "pdf";
      const defaultName = `${payload.batchNumber}_${payload.exportType}.${fileExt}`;

      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const fileName = parseFilenameFromHeader(contentDisposition) || defaultName;

      downloadBlob(blob, fileName);
    } catch (err) {
      Toastify({
        text: "Server unavailable. Please try again.",
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: "#b00020" },
      }).showToast();
    } finally {
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = `<i class="fas fa-file-export me-1"></i> Export`;
      }
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
     HELPERS
  ====================== */

  function collectCreateBatchPayload() {
    return {
      P_PROD_ID: Number((prodIdInput?.value || "").trim()),
      P_GENERIC: (genericInput?.value || "").trim(),
      P_PROD_NAME: (prodNameInput?.value || "").trim(),
      P_BATCH: (batchInput?.value || "").trim(),
      P_LOT_NO: (lotNoInput?.value || "").trim(),
      P_MNF_DATE: (mnfDateInput?.value || "").trim(), // yyyy-mm-dd
      P_EXP_DATE: (expDateInput?.value || "").trim(), // yyyy-mm-dd
      P_BATCH_SIZE: Number((batchSizeInput?.value || "").trim()),
      P_UOM: (uomInput?.value || "").trim(),
      timezone: getTimezone(),
    };
  }

  function validateCreateBatch(p) {
    if (!p.P_PROD_ID || Number.isNaN(p.P_PROD_ID) || p.P_PROD_ID < 1) {
      return "Product ID must be a positive number.";
    }
    if (!p.P_GENERIC || p.P_GENERIC.length < 2) return "Generic is too short.";
    if (!p.P_PROD_NAME || p.P_PROD_NAME.length < 2) return "Product name is too short.";
    if (!p.P_BATCH || p.P_BATCH.length < 3) return "Batch looks too short.";
    if (!p.P_LOT_NO || p.P_LOT_NO.length < 2) return "Lot number is required.";
    if (!p.P_MNF_DATE) return "Please select manufacturing date.";
    if (!p.P_EXP_DATE) return "Please select expiry date.";
    if (!p.P_BATCH_SIZE || Number.isNaN(p.P_BATCH_SIZE) || p.P_BATCH_SIZE < 1) {
      return "Batch size must be at least 1.";
    }
    if (!p.P_UOM || p.P_UOM.length < 1) return "Please enter UOM.";

    const mnf = new Date(p.P_MNF_DATE);
    const exp = new Date(p.P_EXP_DATE);
    if (String(mnf) === "Invalid Date") return "Manufacturing date is invalid.";
    if (String(exp) === "Invalid Date") return "Expiry date is invalid.";
    if (exp <= mnf) return "Expiry date must be after manufacturing date.";

    return null;
  }

  function fillBatchConfirmModal(p) {
    confirmProdId.textContent = String(p.P_PROD_ID || "—");
    confirmGeneric.textContent = p.P_GENERIC || "—";
    confirmProdName.textContent = p.P_PROD_NAME || "—";
    confirmBatch.textContent = p.P_BATCH || "—";
    if (confirmLotNo) confirmLotNo.textContent = p.P_LOT_NO || "—"; // safe
    confirmMnfDate.textContent = p.P_MNF_DATE || "—";
    confirmExpDate.textContent = p.P_EXP_DATE || "—";
    confirmBatchSize.textContent = String(p.P_BATCH_SIZE || "—");
    confirmUom.textContent = p.P_UOM || "—";
  }

  function collectExportPayload() {
    return {
      batchNumber: exportBatchInput.value.trim(),
      exportType: exportTypeSelect.value,
      exportFormat: exportFormatSelect.value,
      timezone: getTimezone(),
    };
  }

  function validateExport(p) {
    if (!p.batchNumber) return "Please enter a batch number.";
    if (!p.exportType) return "Please select export content.";
    if (!p.exportFormat) return "Please select file format.";
    if (p.batchNumber.length < 3) return "Batch number looks too short.";
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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseFilenameFromHeader(contentDisposition) {
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(contentDisposition);
    const name = match ? (match[1] || match[2]) : null;
    return name ? decodeURIComponent(name) : null;
  }
});
