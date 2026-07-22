import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8001";

const pct = (value) => (value == null ? "N/A" : `${(value * 100).toFixed(1)}%`);
const ratio = (value) => (value == null ? "N/A" : `${value.toFixed(2)}x`);
const millions = (value) => `$${value.toLocaleString()}M`;

export default function App() {
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

  return (
    <div className="page">
      <h1>Ratio Analyzer</h1>

      <form className="form" onSubmit={fetchFromEdgar}>
        <label>
          Company
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
