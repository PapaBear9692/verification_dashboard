document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     ELEMENTS
  ====================== */

  // Steps
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const approvalBox = document.getElementById("approvalBox");
  const pageSubtitle = document.getElementById("pageSubtitle");

  // Step 1
  const requestOtpForm = document.getElementById("requestOtpForm");
  const usernameInput   = document.getElementById("username");
  const sendOtpBtn      = document.getElementById("sendOtpBtn");

  // Step 2
  const verifyOtpForm   = document.getElementById("verifyOtpForm");
  const usernameForOtp  = document.getElementById("usernameForOtp");
  const otpInput        = document.getElementById("otpInput");
  const otpHint         = document.getElementById("otpHint");
  const verifyOtpBtn    = document.getElementById("verifyOtpBtn");

  // Step 3
  const resetForm             = document.getElementById("resetForm");
  const usernameForReset      = document.getElementById("usernameForReset");
  const newPasswordInput      = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
  const matchError            = document.getElementById("matchError");
  const submitBtn             = document.getElementById("submitBtn");

  // Success
  const responseMsg = document.getElementById("responseMsg");

  // Shared error box (injected once, reused across steps)
  const errorBox = createErrorBox();
  document.querySelector(".auth-card").insertBefore(errorBox, step1);

  // Check if OTP was already verified (coming back from verify-otp page)
  const urlParams = new URLSearchParams(window.location.search);
  const usernameFromURL = urlParams.get('username');
  const stepFromURL = urlParams.get('step');

  if (usernameFromURL && stepFromURL === '3') {
    // User has verified OTP, show password reset step
    usernameForReset.value = decodeURIComponent(usernameFromURL);
    goToStep(3);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  /* =====================
     STEP 1 — Live validation & submit
  ====================== */

  usernameInput.addEventListener("input", () => {
    sendOtpBtn.disabled = usernameInput.value.trim().length < 3;
  });

  requestOtpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    if (username.length < 3) {
      showError("Username must be at least 3 characters.");
      return;
    }

    setLoading(sendOtpBtn, true, "Sending OTP...");

    try {
      const response = await fetch("reset/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.message || "Failed to send OTP. Please try again.");
        return;
      }

      // Redirect to verify-otp page with username and context
      window.location.href = `/verify-otp?username=${encodeURIComponent(username)}&context=reset`;

    } catch (err) {
      showError("Server unavailable. Please try again.");
    } finally {
      setLoading(sendOtpBtn, false, '<i class="fas fa-paper-plane me-1"></i> Send OTP');
    }
  });

  /* =====================
     STEP 2 — OTP input & verify (DEPRECATED - using shared verify-otp page)
  ====================== */

  // This step is now handled by the dedicated verify-otp page
  // The form handlers below remain for backward compatibility if needed

  // Only allow digits, enable button at 6 chars
  otpInput.addEventListener("input", () => {
    // Strip non-digits
    otpInput.value = otpInput.value.replace(/\D/g, "");
    verifyOtpBtn.disabled = otpInput.value.length !== 6;
  });

  verifyOtpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameForOtp.value;
    const otpValue = otpInput.value.trim();

    if (otpValue.length !== 6) {
      showError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(verifyOtpBtn, true, "Verifying...");

    try {
      const response = await fetch("reset/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp: otpValue }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.message || "Invalid OTP. Please try again.");
        return;
      }

      // Carry username to final step
      usernameForReset.value = username;
      goToStep(3);

    } catch (err) {
      showError("Server unavailable. Please try again.");
    } finally {
      setLoading(verifyOtpBtn, false, '<i class="fas fa-check-circle me-1"></i> Verify OTP');
    }
  });

  /* =====================
     STEP 3 — New password + live match check
  ====================== */

  function checkPasswordMatch() {
    const pw  = newPasswordInput.value;
    const cpw = confirmNewPasswordInput.value;

    const matchOk = !cpw || pw === cpw;
    matchError.classList.toggle("d-none", matchOk);

    const canSubmit =
      pw.length >= 8 &&
      pw.length <= 16 &&
      cpw.length >= 8 &&
      cpw.length <= 16 &&
      pw === cpw;

    submitBtn.disabled = !canSubmit;
  }

  newPasswordInput.addEventListener("input", checkPasswordMatch);
  confirmNewPasswordInput.addEventListener("input", checkPasswordMatch);

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username        = usernameForReset.value;
    const newPassword     = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    if (newPassword.length < 8 || newPassword.length > 16) {
      showError("Password must be 8–16 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(submitBtn, true, "Resetting...");

    try {
      const response = await fetch("reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          new_password:     newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.message || "Failed to reset password. Please try again.");
        return;
      }

      // Success — show approval box
      step3.classList.add("d-none");
      approvalBox.classList.remove("d-none");
      responseMsg.textContent = data.message || "Your password has been reset. You may now log in.";
      pageSubtitle.textContent = "";

    } catch (err) {
      showError("Server unavailable. Please try again.");
    } finally {
      setLoading(submitBtn, false, '<i class="fas fa-paper-plane me-1"></i> Reset Password');
    }
  });

  /* =====================
     RESEND OTP — go back to step 1
  ====================== */
  window.goBackToStep1 = function () {
    hideError();
    otpInput.value = "";
    verifyOtpBtn.disabled = true;
    goToStep(1);
  };

  /* =====================
     HELPERS
  ====================== */

  function goToStep(n) {
    step1.classList.add("d-none");
    step2.classList.add("d-none");
    step3.classList.add("d-none");

    if (n === 1) {
      step1.classList.remove("d-none");
      pageSubtitle.textContent = "Enter your username to receive an OTP.";
    } else if (n === 2) {
      step2.classList.remove("d-none");
      pageSubtitle.textContent = "Check your email and enter the OTP below.";
      otpInput.focus();
    } else if (n === 3) {
      step3.classList.remove("d-none");
      pageSubtitle.textContent = "OTP verified. Set your new password.";
      newPasswordInput.focus();
    }
  }

  function setLoading(btn, isLoading, restoreHtml) {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${restoreHtml.replace(/<[^>]+>/g, "").trim()}`;
    } else {
      btn.innerHTML = restoreHtml;
    }
  }

  function createErrorBox() {
    const div = document.createElement("div");
    div.id = "resetError";
    div.className = "alert alert-danger d-none mb-3";
    div.setAttribute("role", "alert");
    return div;
  }

  function showError(message) {
    errorBox.innerHTML = `<i class="fas fa-circle-exclamation me-1"></i> ${message}`;
    errorBox.classList.remove("d-none");
  }

  function hideError() {
    errorBox.classList.add("d-none");
  }
});