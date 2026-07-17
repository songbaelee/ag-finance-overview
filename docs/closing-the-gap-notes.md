# Interventions / "Approaches to closing the gap" — content doc

## HANDOFF INSTRUCTIONS FOR CLAUDE CODE -- READ FIRST

**File to edit:** `types-of-ag-finance.html` (existing file in repo root -- do NOT create a new file or new nav item). This page currently has placeholder content ("Content for this section is coming soon") and needs its `<main>` content fully replaced with the page copy below.

**Nav label:** Update the nav link text and `<title>` from "Types of Ag Finance" to a new title reflecting this page's actual content -- e.g. "Approaches to Closing the Gap" or similar (exact wording not finalized -- pick something clear and update it consistently in: the `<title>` tag, the nav `<li>` link text in the header, and the `<h1 class="page-title">`). Update this same nav link text across every other page's shared header nav (`index.html`, `market-sizing.html`, `capital-providers.html`, `programming-examples.html`, `glossary.html`), same as was done when Market Sizing was built.

**Sourcing convention (see CLAUDE.md):** This page mixes a neutral illustrative framework with two personal opinion callouts. Follow CLAUDE.md's existing "What the report tells us" / "Our illustrative modeling" convention for the structural/methodology content (this is fine to keep as "our" -- describes the joint modeling approach, not an institutional claim). However, the **two "tension worth naming" callouts must stay in first-person "I" voice** and must NOT be attributed to CRS or any employer -- these are personal opinions layered on top of the neutral framework, and that distinction needs to stay visually and tonally clear (e.g., a distinct callout style, like a blockquote or highlighted box, separate from the neutral explanatory callout).

**Diagrams:** See "Visualization / interactivity plan" below. Build as SVG/HTML matching the stacked-bar structure prototyped in chat (one row per level, shared total width, dashed vertical guide lines carrying the demand/supply and grants/repayable boundaries down through the stack). Reveal diagrams level-by-level alongside the prose sections (not one giant 7-level diagram up front), with a full assembled 7-level version as a recap visual at the very end of the section.

**Interactivity:** Only the top 1-2 levels (demand/supply; addressable/not addressable) should have real sliders. Lower levels should recompute proportionally from the top-level slider values, using the same recompute pattern already built for Market Sizing (tier -> provider type). No save/snapshot/persistence -- static site, no backend. Session-only state is fine.

**Status: structure locked, copy drafted below (v1). Ready to build.**

## Framing / scope
- Follows the Market Sizing page. Moves from "how big is the gap" to "how might it get filled."
- Donor-perspective framework throughout.
- Same philosophy as Market Sizing: illustrative, arbitrary-but-clean segmentation over false precision. Goal is to show that segmenting matters, not to be numerically accurate.
- Interactivity: default illustrative view first; user adjustments are an "explore further" layer, not the main event.
- Market Sizing may later get retrofitted with similar interactivity — deferred, not in scope now.

## Top-level lens: demand side vs. supply side
- Demand side ~ technical assistance (TA) / advisory work directed at firms.
- Supply side ~ working with capital providers.
- Default illustrative split: 60/40, demand-heavy.
- Framing copy (near-final, drafted earlier — reuse verbatim where possible):
  > "Reports on this gap differ in emphasis. Much of the literature leans toward supply-side constraints -- banks and capital providers under-serving this market -- as the larger issue. Some reports frame it as demand-side -- firms lacking the systems, records, or scale to be financeable in the first place. Many reports simply name both without indicating which is larger. For this illustrative view, we've chosen to weight the split toward the demand side -- reflecting a view that firm-readiness is the more fundamental constraint -- but this is one interpretation among several, and you can adjust the split yourself below."
- Supporting evidence found for both sides (background, not necessarily quoted on page):
  - Supply-side-as-dominant framing: post-financial-crisis bank caution, tightened lending standards, SME loans viewed as high-risk segment (fintech/finance industry commentary).
  - Demand-side-as-dominant framing: Ethiopian agri-SME field study -- weak financial management/record-keeping prevents firms from generating what lenders/investors require.
  - CASA itself (existing source) names both causes side by side without weighting either as larger.

## The three parallel lenses (independent, but all applied together)
All three cut the same $74B gap simultaneously -- not sequential/nested, three separate views of the same whole:
1. Demand vs. supply (60/40 default)
2. Addressable vs. not addressable
3. Grants vs. repayable capital

Note: "not addressable" applies to the demand side only (confirmed) -- not a supply-side phenomenon in this framework.

## Full tree structure (7 levels, per hand-drawn sketch, confirmed correct as of v3 sketch)

Level 0 -- Demand side / supply side (60/40 illustrative default)

Level 1 -- Addressable vs. not addressable
- Not addressable: demand-side only
- Addressable: remainder of demand side + all of supply side

Level 2 -- Within "addressable": temporary -> permanent -> temporary again
- Temporary (demand side) = TA. Once TA strengthens a firm, that firm no longer needs it. Temporary from the individual firm's perspective.
- Permanent (supply side) = most supply-side interventions; structurally ongoing need.
- Temporary again (supply side) = the subset of supply-side cases that are commercially ready but have only a perceived risk problem -- once perception corrects, they also graduate off subsidy.

Level 3 -- Grants vs. repayable capital
- Grants fund: not-addressable + first temporary (TA) + part of permanent.
- Repayable capital funds: the remaining part of permanent + second temporary.
- A second boundary line (within "permanent") marks where grant funding stops and repayable capital picks up.

Level 4 -- Within grants: TA -> incentives -> first-loss
- TA spans the full demand-side portion of grants (left edge to demand/supply boundary).
- Incentives cover the small supply-side sliver of grants (demand/supply boundary to end of grants).
- First-loss matches the full width of repayable capital (grouped with repayable because first-loss guarantees are the mechanism that unlocks private repayable lending, even though donor-capitalized).

Level 5 -- Within TA: farmer level vs. firm level
- Farmer level = ag extension (CRS's actual wheelhouse -- direct to farmer).
- Firm level = BDS + investment readiness (CRS partners with other providers here rather than delivering directly).

Level 6 -- Within firm level: BDS vs. investment readiness
- Business Development Services (BDS): non-financial services helping SMEs tackle obstacles, speed growth, achieve scale -- acceleration, incubation, technical assistance, coaching, consulting. (Term sourced from ISF-affiliated BDS economics research.)
- Investment readiness: distinct, later-stage, raise-specific prep (business plans, due-diligence prep, investor matching). Also appears as its own term in donor literature (e.g., CASA).
- CRS does capacity building / extension at farmer level; does NOT do investment readiness; partners with other BDS providers for firm-level work.

## Terminology notes
- Use "Business Development Services (BDS)" as the formal term for firm-level TA -- not "capacity building" or "agricultural extension." Gloss it on first use for readers unfamiliar with the acronym.
- Agricultural extension = farmer-level advisory (crop practices, inputs) -- CRS's direct wheelhouse, historically distinct tradition from BDS.
- Footnote to include: "enabling environment" (policy, regulation, credit infrastructure, credit bureaus, collateral registries) supports both demand and supply sides at once and isn't captured in this simplified split -- out of scope for this illustrative view.

## Callouts (three, each distinct type -- do not blend)

1. Explanatory / neutral insight (not a critique):
   TA is often perceived by funders as permanent subsidy, because grants continuously fund the program year over year. But from an individual firm's perspective, the intervention itself is meant to be temporary -- once TA strengthens that firm, it graduates off support. The "permanence" is at the program level, not the firm level.

2. Personal critique #1 (first-person "I," not attributed to employer):
   Supply-side interventions should, in principle, only target investment-ready firms. In practice, donors often build supply-side programs (lending facilities, guarantee schemes, etc.) aimed at firms that aren't investment-ready yet -- a mismatch between the tool and the segment it's applied to.

3. Personal critique #2 (first-person "I," not attributed to employer):
   Some of what's labeled "repayable capital" in the permanent segment is actually functioning as disguised permanent subsidy: the segment can't service market-rate terms, so the fund offers concessional returns to survive there. This works at small scale (quietly eating the fund's returns) but caps the fund's ability to scale -- since scaling requires attracting capital at a return that segment can't generate. Donors then criticize the fund for "not scaling" without recognizing they're structurally absorbing what should have been grant-funded subsidy in the first place.

Tone requirement: callouts 2 and 3 must read as personal viewpoint ("I think," "in my view," "a tension I'd flag") -- never "we" or anything implying organizational/employer attribution. Callout 1 can stay neutral/explanatory, no first-person needed.

## References ("Further reading," bottom of page, light-touch, NOT a comprehensive resource list)
- ISF Advisors -- "Understanding How Agri-SMEs are Financed Today" (companion piece to CASA report already used on Market Sizing). Label explicitly as "an example" of an alternative framework, not a comprehensive or authoritative list -- this report uses a three-level framework (capital / coordination / policy) as a point of comparison to this page's simpler demand/supply spine.
- (Market Sizing page should get the same "Further reading" treatment retroactively -- not yet done -- CASA's own report is candidate #1 there.)

## Visualization / interactivity plan
- Static structure: stacked horizontal bars, one row per level, shared total width, dashed vertical guide lines carrying key boundaries (demand/supply; grants/repayable) down through the stack -- confirmed working visual metaphor, matches hand sketch well.
- Full 7-level drag interactivity = too fiddly. Plan: only top 1-2 levels (demand/supply; addressable/not) get real sliders. Lower levels recompute proportionally from the top-level choices, same pattern as tier -> provider type on Market Sizing.
- No save/snapshot feature -- this is a static site (GitHub Pages, no backend). User adjustments are session-only, not persisted.
  - Considered and declined for now: shareable permalink (encode slider state in URL) -- feasible without backend, could revisit.
  - Considered and declined: persistent cross-visitor gallery -- would require real backend infra (serverless function or hosted DB, write API, moderation/rate-limiting). Bigger step-change than anything else on the site. Not pursuing.
  - Current plan instead: if posted to LinkedIn, suggest people screenshot their own adjusted view and share in comments there -- no site-side building needed.

## PAGE COPY -- v1 (current draft, ready to hand to Claude Code)
Diagram reveal plan: level-by-level alongside prose (not all 7 levels at once). Full assembled 7-level diagram appears once more as a recap visual at the very end of the section, after each layer has already been introduced individually.

---

### From segmenting the gap to segmenting the response

We've looked at how big the $74B agri-SME financing gap is and how it breaks down by tier. Now we turn to a different question: how might that gap actually get filled?

As with market sizing, this isn't an attempt to be precise. It's an attempt to show that segmenting the response to the gap -- not just the gap itself -- helps clarify why different interventions exist, who they're for, and why some tensions in this space keep recurring. The proportions below are illustrative, not measured, and you'll be able to adjust some of them yourself.

### Demand side vs. supply side

The most basic split: is the constraint on the firm's side, or the capital provider's side?

Reports on this gap differ in emphasis. Much of the literature leans toward supply-side constraints -- banks and capital providers under-serving this market -- as the larger issue. Some reports frame it as demand-side -- firms lacking the systems, records, or scale to be financeable in the first place. Many reports simply name both without indicating which is larger.

For this illustrative view, we've chosen to weight the split toward the demand side -- reflecting a view that firm-readiness is the more fundamental constraint -- but this is one interpretation among several, and you can adjust the split yourself below.

[interactive: demand/supply slider, default 60/40]

### Three lenses, one gap

Demand/supply is one way to cut the $74B. Two more, applied at the same time rather than sequentially:

- Addressable vs. not addressable -- is this portion of the gap something any known tool can currently fix?
- Grants vs. repayable capital -- does closing this portion require giving money away, or can it be lent or invested?

None of these three lenses is more "correct" than the others -- they're independent views of the same whole, and we're layering all three onto the same illustrative bar.

[diagram: stacked bars, levels 0-3]

### Why "addressable" isn't one thing

Within the addressable portion, we see a pattern that isn't a simple binary -- it's temporary, then permanent, then temporary again:

- Temporary (demand side): this is technical assistance. Once TA makes a firm stronger -- better records, stronger management -- that firm shouldn't need TA anymore. Temporary, from the perspective of any one firm.
- Permanent (supply side): most supply-side interventions. These segments have a structural, ongoing need for support -- not a phase they graduate out of.
- Temporary again (supply side): a narrower slice of firms that graduate off supply-side subsidy for a different reason than TA firms do -- for example, firms that are already commercially viable but a lender misjudges the risk. Once that perception (or whatever the specific barrier is) corrects, this segment can graduate to ordinary commercial terms too.

> Worth noting: technical assistance is often thought of as a permanent subsidy, because it's always funded by grants, year after year, program after program. But that permanence is at the program level. From an individual firm's perspective, TA is meant to be temporary -- support that ends once the firm no longer needs it.

### Grants vs. repayable capital, mapped on

Grants fund the not-addressable segment, the first temporary (TA) segment, and part of the permanent segment. Repayable capital funds the rest of permanent, plus the second temporary segment.

[diagram: stacked bars, level 3, with second boundary line]

A tension worth naming: in my view, some of what gets labeled "repayable capital" in the permanent segment is actually acting as disguised permanent subsidy. The segment can't generate returns attractive enough to be commercially scalable -- so the fund is only investable by concessional investors, a small and limited pool. I don't think that's a problem in itself -- it's fine, even good, for concessional investors to fund a fund serving a niche market. The real issue is when everyone involved -- the fund, its backers, its critics -- expects that fund to eventually scale commercially. Donors then criticize the fund for failing to scale, without recognizing that its return profile was never going to attract mainstream capital in the first place.

### Within grants: TA, incentives, first-loss

- TA -- the demand-side mechanism, covered above.
- Incentives -- a smaller, supply-side slice of grant funding: pay-for-performance schemes, results-based grants to lenders.
- First-loss -- the junior tranche of a capital structure, which absorbs losses before senior capital does, earning a lower return even though it carries more risk. We group first-loss with repayable capital because, unlike a grant, it's still capital that's invested and expects some return -- just a subordinated one.

Another tension worth naming: supply-side interventions -- new products, first-loss capital, incentive schemes -- should, in principle, only be built for firms that are already investment-ready. In my experience, donors often build supply-side programs for firms that aren't investment-ready yet, essentially trying to use a supply-side tool to solve what's actually a demand-side problem.

### Within TA: farmer level vs. firm level

Technical assistance itself splits by who receives it:

- Farmer level -- agricultural extension: direct advisory to farmers on practices, inputs, yields.
- Firm level -- Business Development Services (BDS) and investment readiness: advisory aimed at the enterprise itself -- financial management, business planning, growth strategy.

### Within firm-level TA: BDS vs. investment readiness

- Business Development Services (BDS): non-financial support to help SMEs overcome obstacles and grow -- coaching, consulting, business planning, financial management training.
- Investment readiness: a narrower, later-stage form of support aimed at preparing a specific firm for a specific capital raise -- business plans, due-diligence prep, investor matching.

### Further reading

ISF Advisors -- "Understanding How Agri-SMEs are Financed Today." One example -- not a comprehensive list -- of an alternative way to frame this space: a three-level framework spanning capital, coordination, and policy, offered here as a point of comparison to the simpler demand/supply spine used on this page.

---

## STATUS: SHIPPED AND VERIFIED (as of commit on 7/16/26)
Live at: https://songbaelee.github.io/ag-finance-overview/types-of-ag-finance.html
(nav label "Closing the Gap"; file/URL slug intentionally left as
types-of-ag-finance.html to avoid breaking links -- see handoff note above)

## FINAL SHIPPED DESIGN -- diagram, interaction, and visual system
This diverged substantially from the original plan through several rounds
of in-browser testing. Capturing the final state here so future sessions
don't re-litigate settled decisions.

### Diagram structure
- ONE single diagram element in the DOM (not one per section, not a
  separate "recap" -- those approaches were tried and abandoned after
  causing visual repetition and jerky scroll-linked rendering).
- Diagram lives in a single fixed location near the top of the page
  (normal document flow, not sticky/pinned), directly below the
  intro/framing text.
- All 7 levels are shown/hidden via a click-to-toggle panel (7 pill
  buttons, one per level, generated from a single LEVEL_TITLES source of
  truth) sitting directly beside the diagram -- NOT scroll-triggered.
  Toggling works in any order; rows always render in natural level0..6
  order regardless of click order.
- Every row shares the same total width (the full $74B-equivalent scale),
  preserved even for deeply-nested rows (e.g. farmer/firm-level,
  BDS/investment-readiness) -- these are NOT rescaled to their own
  parent's width. Alignment across rows via shared scale was treated as
  non-negotiable ("scale-literal") throughout.

### Interactivity: drag-dividers, not sliders
- Standalone range-input sliders were fully removed.
- Two boundaries are directly draggable on the bars themselves:
  1. The demand/supply divider (top row)
  2. The grants/repayable divider (replaced the original "not-addressable
     share of demand side" slider, which was dropped because it didn't
     cascade to any other row and wasn't the most interesting thing to
     let readers explore -- the grants/repayable divider ties directly
     to the two personal-view critiques instead).
  Not-addressable is now a fixed illustrative constant (84% of demand
  side), no longer user-adjustable.
- Each divider has a visible grip handle, is draggable via pointer, and
  supports arrow-key nudging when focused (accessibility fallback).

### Muted/inactive segment treatment
- Any segment that has already been fully shown (colored + labeled) in
  an earlier row, when it reappears as context in a later row, renders
  as: dashed outline, no fill, no label. This applies uniformly --
  not just "not addressable," but every repeated segment.
- This muted treatment is deliberately NOT deletion -- the inactive
  portion keeps its full width in the row (preserving the shared-scale
  alignment / dashed guide lines running through the whole stack).

### Color system
- Color encodes TEMPORAL STATUS, not demand/supply lineage: both
  "Temporary" segments (technical assistance, and the supply-side
  "temporary again" case) share one color, visually distinct from
  "Permanent" -- reinforcing the page's actual point (these graduate off
  subsidy) rather than which side of demand/supply they're on.
- Farmer-level and firm-level (and BDS/investment-readiness beneath it)
  are sized to exactly match TA's actual width/position in the row
  above -- no internal gray padding, pixel-aligned confirmed in testing.

### Terminology
- "TA" is spelled out as "Technical Assistance" throughout (diagrams and
  prose) -- no bare acronym left anywhere on the page.
- Diagram segment labels include concrete examples where useful, e.g.
  "Farmer level (agricultural extension)."
- Both "Temporary" segments just say "Temporary" in the diagram (not
  "Temporary (technical assistance)" / "Temporary again") -- distinguished
  by position/color, not by longer label text.

### Further reading
- ISF Advisors title is a working hyperlink:
  https://isfadvisors.co/understanding-how-agri-smes-are-financed-today/

## Process notes / lessons for future pages on this site
- Cumulative-diagram approaches (repeating all prior rows every time a
  new one appears) reliably read as "broken repetition" to a real reader,
  even when technically correct -- prefer a single persistent element
  that mutates in place over multiple mounts showing overlapping content.
- Scroll-linked reveal (IntersectionObserver-driven) caused jerky,
  full-refresh-feeling behavior in practice -- click-to-toggle was a more
  robust and controllable alternative for this kind of layered content.
- When giving Claude Code a design instruction verbally/conversationally
  before writing it to markdown, ambiguity between "the visual effect of
  accumulation" and "one physical persistent element" led to a wasted
  round -- write the concrete DOM/structural expectation explicitly
  rather than describing the desired effect only.
- GitHub Pages + browser caching can make a genuinely-fixed bug look
  unfixed (stale JS paired with new HTML) -- cache-busting query strings
  (?v=2 etc.) on script/style tags were added specifically to prevent
  this from recurring silently.
- Headless-Chrome-based verification (simulated drags, pixel-span checks,
  DOM dumps) caught real issues that "read the source" verification had
  missed in earlier rounds -- worth insisting on for any future
  interactive-diagram work on this site.

## Open / not yet decided
- Whether Market Sizing should get the same drag-divider / muted-row
  treatment retroactively (previously deferred, still deferred).
- Whether Market Sizing gets its own "Further reading" section (separate,
  still-open item from earlier in this project).
