import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const page = await read('dist/index.html');
const data = JSON.parse(await read('src/market-data.json'));
const content = JSON.parse(await read('src/content.json'));
const embedded = id => JSON.parse(page.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`))[1]);
assert.deepEqual(embedded('public-data'), data);
assert.deepEqual(embedded('public-content'), content);
assert.deepEqual((await readdir(resolve(root, 'dist'))).sort(), ['404.html', '_headers', 'index.html']);
assert.deepEqual(Object.keys(data).sort(), ['asOf', 'assets', 'dates', 'series']);
const allowed = ['ticker', 'name', 'groups', 'quoteTime', 'd1', 'rally', 'd2', 'd2Close', 'oct', 'total', 'v5', 'v10', 'days10', 'days20', 'vol', 'mdd2', 'monthD1', 'monthRally', 'repair'].sort();
assert.equal(data.assets.length, 86);
assert.equal(new Set(data.assets.map(a => a.ticker)).size, data.assets.length);
assert.equal(data.dates.length, 87);
assert.deepEqual(data.dates, [...new Set(data.dates)].sort());
assert.deepEqual(Object.keys(data.series).sort(), data.assets.map(a => a.ticker).sort());
const windows = [
  ['2026-06-30', '2026-07-29', 'd1'],
  ['2026-07-29', '2026-09-22', 'rally'],
  ['2026-09-22', '2026-10-30', 'd2'],
  ['2026-06-30', '2026-10-30', 'total'],
  ['2026-09-22', '2026-10-29', 'd2Close'],
  ['2026-09-30', '2026-10-30', 'oct'],
  ['2026-07-29', '2026-08-05', 'v5'],
  ['2026-07-29', '2026-08-12', 'v10'],
  ['2026-06-30', '2026-07-31', 'monthD1'],
  ['2026-07-31', '2026-09-22', 'monthRally']
];
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.00005, label);
for (const asset of data.assets) {
  assert.deepEqual(Object.keys(asset).sort(), allowed);
  assert.ok(Array.isArray(asset.groups) && asset.groups.length > 0);
  assert.equal(new Set(asset.groups).size, asset.groups.length);
  assert.ok(asset.groups.every(group => Object.hasOwn(content.groups, group)));
  const prices = data.series[asset.ticker];
  assert.equal(prices.length, data.dates.length);
  assert.ok(prices.every(p => p === null || Number.isFinite(p) && p > 0));
  for (const [start, end, key] of windows) {
    const first = prices[data.dates.indexOf(start)];
    const last = prices[data.dates.indexOf(end)];
    if (first === null || last === null) assert.equal(asset[key], null);
    else assert.ok(Math.abs((last / first - 1) * 100 - asset[key]) < 0.00002, `${asset.ticker}: ${key}`);
  }
  const at = date => prices[data.dates.indexOf(date)];
  const first = at('2026-06-30'), trough = at('2026-07-29'), peak = at('2026-09-22');
  if (first === null || trough === null || peak === null || trough >= first) assert.equal(asset.repair, null);
  else near(asset.repair, (peak - trough) / (first - trough) * 100, `${asset.ticker}: repair`);
  for (const threshold of [10, 20]) {
    const start = data.dates.indexOf('2026-07-29');
    const end = data.dates.indexOf('2026-09-22');
    const hit = trough === null ? -1 : prices.slice(start, end + 1).findIndex(p => p !== null && p >= trough * (1 + threshold / 100));
    assert.equal(asset[`days${threshold}`], hit < 0 ? null : hit, `${asset.ticker}: days${threshold}`);
  }
  const closes = prices.slice(0, -1);
  const returns = closes.slice(1).flatMap((price, i) => price === null || closes[i] === null ? [] : [price / closes[i] - 1]);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  near(asset.vol, Math.sqrt(variance * 252) * 100, `${asset.ticker}: volatility`);
  let runningPeak = 0, drawdown = 0;
  for (const price of closes.slice(data.dates.indexOf('2026-09-22'))) {
    if (price === null) continue;
    runningPeak = Math.max(runningPeak, price);
    drawdown = Math.min(drawdown, (price / runningPeak - 1) * 100);
  }
  near(asset.mdd2, drawdown, `${asset.ticker}: max drawdown`);
  if (asset.total !== null) near(asset.total, ((1 + asset.d1 / 100) * (1 + asset.rally / 100) * (1 + asset.d2 / 100) - 1) * 100, `${asset.ticker}: compounded phases`);
}
assert.ok(Object.keys(content.groups).every(group => data.assets.some(asset => asset.groups.includes(group))));
for (const match of page.matchAll(/data-copy="([^"]+)"/g)) {
  let value = content;
  for (const key of match[1].split('.')) value = value[key];
  assert.notEqual(value, undefined, match[1]);
}
assert.ok(!/[^\x00-\x7F]/.test(page), 'Generated HTML must be ASCII');
assert.ok(!/market_value_usd|nav_weight_pct|acc_id|account_id|cost_basis|\/Users\//i.test(page));
assert.ok(!/<(?:script|iframe)[^>]*src=/.test(page));
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|document\.cookie/.test(page));
assert.ok(!Object.hasOwn(content, 'sources'));
assert.ok(page.includes("connect-src 'none'"));
assert.ok(data.assets.some(a => a.ticker === 'KXIAY'));
assert.ok(content.quoteNotes.KXIAY.includes('15'));
assert.ok(data.assets.every(a => a.quoteTime.startsWith('2026-10-30')));
assert.ok(!/\b(?:shares|watchlist|held|isNew|portfolio|position)\b/i.test(JSON.stringify(data)));
console.log(`Verified public data boundary, ${data.assets.length} securities, endpoint math, copy references, and standalone output.`);
