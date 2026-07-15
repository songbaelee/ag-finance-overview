/* Stacked bar chart — illustrative bank/fund/gap segmentation by tier.
   Self-contained: no libraries, static data, plain SVG plus a small
   hover/focus tooltip layer. Mounts into #market-sizing-chart. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var DATA = [
    { name: "Small SME", bank: 0.1, fund: 0.4, gap: 11.2, total: 11.7 },
    { name: "Medium SME", bank: 1.4, fund: 1.6, gap: 16.5, total: 19.5 },
    { name: "Upper SME", bank: 9.5, fund: 1.0, gap: 46.7, total: 57.2 },
    { name: "Total (all tiers)", bank: 11.0, fund: 3.0, gap: 74.4, total: 88.4 }
  ];

  var SERIES = [
    { key: "bank", label: "Bank supply", varName: "--series-bank" },
    { key: "fund", label: "Fund supply", varName: "--series-fund" },
    { key: "gap", label: "Unmet gap", varName: "--series-gap" }
  ];

  var DOMAIN_MAX = 100;
  var TICKS = [0, 20, 40, 60, 80, 100];

  function fmtB(v) {
    return "$" + (Math.round(v * 10) / 10).toFixed(1) + "B";
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

  function buildLegend(container) {
    var legend = document.createElement("div");
    legend.className = "chart-legend";
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
  }

  function positionTooltip(tip, wrap, evt) {
    var rect = wrap.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function render(container) {
    var W = 640, H = 340;
    var margin = { top: 28, right: 16, bottom: 40, left: 44 };
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
        "Stacked bar chart of illustrative bank supply, fund supply, and unmet " +
        "financing gap in US dollars billions, by agri-SME tier."
    });

    // gridlines + tick labels
    TICKS.forEach(function (t) {
      var y = yFor(t);
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
      label.textContent = "$" + t + "B";
      svg.appendChild(label);
    });

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

    var slotCount = 5; // 3 tiers + 1 empty divider slot + 1 total
    var slotW = plotW / slotCount;
    var barWidth = 24;
    var slotIndexes = [0, 1, 2, 4];

    var wrap = container;
    var tip = buildTooltip(wrap);

    DATA.forEach(function (tier, i) {
      var slotCenter = margin.left + slotW * (slotIndexes[i] + 0.5);
      var barX = slotCenter - barWidth / 2;

      var yBank0 = plotBottom;
      var yBank1 = yFor(tier.bank);
      var yFund1 = yFor(tier.bank + tier.fund);
      var yGap1 = yFor(tier.total);

      var g = svgEl("g", { class: "chart-bar" });

      var bankRect = svgEl("rect", {
        class: "chart-seg",
        x: barX,
        y: yBank1,
        width: barWidth,
        height: yBank0 - yBank1,
        style: "fill:var(--series-bank)"
      });
      g.appendChild(bankRect);

      var fundRect = svgEl("rect", {
        class: "chart-seg",
        x: barX,
        y: yFund1,
        width: barWidth,
        height: yBank1 - yFund1,
        style: "fill:var(--series-fund)"
      });
      g.appendChild(fundRect);

      var gapPath = svgEl("path", {
        class: "chart-seg",
        d: roundedTopPath(barX, barWidth, yGap1, yFund1, 4),
        style: "fill:var(--series-gap)"
      });
      g.appendChild(gapPath);

      // 2px surface-color separators, painted over the seams
      [yBank1, yFund1].forEach(function (yBoundary) {
        g.appendChild(
          svgEl("rect", {
            x: barX,
            y: yBoundary - 1,
            width: barWidth,
            height: 2,
            style: "fill:var(--surface-1)"
          })
        );
      });

      // total value on the cap
      var valueLabel = svgEl("text", {
        class: "chart-value-label",
        x: slotCenter,
        y: yGap1 - 8,
        "text-anchor": "middle"
      });
      valueLabel.textContent = fmtB(tier.total);
      g.appendChild(valueLabel);

      // category label below the axis
      var catLabel = svgEl("text", {
        class: "chart-category-label",
        x: slotCenter,
        y: plotBottom + 20,
        "text-anchor": "middle"
      });
      catLabel.textContent = tier.name;
      g.appendChild(catLabel);

      // transparent hit area: the whole column, taller than the bar,
      // so the hover/focus target is generous and one tooltip covers
      // every series for this tier at once
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
          fmtB(tier.gap)
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

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.appendChild(svgWrap);

    buildLegend(container);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var mount = document.getElementById("market-sizing-chart");
    if (!mount) return;
    mount.classList.add("chart-card");
    render(mount);
  });
})();
