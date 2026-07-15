/* Stacked bar chart — illustrative bank/fund/gap segmentation by tier,
   with a secondary-axis line for # of SMEs per tier — plus a donut chart
   showing the composition of total demand. Self-contained: no libraries,
   static data, plain SVG plus a small hover/focus tooltip layer. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var DATA = [
    { name: "Small SME", bank: 0.1, fund: 0.4, gap: 11.2, total: 11.7, count: 78000 },
    { name: "Medium SME", bank: 1.4, fund: 1.6, gap: 16.5, total: 19.5, count: 39000 },
    { name: "Upper SME", bank: 9.5, fund: 1.0, gap: 46.7, total: 57.2, count: 13000 }
  ];

  var SERIES = [
    { key: "bank", label: "Bank supply", varName: "--series-bank" },
    { key: "fund", label: "Fund supply", varName: "--series-fund" },
    { key: "gap", label: "Unmet gap", varName: "--series-gap" }
  ];

  var LEFT_DOMAIN_MAX = 60;
  var LEFT_TICKS = [0, 20, 40, 60];
  var RIGHT_DOMAIN_MAX = 80000;
  var RIGHT_TICKS = [0, 20000, 40000, 60000, 80000];

  function fmtB(v) {
    return "$" + (Math.round(v * 10) / 10).toFixed(1) + "B";
  }

  function fmtCount(v) {
    return v.toLocaleString("en-US");
  }

  function fmtCountShort(v) {
    return (v / 1000) + "K";
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
    var W = 640, H = 380;
    var margin = { top: 52, right: 54, bottom: 40, left: 44 };
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
      label.textContent = "$" + t + "B";
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

    var slotCount = DATA.length;
    var slotW = plotW / slotCount;
    var barWidth = 24;

    var wrap = container;
    var tip = buildTooltip(wrap);

    var linePoints = [];

    DATA.forEach(function (tier, i) {
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
    var composition = [
      { key: "bank", label: "Bank supply", varName: "--series-bank", value: 11.0 },
      { key: "fund", label: "Fund supply", varName: "--series-fund", value: 3.0 },
      { key: "gap", label: "Unmet gap", varName: "--series-gap", value: 74.4 }
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
        "Donut chart showing the composition of the $88.4 billion illustrative " +
        "total demand: bank supply, fund supply, and unmet gap."
    });

    var group = svgEl("g", {
      transform: "rotate(-90 " + cx + " " + cy + ")"
    });

    var cumulative = 0;
    composition.forEach(function (d) {
      var fraction = d.value / total;
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
      var pct = (d.value / total) * 100;
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

  document.addEventListener("DOMContentLoaded", function () {
    var barMount = document.getElementById("market-sizing-chart");
    if (barMount) {
      barMount.classList.add("chart-card");
      renderBarChart(barMount);
    }

    var donutMount = document.getElementById("market-sizing-composition-chart");
    if (donutMount) {
      donutMount.classList.add("chart-card", "composition-row");
      renderCompositionDonut(donutMount);
    }
  });
})();
