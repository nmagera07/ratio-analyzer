# Ratio Analyzer — Roadmap

A staged plan, not a to-do list to rush through. Each stage should feel solid and boring before starting the next one. This file exists partly to keep momentum from quietly turning into scope creep — if something's not listed here, it's not happening yet, on purpose.

## Current state (baseline)

- Fixed dropdown of 16 companies spanning tech, media, retail, banking, healthcare, energy, industrials, and apparel
- Real data pulled live from SEC EDGAR (`companyfacts` API), tag-fallback logic for revenue/net income/assets/liabilities/equity/gross profit/operating income/inventory
- 8 ratios: net profit margin, ROE, debt-to-equity (interest-bearing debt only, not total liabilities), current ratio, gross margin, operating margin, quick ratio, asset turnover. Several are nullable and show "N/A" for companies where they don't apply (e.g. banks, franchisors)
- In-memory cache (1hr TTL) on the FastAPI backend — no database
- React/Vite frontend, FastAPI backend, deployed on Google Cloud Run (scale-to-zero, no persistent server)

## Stage A — Depth on what exists (complete)

Natural next step. Low risk, extends what's already working.

- [x] Expand dropdown from 5 companies to 15-20, spanning different industries (a bank's balance sheet looks nothing like Netflix's — good for seeing how ratios behave differently by sector) — 16 companies now: added JPMorgan Chase, Walmart, Costco, Visa, Johnson & Johnson, Chevron, Procter & Gamble, Home Depot, Boeing, Starbucks, Nike. JPMorgan (a bank) has no current assets/liabilities at all, so `current_ratio` is now nullable and shows "N/A" instead of erroring.
- [x] Add more ratios: gross margin, operating margin, quick ratio, asset turnover — same pattern as the existing four. Like current ratio, gross/operating margin and quick ratio are nullable and show "N/A" for companies without a cost-of-goods-sold concept (banks, Visa, McDonald's/Starbucks as franchisors). Verified against real EDGAR data for all 16 companies, including Boeing's quick ratio (0.40x) diverging sharply from its current ratio (1.19x) due to ~$85B of aircraft-program inventory.
- [x] Multi-year view per company (SEC's API already returns years of history — currently only the most recent 10-K is used) — new `GET /companies/{key}/history` returns up to 5 most recent fiscal years; frontend has a "View 5-year history" button showing a per-company table (separate from the cross-company comparison table). Deduping periods required a fix: SEC's `fy` field reflects the *filing's* year, not necessarily the period's — a prior year shown as a comparative in a later 10-K inherits that later filing's fy label, so periods are now deduped to the *earliest* filing (the period's original 10-K) rather than the latest. Sets up Stage B's trend-chart item — the data's there now, just not charted yet.

## Stage B — Comparison & context

Where a ratio starts becoming a judgment, not just a number.

- [ ] Side-by-side comparison view in the actual UI (not just printed like the Netflix/Apple comparison we did by hand)
- [ ] Industry averages/benchmarks — "this company's margin vs. typical for its sector"
- [ ] Historical trend charts per ratio (is ROE improving or declining over 5 years?)

## Stage C — The "why" layer

Most valuable, most advanced. Someday-tier, not urgent.

- [ ] Auto-flag unusual ratios and explain likely causes (e.g. "ROE over 100% often indicates heavy buybacks or high leverage — check debt-to-equity") — essentially automating the Apple-buyback insight from manual analysis
- [ ] Bank-specific ratios: detect when a company is a bank (unclassified balance sheet — no current assets/liabilities, per the JPMorgan case in Stage A) and switch to metrics analysts actually use for banks — capital adequacy ratio, loan-to-deposit ratio — instead of just showing "N/A" for current ratio

## Explicitly NOT planned yet

Naming what's excluded is doing real work here — it's the thing that keeps this app from turning back into a full infrastructure project before the finance/analysis side is solid.

- Freeform company search (staying with the fixed dropdown for now)
- A database (in-memory cache is sufficient for current traffic/data volume)
- Any deployment/infrastructure changes beyond what already exists
