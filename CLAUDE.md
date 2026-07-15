# Ag Finance Overview — Project Conventions

This is a multi-page static website presenting an agricultural finance
overview for CRS colleagues without a finance background. It will later be
shared publicly, hosted on GitHub Pages.

## Site structure
- Multi-page site with a **persistent nav** — not a single scrolling page.
  Content will grow over time; people should be able to jump directly to
  the section they need.
- Nav order (build placeholders for sections that don't have content yet):
  1. Home / Overview
  2. Market Sizing
  3. Types of Ag Finance
  4. Capital Providers
  5. CRS Programming Examples
  6. Glossary

## Build approach
- Plain HTML/CSS/JS (or an equally lightweight static setup) — no framework
  needed.
- No interactivity is required for early sections, but don't build in a way
  that blocks adding interactive charts/widgets to later sections without a
  rebuild.
- Clean, professional, readable for a non-finance audience. Clarity over
  decoration — this is not a marketing site.
- Keep this as a proper git repo, ready to push to GitHub Pages.

## Sourcing convention (applies to every content page with data)
Any page mixing report-sourced figures with illustrative/modeled figures
must **visually separate them into distinct sections** — never mix both
kinds of numbers in one table with inline tags. Use two clearly labeled
sections:
1. **"What the report tells us"** — figures taken directly from a source
   report, or simple arithmetic on its figures.
2. **"Our illustrative modeling"** — segmentation or estimates built by
   CRS/Claude to illustrate structure; always explicitly labeled as
   illustrative, never presented as if it came from the source.

Always cite the source once, clearly, near the top of any page using it.

## Audience and tone
Writing for CRS colleagues without a finance background. Prioritize plain
language over technical jargon; define finance terms in context or link to
the glossary once it exists.
