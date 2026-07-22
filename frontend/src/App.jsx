import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8001";

const pct = (value) => (value == null ? "N/A" : `${(value * 100).toFixed(1)}%`);
const ratio = (value) => (value == null ? "N/A" : `${value.toFixed(2)}x`);
const millions = (value) => `$${value.toLocaleString()}M`;

function toNumberOrUndefined(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}

const DEFAULT_FORM = {
  company: "Netflix, Inc.",
  period: "FY 2025",
  revenue: 45200,
  net_income: 11000,
  shareholders_equity: 26615,
  total_debt: 14463,
  current_assets: 13020,
  current_liabilities: 10981,
  total_assets: 55597,
  gross_profit: 21908,
  operating_income: 13327,
  inventory: 0,
};

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);

  const [edgarOptions, setEdgarOptions] = useState([]);
  const [edgarKey, setEdgarKey] = useState("");
  const [edgarLoading, setEdgarLoading] = useState(false);
  const [edgarError, setEdgarError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then((res) => res.json())
      .then((options) => {
        setEdgarOptions(options);
        if (options.length > 0) setEdgarKey(options[0].key);
      })
      .catch(() => setEdgarError("Could not load company list"));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function fetchFromEdgar(e) {
    e.preventDefault();
    setEdgarLoading(true);
    setEdgarError(null);

    try {
      const res = await fetch(`${API_BASE}/companies/${edgarKey}/analyze`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail || "Fetch from SEC EDGAR failed");
      }
      setCompanies((prev) => [
        ...prev.filter((c) => c.company !== body.company),
        body,
      ]);
    } catch (err) {
      setEdgarError(err.message);
    } finally {
      setEdgarLoading(false);
    }
  }

  async function analyze(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      revenue: Number(form.revenue),
      net_income: Number(form.net_income),
      shareholders_equity: Number(form.shareholders_equity),
      total_debt: Number(form.total_debt),
      current_assets: Number(form.current_assets),
      current_liabilities: Number(form.current_liabilities),
      total_assets: toNumberOrUndefined(form.total_assets),
      gross_profit: toNumberOrUndefined(form.gross_profit),
      operating_income: toNumberOrUndefined(form.operating_income),
      inventory: toNumberOrUndefined(form.inventory),
    };

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail || "Analysis failed");
      }
      setCompanies((prev) => [
        ...prev.filter((c) => c.company !== payload.company),
        { ...payload, ...body },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const numberFields = [
    ["revenue", "Revenue ($M)", true],
    ["net_income", "Net income ($M)", true],
    ["shareholders_equity", "Shareholders equity ($M)", true],
    ["total_debt", "Total debt ($M)", true],
    ["current_assets", "Current assets ($M)", true],
    ["current_liabilities", "Current liabilities ($M)", true],
    ["total_assets", "Total assets ($M)", false],
    ["gross_profit", "Gross profit ($M)", false],
    ["operating_income", "Operating income ($M)", false],
    ["inventory", "Inventory ($M)", false],
  ];

  return (
    <div className="page">
      <h1>Ratio Analyzer</h1>

      <form className="form" onSubmit={fetchFromEdgar}>
        <label>
          Load from SEC EDGAR
          <select
            value={edgarKey}
            onChange={(e) => setEdgarKey(e.target.value)}
          >
            {edgarOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={edgarLoading || !edgarKey}>
          {edgarLoading ? "Fetching…" : "Fetch latest 10-K"}
        </button>
      </form>
      {edgarError && <p className="error">{edgarError}</p>}

      <form className="form" onSubmit={analyze}>
        <label>
          Company
          <input
            value={form.company}
            onChange={(e) => updateField("company", e.target.value)}
            required
          />
        </label>
        <label>
          Period
          <input
            value={form.period}
            onChange={(e) => updateField("period", e.target.value)}
          />
        </label>
        {numberFields.map(([field, label, required]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              value={form[field]}
              onChange={(e) => updateField(field, e.target.value)}
              required={required}
            />
          </label>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {companies.length > 0 && (
        <div className="results">
          <div className="stats">
            {(() => {
              const latest = companies[companies.length - 1];
              const negativeEquity = latest.shareholders_equity < 0;
              return (
                <>
                  <div className="stat">
                    <span className="label">Net Profit Margin</span>
                    <span className="value">{pct(latest.net_profit_margin)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Return on Equity</span>
                    <span className="value">
                      {pct(latest.return_on_equity)}
                      {negativeEquity && "*"}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Debt-to-Equity</span>
                    <span className="value">
                      {ratio(latest.debt_to_equity)}
                      {negativeEquity && "*"}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Current Ratio</span>
                    <span className="value">{ratio(latest.current_ratio)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Gross Margin</span>
                    <span className="value">{pct(latest.gross_margin)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Operating Margin</span>
                    <span className="value">{pct(latest.operating_margin)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Quick Ratio</span>
                    <span className="value">{ratio(latest.quick_ratio)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Asset Turnover</span>
                    <span className="value">{ratio(latest.asset_turnover)}</span>
                  </div>
                </>
              );
            })()}
          </div>

          {companies.some((c) => c.shareholders_equity < 0) && (
            <p className="note">
              * negative shareholders' equity — return on equity and
              debt-to-equity aren't economically meaningful here.
            </p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {companies.map((c) => (
                    <th key={c.company}>
                      {c.company}
                      <div className="period">{c.period}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Revenue</td>
                  {companies.map((c) => (
                    <td key={c.company}>{millions(c.revenue)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Net income</td>
                  {companies.map((c) => (
                    <td key={c.company}>{millions(c.net_income)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Shareholders equity</td>
                  {companies.map((c) => (
                    <td key={c.company}>{millions(c.shareholders_equity)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Net profit margin</td>
                  {companies.map((c) => (
                    <td key={c.company}>{pct(c.net_profit_margin)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Return on equity</td>
                  {companies.map((c) => (
                    <td key={c.company}>
                      {pct(c.return_on_equity)}
                      {c.shareholders_equity < 0 && "*"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Debt-to-equity</td>
                  {companies.map((c) => (
                    <td key={c.company}>
                      {ratio(c.debt_to_equity)}
                      {c.shareholders_equity < 0 && "*"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Current ratio</td>
                  {companies.map((c) => (
                    <td key={c.company}>{ratio(c.current_ratio)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Gross margin</td>
                  {companies.map((c) => (
                    <td key={c.company}>{pct(c.gross_margin)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Operating margin</td>
                  {companies.map((c) => (
                    <td key={c.company}>{pct(c.operating_margin)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Quick ratio</td>
                  {companies.map((c) => (
                    <td key={c.company}>{ratio(c.quick_ratio)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Asset turnover</td>
                  {companies.map((c) => (
                    <td key={c.company}>{ratio(c.asset_turnover)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
