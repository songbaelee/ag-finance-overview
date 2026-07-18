/* "Closing the Gap" — a single stacked horizontal-bar diagram of the
   illustrative demand/supply -> addressable -> temporary/permanent ->
   grants/repayable -> TA -> farmer/firm -> BDS/investment-readiness tree.
   There is exactly one diagram DOM node for the whole page, mounted once
   near the top and never relocated. Each of the 7 sections has its own
   click-to-toggle button; toggling a level on/off adds or removes that
   row from the diagram (rows always render in level0..level6 order
   regardless of toggle order). Two dashed dividers double as drag
   handles directly on the bars (demand/supply on the top row; grants/
   repayable wherever that split is visible) and recompute every
   currently-shown row from shared, session-only state — no persistence,
   no backend, no separate slider UI. */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var state = {
    demandPct: 60,
    // Share of the "permanent" supply segment that's grant-funded rather
    // than repayable. This is the one thing the grants/repayable divider
    // actually drags — notAddressable+ta already equals the full demand
    // share, so that portion is always grants regardless of this value.
    grantPctOfPermanent: 50
  };

  var DEMAND_PCT_MIN = 30, DEMAND_PCT_MAX = 80;

  // Report-sourced total gap (rounded, matches the $74B figure used
  // elsewhere on this page and in Market Sizing) — used to give the two
  // draggable-divider rows (demand/supply, grants/repayable) a concrete
  // dollar readout alongside their illustrative percentage split. Every
  // seg.value in compute()'s output is already expressed as a share of
  // this same full-gap scale (that's why grants+repayable sum to 100 just
  // like demand+supply do), so no extra rescaling is needed per row —
  // only the total being split is report-sourced, not the split itself.
  var GAP_TOTAL_USD_B = 74;

  function usdBFromPct(pct) {
    return "~$" + Math.round(pct / 100 * GAP_TOTAL_USD_B) + "B";
  }

  // Fixed illustrative constants — not addressable's share no longer has
  // its own control (see grantPctOfPermanent above for the one dial that
  // replaced it); everything below recomputes proportionally.
  var NOT_ADDRESSABLE_PCT_OF_DEMAND = 84;
  var TEMP_AGAIN_PCT_OF_SUPPLY = 15;
  var FARMER_PCT_OF_TA = 55;
  var BDS_PCT_OF_FIRM = 70;

  function compute() {
    var demand = state.demandPct;
    var supply = 100 - demand;

    var notAddressable = demand * NOT_ADDRESSABLE_PCT_OF_DEMAND / 100;
    var ta = demand - notAddressable;

    var permanent = supply * (1 - TEMP_AGAIN_PCT_OF_SUPPLY / 100);
    var tempAgain = supply * (TEMP_AGAIN_PCT_OF_SUPPLY / 100);

    var grantPortion = permanent * state.grantPctOfPermanent / 100;
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

  var LEVEL_TITLES = {
    level0: "Demand vs. supply",
    level1: "Addressable vs. not addressable",
    level2: "Temporary, permanent, temporary again",
    level3: "Grants vs. repayable capital",
    level4: "Grants: TA, incentives, first-loss",
    level5: "TA: farmer level vs. firm level",
    level6: "Firm level: BDS vs. investment readiness"
  };

  var ROWBUILDERS = {
    level0: function (d) {
      return {
        title: "Demand vs. supply",
        segs: [
          { label: "Demand side", value: d.demand, varName: "--series-bank", usd: usdBFromPct(d.demand) },
          { label: "Supply side", value: d.supply, varName: "--series-fund", usd: usdBFromPct(d.supply) }
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
          { label: "Not addressable", value: d.notAddressable, varName: "--series-gap", muted: true },
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
          { label: "Grants", value: d.grants, varName: "--series-orange", usd: usdBFromPct(d.grants) },
          { label: "Repayable capital", value: d.repayable, varName: "--series-green", usd: usdBFromPct(d.repayable) }
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
    key.style.background = cssVar(seg.varName);
    row.appendChild(key);
    var label = document.createElement("span");
    label.textContent = seg.label + (seg.muted ? " (not broken out at this level)" : "");
    row.appendChild(label);
    var val = document.createElement("strong");
    val.textContent = Math.round(seg.value) + "% of gap" + (seg.usd ? " (" + seg.usd + ")" : "");
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

    // y of the top row (always index 0) hosts the demand/supply handle;
    // the grants/repayable handle sits on the first active row that
    // actually displays that split (level3, or a deeper row where the
    // same boundary still lines up between segments).
    var demandHandleY = topPad;
    var grantsHandleY = null;

    rows.forEach(function (row, i) {
      var y = topPad + i * (rowH + rowGap);
      if (grantsHandleY === null &&
        (row.key === "level3" || row.key === "level4" || row.key === "level5" || row.key === "level6")) {
        grantsHandleY = y;
      }

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
        // down TA), or a segment that already got its full presentation in
        // an earlier row (e.g. "not addressable"). Either way they render
        // as a dashed outline with no fill and no label, so they read as
        // inactive backdrop rather than a repeat of an actual split.
        var pathAttrs = {
          d: roundedHBarPath(xCursor, y, w, rowH, rL, rR),
          style: seg.muted
            ? "fill:none;stroke:" + cssVar("--text-muted") + ";stroke-width:1.25;stroke-dasharray:4 3"
            : "fill:" + cssVar(seg.varName)
        };
        if (seg.muted) pathAttrs.class = "level-seg-muted";
        var path = svgEl("path", pathAttrs);
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
          pct.textContent = Math.round(seg.value) + "%" + (seg.usd ? " (" + seg.usd + ")" : "");
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
          leaderLbl.textContent = seg.label + " · " + Math.round(seg.value) + "%" +
            (seg.usd ? " (" + seg.usd + ")" : "");
          svg.appendChild(leaderLbl);
        }

        var hit = svgEl("rect", {
          class: "level-seg-hit", x: xCursor, y: y, width: w, height: rowH,
          style: "fill:transparent;cursor:pointer",
          tabindex: "0", role: "button",
          "aria-label": row.def.title + ": " + seg.label + ", " + Math.round(seg.value) + "% of the total gap" +
            (seg.usd ? " (" + seg.usd + ")" : "") +
            (seg.muted ? " (not broken out at this level)" : "")
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

        if (!isLast && !seg.muted && !segs[si + 1].muted) {
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

    // Draggable dividers, layered on top of everything else so they win
    // pointer hits over the segments' own tooltip hit-rects underneath.
    // Each is a full-height invisible drag/keyboard target along the
    // dashed guide line, plus a small visible grip at the row where that
    // split is actually shown, so grabbing anywhere on the rail works but
    // the affordance reads clearly at the relevant bar.
    var pendingFocusEl = null;

    function addDivider(key, x, handleY, min, max, get, set, ariaLabel) {
      var gripW = 10, gripH = rowH + 8;
      svg.appendChild(svgEl("rect", {
        class: "tacg-divider-grip",
        x: x - gripW / 2, y: handleY - 4, width: gripW, height: gripH, rx: gripW / 2,
        style: "fill:" + cssVar("--surface-1") + ";stroke:" + cssVar("--text-secondary") +
          ";stroke-width:1.25;pointer-events:none"
      }));

      var hitW = 22;
      var hit = svgEl("rect", {
        class: "tacg-divider-hit",
        x: x - hitW / 2, y: guideTop, width: hitW, height: guideBottom - guideTop,
        style: "fill:transparent;cursor:ew-resize",
        tabindex: "0", role: "slider",
        "aria-label": ariaLabel,
        "aria-valuemin": String(Math.round(min)),
        "aria-valuemax": String(Math.round(max)),
        "aria-valuenow": String(Math.round(get()))
      });

      function xToPct(clientX) {
        var currentSvg = container.querySelector("svg");
        var rect = currentSvg.getBoundingClientRect();
        var scale = W / rect.width;
        return ((clientX - rect.left) * scale - plotLeft) / plotWidth * 100;
      }

      function applyPct(pct) {
        set(pct);
        focusedDividerKey = key;
        rerenderDiagram();
      }

      function onMove(evt) { applyPct(xToPct(evt.clientX)); }
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
        var step = evt.shiftKey ? 5 : 1;
        if (evt.key === "ArrowLeft" || evt.key === "ArrowDown") {
          evt.preventDefault();
          applyPct(get() - step);
        } else if (evt.key === "ArrowRight" || evt.key === "ArrowUp") {
          evt.preventDefault();
          applyPct(get() + step);
        }
      });

      hit.addEventListener("focus", function () { focusedDividerKey = key; });
      hit.addEventListener("blur", function () {
        if (focusedDividerKey === key) focusedDividerKey = null;
      });

      svg.appendChild(hit);
      if (focusedDividerKey === key) pendingFocusEl = hit;
    }

    addDivider(
      "demand-supply", demandSupplyX, demandHandleY, DEMAND_PCT_MIN, DEMAND_PCT_MAX,
      function () { return state.demandPct; },
      function (pct) { state.demandPct = Math.max(DEMAND_PCT_MIN, Math.min(DEMAND_PCT_MAX, pct)); },
      "Demand share of the gap, draggable. Currently " + Math.round(d.demand) +
        "% demand (" + usdBFromPct(d.demand) + "), " + Math.round(d.supply) +
        "% supply (" + usdBFromPct(d.supply) + ")."
    );

    if (opts.showGrantsGuide && grantsHandleY !== null) {
      addDivider(
        "grants-repayable", grantsX, grantsHandleY, d.demand, 100 - d.tempAgain,
        function () { return compute().grants; },
        function (pct) {
          var dd = compute();
          var lo = dd.demand, hi = 100 - dd.tempAgain;
          var clamped = Math.max(lo, Math.min(hi, pct));
          var grantPortion = clamped - dd.demand;
          state.grantPctOfPermanent = dd.permanent > 0
            ? Math.max(0, Math.min(100, grantPortion / dd.permanent * 100))
            : 0;
        },
        "Grants share of the response, draggable. Currently " + Math.round(d.grants) +
          "% grants (" + usdBFromPct(d.grants) + "), " + Math.round(d.repayable) +
          "% repayable capital (" + usdBFromPct(d.repayable) + ")."
      );
    }

    var svgWrap = document.createElement("div");
    svgWrap.className = "chart-svg-wrap";
    svgWrap.appendChild(svg);
    container.insertBefore(svgWrap, tip);
    if (pendingFocusEl) pendingFocusEl.focus({ preventScroll: true });
  }

  // Single-diagram state: one DOM node, mounted once, never relocated.
  // activeLevels is unordered (toggle order); rows always render in
  // level0..level6 order regardless of which order they were toggled on.
  var diagram = {
    container: null,
    activeLevels: ["level0"]
  };

  // Key of whichever divider currently holds keyboard focus, so a
  // full-diagram rebuild triggered by that same divider (drag or arrow-key
  // nudge) can restore focus to its replacement element afterward.
  var focusedDividerKey = null;

  var GRANTS_ROW_KEYS = ["level3", "level4", "level5", "level6"];

  function sortedActiveLevels() {
    return ALL_LEVELS.filter(function (lvl) {
      return diagram.activeLevels.indexOf(lvl) !== -1;
    });
  }

  function rerenderDiagram() {
    if (!diagram.container) return;
    var levels = sortedActiveLevels();
    var showGrantsGuide = levels.some(function (lvl) {
      return GRANTS_ROW_KEYS.indexOf(lvl) !== -1;
    });
    renderLevelDiagram(diagram.container, levels, { showGrantsGuide: showGrantsGuide });
  }

  function setLevelActive(levelKey, active) {
    var idx = diagram.activeLevels.indexOf(levelKey);
    if (active && idx === -1) diagram.activeLevels.push(levelKey);
    if (!active && idx !== -1) diagram.activeLevels.splice(idx, 1);
    rerenderDiagram();
  }

  function setToggleUI(btn, active, label) {
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.textContent = (active ? "✓ " : "") + label;
  }

  // Populated once the per-level pills are built, so "Show all"/"Hide all"
  // can update every pill's UI in one pass instead of re-deriving it from
  // the DOM.
  var levelToggleButtons = {};

  function setAllLevels(active) {
    diagram.activeLevels = active ? ALL_LEVELS.slice() : [];
    ALL_LEVELS.forEach(function (levelKey) {
      var btn = levelToggleButtons[levelKey];
      if (btn) setToggleUI(btn, active, LEVEL_TITLES[levelKey]);
    });
    rerenderDiagram();
  }

  document.addEventListener("DOMContentLoaded", function () {
    // One diagram DOM node, mounted once in a fixed spot near the top of
    // the page -- never relocated, never recreated.
    var mount = document.getElementById("tacg-diagram");
    if (mount) {
      mount.classList.add("chart-card", "level-diagram");
      diagram.container = mount;
      rerenderDiagram();
    }

    // All 7 toggles live together in one cluster next to the diagram,
    // generated from ALL_LEVELS/LEVEL_TITLES so labels can't drift out of
    // sync with a hand-written copy in the HTML. Each toggle just adds or
    // removes that level from activeLevels and re-renders the same node.
    var toggleGroup = document.getElementById("tacg-toggle-group");
    if (toggleGroup) {
      ALL_LEVELS.forEach(function (levelKey) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tacg-toggle";
        btn.setAttribute("data-level", levelKey.replace("level", ""));
        var active = diagram.activeLevels.indexOf(levelKey) !== -1;
        setToggleUI(btn, active, LEVEL_TITLES[levelKey]);
        btn.addEventListener("click", function () {
          var isActive = btn.getAttribute("aria-pressed") === "true";
          setToggleUI(btn, !isActive, LEVEL_TITLES[levelKey]);
          setLevelActive(levelKey, !isActive);
        });
        levelToggleButtons[levelKey] = btn;
        toggleGroup.appendChild(btn);
      });
    }

    var showAllBtn = document.getElementById("tacg-show-all");
    if (showAllBtn) showAllBtn.addEventListener("click", function () { setAllLevels(true); });

    var hideAllBtn = document.getElementById("tacg-hide-all");
    if (hideAllBtn) hideAllBtn.addEventListener("click", function () { setAllLevels(false); });
  });
})();
