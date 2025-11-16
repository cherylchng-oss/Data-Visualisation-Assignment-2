// js/chart4.js

// Use same colours as Chart 1
const CHART4_SERIES = [
  { key: "Camera issued fines",  name: "Camera issued fines",  color: "#3b82f6" },
  { key: "Police issued fines",  name: "Police issued fines",  color: "#22c55e" },
  { key: "Other fines",          name: "Other fines",          color: "#facc15" },
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
      } 
      else if (method === "Police issued fines") {
        agg["Police issued fines"] += v;
      } 
      else if (method === "Other fines" || method === "Unknown fines") {
        agg["Other fines"] += v;
      }
    });

    const data = Object.entries(agg)
      .filter(([_, value]) => value > 0)
      .map(([method, value]) => ({
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
  const radius = Math.min(width, height) / 2 - 10;

  const total = d3.sum(data, d => d.value) || 1;

  const svgRoot = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const svg = svgRoot.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

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

  // ---------- TOOLTIP ----------
  const tooltip = wrap.append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("border-radius", "8px")
    .style("box-shadow", "0 10px 30px rgba(0,0,0,0.18)")
    .style("padding", "8px 10px")
    .style("font-size", "12px")
    .style("opacity", 0);

  // ---------- SLICES (NO POP-OUT) ----------
  const slices = svg.selectAll("path.slice")
    .data(arcs)
    .enter()
    .append("path")
    .attr("class", "slice")
    .attr("d", arcNormal)
    .attr("fill", d => d.data.color)
    .style("cursor", "pointer")
    .style("transition", "opacity 0.15s");

  slices
    .on("pointerenter", function (event, d) {
      const pct = chart4PctFmt((d.data.value / total) * 100);
      const html = `
        <div style="font-weight:600;margin-bottom:4px;">
          ${d.data.name}
        </div>
        <div>Fines: ${d.data.value.toLocaleString()}</div>
        <div>Share: ${pct}%</div>
      `;
      tooltip.html(html).style("opacity", 1);

      // dim all other slices
      slices
        .filter(s => s !== d)
        .style("opacity", 0.45);

      // keep hovered slice bright
      d3.select(this).style("opacity", 1);
    })
    .on("pointermove", function (event) {
      tooltip
        .style("left", `${event.pageX + 16}px`)
        .style("top", `${event.pageY - 20}px`);
    })
    .on("pointerleave", function () {
      tooltip.style("opacity", 0);

      // restore all slices
      slices.style("opacity", 1);
    });

  // ---------- LEADER LINES ----------
  svg.selectAll("polyline")
    .data(arcs)
    .enter()
    .append("polyline")
    .attr("fill", "none")
    .attr("stroke", "#9ca3af")
    .attr("stroke-width", 1)
    .attr("points", d => {
      const pos = outerArc.centroid(d);
      const midAngle = (d.startAngle + d.endAngle) / 2;
      const x = radius * 1.15 * (midAngle < Math.PI ? 1 : -1);
      return [arcNormal.centroid(d), outerArc.centroid(d), [x, pos[1]]];
    });

  // ---------- LABELS ----------
  const sideCounts = { left: 0, right: 0 };

  svg.selectAll("text.label")
    .data(arcs)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("font-size", 11)
    .attr("fill", "#374151")
    .attr("dy", "0.35em")
    .attr("transform", d => {
      const pos = outerArc.centroid(d);
      const midAngle = (d.startAngle + d.endAngle) / 2;
      const side = midAngle < Math.PI ? "right" : "left";

      sideCounts[side] += 1;
      const extraY = (sideCounts[side] - 1) * 14;

      const x = radius * 1.18 * (side === "right" ? 1 : -1);
      const y = pos[1] + extraY;

      return `translate(${x},${y})`;
    })
    .style("text-anchor", d => {
      const mid = (d.startAngle + d.endAngle) / 2;
      return mid < Math.PI ? "start" : "end";
    })
    .text(d => {
      const pct = chart4PctFmt((d.data.value / total) * 100);
      return `${d.data.name} (${pct}%)`;
    });

  // ---------- LEGEND ----------
  const legend = d3.select("#chart4-legend");
  legend.selectAll("*").remove();

  ["Camera issued fines", "Police issued fines", "Other fines"].forEach(key => {
    const s = CHART4_SERIES.find(v => v.key === key);
    if (!s) return;

    const btn = legend.append("button")
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
}
