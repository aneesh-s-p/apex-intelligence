# APEX Intelligence v3.0
### Quantitative Market Research Platform

---

## What's New in v3.0

### 🚫 Zero Synthetic Data Policy
The most critical change in v3.0: **no fake, placeholder, or fabricated metrics anywhere in the system**.

| Before (v2.1) | After (v3.0) |
|---|---|
| `_placeholder_macro()` returned hardcoded values | Returns empty list; UI shows "FRED_API_KEY not configured" |
| `_fallback_quant()` generated seeded-random indicators | Returns `{"error": "..."}` with reason shown in UI |
| Backtest fallback returned `+34.2%` / `1.82` Sharpe | Returns `{"error": "..."}` — no backtest if data insufficient |
| Portfolio risk fallback returned `"1.87"` Sharpe | Returns real metrics or `{"error": "Insufficient data quality"}` |
| `backtest()` in frontend generated fake equity curves | Frontend shows "Data unavailable" when backend returns error |

Every metric is now: **computed from real data → validated → displayed or replaced with "Data unavailable"**.

---

### 🔬 Data Integrity Validation

Before any model runs, `validate_ohlcv()` checks:
- **Minimum length**: ≥60 trading days required
- **Staleness**: Last data point must be within 7 calendar days
- **Missing value ratio**: >5% missing → rejected
- **Spike detection**: >50% single-day moves are logged (warning only, not rejection for crypto)

If validation fails: returns `"Insufficient data quality for analysis"`.

---

### 📊 New API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/scan` | Multi-asset universe scanner (13 assets, real-time) |
| POST | `/optimize` | Portfolio optimization — MPT mean-variance |
| GET | `/research/{ticker}` | Reproducible academic research report |

---

### 🏦 Portfolio Optimization (MPT)

- Monte Carlo simulation: 5,000 random long-only portfolios (seed 42)
- Produces: **Max Sharpe Ratio** and **Min Volatility** portfolios
- Returns: allocation weights, expected return, volatility, Sharpe ratio
- Efficient frontier visualization
- All from real 252-day price history

---

### 🔭 Universe Scanner

Real-time quant scoring for 13 assets:
- **US Tech**: NVDA, AAPL, MSFT, GOOG, META, AMD, TSLA, AVGO
- **India**: RELIANCE.NS, TCS.NS, INFY.NS
- **Crypto**: BTC-USD, ETH-USD

Each asset gets: Quant Score (0-100), Signal (BUY/HOLD/SELL), RSI, Momentum (1m/3m), Trend, Realized Volatility.

---

### 📈 Backtesting with Out-of-Sample Test (v3 Engine)

| Feature | v2.1 | v3.0 |
|---|---|---|
| Fake fallback on error | ✓ (returned fake metrics) | ✗ (returns error) |
| Transaction costs | ✓ | ✓ (0.10% + 0.05% slippage) |
| Benchmark comparisons | ✗ | ✓ (Buy&Hold, MACD, Random) |
| Out-of-sample test | ✗ | ✓ (single 80/20 hold-out of a fixed rule) |
| Lookahead bias | Not checked | Signals use only past data; random baseline seeded (42) |
| Sortino + Calmar ratios | ✗ | ✓ |

---

### 🔬 Research Module

`GET /research/{ticker}` produces:

1. **Dataset description**: price series stats, skewness, kurtosis, autocorrelation
2. **Feature engineering pipeline**: all 7 indicator types listed
3. **Experiment table**: 5 strategies compared (RSI, MACD, EMA, Buy&Hold, Random)
4. **Methodology report**: bias controls, transaction costs, reproducibility notes

A reproducible summary of the experiments run on the data.

---

### 📡 Sentiment Improvements

Upgraded from simple word matching to **weighted keyword scoring** (Loughran-McDonald financial vocabulary):
- Phrases weighted by financial significance (e.g. "beats estimates" = 3x weight)
- Returns `compound_score` in [-1, +1] alongside `pos/neu/neg` label
- Used in composite score computation (30% weight)

---

### 🎨 Frontend: 5 Tabs

1. **Analysis** — Claude-written market analysis from real quant signals + out-of-sample backtest
2. **Scanner** — Live universe ranking with real quant scores
3. **Portfolio** — MPT optimization + live risk metrics
4. **Research** — Academic experiment tables from real data
5. **Architecture** — System design documentation

All panels now show **live data from backend only**. Static hardcoded values removed.

---

## Project Structure

```
apex-intelligence/
├── backend/
│   ├── main.py              # FastAPI app (v3.0)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React app (v3.0)
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global resets
│   ├── public/apex-icon.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   ├── vercel.json          # Vercel deployment
│   └── netlify.toml         # Netlify deployment
│
├── render.yaml              # Render deployment (backend)
├── .gitignore
└── README.md
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 20+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY (required), FRED_API_KEY (optional), NEWS_API_KEY (optional)

uvicorn main:app --reload --port 8000
```

**Important**: Without `FRED_API_KEY`, macro data shows "FRED_API_KEY not configured" — this is correct, not a bug. Without `NEWS_API_KEY`, news shows "News unavailable" — also correct. The platform never generates fake data.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`  
Backend docs: `http://localhost:8000/docs`

---

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key — required for /analyze |
| `ANTHROPIC_MODEL` | Optional | Claude model for /analyze (default `claude-sonnet-5-5`) |
| `FRED_API_KEY` | Recommended | FRED macro data. Get free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `NEWS_API_KEY` | Recommended | Financial news. Get free at [newsapi.org](https://newsapi.org/register) |
| `ALLOWED_ORIGINS` | Production | Comma-separated CORS origins |
| `PORT` | Auto | Set by hosting platforms |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes | FastAPI backend URL |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Health check + API key status |
| GET | `/market-data` | Live prices, macro (FRED), news, regime |
| GET | `/quant/{market_id}` | Technical indicators for a market |
| GET | `/portfolio-risk` | Portfolio risk metrics (VaR, Sharpe, etc.) |
| POST | `/analyze` | AI market analysis (one Claude call, five analyst roles in the prompt) |
| POST | `/backtest` | RSI strategy backtest with 80/20 out-of-sample test |
| POST | `/scan` | Universe scanner (13 assets) |
| POST | `/optimize` | MPT portfolio optimization |
| GET | `/research/{ticker}` | Academic research report |

---

## Architecture

```
Browser (React/Vite)
    │
    │  HTTPS — no API keys in frontend
    ▼
FastAPI Backend v3.0
    ├── L1  Data Layer         yfinance + FRED + NewsAPI
    ├── L2  Validation         staleness / gaps / spikes / min-length
    ├── L3  Quant Model        RSI, MACD, BBands, ATR, momentum, RV
    │                          → weighted composite signal (0-100)
    ├── L4  Regime Detector    VIX + yield curve + momentum
    ├── L5  Agent Prompt       five analyst roles + composite anchor
    │                          → Claude (model set by ANTHROPIC_MODEL)
    ├── L6  Risk Module        VaR, CVaR, Sharpe, Sortino, Calmar
    ├── L7  Backtester         RSI vs buy-and-hold vs MACD, 80/20 hold-out, frictions
    ├── L8  Research Module    academic report, bias controls
    └── L9  Portfolio Optimizer MPT Monte Carlo, efficient frontier
```

---

## Data Integrity Policy

This platform enforces strict data integrity:

1. **No synthetic metrics**: If data cannot be computed, `"Data unavailable"` is returned
2. **Validation before computation**: All data passes integrity checks first
3. **No lookahead**: signals are computed from past prices only
4. **Transaction frictions**: All backtests include 0.10% cost + 0.05% slippage
5. **Reproducibility**: Random baseline uses seed=42; research reports timestamped
6. **Source transparency**: All data sourced from Yahoo Finance, FRED API, NewsAPI

---

## Deployment
- **Backend (Render):** `render.yaml` at the repository root deploys the `backend` folder. Set the environment variables in the Render dashboard.
- **Frontend (Vercel or Netlify):** set the root directory to `frontend` and add `VITE_API_URL` (your backend URL) in the host's environment-variable settings.

---

## Limitations
- The backtest evaluates one fixed RSI rule on a single 80/20 hold-out split; it demonstrates the method and is not evidence of a profitable strategy.
- Portfolio optimization samples random portfolios rather than solving an optimizer, so results are approximate.
- Market data comes from Yahoo Finance and may contain gaps or errors.
- The AI analysis is generated by one Claude call and is not financial advice.
- Research and educational use only.

---

## License

MIT
