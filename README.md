# AI Equity Field Notes: Three Market Phases, 2026

An interactive, bilingual (Chinese and English) research page comparing 78 AI-related US-traded stocks, ADRs, and ETFs with NVIDIA across two drawdowns and an intervening rebound.

Live site: https://ai-stocks-2026.dexmage.com

## Explore

- Chinese for Chinese-language devices, English for other device languages, and Chinese when no language is available.
- A header language switch that remembers the explicit choice in local storage and preserves active filters and selections.
- Header links to the GitHub repository and the author on X.
- A concise overview of the three common observation windows.
- Daily closing paths and simplified phase-endpoint paths for all 78 securities, sharing category filters, date windows, and normalization.
- Endpoint tooltips snap only to plotted observations; later listings keep their actual start dates.
- Eight overlapping categories; each security appears once in the full universe.
- All category memberships are preserved in filtering, details, and CSV exports.
- A shared chart/table explorer with search, sorting, relative returns, and multi-selection.
- A dedicated comparison view for selected securities and NVIDIA.
- Full-universe research: category medians, rebound/decline scatterplots, ETF-excluded quartiles, date-sensitive leadership, and retained rebound profits.
- CSV export of public market metrics.

## Run locally

Requires Node.js 22 or later. No third-party runtime or build dependencies are required.

```sh
npm test
```

Open `dist/index.html` directly in a browser. It contains all styles, scripts, text, and public market data, and can be shared as a single offline file.

For a local HTTP preview:

```sh
python3 -m http.server 8080 --directory dist
```

## Build and deploy

```sh
npm run build
npm run verify
```

Cloudflare Pages configuration:

- Production branch: `main`
- Build command: `npm test`
- Build output directory: `dist`
- Custom domain: `ai-stocks-2026.dexmage.com`

## Repository layout

- `src/page.html`: page template.
- `src/app.js`: filtering, charts, selection, and export behavior.
- `src/styles.css`: responsive and print styles.
- `src/content.json` and `src/content.en.json`: complete Chinese and English copy, including security names and accessibility labels, serialized with ASCII escapes.
- `src/i18n.js`: language selection and fault-tolerant local preference storage.
- `src/market-data.json`: allowlisted public prices and derived metrics.
- `src/research.json`: aggregate statistics independently checked against the embedded prices and metrics.
- `scripts/build.mjs`: dependency-free standalone HTML build.
- `scripts/verify.mjs`: data, privacy-boundary, and build-output checks.
- `public/`: static hosting headers and a 404 page.

## Data and interpretation

The report is a fixed historical snapshot, not a live market feed. All 78 securities use complete regular-session closing prices through October 30, 2026. The common windows are June 30 to July 29, July 29 to September 22, and September 22 to October 30.

77 securities use forward-adjusted Futu OpenD daily prices. KXIAY is an OTC ADR and uses Yahoo Finance adjusted closes (including the reported 3-for-1 split on October 9) because Futu does not supply its OTC history. The closing date is not a claim about the time of the last executable trade. Returns are price changes, not exact dividend-reinvestment total returns, and exclude transaction costs and taxes.

Annualized volatility uses the sample standard deviation of available close-to-close daily returns through October 30, multiplied by the square root of 252. Phase-3 maximum drawdown includes every close from September 22 onward and measures losses from the running peak. Rebound profit retained is `(final close - July 29 close) / (September 22 close - July 29 close)` when the denominator is positive.

Research uses 75 complete histories; LYTE, NCLD, and SKHY remain available in the explorer but are excluded from full-cycle rankings. The stock/ADR-only robustness view has 58 securities. Category memberships overlap, and ETFs may hold sampled companies. Category and quartile medians are not portfolio returns. Rank correlations describe one historical sample and do not imply causality. The alternate date split uses July 31 instead of July 29.

Later-listed securities retain missing values for incomplete windows. Their overview curves start at the first available close, visibly marked as a different baseline. The sample is curated and is not an exhaustive AI equity index. Historical performance is not a forecast or personalized investment advice.

## Public data boundary

Only public security names, category memberships, prices, dates, and calculated market metrics are included. There are no brokerage accounts, position quantities, position market values, portfolio weights, cost bases, credentials, analytics trackers, or external runtime requests.

Only the selected language is saved locally under `ai-equity-language`; it is never sent to a server. Blocked browser storage does not prevent switching languages.

The build reads only the public source files in this repository. It does not require or access any brokerage account or private report.
