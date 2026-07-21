from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.edgar import COMPANIES, EdgarError, fetch_financials
from ratio_analyzer import (
    current_ratio,
    debt_to_equity,
    net_profit_margin,
    return_on_equity,
)

app = FastAPI(title="Ratio Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Financials(BaseModel):
    company: str
    period: str = ""
    revenue: float = Field(gt=0, description="$M")
    net_income: float
    shareholders_equity: float
    total_debt: float = Field(ge=0)
    current_assets: float = Field(ge=0)
    current_liabilities: float = Field(gt=0)


class Ratios(BaseModel):
    company: str
    period: str
    net_profit_margin: float
    return_on_equity: float
    debt_to_equity: float
    current_ratio: float


class CompanyReport(Ratios):
    revenue: float
    net_income: float
    shareholders_equity: float
    # Filers with an unclassified balance sheet (e.g. banks) don't report
    # current assets/liabilities, so this can be unavailable.
    current_ratio: Optional[float] = None


@app.post("/analyze", response_model=Ratios)
def analyze(financials: Financials):
    if financials.shareholders_equity == 0:
        raise HTTPException(
            status_code=400, detail="Shareholders' equity cannot be zero"
        )
    f = financials.model_dump()
    return Ratios(
        company=financials.company,
        period=financials.period,
        net_profit_margin=net_profit_margin(f),
        return_on_equity=return_on_equity(f),
        debt_to_equity=debt_to_equity(f),
        current_ratio=current_ratio(f),
    )


@app.get("/companies")
def list_companies():
    return [{"key": key, "name": info["name"]} for key, info in COMPANIES.items()]


@app.get("/companies/{key}/analyze", response_model=CompanyReport)
def analyze_company(key: str):
    if key not in COMPANIES:
        raise HTTPException(status_code=404, detail="Unknown company")
    try:
        f = fetch_financials(key)
    except EdgarError as e:
        raise HTTPException(status_code=502, detail=str(e))
    if f["shareholders_equity"] == 0:
        raise HTTPException(
            status_code=502, detail="Shareholders' equity cannot be zero"
        )
    has_current = f["current_assets"] is not None and f["current_liabilities"] is not None
    return CompanyReport(
        company=f["company"],
        period=f["period"],
        net_profit_margin=net_profit_margin(f),
        return_on_equity=return_on_equity(f),
        debt_to_equity=debt_to_equity(f),
        current_ratio=current_ratio(f) if has_current else None,
        revenue=f["revenue"],
        net_income=f["net_income"],
        shareholders_equity=f["shareholders_equity"],
    )


@app.get("/")
def root():
    return {"status": "ok"}
