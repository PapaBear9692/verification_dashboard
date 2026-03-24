// batch.js — Assign Lot & Security Codes page

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     LOT LOOKUP
     Calls POST /get/lot with the typed lot number.
     Returns { count } on success, null if not found, throws on error.
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
     ELEMENTS
  ============================================================ */
  const backToTopBtn = document.getElementById("backToTopBtn");
  const brandInput   = document.getElementById("brandInput");
  const codeInput    = document.getElementById("codeInput");
  const lotTableBody = document.getElementById("lotTableBody");
  const totalCodesEl = document.getElementById("totalCodes");
  const availableCodesEl = document.getElementById("availableCodes");
  const usedCodesEl = document.getElementById("usedCodes");


  /* ============================================================
     LOT ASSIGNMENT TABLE
     • Col 1: Lot Number (user types)
     • Col 2: Available Security Codes (auto-filled from /get/lot)
     • New row appears automatically after a valid lookup on the last row
     • tfoot shows running total
  ============================================================ */
  const _lotDebounceTimers = {};
  const _lotCountCache     = {};
  let   _lotRowCounter     = 0;

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
               placeholder="e.g. 26A${String(id).padStart(3, "0")}"
               autocomplete="off"
               oninput="this.value = this.value.toUpperCase()">
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

    const lotInput = tr.querySelector(`#lotInput${id}`);
    lotInput.addEventListener("input", () => _onLotInput(id));
    lotInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); _focusNextEmptyLot(id); }
    });

    tr.querySelector(`[data-del-row="${id}"]`).addEventListener("click", () => _deleteLotRow(id));

    if (autoFocus) setTimeout(() => lotInput.focus(), 40);
  }

  async function _onLotInput(rowId) {
    const lotInput = document.getElementById(`lotInput${rowId}`);
    const codeCell = document.getElementById(`lotCodeCell${rowId}`);
    if (!lotInput || !codeCell) return;

    const raw = lotInput.value.trim();

    if (!raw) {
      _setCodeCell(codeCell, "empty", null);
      _lotCountCache[rowId] = null;
      lotInput.classList.remove("is-valid", "is-invalid", "field-no-match");
      updateSecCodeTotal();
      return;
    }

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
          if (_isLastRow(rowId)) _createLotTableRow({ autoFocus: false });
        } else {
          _lotCountCache[rowId] = null;
          _setCodeCell(codeCell, "not-found", null);
          lotInput.classList.add("field-no-match");
          lotInput.classList.remove("is-valid", "is-invalid");
        }
      } catch {
        _lotCountCache[rowId] = null;
        _setCodeCell(codeCell, "not-found", null);
      }
      updateSecCodeTotal();
    }, 450);
  }

  function _deleteLotRow(rowId) {
    if (!lotTableBody) return;
    const rows = lotTableBody.querySelectorAll("tr[data-lot-row-id]");
    if (rows.length <= 1) {
      const lotInput = document.getElementById(`lotInput${rowId}`);
      const codeCell = document.getElementById(`lotCodeCell${rowId}`);
      if (lotInput) { lotInput.value = ""; lotInput.className = "form-control lot-input"; }
      if (codeCell) _setCodeCell(codeCell, "empty", null);
      _lotCountCache[rowId] = null;
      updateSecCodeTotal();
      return;
    }
    const tr = lotTableBody.querySelector(`tr[data-lot-row-id="${rowId}"]`);
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

  function _focusNextEmptyLot(currentRowId) {
    if (!lotTableBody) return;
    const rows = Array.from(lotTableBody.querySelectorAll("tr[data-lot-row-id]"));
    const ci   = rows.findIndex(r => r.dataset.lotRowId === String(currentRowId));
    for (let i = ci + 1; i < rows.length; i++) {
      const inp = rows[i].querySelector(".lot-input");
      if (inp && !inp.value.trim()) { inp.focus(); return; }
    }
  }

  // Initialise with one empty row
  if (lotTableBody) _createLotTableRow();

  // Load code summary
  loadCodeSummary();


  /* ============================================================
     GLOBAL FUNCTIONS
  ============================================================ */

  window.getTimeZone = function () {};  // called by <body onload> — no-op on this page

  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.toggleLotConfirmPasswordVisibility = function () {
    const input = document.getElementById("lotConfirmPassword");
    const icon  = document.getElementById("lotConfirmPasswordEyeIcon");
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    if (icon) {
      icon.classList.toggle("fa-eye",       !isHidden);
      icon.classList.toggle("fa-eye-slash",  isHidden);
    }
  };

  window.logoutUser = async function () {
    try {
      const response = await fetch("/logout", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });

      let data = null;
      try { data = await response.json(); } catch (_) {}

      if (response.ok) {
        window.location.href = data?.redirect ?? "/login";
        return;
      }
      showToast(data?.message || "Logout failed. Please try again.", "error");
    } catch {
      showToast("Server unavailable. Please try again.", "error");
    }
  };


  /* ============================================================
     LOT ASSIGNMENT FORM
  ============================================================ */

  window.resetLotForm = function () {
    const lotForm = document.getElementById("lotAssignForm");
    if (!lotForm) return;
    lotForm.reset();
    lotForm.querySelectorAll(".is-invalid, .is-valid, .field-no-match").forEach(el =>
      el.classList.remove("is-invalid", "is-valid", "field-no-match")
    );
    if (lotTableBody) lotTableBody.innerHTML = "";
    Object.keys(_lotCountCache).forEach(k => delete _lotCountCache[k]);
    Object.keys(_lotDebounceTimers).forEach(k => clearTimeout(_lotDebounceTimers[k]));
    _lotRowCounter = 0;
    _createLotTableRow();
    updateSecCodeTotal();
  };

  window.submitLotAssignment = function () {
    const lotForm = document.getElementById("lotAssignForm");
    if (!lotForm) return;

    let hasError = false;

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

    const rows = [];
    const allLotRows = lotTableBody
      ? Array.from(lotTableBody.querySelectorAll("tr[data-lot-row-id]"))
      : [];

    allLotRows.forEach((tr, i) => {
      const rowId    = tr.dataset.lotRowId;
      const lotInput = tr.querySelector(".lot-input");
      const lotVal   = lotInput?.value.trim() ?? "";
      const count    = _lotCountCache[rowId];

      // Skip the empty auto-appended trailing row
      if (!lotVal && count === null) return;

      if (!lotVal || lotVal.length !== 6) {
        lotInput?.classList.add("is-invalid");
        lotInput?.classList.remove("is-valid");
        hasError = true;
      } else {
        lotInput?.classList.remove("is-invalid");
        lotInput?.classList.add("is-valid");
      }

      if (!count || isNaN(count) || count < 1) hasError = true;

      rows.push({ row: i + 1, lotNumber: lotVal });
    });

    if (hasError) {
      showToast("Please fill in all fields correctly.", "error");
      return;
    }

    // Store payload and open confirmation modal
    _pendingLotPayload = { brand, code, lots: rows };

    const modalCode  = document.getElementById("lotConfirmCode");
    const modalBrand = document.getElementById("lotConfirmBrand");
    const modalBody  = document.getElementById("lotConfirmTableBody");
    const modalTotal = document.getElementById("lotConfirmTotal");

    if (modalCode)  modalCode.textContent  = code;
    if (modalBrand) modalBrand.textContent = brand;

    if (modalBody) {
      modalBody.innerHTML = rows.map((r, i) => {
        const rowId = allLotRows.find(tr =>
          tr.querySelector(".lot-input")?.value.trim() === r.lotNumber
        )?.dataset.lotRowId;
        const count = typeof _lotCountCache[rowId] === "number"
          ? _lotCountCache[rowId].toLocaleString()
          : "—";
        return `
          <tr>
            <td style="padding:0.45rem 0.8rem; border-bottom:1px solid #f0f1f5;
                       color:#6b7280; font-size:0.82rem;">${i + 1}</td>
            <td style="padding:0.45rem 0.8rem; border-bottom:1px solid #f0f1f5;">
              <span class="font-monospace">${r.lotNumber}</span>
            </td>
            <td style="padding:0.45rem 0.8rem; border-bottom:1px solid #f0f1f5;
                       text-align:right; font-weight:600; color:var(--brand);">${count}</td>
          </tr>
        `;
      }).join("");
    }

    if (modalTotal) modalTotal.textContent = rows.length;

    const modalSecTotal = document.getElementById("lotConfirmSecTotal");
    if (modalSecTotal) {
      const secTotal = rows.reduce((sum, r) => {
        const rowId = allLotRows.find(tr =>
          tr.querySelector(".lot-input")?.value.trim() === r.lotNumber
        )?.dataset.lotRowId;
        return sum + (typeof _lotCountCache[rowId] === "number" ? _lotCountCache[rowId] : 0);
      }, 0);
      modalSecTotal.textContent = secTotal.toLocaleString();
    }

    const lotModalEl = document.getElementById("lotAssignConfirmModal");
    if (lotModalEl) {
      const pwInput = document.getElementById("lotConfirmPassword");
      const pwError = document.getElementById("lotConfirmPasswordError");
      if (pwInput) { pwInput.value = ""; pwInput.classList.remove("is-invalid"); }
      if (pwError) pwError.style.display = "none";
      bootstrap.Modal.getOrCreateInstance(lotModalEl).show();
    }
  };

  let _pendingLotPayload = null;

  window.confirmLotAssignment = async function () {
    if (!_pendingLotPayload) return;

    const pwInput  = document.getElementById("lotConfirmPassword");
    const pwError  = document.getElementById("lotConfirmPasswordError");
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


  /* ============================================================
     CODE SUMMARY
  ============================================================ */
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


  /* ============================================================
     SCROLL — BACK TO TOP
  ============================================================ */
  window.addEventListener("scroll", () => {
    if (!backToTopBtn) return;
    backToTopBtn.style.display = window.scrollY > 300 ? "flex" : "none";
  });


  /* ============================================================
     HELPERS
  ============================================================ */

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
    btn.innerHTML = loading
      ? `<i class="fas fa-spinner fa-spin me-1"></i> ${html}`
      : html;
  }

});