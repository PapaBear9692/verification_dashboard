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
  const email = document.getElementById("email");
  const registerBtn = document.getElementById("registerBtn");
  const confirmBtn = document.getElementById("confirmRegisterBtn");

  const modalEl = document.getElementById("registerConfirmModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  // modal fields
  const confirmFullName = document.getElementById("confirmFullName");
  const confirmUsername = document.getElementById("confirmUsername");
  const confirmPhone = document.getElementById("confirmPhone");
  const confirmRole = document.getElementById("confirmRole");
  const confirmEmail = document.getElementById("confirmEmail");

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
    REAL-TIME PASSWORD STRENGTH RULES
  ====================== */

  registerBtn.disabled = true; // Disable initially

  /**
   * Checks a single password against all rules.
   * Returns an object with a boolean per rule.
   */
  function getPasswordRules(value) {
    return {
      minLength:   value.length >= 8,
      noSpace:     !/\s/.test(value),
      hasLower:    /[a-z]/.test(value),
      hasUpper:    /[A-Z]/.test(value),
      hasNumber:   /[0-9]/.test(value),
    };
  }

  /**
   * Renders the live rule checklist below the password field.
   * Creates the <ul> on first call and updates it on subsequent calls.
   */
  function renderPasswordRules(rules) {
    const containerId = "passwordRulesHint";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("ul");
      container.id = containerId;
      container.style.cssText =
        "list-style:none;padding:0.4rem 0 0;margin:0;font-size:0.78rem;line-height:1.8;";
      // Insert right after the password error span
      const errorSpan = document.getElementById("passwordError");
      errorSpan.parentNode.insertBefore(container, errorSpan.nextSibling);
    }

    const items = [
      { key: "minLength", label: "At least 8 characters" },
      { key: "noSpace",   label: "No spaces allowed" },
      { key: "hasLower",  label: "At least one lowercase letter (a–z)" },
      { key: "hasUpper",  label: "At least one uppercase letter (A–Z)" },
      { key: "hasNumber", label: "At least one number (0–9)" },
    ];

    container.innerHTML = items
      .map(({ key, label }) => {
        const passed = rules[key];
        const color  = passed ? "#027f0f" : "#6b7280";
        const icon   = passed ? "✔" : "✖";
        return `<li style="color:${color}"><span style="margin-right:0.4rem">${icon}</span>${label}</li>`;
      })
      .join("");
  }

  /**
   * Returns true only when all password rules pass.
   */
  function isPasswordValid(value) {
    const r = getPasswordRules(value);
    return r.minLength && r.noSpace && r.hasLower && r.hasUpper && r.hasNumber;
  }

  function checkPasswordMatch() {
    const password = passwordInput.value;
    const confirm  = confirmPasswordInput.value;
    const errorSpan = document.getElementById("confirmPasswordError");

    if (!confirm) {
      errorSpan.textContent = "";
      registerBtn.disabled = true;
      return;
    }

    if (password === confirm) {
      errorSpan.textContent = "Passwords match ✔";
      errorSpan.classList.remove("text-danger");
      errorSpan.classList.add("text-success");
      // Only enable Register if password also passes all rules
      registerBtn.disabled = !isPasswordValid(password);
    } else {
      errorSpan.textContent = "Passwords do not match";
      errorSpan.classList.remove("text-success");
      errorSpan.classList.add("text-danger");
      registerBtn.disabled = true;
    }
  }

  // Live password rule feedback
  passwordInput.addEventListener("input", () => {
    const rules = getPasswordRules(passwordInput.value);
    renderPasswordRules(rules);

    // Clear password-level error once user starts fixing it
    if (isPasswordValid(passwordInput.value)) {
      document.getElementById("passwordError").textContent = "";
    }

    checkPasswordMatch();
  });

  confirmPasswordInput.addEventListener("input", checkPasswordMatch);

  /* =====================
     EXPOSE GLOBAL FUNCTIONS
     (because your HTML uses onload / onclick)
  ====================== */
  window.openConfirmModal = function (event) {
    if (event) event.preventDefault();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  };

  window.confirmRegistration = function () {
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
      username:        usernameInput.value.trim(),
      employeeID:      String(employeeIdInput.value || "").trim(),
      fullName:        fullNameInput.value.trim(),
      phone:           phoneInput.value.trim(),
      password:        passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      role:            roleSelect.value,
      email:           email.value.trim(),
      timezone:        getTimezone()
    };
  }

  function showErrorMessage(inputId, message) {
    const errorElement = document.getElementById(inputId + "Error");
    if (errorElement) errorElement.textContent = message;
  }

  function validate(p) {
    let hasError = false;

    // Clear previous errors
    document.querySelectorAll(".text-danger").forEach(el => (el.textContent = ""));

    if (!p.username || !p.employeeID || !p.fullName || !p.password || !p.confirmPassword || !p.role) {
      showErrorMessage("username", "All required fields must be filled");
      hasError = true;
    }

    if (p.username.length < 3) {
      showErrorMessage("username", "Username must be at least 3 characters");
      hasError = true;
    }

    if (!/^\d{10,10}$/.test(p.employeeID)) {
      showErrorMessage("employeeID", "Employee ID must be exactly 10 digits (e.g., 0000001667)");
      hasError = true;
    }

    if (p.phone && !/^01\d{9}$/.test(p.phone)) {
      showErrorMessage("phone", "Phone must be 11 digits and start with 01 (e.g., 01XXXXXXXXX)");
      hasError = true;
    }

    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
      showErrorMessage("email", "Email format is invalid");
      hasError = true;
    }

    // ── Password rules ──────────────────────────────────────────────
    if (/\s/.test(p.password)) {
      showErrorMessage("password", "Password must not contain spaces");
      hasError = true;
    } else if (p.password.length < 8) {
      showErrorMessage("password", "Password must be at least 8 characters long");
      hasError = true;
    } else if (!/[a-z]/.test(p.password)) {
      showErrorMessage("password", "Password must contain at least one lowercase letter");
      hasError = true;
    } else if (!/[A-Z]/.test(p.password)) {
      showErrorMessage("password", "Password must contain at least one uppercase letter");
      hasError = true;
    } else if (!/[0-9]/.test(p.password)) {
      showErrorMessage("password", "Password must contain at least one number (0–9)");
      hasError = true;
    }
    // ────────────────────────────────────────────────────────────────

    if (p.password !== p.confirmPassword) {
      showErrorMessage("confirmPassword", "Passwords do not match");
      hasError = true;
    }

    return hasError ? "Please correct the errors above." : null;
  }

  function fillConfirmModal(p) {
    confirmFullName.textContent = p.fullName || "-";
    confirmUsername.textContent = p.username || "-";
    confirmPhone.textContent    = p.phone    || "-";

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

    // Clear the live rule hints on reset
    const rulesEl = document.getElementById("passwordRulesHint");
    if (rulesEl) rulesEl.innerHTML = "";

    document.getElementById("confirmPasswordError").textContent = "";
    registerBtn.disabled = true;
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