// static/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  // ===== Validation Configuration =====
  const VALIDATION_RULES = {
    username: {
      required: true,
      minLength: 3,
      message: {
        required: "Username and password are required",
        minLength: "Username must be at least 3 characters"
      }
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 16,
      message: {
        required: "Username and password are required",
        length: "Password must be 8–16 characters long"
      }
    }
  };

  const UI_TEXT = {
    submit: { default: `<i class="fas fa-lock me-1"></i> Login`, loading: `<i class="fas fa-spinner fa-spin me-1"></i> Signing in...` },
    error: { server: "Server unavailable. Please try again.", default: "Login failed" }
  };

  // ===== DOM Elements =====
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");
  const submitBtn = form.querySelector("button[type='submit']");

  // ===== Helper Functions =====

  function showError(message) {
    errorBox.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${message}`;
    errorBox.classList.remove("d-none");
  }

  function hideError() {
    errorBox.classList.add("d-none");
  }

  function setButtonLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading ? UI_TEXT.submit.loading : UI_TEXT.submit.default;
  }

  function clearInputs() {
    usernameInput.value = "";
    passwordInput.value = "";
  }

  // ===== Validation =====

  function validate(username, password) {
    if (!username || !password) {
      showError(VALIDATION_RULES.username.message.required);
      return false;
    }

    if (username.length < VALIDATION_RULES.username.minLength) {
      showError(VALIDATION_RULES.username.message.minLength);
      return false;
    }

    const passRules = VALIDATION_RULES.password;
    if (password.length < passRules.minLength || password.length > passRules.maxLength) {
      showError(passRules.message.length);
      return false;
    }

    return true;
  }

  // ===== Form Events =====

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!validate(username, password)) {
      return;
    }

    setButtonLoading(true);

    try {
      const response = await fetch("login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      clearInputs();

      if (!response.ok) {
        showError(data.message || UI_TEXT.error.default);
      } else {
        window.location.href = data.redirect;
      }
    } catch {
      showError(UI_TEXT.error.server);
    } finally {
      setButtonLoading(false);
    }
  });
});
