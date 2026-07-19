/* The Landscape guided quiz -- a linear, typeform-style walk through
   the same demand/supply -> ... -> leaf tree shown statically below on
   the page. Question/leaf structure lives in QUIZ_TREE; leaf content is
   never duplicated here -- the landing screen clones the matching
   .cp-archetype card(s) out of the static tree at render time, so the
   quiz and the static map can never drift out of copy sync. */
(function () {
  "use strict";

  var QUIZ_TREE = {
    root: {
      question: "Are you looking at the demand side or the supply side?",
      options: [
        { label: "Demand side", sub: "capital or support flowing to farmers and firms", next: "demand" },
        { label: "Supply side", sub: "who's actually providing capital or backing it", next: "supply" }
      ]
    },
    demand: {
      question: "Farmer level or firm level?",
      options: [
        { label: "Farmer level", sub: "agricultural extension, direct to smallholders", leaf: "cp-leaf-farmer" },
        { label: "Firm level", sub: "advisory support aimed at the agribusiness itself", leaf: "cp-leaf-firm" }
      ]
    },
    supply: {
      question: "Banks, funds, or donor-directed vehicles?",
      options: [
        { label: "Banks", sub: "commercial lenders, backed or incentivized to lend more", leaf: "cp-leaf-banks-incentivize" },
        { label: "Funds", sub: "dedicated vehicles investing agri-SME capital", next: "funds" },
        { label: "Donor-directed", sub: "donor money deployed with varying retained control", next: "donor" }
      ]
    },
    funds: {
      question: "Grant capital or repayable capital?",
      options: [
        { label: "Grant", sub: "channels donor money toward expanding lending", leaf: "cp-leaf-funds-grant" },
        { label: "Repayable", sub: "the fund lends its own capital, expects it back", next: "repayable" }
      ]
    },
    repayable: {
      question: "SME-specialist or agri-specialist?",
      options: [
        { label: "SME-specialist", sub: "small businesses broadly, agriculture is one sector", leaf: "cp-leaf-repayable-sme" },
        { label: "Agri-specialist", sub: "agriculture-only mandate", next: "agrispecialist" }
      ]
    },
    agrispecialist: {
      question: "Local or international?",
      options: [
        { label: "Local", sub: "Africa-based fund manager", leaf: "cp-leaf-repayable-agri-local" },
        { label: "International", sub: "headquartered outside the region", next: "international" }
      ]
    },
    international: {
      question: "Lending-focused or TA-focused?",
      options: [
        { label: "Lending-focus", sub: "primarily debt, less bundled support", leaf: "cp-leaf-repayable-agri-intl-lending" },
        { label: "TA-focus", sub: "capital paired with substantial technical assistance", leaf: "cp-leaf-repayable-agri-intl-ta" }
      ]
    },
    donor: {
      question: "How much control does the donor retain?",
      options: [
        { label: "Most", sub: "lending directly off its own balance sheet", leaf: "cp-leaf-donor-most" },
        { label: "More", sub: "influencing one org or a set of orgs", leaf: "cp-leaf-donor-more" },
        { label: "Less", sub: "backing a broader, narrower-strategy vehicle", leaf: "cp-leaf-donor-less" }
      ]
    }
  };

  var INTRO_COPY =
    "Answer a few questions about the kind of approach you're curious " +
    "about, and we'll walk you down the tree to real examples. This " +
    "mirrors the categorization below — it's not a recommendation, just " +
    "a guided path through the same map.";

  var root = null;

  // Steps the user has taken so far, in order -- each is { label, next },
  // where `next` is the QUIZ_TREE key that choice led to (undefined for
  // the last step when it led to a leaf instead of another question).
  // Drives the breadcrumb trail and lets a click on an earlier segment
  // jump back to that question: truncate steps to that point and
  // re-render its `next` node. Never used as leaf content -- leaf copy
  // always comes from the static tree at render time (see renderLanding).
  var steps = [];

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c !== null && c !== undefined) {
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // Jumps back to an earlier question: keeps steps 0..i (the segment
  // clicked and everything before it), discards everything after, and
  // re-renders the question that segment's answer led to. No-ops for a
  // step with no `next` (a leaf-ending step, only ever the last segment
  // on the landing screen) -- there's no question to jump back to.
  function jumpToStep(i) {
    var target = steps[i].next;
    if (!target) return;
    steps = steps.slice(0, i + 1);
    renderQuestion(target);
  }

  function renderBreadcrumb(container) {
    if (steps.length === 0) return;
    var bc = el("p", { class: "cp-quiz__breadcrumb" });
    steps.forEach(function (step, i) {
      if (i > 0) bc.appendChild(document.createTextNode(" → "));
      if (step.next) {
        var link = el("button", { type: "button", class: "cp-quiz__breadcrumb-link" }, [step.label]);
        link.addEventListener("click", function () { jumpToStep(i); });
        bc.appendChild(link);
      } else {
        bc.appendChild(document.createTextNode(step.label));
      }
    });
    container.appendChild(bc);
  }

  function renderRestartLink(container) {
    var btn = el("button", { type: "button", class: "cp-quiz__restart" }, ["Start over"]);
    btn.addEventListener("click", renderIntro);
    container.appendChild(btn);
  }

  function renderIntro() {
    steps = [];
    clear(root);
    root.appendChild(el("p", { class: "cp-quiz__copy" }, [INTRO_COPY]));
    var startBtn = el("button", { type: "button", class: "cp-quiz-btn cp-quiz-btn--primary" }, ["Start"]);
    startBtn.addEventListener("click", function () { renderQuestion("root"); });
    root.appendChild(startBtn);
  }

  function renderQuestion(nodeKey) {
    var node = QUIZ_TREE[nodeKey];
    clear(root);
    renderBreadcrumb(root);
    root.appendChild(el("p", { class: "cp-quiz__question" }, [node.question]));

    var optionsWrap = el("div", { class: "cp-quiz__options" });
    node.options.forEach(function (opt) {
      var btn = el("button", { type: "button", class: "cp-quiz__option" }, [
        el("span", { class: "cp-quiz__option-label" }, [opt.label]),
        el("span", { class: "cp-quiz__option-sub" }, [opt.sub])
      ]);
      btn.addEventListener("click", function () {
        steps.push({ label: opt.label, next: opt.next });
        if (opt.leaf) {
          renderLanding(opt.leaf);
        } else {
          renderQuestion(opt.next);
        }
      });
      optionsWrap.appendChild(btn);
    });
    root.appendChild(optionsWrap);

    renderRestartLink(root);
  }

  // Strips id attributes from a cloned subtree so cloning a static
  // .cp-archetype card into the quiz landing screen never creates a
  // second element sharing an id with its static-section original --
  // the static section's own in-page cross-reference links (e.g.
  // #cp-fasa) must keep resolving to that original, not to a clone that
  // happens to render earlier in the document.
  function stripIds(node) {
    node.removeAttribute("id");
    var withIds = node.querySelectorAll("[id]");
    for (var i = 0; i < withIds.length; i++) withIds[i].removeAttribute("id");
    return node;
  }

  // Scrolls to the leaf's heading in the static tree below and gives its
  // nested org card(s) a brief border-color flash (see .cp-archetype
  // .is-flash in style.css) so it's obvious which card the quiz just
  // pointed at. The leaf id sits on a plain <li> (the heading row plus
  // its nested content), not on the card itself -- only the card has a
  // visible box to flash.
  function jumpToMap(leafId) {
    var target = document.getElementById(leafId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    var cards = target.classList.contains("cp-archetype") ? [target] : target.querySelectorAll(".cp-archetype");
    for (var i = 0; i < cards.length; i++) cards[i].classList.add("is-flash");
    window.setTimeout(function () {
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove("is-flash");
    }, 1600);
  }

  // Leaf cards are never retyped here -- each card is a live clone of
  // the matching .cp-archetype element(s) already in the static tree
  // below, org name/description/cross-ref included verbatim, so the two
  // views of the map can't drift out of sync with each other.
  function renderLanding(leafId) {
    clear(root);
    renderBreadcrumb(root);

    var leafSource = document.getElementById(leafId);
    var cardsWrap = el("div", { class: "cp-quiz__landing-cards" });
    if (leafSource) {
      var cards = leafSource.querySelectorAll(".cp-archetype");
      for (var i = 0; i < cards.length; i++) {
        cardsWrap.appendChild(stripIds(cards[i].cloneNode(true)));
      }
    }
    root.appendChild(cardsWrap);

    var actions = el("div", { class: "cp-quiz__actions" });
    var againBtn = el("button", { type: "button", class: "cp-quiz-btn" }, ["Explore another path"]);
    againBtn.addEventListener("click", renderIntro);
    actions.appendChild(againBtn);

    var jumpBtn = el("button", { type: "button", class: "cp-quiz-btn" }, ["See this in the map below"]);
    jumpBtn.addEventListener("click", function () { jumpToMap(leafId); });
    actions.appendChild(jumpBtn);

    root.appendChild(actions);
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.getElementById("cp-quiz-root");
    if (!root) return;
    renderIntro();
  });
})();
