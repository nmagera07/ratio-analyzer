# Ratio Analyzer

A small financial ratio analyzer: pick a company from a fixed dropdown, pull its latest 10-K from SEC EDGAR, and see net profit margin, return on equity, debt-to-equity, current ratio, gross margin, operating margin, quick ratio, and asset turnover — plus a side-by-side comparison table as you add more companies.

**Live:** https://ratio-web-211392956944.us-central1.run.app

## Ratio definitions

- **Net profit margin** = net income / revenue
- **Return on equity (ROE)** = net income / shareholders' equity
- **Debt-to-equity** = total debt (interest-bearing only) / shareholders' equity — deliberately *not* total liabilities, since non-debt obligations (deferred revenue, content licensing liabilities, etc.) aren't leverage
- **Current ratio** = current assets / current liabilities
- **Gross margin** = gross profit / revenue
- **Operating margin** = operating income / revenue
- **Quick ratio** = (current assets - inventory) / current liabilities
- **Asset turnover** = revenue / total assets

Gross margin, operating margin, quick ratio, and current ratio aren't meaningful for every company. Banks and payment networks (no cost-of-goods-sold concept, unclassified balance sheet), for example, show these as unavailable rather than a misleading number.

## Stack

- **Backend** — Python / FastAPI (`app/`), wrapping the plain functions in `ratio_analyzer.py`
- **Frontend** — React + Vite (`frontend/`), served by nginx in production
- **Hosting** — Google Cloud Run (both services, deployed from source, no database)

## Standalone script

`ratio_analyzer.py` also runs on its own with no dependencies — it prints a report and comparison table for the two companies defined at the bottom of the file (Netflix and Apple, FY2025):

```
python ratio_analyzer.py
```

## Local development

Backend (port 8001):

```
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8001
```

Frontend (port 5175, expects backend on 8001):

```
cd frontend
npm install
npm run dev -- --port 5175
```

## API

- `GET /companies` — the fixed dropdown of companies with live SEC EDGAR data
- `GET /companies/{key}/analyze` — pulls that company's latest 10-K from SEC EDGAR and returns its financials + ratios. Some ratios are `null` for filers they don't apply to (e.g. `current_ratio` for banks, which use an unclassified balance sheet).
- `GET /companies/{key}/history` — same shape, as a list of up to 5 most recent fiscal years, newest first

## Deploying

```
gcloud run deploy ratio-api --source . --region us-central1 --allow-unauthenticated --project=ratio-analyzer-app
gcloud run deploy ratio-web --source frontend --region us-central1 --allow-unauthenticated --project=ratio-analyzer-app
```

`frontend/nginx.conf` hardcodes the backend's Cloud Run URL for the `/api/` proxy — update it if the backend is redeployed to a new URL.
