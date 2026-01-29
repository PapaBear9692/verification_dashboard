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


function openBatchConfirmation() {
  // Get form values
  const batchNumber = document.querySelector('[name="batchNumber"]').value;
  const codeCount = document.querySelector('[name="codeCount"]').value;
  const product = document.querySelector('[name="product"]').value;
  const productionDate = document.querySelector('[name="productionDate"]').value;
  const factory = document.querySelector('[name="factory"]').value;
  const market = document.querySelector('[name="market"]').value;
  const notes = document.querySelector('[name="notes"]').value || "—";

  // Inject values into modal
  document.getElementById("confirmBatchNumber").innerText = batchNumber;
  document.getElementById("confirmCodeCount").innerText = codeCount;
  document.getElementById("confirmProduct").innerText = product;
  document.getElementById("confirmProductionDate").innerText = productionDate;
  document.getElementById("confirmFactory").innerText = factory;
  document.getElementById("confirmMarket").innerText = market;
  document.getElementById("confirmNotes").innerText = notes;

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("batchConfirmModal")
  );
  modal.show();
}

function confirmCreateBatch() {
  // 🔹 Here you will later:
  // - submit form to backend
  // - trigger scratch code generation
  // - show success message

  console.log("Batch creation confirmed");

  // Close modal
  const modalEl = document.getElementById("batchConfirmModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
}


function exportBatchData() {
  const form = document.getElementById("exportBatchForm");

  const batch = form.exportBatch.value;
  const exportType = form.exportType.value;
  const format = form.exportFormat.value;

  if (!batch || !exportType || !format) {
    alert("Please select all export options.");
    return;
  }

  // For now: frontend simulation
  console.log("Exporting batch:", {
    batch,
    exportType,
    format
  });

  alert(
    `Export started\n\nBatch: ${batch}\nContent: ${exportType}\nFormat: ${format.toUpperCase()}`
  );

  /*
    🔹 BACKEND INTEGRATION (later):
    window.location.href =
      `/api/export?batch=${batch}&type=${exportType}&format=${format}`;
  */
}

function resetExportForm() {
  document.getElementById("exportBatchForm").reset();
}
function resetCreateBatchForm() {
  document.getElementById("createBatchForm").reset();
}
