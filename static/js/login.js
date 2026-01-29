document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("loginError");

  // Demo validation (replace with backend API later)
  if (username === "admin" && password === "123") {
    errorBox.classList.add("d-none");
    window.location.href = "page1.html"; // dashboard
  } else {
    errorBox.classList.remove("d-none");
  }
});
