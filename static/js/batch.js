// static/js/batch.js

document.addEventListener("DOMContentLoaded", () => {
  /* =====================
     ELEMENTS
  ====================== */

  // Forms
  const createForm = document.getElementById("createBatchForm");
  const exportForm = document.getElementById("exportBatchForm");

  // Create Batch inputs (by name)
  const batchNumberInput = createForm.querySelector("input[name='batchNumber']");
  const codeCountInput = createForm.querySelector("input[name='codeCount']");
  const productInput = createForm.querySelector("input[name='product']");
  const productionDateInput = createForm.querySelector("input[name='productionDate']");
  const factoryInput = createForm.querySelector("input[name='factory']");
  const marketSelect = createForm.querySelector("select[name='market']");
  const notesInput = createForm.querySelector("textarea[name='notes']");

  // Export inputs (by name)
  const exportBatchInput = exportForm.querySelector("input[name='exportBatch']");
  const exportTypeSelect = exportForm.querySelector("select[name='exportType']");
  const exportFormatSelect = exportForm.querySelector("select[name='exportFormat']");

  // Modal + confirm fields
  const modalEl = document.getElementById("batchConfirmModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  const confirmBatchNumber = document.getElementById("confirmBatchNumber");
  const confirmCodeCount = document.getElementById("confirmCodeCount");
  const confirmProduct = document.getElementById("confirmProduct");
  const confirmProductionDate = document.getElementById("confirmProductionDate");
  const confirmFactory = document.getElementById("confirmFactory");
  const confirmMarket = document.getElementById("confirmMarket");
  const confirmNotes = document.getElementById("confirmNotes");

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

  window.logoutUser = async function () {
    try {
      await fetch("/logout", { method: "POST" });
    } catch (_) {
      // ignore
    } finally {
      window.location.href = "/login";
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

    /* =====================
       FRONTEND VALIDATION
    ====================== */
    const error = validateCreateBatch(payload);
    if (error) {
      alert(error);
      return;
    }

    // Fill modal preview
    fillBatchConfirmModal(payload);

    pendingBatchPayload = payload;
    modal.show();
  };

  window.confirmCreateBatch = async function () {
    if (!pendingBatchPayload) {
      alert("Nothing to submit.");
      return;
    }

    // best-effort: locate confirm button in modal footer
    const confirmBtn = modalEl.querySelector(".modal-footer .btn.btn-primary");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Creating...`;
    }

    try {
      const response = await fetch("/batch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingBatchPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || "Batch creation failed");
        return;
      }

      alert(data.message || "Batch created successfully");
      modal.hide();
      createForm.reset();
      pendingBatchPayload = null;
    } catch (err) {
      alert("Server unavailable. Please try again.");
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

    /* =====================
       FRONTEND VALIDATION
    ====================== */
    const error = validateExport(payload);
    if (error) {
      alert(error);
      return;
    }

    // best-effort: locate export button
    const exportBtn = exportForm.querySelector(".btn.btn-primary");
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Exporting...`;
    }

    try {
      // This endpoint should return a file (pdf/csv).
      // We'll request it and download it.
      const response = await fetch("/batch/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.message || "Export failed");
        return;
      }

      const blob = await response.blob();

      // filename (try from header, else fallback)
      const fileExt = payload.exportFormat.toLowerCase() === "csv" ? "csv" : "pdf";
      const defaultName = `${payload.batchNumber}_${payload.exportType}.${fileExt}`;

      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const fileName = parseFilenameFromHeader(contentDisposition) || defaultName;

      downloadBlob(blob, fileName);
    } catch (err) {
      alert("Server unavailable. Please try again.");
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
      batchNumber: batchNumberInput.value.trim(),
      codeCount: Number(codeCountInput.value),
      product: productInput.value.trim(),
      productionDate: productionDateInput.value, // yyyy-mm-dd
      factory: factoryInput.value.trim(),
      market: marketSelect.value,
      notes: notesInput.value.trim(),
      timezone: getTimezone()
    };
  }

  function validateCreateBatch(p) {
    if (!p.batchNumber || !p.product || !p.productionDate || !p.factory || !p.market) {
      return "Please fill all required fields.";
    }

    if (!p.codeCount || Number.isNaN(p.codeCount) || p.codeCount < 1) {
      return "Code count must be at least 1.";
    }

    // Basic batch pattern check (optional)
    if (p.batchNumber.length < 3) {
      return "Batch number looks too short.";
    }

    // Production date not in future (optional)
    const prod = new Date(p.productionDate);
    if (String(prod) !== "Invalid Date") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (prod > today) {
        return "Production date cannot be in the future.";
      }
    }

    if (p.product.length < 2) {
      return "Product name is too short.";
    }

    if (p.factory.length < 2) {
      return "Factory name is too short.";
    }

    // Prevent giant single-request creates (adjust as you like)
    if (p.codeCount > 200000) {
      return "Too many codes for one batch. Please use a smaller number.";
    }

    return null;
  }

  function fillBatchConfirmModal(p) {
    confirmBatchNumber.textContent = p.batchNumber || "—";
    confirmCodeCount.textContent = String(p.codeCount || "—");
    confirmProduct.textContent = p.product || "—";
    confirmProductionDate.textContent = p.productionDate || "—";
    confirmFactory.textContent = p.factory || "—";
    confirmMarket.textContent = p.market || "—";
    confirmNotes.textContent = p.notes ? p.notes : "—";
  }

  function collectExportPayload() {
    return {
      batchNumber: exportBatchInput.value.trim(),
      exportType: exportTypeSelect.value,     // summary | codes | both
      exportFormat: exportFormatSelect.value, // pdf | csv
      timezone: getTimezone()
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
    // supports: attachment; filename="file.pdf"
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(contentDisposition);
    const name = match ? (match[1] || match[2]) : null;
    return name ? decodeURIComponent(name) : null;
  }
});
