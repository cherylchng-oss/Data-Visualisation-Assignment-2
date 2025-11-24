// Year colours for legend (roughly matching your screenshot)
const CHART5_COLORS = {
  2008: "#3b82f6",
  2009: "#22c55e",
  2010: "#facc15",
  2011: "#ef4444",
  2012: "#38bdf8",
  2013: "#a855f7",
  2014: "#ec4899",
  2015: "#1d4ed8",
  2016: "#16a34a",
  2017: "#fbbf24",
  2018: "#f97316",
  2019: "#fb7185",
  2020: "#0ea5e9",
  2021: "#22c55e",
  2022: "#f97316",
  2023: "#8b5cf6",
  2024: "#a855f7"
};

const chart5NumFmt = d3.format(",.0f");

// Global init
function initChart5(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    const data = raw.map(d => ({
      year: +d["Year"],
      value: +d["Total Fines"]
    })).filter(d => !isNaN(d.year) && !isNaN(d.value));

    // sort by year just in case
    data.sort((a, b) => d3.ascending(a.year, b.year));

    drawChart5(containerSelector, data);

    window.addEventListener("resize", () =>
      drawChart5(containerSelector, data)
    );
  });
}

function drawChart5(containerSelector, data) {
  const wrap = d3.select(containerSelector);
  wrap.selectAll("*").remove();

  const width  = Math.max(720, wrap.node().clientWidth || 720);
  const height = 460;
  const m = { top: 24, right: 24, bottom: 60, left: 80 };

  const svg = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const years = data.map(d => d.year);
  const x = d3.scaleBand()
    .domain(years)
    .range([m.left, width - m.right])
    .padding(0.25);

  const yMax = d3.max(data, d => d.value) || 1;

  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([height - m.bottom, m.top]);

  // ---- X axis ----
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickSize(0)
    );

  xAxis.selectAll("text")
    .attr("dy", "1.2em");

  // grid lines for x
  svg.append("g")
    .attr("class", "x-grid")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickSize(0)
        .tickFormat("")
    )
    .selectAll("line")
    .attr("stroke", "#f1f5f9");

  // ---- Y axis (scientific notation like other charts) ----
  const yAxis = d3.axisLeft(y)
    .ticks(6)
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
    .attr("x", (m.left + (width - m.right)) / 2)
    .attr("y", height - 20)
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#6b7280")
    .text("Year");

  // ---- Bars ----
  const bars = svg.append("g");

  bars.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.value))
    .attr("fill", d => CHART5_COLORS[d.year] || "#3b82f6")
    .attr("rx", 4)
    .attr("ry", 4);

  // Value labels on top of bars (optional, can remove if you like)
  bars.selectAll("text.value-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "value-label")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("fill", "#4b5563")
    .text(d => chart5NumFmt(d.value));

  // ---- Tooltip ----
  d3.select("body").selectAll(".chart5-tooltip").remove();

  // tooltip attached to body to prevent clipping
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-tooltip chart-tooltip-chart45");

  svg.selectAll("rect")
    .on("mousemove", function (event, d) {
      const color = CHART5_COLORS[d.year] || "#3b82f6";

      const html = `
        <div style="font-weight:600;margin-bottom:4px;">
          Total fines
        </div>
        <div style="
            display:flex;
            align-items:center;
            gap:6px;">
          <span style="
            width:10px;height:10px;
            border-radius:50%;
            background:${color};
            flex-shrink:0;"></span>
          <span style="font-weight:500;">${d.year}</span>
          <span style="
            margin-left:auto;
            font-weight:700;">
            ${chart5NumFmt(d.value)}
          </span>
        </div>
      `;

      tooltip.html(html).style("opacity", 1);

      tooltip
        .style("left", `${event.pageX + 16}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  // ---- Legend ----
  const legend = d3.select("#chart5-legend");
  legend.selectAll("*").remove();

  data.forEach(d => {
    const btn = legend.append("button")
      .attr("type", "button")
      .attr("class", "chart-legend-pill");

    btn.append("span")
      .attr("class", "chart-legend-pill-swatch")
      .style("border-radius", "50%")
      .style("background", CHART5_COLORS[d.year] || "#3b82f6");

    btn.append("span").text(d.year);
  });
}