/* "Closing the Gap" — a single stacked horizontal-bar diagram of the
   illustrative demand/supply -> addressable -> temporary/permanent ->
   grants/repayable -> TA -> farmer/firm -> BDS/investment-readiness tree.
   There is exactly one diagram DOM node for the whole page, mounted once
   near the top and never relocated. Each of the 7 sections has its own
   click-to-toggle button; toggling a level on/off adds or removes that
   row from the diagram (rows always render in level0..level6 order
   regardless of toggle order). Two top-level sliders (demand/supply
   share; not-addressable share of demand) recompute every currently-shown
   row from shared, session-only state — no persistence, no backend. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var state = {
    demandPct: 60,
    // Default high enough that not-addressable is at least half of the
    // *total* gap, not just of the demand side: 0.60 demand x 0.84 = 50.4%.
    notAddressablePct: 84
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

    // Farmer/firm (and, cascading from firm, BDS/investment-readiness)
    // are sized off the *full* demand share, not just the addressable-only
    // "ta" subset -- this makes them fill exactly the same width "TA"
    // already occupies in the row above (which also spans the full demand
    // share), with no left-over not-addressable gap inside that span.
    var farmer = demand * FARMER_PCT_OF_TA / 100;
    var firm = demand - farmer;

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

  var ALL_LEVELS = ["level0", "level1", "level2", "level3", "level4", "level5", "level6"];

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
          { label: "Temporary (technical assistance)", value: d.ta, varName: "--series-bank" },
          { label: "Permanent", value: d.permanent, varName: "--series-fund" },
          { label: "Temporary again", value: d.tempAgain, varName: "--series-bank" }
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
          { label: "Farmer level", value: d.farmer, varName: "--series-bank" },
          { label: "Firm level", value: d.firm, varName: "--series-red" },
          { label: "Incentives", value: d.incentives, varName: "--series-magenta", muted: true },
          { label: "First-loss", value: d.firstLoss, varName: "--series-green", muted: true }
        ]
      };
    },
    level6: function (d) {
      return {
        title: "Within firm level: BDS vs. investment readiness",
        segs: [
          { label: "Farmer level", value: d.farmer, varName: "--series-bank", muted: true },
          { label: "BDS", value: d.bds, varName: "--series-red" },
          { label: "Investment readiness", value: d.investmentReadiness, varName: "--series-count" },
          { label: "Incentives", value: d.incentives, varName: "--series-magenta", muted: true },
          { label: "First-loss", value: d.firstLoss, varName: "--series-green", muted: true }
        ]
      };
    }
  };

  // Every color and font-size below is duplicated as an inline fallback
  // (var(--x, #hex)) so the diagram still renders correctly — colors,
  // dashed guide lines, readable text sizes — even if style.css fails to
  // load or apply for some reason. SVG has no fill/stroke by default, and
  // an undefined var() resolves to nothing (fill defaults to black), so
  // relying on the stylesheet alone for these is fragile.
  var VAR_FALLBACK = {
    "--series-bank": "#2a78d6",
    "--series-fund": "#1baf7a",
    "--series-gap": "#c3c2b7",
    "--series-count": "#4a3aa7",
    "--series-green": "#008300",
    "--series-magenta": "#e87ba4",
    "--series-orange": "#eb6834",
    "--series-red": "#e34948",
    "--text-primary": "#0b0b0b",
    "--text-secondary": "#52514e",
    "--text-muted": "#898781",
    "--surface-1": "#fcfcfb"
  };

  function cssVar(varName) {
    return "var(" + varName + ", " + VAR_FALLBACK[varName] + ")";
  }

  var FONT_STACK = "system-ui, -apple-system, \"Segoe UI\", sans-serif";

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

  function fillSegTooltip(tip, rowTitle, seg, fillVarName) {
    tip.textContent = "";
    var title = document.createElement("div");
    title.className = "tt-title";
    title.textContent = rowTitle;
    tip.appendChild(title);

    var row = document.createElement("div");
    row.className = "tt-row";
    var key = document.createElement("span");
    key.className = "tt-key";
    key.style.background = cssVar(fillVarName || seg.varName);
    row.appendChild(key);
    var label = document.createElement("span");
    label.textContent = seg.label + (seg.muted ? " (not broken out at this level)" : "");
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
      return secondary ? cssVar("--text-secondary") : cssVar("--text-primary");
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
    container.innerHTML = "";

    if (levelKeys.length === 0) {
      var empty = document.createElement("p");
      empty.className = "level-diagram-empty";
      empty.textContent = "No levels selected — use the toggles above to add rows to the diagram.";
      container.appendChild(empty);
      return;
    }

    var d = compute();
    var rows = levelKeys.map(function (key) {
      return { key: key, def: ROWBUILDERS[key](d) };
    });

    var W = 640;
    var plotLeft = 16;
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

    var guideLineStyle = "stroke:" + cssVar("--text-muted") + ";stroke-width:1.25;stroke-dasharray:4 3;fill:none";
    var guideLabelStyle = "fill:" + cssVar("--text-muted") + ";font-family:" + FONT_STACK + ";font-size:10px;font-weight:600";

    svg.appendChild(svgEl("line", {
      class: "level-guide", x1: demandSupplyX, x2: demandSupplyX, y1: guideTop, y2: guideBottom,
      style: guideLineStyle
    }));
    var dsLabel = svgEl("text", {
      class: "level-guide-label", x: demandSupplyX, y: topPad - 12, "text-anchor": "middle",
      style: guideLabelStyle
    });
    dsLabel.textContent = "demand / supply";
    svg.appendChild(dsLabel);

    if (opts.showGrantsGuide) {
      svg.appendChild(svgEl("line", {
        class: "level-guide", x1: grantsX, x2: grantsX, y1: guideTop, y2: guideBottom,
        style: guideLineStyle
      }));
      var grLabel = svgEl("text", {
        class: "level-guide-label", x: grantsX, y: guideBottom + 14, "text-anchor": "middle",
        style: guideLabelStyle
      });
      grLabel.textContent = "grants / repayable";
      svg.appendChild(grLabel);
    }

    var tip = buildTooltip(container);

    rows.forEach(function (row, i) {
      var y = topPad + i * (rowH + rowGap);

      // Row titles are intentionally not drawn as visible text — the
      // in-bar segment labels/percentages already make each row's content
      // clear, and a title per stacked row becomes redundant clutter.
      // They stay available to assistive tech via the SVG's own
      // aria-label (below) and each segment's per-hit aria-label.
      var xCursor = plotLeft;
      var segs = row.def.segs;
      var narrowActiveCount = 0;
      var isFirstRow = i === 0;

      segs.forEach(function (seg, si) {
        var w = Math.max((seg.value / 100) * plotWidth, 0.01);
        var isFirst = si === 0, isLast = si === segs.length - 1;
        var rL = isFirst ? 4 : 0, rR = isLast ? 4 : 0;
        // Muted segments are context from a different scope than what this
        // row subdivides (e.g. the supply side, on a row that only breaks
        // down TA) -- rendered as neutral grey with no label, so they read
        // as inactive backdrop rather than an actual further split.
        var fillVarName = seg.muted ? "--series-gap" : seg.varName;

        var path = svgEl("path", {
          d: roundedHBarPath(xCursor, y, w, rowH, rL, rR),
          style: "fill:" + cssVar(fillVarName)
        });
        svg.appendChild(path);

        if (!seg.muted && w > 78) {
          var lbl = svgEl("text", {
            class: "level-seg-label", x: xCursor + w / 2, y: y + rowH / 2 - 4, "text-anchor": "middle",
            style: "fill:" + segTextFill(seg.varName, false) + ";font-family:" + FONT_STACK + ";font-size:11px"
          });
          lbl.textContent = seg.label;
          svg.appendChild(lbl);
          var pct = svgEl("text", {
            class: "level-seg-pct", x: xCursor + w / 2, y: y + rowH / 2 + 10, "text-anchor": "middle",
            style: "fill:" + segTextFill(seg.varName, true) + ";font-family:" + FONT_STACK + ";font-size:10px"
          });
          pct.textContent = Math.round(seg.value) + "%";
          svg.appendChild(pct);
        } else if (!seg.muted) {
          // Active but too narrow to hold its own label -- a leader line
          // out to a label in the row-gap above, rather than just
          // suppressing it (that suppression is reserved for muted
          // context segments only). Consecutive narrow segments in the
          // same row stagger further out so their labels don't collide.
          var segCenter = xCursor + w / 2;
          var offset = 8 + narrowActiveCount * 10;
          var labelY = isFirstRow ? y + rowH + offset + 8 : y - offset;
          var tickY2 = isFirstRow ? y + rowH : y;
          var tickY1 = isFirstRow ? labelY - 6 : labelY + 4;
          narrowActiveCount++;

          svg.appendChild(svgEl("line", {
            class: "level-leader-line", x1: segCenter, x2: segCenter, y1: tickY1, y2: tickY2,
            style: "stroke:" + cssVar("--text-secondary") + ";stroke-width:1"
          }));
          var leaderLbl = svgEl("text", {
            class: "level-leader-label", x: segCenter, y: labelY, "text-anchor": "middle",
            style: "fill:" + cssVar("--text-primary") + ";font-family:" + FONT_STACK + ";font-size:10px;font-weight:600"
          });
          leaderLbl.textContent = seg.label + " · " + Math.round(seg.value) + "%";
          svg.appendChild(leaderLbl);
        }

        var hit = svgEl("rect", {
          class: "level-seg-hit", x: xCursor, y: y, width: w, height: rowH,
          style: "fill:transparent;cursor:pointer",
          tabindex: "0", role: "button",
          "aria-label": row.def.title + ": " + seg.label + ", " + Math.round(seg.value) + "% of the total gap" +
            (seg.muted ? " (not broken out at this level)" : "")
        });

        function show(evt) {
          fillSegTooltip(tip, row.def.title, seg, fillVarName);
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
              style: "fill:" + cssVar("--surface-1")
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

  // Single-diagram state: one DOM node, mounted once, never relocated.
  // activeLevels is unordered (toggle order); rows always render in
  // level0..level6 order regardless of which order they were toggled on.
  var diagram = {
    container: null,
    activeLevels: ["level0"]
  };

  function sortedActiveLevels() {
    return ALL_LEVELS.filter(function (lvl) {
      return diagram.activeLevels.indexOf(lvl) !== -1;
    });
  }

  function rerenderDiagram() {
    if (!diagram.container) return;
    var levels = sortedActiveLevels();
    var opts = levels.length > 1 ? { showGrantsGuide: true } : {};
    renderLevelDiagram(diagram.container, levels, opts);
  }

  function setLevelActive(levelKey, active) {
    var idx = diagram.activeLevels.indexOf(levelKey);
    if (active && idx === -1) diagram.activeLevels.push(levelKey);
    if (!active && idx !== -1) diagram.activeLevels.splice(idx, 1);
    rerenderDiagram();
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
      rerenderDiagram();
    });
    row.appendChild(input);

    parent.appendChild(row);
  }

  function setToggleUI(btn, active) {
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.textContent = active ? "Hide from diagram" : "Show in diagram";
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
        0, 95, state.notAddressablePct,
        function (v) { return v + "% of demand side"; },
        function (v) { state.notAddressablePct = v; }
      );
    }

    // One diagram DOM node, mounted once in a fixed spot near the top of
    // the page -- never relocated, never recreated. Each section's toggle
    // button just adds/removes that level from activeLevels and
    // re-renders the same node.
    var mount = document.getElementById("tacg-diagram");
    if (mount) {
      mount.classList.add("chart-card", "level-diagram");
      diagram.container = mount;
      rerenderDiagram();
    }

    var toggles = Array.prototype.slice.call(document.querySelectorAll(".tacg-toggle"));
    toggles.forEach(function (btn) {
      var levelKey = "level" + btn.getAttribute("data-level");
      var active = diagram.activeLevels.indexOf(levelKey) !== -1;
      setToggleUI(btn, active);
      btn.addEventListener("click", function () {
        var isActive = btn.getAttribute("aria-pressed") === "true";
        setToggleUI(btn, !isActive);
        setLevelActive(levelKey, !isActive);
      });
    });
  });
})();
