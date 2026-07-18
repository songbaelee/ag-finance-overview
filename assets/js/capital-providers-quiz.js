/* Capital Providers guided quiz -- a linear, typeform-style walk through
   the same demand/supply -> ... -> leaf tree shown statically below on
   the page. Question/leaf structure lives in QUIZ_TREE; leaf content is
   never duplicated here -- the landing screen clones the matching
   .cp-node--leaf element from the static tree at render time, so the
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
        { label: "Banks", sub: "commercial lenders, backed or incentivized to lend more", next: "banks" },
        { label: "Funds", sub: "dedicated vehicles investing agri-SME capital", next: "funds" },
        { label: "Donor-directed", sub: "donor money deployed with varying retained control", next: "donor" }
      ]
    },
    banks: {
      question: "Guarantee-based or incentive-based?",
      options: [
        { label: "Guarantee", sub: "reduces the risk banks take on", leaf: "cp-leaf-banks-guarantee" },
        { label: "Grant-to-incentivize", sub: "pays lenders to make more/better loans", leaf: "cp-leaf-banks-incentivize" }
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

  // Labels the user has clicked so far, in order -- purely for the
  // breadcrumb trail. Never used as content; leaf copy always comes from
  // the static tree at render time (see renderLanding).
  var path = [];

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

  function renderBreadcrumb(container) {
    if (path.length === 0) return;
    container.appendChild(el("p", { class: "cp-quiz__breadcrumb" }, [path.join(" → ")]));
  }

  function renderRestartLink(container) {
    var btn = el("button", { type: "button", class: "cp-quiz__restart" }, ["Start over"]);
    btn.addEventListener("click", renderIntro);
    container.appendChild(btn);
  }

  function renderIntro() {
    path = [];
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
        path.push(opt.label);
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

  // Landing screen (leaf cards, cross-refs, jump-to-map) lands in a
  // later commit -- this placeholder just confirms the tree traversal
  // reaches the right leaf id, so question-flow wiring can be verified
  // on its own before the landing screen is built on top of it.
  function renderLanding(leafId) {
    clear(root);
    renderBreadcrumb(root);
    root.appendChild(el("p", { class: "cp-quiz__copy" }, ["Reached: " + leafId]));
    renderRestartLink(root);
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.getElementById("cp-quiz-root");
    if (!root) return;
    renderIntro();
  });
})();
