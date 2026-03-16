// static/js/register.js

document.addEventListener("DOMContentLoaded", () => {
  // ===== Validation Configuration =====
  const VALIDATION_RULES = {
    username: {
      required: true,
      minLength: 3,
      message: {
        required: "Username is required",
        minLength: "Username must be at least 3 characters"
      }
    },
    employeeId: {
      required: true,
      pattern: /^\d{8}$/,
      message: {
        required: "Employee ID is required",
        pattern: "Employee ID must be exactly 8 digits (e.g., 12345678)"
      }
    },
    fullName: {
      required: true,
      message: { required: "Full Name is required" }
    },
    phone: {
      required: true,
      pattern: /^01\d{9}$/,
      numeric: true,
      message: {
        required: "Phone number is required",
        pattern: "Phone must be 11 digits and start with 01 (e.g., 01XXXXXXXXX)"
      }
    },
    email: {
      required: false,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: {
        pattern: "Email format is invalid"
      }
    },
    role: {
      required: true,
      message: { required: "Please select a role" }
    },
    password: {
      required: true,
      rules: {
        minLength: { test: v => v.length >= 8, label: "At least 8 characters" },
        maxLength: { test: v => v.length <= 16, label: "No more than 16 characters" },
        noSpace: { test: v => !/\s/.test(v), label: "No spaces allowed" },
        hasLower: { test: v => /[a-z]/.test(v), label: "At least one lowercase letter (a–z)" },
        hasUpper: { test: v => /[A-Z]/.test(v), label: "At least one uppercase letter (A–Z)" },
        hasNumber: { test: v => /[0-9]/.test(v), label: "At least one number (0–9)" },
        hasSpecial: { test: v => /[^a-zA-Z0-9\s]/.test(v), label: "At least one special character (!@#$…)" }
      }
    }
  };

  const TOASTIFY_CONFIG = {
    text,
    duration: 4000,
    gravity: "top",
    position: "center",
    style: { background: type === "error" ? "#b00020" : "#02630c" },
  };
  

  const PASSWORD_RULES_STYLE = "list-style:none;padding:0.4rem 0 0;margin:0;font-size:0.78rem;line-height:1.8;";

  // ===== DOM Elements =====
  const form = document.getElementById("registerForm");
  const usernameInput = document.getElementById("username");
  const employeeIdInput = document.getElementById("employeeId");
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

  const confirmFullName = document.getElementById("confirmFullName");
  const confirmUsername = document.getElementById("confirmUsername");
  const confirmPhone = document.getElementById("confirmPhone");
  const confirmRole = document.getElementById("confirmRole");

  // ===== State =====
  let pendingPayload = null;
  let isSubmitting = false; // Prevent double submission

  // ===== Initialization =====
  setTimeZoneHiddenInput();
  registerBtn.disabled = true;

  // ===== Helper Functions =====

  function showToast(message) {
    Toastify({ text: message, ...TOASTIFY_CONFIG }).showToast();
  }

  function setErrorMessage(fieldId, message) {
    const errorElement = document.getElementById(fieldId + "Error");
    if (errorElement) errorElement.textContent = message;
  }

  function clearAllErrors() {
    document.querySelectorAll("[id$='Error']").forEach(el => (el.textContent = ""));
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

  // ===== Real-Time Validation Setup =====

  // Username validation
  usernameInput.addEventListener("input", () => {
    const value = usernameInput.value.trim();
    const rule = VALIDATION_RULES.username;
    
    if (!value) {
      setErrorMessage("username", rule.message.required);
    } else if (value.length < rule.minLength) {
      setErrorMessage("username", rule.message.minLength);
    } else {
      setErrorMessage("username", "");
    }
  });

  // Employee ID validation
  employeeIdInput.addEventListener("input", () => {
    const value = employeeIdInput.value.trim();
    const rule = VALIDATION_RULES.employeeId;

    if (!value) {
      setErrorMessage("employeeId", rule.message.required);
    } else if (!rule.pattern.test(value)) {
      setErrorMessage("employeeId", rule.message.pattern);
    } else {
      setErrorMessage("employeeId", "");
    }
  });

  // Full Name validation
  fullNameInput.addEventListener("input", () => {
    const value = fullNameInput.value.trim();
    setErrorMessage("fullName", !value ? VALIDATION_RULES.fullName.message.required : "");
  });

  // Email validation
  email.addEventListener("input", () => {
    const value = email.value.trim();
    const rule = VALIDATION_RULES.email;
    
    if (value && !rule.pattern.test(value)) {
      setErrorMessage("email", rule.message.pattern);
    } else {
      setErrorMessage("email", "");
    }
  });

  // Role validation
  roleSelect.addEventListener("change", () => {
    setErrorMessage("role", !roleSelect.value ? VALIDATION_RULES.role.message.required : "");
  });

  // Phone validation
  phoneInput.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, "");
    const value = phoneInput.value;
    const rule = VALIDATION_RULES.phone;

    if (!value) {
      setErrorMessage("phone", rule.message.required);
    } else if (!rule.pattern.test(value)) {
      setErrorMessage("phone", rule.message.pattern);
    } else {
      setErrorMessage("phone", "");
    }
  });

  // ===== Password Validation =====

  function getPasswordRules(value) {
    const rules = VALIDATION_RULES.password.rules;
    const result = {};
    Object.keys(rules).forEach(key => {
      result[key] = rules[key].test(value);
    });
    return result;
  }

  function isPasswordValid(value) {
    const rules = getPasswordRules(value);
    return Object.values(rules).every(v => v);
  }

  function renderPasswordRules(rules) {
    const containerId = "passwordRulesHint";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("ul");
      container.id = containerId;
      container.style.cssText = PASSWORD_RULES_STYLE;
      const errorSpan = document.getElementById("passwordError");
      errorSpan.parentNode.insertBefore(container, errorSpan.nextSibling);
    }

    const ruleConfig = VALIDATION_RULES.password.rules;
    container.innerHTML = Object.entries(ruleConfig)
      .map(([key, { label }]) => {
        const passed = rules[key];
        const color = passed ? "#027f0f" : "#6b7280";
        const icon = passed ? "✔" : "✖";
        return `<li style="color:${color}"><span style="margin-right:0.4rem">${icon}</span>${label}</li>`;
      })
      .join("");
  }

  function checkPasswordMatch() {
    const password = passwordInput.value;
    const confirm = confirmPasswordInput.value;
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
      registerBtn.disabled = !isPasswordValid(password);
    } else {
      errorSpan.textContent = "Passwords do not match";
      errorSpan.classList.remove("text-success");
      errorSpan.classList.add("text-danger");
      registerBtn.disabled = true;
    }
  }

  passwordInput.addEventListener("input", () => {
    const rules = getPasswordRules(passwordInput.value);
    renderPasswordRules(rules);

    if (isPasswordValid(passwordInput.value)) {
      setErrorMessage("password", "");
    }

    checkPasswordMatch();
  });

  confirmPasswordInput.addEventListener("input", checkPasswordMatch);

  // ===== Form Events =====

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = collectPayload();
    const error = validate(payload);
    
    if (error) return;
    
    fillConfirmModal(payload);
    pendingPayload = payload;
    modal.show();
  });

  confirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!pendingPayload || isSubmitting) return; // Prevent double submission

    const error = validate(pendingPayload);
    if (error) {
      showToast(error);
      return;
    }

    isSubmitting = true;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Validating...`;

    const csrfToken = document.querySelector('input[name="csrf_token"]').value;
    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(pendingPayload)
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }
      
      if (!response.ok) {
        showToast(data.message || "Registration failed");
        modal.hide();
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `Confirm`;
        isSubmitting = false;
        
        // Refresh page after 3 seconds to allow user to see the error notification
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        resetRegisterForm();
        modal.hide();
        confirmBtn.innerHTML = `<i class="fas fa-check me-1"></i> OTP Sent`;
        setTimeout(() => {
          window.location.href = data.redirect;
        }, 500);
      }
    } catch (error) {
      showToast("Server unavailable. Please try again.");
      modal.hide();
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `Confirm`;
      isSubmitting = false;
      
      // Refresh page after 3 seconds to allow user to see the error notification
      setTimeout(() => {
        window.location.reload();
      }, 6000);
    } finally {
      pendingPayload = null;
    }
  });

  // ===== Validation Logic =====

  function collectPayload() {
    return {
      username: usernameInput.value.trim(),
      employeeId: String(employeeIdInput.value || "").trim(),
      fullName: fullNameInput.value.trim(),
      phone: phoneInput.value.trim(),
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      role: roleSelect.value,
      email: email.value.trim(),
      timezone: getTimezone()
    };
  }

  function validate(p) {
    let hasError = false;
    clearAllErrors();

    // Required fields validation
    if (!p.username || !p.employeeId || !p.fullName || !p.phone || !p.password || !p.confirmPassword || !p.role) {
      setErrorMessage("username", "All required fields must be filled");
      return "Please correct the errors above.";
    }

    // Individual field validations
    if (p.username.length < VALIDATION_RULES.username.minLength) {
      setErrorMessage("username", VALIDATION_RULES.username.message.minLength);
      hasError = true;
    }

    if (!VALIDATION_RULES.employeeId.pattern.test(p.employeeId)) {
      setErrorMessage("employeeId", VALIDATION_RULES.employeeId.message.pattern);
      hasError = true;
    }

    if (!VALIDATION_RULES.phone.pattern.test(p.phone)) {
      setErrorMessage("phone", VALIDATION_RULES.phone.message.pattern);
      hasError = true;
    }

    if (p.email && !VALIDATION_RULES.email.pattern.test(p.email)) {
      setErrorMessage("email", VALIDATION_RULES.email.message.pattern);
      hasError = true;
    }

    // Password validation
    if (!isPasswordValid(p.password)) {
      setErrorMessage("password", "Password does not meet all requirements");
      hasError = true;
    }

    if (p.password !== p.confirmPassword) {
      setErrorMessage("confirmPassword", "Passwords do not match");
      hasError = true;
    }

    return hasError ? "Please correct the errors above." : null;
  }

  function fillConfirmModal(p) {
    confirmFullName.textContent = p.fullName || "-";
    confirmUsername.textContent = p.username || "-";
    confirmPhone.textContent = p.phone || "-";

    const selectedText =
      roleSelect.options[roleSelect.selectedIndex]?.text || p.role;
    confirmRole.textContent = selectedText || "-";
  }

  function resetRegisterForm() {
    form.reset();
    pendingPayload = null;
    confirmPasswordInput.setCustomValidity("");
    
    const rulesEl = document.getElementById("passwordRulesHint");
    if (rulesEl) rulesEl.innerHTML = "";

    clearAllErrors();
    registerBtn.disabled = true;
  }

  // ===== Global Functions =====

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
});