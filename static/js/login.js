document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");
  const submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    /* =====================
       FRONTEND VALIDATION
    ====================== */

    if (!username || !password) {
      showError("Username and password are required");
      return;
    }

    if (username.length < 3) {
      showError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 8 || password.length > 16) {
      showError("Password must be 8–16 characters long");
      return;
    }

    /* =====================
       SUBMIT TO BACKEND
    ====================== */

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Signing in...`;

    try {
      
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
      
      if (!response.ok) {
        showError(data.message || "Login failed");
      } else {
        // success → redirect
        window.location.href = data.redirect;
      }

    } catch (err) {
      showError("Server unavailable. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fas fa-lock me-1"></i> Login`;
    }
  });

  /* =====================
     HELPER FUNCTIONS
  ====================== */

  function showError(message) {
    errorBox.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${message}`;
    errorBox.classList.remove("d-none");
  }

  function hideError() {
    errorBox.classList.add("d-none");
  }
});
