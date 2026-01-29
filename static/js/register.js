// ===============================
// Elements
// ===============================
const form = document.getElementById("registerForm");
const passwordInput = document.querySelector('input[name="password"]');
const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
const registerBtn = form.querySelector('button[type="submit"]');

// ===============================
// Create Inline Error Message
// ===============================
const errorMsg = document.createElement("small");
errorMsg.className = "text-danger mt-1 d-none";
errorMsg.innerText = "Passwords do not match";

// insert error message after confirm password input
confirmPasswordInput.parentElement.appendChild(errorMsg);

// disable register button initially
registerBtn.disabled = true;

// ===============================
// Password Match Validation
// ===============================
function validatePasswords() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!password || !confirmPassword) {
    errorMsg.classList.add("d-none");
    registerBtn.disabled = true;
    return;
  }

  if (password !== confirmPassword) {
    errorMsg.classList.remove("d-none");
    registerBtn.disabled = true;
  } else {
    errorMsg.classList.add("d-none");
    registerBtn.disabled = false;
  }
}

// live validation
passwordInput.addEventListener("input", validatePasswords);
confirmPasswordInput.addEventListener("input", validatePasswords);

// ===============================
// Form Submit
// ===============================
form.addEventListener("submit", function (e) {
  e.preventDefault();

  // safety check
  if (passwordInput.value !== confirmPasswordInput.value) {
    return;
  }

  openRegisterConfirmation();
});

// ===============================
// Reset Form
// ===============================
function resetRegisterForm() {
  form.reset();
  registerBtn.disabled = true;
  errorMsg.classList.add("d-none");
}

// ===============================
// Open Confirmation Modal
// ===============================
function openRegisterConfirmation() {
  document.getElementById("confirmFullName").innerText = form.fullName.value;
  document.getElementById("confirmEmail").innerText = form.email.value;
  document.getElementById("confirmPhone").innerText = form.phone.value || "N/A";
  document.getElementById("confirmRole").innerText = form.role.value || "N/A";

  const modal = new bootstrap.Modal(
    document.getElementById("registerConfirmModal")
  );
  modal.show();
}

// ===============================
// Confirm Registration
// ===============================
function confirmRegistration() {
  // TODO: send data to backend here

  form.reset();
  registerBtn.disabled = true;
  errorMsg.classList.add("d-none");

  const modalEl = document.getElementById("registerConfirmModal");
  bootstrap.Modal.getInstance(modalEl).hide();
}

// ===============================
// Timezone (existing)
// ===============================
function getTimeZone() {
  console.log(
    "User Timezone:",
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}
