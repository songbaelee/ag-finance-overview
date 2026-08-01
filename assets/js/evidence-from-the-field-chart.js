/* Evidence from the Field: (1) a static bar chart of the reported East
   African bank profitability-by-loan-size curve (Dalberg / Aceli Africa
   Year 3 Learning Report — not adjustable, it's reported data), and (2)
   an interactive portfolio allocator layered on top of it (the user's own
   illustrative construction, weighting that same curve by loan-size mix).
   Self-contained: no libraries, session-only state, no backend. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Reported figures (East African banks, 2019-2022) -- see the citation
  // and data table on the page for source detail. Fixed, not adjustable.
  var SEGMENTS = [
    { key: "seg1", label: "$10k–$24k", margin: -1.0, loans: 11229, value: 177e6 },
    { key: "seg2", label: "$25k–$49k", margin: 4.1, loans: 3572, value: 120e6 },
    { key: "seg3", label: "$50k–$199k", margin: 5.6, loans: 2887, value: 280e6 },
    { key: "seg4", label: "$200k–$499k", margin: 6.5, loans: 737, value: 220e6 },
    { key: "seg5", label: "$500k–$2M", margin: 6.5, loans: 306, value: 285e6 }
  ];

  // Diagram 4: market-wide opportunity-cost reference points, same report.
  var COUNTRIES = [
    { name: "Kenya", bankProfit: 26, bondYield: 17 },
    { name: "Rwanda", bankProfit: 22, bondYield: 12 },
    { name: "Tanzania", bankProfit: 29, bondYield: 10 },
    { name: "Uganda", bankProfit: 22, bondYield: 16 }
  ];
  var BANK_RANGE = {
    min: Math.min.apply(null, COUNTRIES.map(function (c) { return c.bankProfit; })),
    max: Math.max.apply(null, COUNTRIES.map(function (c) { return c.bankProfit; }))
  };
  var BOND_RANGE = {
    min: Math.min.apply(null, COUNTRIES.map(function (c) { return c.bondYield; })),
    max: Math.max.apply(null, COUNTRIES.map(function (c) { return c.bondYield; }))
  };

  // Figure 3: Aceli's own portfolio (Y5 Learning Report), projected vs.
  // actual loans by size -- unlike SEGMENTS/COUNTRIES above, this is
  // Aceli-specific, not market-wide benchmarking. Static chart, not
  // adjustable.
  var VOLUME_SEGMENTS = [
    { key: "vol1", label: "$10k–$49k", projected: 0, actual: 3520 },
    { key: "vol2", label: "$50k–$99k", projected: 200, actual: 1074 },
    { key: "vol3", label: "$100k–$249k", projected: 300, actual: 616 },
    { key: "vol4", label: "$250k–$499k", projected: 700, actual: 237 },
    { key: "vol5", label: "$500k–$1.75M", projected: 300, actual: 129 }
  ];

  // Figure 4: same Y5 report, same Aceli portfolio -- share of loans going
  // to first-time borrowers vs. Aceli's capital leverage ratio, by the same
  // loan-size ranges as Figure 3. Static chart, not adjustable.
  var NEW_BORROWER_SEGMENTS = [
    { label: "$10k–$49k", newBorrowerPct: 84, leverage: 5 },
    { label: "$50k–$99k", newBorrowerPct: 35, leverage: 7 },
    { label: "$100k–$249k", newBorrowerPct: 26, leverage: 10 },
    { label: "$250k–$499k", newBorrowerPct: 16, leverage: 19 },
    { label: "$500k–$1.75M", newBorrowerPct: 8, leverage: 29 }
  ];

  // Default allocation seeds the tool with the reported market distribution
  // of loan value (not loan count) by segment -- see SEGMENTS above. Kept
  // to 2 decimals so the defaults sum to exactly 100.00%, not the 99% a
  // whole-number rounding of these same shares would give.
  var state = {
    totalLending: 10000000,
    pct: { seg1: 16.36, seg2: 11.09, seg3: 25.88, seg4: 20.33, seg5: 26.34 }
  };

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

  function roundedBottomPath(x, w, yTop, yBottom, r) {
    var h = yBottom - yTop;
    var rad = Math.max(0, Math.min(r, h, w / 2));
    return [
      "M", x, yTop,
      "L", x + w, yTop,
      "L", x + w, yBottom - rad,
      "Q", x + w, yBottom, x + w - rad, yBottom,
      "L", x + rad, yBottom,
      "Q", x, yBottom, x, yBottom - rad,
      "L", x, yTop,
      "Z"
    ].join(" ");
  }

  function fmtPct(v) {
    var sign = v > 0 ? "+" : "";
    return sign + v.toFixed(1) + "%";
  }

  function fmtMoney(v) {
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return "$" + Math.round(v / 1e3) + "K";
    return "$" + Math.round(v);
  }

  function fmtSignedMoney(v) {
    return (v < 0 ? "−" : "") + fmtMoney(Math.abs(v));
  }

  // One-decimal $k/$M formatting for the small, precise "avg. loan size"
  // figures (derived, not reported directly) -- fmtMoney's whole-K/M
  // rounding is too coarse for these.
  function fmtAvgSize(v) {
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
    return "$" + (v / 1000).toFixed(1) + "k";
  }


  function fmtCount(v) {
    return Math.round(v).toLocaleString("en-US");
  }

  function fmtWholePct(v) {
    return Math.round(v) + "%";
  }

  function fmtLeverage(v) {
    return v + "x";
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function buildTooltip(wrap) {
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.setAttribute("role", "status");
    wrap.appendChild(tip);
    return tip;
  }

  function fillTooltip(tip, seg) {
    tip.textContent = "";

    var title = document.createElement("div");
    title.className = "tt-title";
    title.textContent = seg.label;
    tip.appendChild(title);

    var rows = [
      ["Net profit/loss", fmtPct(seg.margin)],
      ["Total loans", fmtCount(seg.loans)],
      ["Total loan value", fmtMoney(seg.value)]
    ];
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "tt-row";
      var label = document.createElement("span");
      label.textContent = r[0];
      row.appendChild(label);
      var val = document.createElement("strong");
      val.textContent = r[1];
      row.appendChild(val);
      tip.appendChild(row);
    });
  }

  function positionTooltip(tip, wrap, evt) {
    var rect = wrap.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  // ---------- static profitability bar chart (Diagram 5) ----------

  function renderProfitabilityChart(container) {
    container.innerHTML = "";

    var DOMAIN_MIN = -2, DOMAIN_MAX = 8;
    var TICKS = [-2, 0, 2, 4, 6, 8];

    var W = 640, H = 380;
    var margin = { top: 30, right: 24, bottom: 62, left: 50 };
    var plotW = W - margin.left - margin.right;
    var plotH = H - margin.top - margin.bottom;
    var plotTop = margin.top;
    var plotBottom = margin.top + plotH;

    function yFor(v) {
      return plotBottom - ((v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * plotH;
    }
    var zeroY = yFor(0);

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label":
        "Bar chart of net profit or loss margin by loan size segment, for East " +
        "African banks, 2019 to 2022: " +
        SEGMENTS.map(function (s) { return s.label + " " + fmtPct(s.margin); }).join(", ") + "."
    });

    TICKS.forEach(function (t) {
      var y = yFor(t);
      svg.appendChild(svgEl("line", {
        class: "chart-gridline",
        x1: margin.left, x2: margin.left + plotW, y1: y, y2: y
      }));
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left - 8, y: y, "text-anchor": "end", "dominant-baseline": "middle"
      });
      label.textContent = t + "%";
      svg.appendChild(label);
    });

    var plotMidY = plotTop + plotH / 2;
    var leftAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: 14, y: plotMidY, "text-anchor": "middle",
      transform: "rotate(-90 14 " + plotMidY + ")"
    });
    leftAxisTitle.textContent = "Net profit/loss (%)";
    svg.appendChild(leftAxisTitle);

    var xAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: margin.left + plotW / 2, y: plotBottom + 46, "text-anchor": "middle"
    });
    xAxisTitle.textContent = "Loan size segment";
    svg.appendChild(xAxisTitle);

    // zero baseline, drawn over the 0-gridline, slightly darker
    svg.appendChild(svgEl("line", {
      class: "chart-baseline",
      x1: margin.left, x2: margin.left + plotW, y1: zeroY, y2: zeroY
    }));

    var slotW = plotW / SEGMENTS.length;
    var barWidth = 42;
    var wrap = container;
    var tip = buildTooltip(wrap);

    SEGMENTS.forEach(function (seg, i) {
      var slotCenter = margin.left + slotW * (i + 0.5);
      var barX = slotCenter - barWidth / 2;
      var isProfit = seg.margin >= 0;
      var varName = isProfit ? "--series-green" : "--series-red";

      var barY = yFor(Math.max(seg.margin, 0));
      var barBottom = yFor(Math.min(seg.margin, 0));

      var g = svgEl("g", { class: "chart-bar" });

      var path = svgEl("path", {
        class: "chart-seg",
        d: isProfit
          ? roundedTopPath(barX, barWidth, barY, barBottom, 4)
          : roundedBottomPath(barX, barWidth, barY, barBottom, 4),
        style: "fill:var(" + varName + ")"
      });
      g.appendChild(path);

      var valueLabel = svgEl("text", {
        class: "chart-value-label",
        x: slotCenter,
        y: isProfit ? barY - 8 : barBottom + 16,
        "text-anchor": "middle"
      });
      valueLabel.textContent = fmtPct(seg.margin);
      g.appendChild(valueLabel);

      var catLabel = svgEl("text", {
        class: "chart-category-label",
        x: slotCenter, y: plotBottom + 20, "text-anchor": "middle"
      });
      catLabel.textContent = seg.label;
      g.appendChild(catLabel);

      var hit = svgEl("rect", {
        class: "chart-bar-hit",
        x: slotCenter - slotW / 2 + 2, y: plotTop, width: slotW - 4, height: plotH,
        tabindex: "0", role: "button",
        "aria-label": seg.label + ": " + fmtPct(seg.margin) + " net profit/loss, " +
          fmtCount(seg.loans) + " loans totaling " + fmtMoney(seg.value)
      });

      function show(evt) {
        g.classList.add("is-active");
        fillTooltip(tip, seg);
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

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    var legend = document.createElement("div");
    legend.className = "chart-legend";
    [
      { label: "Net profit", varName: "--series-green" },
      { label: "Net loss", varName: "--series-red" }
    ].forEach(function (d) {
      var item = document.createElement("span");
      item.className = "chart-legend__item";
      var swatch = document.createElement("span");
      swatch.className = "chart-legend__swatch";
      swatch.style.background = "var(" + d.varName + ")";
      item.appendChild(swatch);
      var label = document.createElement("span");
      label.textContent = d.label;
      item.appendChild(label);
      legend.appendChild(item);
    });
    container.appendChild(legend);
  }

  // Avg. loan size is derived (value / loans), not a reported figure --
  // compute it here rather than hardcoding it in the page, so it stays
  // correct if the source figures above are ever revised.
  function fillAvgLoanSizes() {
    var totalLoans = SEGMENTS.reduce(function (sum, seg) { return sum + seg.loans; }, 0);
    var totalValue = SEGMENTS.reduce(function (sum, seg) { return sum + seg.value; }, 0);
    SEGMENTS.forEach(function (seg) {
      setText("efdf-avg-" + seg.key, fmtAvgSize(seg.value / seg.loans));
      setText("efdf-pctloans-" + seg.key, fmtWholePct((seg.loans / totalLoans) * 100));
      setText("efdf-pctvalue-" + seg.key, fmtWholePct((seg.value / totalValue) * 100));
    });
    setText("efdf-avg-total", fmtAvgSize(totalValue / totalLoans));
  }

  // % of projected / % of actual are derived (share of each column's
  // total), not reported directly -- computed here so they stay correct
  // if the source figures above are ever revised.
  function fillVolumePercentages() {
    var totalProjected = VOLUME_SEGMENTS.reduce(function (sum, seg) { return sum + seg.projected; }, 0);
    var totalActual = VOLUME_SEGMENTS.reduce(function (sum, seg) { return sum + seg.actual; }, 0);
    VOLUME_SEGMENTS.forEach(function (seg) {
      setText("efdf-pctproj-" + seg.key, fmtWholePct((seg.projected / totalProjected) * 100));
      setText("efdf-pctactual-" + seg.key, fmtWholePct((seg.actual / totalActual) * 100));
    });
  }

  // ---------- static grouped bar chart (Figure 3: projected vs. actual) ----------

  function renderVolumeChart(container) {
    container.innerHTML = "";

    var maxValue = VOLUME_SEGMENTS.reduce(function (m, s) {
      return Math.max(m, s.projected, s.actual);
    }, 0);
    var DOMAIN_MAX = Math.ceil(maxValue / 500) * 500;
    var TICK_STEP = DOMAIN_MAX / 4;
    var TICKS = [0, TICK_STEP, TICK_STEP * 2, TICK_STEP * 3, DOMAIN_MAX];

    var W = 640, H = 380;
    var margin = { top: 30, right: 24, bottom: 62, left: 56 };
    var plotW = W - margin.left - margin.right;
    var plotH = H - margin.top - margin.bottom;
    var plotTop = margin.top;
    var plotBottom = margin.top + plotH;

    function yFor(v) {
      return plotBottom - (v / DOMAIN_MAX) * plotH;
    }

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label":
        "Grouped bar chart of Aceli-supported loans, projected vs. actual, by loan " +
        "size range: " +
        VOLUME_SEGMENTS.map(function (s) {
          return s.label + " -- projected " + fmtCount(s.projected) + ", actual " + fmtCount(s.actual);
        }).join(", ") + "."
    });

    TICKS.forEach(function (t) {
      var y = yFor(t);
      svg.appendChild(svgEl("line", {
        class: "chart-gridline",
        x1: margin.left, x2: margin.left + plotW, y1: y, y2: y
      }));
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left - 8, y: y, "text-anchor": "end", "dominant-baseline": "middle"
      });
      label.textContent = fmtCount(t);
      svg.appendChild(label);
    });

    var plotMidY = plotTop + plotH / 2;
    var leftAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: 14, y: plotMidY, "text-anchor": "middle",
      transform: "rotate(-90 14 " + plotMidY + ")"
    });
    leftAxisTitle.textContent = "# of loans";
    svg.appendChild(leftAxisTitle);

    var xAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: margin.left + plotW / 2, y: plotBottom + 46, "text-anchor": "middle"
    });
    xAxisTitle.textContent = "Loan size range";
    svg.appendChild(xAxisTitle);

    svg.appendChild(svgEl("line", {
      class: "chart-baseline",
      x1: margin.left, x2: margin.left + plotW, y1: plotBottom, y2: plotBottom
    }));

    var slotW = plotW / VOLUME_SEGMENTS.length;
    var barWidth = 20, barGap = 6;
    var clusterWidth = barWidth * 2 + barGap;
    var wrap = container;
    var tip = buildTooltip(wrap);

    VOLUME_SEGMENTS.forEach(function (seg, i) {
      var slotCenter = margin.left + slotW * (i + 0.5);
      var clusterX = slotCenter - clusterWidth / 2;
      var projX = clusterX;
      var actualX = clusterX + barWidth + barGap;

      var g = svgEl("g", { class: "chart-bar" });

      var bars = [
        { x: projX, value: seg.projected, varName: "--series-bank" },
        { x: actualX, value: seg.actual, varName: "--series-fund" }
      ];
      bars.forEach(function (b) {
        var barY = yFor(b.value);
        var path = svgEl("path", {
          class: "chart-seg",
          d: roundedTopPath(b.x, barWidth, barY, plotBottom, 3),
          style: "fill:var(" + b.varName + ")"
        });
        g.appendChild(path);

        var valueLabel = svgEl("text", {
          class: "chart-value-label",
          x: b.x + barWidth / 2, y: barY - 6, "text-anchor": "middle"
        });
        valueLabel.textContent = fmtCount(b.value);
        g.appendChild(valueLabel);
      });

      var catLabel = svgEl("text", {
        class: "chart-category-label",
        x: slotCenter, y: plotBottom + 20, "text-anchor": "middle"
      });
      catLabel.textContent = seg.label;
      g.appendChild(catLabel);

      var hit = svgEl("rect", {
        class: "chart-bar-hit",
        x: slotCenter - slotW / 2 + 2, y: plotTop, width: slotW - 4, height: plotH,
        tabindex: "0", role: "button",
        "aria-label": seg.label + ": projected " + fmtCount(seg.projected) +
          " loans, actual " + fmtCount(seg.actual) + " loans"
      });

      function show(evt) {
        g.classList.add("is-active");
        tip.textContent = "";
        var title = document.createElement("div");
        title.className = "tt-title";
        title.textContent = seg.label;
        tip.appendChild(title);
        [["Projected", fmtCount(seg.projected)], ["Actual", fmtCount(seg.actual)]].forEach(function (r) {
          var row = document.createElement("div");
          row.className = "tt-row";
          var label = document.createElement("span");
          label.textContent = r[0];
          row.appendChild(label);
          var val = document.createElement("strong");
          val.textContent = r[1];
          row.appendChild(val);
          tip.appendChild(row);
        });
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

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    var legend = document.createElement("div");
    legend.className = "chart-legend";
    [
      { label: "Projected", varName: "--series-bank" },
      { label: "Actual", varName: "--series-fund" }
    ].forEach(function (d) {
      var item = document.createElement("span");
      item.className = "chart-legend__item";
      var swatch = document.createElement("span");
      swatch.className = "chart-legend__swatch";
      swatch.style.background = "var(" + d.varName + ")";
      item.appendChild(swatch);
      var label = document.createElement("span");
      label.textContent = d.label;
      item.appendChild(label);
      legend.appendChild(item);
    });
    container.appendChild(legend);
  }

  // ---------- static bar+line chart (Figure 4: new-borrower share & leverage) ----------

  function renderNewBorrowerLeverageChart(container) {
    container.innerHTML = "";

    var LEFT_DOMAIN_MAX = 100;
    var LEFT_TICKS = [0, 25, 50, 75, 100];
    var RIGHT_DOMAIN_MAX = 30;
    var RIGHT_TICKS = [0, 10, 20, 30];

    var W = 640, H = 380;
    var margin = { top: 30, right: 70, bottom: 62, left: 56 };
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
        "Bar chart of the percentage of loans going to new borrowers by loan size " +
        "range, with a line showing Aceli's capital leverage ratio on a secondary " +
        "axis: " +
        NEW_BORROWER_SEGMENTS.map(function (s) {
          return s.label + " -- " + s.newBorrowerPct + "% new borrowers, " + fmtLeverage(s.leverage) + " leverage";
        }).join(", ") + "."
    });

    LEFT_TICKS.forEach(function (t) {
      var y = yLeft(t);
      svg.appendChild(svgEl("line", {
        class: "chart-gridline",
        x1: margin.left, x2: margin.left + plotW, y1: y, y2: y
      }));
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left - 8, y: y, "text-anchor": "end", "dominant-baseline": "middle"
      });
      label.textContent = t + "%";
      svg.appendChild(label);
    });

    RIGHT_TICKS.forEach(function (t) {
      var y = yRight(t);
      var label = svgEl("text", {
        class: "chart-tick-label",
        x: margin.left + plotW + 8, y: y, "text-anchor": "start", "dominant-baseline": "middle"
      });
      label.textContent = fmtLeverage(t);
      svg.appendChild(label);
    });

    var plotMidY = plotTop + plotH / 2;
    var leftAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: 14, y: plotMidY, "text-anchor": "middle",
      transform: "rotate(-90 14 " + plotMidY + ")"
    });
    leftAxisTitle.textContent = "% of loans to new borrowers";
    svg.appendChild(leftAxisTitle);

    var rightAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: W - 14, y: plotMidY, "text-anchor": "middle",
      transform: "rotate(90 " + (W - 14) + " " + plotMidY + ")"
    });
    rightAxisTitle.textContent = "Leverage ratio";
    svg.appendChild(rightAxisTitle);

    var xAxisTitle = svgEl("text", {
      class: "chart-axis-label",
      x: margin.left + plotW / 2, y: plotBottom + 46, "text-anchor": "middle"
    });
    xAxisTitle.textContent = "Loan size range";
    svg.appendChild(xAxisTitle);

    svg.appendChild(svgEl("line", {
      class: "chart-baseline",
      x1: margin.left, x2: margin.left + plotW, y1: plotBottom, y2: plotBottom
    }));

    var slotW = plotW / NEW_BORROWER_SEGMENTS.length;
    var barWidth = 42;
    var wrap = container;
    var tip = buildTooltip(wrap);
    var linePoints = [];

    NEW_BORROWER_SEGMENTS.forEach(function (seg, i) {
      var slotCenter = margin.left + slotW * (i + 0.5);
      var barX = slotCenter - barWidth / 2;
      var barY = yLeft(seg.newBorrowerPct);

      var g = svgEl("g", { class: "chart-bar" });

      var path = svgEl("path", {
        class: "chart-seg",
        d: roundedTopPath(barX, barWidth, barY, plotBottom, 4),
        style: "fill:var(--series-orange)"
      });
      g.appendChild(path);

      var valueLabel = svgEl("text", {
        class: "chart-value-label",
        x: slotCenter, y: barY - 8, "text-anchor": "middle"
      });
      valueLabel.textContent = seg.newBorrowerPct + "%";
      g.appendChild(valueLabel);

      var catLabel = svgEl("text", {
        class: "chart-category-label",
        x: slotCenter, y: plotBottom + 20, "text-anchor": "middle"
      });
      catLabel.textContent = seg.label;
      g.appendChild(catLabel);

      linePoints.push({ x: slotCenter, y: yRight(seg.leverage), seg: seg });

      var hit = svgEl("rect", {
        class: "chart-bar-hit",
        x: slotCenter - slotW / 2 + 2, y: plotTop, width: slotW - 4, height: plotH,
        tabindex: "0", role: "button",
        "aria-label": seg.label + ": " + seg.newBorrowerPct + "% of loans to new " +
          "borrowers, " + fmtLeverage(seg.leverage) + " capital leverage ratio"
      });

      function show(evt) {
        g.classList.add("is-active");
        tip.textContent = "";
        var title = document.createElement("div");
        title.className = "tt-title";
        title.textContent = seg.label;
        tip.appendChild(title);
        [
          ["% loans to new borrowers", seg.newBorrowerPct + "%"],
          ["Leverage ratio", fmtLeverage(seg.leverage)]
        ].forEach(function (r) {
          var row = document.createElement("div");
          row.className = "tt-row";
          var label = document.createElement("span");
          label.textContent = r[0];
          row.appendChild(label);
          var val = document.createElement("strong");
          val.textContent = r[1];
          row.appendChild(val);
          tip.appendChild(row);
        });
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

    // leverage-ratio line + end-dots on the secondary axis, drawn above the bars
    var polyline = svgEl("polyline", {
      points: linePoints.map(function (p) { return p.x + "," + p.y; }).join(" "),
      fill: "none",
      style: "stroke:var(--series-count)",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    svg.appendChild(polyline);

    linePoints.forEach(function (p) {
      svg.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 5,
        style: "fill:var(--series-count);stroke:var(--surface-1)",
        "stroke-width": "2"
      }));
      var above = p.y - plotTop > 24;
      // Halo (stroke behind fill) keeps the label legible when a dot sits
      // low on the right axis, over a tall bar's fill -- the same problem
      // the dot itself solves with its --surface-1 stroke ring.
      var lineLabel = svgEl("text", {
        class: "chart-tick-label",
        x: p.x, y: above ? p.y - 12 : p.y + 18, "text-anchor": "middle",
        style: "paint-order:stroke;stroke:var(--surface-1);stroke-width:3px;stroke-linejoin:round"
      });
      lineLabel.textContent = fmtLeverage(p.seg.leverage);
      svg.appendChild(lineLabel);
    });

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    var legend = document.createElement("div");
    legend.className = "chart-legend";
    var barItem = document.createElement("span");
    barItem.className = "chart-legend__item";
    var barSwatch = document.createElement("span");
    barSwatch.className = "chart-legend__swatch";
    barSwatch.style.background = "var(--series-orange)";
    barItem.appendChild(barSwatch);
    var barLabel = document.createElement("span");
    barLabel.textContent = "% loans to new borrowers (left axis)";
    barItem.appendChild(barLabel);
    legend.appendChild(barItem);

    var lineItem = document.createElement("span");
    lineItem.className = "chart-legend__item";
    var lineSwatch = document.createElement("span");
    lineSwatch.className = "chart-legend__swatch chart-legend__swatch--line";
    lineSwatch.style.background = "var(--series-count)";
    lineItem.appendChild(lineSwatch);
    var lineLegendLabel = document.createElement("span");
    lineLegendLabel.textContent = "Leverage ratio (right axis)";
    lineItem.appendChild(lineLegendLabel);
    legend.appendChild(lineItem);

    container.appendChild(legend);
  }

  // ---------- portfolio allocator (user's own illustrative construction) ----------

  function computeAllocator() {
    var rows = SEGMENTS.map(function (seg) {
      var pct = state.pct[seg.key];
      var dollarAllocated = state.totalLending * (pct / 100);
      var dollarProfit = dollarAllocated * (seg.margin / 100);
      return {
        key: seg.key, label: seg.label, margin: seg.margin,
        pct: pct, dollarAllocated: dollarAllocated, dollarProfit: dollarProfit
      };
    });
    var sumPct = rows.reduce(function (s, r) { return s + r.pct; }, 0);
    var weightedMargin = rows.reduce(function (s, r) { return s + (r.pct / 100) * r.margin; }, 0);
    var totalAllocated = rows.reduce(function (s, r) { return s + r.dollarAllocated; }, 0);
    var totalProfit = rows.reduce(function (s, r) { return s + r.dollarProfit; }, 0);
    return { rows: rows, sumPct: sumPct, weightedMargin: weightedMargin, totalAllocated: totalAllocated, totalProfit: totalProfit };
  }

  function buildAllocator(root) {
    root.innerHTML = "";

    // total lending input
    var totalRow = document.createElement("div");
    totalRow.className = "efdf-total-row";
    var totalLabel = document.createElement("label");
    totalLabel.setAttribute("for", "efdf-total-lending");
    totalLabel.textContent = "Total lending to allocate ($)";
    var totalInput = document.createElement("input");
    totalInput.type = "text";
    totalInput.inputMode = "numeric";
    totalInput.id = "efdf-total-lending";
    totalInput.value = fmtCount(state.totalLending);
    totalInput.addEventListener("input", function () {
      var digits = totalInput.value.replace(/[^0-9]/g, "");
      var v = digits === "" ? 0 : Number(digits);
      state.totalLending = v;
      totalInput.value = digits === "" ? "" : fmtCount(v);
      updateAllocator();
    });
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalInput);
    root.appendChild(totalRow);

    // per-segment table
    var wrap = document.createElement("div");
    wrap.className = "data-table-wrap";
    var table = document.createElement("table");
    table.className = "data-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Loan size segment", "Benchmark net margin", "% of portfolio", "$ allocated", "$ net profit/loss"].forEach(function (h) {
      var th = document.createElement("th");
      th.setAttribute("scope", "col");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    SEGMENTS.forEach(function (seg) {
      var tr = document.createElement("tr");

      var tdLabel = document.createElement("td");
      tdLabel.textContent = seg.label;
      tr.appendChild(tdLabel);

      var tdMargin = document.createElement("td");
      tdMargin.textContent = fmtPct(seg.margin);
      tr.appendChild(tdMargin);

      var tdPct = document.createElement("td");
      var pctInput = document.createElement("input");
      pctInput.type = "number";
      pctInput.min = "0";
      pctInput.max = "100";
      pctInput.step = "0.01";
      pctInput.value = String(state.pct[seg.key]);
      pctInput.setAttribute("aria-label", seg.label + " percent of portfolio");
      pctInput.addEventListener("input", function () {
        var v = Number(pctInput.value);
        state.pct[seg.key] = isNaN(v) ? 0 : v;
        updateAllocator();
      });
      tdPct.appendChild(pctInput);
      tr.appendChild(tdPct);

      var tdDollar = document.createElement("td");
      tdDollar.id = "efdf-dollar-" + seg.key;
      tr.appendChild(tdDollar);

      var tdProfit = document.createElement("td");
      tdProfit.id = "efdf-profit-" + seg.key;
      tr.appendChild(tdProfit);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    root.appendChild(wrap);

    var warn = document.createElement("p");
    warn.id = "efdf-pct-warning";
    warn.className = "efdf-warn";
    warn.setAttribute("role", "status");
    root.appendChild(warn);

    var statGrid = document.createElement("div");
    statGrid.className = "stat-grid";
    statGrid.style.marginTop = "1.5rem";
    [
      { id: "efdf-weighted-margin", label: "Portfolio weighted net margin" },
      { id: "efdf-total-allocated", label: "Total $ allocated" },
      { id: "efdf-total-profit", label: "Total $ net profit/loss" }
    ].forEach(function (s) {
      var card = document.createElement("div");
      card.className = "stat-card";
      var value = document.createElement("span");
      value.className = "stat-value";
      value.id = s.id;
      var label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = s.label;
      card.appendChild(value);
      card.appendChild(label);
      statGrid.appendChild(card);
    });
    root.appendChild(statGrid);
  }

  function updateAllocator() {
    var c = computeAllocator();
    var sumRounded = Math.round(c.sumPct);
    // Any input rounding to exactly 100 counts as valid -- avoids a
    // "sum to 100% — add 0% more" message from stray float noise while
    // still catching every real, user-visible mismatch.
    var isValid = sumRounded === 100;

    c.rows.forEach(function (r) {
      var dollarEl = document.getElementById("efdf-dollar-" + r.key);
      if (dollarEl) dollarEl.textContent = isValid ? fmtMoney(r.dollarAllocated) : "—";

      var profitEl = document.getElementById("efdf-profit-" + r.key);
      if (profitEl) {
        profitEl.textContent = isValid ? fmtSignedMoney(r.dollarProfit) : "—";
        profitEl.className = isValid ? (r.dollarProfit < 0 ? "efdf-loss" : "efdf-profit") : "";
      }
    });

    var warnEl = document.getElementById("efdf-pct-warning");
    if (warnEl) {
      if (isValid) {
        warnEl.textContent = "";
      } else if (sumRounded < 100) {
        warnEl.textContent =
          "Percentages sum to " + sumRounded + "% — add " + (100 - sumRounded) + "% more";
      } else {
        warnEl.textContent =
          "Percentages sum to " + sumRounded + "% — remove " + (sumRounded - 100) + "%";
      }
    }

    setText("efdf-weighted-margin", isValid ? fmtPct(c.weightedMargin) : "—");
    setText("efdf-total-allocated", isValid ? fmtMoney(c.totalAllocated) : "—");
    var profitStat = document.getElementById("efdf-total-profit");
    if (profitStat) {
      profitStat.textContent = isValid ? fmtSignedMoney(c.totalProfit) : "—";
      profitStat.className = "stat-value " + (isValid ? (c.totalProfit < 0 ? "efdf-loss" : "efdf-profit") : "");
    }

    var compareEl = document.getElementById("efdf-opportunity-compare");
    if (compareEl) {
      if (isValid) {
        compareEl.textContent =
          "Your portfolio margin vs. what this capital could otherwise earn: " +
          fmtPct(c.weightedMargin) + ", against a " + BANK_RANGE.min + "–" + BANK_RANGE.max +
          "% range for bank profitability elsewhere in the region (without agri-SME incentives) " +
          "and a " + BOND_RANGE.min + "–" + BOND_RANGE.max + "% range for government bond " +
          "yields. This isn't a claim about where the hypothetical portfolio above is located — " +
          "just a sense of the opportunity cost of directing capital toward agri-SME lending " +
          "instead of these alternatives.";
      } else {
        compareEl.textContent =
          "Enter percentages that sum to 100% above to compare your portfolio margin against " +
          "these alternatives.";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var chartMount = document.getElementById("efdf-profitability-chart");
    if (chartMount) {
      chartMount.classList.add("chart-card");
      renderProfitabilityChart(chartMount);
    }
    fillAvgLoanSizes();

    var allocatorRoot = document.getElementById("efdf-allocator-root");
    if (allocatorRoot) {
      buildAllocator(allocatorRoot);
      updateAllocator();
    }

    var volumeMount = document.getElementById("efdf-volume-chart");
    if (volumeMount) {
      volumeMount.classList.add("chart-card");
      renderVolumeChart(volumeMount);
    }
    fillVolumePercentages();

    var newBorrowerMount = document.getElementById("efdf-newborrower-chart");
    if (newBorrowerMount) {
      newBorrowerMount.classList.add("chart-card");
      renderNewBorrowerLeverageChart(newBorrowerMount);
    }
  });
})();
