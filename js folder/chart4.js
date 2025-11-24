// Use same colours as Chart 1
const CHART4_SERIES = [
  { key: "Camera issued fines",  name: "Camera issued fines",  color: "#3b82f6" },
  { key: "Police issued fines",  name: "Police issued fines",  color: "#22c55e" },
  { key: "Other fines",          name: "Other fines",          color: "#f59e0b" },
  { key: "Unknown fines",        name: "Unknown fines",        color: "#ef4444" }
];

const chart4PctFmt = d3.format(".1f");

// Global init function
function initChart4(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    const seriesMap = {};
    CHART4_SERIES.forEach(s => { seriesMap[s.key] = s; });

    // ---- COMBINE "Unknown fines" into "Other fines" ----
    const agg = {
      "Camera issued fines": 0,
      "Police issued fines": 0,
      "Other fines": 0   // Other + Unknown together
    };

    raw.forEach(d => {
      const method = d["Detection Method"];
      const v = +d["Total Fines"] || 0;

      if (method === "Camera issued fines") {
        agg["Camera issued fines"] += v;
      } else if (method === "Police issued fines") {
        agg["Police issued fines"] += v;
      } else if (method === "Other fines" || method === "Unknown fines") {
        agg["Other fines"] += v;
      }
    });

    const data = Object.entries(agg).map(([method, value]) => ({
      method,
      value,
      color: seriesMap[method]?.color || "#3b82f6",
      name: seriesMap[method]?.name || method
    }));

    drawChart4(containerSelector, data);

    window.addEventListener("resize", () =>
      drawChart4(containerSelector, data)
    );
  });
}

function drawChart4(containerSelector, data) {
  const wrap = d3.select(containerSelector);
  wrap.selectAll("*").remove();

  const width  = Math.max(540, wrap.node().clientWidth || 540);
  const height = 360;
  const radius = Math.min(width, height) / 2 - 40;

  const total = d3.sum(data, d => d.value) || 1;

  const svgRoot = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const svg = svgRoot.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2 + 10})`);

  const pie = d3.pie()
    .sort(null)
    .value(d => d.value);

  const arcs = pie(data);

  const arcNormal = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const outerArc = d3.arc()
    .innerRadius(radius * 1.05)
    .outerRadius(radius * 1.05);

  function midAngle(d) {
    return d.startAngle + (d.endAngle - d.startAngle) / 2;
  }

  // ---------- TOOLTIP ----------
  d3.select("body").selectAll(".chart4-tooltip").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-tooltip chart-tooltip-chart45");

  // ---------- PIE SLICES ----------
  const slices = svg.selectAll("path.slice")
    .data(arcs)
    .enter()
    .append("path")
    .attr("class", "slice")
    .attr("d", arcNormal)
    .attr("fill", d => d.data.color)
    .style("cursor", "pointer");

  slices
    .on("pointerenter", function (event, d) {
      const pct = chart4PctFmt((d.data.value / total) * 100);
      const color = d.data.color;

      tooltip
        .html(`
          <div style="font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px;">
            <span style="
              width:10px;height:10px;
              border-radius:50%;
              background:${color};
              display:inline-block;">
            </span>
            ${d.data.name}
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Fines</span>
            <strong>${d.data.value.toLocaleString()}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Share</span>
            <strong>${pct}%</strong>
          </div>
        `)
        .style("opacity", 1);

      slices.style("opacity", s => (s === d ? 1 : 0.45));
    })
    .on("pointermove", function (event) {
      tooltip
        .style("left", `${event.pageX + 16}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("pointerleave", function () {
      tooltip.style("opacity", 0);
      slices.style("opacity", 1);
    });

  // ---------- BUILD LABEL LAYOUT ----------
  const layout = [];

  arcs.forEach(d => {
    const [, baseY] = outerArc.centroid(d);
    const angle = midAngle(d);
    const side = angle < Math.PI ? "right" : "left";
    layout.push({ arc: d, side, baseY });
  });

  const right = layout
    .filter(l => l.side === "right")
    .sort((a, b) => a.baseY - b.baseY);

  const left = layout
    .filter(l => l.side === "left")
    .sort((a, b) => a.baseY - b.baseY);

  const labelOffsetY = 16;
  const labelRadiusFactor = 1.25;

  right.forEach((item, i) => {
    item.labelX = radius * labelRadiusFactor;
    item.labelY = item.baseY + (i - (right.length - 1) / 2) * labelOffsetY;
  });

  left.forEach((item, i) => {
    item.labelX = -radius * labelRadiusFactor;
    item.labelY = item.baseY + (i - (left.length - 1) / 2) * labelOffsetY;
  });

  const allLayout = right.concat(left);

  // ---------- LEADER LINES ----------
  svg.selectAll("polyline")
    .data(allLayout)
    .enter()
    .append("polyline")
    .attr("fill", "none")
    .attr("stroke", "#9ca3af")
    .attr("stroke-width", 1)
    .attr("points", l => {
      const p1 = arcNormal.centroid(l.arc);
      const p2 = outerArc.centroid(l.arc);
      const p3 = [l.labelX, l.labelY];
      return [p1, p2, p3];
    });

  // ---------- LABELS ----------
  svg.selectAll("text.label")
    .data(allLayout)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("font-size", 12)
    .attr("fill", "#374151")
    .attr("dy", "0.35em")
    .attr("transform", l => `translate(${l.labelX},${l.labelY})`)
    .style("text-anchor", l => (l.side === "right" ? "start" : "end"))
    .text(l => l.arc.data.name);

  // ---------- LEGEND ----------
  const legend = d3.select("#chart4-legend");
  legend.selectAll("*").remove();

  ["Camera issued fines", "Police issued fines", "Other fines"].forEach(key => {
    const s = CHART4_SERIES.find(v => v.key === key);
    if (!s) return;

    const btn = legend.append("button")
      .attr("class", "chart-legend-pill");

    btn.append("span")
      .attr("class", "chart-legend-pill-swatch")
      .style("border-radius", "50%")
      .style("background", s.color);

    btn.append("span").text(s.name);
  });
}
