'use strict';
const copy=JSON.parse(document.getElementById('public-content').textContent);
const dataset=JSON.parse(document.getElementById('public-data').textContent);
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
document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=getCopy(el.dataset.copy));
document.title=copy.title;
q('#overview-search').placeholder=copy.overviewPlaceholder;
q('#table-search').placeholder=copy.searchPlaceholder;
q('#dialog-close').ariaLabel=copy.close;
q('#compare-close').ariaLabel=copy.compareClose;
const groupKeys=Object.keys(copy.groups);
const palette=['#4d7999','#bd8050','#8a719d','#288779','#708749','#b86c60','#548c9e','#8d887c'];
const groupColor=g=>palette[groupKeys.indexOf(g)];
const colors={NVDA:'#172b2c',MSFT:'#197b9e',PLTR:'#1b8e72',LITE:'#216f99',SNDK:'#b55b50',NBIS:'#8b72a4',MRVL:'#b18a37',BE:'#b2683f',NET:'#318c76',SNOW:'#497e9d',ORCL:'#b96c4e',NOW:'#728349'};
const comparePalette=['#147c69','#bd6b43','#2c78a1','#88649a','#ad913d','#547d48','#b9547e','#6e6e9e'];
const colorFor=(t,i=0)=>t==='NVDA'?colors.NVDA:comparePalette[Math.max(0,i-1)%comparePalette.length];
const moneyPath=t=>{const a=byTicker[t];return [100,100*(1+a.d1/100),100*(1+a.d1/100)*(1+a.rally/100),100*(1+a.total/100)];};
const windows=[['2026-06-30','2026-10-30'],['2026-06-30','2026-07-29'],['2026-07-29','2026-09-22'],['2026-09-22','2026-10-30']];
const returnKeys=['d1','rally','d2','total'];
const periodButtons=(prefix,active)=>copy.periodNames.map((name,i)=>`<button type="button" data-period="${i}" aria-pressed="${active===i}">${esc(name)}</button>`).join('');
const searchMatches=(a,text)=>{const terms=text.toLowerCase().split(/[,\uFF0C;\uFF1B\s]+/).filter(Boolean);return !terms.length||terms.some(term=>byTicker[term.toUpperCase()]?a.ticker===term.toUpperCase():`${a.ticker} ${a.name} ${copy.groups[a.group]}`.toLowerCase().includes(term));};
const benchmarkFirst=list=>[...list].sort((a,b)=>a.ticker==='NVDA'?-1:b.ticker==='NVDA'?1:a.ticker.localeCompare(b.ticker));
q('#phase-grid').innerHTML=copy.phaseNames.map((name,i)=>`<article class="phase"><div><span class="phase-index">PHASE 0${i+1}</span><h3>${esc(name)}</h3><time>${esc(copy.phaseRanges[i])}</time></div><div class="phase-value ${sign([nvda.d1,nvda.rally,nvda.d2][i])}">${pct([nvda.d1,nvda.rally,nvda.d2][i])}<small>NVDA</small></div></article>`).join('');

const geometries={};
function renderLineChart(prefix,tickers,period,useGroups){
  const svg=q(`#${prefix}-chart`),box=q(`#${prefix}-box`),w=box.clientWidth,h=box.clientHeight;
  if(w<100)return;
  const margin={l:44,r:25,t:55,b:31};
  const [start,end]=windows[period],startIndex=dataset.dates.indexOf(start),endIndex=dataset.dates.indexOf(end);
  const dates=dataset.dates.slice(startIndex,endIndex+1);
  const late=[],missing=[];
  const series=tickers.map((ticker,i)=>{
    const raw=dataset.series[ticker].slice(startIndex,endIndex+1),first=raw.findIndex(v=>v!=null);
    if(first<0){missing.push(ticker);return null;}
    if(first>0)late.push(ticker);
    return {ticker,color:ticker==='NVDA'?colors.NVDA:useGroups?groupColor(byTicker[ticker].group):colorFor(ticker,i),values:raw.map(v=>v==null?null:v/raw[first]*100),start:dates[first],late:first>0};
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
    const lastIsLive=end==='2026-10-30';
    const n=s.values.length-(lastIsLive?1:0);
    s.path=s.values.slice(0,n).map((v,i)=>{if(v==null){started=false;return '';}const part=`${started?'L':'M'}${xx(dates[i]).toFixed(2)},${yy(v).toFixed(2)}`;started=true;return part;}).join(' ');
    s.opacity=s.ticker==='NVDA'?1:crowded?.32:.8;
    s.width=s.ticker==='NVDA'?2.8:crowded?1.15:1.8;
    out+=`<path class="price-line" data-ticker="${s.ticker}" d="${s.path}" fill="none" stroke="${s.color}" stroke-width="${s.width}" opacity="${s.opacity}" stroke-linejoin="round" ${s.late?'stroke-dasharray="5 3"':''}/>`;
    const last=s.values.at(-1),prev=s.values.at(-2);
    if(lastIsLive&&last!=null&&prev!=null)out+=`<path d="M${xx(dates.at(-2))},${yy(prev)} L${xx(end)},${yy(last)}" fill="none" stroke="${s.color}" opacity="${s.opacity}" stroke-width="1.5" stroke-dasharray="2 3"/>`;
    if(last!=null)out+=`<circle cx="${xx(end)}" cy="${yy(last)}" r="${s.ticker==='NVDA'?3.6:2}" fill="${lastIsLive?'#f0f2eb':s.color}" stroke="${s.color}" opacity="${s.opacity}" stroke-width="1.4"/>`;
  });
  out+='<g class="hover-layer"></g>';
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=out;
  geometries[prefix]={w,h,margin,xx,yy,dates,series,svg};
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
    const ix=g.dates.reduce((best,d,i)=>Math.abs(g.xx(d)-px)<Math.abs(g.xx(g.dates[best])-px)?i:best,0);
    const available=g.series.filter(s=>s.values[ix]!=null);if(!available.length)return;
    const closest=available.reduce((best,s)=>Math.abs(g.yy(s.values[ix])-py)<Math.abs(g.yy(best.values[ix])-py)?s:best,available[0]);
    highlightLine(prefix,closest.ticker);
    const display=[closest,...available.filter(s=>s.ticker==='NVDA'&&s!==closest)],x=g.xx(g.dates[ix]);
    g.svg.querySelector('.hover-layer').innerHTML=`<path d="${closest.path}" fill="none" stroke="${closest.color}" stroke-width="2.5"/><line x1="${x}" y1="${g.margin.t}" x2="${x}" y2="${g.h-g.margin.b}" stroke="#65716d" stroke-dasharray="3 5"/>`+display.map(s=>`<circle cx="${x}" cy="${g.yy(s.values[ix])}" r="4" fill="${s.color}"/>`).join('');
    const tip=q(`#${prefix}-tooltip`);
    tip.innerHTML=`<strong>${g.dates[ix]}${g.dates[ix]==='2026-10-30'?' / '+byTicker[closest.ticker].quoteTime.slice(11)+' ET':''}</strong><p>${esc(byTicker[closest.ticker].name)}</p>`+display.map(s=>`<div><span><i style="background:${s.color}"></i>${s.ticker}${s.late?'*':''}</span><b>${s.values[ix].toFixed(1)}</b></div>`).join('');
    tip.hidden=false;tip.style.left=Math.max(0,Math.min(x+(x<g.w*.55?14:-tip.offsetWidth-14),g.w-tip.offsetWidth))+'px';
  });
  q(`#${prefix}-chart`).addEventListener('pointerleave',()=>restoreLines(prefix));
}
bindChart('overview');bindChart('compare');

let overviewGroup='all',overviewPeriod=0;
const overviewHidden=new Set();
function renderOverview(){
  const matches=benchmarkFirst(assets.filter(a=>(overviewGroup==='all'||a.group===overviewGroup)&&searchMatches(a,q('#overview-search').value)));
  const shown=matches.filter(a=>a.ticker==='NVDA'||!overviewHidden.has(a.ticker));
  const tickers=[...new Set(['NVDA',...shown.map(a=>a.ticker)])];
  q('#overview-groups').innerHTML=`<button type="button" data-group="all" aria-pressed="${overviewGroup==='all'}">${esc(copy.allThemes)} <small>${assets.length}</small></button>`+groupKeys.map(g=>`<button type="button" data-group="${esc(g)}" aria-pressed="${overviewGroup===g}"><i style="background:${groupColor(g)}"></i>${esc(copy.groups[g])}<small>${assets.filter(a=>a.group===g).length}</small></button>`).join('');
  q('#overview-period').innerHTML=periodButtons('overview',overviewPeriod);
  const result=renderLineChart('overview',tickers,overviewPeriod,true);
  q('#overview-count').textContent=`${result?.series.length||0} / ${assets.length} ${copy.overviewCount} \u00b7 NVDA ${copy.benchmark}`;
  q('#overview-assets').innerHTML=matches.length?matches.map(a=>`<button type="button" class="asset-chip" data-overview="${a.ticker}" aria-pressed="${!overviewHidden.has(a.ticker)}" title="${esc(a.name)}" ${a.ticker==='NVDA'?'aria-disabled="true"':''}><i style="background:${a.ticker==='NVDA'?colors.NVDA:groupColor(a.group)}"></i><strong>${a.ticker}${dataset.series[a.ticker][0]==null?'*':''}</strong><span>${esc(a.name)}</span></button>`).join(''):`<p class="note">${esc(copy.overviewNoMatch)}</p>`;
}
q('#overview-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b){overviewGroup=b.dataset.group;renderOverview();}});
q('#overview-search').addEventListener('input',renderOverview);
q('#overview-period').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(b){overviewPeriod=Number(b.dataset.period);renderOverview();}});
q('#overview-assets').addEventListener('click',e=>{const b=e.target.closest('[data-overview]');if(!b||b.dataset.overview==='NVDA')return;const t=b.dataset.overview;if(overviewHidden.has(t))overviewHidden.delete(t);else overviewHidden.add(t);renderOverview();});
q('#overview-assets').addEventListener('pointerover',e=>{const b=e.target.closest('[data-overview]');if(b)highlightLine('overview',b.dataset.overview);});
q('#overview-assets').addEventListener('pointerout',()=>restoreLines('overview'));
q('#overview-reset').addEventListener('click',()=>{overviewGroup='all';overviewPeriod=0;overviewHidden.clear();q('#overview-search').value='';renderOverview();});

let sortKey='total',sortDirection=-1,dataView='chart',dataMode='absolute',filtered=[];
const chosen=new Set();
q('#group-filter').innerHTML=`<option value="all">${esc(copy.allGroups)}</option>`+groupKeys.map(g=>`<option value="${esc(g)}">${esc(copy.groups[g])}</option>`).join('');
q('#sort-key').innerHTML=['ticker',...returnKeys,'vol'].map((k,i)=>`<option value="${k}">${esc(copy.sortOptions[i])}</option>`).join('');
q('#sort-order').innerHTML=copy.orderOptions.map((label,i)=>`<option value="${i===0?-1:1}">${esc(label)}</option>`).join('');
const valueFor=(a,key)=>a[key]==null?null:a[key]-(dataMode==='relative'&&returnKeys.includes(key)?nvda[key]:0);
function selectionBox(a){return `<input type="checkbox" data-select="${a.ticker}" aria-label="${esc(copy.checkboxSelect+' '+a.ticker)}" ${chosen.has(a.ticker)?'checked':''}>`;}
function assetLabel(a){return `<button class="asset-button" type="button" data-detail="${a.ticker}" aria-label="${esc(a.ticker+' '+copy.more)}"><span class="asset-name-line"><strong>${a.ticker}</strong>${a.ticker==='NVDA'?`<small class="benchmark-label">${esc(copy.benchmark)}</small>`:''}</span><span class="asset-subtitle">${esc(a.name)}</span></button>`;}
function renderExplorer(){
  filtered=assets.filter(a=>(q('#group-filter').value==='all'||a.group===q('#group-filter').value)&&searchMatches(a,q('#table-search').value));
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
  q('#table-body').innerHTML=filtered.length?filtered.map(a=>`<tr class="${a.ticker==='NVDA'?'benchmark-row':''} ${chosen.has(a.ticker)?'is-selected':''}"><td class="check-cell">${selectionBox(a)}</td><td>${assetLabel(a)}<span class="asset-category">${esc(copy.groups[a.group])}</span></td>${keys.slice(1).map(k=>`<td class="numeric-cell ${k==='vol'?'':sign(valueFor(a,k))}">${k==='vol'?plain(a[k]):signed(valueFor(a,k),dataMode)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="7" class="no-results">${esc(copy.noResults)}</td></tr>`;
}
function renderSelection(){
  q('#selection-count').textContent=chosen.size?`${copy.selectedCount} ${chosen.size} ${copy.selectedUnit}`:copy.selectionHint;
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

function renderRecovery(){
  q('#recovery-grid').innerHTML=['TEM','LITE','DELL','MU','SNDK','KXIAY'].map(t=>{
    const a=byTicker[t],vals=moneyPath(t),xs=[30,166,302,438],yy=v=>111-(v-35)*.8;
    return `<article class="recovery-item"><div class="recovery-title"><strong>${t}</strong><span>${esc(copy.repairRally)} <b>${pct(a.rally)}</b></span></div><svg viewBox="0 0 468 150" role="img" aria-label="${t}: ${vals.map(v=>v.toFixed(1)).join(', ')}"><line x1="20" y1="${yy(100)}" x2="448" y2="${yy(100)}" stroke="#aab8a9" stroke-dasharray="3 5"/><path d="${vals.map((v,i)=>`${i?'L':'M'}${xs[i]},${yy(v)}`).join(' ')}" fill="none" stroke="${a.repair>=100?'#137c70':'#9b7660'}" stroke-width="2.3"/>${vals.map((v,i)=>`<circle cx="${xs[i]}" cy="${yy(v)}" r="4" fill="${i===3?'#fcfbf8':a.repair>=100?'#137c70':'#9b7660'}" stroke="${a.repair>=100?'#137c70':'#9b7660'}" stroke-width="1.5"/><text x="${xs[i]}" y="${yy(v)-13}" text-anchor="middle" fill="#172b2c" class="recovery-value">${v.toFixed(1)}</text><text x="${xs[i]}" y="140" text-anchor="middle" fill="#65716d" class="recovery-date">${['6/30','7/29','9/22','10/30'][i]}</text>`).join('')}</svg><div class="recovery-summary"><span>${esc(copy.repairRecovery)}</span><strong>${a.repair.toFixed(1)}%</strong></div></article>`;
  }).join('');
}
function renderBars(target,tickers,keyA,keyB){
  const max=Math.max(...tickers.flatMap(t=>[byTicker[t][keyA],byTicker[t][keyB]]))*1.08;
  q(target).innerHTML=tickers.map(t=>`<div class="bar-row"><strong>${t}</strong><div>${[keyA,keyB].map((k,i)=>`<div class="bar-track"><div class="bar-fill ${i?'all':'ten'}" style="width:${Math.max(0,byTicker[t][k])/max*100}%"><span>${pct(byTicker[t][k])}</span></div></div>`).join('')}</div></div>`).join('');
}

function openDetail(t){
  const a=byTicker[t];
  q('#dialog-group').textContent=copy.groups[a.group];q('#dialog-title').textContent=a.ticker;q('#dialog-name').textContent=a.name;
  q('#dialog-phases').innerHTML=['d1','rally','d2'].map((key,i)=>{const delta=a[key]==null?null:a[key]-nvda[key];return `<div class="dialog-phase"><span>${esc(copy.phaseNames[i])}</span><strong class="${sign(a[key])}">${pct(a[key])}</strong><p>${delta==null?esc(copy.unavailable):esc(copy.detailVs)+' '+(delta>=0?'+':'')+delta.toFixed(1)+' '+esc(copy.detailPp)}</p></div>`;}).join('');
  const values=[pct(a.v5),pct(a.v10),a.rally==null?copy.unavailable:a.days10==null?copy.notReached:a.days10+' '+copy.tradingDays,a.rally==null?copy.unavailable:a.days20==null?copy.notReached:a.days20+' '+copy.tradingDays,pct(a.mdd2),pct(a.d2Close),pct(a.oct),pct(a.monthRally)];
  q('#detail-grid').innerHTML=values.map((v,i)=>`<div class="detail-item"><span>${esc(copy.detailLabels[i])}</span><strong class="${i===2||i===3?'text-value':''}">${esc(v)}</strong></div>`).join('');
  q('#asset-dialog [data-copy=detailFootnote]').textContent=copy.detailFootnote+' '+copy.quoteTimeLabel+': '+a.quoteTime+' ET. '+(copy.quoteNotes[a.ticker]||'');
  q('#asset-dialog').showModal();
}
q('#dialog-close').addEventListener('click',()=>q('#asset-dialog').close());
q('#asset-dialog').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});


function downloadPublicData(list=assets){
  const headers=['ticker','name','theme','first_phase_pct','rebound_pct','second_phase_intraday_pct','second_phase_close_oct29_pct','total_pct','october_intraday_pct','rebound_first_5_days_pct','rebound_first_10_days_pct','annualized_volatility_pct','second_phase_max_drawdown_pct','recovered_first_loss_pct','rebound_from_july31_pct','quote_time_ET'];
  const csvCell=v=>v==null?'':`"${String(v).replace(/"/g,'""')}"`;
  const rows=list.map(a=>[a.ticker,a.name,copy.groups[a.group],a.d1,a.rally,a.d2,a.d2Close,a.total,a.oct,a.v5,a.v10,a.vol,a.mdd2,a.repair,a.monthRally,a.quoteTime].map(csvCell).join(','));
  const blob=new Blob(['\ufeff'+headers.join(',')+'\r\n'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ai-equities-three-phases-public.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

q('#download-all').addEventListener('click',()=>downloadPublicData());
q('#download-filtered').addEventListener('click',()=>downloadPublicData(filtered));
q('#print').addEventListener('click',()=>window.print());
q('#lenses').innerHTML=copy.lenses.map(l=>`<article class="lens"><span class="lens-no">${l.no}</span><h3>${esc(l.label)}</h3><div class="lens-tickers">${esc(l.tickers)}</div><p>${esc(l.body)}</p></article>`).join('');
renderRecovery();renderBars('#speed-chart',['NVDA','TEAM','CRM','PLTR','TEM','LITE','AMD','CRWV','AAOI','NBIS'],'v10','rally');renderBars('#sensitivity-chart',['NVDA','MSFT','CRM','TEAM','PLTR','TEM'],'rally','monthRally');renderOverview();renderExplorer();
let resizeTimer;
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{renderOverview();if(q('#compare-dialog').open)renderCompare();},70);}).observe(q('#overview-box'));
