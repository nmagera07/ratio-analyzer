import { useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8001";

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const ratio = (value) => `${value.toFixed(2)}x`;
const millions = (value) => `$${value.toLocaleString()}M`;

const DEFAULT_FORM = {
  company: "Netflix, Inc.",
  period: "FY 2025",
  revenue: 45200,
  net_income: 11000,
  shareholders_equity: 26615,
  total_debt: 14463,
  current_assets: 13020,
  current_liabilities: 10981,
};

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    ["revenue", "Revenue ($M)"],
    ["net_income", "Net income ($M)"],
    ["shareholders_equity", "Shareholders equity ($M)"],
    ["total_debt", "Total debt ($M)"],
    ["current_assets", "Current assets ($M)"],
    ["current_liabilities", "Current liabilities ($M)"],
  ];

  return (
    <div className="page">
      <h1>Ratio Analyzer</h1>

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
        {numberFields.map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              value={form[field]}
              onChange={(e) => updateField(field, e.target.value)}
              required
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
              return (
                <>
                  <div className="stat">
                    <span className="label">Net Profit Margin</span>
                    <span className="value">{pct(latest.net_profit_margin)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Return on Equity</span>
                    <span className="value">{pct(latest.return_on_equity)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Debt-to-Equity</span>
                    <span className="value">{ratio(latest.debt_to_equity)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Current Ratio</span>
                    <span className="value">{ratio(latest.current_ratio)}</span>
                  </div>
                </>
              );
            })()}
          </div>

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
                    <td key={c.company}>{pct(c.return_on_equity)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Debt-to-equity</td>
                  {companies.map((c) => (
                    <td key={c.company}>{ratio(c.debt_to_equity)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Current ratio</td>
                  {companies.map((c) => (
                    <td key={c.company}>{ratio(c.current_ratio)}</td>
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
