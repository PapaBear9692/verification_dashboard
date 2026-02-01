// static/js/register.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  const usernameInput = document.getElementById("username");
  const employeeIdInput = document.getElementById("employeeID");
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const roleSelect = document.getElementById("role");

  const registerBtn = document.getElementById("registerBtn");
  const confirmBtn = document.getElementById("confirmRegisterBtn");

  const modalEl = document.getElementById("registerConfirmModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  // modal fields
  const confirmFullName = document.getElementById("confirmFullName");
  const confirmUsername = document.getElementById("confirmUsername"); // your modal label says Email, but we will show Username
  const confirmPhone = document.getElementById("confirmPhone");
  const confirmRole = document.getElementById("confirmRole");

  // keep data until user clicks Confirm
  let pendingPayload = null;

  // set timezone hidden input (also supports body onload="getTimeZone()")
  setTimeZoneHiddenInput();

  /* =====================
     FORM SUBMIT (OPEN MODAL)
  ====================== */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = collectPayload();

    /* =====================
       FRONTEND VALIDATION
    ====================== */
    const error = validate(payload);
    if (error) {
      alert(error);
      return;
    }

    fillConfirmModal(payload);
    pendingPayload = payload;
    modal.show();
  });

  /* =====================
     CONFIRM BUTTON (SEND TO BACKEND)
  ====================== */
  confirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!pendingPayload) return;

    // re-validate (in case user changed something and reopened)
    const error = validate(pendingPayload);
    if (error) {
      alert(error);
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Creating...`;

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pendingPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || "Registration failed");
      } else {
        // success → redirect if backend provides it
        resetRegisterForm();
        modal.hide();
        window.location.href = data.redirect;
      }
    } catch (err) {
      alert("Server unavailable. Please try again.");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `Confirm`;
      pendingPayload = null;
    }
  });

  /* =====================
     OPTIONAL: LIVE CHECK (PASSWORD MATCH)
  ====================== */
  confirmPasswordInput.addEventListener("input", () => {
    if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity("Passwords do not match");
    } else {
      confirmPasswordInput.setCustomValidity("");
    }
  });

  passwordInput.addEventListener("input", () => {
    if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity("Passwords do not match");
    } else {
      confirmPasswordInput.setCustomValidity("");
    }
  });

  /* =====================
     EXPOSE GLOBAL FUNCTIONS
     (because your HTML uses onload / onclick)
  ====================== */
  window.openConfirmModal = function (event) {
    // keep compatibility with: onsubmit="openConfirmModal(event)"
    if (event) event.preventDefault();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  };

  window.confirmRegistration = function () {
    // keep compatibility with: onclick="confirmRegistration()"
    confirmBtn.click();
  };

  window.resetRegisterForm = function () {
    resetRegisterForm();
  };

  window.getTimeZone = function () {
    setTimeZoneHiddenInput();
  };

  /* =====================
     HELPER FUNCTIONS
  ====================== */

  function collectPayload() {
    return {
      username: usernameInput.value.trim(),
      employeeID: String(employeeIdInput.value || "").trim(),
      fullName: fullNameInput.value.trim(),
      phone: phoneInput.value.trim(),
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      role: roleSelect.value,
      timezone: getTimezone()
    };
  }

  function validate(p) {
    if (!p.username || !p.employeeID || !p.fullName || !p.password || !p.confirmPassword || !p.role) {
      return "All required fields must be filled";
    }

    if (p.username.length < 3) {
      return "Username must be at least 3 characters";
    }

    // Employee ID digits only (if you want EXACTLY 8 digits, change to /^\d{8}$/)
    if (!/^\d{6,12}$/.test(p.employeeID)) {
      return "Employee ID must be digits only (6–12 digits)";
    }

    // Phone optional, but if present must be BD format 01XXXXXXXXX
    if (p.phone && !/^01\d{9}$/.test(p.phone)) {
      return "Phone must be 11 digits and start with 01 (e.g., 01XXXXXXXXX)";
    }

    if (p.password.length < 8 || p.password.length > 16) {
      return "Password must be 8–16 characters long";
    }

    if (p.password !== p.confirmPassword) {
      return "Passwords do not match";
    }

    return null;
  }

  function fillConfirmModal(p) {
    confirmFullName.textContent = p.fullName || "-";
    confirmUsername.textContent = p.username || "-"; 
    confirmPhone.textContent = p.phone || "-";

    // show visible role label (Administrator/Viewer)
    const selectedText =
      roleSelect.options[roleSelect.selectedIndex] &&
      roleSelect.options[roleSelect.selectedIndex].text
        ? roleSelect.options[roleSelect.selectedIndex].text
        : p.role;

    confirmRole.textContent = selectedText || "-";
  }

  function resetRegisterForm() {
    form.reset();
    pendingPayload = null;
    confirmPasswordInput.setCustomValidity("");
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
    let tzInput = form.querySelector("input[name='timezone']");
    if (!tzInput) {
      tzInput = document.createElement("input");
      tzInput.type = "hidden";
      tzInput.name = "timezone";
      form.appendChild(tzInput);
    }
    tzInput.value = tz;
  }
});
