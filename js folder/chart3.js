// Keep colours consistent with Chart 2
const CHART3_COLORS = {
  NSW: "#648FFF", 
  NT:  "#785EF0", 
  QLD:"#DC267F", 
  SA:  "#FE6100", 
  TAS:"#FFCF00",  
  VIC:"#004D40",  
  WA: "#C72E0F",  
  ACT:"#CEAC9D"   
};

const chart3Fmt = d3.format(",.2f"); // for bar-end labels

// Global init
function initChart3(containerSelector, csvPath) {
  d3.csv(csvPath).then(raw => {
    // --- Prepare full dataset ---
    const allData = raw
      .map(d => ({
        year: +d["Year"],
        jurisdiction: d["Jurisdiction"],
        value: +d["Fines Per 10000 Driver License"]
      }))
      .filter(d => !isNaN(d.year) && !isNaN(d.value));

    // Unique years (sorted ascending)
    const years = Array.from(new Set(allData.map(d => d.year))).sort(d3.ascending);

    // Default year: prefer 2024, otherwise latest year in data
    const defaultYear = years.includes(2024) ? 2024 : d3.max(years);

    // ----- Build / populate year dropdown -----
    const yearSelect = d3.select("#chart3-year-select");
    yearSelect.selectAll("*").remove();

    yearSelect
      .selectAll("option")
      .data(years)
      .enter()
      .append("option")
      .attr("value", d => d)
      .property("selected", d => d === defaultYear)
      .text(d => d);

    // Helper: get data for a single year + sort descending
    function getDataForYear(y) {
      const yearData = allData
        .filter(d => d.year === y)
        .map(d => ({
          jurisdiction: d.jurisdiction,
          value: d.value
        }));

      yearData.sort((a, b) => d3.descending(a.value, b.value));
      return yearData;
    }

    let currentYear = defaultYear;
    let currentData = getDataForYear(currentYear);

    // Update caption year text if element exists
    d3.select("#chart3-caption-year").text(currentYear);

    // Initial draw (with animation)
    drawChart3(containerSelector, currentData);

    // When user changes year
    yearSelect.on("change", function () {
      currentYear = +this.value;
      currentData = getDataForYear(currentYear);

      drawChart3(containerSelector, currentData); // redraw with transition
      d3.select("#chart3-caption-year").text(currentYear);
    });

    // Redraw on resize with currently selected year data
    window.addEventListener("resize", () =>
      drawChart3(containerSelector, currentData)
    );
  });
}

function drawChart3(containerSelector, data) {
  const wrap = d3.select(containerSelector);
  wrap.selectAll("*").remove();

  const width  = Math.max(720, wrap.node().clientWidth || 720);
  const height = 420;
  const m = { top: 24, right: 80, bottom: 40, left: 160 };

  const svg = wrap.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", height);

  const jurisdictions = data.map(d => d.jurisdiction);
  const xMax = d3.max(data, d => d.value) || 1;

  const x = d3.scaleLinear()
    .domain([0, xMax * 1.05]).nice()
    .range([m.left, width - m.right]);

  const y = d3.scaleBand()
    .domain(jurisdictions)
    .range([m.top, height - m.bottom])
    .paddingInner(0.25);

  // ----- X axis -----
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(6)
        .tickFormat(d3.format(".0f"))
        .tickSize(-(height - m.top - m.bottom))
        .tickSizeOuter(0)
    );

  xAxis.selectAll(".tick line")
    .attr("stroke", "#e5e7eb");

  // ----- Y axis -----
  const yAxis = svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(
      d3.axisLeft(y)
        .tickSize(0)
        .tickPadding(8)
    );

  yAxis.selectAll("path").attr("stroke", "#6b7280");
  yAxis.selectAll("text")
    .attr("font-weight", 600);

  // Axis labels
  svg.append("text")
    .attr("x", (m.left + (width - m.right)) / 2)
    .attr("y", height - 8)
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#6b7280")
    .text("Fines per 10,000 driver licences");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(m.top + (height - m.top - m.bottom) / 2))
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#6b7280")
    .text("Jurisdiction");

  // ----- Bars (with transition) -----
  const barGroup = svg.append("g");
  const barHeight = y.bandwidth() * 0.7;

  const bars = barGroup.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", d => y(d.jurisdiction) + (y.bandwidth() - barHeight) / 2)
    .attr("width", 0)                   
    .attr("height", barHeight)
    .attr("fill", d => CHART3_COLORS[d.jurisdiction] || "#3b82f6")
    .attr("rx", 6)
    .attr("ry", 6);

  // Animate bar width to final value
  bars.transition()
    .duration(650)
    .ease(d3.easeCubicOut)
    .attr("width", d => x(d.value) - x(0));

  // ----- Value labels (also animated) -----
  const labels = barGroup.selectAll("text.value-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "value-label")
    .attr("x", x(0) + 6) 
    .attr("y", d => y(d.jurisdiction) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("font-size", 11)
    .attr("fill", "#4b5563")
    .style("opacity", 0)
    .text(d => chart3Fmt(d.value));

  labels.transition()
    .duration(650)
    .delay(150)
    .ease(d3.easeCubicOut)
    .attr("x", d => x(d.value) + 6)
    .style("opacity", 1);

  // ----- Legend -----
  const legend = d3.select("#chart3-legend");
  legend.selectAll("*").remove();

  data.forEach(d => {
    const j = d.jurisdiction;
    const btn = legend.append("button")
      .attr("type", "button")
      .attr("class", "chart-legend-pill");

    btn.append("span")
      .attr("class", "chart-legend-pill-swatch")
      .style("border-radius", "50%")
      .style("background", CHART3_COLORS[j] || "#3b82f6");

    btn.append("span").text(j);
  });

  // ----- Tooltip -----
  const tooltip = wrap.append("div")
    .attr("class", "chart-tooltip chart-tooltip--wide");

  bars
    .on("mousemove", function (event, d) {
      const fullValue = d.value; 
      const color = CHART3_COLORS[d.jurisdiction] || "#3b82f6";

      const html = `
        <div style="font-weight:600;margin-bottom:4px;">
          Fines Per 10000 Driver License
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="
            width:10px;height:10px;border-radius:50%;
            background:${color};flex-shrink:0;"></span>
          <span style="font-weight:500;">${d.jurisdiction}</span>
          <span style="margin-left:auto;font-weight:700;">
            ${fullValue}
          </span>
        </div>
      `;

      tooltip
        .html(html)
        .style("opacity", 1);

      const pageX = event.pageX;
      const pageY = event.pageY;

      tooltip
        .style("left", `${pageX + 16}px`)
        .style("top", `${pageY - 24}px`);
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
    });
}