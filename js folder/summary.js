function initSummary(cardSelector, csvPath) {
  d3.csv(csvPath, d3.autoType).then(raw => {
    // --- Basic setup ---
    const fmtInt = d3.format(",.0f");

    const card = document.querySelector(cardSelector);

    const yearSelect  = document.getElementById("summary-year");
    const jurisSelect = document.getElementById("summary-juris");
    const methodSelect = document.getElementById("summary-method");

    const totalEl       = document.getElementById("summary-total");
    const captionEl     = document.getElementById("summary-caption");
    const policeFinesEl = document.getElementById("summary-police-fines");
    const cameraFinesEl = document.getElementById("summary-camera-fines");
    const arrestsEl     = document.getElementById("summary-arrests");
    const chargesEl     = document.getElementById("summary-charges");

    // --- Build lists for filters ---
    const years = Array.from(new Set(raw.map(d => d.Year))).sort(d3.ascending);
    const jurisdictions = Array.from(new Set(raw.map(d => d.Jurisdiction))).sort();

    // Year dropdown
    yearSelect.innerHTML = "";
    const allYearOpt = document.createElement("option");
    allYearOpt.value = "ALL";
    allYearOpt.textContent = "All years";
    yearSelect.appendChild(allYearOpt);
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
    yearSelect.value = d3.max(years); // default = latest year

    // Jurisdiction dropdown
    jurisSelect.innerHTML = "";
    const allJOpt = document.createElement("option");
    allJOpt.value = "ALL";
    allJOpt.textContent = "All jurisdictions";
    jurisSelect.appendChild(allJOpt);
    jurisdictions.forEach(j => {
      const opt = document.createElement("option");
      opt.value = j;
      opt.textContent = j;
      jurisSelect.appendChild(opt);
    });
    jurisSelect.value = "ALL";

    // Detection method dropdown
    const methods = [
      { value: "ALL", label: "All detection methods" },
      { value: "Camera", label: "Camera only" },
      { value: "Police", label: "Police only" },
      { value: "Other", label: "Other only" },
      { value: "Unknown", label: "Unknown only" }
    ];
    methodSelect.innerHTML = "";
    methods.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.textContent = m.label;
      methodSelect.appendChild(opt);
    });
    methodSelect.value = "ALL";

    // --- Update logic ---
    function update() {
      const yearVal  = yearSelect.value;
      const jurisVal = jurisSelect.value;
      const methodVal = methodSelect.value;

      // Filter by year + jurisdiction
      let filtered = raw.filter(d =>
        (yearVal === "ALL"  || d.Year === +yearVal) &&
        (jurisVal === "ALL" || d.Jurisdiction === jurisVal)
      );

      if (!filtered.length) {
        totalEl.textContent = "0";
        captionEl.textContent = "No data for this selection";
        policeFinesEl.textContent = cameraFinesEl.textContent =
          arrestsEl.textContent = chargesEl.textContent = "0";
        return;
      }

      // Helper to sum a column
      const sumCol = (rows, col) => d3.sum(rows, r => r[col] || 0);

      // Totals by method (using year + jurisdiction only)
      const cameraFines = sumCol(filtered, "Camera Fines");
      const policeFines = sumCol(filtered, "Police Fines");
      const otherFines  = sumCol(filtered, "Other Fines");
      const unknownFines = sumCol(filtered, "Unknown Fines");

      const cameraArrests = sumCol(filtered, "Camera Arrests");
      const policeArrests = sumCol(filtered, "Police Arrests");
      const otherArrests  = sumCol(filtered, "Other Arrests");
      const unknownArrests = sumCol(filtered, "Unknown Arrests");

      const cameraCharges = sumCol(filtered, "Camera Charges");
      const policeCharges = sumCol(filtered, "Police Charges");
      const otherCharges  = sumCol(filtered, "Other Charges");
      const unknownCharges = sumCol(filtered, "Unknown Charges");

      // --- How detection method filter affects the big number ---
      let totalFines, totalArrests, totalCharges;
      if (methodVal === "Camera") {
        totalFines   = cameraFines;
        totalArrests = cameraArrests;
        totalCharges = cameraCharges;
      } else if (methodVal === "Police") {
        totalFines   = policeFines;
        totalArrests = policeArrests;
        totalCharges = policeCharges;
      } else if (methodVal === "Other") {
        totalFines   = otherFines;
        totalArrests = otherArrests;
        totalCharges = otherCharges;
      } else if (methodVal === "Unknown") {
        totalFines   = unknownFines;
        totalArrests = unknownArrests;
        totalCharges = unknownCharges;
      } else {
        // ALL methods
        totalFines   = sumCol(filtered, "Total Fines");
        totalArrests = cameraArrests + policeArrests + otherArrests + unknownArrests;
        totalCharges = cameraCharges + policeCharges + otherCharges + unknownCharges;
      }

      // --- Write values into the card ---
      totalEl.textContent = fmtInt(totalFines);

      const yearLabel =
        yearVal === "ALL" ? "all years" : yearVal;
      const jurisLabel =
        jurisVal === "ALL" ? "Australia (all jurisdictions)" : jurisVal;
      const methodLabel =
        methodVal === "ALL" ? "all detection methods" : methodVal.toLowerCase();

      captionEl.textContent =
        `Speeding infringements, ${yearLabel}, ${jurisLabel}, ${methodLabel}`;

      policeFinesEl.textContent = fmtInt(policeFines);
      cameraFinesEl.textContent = fmtInt(cameraFines);
      arrestsEl.textContent     = fmtInt(totalArrests);
      chargesEl.textContent     = fmtInt(totalCharges);
    }

    // Initial render
    update();

    // Listeners
    yearSelect.addEventListener("change", update);
    jurisSelect.addEventListener("change", update);
    methodSelect.addEventListener("change", update);
  });
}
