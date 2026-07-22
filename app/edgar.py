"""SEC EDGAR data fetching for the fixed company dropdown.

Resolves XBRL tag fallbacks into the field names ratio_analyzer.py's
functions already expect (revenue, net_income, shareholders_equity,
total_debt, current_assets, current_liabilities) — those functions are
never touched.
"""

import threading
import time
from datetime import date

import requests

USER_AGENT = "ratio-analyzer nmagera07@gmail.com"
_MIN_INTERVAL = 1 / 10  # SEC EDGAR: max 10 requests/second

_rate_lock = threading.Lock()
_last_request = 0.0

_CACHE_TTL = 3600  # seconds; 10-K data changes at most quarterly
_cache_lock = threading.Lock()
_cache = {}  # key -> (fetched_at, financials)


class EdgarError(Exception):
    pass


COMPANIES = {
    "apple": {"name": "Apple Inc.", "cik": "0000320193"},
    "netflix": {"name": "Netflix, Inc.", "cik": "0001065280"},
    "microsoft": {"name": "Microsoft Corporation", "cik": "0000789019"},
    "coca-cola": {"name": "The Coca-Cola Company", "cik": "0000021344"},
    "mcdonalds": {"name": "McDonald's Corporation", "cik": "0000063908"},
    "jpmorgan": {"name": "JPMorgan Chase & Co.", "cik": "0000019617"},
    "walmart": {"name": "Walmart Inc.", "cik": "0000104169"},
    "costco": {"name": "Costco Wholesale Corporation", "cik": "0000909832"},
    "visa": {"name": "Visa Inc.", "cik": "0001403161"},
    "johnson-johnson": {"name": "Johnson & Johnson", "cik": "0000200406"},
    "chevron": {"name": "Chevron Corporation", "cik": "0000093410"},
    "procter-gamble": {"name": "The Procter & Gamble Company", "cik": "0000080424"},
    "home-depot": {"name": "The Home Depot, Inc.", "cik": "0000354950"},
    "boeing": {"name": "The Boeing Company", "cik": "0000012927"},
    "starbucks": {"name": "Starbucks Corporation", "cik": "0000829224"},
    "nike": {"name": "Nike, Inc.", "cik": "0000320187"},
}

# Tried in order; first tag with a value at the anchor period wins.
REVENUE_TAGS = [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "SalesRevenueNet",
]
NET_INCOME_TAGS = ["NetIncomeLoss", "ProfitLoss"]
EQUITY_TAGS = [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
]
CURRENT_ASSETS_TAGS = ["AssetsCurrent"]
CURRENT_LIABILITIES_TAGS = ["LiabilitiesCurrent"]
ANCHOR_TAGS = ["Assets"]  # always present; its latest 10-K end date sets the period

# Interest-bearing debt only (see README) — summed from components rather
# than a single tag, since some filers also report a combined "LongTermDebt"
# tag whose meaning is inconsistent across companies (sometimes total debt,
# sometimes just the noncurrent portion), so it's deliberately not used here.
DEBT_NONCURRENT_TAGS = ["LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations"]
DEBT_CURRENT_TAGS = [
    "LongTermDebtCurrent",
    "LongTermDebtAndCapitalLeaseObligationsCurrent",
    "DebtCurrent",
]
DEBT_SHORT_TERM_TAGS = ["CommercialPaper", "ShortTermBorrowings"]

GROSS_PROFIT_TAGS = ["GrossProfit"]
# Derived as revenue - cost_of_revenue when no direct GrossProfit tag exists.
COST_OF_REVENUE_TAGS = [
    "CostOfRevenue",
    "CostOfGoodsAndServicesSold",
    "CostOfGoodsAndServicesSoldExcludingDepreciationDepletionAndAmortization",
]
OPERATING_INCOME_TAGS = ["OperatingIncomeLoss"]
# Derived as revenue - CostsAndExpenses when no direct OperatingIncomeLoss tag
# exists. Not derived from pretax income, which also nets out non-operating
# items (interest, etc.) and would misrepresent operating profitability.
OPERATING_EXPENSE_TAGS = ["CostsAndExpenses"]
INVENTORY_TAGS = ["InventoryNet", "InventoryNetOfAllowancesCustomerAdvancesAndProgressBillings"]


def _get(url):
    global _last_request
    with _rate_lock:
        wait = _MIN_INTERVAL - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        _last_request = time.monotonic()
    if resp.status_code != 200:
        raise EdgarError(f"SEC EDGAR request failed: {resp.status_code}")
    return resp.json()


def _entries(facts, tag):
    return facts.get(tag, {}).get("units", {}).get("USD", [])


def _annual_10k(entries):
    """10-K filings only; for duration facts, keep annual (not quarterly) periods."""
    out = []
    for e in entries:
        if e.get("form") != "10-K":
            continue
        if "start" in e:
            days = (date.fromisoformat(e["end"]) - date.fromisoformat(e["start"])).days
            if not (330 <= days <= 400):
                continue
        out.append(e)
    return out


def _anchor_period(facts):
    for tag in ANCHOR_TAGS:
        entries = _annual_10k(_entries(facts, tag))
        if entries:
            latest = max(entries, key=lambda e: e["end"])
            return latest["end"], latest.get("fy"), latest["val"]
    raise EdgarError("No annual 10-K data found")


def _value_at(facts, tags, end):
    for tag in tags:
        for e in _annual_10k(_entries(facts, tag)):
            if e["end"] == end:
                return e["val"]
    return None


def _debt_at(facts, end):
    """Sum interest-bearing debt components present at the anchor date."""
    slots = [DEBT_NONCURRENT_TAGS, DEBT_CURRENT_TAGS, DEBT_SHORT_TERM_TAGS]
    total = 0
    found = False
    for tags in slots:
        value = _value_at(facts, tags, end)
        if value is not None:
            total += value
            found = True
    return total if found else None


def _gross_profit_at(facts, end):
    direct = _value_at(facts, GROSS_PROFIT_TAGS, end)
    if direct is not None:
        return direct
    revenue = _value_at(facts, REVENUE_TAGS, end)
    cost = _value_at(facts, COST_OF_REVENUE_TAGS, end)
    if revenue is not None and cost is not None:
        return revenue - cost
    return None


def _operating_income_at(facts, end):
    direct = _value_at(facts, OPERATING_INCOME_TAGS, end)
    if direct is not None:
        return direct
    revenue = _value_at(facts, REVENUE_TAGS, end)
    expenses = _value_at(facts, OPERATING_EXPENSE_TAGS, end)
    if revenue is not None and expenses is not None:
        return revenue - expenses
    return None


def fetch_financials(key):
    """Fetch one dropdown company's latest 10-K financials from SEC EDGAR."""
    company = COMPANIES.get(key)
    if company is None:
        raise EdgarError(f"Unknown company: {key}")

    with _cache_lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < _CACHE_TTL:
            return cached[1]

    data = _get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{company['cik']}.json")
    facts = data.get("facts", {}).get("us-gaap", {})

    end, fy, total_assets = _anchor_period(facts)

    values = {
        "revenue": _value_at(facts, REVENUE_TAGS, end),
        "net_income": _value_at(facts, NET_INCOME_TAGS, end),
        "shareholders_equity": _value_at(facts, EQUITY_TAGS, end),
        "total_debt": _debt_at(facts, end),
        "total_assets": total_assets,
    }
    missing = [k for k, v in values.items() if v is None]
    if missing:
        raise EdgarError(f"Missing metrics for {company['name']}: {', '.join(missing)}")

    # Some filers don't report these at all: banks use an unclassified
    # balance sheet (no current assets/liabilities), and companies without
    # a cost-of-goods-sold concept (banks, payment networks, franchisors)
    # have no gross profit or operating income tag either. Left unavailable
    # for them rather than treated as an error.
    current_assets = _value_at(facts, CURRENT_ASSETS_TAGS, end)
    current_liabilities = _value_at(facts, CURRENT_LIABILITIES_TAGS, end)
    gross_profit = _gross_profit_at(facts, end)
    operating_income = _operating_income_at(facts, end)
    # Missing inventory means the filer genuinely has none (services,
    # payments, streaming) rather than that the data is unavailable.
    inventory = _value_at(facts, INVENTORY_TAGS, end) or 0

    optional_values = {
        "current_assets": current_assets,
        "current_liabilities": current_liabilities,
        "gross_profit": gross_profit,
        "operating_income": operating_income,
    }

    result = {
        "company": company["name"],
        "period": f"FY {fy}" if fy else f"FY {end[:4]}",
        **{k: v / 1_000_000 for k, v in values.items()},  # to $M, matching the rest of the app
        **{k: (v / 1_000_000 if v is not None else None) for k, v in optional_values.items()},
        "inventory": inventory / 1_000_000,
    }
    with _cache_lock:
        _cache[key] = (time.monotonic(), result)
    return result
