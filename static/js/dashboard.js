"use strict";

(function () {
  const backToTopBtn = document.getElementById("backToTopBtn");
  if (!backToTopBtn) return;

  // Show / hide button based on scroll percentage
  window.addEventListener("scroll", () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    const scrollPercent = (scrollTop / scrollHeight) * 100;

    backToTopBtn.style.display = scrollPercent > 70 ? "flex" : "none";
  });

  // Smooth scroll to top
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
})();
