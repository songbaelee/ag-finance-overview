/* Collapsible static tree for The Landscape's "Approaches & named
   examples" section. Adds a +/- toggle to every nested section heading
   -- the two top-level headings (Demand side, Supply side) and every
   .cp-node--branch label, which is every heading in the tree now that
   branches and (former) leaves share the same plain-row markup -- so
   clicking one hides/shows that heading's nested content (down to and
   including the org cards themselves).

   Default state: the two top-level headings are expanded, everything
   below them starts collapsed. "Collapse all" returns to this same
   state (it's not a separate fully-closed state -- the default already
   is "collapsed below top level"). Purely a display toggle; no state
   persists across reloads.

   Exposes window.cpTree.expandAncestorsOf(el) so other scripts (the
   quiz's jumpToMap) can open exactly the collapsed headings on the path
   to a specific element, without touching sibling branches. */
(function () {
  "use strict";

  // Every toggle on the page: { btn, contentEls, label, isTop }.
  // isTop marks the two top-level headings, which stay expanded by
  // default while everything else starts collapsed.
  var toggles = [];

  function makeToggle() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp-tree-toggle";
    return btn;
  }

  function setState(entry, expanded) {
    for (var i = 0; i < entry.contentEls.length; i++) {
      entry.contentEls[i].classList.toggle("is-collapsed", !expanded);
    }
    entry.btn.setAttribute("aria-expanded", String(expanded));
    entry.btn.setAttribute("aria-label", (expanded ? "Collapse " : "Expand ") + entry.label);
    entry.btn.textContent = expanded ? "−" : "+";
  }

  function addToggle(headingEl, contentEls, isTop) {
    if (contentEls.length === 0) return;
    var label = headingEl.textContent.trim();
    var btn = makeToggle();
    headingEl.insertBefore(btn, headingEl.firstChild);
    var entry = { btn: btn, contentEls: contentEls, label: label, isTop: !!isTop };
    btn.addEventListener("click", function () {
      setState(entry, entry.btn.getAttribute("aria-expanded") !== "true");
    });
    toggles.push(entry);
  }

  function expandAll() {
    for (var i = 0; i < toggles.length; i++) setState(toggles[i], true);
  }

  // The default state doubles as "collapse all": only top-level
  // headings stay open.
  function collapseToDefault() {
    for (var i = 0; i < toggles.length; i++) setState(toggles[i], toggles[i].isTop);
  }

  // Expands every toggle whose content region contains `el`, i.e. every
  // collapsed ancestor heading on the direct path to it -- nothing else.
  function expandAncestorsOf(el) {
    for (var i = 0; i < toggles.length; i++) {
      var entry = toggles[i];
      for (var j = 0; j < entry.contentEls.length; j++) {
        if (entry.contentEls[j].contains(el)) {
          setState(entry, true);
          break;
        }
      }
    }
  }

  function buildActions(section) {
    var actions = document.createElement("div");
    actions.className = "cp-tree-actions";

    var expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "cp-quiz-btn";
    expandBtn.textContent = "Expand all";
    expandBtn.addEventListener("click", expandAll);

    var collapseBtn = document.createElement("button");
    collapseBtn.type = "button";
    collapseBtn.className = "cp-quiz-btn";
    collapseBtn.textContent = "Collapse all";
    collapseBtn.addEventListener("click", collapseToDefault);

    actions.appendChild(expandBtn);
    actions.appendChild(collapseBtn);

    // Directly below the intro paragraph, ahead of the first tree
    // heading -- keeps the section-heading row (which already carries
    // the Illustrative badge) uncrowded.
    var introPara = section.querySelector("p.illustrative-note");
    var anchor = introPara || section.querySelector("h2.section-heading");
    if (anchor) anchor.parentNode.insertBefore(actions, anchor.nextSibling);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var section = document.querySelector(".section-illustrative");
    if (!section) return;

    // Top-level headings: h3.chart-title immediately followed by its
    // .cp-tree (Demand side / Supply side).
    var topHeadings = section.querySelectorAll("h3.chart-title");
    for (var t = 0; t < topHeadings.length; t++) {
      var h = topHeadings[t];
      var tree = h.nextElementSibling;
      if (tree && tree.classList.contains("cp-tree")) addToggle(h, [tree], true);
    }

    // Every other heading (Banks, Funds, Repayable, ..., and every
    // former "leaf" heading like Grant-to-incentivize or Agricultural
    // extension): each is followed by the <ul class="cp-branch"> holding
    // its children, whether those children are further headings or just
    // an org card.
    var branches = section.querySelectorAll(".cp-node--branch");
    for (var b = 0; b < branches.length; b++) {
      var branchEl = branches[b];
      var list = branchEl.nextElementSibling;
      if (list && list.tagName === "UL") addToggle(branchEl, [list], false);
    }

    collapseToDefault();
    buildActions(section);

    window.cpTree = { expandAncestorsOf: expandAncestorsOf };
  });
})();
