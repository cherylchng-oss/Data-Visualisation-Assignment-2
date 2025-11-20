// js/chart6.js

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

  const minusBtn = d3.select("#chart6-year-minus");
  const plusBtn  = d3.select("#chart6-year-plus");

  const width = 900;
  const height = 480;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Background gradient
  const defs = svg.append("defs");

  const bgGradient = defs.append("linearGradient")
    .attr("id", "chart6-bg-grad")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  bgGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#f8fafc");

  bgGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#e2e8f0");

  svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "url(#chart6-bg-grad)");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart6-tooltip");

  // Colour scale
  const methodColor = d3.scaleOrdinal()
    .domain(["Camera", "Police", "Other", "Unknown"])
    .range(["#3b82f6", "#22c55e", "#f59e0b", "#6b7280"]);

  // Name mapping
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
      let geo;

      if (mapData.type === "Topology") {
        const objKey = Object.keys(mapData.objects)[0];
        geo = topojson.feature(mapData, mapData.objects[objKey]);
      } else {
        geo = mapData;
      }

      if (!geo || !geo.features || !geo.features.length) {
        console.error("Chart6: map has no features.");
        return;
      }

      // Group data: Year -> Jurisdiction -> rows
      const dataByYear = d3.group(
        data,
        d => d.Year,
        d => d.Jurisdiction
      );

      const years = [...new Set(data.map(d => d.Year))].sort(d3.ascending);
      const minYear = d3.min(years);
      const maxYear = d3.max(years);
      let currentYear = minYear;

      function setYear(newYear) {
        newYear = Math.max(minYear, Math.min(maxYear, newYear));
        currentYear = newYear;

        slider
          .property("value", newYear)
          .attr("value", newYear);

        yearLabel.text(newYear);
        updateMap();
      }

      // Slider
      slider
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("step", 1)
        .attr("value", currentYear)
        .on("input", (e) => {
          const y = +e.target.value;
          setYear(y);
        });

      yearLabel.text(currentYear);

      // Buttons
      if (!minusBtn.empty()) {
        minusBtn.on("click", () => setYear(currentYear - 1));
      }
      if (!plusBtn.empty()) {
        plusBtn.on("click", () => setYear(currentYear + 1));
      }

      // Projection
      const projection = d3.geoMercator()
        .fitSize([width, height], geo);

      const path = d3.geoPath(projection);

      const g = svg.append("g").attr("class", "chart6-map");

      const statePaths = g.selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("d", path)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 0.6)
        .attr("fill", "#e5e7eb")
        .on("mouseenter", function () {
          d3.select(this).classed("is-hovered", true).raise();
        })
        .on("mousemove", function (event, d) {
          const abbr = getAbbr(d);
          const row = getRow(currentYear, abbr);
          if (!row) {
            tooltip.style("opacity", 0);
            return;
          }

          const fmtComma = d3.format(",.0f");
          const fmtPct = d3.format(".0%");

          tooltip
            .style("opacity", 1)
            .html(`
              <div class="chart6-tooltip-title">
                <span class="dot" style="background:${methodColor(row["Primary Enforcement Method"])}"></span>
                <strong>${abbr}</strong>
                <span class="year-pill">${currentYear}</span>
              </div>

              <div class="chart6-tooltip-body">
                <div><span class="label">Total fines</span><span>${fmtComma(row["Total Fines"])}</span></div>
                <div><span class="label">Camera</span><span>${fmtPct(row["Camera Percentage"])}</span></div>
                <div><span class="label">Police</span><span>${fmtPct(row["Police Percentage"])}</span></div>
                <div><span class="label">Other</span><span>${fmtPct(row["Other Percentage"])}</span></div>
                <div><span class="label">Unknown</span><span>${fmtPct(row["Unknown Percentage"])}</span></div>

                <div class="primary-row">
                  <span class="label">Primary method</span>
                  <span class="badge">${row["Primary Enforcement Method"]}</span>
                </div>
              </div>
            `)
            .style("left", event.pageX + 14 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseleave", function () {
          tooltip.style("opacity", 0);
          d3.select(this).classed("is-hovered", false);
        });

      // Legend
      const legend = svg.append("g")
        .attr("class", "chart6-legend")
        .attr("transform", `translate(${width - 180}, 20)`);

      legend.append("text")
        .attr("class", "legend-title")
        .text("Primary enforcement");

      const items = methodColor.domain();

      const itemGroup = legend.selectAll("g.legend-item")
        .data(items)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${20 + i * 20})`);

      itemGroup.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .attr("fill", d => methodColor(d));

      itemGroup.append("text")
        .attr("x", 22)
        .attr("y", 11)
        .attr("fill", "#e2e8f0")
        .attr("font-size", 12)
        .text(d => d);

      const box = legend.node().getBBox();
      legend.insert("rect", ":first-child")
        .attr("x", box.x - 10)
        .attr("y", box.y - 10)
        .attr("width", box.width + 20)
        .attr("height", box.height + 20)
        .attr("rx", 12)
        .attr("fill", "rgba(15,23,42,0.90)")
        .attr("stroke", "rgba(148,163,184,0.5)");

      // Helpers
      function getAbbr(f) {
        const props = f.properties || {};
        const name =
          props.STATE_NAME ||
          props.STE_NAME ||
          props.STATE ||
          props.name ||
          props.STATE_NAME_2016 ||
          props.SA4_NAME ||
          "";
        return nameToAbbr[name] || name;
      }

      function getRow(yr, abbr) {
        const rows = dataByYear.get(yr)?.get(abbr);
        return rows ? rows[0] : null;
      }

      function updateMap() {
        statePaths
          .transition()
          .duration(350)
          .attr("fill", d => {
            const abbr = getAbbr(d);
            const row = getRow(currentYear, abbr);
            if (!row) return "#e5e7eb";
            return methodColor(row["Primary Enforcement Method"]);
          });
      }

      // Initial draw
      setYear(currentYear);
    })
    .catch(err => console.error("Chart6 Error:", err));
}
