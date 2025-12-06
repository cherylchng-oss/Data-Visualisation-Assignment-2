function initChart6(config) {
  const {
    csvPath,
    topoJsonPath,
    svgSelector,
    sliderSelector,
    labelSelector
  } = config;

  const svg = d3.select(svgSelector);
  const slider = d3.select(sliderSelector);
  const yearLabel = d3.select(labelSelector);
  const prevBtn = d3.select("#chart6-prev-year");
  const nextBtn = d3.select("#chart6-next-year");
  const pieTitle = d3.select("#chart6-pie-title");
  const listContainer = d3.select("#chart6-list");
  const container = d3.select("#chart6-container");
  const fsBtn = d3.select("#chart6-fullscreen-btn");

  if (!fsBtn.empty()) {
    fsBtn.on("click", () => {
      const isFull = container.classed("chart6-container--fullscreen");

      // toggle fullscreen class on the map card
      container.classed("chart6-container--fullscreen", !isFull);
      // lock/unlock page scroll
      d3.select("body").classed("chart6-no-scroll", !isFull);

      // swap icon + aria label
      fsBtn.select("i")
        .attr(
          "class",
          isFull
            ? "fa-solid fa-up-right-and-down-left-from-center"
            : "fa-solid fa-down-left-and-up-right-to-center"
        );

      fsBtn.attr("aria-label", isFull ? "Expand map" : "Exit fullscreen");
    });
  }

  const width = 900;
  const height = 480;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Tooltip for map (styled via .chart6-tooltip in visualisation.css)
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart6-tooltip");

  // Colours by primary enforcement method
  const methodColor = d3.scaleOrdinal()
    .domain(["Camera", "Police", "Other", "Unknown"])
    .range(["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]);

  // Map full state names to abbreviations used in CSV
  const nameToAbbr = {
    "New South Wales": "NSW",
    "NSW": "NSW",
    "Northern Territory": "NT",
    "NT": "NT",
    "Queensland": "QLD",
    "QLD": "QLD",
    "South Australia": "SA",
    "SA": "SA",
    "Tasmania": "TAS",
    "TAS": "TAS",
    "Victoria": "VIC",
    "VIC": "VIC",
    "Western Australia": "WA",
    "WA": "WA",
    "Australian Capital Territory": "ACT",
    "ACT": "ACT"
  };

  Promise.all([
    d3.csv(csvPath, d3.autoType),
    d3.json(topoJsonPath)
  ])
    .then(([data, mapData]) => {
      console.log("Chart6 – rows loaded:", data.length);

      // ----- Detect GeoJSON vs TopoJSON -----
      let geo;
      if (mapData.type === "Topology") {
        const objectKeys = Object.keys(mapData.objects || {});
        if (!objectKeys.length) {
          console.error("Chart6: No 'objects' in Topology file.");
          return;
        }
        const firstKey = objectKeys[0];
        geo = topojson.feature(mapData, mapData.objects[firstKey]);
      } else {
        geo = mapData;
      }

      if (!geo || !geo.features || !geo.features.length) {
        console.error("Chart6: No features found in map file.");
        return;
      }

      // Group data: Year -> Jurisdiction -> rows[]
      const dataByYear = d3.group(
        data,
        d => d.Year,
        d => d.Jurisdiction
      );

      const years = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
      const minYear = d3.min(years);
      const maxYear = d3.max(years);
      let currentYear = years[0];

      // Extent of total fines per year (for brightness scale)
      const finesExtentByYear = new Map();
      years.forEach(y => {
        const byJur = dataByYear.get(y);
        if (!byJur) return;
        const vals = [];
        byJur.forEach(rows => {
          rows.forEach(r => {
            if (r["Total Fines"] != null) vals.push(+r["Total Fines"]);
          });
        });
        if (vals.length) {
          finesExtentByYear.set(y, d3.extent(vals));
        }
      });

      // ===== PIE CHART SETUP (Australia-wide enforcement mix) =====
      const pieSvg = d3.select("#chart6-pie-svg");
      const pieWidth = 260;
      const pieHeight = 260;
      const pieRadius = Math.min(pieWidth, pieHeight) / 2 - 12;

      pieSvg.attr("viewBox", `0 0 ${pieWidth} ${pieHeight}`);

      const pieGroup = pieSvg.append("g")
        .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

      const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

      const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);

      const labelArc = d3.arc()
        .innerRadius(pieRadius * 0.7)
        .outerRadius(pieRadius * 0.7);

      const pctFormat = d3.format(".0%");

      // ===== Slider config =====
      slider
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("step", 1)
        .attr("value", currentYear)
        .on("input", (event) => {
          currentYear = +event.target.value;
          yearLabel.text(currentYear);
          updateMapAndPie();
        });

      yearLabel.text(currentYear);

      if (!prevBtn.empty()) {
        prevBtn.on("click", () => {
          currentYear = Math.max(minYear, currentYear - 1);
          slider.property("value", currentYear);
          yearLabel.text(currentYear);
          updateMapAndPie();
        });
      }

      if (!nextBtn.empty()) {
        nextBtn.on("click", () => {
          currentYear = Math.min(maxYear, currentYear + 1);
          slider.property("value", currentYear);
          yearLabel.text(currentYear);
          updateMapAndPie();
        });
      }

      // ===== Projection & path for map =====
      const projection = d3.geoMercator()
        .fitSize([width, height], geo);

      const path = d3.geoPath(projection);

      const g = svg.append("g").attr("class", "chart6-map");

      const statePaths = g.selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("class", "chart6-state")
        .attr("d", path)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 0.7)
        .attr("fill", "#e5e7eb")
        .on("mousemove", function (event, d) {
          const abbr = getAbbr(d);
          const row = getRow(currentYear, abbr);

          if (!row) {
            tooltip.style("opacity", 0);
            return;
          }

          const fmtComma = d3.format(",.0f");
          const fmtPct = d3.format(".0%");

          const methods = [
            { col: "Camera Percentage", label: "Camera", color: methodColor("Camera") },
            { col: "Police Percentage", label: "Police", color: methodColor("Police") },
            { col: "Other Percentage", label: "Other", color: methodColor("Other") },
            { col: "Unknown Percentage", label: "Unknown", color: methodColor("Unknown") }
          ];

          let dominant = methods[0];
          methods.forEach(m => {
            if ((row[m.col] || 0) > (row[dominant.col] || 0)) {
              dominant = m;
            }
          });

          const rowsHtml = methods.map(m => `
            <div class="chart6-tip-row ${m.label === dominant.label ? "chart6-tip-row--primary" : ""}">
              <div class="chart6-tip-row-left">
                <span class="chart6-tip-dot" style="background:${m.color};"></span>
                <span class="chart6-tip-row-label">${m.label}</span>
              </div>
              <span class="chart6-tip-row-value">${fmtPct(row[m.col] || 0)}</span>
            </div>
          `).join("");

          const primaryColor = methodColor(row["Primary Enforcement Method"]) || "#38bdf8";

          tooltip
            .style("opacity", 1)
            .html(`
              <div class="chart6-tip-header">
                <div class="chart6-tip-region">${abbr}</div>
                <div class="chart6-tip-year">${currentYear}</div>
              </div>

              <div class="chart6-tip-primary-row">
                <span class="chart6-tip-primary-label">Primary</span>
                <span class="chart6-tip-primary-chip">
                  <span class="chart6-tip-dot" style="background:${primaryColor};"></span>
                  <span class="chart6-tip-primary-text">${row["Primary Enforcement Method"]}</span>
                </span>
              </div>

              <div class="chart6-tip-total">
                Total fines
                <span class="chart6-tip-total-value">${fmtComma(row["Total Fines"] || 0)}</span>
              </div>

              <div class="chart6-tip-section-title">Enforcement mix</div>
              ${rowsHtml}
            `)
            .style("left", (event.pageX + 16) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseenter", function () {
          d3.select(this)
            .raise()
            .transition()
            .duration(150)
            .attr("stroke-width", 1.4);
        })
        .on("mouseleave", function () {
          tooltip.style("opacity", 0);
          d3.select(this)
            .transition()
            .duration(150)
            .attr("stroke-width", 0.7);
        });

      // ===== Legend with card background =====
      const legend = svg.append("g")
        .attr("class", "chart6-legend")
        .attr("transform", `translate(${width - 190}, 45)`);

      const legendItems = methodColor.domain();
      const cardWidth = 160;
      const cardHeight = legendItems.length * 20 + 30;

      legend.append("rect")
        .attr("class", "chart6-legend-bg")
        .attr("x", -12)
        .attr("y", -26)
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 14)
        .attr("ry", 14)
        .attr("fill", "white")
        .attr("opacity", 0.95);

      legend.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .text("Primary enforcement")
        .style("font-weight", "700")
        .style("font-size", "0.75rem");

      legend.selectAll("g.chart6-legend-item")
        .data(legendItems)
        .join("g")
        .attr("class", "chart6-legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .each(function (d) {
          const gItem = d3.select(this);

          gItem.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("fill", methodColor(d));

          gItem.append("text")
            .attr("x", 22)
            .attr("y", 11)
            .text(d);
        });

      // ===== Helpers =====
      function getAbbr(feature) {
        const props = feature.properties || {};
        const name =
          props.STATE_NAME ||
          props.STE_NAME ||
          props.STATE ||
          props.name ||
          props.STATE_NAME_2016 ||
          props.SA4_NAME ||
          "";

        return nameToAbbr[name] || nameToAbbr[props.STATE_ABBR] || name;
      }

      function getRow(year, abbr) {
        const byJurisdiction = dataByYear.get(year);
        if (!byJurisdiction) return null;
        const rows = byJurisdiction.get(abbr);
        return rows ? rows[0] : null;
      }

      // --- Table data helper: list of jurisdictions for a year ---
      function getYearTableData(year) {
        const byJurisdiction = dataByYear.get(year);
        if (!byJurisdiction) return [];

        const records = [];

        byJurisdiction.forEach((rows, jurKey) => {
          if (!rows || !rows.length) return;
          const r = rows[0];

          const total = +r["Total Fines"] || 0;
          const camPct = r["Camera Percentage"] || 0;
          const polPct = r["Police Percentage"] || 0;
          const othPct = r["Other Percentage"] || 0;
          const unkPct = r["Unknown Percentage"] || 0;

          records.push({
            jurisdiction: jurKey,
            cameraCount: total * camPct,
            policeCount: total * polPct,
            otherCount: total * othPct,
            unknownCount: total * unkPct,
            totalFines: total
          });
        });

        // Sort by total fines descending
        records.sort((a, b) => d3.descending(a.totalFines, b.totalFines));
        return records;
      }

      // --- Render / update the list under the pie chart ---
      function updateList(year) {
        const rows = getYearTableData(year);
        const fmtComma = d3.format(",.0f");

        listContainer.selectAll("*").remove();

        if (!rows.length) {
          listContainer.append("p").text("No data available for this year.");
          return;
        }

        const table = listContainer
          .append("table")
          .attr("class", "chart6-table");

        const thead = table.append("thead").append("tr");
        thead.append("th").text("ID");
        thead.append("th").text("Jurisdiction");
        thead.append("th").text("Camera Issued Fines");
        thead.append("th").text("Police Issued Fines");
        thead.append("th").text("Other Fines");
        thead.append("th").text("Unknown Fines");

        const tbody = table.append("tbody");

        rows.forEach((d, i) => {
          const tr = tbody.append("tr");
          tr.append("td").text(i + 1);
          tr.append("td").text(d.jurisdiction);
          tr.append("td").text(fmtComma(d.cameraCount));
          tr.append("td").text(fmtComma(d.policeCount));
          tr.append("td").text(fmtComma(d.otherCount));
          tr.append("td").text(fmtComma(d.unknownCount));
        });
      }

      // National totals per method for the selected year
      function getNationalMix(year) {
        const byJur = dataByYear.get(year);
        if (!byJur) return [];

        const totals = { Camera: 0, Police: 0, Other: 0, Unknown: 0 };

        byJur.forEach(rows => {
          rows.forEach(r => {
            const total = +r["Total Fines"] || 0;
            totals.Camera  += total * (r["Camera Percentage"]  || 0);
            totals.Police  += total * (r["Police Percentage"]  || 0);
            totals.Other   += total * (r["Other Percentage"]   || 0);
            totals.Unknown += total * (r["Unknown Percentage"] || 0);
          });
        });

        const sum = totals.Camera + totals.Police + totals.Other + totals.Unknown;
        if (!sum) return [];

        return [
          { method: "Camera",  value: totals.Camera,  pct: totals.Camera  / sum },
          { method: "Police",  value: totals.Police,  pct: totals.Police  / sum },
          { method: "Other",   value: totals.Other,   pct: totals.Other   / sum },
          { method: "Unknown", value: totals.Unknown, pct: totals.Unknown / sum }
        ];
      }

      function getFillColor(year, row) {
        const method = row["Primary Enforcement Method"];
        const baseColor = methodColor(method);
        if (!baseColor) return "#e5e7eb";

        const extent = finesExtentByYear.get(year);
        if (!extent) return baseColor;

        const fines = +row["Total Fines"] || 0;

        // Darker = higher fines
        const scale = d3.scaleLinear()
          .domain(extent)
          .range([0.8, 0.55])
          .clamp(true);

        const hsl = d3.hsl(baseColor);
        hsl.l = scale(fines);
        return hsl.formatHex();
      }

      function updatePie(year) {
        const mix = getNationalMix(year);
        pieTitle.text(`Enforcement Method Distribution (${year})`);

        const arcsData = pie(mix);

        const paths = pieGroup.selectAll("path")
          .data(arcsData, d => d.data.method);

        paths.join(
          enter => enter.append("path")
            .attr("fill", d => methodColor(d.data.method))
            .attr("d", arc)
            .each(function (d) { this._current = d; }),
          update => update
            .transition().duration(400)
            .attrTween("d", function (d) {
              const i = d3.interpolate(this._current, d);
              this._current = i(0);
              return t => arc(i(t));
            }),
          exit => exit.remove()
        );

        const labels = pieGroup.selectAll("text.chart6-pie-label")
          .data(arcsData, d => d.data.method);

        labels.join(
          enter => enter.append("text")
            .attr("class", "chart6-pie-label")
            .attr("transform", d => `translate(${labelArc.centroid(d)})`)
            .attr("dy", "0.35em")
            .text(d => pctFormat(d.data.pct)),
          update => update
            .transition().duration(400)
            .attr("transform", d => `translate(${labelArc.centroid(d)})`)
            .text(d => pctFormat(d.data.pct)),
          exit => exit.remove()
        );
      }

      function updateMapAndPie() {
        statePaths
          .transition()
          .duration(400)
          .attr("fill", d => {
            const abbr = getAbbr(d);
            const row = getRow(currentYear, abbr);
            if (!row) return "#e5e7eb";
            return getFillColor(currentYear, row);
          });

        updatePie(currentYear);
        updateList(currentYear); // 👈 update the list whenever year changes
      }

      // initial render
      updateMapAndPie();
    })
    .catch(err => {
      console.error("Chart6: error loading data or map:", err);
    });
}
