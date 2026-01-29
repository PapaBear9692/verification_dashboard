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

function searchCodes() {
  const form = document.getElementById("searchCodeForm");
  const input = form.searchInput.value.trim();
  const type = form.searchType.value; // "code" or "batch"

  if (!input) {
    alert("Please enter a value to search.");
    return;
  }

  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML = "";

  let matchedBatches = batches;

  if (type === "batch") {
    matchedBatches = matchedBatches.filter(b => b.batchNumber === input);

    if (matchedBatches.length === 0) {
      resultsContainer.innerHTML = `<div class="alert alert-warning">No batch found.</div>`;
      return;
    }

    // Show all codes in the batch
    let resultsHTML = '<table class="table table-bordered"><thead><tr><th>Batch</th><th>Code</th><th>Status</th></tr></thead><tbody>';
    matchedBatches.forEach(b => {
      b.codes.forEach(c => {
        const status = b.usedCodes.includes(c) ? "Already Used" : "Available";
        const statusClass = b.usedCodes.includes(c) ? "status-used" : "status-available";
        resultsHTML += `<tr><td>${b.batchNumber}</td><td>${c}</td><td class="${statusClass}">${status}</td></tr>`;
      });
    });
    resultsHTML += "</tbody></table>";
    resultsContainer.innerHTML = resultsHTML;

  } else if (type === "code") {
    let found = false;
    let resultsHTML = '<table class="table table-bordered"><thead><tr><th>Batch</th><th>Code</th><th>Status</th></tr></thead><tbody>';

    matchedBatches.forEach(b => {
      if (b.codes.includes(input)) {
        found = true;
        const status = b.usedCodes.includes(input) ? "Already Used" : "Available";
        const statusClass = b.usedCodes.includes(input) ? "status-used" : "status-available";
        resultsHTML += `<tr><td>${b.batchNumber}</td><td>${input}</td><td class="${statusClass}">${status}</td></tr>`;
      }
    });

    resultsHTML += "</tbody></table>";

    resultsContainer.innerHTML = found
      ? resultsHTML
      : `<div class="alert alert-warning">Code not found.</div>`;
  }
}
function resetSearchForm() {
  document.getElementById("searchCodeForm").reset();
}

function resetGenerateForm() {
  document.getElementById("generateCodeForm").reset();
}