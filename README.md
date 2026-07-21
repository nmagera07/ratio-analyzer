# Ratio Analyzer

A small financial ratio analyzer: enter a company's key financials and see net profit margin, return on equity, debt-to-equity, and current ratio — plus a side-by-side comparison table as you add more companies.

**Live:** https://ratio-web-211392956944.us-central1.run.app

## Ratio definitions

- **Net profit margin** = net income / revenue
- **Return on equity (ROE)** = net income / shareholders' equity
- **Debt-to-equity** = total debt (interest-bearing only) / shareholders' equity — deliberately *not* total liabilities, since non-debt obligations (deferred revenue, content licensing liabilities, etc.) aren't leverage
- **Current ratio** = current assets / current liabilities

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

- `POST /analyze` — takes a company's financials, returns the four ratios

## Deploying

```
gcloud run deploy ratio-api --source . --region us-central1 --allow-unauthenticated --project=ratio-analyzer-app
gcloud run deploy ratio-web --source frontend --region us-central1 --allow-unauthenticated --project=ratio-analyzer-app
```

`frontend/nginx.conf` hardcodes the backend's Cloud Run URL for the `/api/` proxy — update it if the backend is redeployed to a new URL.
