// static/js/reset.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");

  const usernameInput = document.getElementById("username");
  const employeeIdInput = document.getElementById("employeeId");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

  const matchError = document.getElementById("matchError");
  const submitBtn = document.getElementById("submitBtn");
  const approvalBox = document.getElementById("approvalBox");

  // Create an error box above the form (keeps design; uses Bootstrap alert)
  const errorBox = createErrorBox();
  form.prepend(errorBox);

  // Live validation (enable button only when valid)
  [usernameInput, employeeIdInput, newPasswordInput, confirmNewPasswordInput].forEach((el) => {
    el.addEventListener("input", validateLive);
  });

  // initial state
  validateLive();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    const employeeId = employeeIdInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    /* =====================
       FRONTEND VALIDATION
    ====================== */

    const error = validate({ username, employeeId, newPassword, confirmNewPassword });
    if (error) {
      showError(error);
      return;
    }

    /* =====================
       SUBMIT TO BACKEND
    ====================== */

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Submitting...`;

    try {
      // Change this endpoint if your Flask route differs
      const response = await fetch("/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          employee_id: employeeId,
          new_password: newPassword,
          confirm_password: confirmNewPassword
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.message || "Request failed");
        // allow retry after failure
        submitBtn.disabled = false;
        return;
      }

      // success UI
      form.classList.add("d-none");
      approvalBox.classList.remove("d-none");

      // clear fields
      usernameInput.value = "";
      employeeIdInput.value = "";
      newPasswordInput.value = "";
      confirmNewPasswordInput.value = "";
    } catch (err) {
      showError("Server unavailable. Please try again.");
      submitBtn.disabled = false;
    } finally {
      submitBtn.innerHTML = `<i class="fas fa-paper-plane me-1"></i> Submit request`;
    }
  });

  /* =====================
     HELPER FUNCTIONS
  ====================== */

  function validateLive() {
    const username = usernameInput.value.trim();
    const employeeId = employeeIdInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    // show/hide match message
    const matchOk = !confirmNewPassword || newPassword === confirmNewPassword;
    matchError.classList.toggle("d-none", matchOk);

    // enable submit only if minimum validity is met
    const canSubmit =
      username.length >= 3 &&
      employeeId.length >= 3 &&
      newPassword.length >= 8 &&
      newPassword.length <= 16 &&
      confirmNewPassword.length >= 8 &&
      confirmNewPassword.length <= 16 &&
      newPassword === confirmNewPassword;

    submitBtn.disabled = !canSubmit;
  }

  function validate({ username, employeeId, newPassword, confirmNewPassword }) {
    if (!username || !employeeId || !newPassword || !confirmNewPassword) {
      return "All fields are required";
    }

    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }

    // If your employee IDs are numeric-only, uncomment this:
    // if (!/^\d+$/.test(employeeId)) return "Employee ID must be numeric";

    if (employeeId.length < 3) {
      return "Employee ID is too short";
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      return "Password must be 8–16 characters long";
    }

    if (newPassword !== confirmNewPassword) {
      return "Passwords do not match";
    }

    return null;
  }

  function createErrorBox() {
    const div = document.createElement("div");
    div.id = "resetError";
    div.className = "alert alert-danger d-none";
    div.setAttribute("role", "alert");
    return div;
  }

  function showError(message) {
    errorBox.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${message}`;
    errorBox.classList.remove("d-none");
  }

  function hideError() {
    errorBox.classList.add("d-none");
  }
});
