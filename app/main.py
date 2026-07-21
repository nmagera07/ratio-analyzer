from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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


@app.get("/")
def root():
    return {"status": "ok"}
