// js/chart1.js

// Match the exact dataset columns
const CHART1_SERIES = [
  { key: "Camera issued fines",  name: "Camera issued fines",  color: "#3b82f6" },
  { key: "Police issued fines",  name: "Police issued fines",  color: "#22c55e" },
  { key: "Other fines",          name: "Other fines",          color: "#f59e0b" },
  { key: "Unknown fines",        name: "Unknown fines",        color: "#ef4444" }
];

// For tooltip numbers (with commas)
const chart1Fmt = d3.format(",.0f");

// Global init function
function initChart1(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    const years = raw.map(d => +d["Year"]);

    const series = CHART1_SERIES.map(s => ({
      ...s,
      values: raw.map(d => {
        const rawVal = d[s.key];
        const value =
          rawVal === undefined || rawVal === null || rawVal === ""
            ? null
            : +rawVal;
        return { year: +d["Year"], value };
      })
    }));

    drawChart1(containerSelector, years, series);

    window.addEventListener("resize", () =>
      drawChart1(containerSelector, years, series)
    );
  });
}

function drawChart1(containerSelector, years, series) {
  const wrap = d3.select(containerSelector);
  wrap.selectAll("*").remove();
  wrap.style("position", "relative"); // for tooltip positioning

  const width  = Math.max(720, wrap.node().clientWidth || 720);
  const height = 460;
  const m = { top: 24, right: 24, bottom: 48, left: 80 };

  const svg = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([m.left, width - m.right]);

  const yMax = d3.max(
    series,
    s => d3.max(s.values, v => (v.value != null ? v.value : 0))
  ) || 1;

  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([height - m.bottom, m.top]);

  // ---------- X AXIS ----------
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickSize(-(height - m.top - m.bottom))
        .tickSizeOuter(0)
    );

  // Move year labels (e.g. 2008) further right from the Y-axis and 0 label
  xAxis.selectAll("text")
    .attr("dx", "1.4em");

  xAxis.selectAll(".tick line")
    .attr("stroke", "#e5e7eb");

  // ---------- Y AXIS ----------
  const yAxis = d3.axisLeft(y)
    .ticks(6)
    .tickFormat(d3.format(".2e")) // 0.00e+0, 1.00e+6, ...
    .tickSize(-(width - m.left - m.right))
    .tickSizeOuter(0);

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(yAxis)
    .selectAll(".tick line")
    .attr("stroke", "#e5e7eb");

  // Darker axis line like your KNIME screenshot
  svg.selectAll(".domain").attr("stroke", "#6b7280");

  // ---------- Y LABEL ----------
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(m.top + (height - m.top - m.bottom) / 2))
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Total Fines");

  // ---------- X LABEL ----------
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#6b7280")
    .text("Year");

  // ---------- LINE GENERATOR ----------
  const line = d3.line()
    .defined(d => d.value != null)
    .x(d => x(d.year))
    .y(d => y(d.value));

  const g = svg.append("g");

  // ---------- DRAW SERIES ----------
  series.forEach(s => {
    const valid = s.values.filter(v => v.value != null);

    // line
    g.append("path")
      .datum(valid)
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2.4)
      .attr("d", line);

    // dots
    g.selectAll(null)
      .data(valid)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", s.color)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value));
  });

  // ---------- LEGEND ----------
  const legend = d3.select("#chart1-legend");
  legend.selectAll("*").remove();

  series.forEach(s => {
    const btn = legend.append("button")
      .attr("type", "button")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "8px")
      .style("padding", "6px 10px")
      .style("border", "1px solid var(--line)")
      .style("border-radius", "999px")
      .style("background", "#fff")
      .style("font-weight", "700");

    btn.append("span")
      .style("width", "12px")
      .style("height", "12px")
      .style("border-radius", "3px")
      .style("background", s.color);

    btn.append("span").text(s.name);
  });

  // ---------- TOOLTIP + VERTICAL LINE (dynamic) ----------
  const yearIndex = {};
  years.forEach((yr, i) => { yearIndex[yr] = i; });

  const tooltip = wrap.append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("border-radius", "8px")
    .style("box-shadow", "0 10px 30px rgba(0,0,0,0.18)")
    .style("padding", "10px")
    .style("font-size", "12px")
    .style("line-height", "1.4")
    .style("opacity", 0);

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
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
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
        const val = v == null ? "—" : chart1Fmt(v);
        html += `
          <div style="display:flex;gap:6px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${s.color}"></span>
            <span>${s.name}</span>
            <span style="margin-left:auto;font-weight:600;">${val}</span>
          </div>`;
      });

      tooltip.html(html).style("opacity", 1);

      // dynamic tooltip position near mouse, but kept inside chart card
      const [wx, wy] = d3.pointer(event, wrap.node());
      const wrapWidth  = wrap.node().clientWidth;
      const wrapHeight = wrap.node().clientHeight;
      const tWidth  = 220;
      const tHeight = 160; // approximate height

      // try to put tooltip to the right of the mouse; if no space, put left
      let tX = wx + 16;
      if (tX + tWidth > wrapWidth - 10) {
        tX = wx - tWidth - 16;
      }
      tX = Math.max(10, Math.min(wrapWidth - tWidth - 10, tX));

      // try to put tooltip above the mouse; if no space, put below
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
