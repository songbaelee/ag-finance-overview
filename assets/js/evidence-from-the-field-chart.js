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

  var state = {
    totalLending: 10000000,
    pct: { seg1: 20, seg2: 20, seg3: 20, seg4: 20, seg5: 20 }
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

  function fmtCount(v) {
    return Math.round(v).toLocaleString("en-US");
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
    totalInput.type = "number";
    totalInput.id = "efdf-total-lending";
    totalInput.min = "0";
    totalInput.step = "100000";
    totalInput.value = String(state.totalLending);
    totalInput.addEventListener("input", function () {
      var v = Number(totalInput.value);
      state.totalLending = isNaN(v) || v < 0 ? 0 : v;
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
      pctInput.step = "1";
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

    c.rows.forEach(function (r) {
      var dollarEl = document.getElementById("efdf-dollar-" + r.key);
      if (dollarEl) dollarEl.textContent = fmtMoney(r.dollarAllocated);

      var profitEl = document.getElementById("efdf-profit-" + r.key);
      if (profitEl) {
        profitEl.textContent = fmtSignedMoney(r.dollarProfit);
        profitEl.className = r.dollarProfit < 0 ? "efdf-loss" : "efdf-profit";
      }
    });

    var warnEl = document.getElementById("efdf-pct-warning");
    if (warnEl) {
      var rounded = Math.round(c.sumPct * 10) / 10;
      if (Math.abs(rounded - 100) < 0.05) {
        warnEl.textContent = "";
      } else {
        warnEl.textContent =
          "Percentages currently sum to " + rounded + "% — adjust so they total " +
          "100% for the figures below to reflect the full amount entered above.";
      }
    }

    setText("efdf-weighted-margin", fmtPct(c.weightedMargin));
    setText("efdf-total-allocated", fmtMoney(c.totalAllocated));
    var profitStat = document.getElementById("efdf-total-profit");
    if (profitStat) {
      profitStat.textContent = fmtSignedMoney(c.totalProfit);
      profitStat.className = "stat-value " + (c.totalProfit < 0 ? "efdf-loss" : "efdf-profit");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var chartMount = document.getElementById("efdf-profitability-chart");
    if (chartMount) {
      chartMount.classList.add("chart-card");
      renderProfitabilityChart(chartMount);
    }

    var allocatorRoot = document.getElementById("efdf-allocator-root");
    if (allocatorRoot) {
      buildAllocator(allocatorRoot);
      updateAllocator();
    }
  });
})();
