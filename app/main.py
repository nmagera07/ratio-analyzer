from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.edgar import COMPANIES, EdgarError, fetch_financials
from ratio_analyzer import (
    asset_turnover,
    current_ratio,
    debt_to_equity,
    gross_margin,
    net_profit_margin,
    operating_margin,
    quick_ratio,
    return_on_equity,
)

app = FastAPI(title="Ratio Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompanyReport(BaseModel):
    company: str
    period: str
    revenue: float
    net_income: float
    shareholders_equity: float
    net_profit_margin: float
    return_on_equity: float
    debt_to_equity: float
    # Not every company has these: filers with an unclassified balance
    # sheet (banks) don't report current assets/liabilities, and filers
    # without a cost-of-goods-sold concept (banks, payment networks,
    # franchisors) don't report gross profit or operating income.
    current_ratio: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    quick_ratio: Optional[float] = None
    asset_turnover: Optional[float] = None


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
        gross_margin=gross_margin(f) if f["gross_profit"] is not None else None,
        operating_margin=operating_margin(f) if f["operating_income"] is not None else None,
        quick_ratio=quick_ratio(f) if has_current else None,
        asset_turnover=asset_turnover(f),
        revenue=f["revenue"],
        net_income=f["net_income"],
        shareholders_equity=f["shareholders_equity"],
    )


@app.get("/")
def root():
    return {"status": "ok"}
