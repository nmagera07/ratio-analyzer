"""Financial ratio analyzer.

Takes a dictionary of company financials (all dollar amounts in $ millions)
and prints a small ratio report. No dependencies beyond the standard library.
"""

# --- Ratio functions ------------------------------------------------------
# Debt-to-equity uses interest-bearing debt only, not total liabilities —
# non-debt obligations (deferred revenue, content liabilities) aren't leverage.


def net_profit_margin(f):
    """Net income / revenue — how much of each sales dollar becomes profit."""
    return f["net_income"] / f["revenue"]


def return_on_equity(f):
    """Net income / shareholders' equity — return generated on owners' capital."""
    return f["net_income"] / f["shareholders_equity"]


def debt_to_equity(f):
    """Total debt (interest-bearing only) / shareholders' equity — leverage."""
    return f["total_debt"] / f["shareholders_equity"]


def current_ratio(f):
    """Current assets / current liabilities — short-term liquidity."""
    return f["current_assets"] / f["current_liabilities"]


def gross_margin(f):
    """Gross profit / revenue — what's left after direct costs of the product or service."""
    return f["gross_profit"] / f["revenue"]


def operating_margin(f):
    """Operating income / revenue — profitability from core operations, before interest and taxes."""
    return f["operating_income"] / f["revenue"]


def quick_ratio(f):
    """(Current assets - inventory) / current liabilities — liquidity excluding inventory, which isn't always quickly convertible to cash."""
    return (f["current_assets"] - f["inventory"]) / f["current_liabilities"]


def asset_turnover(f):
    """Revenue / total assets — how efficiently assets are used to generate sales."""
    return f["revenue"] / f["total_assets"]


# --- Report ---------------------------------------------------------------


def print_report(f):
    width = 46
    print("=" * width)
    print(f"{f['company']}  —  {f['period']}")
    print("=" * width)
    print(f"{'Revenue':<28}${f['revenue']:>12,.0f}M")
    print(f"{'Net income':<28}${f['net_income']:>12,.0f}M")
    print(f"{'Shareholders equity':<28}${f['shareholders_equity']:>12,.0f}M")
    print("-" * width)
    print(f"{'Net profit margin':<28}{net_profit_margin(f):>13.1%}")
    print(f"{'Return on equity (ROE)':<28}{return_on_equity(f):>13.1%}")
    print(f"{'Debt-to-equity':<28}{debt_to_equity(f):>12.2f}x")
    print(f"{'Current ratio':<28}{current_ratio(f):>12.2f}x")
    print(f"{'Gross margin':<28}{gross_margin(f):>13.1%}")
    print(f"{'Operating margin':<28}{operating_margin(f):>13.1%}")
    print(f"{'Quick ratio':<28}{quick_ratio(f):>12.2f}x")
    print(f"{'Asset turnover':<28}{asset_turnover(f):>12.2f}x")
    print("=" * width)


# --- Example: Netflix FY2025 (from the 10-K / Q4'25 earnings release) -----
# Balance sheet lines are as reported at Dec 31, 2025; revenue and net
# income are rounded to the nearest $100M / $1B as widely reported.

NETFLIX_2025 = {
    "company": "Netflix, Inc.",
    "period": "FY 2025",
    "revenue": 45_200,              # $45.2B
    "net_income": 11_000,           # $11.0B
    "shareholders_equity": 26_615,  # $26.6B
    "total_debt": 14_463,           # $14.5B short- + long-term debt
    "current_assets": 13_020,       # $13.0B
    "current_liabilities": 10_981,  # $11.0B
    "gross_profit": 21_908,         # $21.9B (revenue - cost of revenue; no direct tag)
    "operating_income": 13_327,     # $13.3B
    "inventory": 0,                 # streaming service — no inventory
    "total_assets": 55_597,         # $55.6B
}


# --- Example: Apple FY2025 (10-K, fiscal year ended Sep 27, 2025) ---------
# Total debt = commercial paper 7,979 + current term debt 12,350 +
# non-current term debt 78,328.

APPLE_2025 = {
    "company": "Apple Inc.",
    "period": "FY 2025 (ended Sep 27, 2025)",
    "revenue": 416_161,             # $416.2B
    "net_income": 112_010,          # $112.0B
    "shareholders_equity": 73_733,  # $73.7B
    "total_debt": 98_657,           # $98.7B
    "current_assets": 147_957,      # $148.0B
    "current_liabilities": 165_631, # $165.6B
    "gross_profit": 195_201,        # $195.2B
    "operating_income": 133_050,    # $133.1B
    "inventory": 5_718,             # $5.7B
    "total_assets": 359_241,        # $359.2B
}


def print_comparison(companies):
    name_w, col_w = 26, 16
    rows = [
        ("Revenue ($M)", lambda f: f"{f['revenue']:,.0f}"),
        ("Net income ($M)", lambda f: f"{f['net_income']:,.0f}"),
        ("Shareholders equity ($M)", lambda f: f"{f['shareholders_equity']:,.0f}"),
        ("Net profit margin", lambda f: f"{net_profit_margin(f):.1%}"),
        ("Return on equity (ROE)", lambda f: f"{return_on_equity(f):.1%}"),
        ("Debt-to-equity", lambda f: f"{debt_to_equity(f):.2f}x"),
        ("Current ratio", lambda f: f"{current_ratio(f):.2f}x"),
        ("Gross margin", lambda f: f"{gross_margin(f):.1%}"),
        ("Operating margin", lambda f: f"{operating_margin(f):.1%}"),
        ("Quick ratio", lambda f: f"{quick_ratio(f):.2f}x"),
        ("Asset turnover", lambda f: f"{asset_turnover(f):.2f}x"),
    ]
    width = name_w + col_w * len(companies)
    print("=" * width)
    header = f"{'':<{name_w}}" + "".join(
        f"{f['company']:>{col_w}}" for f in companies
    )
    print(header)
    print("-" * width)
    for label, fmt in rows:
        print(f"{label:<{name_w}}" + "".join(f"{fmt(f):>{col_w}}" for f in companies))
    print("=" * width)


if __name__ == "__main__":
    for financials in (NETFLIX_2025, APPLE_2025):
        print_report(financials)
        print()
    print_comparison([NETFLIX_2025, APPLE_2025])
