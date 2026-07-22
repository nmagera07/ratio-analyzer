import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8001";

const pct = (value) => (value == null ? "N/A" : `${(value * 100).toFixed(1)}%`);
const ratio = (value) => (value == null ? "N/A" : `${value.toFixed(2)}x`);
const millions = (value) => `$${value.toLocaleString()}M`;

const ROWS = [
  { label: "Revenue", value: (c) => millions(c.revenue) },
  { label: "Net income", value: (c) => millions(c.net_income) },
  { label: "Shareholders equity", value: (c) => millions(c.shareholders_equity) },
  { label: "Net profit margin", value: (c) => pct(c.net_profit_margin) },
  { label: "Return on equity", value: (c) => pct(c.return_on_equity), flagNegative: true },
  { label: "Debt-to-equity", value: (c) => ratio(c.debt_to_equity), flagNegative: true },
  { label: "Current ratio", value: (c) => ratio(c.current_ratio) },
  { label: "Gross margin", value: (c) => pct(c.gross_margin) },
  { label: "Operating margin", value: (c) => pct(c.operating_margin) },
  { label: "Quick ratio", value: (c) => ratio(c.quick_ratio) },
  { label: "Asset turnover", value: (c) => ratio(c.asset_turnover) },
];

function RatioTable({ items, keyFn, headingFn, subheadingFn }) {
  const anyNegativeEquity = items.some((c) => c.shareholders_equity < 0);
  return (
    <>
      {anyNegativeEquity && (
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
              {items.map((c) => (
                <th key={keyFn(c)}>
                  {headingFn(c)}
                  {subheadingFn && <div className="period">{subheadingFn(c)}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {items.map((c) => (
                  <td key={keyFn(c)}>
                    {row.value(c)}
                    {row.flagNegative && c.shareholders_equity < 0 && "*"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function App() {
  const [companies, setCompanies] = useState([]);

  const [edgarOptions, setEdgarOptions] = useState([]);
  const [edgarKey, setEdgarKey] = useState("");
  const [edgarLoading, setEdgarLoading] = useState(false);
  const [edgarError, setEdgarError] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

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

  async function fetchHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    setHistory(null);

    try {
      const res = await fetch(`${API_BASE}/companies/${edgarKey}/history`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail || "Fetch history from SEC EDGAR failed");
      }
      setHistory(body);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  const latest = companies[companies.length - 1];

  return (
    <div className="page">
      <h1>Ratio Analyzer</h1>

      <form className="form" onSubmit={fetchFromEdgar}>
        <label>
          Company
          <select
            value={edgarKey}
            onChange={(e) => {
              setEdgarKey(e.target.value);
              setHistory(null);
            }}
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
        <button
          type="button"
          disabled={historyLoading || !edgarKey}
          onClick={fetchHistory}
        >
          {historyLoading ? "Fetching…" : "View 5-year history"}
        </button>
      </form>
      {edgarError && <p className="error">{edgarError}</p>}

      {companies.length > 0 && (
        <div className="results">
          <div className="stats">
            <div className="stat">
              <span className="label">Net Profit Margin</span>
              <span className="value">{pct(latest.net_profit_margin)}</span>
            </div>
            <div className="stat">
              <span className="label">Return on Equity</span>
              <span className="value">
                {pct(latest.return_on_equity)}
                {latest.shareholders_equity < 0 && "*"}
              </span>
            </div>
            <div className="stat">
              <span className="label">Debt-to-Equity</span>
              <span className="value">
                {ratio(latest.debt_to_equity)}
                {latest.shareholders_equity < 0 && "*"}
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
          </div>

          <RatioTable
            items={companies}
            keyFn={(c) => c.company}
            headingFn={(c) => c.company}
            subheadingFn={(c) => c.period}
          />
        </div>
      )}

      {historyError && <p className="error">{historyError}</p>}

      {history && history.length > 0 && (
        <div className="results">
          <h2>{history[0].company} — {history.length}-year history</h2>
          <RatioTable
            items={history}
            keyFn={(h) => h.period}
            headingFn={(h) => h.period}
          />
        </div>
      )}
    </div>
  );
}
