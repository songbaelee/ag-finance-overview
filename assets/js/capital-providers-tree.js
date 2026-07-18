/* Collapsible static tree for The Landscape's "Approaches & named
   examples" section. Adds a +/- toggle to every nested section heading
   -- the two top-level headings (Demand side, Supply side), every
   .cp-node--branch label, and every leaf's .cp-node__label -- so
   clicking one hides/shows that heading's nested content (down to and
   including the org cards themselves). Default state is fully expanded,
   matching how the page looked before this existed. Purely a display
   toggle; no state persists across reloads. */
(function () {
  "use strict";

  function makeToggle(label) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp-tree-toggle";
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Collapse " + label);
    btn.textContent = "−";
    return btn;
  }

  // contentEls: the element(s) this toggle shows/hides. All are kept in
  // sync with a single expanded/collapsed state.
  function wireToggle(btn, contentEls, label) {
    btn.addEventListener("click", function () {
      var wasExpanded = btn.getAttribute("aria-expanded") === "true";
      var nowExpanded = !wasExpanded;
      for (var i = 0; i < contentEls.length; i++) {
        contentEls[i].classList.toggle("is-collapsed", !nowExpanded);
      }
      btn.setAttribute("aria-expanded", String(nowExpanded));
      btn.setAttribute("aria-label", (nowExpanded ? "Collapse " : "Expand ") + label);
      btn.textContent = nowExpanded ? "−" : "+";
    });
  }

  // Siblings of `startEl` that carry `className`, stopping as soon as a
  // sibling without it is reached (used to collect a leaf's archetype
  // card(s), which always immediately follow its label).
  function siblingsWithClass(startEl, className) {
    var found = [];
    var sib = startEl.nextElementSibling;
    while (sib && sib.classList.contains(className)) {
      found.push(sib);
      sib = sib.nextElementSibling;
    }
    return found;
  }

  function addToggle(headingEl, contentEls) {
    if (contentEls.length === 0) return;
    var label = headingEl.textContent.trim();
    var btn = makeToggle(label);
    headingEl.insertBefore(btn, headingEl.firstChild);
    wireToggle(btn, contentEls, label);
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
      if (tree && tree.classList.contains("cp-tree")) addToggle(h, [tree]);
    }

    // Branch headings (Banks, Funds, Repayable, ...): each is followed
    // by the <ul class="cp-branch"> holding its children.
    var branches = section.querySelectorAll(".cp-node--branch");
    for (var b = 0; b < branches.length; b++) {
      var branchEl = branches[b];
      var list = branchEl.nextElementSibling;
      if (list && list.tagName === "UL") addToggle(branchEl, [list]);
    }

    // Leaf headings: .cp-node__label, followed by one or more sibling
    // .cp-archetype cards within the same .cp-node--leaf.
    var leafLabels = section.querySelectorAll(".cp-node__label");
    for (var l = 0; l < leafLabels.length; l++) {
      addToggle(leafLabels[l], siblingsWithClass(leafLabels[l], "cp-archetype"));
    }
  });
})();
