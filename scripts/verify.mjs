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
const allowed = ['ticker', 'name', 'group', 'quoteTime', 'd1', 'rally', 'd2', 'd2Close', 'oct', 'total', 'v5', 'v10', 'days10', 'days20', 'vol', 'mdd2', 'monthD1', 'monthRally', 'repair'].sort();
assert.equal(data.assets.length, 89);
assert.equal(new Set(data.assets.map(a => a.ticker)).size, data.assets.length);
assert.equal(data.dates.length, 87);
assert.deepEqual(Object.keys(data.series).sort(), data.assets.map(a => a.ticker).sort());
const windows = [
  ['2026-06-30', '2026-07-29', 'd1'],
  ['2026-07-29', '2026-09-22', 'rally'],
  ['2026-09-22', '2026-10-30', 'd2'],
  ['2026-06-30', '2026-10-30', 'total']
];
for (const asset of data.assets) {
  assert.deepEqual(Object.keys(asset).sort(), allowed);
  const prices = data.series[asset.ticker];
  assert.equal(prices.length, data.dates.length);
  assert.ok(prices.every(p => p === null || Number.isFinite(p) && p > 0));
  for (const [start, end, key] of windows) {
    const first = prices[data.dates.indexOf(start)];
    const last = prices[data.dates.indexOf(end)];
    if (first === null || last === null) assert.equal(asset[key], null);
    else assert.ok(Math.abs((last / first - 1) * 100 - asset[key]) < 0.00002, `${asset.ticker}: ${key}`);
  }
}
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
