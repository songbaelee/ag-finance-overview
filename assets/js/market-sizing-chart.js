/* Illustrative demand-side model for Market Sizing: one state object
   (three tiers, each with a count and an average transaction size),
   read by every view on the page -- a draggable population bar, three
   independent avg-size sliders, the stacked $ bar chart + SME-count
   line, the composition donut, the data table, and a comparison note.
   Supply-side figures (bank/fund/gap composition) are frozen constants
   for this phase; only demand-side count/avgSize are adjustable.
   Self-contained: no libraries, session-only state, no backend. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var TOTAL_COUNT = 130000;

  // Frozen supply-side figures ($B) -- next phase, not adjustable here.
  var SUPPLY = {
    small: { bank: 0.1, fund: 0.4 },
    medium: { bank: 1.4, fund: 1.6 },
    upper: { bank: 9.5, fund: 1.0 }
  };

  var AVG_SIZE_RANGE = {
    small: { min: 50000, max: 450000, step: 5000 },
    medium: { min: 150000, max: 1500000, step: 10000 },
    upper: { min: 1500000, max: 10000000, step: 50000 }
  };

  var REPORTED_TOTAL_DEMAND_B = 88.1;

  var state = {
    segments: [
      { key: "small", name: "Small SME", count: 78000, avgSize: 150000 },
      { key: "medium", name: "Medium SME", count: 39000, avgSize: 500000 },
      { key: "upper", name: "Upper SME", count: 13000, avgSize: 4400000 }
    ]
  };

  function compute() {
    var rows = state.segments.map(function (seg) {
      var totalB = (seg.count * seg.avgSize) / 1e9;
      var sup = SUPPLY[seg.key];
      var supplyTotal = sup.bank + sup.fund;
      var gap = totalB - supplyTotal;
      var pctMet = totalB > 0 ? (supplyTotal / totalB) * 100 : 0;
      return {
        key: seg.key, name: seg.name, count: seg.count, avgSize: seg.avgSize,
        total: totalB, bank: sup.bank, fund: sup.fund, supplyTotal: supplyTotal,
        gap: gap, pctMet: pctMet
      };
    });

    var totalDemand = rows.reduce(function (s, r) { return s + r.total; }, 0);
    var totalSupply = rows.reduce(function (s, r) { return s + r.supplyTotal; }, 0);
    var totalGap = totalDemand - totalSupply;
    var totalPctMet = totalDemand > 0 ? (totalSupply / totalDemand) * 100 : 0;
    var totalAvg = TOTAL_COUNT > 0 ? (totalDemand * 1e9) / TOTAL_COUNT : 0;

    return {
      rows: rows,
      totalCount: TOTAL_COUNT,
      totalAvg: totalAvg,
      totalDemand: totalDemand,
      totalSupply: totalSupply,
      totalGap: totalGap,
      totalPctMet: totalPctMet
    };
  }

  var SERIES = [
    { key: "bank", label: "Bank supply", varName: "--series-bank" },
    { key: "fund", label: "Fund supply", varName: "--series-fund" },
    { key: "gap", label: "Unmet gap", varName: "--series-gap" }
  ];

  var RIGHT_DOMAIN_MAX = TOTAL_COUNT;
  var RIGHT_TICKS = [0, 50000, 100000, TOTAL_COUNT];

  function fmtB(v) {
    return "$" + (Math.round(v * 10) / 10).toFixed(1) + "B";
  }

  function fmtCount(v) {
    return Math.round(v).toLocaleString("en-US");
  }

  function fmtCountShort(v) {
    return (v / 1000) + "K";
  }

  function fmtMoney(v) {
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return "$" + Math.round(v / 1e3) + "K";
    return "$" + Math.round(v);
  }

  // Rounds a raw value up to a "nice" 1/2/5 x 10^n ceiling, so a dynamic
  // axis domain (driven by adjustable sliders, not fixed data) still gets
  // clean-looking gridlines instead of an arbitrary max.
  function niceCeil(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var norm = v / mag;
    var niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return niceNorm * mag;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  }

  function roundedTopPath(x, w, yTop, yBottom, r) {
    var h = yBottom - yTop;
    var rad = Math.max(0, Math.min(r, h, w / 2));
    return [
      "M", x, yBottom,
      "L", x, yTop + rad,
      "Q", x, yTop, x + rad, yTop,
      "L", x + w - rad, yTop,
      "Q", x + w, yTop, x + w, yTop + rad,
      "L", x + w, yBottom,
      "Z"
    ].join(" ");
  }

  function roundedHBarPath(x, y, w, h, rL, rR) {
    rL = Math.max(0, Math.min(rL, h / 2, w / 2));
    rR = Math.max(0, Math.min(rR, h / 2, w / 2));
    return [
      "M", x + rL, y,
      "L", x + w - rR, y,
      "Q", x + w, y, x + w, y + rR,
      "L", x + w, y + h - rR,
      "Q", x + w, y + h, x + w - rR, y + h,
      "L", x + rL, y + h,
      "Q", x, y + h, x, y + h - rL,
      "L", x, y + rL,
      "Q", x, y, x + rL, y,
      "Z"
    ].join(" ");
  }

  // Separator between two touching stacked segments: a 2px surface-color
  // gap looks fine on large segments, but on a thin one (e.g. Fund supply,
  // often just a few px tall) a fixed 2px cut on each side can visually
  // erase most of the segment. Scale the gap to the thinner neighbor
  // instead, capped at 2px, and skip it below a barely-visible floor.
  function separatorThickness(hA, hB) {
    var minH = Math.min(hA, hB);
    var t = Math.min(2, minH * 0.25);
    return t < 0.4 ? 0 : t;
  }

  function buildLegend(container, extraClass) {
    var legend = document.createElement("div");
    legend.className = "chart-legend" + (extraClass ? " " + extraClass : "");
    SERIES.forEach(function (s) {
      var item = document.createElement("span");
      item.className = "chart-legend__item";

      var swatch = document.createElement("span");
      swatch.className = "chart-legend__swatch";
      swatch.style.background = "var(" + s.varName + ")";
      item.appendChild(swatch);

      var label = document.createElement("span");
      label.textContent = s.label;
      item.appendChild(label);

      legend.appendChild(item);
    });
    container.appendChild(legend);
    return legend;
  }

  function buildTooltip(wrap) {
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.setAttribute("role", "status");
    wrap.appendChild(tip);
    return tip;
  }

  function fillTooltip(tip, tier) {
    tip.textContent = "";

    var title = document.createElement("div");
    title.className = "tt-title";
    title.textContent = tier.name;
    var totalSpan = document.createElement("span");
    totalSpan.className = "tt-total";
    totalSpan.textContent = " — " + fmtB(tier.total) + " total demand";
    title.appendChild(totalSpan);
    tip.appendChild(title);

    SERIES.forEach(function (s) {
      var row = document.createElement("div");
      row.className = "tt-row";

      var key = document.createElement("span");
      key.className = "tt-key";
      key.style.background = "var(" + s.varName + ")";
      row.appendChild(key);

      var label = document.createElement("span");
      label.textContent = s.label;
      row.appendChild(label);

      var val = document.createElement("strong");
      val.textContent = fmtB(tier[s.key]);
      row.appendChild(val);

      tip.appendChild(row);
    });

    var countRow = document.createElement("div");
    countRow.className = "tt-row";
    var countKey = document.createElement("span");
    countKey.className = "tt-key";
    countKey.style.background = "var(--series-count)";
    countRow.appendChild(countKey);
    var countLabel = document.createElement("span");
    countLabel.textContent = "# of SMEs";
    countRow.appendChild(countLabel);
    var countVal = document.createElement("strong");
    countVal.textContent = fmtCount(tier.count);
    countRow.appendChild(countVal);
    tip.appendChild(countRow);
  }

  function positionTooltip(tip, wrap, evt) {
    var rect = wrap.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function renderBarChart(container) {
    container.innerHTML = "";

    var rows = compute().rows;
    var maxTierTotal = rows.reduce(function (m, r) { return Math.max(m, r.total); }, 0);
    var LEFT_DOMAIN_MAX = niceCeil(maxTierTotal * 1.15);
    var LEFT_TICKS = [0, LEFT_DOMAIN_MAX / 4, LEFT_DOMAIN_MAX / 2, LEFT_DOMAIN_MAX * 3 / 4, LEFT_DOMAIN_MAX];

    var W = 640, H = 380;
    var margin = { top: 52, right: 70, bottom: 62, left: 60 };
    var plotW = W - margin.left - margin.right;
    var plotH = H - margin.top - margin.bottom;
    var plotTop = margin.top;
    var plotBottom = margin.top + plotH;

    function yLeft(v) {
      return plotBottom - (v / LEFT_DOMAIN_MAX) * plotH;
    }
    function yRight(v) {
      return plotBottom - (v / RIGHT_DOMAIN_MAX) * plotH;
    }

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label":
        "Stacked bar chart of illustrative bank supply, fund supply, and unmet " +
        "financing gap in US dollars billions, by agri-SME tier, with a line " +
        "showing the number of SMEs per tier on a secondary axis."
    });

    // left axis gridlines + tick labels
    LEFT_TICKS.forEach(function (t) {
      var y = yLeft(t);
      svg.appendChild(
        svgEl("line", {
          class: "chart-gridline",
          x1: margin.left,
          x2: margin.left + plotW,
          y1: y,
          y2: y
        })
      );
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left - 8,
        y: y,
        "text-anchor": "end",
        "dominant-baseline": "middle"
      });
      label.textContent = fmtB(t);
      svg.appendChild(label);
    });

    // right axis tick labels (SME count) — ticks only, no gridlines, so the
    // two scales never look like they share one grid
    RIGHT_TICKS.forEach(function (t) {
      var y = yRight(t);
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left + plotW + 8,
        y: y,
        "text-anchor": "start",
        "dominant-baseline": "middle"
      });
      label.textContent = t === 0 ? "0" : fmtCountShort(t);
      svg.appendChild(label);
    });

    // axis titles — left/right are rotated to sit in the outer margins;
    // x-axis title sits centered below the category labels
    var plotMidY = plotTop + plotH / 2;
    var leftAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: 14,
      y: plotMidY,
      "text-anchor": "middle",
      transform: "rotate(-90 14 " + plotMidY + ")"
    });
    leftAxisTitle.textContent = "Total demand ($)";
    svg.appendChild(leftAxisTitle);

    var rightAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: W - 14,
      y: plotMidY,
      "text-anchor": "middle",
      transform: "rotate(90 " + (W - 14) + " " + plotMidY + ")"
    });
    rightAxisTitle.textContent = "# of SMEs";
    svg.appendChild(rightAxisTitle);

    var xAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: margin.left + plotW / 2,
      y: plotBottom + 46,
      "text-anchor": "middle"
    });
    xAxisTitle.textContent = "Firm tier";
    svg.appendChild(xAxisTitle);

    // baseline (redraw over the 0-gridline, slightly darker)
    svg.appendChild(
      svgEl("line", {
        class: "chart-baseline",
        x1: margin.left,
        x2: margin.left + plotW,
        y1: plotBottom,
        y2: plotBottom
      })
    );

    var slotCount = rows.length;
    var slotW = plotW / slotCount;
    var barWidth = 24;

    var wrap = container;
    var tip = buildTooltip(wrap);

    var linePoints = [];

    rows.forEach(function (tier, i) {
      var slotCenter = margin.left + slotW * (i + 0.5);
      var barX = slotCenter - barWidth / 2;

      var yBank0 = plotBottom;
      var yBank1 = yLeft(tier.bank);
      var yFund1 = yLeft(tier.bank + tier.fund);
      var yGap1 = yLeft(tier.total);

      var bankH = yBank0 - yBank1;
      var fundH = yBank1 - yFund1;
      var gapH = yFund1 - yGap1;

      var g = svgEl("g", { class: "chart-bar" });

      var bankRect = svgEl("rect", {
        class: "chart-seg",
        x: barX,
        y: yBank1,
        width: barWidth,
        height: bankH,
        style: "fill:var(--series-bank)"
      });
      g.appendChild(bankRect);

      var fundRect = svgEl("rect", {
        class: "chart-seg",
        x: barX,
        y: yFund1,
        width: barWidth,
        height: fundH,
        style: "fill:var(--series-fund)"
      });
      g.appendChild(fundRect);

      var gapPath = svgEl("path", {
        class: "chart-seg",
        d: roundedTopPath(barX, barWidth, yGap1, yFund1, 4),
        style: "fill:var(--series-gap)"
      });
      g.appendChild(gapPath);

      // surface-color separators at the two internal seams, sized
      // proportionally to whichever neighboring segment is thinner
      var sepBankFund = separatorThickness(bankH, fundH);
      if (sepBankFund > 0) {
        g.appendChild(
          svgEl("rect", {
            x: barX,
            y: yBank1 - sepBankFund / 2,
            width: barWidth,
            height: sepBankFund,
            style: "fill:var(--surface-1)"
          })
        );
      }
      var sepFundGap = separatorThickness(fundH, gapH);
      if (sepFundGap > 0) {
        g.appendChild(
          svgEl("rect", {
            x: barX,
            y: yFund1 - sepFundGap / 2,
            width: barWidth,
            height: sepFundGap,
            style: "fill:var(--surface-1)"
          })
        );
      }

      // "Total demand" caption + bold value, stacked above the bar cap
      var label = svgEl("text", {
        x: slotCenter,
        y: yGap1 - 30,
        "text-anchor": "middle"
      });
      var captionTspan = svgEl("tspan", {
        class: "chart-tick-label",
        x: slotCenter
      });
      captionTspan.textContent = "Total demand";
      label.appendChild(captionTspan);
      var valueTspan = svgEl("tspan", {
        class: "chart-value-label",
        x: slotCenter,
        dy: "14"
      });
      valueTspan.textContent = fmtB(tier.total);
      label.appendChild(valueTspan);
      g.appendChild(label);

      // category label below the axis
      var catLabel = svgEl("text", {
        class: "chart-category-label",
        x: slotCenter,
        y: plotBottom + 20,
        "text-anchor": "middle"
      });
      catLabel.textContent = tier.name;
      g.appendChild(catLabel);

      linePoints.push({ x: slotCenter, y: yRight(tier.count), tier: tier });

      // transparent hit area: the whole column, taller than the bar,
      // so the hover/focus target is generous and one tooltip covers
      // every series (plus the SME count) for this tier at once
      var hit = svgEl("rect", {
        class: "chart-bar-hit",
        x: slotCenter - slotW / 2 + 2,
        y: plotTop,
        width: slotW - 4,
        height: plotH,
        tabindex: "0",
        role: "button",
        "aria-label":
          tier.name +
          ": " +
          fmtB(tier.total) +
          " total demand — bank supply " +
          fmtB(tier.bank) +
          ", fund supply " +
          fmtB(tier.fund) +
          ", unmet gap " +
          fmtB(tier.gap) +
          ", " +
          fmtCount(tier.count) +
          " SMEs"
      });

      function show(evt) {
        g.classList.add("is-active");
        fillTooltip(tip, tier);
        tip.classList.add("is-visible");
        if (evt && evt.clientX !== undefined) positionTooltip(tip, wrap, evt);
      }
      function hide() {
        g.classList.remove("is-active");
        tip.classList.remove("is-visible");
      }

      hit.addEventListener("pointerenter", show);
      hit.addEventListener("pointermove", show);
      hit.addEventListener("pointerleave", hide);
      hit.addEventListener("focus", function () {
        show({});
        var r = hit.getBoundingClientRect();
        var wrapRect = wrap.getBoundingClientRect();
        tip.style.left = r.left + r.width / 2 - wrapRect.left + "px";
        tip.style.top = r.top - wrapRect.top + "px";
      });
      hit.addEventListener("blur", hide);

      g.appendChild(hit);
      svg.appendChild(g);
    });

    // SME-count line + end-dots on the secondary axis, drawn above the bars
    var polyline = svgEl("polyline", {
      points: linePoints.map(function (p) { return p.x + "," + p.y; }).join(" "),
      fill: "none",
      style: "stroke:var(--series-count)",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    svg.appendChild(polyline);

    linePoints.forEach(function (p, i) {
      svg.appendChild(
        svgEl("circle", {
          cx: p.x,
          cy: p.y,
          r: 5,
          style: "fill:var(--series-count);stroke:var(--surface-1)",
          "stroke-width": "2"
        })
      );
      // place the count label on whichever side of the dot has more
      // headroom, so it doesn't collide with the plot edges
      var above = p.y - plotTop > 24;
      var countLabel = svgEl("text", {
        class: "chart-tick-label",
        x: p.x,
        y: above ? p.y - 12 : p.y + 18,
        "text-anchor": "middle"
      });
      countLabel.textContent = fmtCount(p.tier.count);
      svg.appendChild(countLabel);
    });

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    var legend = buildLegend(container);
    var lineItem = document.createElement("span");
    lineItem.className = "chart-legend__item";
    var lineSwatch = document.createElement("span");
    lineSwatch.className = "chart-legend__swatch chart-legend__swatch--line";
    lineSwatch.style.background = "var(--series-count)";
    lineItem.appendChild(lineSwatch);
    var lineLabel = document.createElement("span");
    lineLabel.textContent = "# of SMEs (right axis)";
    lineItem.appendChild(lineLabel);
    legend.appendChild(lineItem);
  }

  function renderCompositionDonut(container) {
    container.innerHTML = "";

    var c = compute();
    var bankTotal = c.rows.reduce(function (s, r) { return s + r.bank; }, 0);
    var fundTotal = c.rows.reduce(function (s, r) { return s + r.fund; }, 0);
    var composition = [
      { key: "bank", label: "Bank supply", varName: "--series-bank", value: bankTotal },
      { key: "fund", label: "Fund supply", varName: "--series-fund", value: fundTotal },
      { key: "gap", label: "Unmet gap", varName: "--series-gap", value: c.totalGap }
    ];
    var total = composition.reduce(function (sum, d) { return sum + d.value; }, 0);

    var size = 220;
    var cx = size / 2, cy = size / 2;
    var r = 78;
    var strokeWidth = 30;
    var circumference = 2 * Math.PI * r;
    var GAP = 2.5;

    var svg = svgEl("svg", {
      viewBox: "0 0 " + size + " " + size,
      role: "img",
      "aria-label":
        "Donut chart showing the composition of the " + fmtB(total) + " illustrative " +
        "total demand: bank supply, fund supply, and unmet gap."
    });

    var group = svgEl("g", {
      transform: "rotate(-90 " + cx + " " + cy + ")"
    });

    var cumulative = 0;
    composition.forEach(function (d) {
      var fraction = total > 0 ? d.value / total : 0;
      var rawLen = circumference * fraction;
      var drawLen = Math.max(1, rawLen - GAP);
      var circle = svgEl("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        style: "stroke:var(" + d.varName + ")",
        "stroke-width": strokeWidth,
        "stroke-dasharray": drawLen + " " + (circumference - drawLen),
        "stroke-dashoffset": -cumulative
      });
      group.appendChild(circle);
      cumulative += rawLen;
    });
    svg.appendChild(group);

    var centerLabel = svgEl("text", {
      x: cx,
      y: cy - 6,
      "text-anchor": "middle"
    });
    var t1 = svgEl("tspan", { class: "chart-tick-label", x: cx });
    t1.textContent = "Total demand";
    centerLabel.appendChild(t1);
    var t2 = svgEl("tspan", { class: "chart-value-label", x: cx, dy: "16" });
    t2.textContent = fmtB(total);
    centerLabel.appendChild(t2);
    svg.appendChild(centerLabel);

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    var legend = document.createElement("div");
    legend.className = "chart-legend chart-legend--column";
    composition.forEach(function (d) {
      var pct = total > 0 ? (d.value / total) * 100 : 0;
      var item = document.createElement("span");
      item.className = "chart-legend__item";

      var swatch = document.createElement("span");
      swatch.className = "chart-legend__swatch";
      swatch.style.background = "var(" + d.varName + ")";
      item.appendChild(swatch);

      var label = document.createElement("span");
      label.textContent = d.label + " — ";
      item.appendChild(label);

      var val = document.createElement("strong");
      val.textContent = fmtB(d.value) + " (" + pct.toFixed(1) + "%)";
      item.appendChild(val);

      legend.appendChild(item);
    });
    container.appendChild(legend);
  }

  // ---------- population bar (draggable count dividers) ----------

  var TIER_COLOR_VAR = {
    small: "--series-orange",
    medium: "--series-magenta",
    upper: "--series-green"
  };

  var popDiagram = { container: null };
  var focusedPopDividerKey = null;

  function renderPopulationBar(container) {
    container.innerHTML = "";

    var W = 640, plotLeft = 16, rightPad = 16;
    var plotWidth = W - plotLeft - rightPad;
    var rowH = 34, topPad = 26, bottomPad = 34;
    var H = topPad + rowH + bottomPad;
    var y = topPad;

    var rows = compute().rows;

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label":
        "Draggable bar showing how the " + fmtCount(TOTAL_COUNT) + " agri-SMEs split " +
        "across tiers: " + rows.map(function (r) {
          return r.name + " " + fmtCount(r.count);
        }).join(", ") + "."
    });

    var xCursor = plotLeft;
    var narrowCount = 0;

    rows.forEach(function (r, i) {
      var w = Math.max((r.count / TOTAL_COUNT) * plotWidth, 0.01);
      var isFirst = i === 0, isLast = i === rows.length - 1;
      var rL = isFirst ? 4 : 0, rR = isLast ? 4 : 0;
      var varName = TIER_COLOR_VAR[r.key];

      var path = svgEl("path", {
        d: roundedHBarPath(xCursor, y, w, rowH, rL, rR),
        style: "fill:var(" + varName + ")"
      });
      svg.appendChild(path);

      var countText = fmtCount(r.count);
      if (w > 90) {
        var lbl = svgEl("text", {
          class: "level-seg-label", x: xCursor + w / 2, y: y + rowH / 2 - 4, "text-anchor": "middle"
        });
        lbl.textContent = r.name;
        svg.appendChild(lbl);
        var cnt = svgEl("text", {
          class: "level-seg-pct", x: xCursor + w / 2, y: y + rowH / 2 + 11, "text-anchor": "middle"
        });
        cnt.textContent = countText;
        svg.appendChild(cnt);
      } else {
        var segCenter = xCursor + w / 2;
        var offset = 8 + narrowCount * 10;
        var labelY = y + rowH + offset + 8;
        var tickY1 = labelY - 6, tickY2 = y + rowH;
        narrowCount++;

        svg.appendChild(svgEl("line", {
          class: "level-leader-line", x1: segCenter, x2: segCenter, y1: tickY1, y2: tickY2
        }));
        var leaderLbl = svgEl("text", {
          class: "level-leader-label", x: segCenter, y: labelY, "text-anchor": "middle"
        });
        leaderLbl.textContent = r.name + " · " + countText;
        svg.appendChild(leaderLbl);
      }

      if (!isLast) {
        var nextW = Math.max((rows[i + 1].count / TOTAL_COUNT) * plotWidth, 0.01);
        var sep = separatorThickness(w, nextW);
        if (sep > 0) {
          svg.appendChild(svgEl("rect", {
            x: xCursor + w - sep / 2, y: y, width: sep, height: rowH,
            style: "fill:var(--surface-1)"
          }));
        }
      }

      xCursor += w;
    });

    // Draggable dividers -- direct drag on the bar, plus arrow-key nudging
    // when focused, following the same mechanics used on Closing the Gap:
    // document-level pointer listeners (so dragging survives the full
    // rebuild triggered on every move) and a pendingFocusEl handoff so
    // keyboard focus isn't lost across that same rebuild.
    var pendingFocusEl = null;

    function countToX(count) {
      return plotLeft + (count / TOTAL_COUNT) * plotWidth;
    }
    function xToCount(clientX) {
      var currentSvg = container.querySelector("svg");
      var rect = currentSvg.getBoundingClientRect();
      var scale = W / rect.width;
      var xUser = (clientX - rect.left) * scale;
      return ((xUser - plotLeft) / plotWidth) * TOTAL_COUNT;
    }

    function addDivider(key, cumPos, min, max, onSet, ariaLabel) {
      var x = countToX(cumPos);
      var gripW = 10, gripH = rowH + 8;
      svg.appendChild(svgEl("rect", {
        class: "tacg-divider-grip",
        x: x - gripW / 2, y: y - 4, width: gripW, height: gripH, rx: gripW / 2
      }));

      var hitW = 22;
      var hit = svgEl("rect", {
        class: "tacg-divider-hit",
        x: x - hitW / 2, y: y - 8, width: hitW, height: rowH + 16,
        tabindex: "0", role: "slider",
        "aria-label": ariaLabel,
        "aria-valuemin": String(Math.round(min)),
        "aria-valuemax": String(Math.round(max)),
        "aria-valuenow": String(Math.round(cumPos))
      });

      function applyCount(newCum) {
        var clamped = Math.max(min, Math.min(max, newCum));
        onSet(clamped);
        focusedPopDividerKey = key;
        refreshAll();
      }

      function onMove(evt) { applyCount(xToCount(evt.clientX)); }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      }
      hit.addEventListener("pointerdown", function (evt) {
        evt.preventDefault();
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      });

      hit.addEventListener("keydown", function (evt) {
        var step = evt.shiftKey ? 5000 : 1000;
        if (evt.key === "ArrowLeft" || evt.key === "ArrowDown") {
          evt.preventDefault();
          applyCount(cumPos - step);
        } else if (evt.key === "ArrowRight" || evt.key === "ArrowUp") {
          evt.preventDefault();
          applyCount(cumPos + step);
        }
      });

      hit.addEventListener("focus", function () { focusedPopDividerKey = key; });
      hit.addEventListener("blur", function () {
        if (focusedPopDividerKey === key) focusedPopDividerKey = null;
      });

      svg.appendChild(hit);
      if (focusedPopDividerKey === key) pendingFocusEl = hit;
    }

    var small = state.segments[0], medium = state.segments[1], upper = state.segments[2];
    var cum1 = small.count;
    var cum2 = small.count + medium.count;

    addDivider(
      "pop-divider-1", cum1, 0, cum2,
      function (newCum1) {
        small.count = newCum1;
        medium.count = cum2 - newCum1;
      },
      "Boundary between Small and Medium SME counts, draggable. Currently " +
        fmtCount(small.count) + " small, " + fmtCount(medium.count) + " medium."
    );

    addDivider(
      "pop-divider-2", cum2, cum1, TOTAL_COUNT,
      function (newCum2) {
        medium.count = newCum2 - cum1;
        upper.count = TOTAL_COUNT - newCum2;
      },
      "Boundary between Medium and Upper SME counts, draggable. Currently " +
        fmtCount(medium.count) + " medium, " + fmtCount(upper.count) + " upper."
    );

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);
    if (pendingFocusEl) pendingFocusEl.focus({ preventScroll: true });
  }

  // ---------- avg transaction size sliders (independent per segment) ----------

  function buildAvgSizeSlider(parent, seg) {
    var range = AVG_SIZE_RANGE[seg.key];

    var row = document.createElement("div");
    row.className = "ms-slider-row";

    var head = document.createElement("div");
    head.className = "ms-slider-row__head";
    var span = document.createElement("span");
    span.textContent = seg.name + " — avg. transaction size";
    var strong = document.createElement("strong");
    strong.textContent = fmtMoney(seg.avgSize);
    head.appendChild(span);
    head.appendChild(strong);
    row.appendChild(head);

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
    input.value = String(seg.avgSize);
    input.setAttribute("aria-label", seg.name + " average transaction size");
    input.addEventListener("input", function () {
      var v = Number(input.value);
      seg.avgSize = v;
      strong.textContent = fmtMoney(v);
      refreshAll();
    });
    row.appendChild(input);

    parent.appendChild(row);
  }

  function renderAvgSizeSliders(container) {
    container.innerHTML = "";
    state.segments.forEach(function (seg) {
      buildAvgSizeSlider(container, seg);
    });
  }

  // ---------- table + comparison note + composition heading ----------

  function updateTable() {
    var c = compute();
    c.rows.forEach(function (r) {
      setText("ms-" + r.key + "-count", fmtCount(r.count));
      setText("ms-" + r.key + "-avg", fmtMoney(r.avgSize));
      setText("ms-" + r.key + "-total", fmtB(r.total));
      setText("ms-" + r.key + "-gap", fmtB(r.gap));
      setText("ms-" + r.key + "-pctmet", "~" + Math.round(r.pctMet) + "%");
    });
    setText("ms-total-count", fmtCount(c.totalCount));
    setText("ms-total-avg", "~" + fmtMoney(c.totalAvg));
    setText("ms-total-total", "~" + fmtB(c.totalDemand));
    setText("ms-total-gap", "~" + fmtB(c.totalGap));
    setText("ms-total-pctmet", "~" + Math.round(c.totalPctMet) + "%");
  }

  function updateComparisonNote() {
    var el = document.getElementById("ms-comparison-note");
    if (!el) return;

    var c = compute();
    var diff = c.totalDemand - REPORTED_TOTAL_DEMAND_B;
    var diffPct = (diff / REPORTED_TOTAL_DEMAND_B) * 100;
    var note;

    if (Math.abs(diffPct) < 1) {
      note = "Your current assumptions imply " + fmtB(c.totalDemand) +
        " in total demand — on target with the report's ~$88.1B figure " +
        "(the small remaining gap is normal rounding, the same gap the table " +
        "shows at its default values).";
    } else {
      var dir = diff > 0 ? "above" : "below";
      note = "Your current assumptions imply " + fmtB(c.totalDemand) +
        " in total demand, " + fmtB(Math.abs(diff)) + " (" + Math.abs(diffPct).toFixed(0) + "%) " +
        dir + " the report's ~$88.1B figure.";

      // A uniform adjustment across all three avg-size sliders, rather than
      // pointing at one tier -- population split and avg size could each
      // independently close the gap, so this avoids implying any one tier's
      // assumption is "more wrong" than another's.
      var adjustmentPct = (REPORTED_TOTAL_DEMAND_B / c.totalDemand - 1) * 100;
      var verb = adjustmentPct < 0 ? "Reducing" : "Increasing";
      note += " " + verb + " all three average transaction sizes by about " +
        Math.round(Math.abs(adjustmentPct)) + "% would bring the total back in line.";
    }
    note += " Based on demand assumptions only — supply-side modeling not yet reflected.";
    el.textContent = note;
  }

  function updateCompositionHeading() {
    setText("ms-composition-total", fmtB(compute().totalDemand));
  }

  function refreshAll() {
    if (popDiagram.container) renderPopulationBar(popDiagram.container);

    var barMount = document.getElementById("market-sizing-chart");
    if (barMount) renderBarChart(barMount);

    var donutMount = document.getElementById("market-sizing-composition-chart");
    if (donutMount) renderCompositionDonut(donutMount);

    updateTable();
    updateComparisonNote();
    updateCompositionHeading();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var popMount = document.getElementById("ms-population-bar");
    if (popMount) {
      popMount.classList.add("chart-card", "level-diagram");
      popDiagram.container = popMount;
    }

    var sliderMount = document.getElementById("ms-avgsize-controls");
    if (sliderMount) {
      sliderMount.classList.add("ms-controls");
      renderAvgSizeSliders(sliderMount);
    }

    var barMount = document.getElementById("market-sizing-chart");
    if (barMount) barMount.classList.add("chart-card");

    var donutMount = document.getElementById("market-sizing-composition-chart");
    if (donutMount) donutMount.classList.add("chart-card", "composition-row");

    refreshAll();
  });
})();
