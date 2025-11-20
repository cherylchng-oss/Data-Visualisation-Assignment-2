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

  const width = 900;
  const height = 480;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart6-tooltip");

  // Colour by primary enforcement method
  const methodColor = d3.scaleOrdinal()
    .domain(["Camera", "Police", "Other", "Unknown"])
    .range(["#3b82f6", "#22c55e", "#f59e0b", "#6b7280"]);

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
      console.log("Chart6 – mapData:", mapData);

      // ----- Detect GeoJSON vs TopoJSON -----
      let geo;
      if (mapData.type === "Topology") {
        const objectKeys = Object.keys(mapData.objects || {});
        if (!objectKeys.length) {
          console.error("Chart6: No 'objects' in Topology file.");
          return;
        }
        const firstKey = objectKeys[0];
        console.log("Chart6 – using Topology object:", firstKey);
        geo = topojson.feature(mapData, mapData.objects[firstKey]);
      } else {
        console.log("Chart6 – detected GeoJSON.");
        geo = mapData; // assume GeoJSON
      }

      if (!geo || !geo.features || !geo.features.length) {
        console.error("Chart6: No features found in map file.");
        return;
      }

      // Group data: Year -> Jurisdiction -> row
      const dataByYear = d3.group(
        data,
        d => d.Year,
        d => d.Jurisdiction
      );

      const years = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
      let currentYear = years[0];

      // ----- Slider config -----
      slider
        .attr("min", d3.min(years))
        .attr("max", d3.max(years))
        .attr("step", 1)
        .attr("value", currentYear)
        .on("input", (event) => {
          currentYear = +event.target.value;
          yearLabel.text(currentYear);
          updateMap();
        });

      yearLabel.text(currentYear);

      // ----- Projection & path -----
      const projection = d3.geoMercator()
        .fitSize([width, height], geo);

      const path = d3.geoPath(projection);

      const g = svg.append("g").attr("class", "chart6-map");

      const statePaths = g.selectAll("path")
        .data(geo.features)
        .join("path")
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

          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${abbr}</strong><br/>
              Year: ${currentYear}<br/>
              Total fines: ${fmtComma(row["Total Fines"])}<br/>
              Camera: ${fmtPct(row["Camera Percentage"])}<br/>
              Police: ${fmtPct(row["Police Percentage"])}<br/>
              Other: ${fmtPct(row["Other Percentage"])}<br/>
              Unknown: ${fmtPct(row["Unknown Percentage"])}<br/>
              Primary method: <strong>${row["Primary Enforcement Method"]}</strong>
            `)
            .style("left", (event.pageX + 16) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0);
        });

      // ----- Legend -----
      const legend = svg.append("g")
        .attr("class", "chart6-legend")
        .attr("transform", `translate(${width - 180}, 20)`);

      const legendItems = methodColor.domain();

      legend.selectAll("g")
        .data(legendItems)
        .join("g")
        .attr("transform", (d, i) => `translate(0, ${i * 18})`)
        .each(function (d) {
          const gItem = d3.select(this);
          gItem.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", methodColor(d));

          gItem.append("text")
            .attr("x", 20)
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

      function updateMap() {
        statePaths
          .transition()
          .duration(400)
          .attr("fill", d => {
            const abbr = getAbbr(d);
            const row = getRow(currentYear, abbr);
            if (!row) return "#e5e7eb";
            const method = row["Primary Enforcement Method"];
            return methodColor(method) || "#e5e7eb";
          });
      }

      // Initial render
      updateMap();
    })
    .catch(err => {
      console.error("Chart6: error loading data or map:", err);
    });
}