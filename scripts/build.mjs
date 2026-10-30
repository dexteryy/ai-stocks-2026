import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const asciiJSON = value => JSON.stringify(value)
  .replace(/[\u007f-\uffff]/g, ch => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
  .replace(/</g, '\\u003c');
const titleHTML = text => [...text].map(ch => /[A-Za-z0-9 _-]/.test(ch) ? ch : `&#${ch.codePointAt(0)};`).join('');
const [template, style, script, contentRaw, dataRaw, englishRaw, localeScript] = await Promise.all([
  read('src/page.html'), read('src/styles.css'), read('src/app.js'),
  read('src/content.json'), read('src/market-data.json'), read('src/content.en.json'), read('src/i18n.js')
]);
const content = JSON.parse(contentRaw);
const english = JSON.parse(englishRaw);
const data = JSON.parse(dataRaw);
const substitutions = { TITLE: titleHTML(content.title), STYLE: style, SCRIPT: localeScript + '\n' + script, COPY: asciiJSON({ zh: content, en: english }), DATA: asciiJSON(data) };
let page = template.replace(/@@(TITLE|STYLE|SCRIPT|COPY|DATA)@@/g, (_, key) => substitutions[key]);
page = page.replace('</head>', '<link rel="canonical" href="https://ai-stocks-2026.dexmage.com/">\n</head>');
if (/@@[A-Z]+@@/.test(page)) throw new Error('Unresolved template placeholder');
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/index.html'), page, 'utf8');
for (const name of ['_headers', '404.html']) await copyFile(resolve(root, 'public', name), resolve(root, 'dist', name));
console.log(`Built standalone page: ${data.assets.length} securities, ${Buffer.byteLength(page)} bytes.`);
