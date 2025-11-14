// js/chart1.js
const CHART1_SERIES = [
  { key: "camera",  name: "Camera issued fines",  color: "#3b82f6" },
  { key: "police",  name: "Police issued fines",  color: "#22c55e" },
  { key: "other",   name: "Other fines",          color: "#f59e0b" },
  { key: "unknown", name: "Unknown fines",        color: "#ef4444" }
];

const chart1Fmt = d3.format(",");

// this MUST be global (no export, no IIFE that hides it)
function initChart1(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    const years = raw.map(d => +d.year);
    const series = CHART1_SERIES.map(s => ({
      ...s,
      values: raw.map(d => ({ year: +d.year, value: +d[s.key] || 0 }))
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

  const width  = Math.max(720, wrap.node().clientWidth || 720);
  const height = 460;
  const m = { top: 16, right: 24, bottom: 44, left: 70 };

  const svg = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([m.left, width - m.right]);

  const yMax = d3.max(series, s => d3.max(s.values, v => v.value)) || 1;
  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([height - m.bottom, m.top]);

  // grid + axes
  svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d"))
      .tickSize(-(height - m.top - m.bottom)).tickSizeOuter(0))
    .selectAll(".tick line").attr("stroke", "#e5e7eb");

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(chart1Fmt)
      .tickSize(-(width - m.left - m.right)).tickSizeOuter(0))
    .selectAll(".tick line").attr("stroke", "#e5e7eb");

  svg.selectAll(".domain").attr("stroke", "#cbd5e1");

  svg.append("text")
    .attr("x", m.left)
    .attr("y", m.top - 2)
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("fill", "var(--muted)")
    .text("Total Fines");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

  const g = svg.append("g");

  // draw lines + dots
  series.forEach(s => {
    g.append("path")
      .datum(s.values)
      .attr("fill", "none")
      .attr("stroke", s.color)
      .attr("stroke-width", 2.6)
      .attr("d", line);

    g.selectAll(null)
      .data(s.values)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", s.color)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value));
  });

  // legend
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
      .style("width", "12px").style("height", "12px")
      .style("border-radius", "3px")
      .style("display", "inline-block")
      .style("background", s.color);

    btn.append("span").text(s.name);
  });
}
