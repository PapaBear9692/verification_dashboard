const form = document.getElementById("resetForm");

const identifier = document.getElementById("identifier");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");

const submitBtn = document.getElementById("submitBtn");
const matchError = document.getElementById("matchError");
const approvalBox = document.getElementById("approvalBox");

function updateButtonState() {
  const idOk = identifier.value.trim().length > 0;
  const npOk = newPassword.value.trim().length > 0;
  const cpOk = confirmPassword.value.trim().length > 0;
  const match = newPassword.value === confirmPassword.value;

  // Show mismatch only when both password fields have something
  if (npOk && cpOk && !match) {
    matchError.classList.remove("d-none");
    confirmPassword.classList.add("is-invalid");
  } else {
    matchError.classList.add("d-none");
    confirmPassword.classList.remove("is-invalid");
  }

  // Enable only when all filled + match
  submitBtn.disabled = !(idOk && npOk && cpOk && match);
}

[identifier, newPassword, confirmPassword].forEach((el) => {
  el.addEventListener("input", updateButtonState);
});

form.addEventListener("submit", function (e) {
  e.preventDefault();

  // If somehow submitted while disabled, block
  if (submitBtn.disabled) return;

  // Disable everything (demo behavior)
  submitBtn.disabled = true;
  identifier.disabled = true;
  newPassword.disabled = true;
  confirmPassword.disabled = true;

  // Show approval message
  approvalBox.classList.remove("d-none");
});

// initial state
updateButtonState();
