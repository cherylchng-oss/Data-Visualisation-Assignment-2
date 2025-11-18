// js/chart2.js

// Jurisdictions from Chart2.csv
const CHART2_SERIES = [
  { key: "NSW", name: "NSW", color: "#3b82f6" },
  { key: "NT",  name: "NT",  color: "#16a34a" },
  { key: "QLD", name: "QLD", color: "#facc15" },
  { key: "SA",  name: "SA",  color: "#f97316" },
  { key: "TAS", name: "TAS", color: "#06b6d4" },
  { key: "VIC", name: "VIC", color: "#8b5cf6" },
  { key: "WA",  name: "WA",  color: "#ef4444" },
  { key: "ACT", name: "ACT", color: "#22c55e" }
];

const chart2Fmt = d3.format(",.0f"); // for tooltip numbers

// Global init function
function initChart2(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    const years = raw.map(d => +d["Year"]);

    const allSeries = CHART2_SERIES.map(s => ({
      ...s,
      values: raw.map(d => {
        const rawVal = d[s.key];
        const value =
          rawVal === undefined || rawVal === null || rawVal === "" || rawVal === "NaN"
            ? null
            : +rawVal;
        return { year: +d["Year"], value };
      })
    }));

    const wrap = d3.select(containerSelector);

    // ----- Build jurisdiction dropdown -----
    const select = d3.select("#chart2-jurisdiction-select");
    select.selectAll("*").remove();

    select.append("option")
      .attr("value", "ALL")
      .text("All");

    CHART2_SERIES.forEach(s => {
      select.append("option")
        .attr("value", s.key)
        .text(s.name);
    });

    let selectedKey = "ALL"; // ALL = show every jurisdiction

    function render() {
      drawChart2(wrap, years, allSeries, selectedKey);
    }

    // initial draw
    render();

    // update on dropdown change
    select.on("change", function () {
      selectedKey = this.value;
      render();
    });

    // redraw on resize
    window.addEventListener("resize", render);
  });
}

function drawChart2(wrap, years, allSeries, selectedKey) {
  wrap.selectAll("*").remove();
  wrap.style("position", "relative");

  const width  = Math.max(720, wrap.node().clientWidth || 720);
  const height = 460;
  const m = { top: 24, right: 24, bottom: 48, left: 80 };

  const svg = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);
  
  const xMin = d3.min(years);
  const xMax = d3.max(years);

  const allYears = d3.range(xMin, xMax + 1);

  const x = d3.scaleLinear()
    .domain([xMin - 1, xMax])
    .range([m.left, width - m.right]);

  // Which series to actually draw?
  const series = selectedKey === "ALL"
    ? allSeries
    : allSeries.filter(s => s.key === selectedKey);

  // y-domain based on *visible* series (helps when focusing on one line)
  const yMax = d3.max(
    series,
    s => d3.max(s.values, v => (v.value != null ? v.value : 0))
  ) || 1;

  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([height - m.bottom, m.top]);

  // ----- X axis -----
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickValues(allYears)
        .tickFormat(d3.format("d"))
        .tickSize(0)
        .tickSizeOuter(0)
    );

  xAxis.selectAll("text")
    .attr("text-anchor", "middle");

  xAxis.selectAll(".tick line")
    .attr("stroke", "#e5e7eb");

  // ----- Y axis -----
  const yAxis = d3.axisLeft(y)
    .ticks(10)
    .tickFormat(d3.format(".2e"))
    .tickSize(-(width - m.left - m.right))
    .tickSizeOuter(0);

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(yAxis)
    .selectAll(".tick line")
    .attr("stroke", "#e5e7eb");

  svg.selectAll(".domain").attr("stroke", "#6b7280");

  // Axis labels
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(m.top + (height - m.top - m.bottom) / 2))
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Total Fines");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#6b7280")
    .text("Year");

  // Line generator
  const line = d3.line()
    .defined(d => d.value != null)
    .x(d => x(d.year))
    .y(d => y(d.value));

  const g = svg.append("g");

  // Draw lines + points for visible jurisdictions
  series.forEach(s => {
    const valid = s.values.filter(v => v.value != null);

    g.append("path")
      .datum(valid)
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2.2)
      .attr("d", line);

    g.selectAll(null)
      .data(valid)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", s.color)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value));
  });

  // ---------- ANIMATIONS ----------
  // Animate line drawing when filter changes
  g.selectAll("path")
    .each(function () {
      const totalLength = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });

  // Fade in points slightly after the lines
  g.selectAll("circle")
    .attr("opacity", 0)
    .transition()
    .duration(500)
    .delay(300)
    .attr("opacity", 1);

  // ----- Legend (static, no filter) -----
  const legend = d3.select("#chart2-legend");
  legend.selectAll("*").remove();

  allSeries.forEach(s => {
    const btn = legend.append("button")
      .attr("type", "button")
      .attr("class", "chart-legend-pill")
      .style("cursor", "default"); // no clicking

    btn.append("span")
      .attr("class", "chart-legend-swatch chart-legend-swatch--round")
      .style("background", s.color);

    btn.append("span").text(s.name);
  });

  // ----- Tooltip + vertical guideline -----
  const yearIndex = {};
  years.forEach((yr, i) => { yearIndex[yr] = i; });

  const tooltip = wrap.append("div")
    .attr("class", "chart-tooltip chart-tooltip--lg");

  const vLine = svg.append("line")
    .attr("stroke", "#9ca3af")
    .attr("stroke-dasharray", "4,4")
    .attr("y1", m.top)
    .attr("y2", height - m.bottom)
    .style("opacity", 0);

  svg.append("rect")
    .attr("x", m.left)
    .attr("y", m.top)
    .attr("width", width - m.left - m.right)
    .attr("height", height - m.top - m.bottom)
    .attr("class", "chart-hitbox")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const xYear = x.invert(mx);

      // nearest year
      let closest = years[0];
      let minDiff = Math.abs(xYear - years[0]);
      for (let i = 1; i < years.length; i++) {
        const diff = Math.abs(xYear - years[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = years[i];
        }
      }
      const idx = yearIndex[closest];

      vLine
        .attr("x1", x(closest))
        .attr("x2", x(closest))
        .style("opacity", 1);

      let html = `<strong>${closest}</strong><br>`;
      series.forEach(s => {
        const v = s.values[idx]?.value ?? null;
        const val = v == null ? "—" : chart2Fmt(v);
        html += `
          <div style="display:flex;gap:6px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${s.color}"></span>
            <span>${s.name}</span>
            <span style="margin-left:auto;font-weight:600;">${val}</span>
          </div>`;
      });

      tooltip.html(html).style("opacity", 1);

      // dynamic tooltip position near mouse, but kept inside card
      const [wx, wy] = d3.pointer(event, wrap.node());
      const wrapWidth  = wrap.node().clientWidth;
      const wrapHeight = wrap.node().clientHeight;
      const tWidth  = 260;
      const tHeight = 170; // approx

      let tX = wx + 16;
      if (tX + tWidth > wrapWidth - 10) {
        tX = wx - tWidth - 16;
      }
      tX = Math.max(10, Math.min(wrapWidth - tWidth - 10, tX));

      let tY = wy - tHeight - 12;
      if (tY < 10) {
        tY = wy + 16;
      }
      tY = Math.max(10, Math.min(wrapHeight - tHeight - 10, tY));

      tooltip
        .style("width", `${tWidth}px`)
        .style("left", `${tX}px`)
        .style("top", `${tY}px`);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
      vLine.style("opacity", 0);
    });
}
