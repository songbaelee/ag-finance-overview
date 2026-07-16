/* "Closing the Gap" — stacked horizontal-bar diagrams of the illustrative
   demand/supply -> addressable -> temporary/permanent -> grants/repayable
   -> TA -> farmer/firm -> BDS/investment-readiness tree. One reusable
   render function draws a shared-width row per level, with dashed guide
   lines carrying the demand/supply and grants/repayable boundaries down
   through the stack. Two top-level sliders (demand/supply share;
   not-addressable share of demand) recompute every mounted diagram on the
   page from shared, session-only state — no persistence, no backend. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var state = {
    demandPct: 60,
    notAddressablePct: 25
  };

  // Fixed illustrative constants. Only the top two levels (demand/supply;
  // addressable/not addressable) get real sliders — everything below
  // recomputes proportionally from those two inputs.
  var TEMP_AGAIN_PCT_OF_SUPPLY = 15;
  var GRANT_PCT_OF_PERMANENT = 50;
  var FARMER_PCT_OF_TA = 55;
  var BDS_PCT_OF_FIRM = 70;

  function compute() {
    var demand = state.demandPct;
    var supply = 100 - demand;

    var notAddressable = demand * state.notAddressablePct / 100;
    var ta = demand - notAddressable;

    var permanent = supply * (1 - TEMP_AGAIN_PCT_OF_SUPPLY / 100);
    var tempAgain = supply * (TEMP_AGAIN_PCT_OF_SUPPLY / 100);

    var grantPortion = permanent * GRANT_PCT_OF_PERMANENT / 100;
    var repayablePortion = permanent - grantPortion;

    var grants = notAddressable + ta + grantPortion;
    var repayable = repayablePortion + tempAgain;

    var incentives = grantPortion;
    var firstLoss = repayable;

    var farmer = ta * FARMER_PCT_OF_TA / 100;
    var firm = ta - farmer;

    var bds = firm * BDS_PCT_OF_FIRM / 100;
    var investmentReadiness = firm - bds;

    return {
      demand: demand, supply: supply,
      notAddressable: notAddressable, ta: ta,
      permanent: permanent, tempAgain: tempAgain,
      grants: grants, repayable: repayable,
      incentives: incentives, firstLoss: firstLoss,
      farmer: farmer, firm: firm,
      bds: bds, investmentReadiness: investmentReadiness
    };
  }

  var ROWBUILDERS = {
    level0: function (d) {
      return {
        title: "Demand vs. supply",
        segs: [
          { label: "Demand side", value: d.demand, varName: "--series-bank" },
          { label: "Supply side", value: d.supply, varName: "--series-fund" }
        ]
      };
    },
    level1: function (d) {
      return {
        title: "Addressable vs. not addressable",
        segs: [
          { label: "Not addressable", value: d.notAddressable, varName: "--series-gap" },
          { label: "Addressable", value: 100 - d.notAddressable, varName: "--series-fund" }
        ]
      };
    },
    level2: function (d) {
      return {
        title: "Temporary → permanent → temporary again",
        segs: [
          { label: "Not addressable", value: d.notAddressable, varName: "--series-gap" },
          { label: "Temporary (TA)", value: d.ta, varName: "--series-bank" },
          { label: "Permanent", value: d.permanent, varName: "--series-fund" },
          { label: "Temporary again", value: d.tempAgain, varName: "--series-count" }
        ]
      };
    },
    level3: function (d) {
      return {
        title: "Grants vs. repayable capital",
        segs: [
          { label: "Grants", value: d.grants, varName: "--series-orange" },
          { label: "Repayable capital", value: d.repayable, varName: "--series-green" }
        ]
      };
    },
    level4: function (d) {
      return {
        title: "Within grants: TA, incentives, first-loss",
        segs: [
          { label: "TA", value: d.demand, varName: "--series-bank" },
          { label: "Incentives", value: d.incentives, varName: "--series-magenta" },
          { label: "First-loss", value: d.firstLoss, varName: "--series-green" }
        ]
      };
    },
    level5: function (d) {
      return {
        title: "Within TA: farmer level vs. firm level",
        segs: [
          { label: "Not addressable", value: d.notAddressable, varName: "--series-gap" },
          { label: "Farmer level", value: d.farmer, varName: "--series-bank" },
          { label: "Firm level", value: d.firm, varName: "--series-red" },
          { label: "Incentives", value: d.incentives, varName: "--series-magenta" },
          { label: "First-loss", value: d.firstLoss, varName: "--series-green" }
        ]
      };
    },
    level6: function (d) {
      return {
        title: "Within firm level: BDS vs. investment readiness",
        segs: [
          { label: "Not addressable", value: d.notAddressable, varName: "--series-gap" },
          { label: "Farmer level", value: d.farmer, varName: "--series-bank" },
          { label: "BDS", value: d.bds, varName: "--series-red" },
          { label: "Investment readiness", value: d.investmentReadiness, varName: "--series-count" },
          { label: "Incentives", value: d.incentives, varName: "--series-magenta" },
          { label: "First-loss", value: d.firstLoss, varName: "--series-green" }
        ]
      };
    }
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

  // Thin surface-color separator between two touching segments, sized to
  // the narrower neighbor's width so it never visibly eats a thin slice.
  function separatorThickness(wA, wB) {
    var minW = Math.min(wA, wB);
    var t = Math.min(2, minW * 0.15);
    return t < 0.6 ? 0 : t;
  }

  function buildTooltip(wrap) {
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.setAttribute("role", "status");
    wrap.appendChild(tip);
    return tip;
  }

  function fillSegTooltip(tip, rowTitle, seg) {
    tip.textContent = "";
    var title = document.createElement("div");
    title.className = "tt-title";
    title.textContent = rowTitle;
    tip.appendChild(title);

    var row = document.createElement("div");
    row.className = "tt-row";
    var key = document.createElement("span");
    key.className = "tt-key";
    key.style.background = "var(" + seg.varName + ")";
    row.appendChild(key);
    var label = document.createElement("span");
    label.textContent = seg.label;
    row.appendChild(label);
    var val = document.createElement("strong");
    val.textContent = Math.round(seg.value) + "% of gap";
    row.appendChild(val);
    tip.appendChild(row);
  }

  // Segments on light fills (grey, magenta) need dark ink; everything else
  // in this palette is dark/saturated enough to need light ink instead.
  var LIGHT_FILL_VARS = { "--series-gap": true, "--series-magenta": true };

  function segTextFill(varName, secondary) {
    if (LIGHT_FILL_VARS[varName]) {
      return secondary ? "var(--text-secondary)" : "var(--text-primary)";
    }
    return secondary ? "rgba(255,255,255,0.85)" : "#ffffff";
  }

  function positionTooltip(tip, wrap, evt) {
    var rect = wrap.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function renderLevelDiagram(container, levelKeys, opts) {
    opts = opts || {};
    var d = compute();
    var rows = levelKeys.map(function (key) {
      return { key: key, def: ROWBUILDERS[key](d) };
    });

    var W = 640;
    var plotLeft = 196;
    var rightPad = 16;
    var plotWidth = W - plotLeft - rightPad;
    var rowH = 34;
    var rowGap = 24;
    var topPad = 26;
    var bottomPad = 10;
    var stackH = rows.length * rowH + (rows.length - 1) * rowGap;
    var H = topPad + stackH + bottomPad;

    var demandSupplyX = plotLeft + (d.demand / 100) * plotWidth;
    var grantsX = plotLeft + (d.grants / 100) * plotWidth;
    var guideTop = topPad - 8;
    var guideBottom = topPad + stackH + 6;

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label": opts.ariaLabel ||
        "Stacked bar diagram of the illustrative agri-SME financing response, showing " +
        rows.map(function (r) { return r.def.title; }).join("; ") + "."
    });

    svg.appendChild(svgEl("line", {
      class: "level-guide", x1: demandSupplyX, x2: demandSupplyX, y1: guideTop, y2: guideBottom
    }));
    var dsLabel = svgEl("text", {
      class: "level-guide-label", x: demandSupplyX, y: topPad - 12, "text-anchor": "middle"
    });
    dsLabel.textContent = "demand / supply";
    svg.appendChild(dsLabel);

    if (opts.showGrantsGuide) {
      svg.appendChild(svgEl("line", {
        class: "level-guide", x1: grantsX, x2: grantsX, y1: guideTop, y2: guideBottom
      }));
      var grLabel = svgEl("text", {
        class: "level-guide-label", x: grantsX, y: guideBottom + 14, "text-anchor": "middle"
      });
      grLabel.textContent = "grants / repayable";
      svg.appendChild(grLabel);
    }

    container.innerHTML = "";
    var tip = buildTooltip(container);

    rows.forEach(function (row, i) {
      var y = topPad + i * (rowH + rowGap);

      var rowLabel = svgEl("text", {
        class: "level-row-label", x: plotLeft - 14, y: y + rowH / 2,
        "text-anchor": "end", "dominant-baseline": "middle"
      });
      rowLabel.textContent = row.def.title;
      svg.appendChild(rowLabel);

      var xCursor = plotLeft;
      var segs = row.def.segs;

      segs.forEach(function (seg, si) {
        var w = Math.max((seg.value / 100) * plotWidth, 0.01);
        var isFirst = si === 0, isLast = si === segs.length - 1;
        var rL = isFirst ? 4 : 0, rR = isLast ? 4 : 0;

        var path = svgEl("path", {
          d: roundedHBarPath(xCursor, y, w, rowH, rL, rR),
          style: "fill:var(" + seg.varName + ")"
        });
        svg.appendChild(path);

        if (w > 78) {
          var lbl = svgEl("text", {
            class: "level-seg-label", x: xCursor + w / 2, y: y + rowH / 2 - 4, "text-anchor": "middle",
            style: "fill:" + segTextFill(seg.varName, false)
          });
          lbl.textContent = seg.label;
          svg.appendChild(lbl);
          var pct = svgEl("text", {
            class: "level-seg-pct", x: xCursor + w / 2, y: y + rowH / 2 + 10, "text-anchor": "middle",
            style: "fill:" + segTextFill(seg.varName, true)
          });
          pct.textContent = Math.round(seg.value) + "%";
          svg.appendChild(pct);
        }

        var hit = svgEl("rect", {
          class: "level-seg-hit", x: xCursor, y: y, width: w, height: rowH,
          tabindex: "0", role: "button",
          "aria-label": row.def.title + ": " + seg.label + ", " + Math.round(seg.value) + "% of the total gap"
        });

        function show(evt) {
          fillSegTooltip(tip, row.def.title, seg);
          tip.classList.add("is-visible");
          if (evt && evt.clientX !== undefined) positionTooltip(tip, container, evt);
        }
        function hide() { tip.classList.remove("is-visible"); }

        hit.addEventListener("pointerenter", show);
        hit.addEventListener("pointermove", show);
        hit.addEventListener("pointerleave", hide);
        hit.addEventListener("focus", function () {
          show({});
          var r = hit.getBoundingClientRect();
          var wrapRect = container.getBoundingClientRect();
          tip.style.left = (r.left + r.width / 2 - wrapRect.left) + "px";
          tip.style.top = (r.top - wrapRect.top) + "px";
        });
        hit.addEventListener("blur", hide);
        svg.appendChild(hit);

        if (!isLast) {
          var nextW = Math.max((segs[si + 1].value / 100) * plotWidth, 0.01);
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
    });

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.insertBefore(svgWrap, tip);
  }

  var registry = [];

  function register(id, levelKeys, opts) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("chart-card", "level-diagram");
      registry.push({ container: el, levelKeys: levelKeys, opts: opts || {} });
    }
  }

  function rerenderAll() {
    registry.forEach(function (r) {
      renderLevelDiagram(r.container, r.levelKeys, r.opts);
    });
  }

  function buildSliderRow(parent, id, labelText, min, max, value, fmt, onChange) {
    var row = document.createElement("div");
    row.className = "tacg-slider-row";

    var head = document.createElement("div");
    head.className = "tacg-slider-row__head";
    var span = document.createElement("span");
    span.textContent = labelText;
    var strong = document.createElement("strong");
    strong.textContent = fmt(value);
    head.appendChild(span);
    head.appendChild(strong);
    row.appendChild(head);

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.id = id;
    input.addEventListener("input", function () {
      var v = Number(input.value);
      strong.textContent = fmt(v);
      onChange(v);
      rerenderAll();
    });
    row.appendChild(input);

    parent.appendChild(row);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var ctrlDemandSupply = document.getElementById("tacg-controls-demand-supply");
    if (ctrlDemandSupply) {
      buildSliderRow(
        ctrlDemandSupply, "tacg-slider-demand", "Demand share of the gap",
        30, 80, state.demandPct,
        function (v) { return v + "% demand / " + (100 - v) + "% supply"; },
        function (v) { state.demandPct = v; }
      );
    }

    var ctrlAddressable = document.getElementById("tacg-controls-addressable");
    if (ctrlAddressable) {
      buildSliderRow(
        ctrlAddressable, "tacg-slider-notaddr", "Not-addressable share of the demand side",
        0, 50, state.notAddressablePct,
        function (v) { return v + "% of demand side"; },
        function (v) { state.notAddressablePct = v; }
      );
    }

    register("tacg-diagram-0", ["level0"]);
    register("tacg-diagram-1", ["level0", "level1", "level2", "level3"]);
    register("tacg-diagram-2", ["level0", "level1", "level2", "level3"], { showGrantsGuide: true });
    register("tacg-diagram-3", ["level0", "level1", "level2", "level3", "level4"], { showGrantsGuide: true });
    register("tacg-diagram-4", ["level0", "level1", "level2", "level3", "level4", "level5"], { showGrantsGuide: true });
    register("tacg-diagram-5", ["level0", "level1", "level2", "level3", "level4", "level5", "level6"], { showGrantsGuide: true });
    register("tacg-diagram-recap", ["level0", "level1", "level2", "level3", "level4", "level5", "level6"], { showGrantsGuide: true });

    rerenderAll();
  });
})();
