# AI Equity Field Notes: Three Market Phases, 2026

An interactive, Chinese-language research page comparing 53 AI-related US-listed stocks, ADRs, and ETFs with NVIDIA across two drawdowns and an intervening rebound.

Live site: https://ai-stocks-2026.dexmage.com

## Explore

- A concise overview of the three common observation windows.
- Price paths for all 53 securities, with theme and ticker filters and phase annotations.
- A shared chart/table explorer with search, sorting, relative returns, and multi-selection.
- A dedicated comparison view for selected securities and NVIDIA.
- Historical analysis of rebound speed, loss recovery, and date sensitivity.
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
- `src/content.json`: Chinese editorial copy, serialized with ASCII escapes.
- `src/market-data.json`: allowlisted public prices and derived metrics.
- `scripts/build.mjs`: dependency-free standalone HTML build.
- `scripts/verify.mjs`: data, privacy-boundary, and build-output checks.
- `public/`: static hosting headers and a 404 page.

## Data and interpretation

The report is a fixed historical snapshot, not a live market feed. Complete daily prices end on October 29, 2026. The final point is an intraday snapshot around 12:50 ET on October 30, 2026; individual last-trade timestamps differ.

The common windows are June 30 to July 29, July 29 to September 22, and September 22 to the October 30 intraday snapshot. Prices are forward-adjusted Futu OpenD market prices. Returns are price changes, not exact dividend-reinvestment total returns, and exclude transaction costs and taxes.

Later-listed securities retain missing values for incomplete windows. Their overview curves start at the first available close, visibly marked as a different baseline. The sample is curated and is not an exhaustive AI equity index. Historical performance is not a forecast or personalized investment advice.

## Public data boundary

Only public security names, theme classifications, prices, dates, and calculated market metrics are included. There are no brokerage accounts, position quantities, position market values, portfolio weights, cost bases, credentials, analytics trackers, or external runtime requests.

The build reads only the public source files in this repository. It does not require or access any brokerage account or private report.
