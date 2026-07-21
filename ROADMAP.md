# Ratio Analyzer — Roadmap

A staged plan, not a to-do list to rush through. Each stage should feel solid and boring before starting the next one. This file exists partly to keep momentum from quietly turning into scope creep — if something's not listed here, it's not happening yet, on purpose.

## Current state (baseline)

- Fixed dropdown of 5 companies (Netflix, Apple, + 3 others)
- Real data pulled live from SEC EDGAR (`companyfacts` API), tag-fallback logic for revenue/net income/assets/liabilities/equity
- 4 ratios: net profit margin, ROE, debt-to-equity (interest-bearing debt only, not total liabilities), current ratio
- In-memory cache (1hr TTL) on the FastAPI backend — no database
- React/Vite frontend, FastAPI backend, deployed on Google Cloud Run (scale-to-zero, no persistent server)

## Stage A — Depth on what exists

Natural next step. Low risk, extends what's already working.

- [ ] Expand dropdown from 5 companies to 15-20, spanning different industries (a bank's balance sheet looks nothing like Netflix's — good for seeing how ratios behave differently by sector)
- [ ] Add more ratios: gross margin, operating margin, quick ratio, asset turnover — same pattern as the existing four
- [ ] Multi-year view per company (SEC's API already returns years of history — currently only the most recent 10-K is used)

## Stage B — Comparison & context

Where a ratio starts becoming a judgment, not just a number.

- [ ] Side-by-side comparison view in the actual UI (not just printed like the Netflix/Apple comparison we did by hand)
- [ ] Industry averages/benchmarks — "this company's margin vs. typical for its sector"
- [ ] Historical trend charts per ratio (is ROE improving or declining over 5 years?)

## Stage C — The "why" layer

Most valuable, most advanced. Someday-tier, not urgent.

- [ ] Auto-flag unusual ratios and explain likely causes (e.g. "ROE over 100% often indicates heavy buybacks or high leverage — check debt-to-equity") — essentially automating the Apple-buyback insight from manual analysis

## Explicitly NOT planned yet

Naming what's excluded is doing real work here — it's the thing that keeps this app from turning back into a full infrastructure project before the finance/analysis side is solid.

- Freeform company search (staying with the fixed dropdown for now)
- A database (in-memory cache is sufficient for current traffic/data volume)
- Any deployment/infrastructure changes beyond what already exists
