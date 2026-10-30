import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const page = await read('dist/index.html');
const data = JSON.parse(await read('src/market-data.json'));
const research = JSON.parse(await read('src/research.json'));
const content = JSON.parse(await read('src/content.json'));
const english = JSON.parse(await read('src/content.en.json'));
const embedded = id => JSON.parse(page.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`))[1]);
assert.deepEqual(embedded('public-data'), data);
assert.deepEqual(embedded('public-research'), research);
assert.deepEqual(embedded('public-content'), { zh: content, en: english });
assert.deepEqual((await readdir(resolve(root, 'dist'))).sort(), ['404.html', '_headers', 'index.html']);
assert.deepEqual(Object.keys(data).sort(), ['asOf', 'assets', 'dates', 'endDate', 'series']);
const allowed = ['ticker', 'name', 'groups', 'kind', 'priceDate', 'd1', 'rally', 'd2', 'retainedRally', 'oct', 'total', 'v5', 'v10', 'days10', 'days20', 'vol', 'mdd2', 'monthD1', 'monthRally', 'repair'].sort();
assert.equal(data.assets.length, 78);
assert.equal(new Set(data.assets.map(a => a.ticker)).size, data.assets.length);
assert.equal(data.dates.length, 87);
assert.deepEqual(data.dates, [...new Set(data.dates)].sort());
assert.deepEqual(Object.keys(data.series).sort(), data.assets.map(a => a.ticker).sort());
const windows = [
  ['2026-06-30', '2026-07-29', 'd1'],
  ['2026-07-29', '2026-09-22', 'rally'],
  ['2026-09-22', '2026-10-30', 'd2'],
  ['2026-06-30', '2026-10-30', 'total'],
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
  const latest = at(data.endDate);
  if (trough === null || peak === null || peak <= trough) assert.equal(asset.retainedRally, null);
  else near(asset.retainedRally, (latest - trough) / (peak - trough) * 100, `${asset.ticker}: retention`);
  const firstAvailable = prices.findIndex(p => p !== null);
  assert.ok(prices.slice(firstAvailable).every(p => p !== null), `${asset.ticker}: interior price gap`);
  assert.ok(['equity', 'etf'].includes(asset.kind));
  assert.equal(asset.priceDate, data.endDate);
  for (const threshold of [10, 20]) {
    const start = data.dates.indexOf('2026-07-29');
    const end = data.dates.indexOf('2026-09-22');
    const hit = trough === null ? -1 : prices.slice(start, end + 1).findIndex(p => p !== null && p >= trough * (1 + threshold / 100));
    assert.equal(asset[`days${threshold}`], hit < 0 ? null : hit, `${asset.ticker}: days${threshold}`);
  }
  const closes = prices;
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
const leafPaths = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return item && typeof item === 'object' ? leafPaths(item, path) : [path];
});
assert.deepEqual(leafPaths(english).sort(), leafPaths(content).sort(), 'Translation keys must match');
for (const language of [content, english]) {
  for (const match of page.matchAll(/data-(?:copy|aria-copy|title-copy)="([^"]+)"/g)) {
    let value = language;
    for (const key of match[1].split('.')) value = value[key];
    assert.equal(typeof value, 'string', match[1]);
  }
  assert.deepEqual(Object.keys(language.assetNames).sort(), data.assets.map(a => a.ticker).sort());
}
for (const [key, value] of Object.entries(english)) {
  if (key === 'languageButton' || key === 'switchLanguage') continue;
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(value)), `Untranslated English copy: ${key}`);
}
const localeCode = await read('src/i18n.js');
const locale = runInNewContext(localeCode + '\n({ resolveLanguage, loadLanguagePreference, saveLanguagePreference })');
for (const [saved, devices, expected] of [
  [null, [], 'zh'], [null, ['zh-CN'], 'zh'], [null, ['zh-TW'], 'zh'],
  [null, ['zh-Hant-HK'], 'zh'], [null, ['en-US', 'zh-CN'], 'en'],
  [null, ['ja-JP'], 'en'], [null, ['', 'zh-Hans'], 'zh'],
  ['en', ['zh-CN'], 'en'], ['zh', ['en-US'], 'zh'], ['invalid', ['en'], 'en']
]) assert.equal(locale.resolveLanguage(saved, devices), expected);
let savedValue = null;
const stored = runInNewContext(localeCode + '\n({ loadLanguagePreference, saveLanguagePreference })', {
  localStorage: {
    getItem(key) { assert.equal(key, 'ai-equity-language'); return savedValue; },
    setItem(key, value) { assert.equal(key, 'ai-equity-language'); savedValue = value; }
  }
});
stored.saveLanguagePreference('en');
assert.equal(stored.loadLanguagePreference(), 'en');
assert.equal(locale.loadLanguagePreference(), null);
assert.doesNotThrow(() => locale.saveLanguagePreference('zh'));
const blocked = runInNewContext(localeCode + '\n({ loadLanguagePreference, saveLanguagePreference })', {
  get localStorage() { throw new Error('Storage blocked'); }
});
assert.equal(blocked.loadLanguagePreference(), null);
assert.doesNotThrow(() => blocked.saveLanguagePreference('en'));
assert.ok(!/[^\x00-\x7F]/.test(page), 'Generated HTML must be ASCII');
assert.ok(!/market_value_usd|nav_weight_pct|acc_id|account_id|cost_basis|\/Users\//i.test(page));
assert.ok(!/<(?:script|iframe)[^>]*src=/.test(page));
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie/.test(page));
assert.equal((page.match(/localStorage\./g) || []).length, 2, 'Only the language preference may use local storage');
assert.ok(page.includes('href="https://github.com/dexteryy/ai-stocks-2026"'));
assert.ok(page.includes('href="https://x.com/dexteryy"'));
assert.ok(!Object.hasOwn(content, 'sources'));
assert.ok(page.includes("connect-src 'none'"));
assert.ok(data.assets.some(a => a.ticker === 'KXIAY'));
assert.equal(data.endDate, data.dates.at(-1));
assert.equal(data.asOf, data.endDate + ' close');
assert.ok(!/\b(?:shares|watchlist|held|isNew|portfolio|position)\b/i.test(JSON.stringify(data)));
const complete = data.assets.filter(a => ['d1', 'rally', 'd2', 'total'].every(k => a[k] !== null));
const nvda = data.assets.find(a => a.ticker === 'NVDA');
const median = values => { const v = [...values].sort((a, b) => a - b); const i = (v.length - 1) / 2; return (v[Math.floor(i)] + v[Math.ceil(i)]) / 2; };
const rank = values => values.map(v => 1 + values.filter(x => x < v).length + (values.filter(x => x === v).length - 1) / 2);
const corr = (x, y) => {
  const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length;
  const cov = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  return cov / Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
};
assert.equal(research.completeCount, complete.length);
assert.deepEqual(research.incompleteTickers, data.assets.filter(a => !complete.includes(a)).map(a => a.ticker).sort());
assert.equal(research.positiveCount, complete.filter(a => a.total > 0).length);
assert.equal(research.aboveNvdaCount, complete.filter(a => a.total > nvda.total).length);
near(research.medianTotal, median(complete.map(a => a.total)), 'Full-period median');
assert.equal(research.rallyPositiveCount, complete.filter(a => a.rally > 0).length);
assert.equal(research.rallyLostCount, complete.filter(a => a.rally > 0 && a.retainedRally <= 0).length);
const leaders = complete.filter(a => ['d1', 'rally', 'd2'].every(k => a[k] > nvda[k])).sort((a, b) => a.vol - b.vol);
const robust = leaders.filter(a => ['monthD1', 'monthRally', 'd2'].every(k => a[k] > nvda[k]));
assert.deepEqual(research.leaders, leaders.map(a => a.ticker));
assert.deepEqual(research.robustLeaders, robust.map(a => a.ticker));
assert.deepEqual(research.lowVolLeaders, leaders.filter(a => a.vol <= nvda.vol).map(a => a.ticker));
assert.deepEqual(research.lowVolRobustLeaders, robust.filter(a => a.vol <= nvda.vol).map(a => a.ticker));
assert.deepEqual(research.categories.map(c => c.group), Object.keys(content.groups));
for (const category of research.categories) {
  const members = complete.filter(a => a.groups.includes(category.group));
  assert.equal(category.n, members.length);
  assert.equal(category.totalN, data.assets.filter(a => a.groups.includes(category.group)).length);
  assert.equal(category.positive, members.filter(a => a.total > 0).length);
  for (const key of ['d1', 'rally', 'd2', 'total']) near(category[key], median(members.map(a => a[key])), `${category.group}: ${key}`);
}
for (const [key, sample] of Object.entries(research.samples)) {
  const members = complete.filter(a => key === 'all' || a.kind === 'equity').sort((a, b) => a.rally - b.rally);
  assert.equal(sample.n, members.length);
  near(sample.spearman, corr(rank(members.map(a => a.rally)), rank(members.map(a => a.d2))), `${key}: rank correlation`);
  const boundaries = [0.25, 0.5, 0.75].map(p => {
    const i = (members.length - 1) * p, low = Math.floor(i), fraction = i - low;
    return members[low].rally + fraction * (members[Math.ceil(i)].rally - members[low].rally);
  });
  for (const quartile of sample.quartiles) {
    const group = members.filter(a => boundaries.filter(b => a.rally > b).length === quartile.q);
    assert.equal(quartile.n, group.length);
    for (const field of ['rally', 'd2', 'total', 'vol']) near(quartile[field], median(group.map(a => a[field])), `${key}: quartile ${quartile.q} ${field}`);
  }
}
assert.ok(!data.assets.some(a => ['ARKQ', 'CABZ', 'HUMN', 'KOID', 'KTOS', 'PDYN', 'TSLA', 'TEAM', 'ARKX', 'EUAD', 'JEDI'].includes(a.ticker)));
assert.equal(Object.keys(content.groups).length, 8);
assert.equal(data.assets.filter(a => a.kind === 'etf').length, 19);
assert.ok(!/intraday|14:50|d2Close|lastIsLive/.test(page), 'Closing snapshot must not contain intraday labels or code');

console.log(`Verified public data boundary, ${data.assets.length} securities, endpoint math, copy references, and standalone output.`);
