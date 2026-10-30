'use strict';
const translations=JSON.parse(document.getElementById('public-content').textContent);
let language=resolveLanguage(loadLanguagePreference(),[...(navigator.languages||[]),navigator.language]);
let copy=translations[language];
const dataset=JSON.parse(document.getElementById('public-data').textContent);
const research=JSON.parse(document.getElementById('public-research').textContent);
const assets=dataset.assets;
const byTicker=Object.fromEntries(assets.map(a=>[a.ticker,a]));
const nvda=byTicker.NVDA;
const q=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(v,d=1)=>v==null?'\u2014':`${v>=0?'+':''}${v.toFixed(d)}%`;
const plain=(v,d=1)=>v==null?'\u2014':`${v.toFixed(d)}%`;
const signed=(v,mode='absolute')=>v==null?'\u2014':`${v>=0?'+':''}${v.toFixed(1)}${mode==='absolute'?'%':''}`;
const sign=v=>v==null?'':v>=0?'positive':'negative';
const getCopy=path=>path.split('.').reduce((v,k)=>v[k],copy);
const groupKeys=Object.keys(translations.zh.groups);
const assetName=a=>copy.assetNames[a.ticker];
const palette=['#4d7999','#288779','#bd8050','#548c9e','#708749','#b86c60','#a18b40','#7d8170'];
const groupColor=g=>palette[groupKeys.indexOf(g)%palette.length];
const groupLabels=a=>a.groups.map(group=>copy.groups[group]).join(' / ');
const colors={NVDA:'#172b2c',MSFT:'#197b9e',PLTR:'#1b8e72',LITE:'#216f99',SNDK:'#b55b50',NBIS:'#8b72a4',MRVL:'#b18a37',BE:'#b2683f',NET:'#318c76',SNOW:'#497e9d',ORCL:'#b96c4e',NOW:'#728349'};
const comparePalette=['#147c69','#bd6b43','#2c78a1','#88649a','#ad913d','#547d48','#b9547e','#6e6e9e'];
const colorFor=(t,i=0)=>t==='NVDA'?colors.NVDA:comparePalette[Math.max(0,i-1)%comparePalette.length];
const windows=[['2026-06-30',dataset.endDate],['2026-06-30','2026-07-29'],['2026-07-29','2026-09-22'],['2026-09-22',dataset.endDate]];
const returnKeys=['d1','rally','d2','total'];
const periodButtons=(prefix,active)=>copy.periodNames.map((name,i)=>`<button type="button" data-period="${i}" aria-pressed="${active===i}">${esc(name)}</button>`).join('');
const searchMatches=(a,text)=>{const terms=text.toLowerCase().split(/[,\uFF0C;\uFF1B\s]+/).filter(Boolean);return !terms.length||terms.some(term=>byTicker[term.toUpperCase()]?a.ticker===term.toUpperCase():`${a.ticker} ${translations.zh.assetNames[a.ticker]} ${translations.en.assetNames[a.ticker]} ${a.groups.map(g=>translations.zh.groups[g]+' '+translations.en.groups[g]).join(' ')}`.toLowerCase().includes(term));};
const benchmarkFirst=list=>[...list].sort((a,b)=>a.ticker==='NVDA'?-1:b.ticker==='NVDA'?1:a.ticker.localeCompare(b.ticker));
function renderPhases(){q('#phase-grid').innerHTML=copy.phaseNames.map((name,i)=>`<article class="phase"><div><span class="phase-index">PHASE 0${i+1}</span><h3>${esc(name)}</h3><time>${esc(copy.phaseRanges[i])}</time></div><div class="phase-value ${sign([nvda.d1,nvda.rally,nvda.d2][i])}">${pct([nvda.d1,nvda.rally,nvda.d2][i])}<small>NVDA</small></div></article>`).join('');}

const geometries={};
function renderLineChart(prefix,tickers,period,useGroups){
  const svg=q(`#${prefix}-chart`),box=q(`#${prefix}-box`),w=box.clientWidth,h=box.clientHeight;
  if(w<100)return;
  const margin={l:44,r:25,t:55,b:31};
  const [start,end]=windows[period],startIndex=dataset.dates.indexOf(start),endIndex=dataset.dates.indexOf(end);
  const dates=dataset.dates.slice(startIndex,endIndex+1);
  const late=[],missing=[];
  const stageView=prefix==='overview'&&overviewView==='stages';
  const series=tickers.map((ticker,i)=>{
    const raw=dataset.series[ticker].slice(startIndex,endIndex+1),first=raw.findIndex(v=>v!=null);
    if(first<0){missing.push(ticker);return null;}
    if(first>0)late.push(ticker);
    const plotIndices=raw.flatMap((v,j)=>v!=null&&(!stageView||j===first||j===raw.length-1||dates[j]==='2026-07-29'||dates[j]==='2026-09-22')?[j]:[]);
    return {ticker,plotIndices,color:ticker==='NVDA'?colors.NVDA:useGroups?groupColor(byTicker[ticker].groups[0]):colorFor(ticker,i),values:raw.map(v=>v==null?null:v/raw[first]*100),start:dates[first],late:first>0};
  }).filter(Boolean);
  const vals=series.flatMap(s=>s.values).filter(v=>v!=null);
  const lo=Math.floor((Math.min(...vals,100)-5)/10)*10,hi=Math.ceil((Math.max(...vals,100)+5)/10)*10;
  const x0=Date.parse(start),x1=Date.parse(end);
  const xx=d=>margin.l+(Date.parse(d)-x0)/(x1-x0)*(w-margin.l-margin.r);
  const yy=v=>h-margin.b-(v-lo)/(hi-lo)*(h-margin.t-margin.b);
  let out='';
  windows.slice(1).forEach(([a,b],i)=>{
    const left=Math.max(margin.l,xx(a)),right=Math.min(w-margin.r,xx(b));
    if(right<=left)return;
    const color=i===1?'#137c70':'#b85e47';
    out+=`<rect x="${left}" y="28" width="${right-left}" height="${h-margin.b-28}" fill="${color}" opacity=".045"/><line x1="${left}" y1="49" x2="${right}" y2="49" stroke="${color}" opacity=".3"/><text x="${(left+right)/2}" y="42" text-anchor="middle" class="stage-label" fill="${color}">${esc((w<600?copy.stageNarrow:copy.stageLabels)[i])}</text>`;
    if(left>margin.l)out+=`<line x1="${left}" y1="49" x2="${left}" y2="${h-margin.b}" stroke="${color}" opacity=".17" stroke-dasharray="3 4"/>`;
  });
  const step=Math.max(10,Math.ceil((hi-lo)/5/10)*10);
  for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step)out+=`<line x1="${margin.l}" y1="${yy(v)}" x2="${w-margin.r}" y2="${yy(v)}" stroke="#cbd3c7" opacity=".65"/><text x="${margin.l-9}" y="${yy(v)+4}" text-anchor="end" fill="#65716d">${v}</text>`;
  out+=`<line x1="${margin.l}" y1="${yy(100)}" x2="${w-margin.r}" y2="${yy(100)}" stroke="#65716d" stroke-dasharray="3 5" opacity=".6"/><text x="${margin.l}" y="14" class="axis-label">${esc(copy.chartAxis)}</text>`;
  const ticks=period===0?[start,'2026-07-29','2026-09-22',end]:[start,dates[Math.round((dates.length-1)/3)],dates[Math.round((dates.length-1)*2/3)],end];
  [...new Set(ticks)].forEach(d=>out+=`<text x="${xx(d)}" y="${h-8}" text-anchor="${d===start?'start':d===end?'end':'middle'}" fill="#65716d">${d.slice(5).replace('-','/')}</text>`);
  const crowded=series.length>9;
  const sorted=[...series].sort((a,b)=>a.ticker==='NVDA'?1:b.ticker==='NVDA'?-1:0);
  sorted.forEach(s=>{
    let started=false;
    s.path=s.plotIndices.map(i=>{const v=s.values[i],part=`${started?'L':'M'}${xx(dates[i]).toFixed(2)},${yy(v).toFixed(2)}`;started=true;return part;}).join(' ');
    s.opacity=s.ticker==='NVDA'?1:crowded?.32:.8;
    s.width=s.ticker==='NVDA'?2.8:crowded?1.15:1.8;
    out+=`<path class="price-line" data-ticker="${s.ticker}" d="${s.path}" fill="none" stroke="${s.color}" stroke-width="${s.width}" opacity="${s.opacity}" stroke-linejoin="round" ${s.late?'stroke-dasharray="5 3"':''}/>`;
    const dots=stageView?s.plotIndices:[s.values.length-1];
    dots.forEach(i=>{if(s.values[i]!=null)out+=`<circle class="price-anchor" data-ticker="${s.ticker}" data-date="${dates[i]}" data-value="${s.values[i]}" cx="${xx(dates[i])}" cy="${yy(s.values[i])}" r="${s.ticker==='NVDA'?3.6:2.2}" fill="${s.color}" opacity="${s.opacity}"/>`;});
  });
  out+='<g class="hover-layer"></g>';
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=out;
  geometries[prefix]={w,h,margin,xx,yy,dates,series,svg,hoverIndices:[...new Set(series.flatMap(s=>s.plotIndices))].sort((a,b)=>a-b)};
  q(`#${prefix}-tooltip`).hidden=true;
  q(`#${prefix}-missing`).textContent=[late.length?`${late.join(' / ')} ${copy.overviewLate}`:'',missing.length?`${missing.join(' / ')}: ${copy.overviewNoHistory}`:''].filter(Boolean).join(' ');
  return {series,late,missing};
}
function restoreLines(prefix){
  const g=geometries[prefix];if(!g)return;
  g.svg.querySelectorAll('.price-line').forEach(path=>{const s=g.series.find(s=>s.ticker===path.dataset.ticker);path.style.opacity=s.opacity;path.style.strokeWidth=s.width;});
  g.svg.querySelector('.hover-layer').innerHTML='';q(`#${prefix}-tooltip`).hidden=true;
}
function highlightLine(prefix,ticker){
  const g=geometries[prefix];if(!g)return;
  g.svg.querySelectorAll('.price-line').forEach(path=>{path.style.opacity=path.dataset.ticker===ticker||path.dataset.ticker==='NVDA'?1:.1;path.style.strokeWidth=path.dataset.ticker===ticker?3:1.5;});
}
function bindChart(prefix){
  q(`#${prefix}-chart`).addEventListener('pointermove',e=>{
    const g=geometries[prefix];if(!g)return;
    const rect=e.currentTarget.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
    if(px<g.margin.l||px>g.w-g.margin.r||py<g.margin.t){restoreLines(prefix);return;}
    const ix=g.hoverIndices.reduce((best,i)=>Math.abs(g.xx(g.dates[i])-px)<Math.abs(g.xx(g.dates[best])-px)?i:best,g.hoverIndices[0]);
    const available=g.series.filter(s=>s.plotIndices.includes(ix));if(!available.length)return;
    const closest=available.reduce((best,s)=>Math.abs(g.yy(s.values[ix])-py)<Math.abs(g.yy(best.values[ix])-py)?s:best,available[0]);
    highlightLine(prefix,closest.ticker);
    const display=[closest,...available.filter(s=>s.ticker==='NVDA'&&s!==closest)],x=g.xx(g.dates[ix]);
    g.svg.querySelector('.hover-layer').innerHTML=`<path d="${closest.path}" fill="none" stroke="${closest.color}" stroke-width="2.5"/><line x1="${x}" y1="${g.margin.t}" x2="${x}" y2="${g.h-g.margin.b}" stroke="#65716d" stroke-dasharray="3 5"/>`+display.map(s=>`<circle cx="${x}" cy="${g.yy(s.values[ix])}" r="4" fill="${s.color}"/>`).join('');
    const tip=q(`#${prefix}-tooltip`);
    tip.innerHTML=`<strong>${g.dates[ix]}</strong><p>${esc(assetName(byTicker[closest.ticker]))}</p><p>${esc(groupLabels(byTicker[closest.ticker]))}</p>`+display.map(s=>`<div><span><i style="background:${s.color}"></i>${s.ticker}${s.late?'*':''}</span><b>${s.values[ix].toFixed(1)}</b></div>`).join('');
    tip.hidden=false;tip.style.left=Math.max(0,Math.min(x+(x<g.w*.55?14:-tip.offsetWidth-14),g.w-tip.offsetWidth))+'px';
  });
  q(`#${prefix}-chart`).addEventListener('pointerleave',()=>restoreLines(prefix));
}
bindChart('overview');bindChart('compare');

let overviewGroup='all',overviewPeriod=0,overviewView='daily';
const overviewHidden=new Set();
function renderOverview(){
  const matches=benchmarkFirst(assets.filter(a=>(overviewGroup==='all'||a.groups.includes(overviewGroup))&&searchMatches(a,q('#overview-search').value)));
  const shown=matches.filter(a=>a.ticker==='NVDA'||!overviewHidden.has(a.ticker));
  const tickers=[...new Set(['NVDA',...shown.map(a=>a.ticker)])];
  q('#overview-groups').innerHTML=`<button type="button" data-group="all" aria-pressed="${overviewGroup==='all'}">${esc(copy.allThemes)} <small>${assets.length}</small></button>`+groupKeys.map(g=>`<button type="button" data-group="${esc(g)}" aria-pressed="${overviewGroup===g}"><i style="background:${groupColor(g)}"></i>${esc(copy.groups[g])}<small>${assets.filter(a=>a.groups.includes(g)).length}</small></button>`).join('');
  q('#overview-period').innerHTML=periodButtons('overview',overviewPeriod);
  q('#overview-view').innerHTML=copy.overviewModes.map((label,i)=>`<button type="button" data-overview-view="${i?'stages':'daily'}" aria-pressed="${overviewView===(i?'stages':'daily')}">${esc(label)}</button>`).join('');
  q('#overview-view-note').textContent=overviewView==='stages'?copy.overviewStageNote:copy.overviewDailyNote;
  const result=renderLineChart('overview',tickers,overviewPeriod,true);
  q('#overview-count').textContent=`${shown.length} / ${assets.length} ${copy.resultCount} \u00b7 ${result?.series.length||0} ${result?.series.length===1?copy.overviewCurveOne:copy.overviewCurves}${shown.some(a=>a.ticker==='NVDA')?'':` (${copy.overviewBenchmarkExtra})`}`;
  q('#overview-assets').innerHTML=matches.length?matches.map(a=>`<button type="button" class="asset-chip" data-overview="${a.ticker}" aria-pressed="${!overviewHidden.has(a.ticker)}" title="${esc(assetName(a)+' / '+groupLabels(a))}" ${a.ticker==='NVDA'?'aria-disabled="true"':''}><i style="background:${a.ticker==='NVDA'?colors.NVDA:groupColor(a.groups[0])}"></i><strong>${a.ticker}${dataset.series[a.ticker][0]==null?'*':''}</strong><span>${esc(assetName(a))}</span></button>`).join(''):`<p class="note">${esc(copy.overviewNoMatch)}</p>`;
}
q('#overview-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b){overviewGroup=b.dataset.group;renderOverview();}});
q('#overview-view').addEventListener('click',e=>{const b=e.target.closest('[data-overview-view]');if(b){overviewView=b.dataset.overviewView;renderOverview();}});
q('#overview-search').addEventListener('input',renderOverview);
q('#overview-period').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(b){overviewPeriod=Number(b.dataset.period);renderOverview();}});
q('#overview-assets').addEventListener('click',e=>{const b=e.target.closest('[data-overview]');if(!b||b.dataset.overview==='NVDA')return;const t=b.dataset.overview;if(overviewHidden.has(t))overviewHidden.delete(t);else overviewHidden.add(t);renderOverview();});
q('#overview-assets').addEventListener('pointerover',e=>{const b=e.target.closest('[data-overview]');if(b)highlightLine('overview',b.dataset.overview);});
q('#overview-assets').addEventListener('pointerout',()=>restoreLines('overview'));
q('#overview-reset').addEventListener('click',()=>{overviewGroup='all';overviewPeriod=0;overviewHidden.clear();q('#overview-search').value='';renderOverview();});

let sortKey='total',sortDirection=-1,dataView='chart',dataMode='absolute',filtered=[];
const chosen=new Set();
const valueFor=(a,key)=>a[key]==null?null:a[key]-(dataMode==='relative'&&returnKeys.includes(key)?nvda[key]:0);
function selectionBox(a){return `<input type="checkbox" data-select="${a.ticker}" aria-label="${esc(copy.checkboxSelect+' '+a.ticker)}" ${chosen.has(a.ticker)?'checked':''}>`;}
function assetLabel(a){return `<button class="asset-button" type="button" data-detail="${a.ticker}" aria-label="${esc(a.ticker+' '+copy.more)}"><span class="asset-name-line"><strong>${a.ticker}</strong>${a.ticker==='NVDA'?`<small class="benchmark-label">${esc(copy.benchmark)}</small>`:''}</span><span class="asset-subtitle">${esc(assetName(a))}</span></button>`;}
function renderExplorer(){
  filtered=assets.filter(a=>(q('#group-filter').value==='all'||a.groups.includes(q('#group-filter').value))&&searchMatches(a,q('#table-search').value));
  filtered.sort((a,b)=>{if(a.ticker==='NVDA')return -1;if(b.ticker==='NVDA')return 1;const av=a[sortKey],bv=b[sortKey];if(av==null)return bv==null?a.ticker.localeCompare(b.ticker):1;if(bv==null)return -1;return sortDirection*(typeof av==='string'?av.localeCompare(bv):av-bv);});
  q('#sort-key').value=sortKey;q('#sort-order').value=String(sortDirection);
  q('#result-count').textContent=`${filtered.length} / ${assets.length} ${copy.resultCount}`;
  q('#view-tabs').innerHTML=copy.viewOptions.map((label,i)=>`<button type="button" data-view="${i===0?'chart':'table'}" aria-pressed="${dataView===(i===0?'chart':'table')}">${esc(label)}</button>`).join('');
  q('#mode-tabs').innerHTML=copy.modeOptions.map((label,i)=>`<button type="button" data-mode="${i===0?'absolute':'relative'}" aria-pressed="${dataMode===(i===0?'absolute':'relative')}">${esc(label)}</button>`).join('');
  q('#chart-view').hidden=dataView!=='chart';q('#table-view').hidden=dataView!=='table';
  q('#data-note').textContent=dataMode==='absolute'?copy.absoluteNote:copy.relativeNote;
  renderMatrix();renderTable();renderSelection();
}
function renderMatrix(){
  const unit=dataMode==='absolute'?'%':copy.relativeUnit;
  const max=Math.max(100,...filtered.flatMap(a=>returnKeys.map(k=>Math.abs(valueFor(a,k)||0))));
  const bound=Math.ceil(max/20)*20;
  const head=`<div class="matrix-head matrix-row"><div class="matrix-asset">${esc(copy.columns[0])}<small>${esc(unit)}</small></div>${returnKeys.map((k,i)=>`<div class="matrix-heading"><button type="button" data-sort="${k}">${esc(copy.matrixHead[i])}<span>${sortKey===k?(sortDirection===1?'\u2191':'\u2193'):'\u2195'}</span></button><small>${esc(copy.matrixDates[i])}</small><div class="matrix-axis"><span>-${bound}</span><span>0</span><span>+${bound}</span></div></div>`).join('')}</div>`;
  q('#comparison-matrix').innerHTML=head+(filtered.length?filtered.map(a=>`<div class="matrix-row ${a.ticker==='NVDA'?'benchmark-row':''} ${chosen.has(a.ticker)?'is-selected':''}"><div class="matrix-asset">${selectionBox(a)}${assetLabel(a)}</div>${returnKeys.map(k=>{const v=valueFor(a,k),width=v==null?0:Math.abs(v)/bound*44;return `<div class="matrix-cell"><span class="matrix-zero"></span>${v==null?'':`<i class="matrix-bar ${v>=0?'gain':'loss'}" style="left:${v>=0?50:50-width}%;width:${width}%"></i>`}<span class="matrix-value ${sign(v)}" style="${v==null?'left:50%;transform:translateX(-50%)':v>=0?`left:calc(${50+width}% + 5px)`:`right:calc(${50+width}% + 5px)`}">${signed(v,dataMode)}</span></div>`;}).join('')}</div>`).join(''):`<p class="no-results">${esc(copy.noResults)}</p>`);
}
function renderTable(){
  const keys=['ticker',...returnKeys,'vol'];
  q('#table-head').innerHTML='<th class="check-cell"></th>'+keys.map((k,i)=>`<th scope="col" aria-sort="${sortKey===k?(sortDirection===1?'ascending':'descending'):'none'}"><button type="button" data-sort="${k}" title="${esc(copy.columnTitles[i])}">${esc(copy.columns[i])}<span class="sort-indicator">${sortKey===k?(sortDirection===1?'\u2191':'\u2193'):'\u2195'}</span></button></th>`).join('');
  q('#table-body').innerHTML=filtered.length?filtered.map(a=>`<tr class="${a.ticker==='NVDA'?'benchmark-row':''} ${chosen.has(a.ticker)?'is-selected':''}"><td class="check-cell">${selectionBox(a)}</td><td>${assetLabel(a)}<span class="asset-category">${esc(groupLabels(a))}</span></td>${keys.slice(1).map(k=>`<td class="numeric-cell ${k==='vol'?'':sign(valueFor(a,k))}">${k==='vol'?plain(a[k]):signed(valueFor(a,k),dataMode)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="7" class="no-results">${esc(copy.noResults)}</td></tr>`;
}
function renderSelection(){
  q('#selection-count').textContent=chosen.size?`${copy.selectedCount} ${chosen.size} ${chosen.size===1?copy.selectedUnitOne:copy.selectedUnit}`:copy.selectionHint;
  q('#compare-open').disabled=chosen.size===0;q('#clear-selection').disabled=chosen.size===0;
  q('#compare-open').textContent=copy.compareSelected+(chosen.size?` (${chosen.size})`:'');
  q('#select-all').checked=filtered.length>0&&filtered.every(a=>chosen.has(a.ticker));
  q('#select-all').indeterminate=filtered.some(a=>chosen.has(a.ticker))&&!q('#select-all').checked;
  q('#select-all').disabled=!filtered.length;
  q('#selection-chips').innerHTML=[...chosen].map(t=>`<button type="button" data-unselect="${t}" aria-label="${esc(copy.removeSelected+' '+t)}">${t}<span aria-hidden="true">&times;</span></button>`).join('');
}
q('#table-search').addEventListener('input',renderExplorer);q('#group-filter').addEventListener('change',renderExplorer);
q('#sort-key').addEventListener('change',e=>{sortKey=e.target.value;renderExplorer();});q('#sort-order').addEventListener('change',e=>{sortDirection=Number(e.target.value);renderExplorer();});
q('#view-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){dataView=b.dataset.view;renderExplorer();}});
q('#mode-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){dataMode=b.dataset.mode;renderExplorer();}});
q('#universe').addEventListener('change',e=>{if(!e.target.matches('[data-select]'))return;const t=e.target.dataset.select;if(e.target.checked)chosen.add(t);else chosen.delete(t);renderExplorer();});
q('#universe').addEventListener('click',e=>{
  const sort=e.target.closest('[data-sort]');if(sort){const k=sort.dataset.sort;if(sortKey===k)sortDirection*=-1;else{sortKey=k;sortDirection=k==='ticker'?1:-1;}renderExplorer();}
  const detail=e.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);
  const unselect=e.target.closest('[data-unselect]');if(unselect){chosen.delete(unselect.dataset.unselect);renderExplorer();}
});
q('#select-all').addEventListener('change',e=>{filtered.forEach(a=>{if(e.target.checked)chosen.add(a.ticker);else chosen.delete(a.ticker);});renderExplorer();});
q('#clear-selection').addEventListener('click',()=>{chosen.clear();renderExplorer();});
q('#explorer-reset').addEventListener('click',()=>{q('#table-search').value='';q('#group-filter').value='all';sortKey='total';sortDirection=-1;dataMode='absolute';renderExplorer();});

let comparePeriod=0;
function renderCompare(){
  const tickers=[...new Set(['NVDA',...chosen])];
  q('#compare-chips').innerHTML=tickers.map((t,i)=>`<span><i style="background:${colorFor(t,i)}"></i>${t}${t==='NVDA'?`<small>${esc(copy.benchmark)}</small>`:`<button type="button" data-compare-remove="${t}" aria-label="${esc(copy.removeSelected+' '+t)}">&times;</button>`}</span>`).join('');
  q('#compare-period').innerHTML=periodButtons('compare',comparePeriod);
  renderLineChart('compare',tickers,comparePeriod,false);
  q('#compare-summary').innerHTML=`<table><thead><tr><th>${esc(copy.columns[0])}</th>${returnKeys.map((k,i)=>`<th>${esc(copy.matrixHead[i])}<small>${esc(copy.compareColumnReturn)} / ${esc(copy.compareColumnRelative)}</small></th>`).join('')}</tr></thead><tbody>${tickers.map(t=>{const a=byTicker[t];return `<tr class="${t==='NVDA'?'benchmark-row':''}"><td><strong>${t}</strong></td>${returnKeys.map(k=>`<td><strong class="${sign(a[k])}">${pct(a[k])}</strong><small>${a[k]==null?'\u2014':signed(a[k]-nvda[k],'relative')+' '+copy.relativeUnit}</small></td>`).join('')}</tr>`;}).join('')}</tbody></table>`;
}
q('#compare-open').addEventListener('click',()=>{comparePeriod=0;q('#compare-dialog').showModal();renderCompare();});
q('#compare-period').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(b){comparePeriod=Number(b.dataset.period);renderCompare();}});
q('#compare-chips').addEventListener('click',e=>{const b=e.target.closest('[data-compare-remove]');if(b){chosen.delete(b.dataset.compareRemove);renderExplorer();renderCompare();}});
q('#compare-close').addEventListener('click',()=>q('#compare-dialog').close());

let researchSample='all';
const completeAssets=assets.filter(a=>a.total!=null&&a.d1!=null&&a.rally!=null&&a.d2!=null);
function researchTokens(){
  const category=Object.fromEntries(research.categories.map(c=>[c.group,c]));
  const quartiles=research.samples[researchSample].quartiles;
  const low=quartiles[0],high=quartiles[3],msft=byTicker.MSFT,tem=byTicker.TEM,sndk=byTicker.SNDK;
  return {
    sampleName:copy.research.sampleLabels[researchSample==='all'?0:1],sampleN:research.samples[researchSample].n,
    nvdaTotal:pct(nvda.total),above:research.aboveNvdaCount,
    agentTotal:pct(category['agent-infra'].total),agentPositive:category['agent-infra'].positive,agentCount:category['agent-infra'].n,
    neoTotal:pct(category.neocloud.total),opticalTotal:pct(category['optical-interconnect'].total),memoryTotal:pct(category['memory-storage'].total),computePositive:category.compute.positive,computeCount:category.compute.n,
    upperRally:pct(high.rally),upperD2:pct(high.d2),lowerD2:pct(low.d2),upperVol:plain(high.vol),lowerVol:plain(low.vol),rhoAll:research.samples.all.spearman.toFixed(2),rhoEquity:research.samples.equities.spearman.toFixed(2),
    msftRally:pct(msft.rally),msftMonth:pct(msft.monthRally),nvdaMonth:pct(nvda.monthRally),crmRatio:(byTicker.CRM.vol/nvda.vol).toFixed(1),pltrRatio:(byTicker.PLTR.vol/nvda.vol).toFixed(1),oktaRatio:(byTicker.OKTA.vol/nvda.vol).toFixed(1),
    temEnd:(100+tem.total).toFixed(1),sndkEnd:(100+sndk.total).toFixed(1),temRetained:plain(tem.retainedRally),sndkRetained:plain(sndk.retainedRally),nvdaRetained:plain(nvda.retainedRally),temDD:plain(Math.abs(tem.mdd2)),nvdaDD:plain(Math.abs(nvda.mdd2))
  };
}
const fillResearch=text=>{const tokens=researchTokens();return text.replace(/\{(\w+)\}/g,(_,key)=>tokens[key]);};
const researchTable=(columns,rows)=>`<table class="research-table"><thead><tr>${columns.map((label,i)=>`<th scope="col" class="${i?'numeric-cell':''}">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
const metricCell=(value,asPlain=false)=>`<td class="numeric-cell ${asPlain?'':sign(value)}">${asPlain?plain(value):pct(value)}</td>`;
function renderResearch(){
  const r=copy.research;
  const cardValues=[`${research.positiveCount}<small> / ${research.completeCount}</small>`,pct(research.medianTotal),`${research.rallyLostCount}<small> / ${research.rallyPositiveCount}</small>`];
  q('#research-cards').innerHTML=r.cards.map((card,i)=>`<article><span>${esc(card.label)}</span><strong>${cardValues[i]}</strong><p>${esc(fillResearch(card.note))}</p></article>`).join('');
  ['category','tradeoff','robust','retention'].forEach(key=>q(`#${key}-body`).textContent=fillResearch(r[key+'Body']));
  q('#category-table').innerHTML=researchTable(r.categoryColumns,research.categories.map(c=>`<tr><th scope="row"><i class="category-dot" style="background:${groupColor(c.group)}"></i>${esc(copy.groups[c.group])}</th><td class="numeric-cell">${c.n} / ${c.totalN}</td>${['d1','rally','d2','total'].map(key=>`<td class="numeric-cell ${sign(c[key])}" style="background:rgba(${c[key]>=0?'19,124,112':'184,94,71'},${Math.min(.16,Math.abs(c[key])/350)})">${pct(c[key])}</td>`).join('')}<td class="numeric-cell">${c.positive} / ${c.n}</td></tr>`));
  q('#research-sample').innerHTML=['all','equities'].map((key,i)=>`<button type="button" data-sample="${key}" aria-pressed="${researchSample===key}">${esc(r.sampleLabels[i])} (${research.samples[key].n})</button>`).join('');
  q('#quartile-table').innerHTML=researchTable(r.quartileColumns,research.samples[researchSample].quartiles.map(c=>`<tr><th scope="row">${esc(r.quartileNames[c.q])}</th><td class="numeric-cell">${c.n}</td>${['rally','d2','total','vol'].map(key=>metricCell(c[key],key==='vol')).join('')}</tr>`));
  q('#robust-table').innerHTML=researchTable(r.robustColumns,['NVDA',...research.leaders].map(t=>{const a=byTicker[t];return `<tr class="${t==='NVDA'?'benchmark-row':''}"><th scope="row">${assetLabel(a)}</th>${['d1','rally','d2','total','vol','monthRally'].map(key=>metricCell(a[key],key==='vol')).join('')}</tr>`;}));
  q('#retention-table').innerHTML=researchTable(r.retentionColumns,['NVDA','TEM','SNDK','LITE','CRWV','KXIAY'].map(t=>{const a=byTicker[t],value=100+a.total;return `<tr class="${t==='NVDA'?'benchmark-row':''}"><th scope="row">${assetLabel(a)}</th><td class="numeric-cell capital-cell"><span class="capital-bar" style="width:${value/160*100}%;background:${a.total>=0?'var(--teal)':'var(--coral)'}"></span><b>${value.toFixed(1)}</b></td>${metricCell(a.rally)}${metricCell(a.repair,true)}${metricCell(a.retainedRally,true)}${metricCell(a.mdd2)}</tr>`;}));
  renderScatter();
}
function renderScatter(){
  const svg=q('#research-scatter'),w=q('#scatter-box').clientWidth,h=w<600?350:410;
  if(w<100)return;
  const margin={l:46,r:20,t:37,b:52},r=copy.research;
  const shown=completeAssets.filter(a=>researchSample==='all'||a.kind==='equity');
  const xmin=Math.floor(Math.min(0,...completeAssets.map(a=>a.rally))/20)*20;
  const xmax=Math.ceil(Math.max(...completeAssets.map(a=>a.rally))/20)*20;
  const ymin=Math.floor(Math.min(...completeAssets.map(a=>a.d2))/10)*10;
  const ymax=Math.ceil(Math.max(0,...completeAssets.map(a=>a.d2))/10)*10;
  const x=v=>margin.l+(v-xmin)/(xmax-xmin)*(w-margin.l-margin.r),y=v=>h-margin.b-(v-ymin)/(ymax-ymin)*(h-margin.t-margin.b);
  let out=`<rect x="${x(nvda.rally)}" y="${margin.t}" width="${x(xmax)-x(nvda.rally)}" height="${y(nvda.d2)-margin.t}" fill="#137c70" opacity=".045"/><text x="${margin.l}" y="16" class="axis-label">${esc(r.scatterY)}</text><text x="${(w+margin.l-margin.r)/2}" y="${h-6}" text-anchor="middle" class="axis-label">${esc(r.scatterX)}</text>`;
  for(let value=xmin;value<=xmax;value+=20)out+=`<line x1="${x(value)}" x2="${x(value)}" y1="${margin.t}" y2="${h-margin.b}" stroke="#d8ded6"/><text x="${x(value)}" y="${h-margin.b+21}" text-anchor="middle">${value}</text>`;
  for(let value=ymin;value<=ymax;value+=10)out+=`<line x1="${margin.l}" x2="${w-margin.r}" y1="${y(value)}" y2="${y(value)}" stroke="#d8ded6"/><text x="${margin.l-9}" y="${y(value)+4}" text-anchor="end">${value}</text>`;
  out+=`<path d="M${x(nvda.rally)},${margin.t} V${h-margin.b} M${margin.l},${y(nvda.d2)} H${w-margin.r}" stroke="#172b2c" opacity=".5" stroke-dasharray="4 5" fill="none"/>`;
  [...shown].sort((a,b)=>a.ticker==='NVDA'?1:b.ticker==='NVDA'?-1:0).forEach(a=>{
    const label=`${a.ticker} / ${assetName(a)}: ${r.scatterX} ${pct(a.rally)}, ${r.scatterY} ${pct(a.d2)}`;
    out+=`<circle data-detail="${a.ticker}" data-rally="${a.rally}" data-phase3="${a.d2}" cx="${x(a.rally)}" cy="${y(a.d2)}" r="${a.ticker==='NVDA'?6:4.8}" fill="${a.ticker==='NVDA'?colors.NVDA:groupColor(a.groups[0])}" fill-opacity=".85" stroke="var(--paper)" stroke-width="1" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title></circle>`;
  });
  out+=`<text x="${x(nvda.rally)+9}" y="${y(nvda.d2)-10}" class="scatter-benchmark">NVDA</text>`;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.height=h+'px';svg.innerHTML=out;
}
q('#research-sample').addEventListener('click',e=>{const b=e.target.closest('[data-sample]');if(b){researchSample=b.dataset.sample;renderResearch();}});
q('#analysis').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)openDetail(b.dataset.detail);});
q('#research-scatter').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-detail]')){e.preventDefault();openDetail(e.target.dataset.detail);}});

let activeDetailTicker=null;
function openDetail(t){
  activeDetailTicker=t;
  const a=byTicker[t];
  q('#dialog-group').textContent=groupLabels(a);q('#dialog-title').textContent=a.ticker;q('#dialog-name').textContent=assetName(a);
  q('#dialog-phases').innerHTML=['d1','rally','d2'].map((key,i)=>{const delta=a[key]==null?null:a[key]-nvda[key];return `<div class="dialog-phase"><span>${esc(copy.phaseNames[i])}</span><strong class="${sign(a[key])}">${pct(a[key])}</strong><p>${delta==null?esc(copy.unavailable):esc(copy.detailVs)+' '+(delta>=0?'+':'')+delta.toFixed(1)+' '+esc(copy.detailPp)}</p></div>`;}).join('');
  const values=[pct(a.v5),pct(a.v10),a.rally==null?copy.unavailable:a.days10==null?copy.notReached:a.days10+' '+copy.tradingDays,a.rally==null?copy.unavailable:a.days20==null?copy.notReached:a.days20+' '+copy.tradingDays,pct(a.mdd2),plain(a.retainedRally),pct(a.oct),pct(a.monthRally)];
  q('#detail-grid').innerHTML=values.map((v,i)=>`<div class="detail-item"><span>${esc(copy.detailLabels[i])}</span><strong class="${i===2||i===3?'text-value':''}">${esc(v)}</strong></div>`).join('');
  q('#asset-dialog [data-copy=detailFootnote]').textContent=copy.detailFootnote+' '+copy.quoteTimeLabel+': '+a.priceDate+'. '+(copy.quoteNotes[a.ticker]||'');
  if(!q('#asset-dialog').open)q('#asset-dialog').showModal();
}
q('#dialog-close').addEventListener('click',()=>q('#asset-dialog').close());
q('#asset-dialog').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});


function downloadPublicData(list=assets){
  const headers=['ticker','name','theme','first_phase_pct','rebound_pct','second_phase_close_pct','rebound_profit_retained_pct','total_pct','october_close_pct','rebound_first_5_days_pct','rebound_first_10_days_pct','annualized_volatility_pct','second_phase_max_drawdown_pct','recovered_first_loss_pct','rebound_from_july31_pct','closing_date'];
  const csvCell=v=>v==null?'':`"${String(v).replace(/"/g,'""')}"`;
  const rows=list.map(a=>[a.ticker,assetName(a),groupLabels(a),a.d1,a.rally,a.d2,a.retainedRally,a.total,a.oct,a.v5,a.v10,a.vol,a.mdd2,a.repair,a.monthRally,a.priceDate].map(csvCell).join(','));
  const blob=new Blob(['\ufeff'+headers.join(',')+'\r\n'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ai-equities-three-phases-public.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

q('#download-all').addEventListener('click',()=>downloadPublicData());
q('#download-filtered').addEventListener('click',()=>downloadPublicData(filtered));
q('#print').addEventListener('click',()=>window.print());
function renderLocale(){
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.title=copy.title;
  q('meta[name=description]').content=copy.metaDescription;
  document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=getCopy(el.dataset.copy));
  document.querySelectorAll('[data-aria-copy]').forEach(el=>el.setAttribute('aria-label',getCopy(el.dataset.ariaCopy)));
  document.querySelectorAll('[data-title-copy]').forEach(el=>el.title=getCopy(el.dataset.titleCopy));
  q('#language-toggle').lang=language==='zh'?'en':'zh-CN';
  q('#overview-search').placeholder=copy.overviewPlaceholder;
  q('#table-search').placeholder=copy.searchPlaceholder;
  q('#dialog-close').ariaLabel=copy.close;
  q('#compare-close').ariaLabel=copy.compareClose;
  const selectedGroup=q('#group-filter').value||'all';
  q('#group-filter').innerHTML=`<option value="all">${esc(copy.allGroups)}</option>`+groupKeys.map(g=>`<option value="${esc(g)}">${esc(copy.groups[g])}</option>`).join('');
  q('#sort-key').innerHTML=['ticker',...returnKeys,'vol'].map((k,i)=>`<option value="${k}">${esc(copy.sortOptions[i])}</option>`).join('');
  q('#sort-order').innerHTML=copy.orderOptions.map((label,i)=>`<option value="${i===0?-1:1}">${esc(label)}</option>`).join('');
  q('#group-filter').value=selectedGroup;
  renderPhases();
  renderOverview();renderExplorer();renderResearch();
  if(q('#asset-dialog').open&&activeDetailTicker)openDetail(activeDetailTicker);
  if(q('#compare-dialog').open)renderCompare();
}
q('#language-toggle').addEventListener('click',()=>{
  language=language==='zh'?'en':'zh';
  copy=translations[language];
  saveLanguagePreference(language);
  renderLocale();
});
renderLocale();
let resizeTimer;
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{renderOverview();renderScatter();if(q('#compare-dialog').open)renderCompare();},70);}).observe(q('#overview-box'));
