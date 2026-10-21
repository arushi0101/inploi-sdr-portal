(function(){
document.head.insertAdjacentHTML('beforeend',"<style>.main-inner{max-width:none}button.num{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;border-bottom:1px dashed var(--muted);line-height:1.1}button.num:hover{color:var(--link);border-bottom-color:var(--link)}.kpi b button.num{border-bottom-width:2px}.dr{position:fixed;inset:0;z-index:50;display:flex;justify-content:flex-end;background:rgba(19,18,17,.45)}.dr-panel{background:var(--bg);width:min(680px,100%);height:100%;overflow-y:auto;box-shadow:-10px 0 30px rgba(0,0,0,.18);display:flex;flex-direction:column}.dr-head{position:sticky;top:0;background:var(--surface);border-bottom:1px solid var(--line);padding:16px 22px;display:grid;gap:6px;z-index:1}.dr-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.dr-head h2{font-size:1.25rem}.dr-x{background:none;border:1px solid var(--line);color:var(--fg);padding:4px 10px;cursor:pointer;font-size:.8rem;flex:none}.dr-back{background:none;border:0;color:var(--link);cursor:pointer;padding:0;font-size:.8rem;justify-self:start}.dr-sub{font-size:.82rem;color:var(--muted)}.dr-body{padding:18px 22px 48px;display:grid;gap:16px;align-content:start}.dr-search{width:100%;padding:8px 10px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font:inherit;font-size:.88rem}.co-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);background:var(--surface)}.co-list button{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:10px 14px;cursor:pointer;color:var(--fg)}.co-list li:last-child button{border-bottom:0}.co-list button:hover{background:var(--accent-soft)}.co-list b{font-weight:600}.co-list small{color:var(--muted);font-size:.78rem}.co-list .go{color:var(--link);font-size:.8rem;align-self:center;grid-row:span 2}.j-facts{display:flex;flex-wrap:wrap;gap:6px}.j-facts span{font-size:.76rem;border:1px solid var(--line);background:var(--surface);padding:3px 9px;color:var(--muted)}.j-facts b{color:var(--fg);font-weight:600}.j-stats{display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line)}.j-stats div{flex:1 1 108px;background:var(--surface);padding:10px 12px;display:grid;gap:2px;align-content:start}.j-stats b{font-size:1.3rem;font-family:var(--f-display);line-height:1.2}.j-stats span{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}.j-stats em{font-style:normal;font-size:.76rem;color:var(--muted)}.j-filter{display:flex;flex-wrap:wrap;gap:4px}.j-filter button{background:var(--surface);border:1px solid var(--line);color:var(--fg);padding:4px 10px;font-size:.78rem;cursor:pointer}.j-filter button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}.j-month{font-size:.7rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:4px 0 -4px}.tl{list-style:none;margin:0;padding:0 0 0 20px;border-left:2px solid var(--line);display:grid;gap:14px}.tl li{position:relative;display:grid;gap:3px}.tl li::before{content:'';position:absolute;left:-26px;top:5px;width:10px;height:10px;background:var(--s-noans);outline:3px solid var(--bg)}.tl li.conv::before,.tl li.reply::before{background:var(--s-conv)}.tl li.meeting::before{background:var(--s-bot)}.tl li.deal::before{background:#2F9E6B}.tl li.note::before{background:var(--s-other)}.tl li.email::before{background:#F0B354}.tl .k{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--muted)}.tl li.conv .k,.tl li.reply .k{color:var(--link)}.tl .ttl{font-size:.92rem}.tl .meta{font-size:.76rem;color:var(--muted)}.tl .body{font-size:.83rem;color:var(--muted);background:var(--surface);border:1px solid var(--line);padding:8px 10px;white-space:pre-wrap}.j-people{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.82rem}.j-people span{color:var(--muted)}.dr-load{color:var(--muted);font-size:.9rem;padding:20px 0}.card-filter{max-width:340px}.dt-filters{display:flex;flex-wrap:wrap;gap:10px 14px;padding:12px;background:var(--surface);border:1px solid var(--line)}.dt-f{display:grid;gap:3px;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;min-width:0}.dt-f select,.dt-f input{font:inherit;font-size:.82rem;text-transform:none;letter-spacing:0;font-weight:400;color:var(--fg);background:var(--bg);border:1px solid var(--line);padding:5px 6px;max-width:220px;min-width:0}.dt-f .on{border-color:var(--accent);background:var(--accent-soft)}.dt-fd{grid-template-columns:auto auto auto;align-items:center;column-gap:6px}.dt-fd span{grid-column:1/-1}.dt-fd em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:400}.dt tfoot td{font-weight:700;border-top:2px solid var(--line)}.nav .nav-group .chev{font-size:.7rem;color:var(--rail-muted);transition:transform .15s}.nav .nav-group[aria-expanded=false] .chev{transform:rotate(-90deg)}.nav .nav-group.has-current{color:#fff}.nav-sub{display:grid;gap:2px}.nav-sub button{padding-left:22px!important;font-size:.86rem!important}.card-filter-n{margin-top:-8px}.c-notint{background:var(--s-none)}.bar span[data-drill]{cursor:pointer}.bar span[data-drill]:hover{opacity:.72;outline:2px solid var(--fg);outline-offset:-2px}@media (max-width:620px){.dr-head,.dr-body{padding-left:16px;padding-right:16px}}</style>");
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
var co=function(id){return HS+'0-2/'+id;}, dl=function(id){return HS+'0-3/'+id;};

var VIEWS=[
 {k:'overview',label:'Overview',title:'Overview'},
 {k:'daily',label:'Daily report',title:'Daily report',group:'ov'},
 {k:'weekly',label:'Weekly report',title:'Weekly report',group:'ov'},
 {k:'monthly',label:'Monthly report',title:'Monthly report',group:'ov'},
 {k:'fixes',label:'Data fixes',title:'Data fixes'},
 {k:'matt',label:'Matt\u2019s dashboard',title:'Matt\u2019s dashboard'},
 {k:'meetings',label:'Meetings',title:'Meetings booked'},
 {k:'calls',label:'Calls',title:'Calls'},
 {k:'outreach',label:'Emails & sequences',title:'Emails, sequences and channel mix'},
 {k:'accounts',label:'Accounts & engagement',title:'Accounts and engagement'},
 {k:'pipeline',label:'Pipeline & revenue',title:'Pipeline and revenue'},
 {k:'review',label:'Weekly review',title:'Weekly review'},
 {k:'kb',label:'Knowledge base',title:'Knowledge base: keeping HubSpot accurate',group:'res'},
 {k:'defs',label:'Definitions',title:'Definitions',group:'res'}
];

(function(){var ov=document.querySelector('.view[data-view="overview"]');if(ov&&!document.querySelector('.view[data-view="matt"]'))ov.insertAdjacentHTML('afterend','<div class="view" data-view="matt" hidden><div class="rp" id="mattRoot"><div class="card"><p class="muted">Loading Matt\u2019s dashboard\u2026</p></div></div></div>');})();
var state={view:'overview',pod:'all',per:'mtd'};
try{var h=(location.hash||'').slice(1);if(VIEWS.some(function(v){return v.k===h;}))state.view=h;}catch(e){}
try{var sp=localStorage.getItem('sdrPortalPod');if(sp&&(sp==='all'||SDRS.some(function(s){return s.k===sp;})))state.pod=sp;
    var spp=localStorage.getItem('sdrPortalPer');if(spp==='wk'||spp==='mtd')state.per=spp;}catch(e){}

function $(id){return document.getElementById(id);}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function sel(){return state.pod==='all'?SDRS:SDRS.filter(function(s){return s.k===state.pod;});}
function byK(k){for(var i=0;i<SDRS.length;i++)if(SDRS[i].k===k)return SDRS[i];}
function sum(a,f){return a.reduce(function(t,x){return t+f(x);},0);}
function ct(c){return c.conv+c.noans+c.bot+c.other+c.none;}
function pct(a,b){return b?Math.round(a/b*100)+'%':'\u2013';}
function ratio(a,b){return b?(a/b).toFixed(1):'\u2013';}
function fmtK(v){return '\u00a3'+(Math.round(v*10)/10)+'k';}
function pill(p){return '<span class="pill '+p[0]+'">'+esc(p[1])+'</span>';}
function kpi(v,l,e){return '<div class="kpi"><span>'+l+'</span><b>'+v+'</b><em>'+(e||'&nbsp;')+'</em></div>';}
/* clickable numbers: open the companies behind them (live data only) */
var LISTS=null,CO=null,TRENDS=null,MLIST={};
function dn(v,m,per,sk){if(!LISTS||!m)return v;return '<button class="num" data-drill="'+m+'|'+per+'|'+(sk||'')+'" title="See the companies">'+v+'</button>';}

/* filter box on every table and list section */
function applyFilters(){
  Array.prototype.forEach.call(document.querySelectorAll('.view:not([data-view="kb"]):not([data-view="defs"]) .card'),function(c){
    if(c.closest('.rp'))return;
    var rows=c.querySelectorAll('tbody tr:not(.team), ul.wins > li');
    var f=c.querySelector(':scope > .card-filter');
    if(!f){if(rows.length<4)return;f=document.createElement('input');f.type='search';f.className='dr-search card-filter';f.placeholder='Filter\u2026';f.setAttribute('aria-label','Filter this section');
      var at=c.querySelector(':scope > .tbl, :scope > ul, :scope > .grid2, :scope > table');c.insertBefore(f,at||null);f.addEventListener('input',function(){filterCard(c,f.value);});}
    filterCard(c,f.value);});
}
function filterCard(c,q){q=(q||'').toLowerCase().trim();var shown=0;
  Array.prototype.forEach.call(c.querySelectorAll('tbody tr:not(.team), ul.wins > li'),function(r){var hit=!q||r.textContent.toLowerCase().indexOf(q)>=0;r.hidden=!hit;if(hit)shown++;});
  var n=c.querySelector(':scope > .card-filter-n');if(q){if(!n){n=document.createElement('span');n.className='card-filter-n tag';c.querySelector(':scope > .card-filter').insertAdjacentElement('afterend',n);}n.textContent=shown+' matching';}else if(n)n.remove();}

/* build rail */
var nav=$('nav');
var resOpen=false;try{resOpen=localStorage.getItem('sdrPortalRes')==='1';}catch(e){}
var resBtn=null,resBox=null;
var ovOpen=true;try{ovOpen=localStorage.getItem('sdrPortalOv')!=='0';}catch(e){}
var ovBox=null,ovChev=null;
VIEWS.forEach(function(v){var b=document.createElement('button');b.id='nav-'+v.k;b.dataset.view=v.k;b.innerHTML='<span>'+esc(v.label)+'</span><span class="count" id="cnt-'+v.k+'"></span>';
  b.addEventListener('click',function(){if(v.k==='overview'){ovOpen=true;try{localStorage.setItem('sdrPortalOv','1');}catch(e){}}setView(v.k);});
  if(v.k==='overview'){
    // Overview opens its page and shows the daily, weekly and monthly reports underneath; the arrow folds them away
    ovChev=document.createElement('span');ovChev.className='chev ov-chev';ovChev.setAttribute('role','button');ovChev.setAttribute('tabindex','0');ovChev.setAttribute('aria-label','Show or hide the reports');ovChev.textContent='\u25be';
    var tog=function(ev){ev.stopPropagation();ev.preventDefault();ovOpen=!ovOpen;try{localStorage.setItem('sdrPortalOv',ovOpen?'1':'0');}catch(e){}syncOv();};
    ovChev.addEventListener('click',tog);ovChev.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' ')tog(ev);});
    b.querySelector('.count').replaceWith(ovChev);
    nav.appendChild(b);ovBox=document.createElement('div');ovBox.className='nav-sub';nav.appendChild(ovBox);return;}
  if(v.group==='ov'){ovBox.appendChild(b);return;}
  if(v.group==='res'){
    if(!resBox){resBtn=document.createElement('button');resBtn.className='nav-group';resBtn.setAttribute('aria-expanded','false');resBtn.innerHTML='<span>Resources</span><span class="chev" aria-hidden="true">\u25be</span>';
      resBox=document.createElement('div');resBox.className='nav-sub';
      resBtn.addEventListener('click',function(){resOpen=!resOpen;try{localStorage.setItem('sdrPortalRes',resOpen?'1':'0');}catch(e){}syncRes();syncOv();});
      nav.appendChild(resBtn);nav.appendChild(resBox);}
    resBox.appendChild(b);
  } else nav.appendChild(b);});
function syncOv(){if(!ovBox)return;var cur=VIEWS.some(function(v){return v.group==='ov'&&v.k===state.view;});var open=ovOpen||cur;ovBox.hidden=!open;ovChev.style.transform=open?'':'rotate(-90deg)';$('nav-overview').setAttribute('aria-expanded',String(open));}
function syncRes(){if(!resBox)return;var cur=VIEWS.some(function(v){return v.group==='res'&&v.k===state.view;});var open=resOpen||cur;resBox.hidden=!open;resBtn.setAttribute('aria-expanded',String(open));resBtn.classList.toggle('has-current',cur);}
var pods=$('pods');
[{k:'all',label:'All pods',sub:'Team'}].concat(SDRS.map(function(s){return {k:s.k,label:s.pod,sub:s.short};})).forEach(function(o){
  var b=document.createElement('button');b.className='opt';b.id='pod-'+o.k;b.dataset.pod=o.k;
  b.innerHTML='<span>'+esc(o.label)+'</span><small>'+esc(o.sub)+'</small>';
  b.addEventListener('click',function(){setPod(o.k);});pods.appendChild(b);});
/* one date bar at the top of every page: presets plus any From / To range */
var DTAG={wk:'This week',lwk:'Last week',mtd:'Month to date',lm:'Last month',l30:'Last 30 days',custom:'Custom dates'};
var LISO0=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
function ukToday(){return LISO0.format(new Date());}
function addDays(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function presetRange(tag){var t=ukToday(),d=new Date(t+'T12:00:00Z'),dow=(d.getUTCDay()+6)%7;
  if(tag==='lwk'){var mon=addDays(t,-dow-7);return {from:mon,to:addDays(mon,6)};}
  if(tag==='lm'){var f=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-1,1)),l=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),0));return {from:f.toISOString().slice(0,10),to:l.toISOString().slice(0,10)};}
  if(tag==='l30')return {from:addDays(t,-30),to:addDays(t,-1)};return null;}
state.cus=null;try{var sc=JSON.parse(localStorage.getItem('sdrPortalCus')||'null');if(sc&&sc.from&&sc.to){if(sc.l30&&!sc.tag)sc.tag='l30';var pr=presetRange(sc.tag);if(pr){sc.from=pr.from;sc.to=pr.to;}state.cus=sc;}}catch(e){}
function cusName(){return state.cus?DTAG[state.cus.tag||'custom']:'Custom dates';}
function perName(P){return P==='wk'?'This week':PERIODS&&PERIODS.mtd&&PERIODS.mtd.custom?cusName():'Month to date';}
document.head.insertAdjacentHTML('beforeend','<style>.rail-group:has(#per){display:none}.ov-chev{margin-left:auto;padding:0 4px;opacity:.7;cursor:pointer;transition:transform .15s}.ov-chev:hover{opacity:1}body.sdr-wait .view:not([data-view=daily]):not([data-view=weekly]):not([data-view=monthly]):not([data-view=matt]):not([data-view=kb]):not([data-view=defs]),body.sdr-fail .view:not([data-view=daily]):not([data-view=weekly]):not([data-view=monthly]):not([data-view=matt]):not([data-view=kb]):not([data-view=defs]){display:none!important}.datebar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;background:var(--surface);border:1px solid var(--line);padding:10px 14px;margin:0 0 20px}.datebar .db-presets{display:flex;flex-wrap:wrap;gap:4px}.datebar .db-presets button{background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:6px 11px;font:inherit;font-size:.82rem;cursor:pointer}.datebar .db-presets button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg);font-weight:600}.datebar form{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:.8rem;color:var(--muted)}.datebar input{border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:5px 7px;font:inherit;font-size:.82rem}.datebar form button{background:var(--accent);color:var(--accent-fg);border:0;padding:6px 12px;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer}.datebar .db-err{color:var(--bad-fg);font-size:.78rem}.datebar .db-lbl{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}</style>');
document.querySelector('.topline').insertAdjacentHTML('afterend','<div class="datebar" id="dateBar"><span class="db-lbl">Dates</span><div class="db-presets">'+['wk','lwk','mtd','lm','l30'].map(function(k){return '<button data-p="'+k+'" aria-pressed="false">'+DTAG[k]+'</button>';}).join('')+'</div><form id="dbForm"><span>From</span><input type="date" id="dbFrom" required aria-label="From"><span>to</span><input type="date" id="dbTo" required aria-label="To"><button type="submit">Apply</button><span class="db-err" id="dbErr" hidden></span></form></div>');
function setCustom(from,to,tag){
  if(!from||!to||from>to){$('dbErr').textContent='Pick a From date on or before the To date.';$('dbErr').hidden=false;return false;}
  if((Date.parse(to)-Date.parse(from))/86400000>366){$('dbErr').textContent='Pick a range of a year or less.';$('dbErr').hidden=false;return false;}
  $('dbErr').hidden=true;state.cus={from:from,to:to,tag:tag||'custom'};state.per='mtd';
  try{localStorage.setItem('sdrPortalCus',JSON.stringify(state.cus));}catch(e){}
  load(true);render();return true;}
function clearCustom(){if(!state.cus)return;state.cus=null;try{localStorage.removeItem('sdrPortalCus');}catch(e){}load(true);}
window.SDRCustom={set:setCustom,clear:clearCustom,get:function(){return state.cus;},name:cusName};
$('dbForm').addEventListener('submit',function(e){e.preventDefault();setCustom($('dbFrom').value,$('dbTo').value,'custom');});
Array.prototype.forEach.call(document.querySelectorAll('#dateBar [data-p]'),function(b){b.addEventListener('click',function(){var k=b.dataset.p;
  if(k==='wk'||k==='mtd'){state.per=k;try{localStorage.setItem('sdrPortalPer',k);}catch(e){}if(state.cus)clearCustom();render();return;}
  var r=presetRange(k);setCustom(r.from,r.to,k);});});
function syncDateBar(){if(!PERIODS)return;var cur=state.cus?(state.cus.tag||'custom'):state.per;
  Array.prototype.forEach.call(document.querySelectorAll('#dateBar [data-p]'),function(b){b.setAttribute('aria-pressed',String(b.dataset.p===cur));});
  var f=state.cus?state.cus.from:PERIODS[state.per].start,t=state.cus?state.cus.to:PERIODS[state.per].end;
  if(document.activeElement!==$('dbFrom'))$('dbFrom').value=f;if(document.activeElement!==$('dbTo'))$('dbTo').value=t;$('dbFrom').max=$('dbTo').max=ukToday();}

/* Not interested gets its own column, legend entry and definition */
(function(){var leg=document.querySelector('#statusBars')&&document.querySelector('#statusBars').previousElementSibling;
  if(leg&&leg.classList.contains('legend')){var d=leg.querySelector('.c-disq');if(d)d.parentNode.insertAdjacentHTML('beforebegin','<span><i class="c-notint"></i>Not interested</span>');}
  var th=document.querySelectorAll('#statusBody')[0];th=th&&th.parentNode.querySelector('thead tr');
  if(th)Array.prototype.forEach.call(th.children,function(c){if(c.textContent==='Disqualified')c.insertAdjacentHTML('beforebegin','<th>Not interested</th>');});
  Array.prototype.forEach.call(document.querySelectorAll('dd span'),function(sp){if(sp.textContent.indexOf('Disqualified = Disqualified or Not Interested')>=0)sp.textContent=sp.textContent.replace('Disqualified = Disqualified or Not Interested.','Not interested = Not Interested. Disqualified = Disqualified.');});
})();
function seg(cls,w,title,m,per,sk){return '<span class="'+cls+'" style="width:'+w+'%" title="'+title+(LISTS&&m?' \u00b7 click to see the companies':'')+'"'+(LISTS&&m?' data-drill="'+m+'|'+per+'|'+sk+'"':'')+'></span>';}
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dnice(s){var p=s.split('-');return (+p[2])+' '+MON[+p[1]-1];}
function rangeLabel(p){var a=PERIODS[p].start.split('-'),b=PERIODS[p].end.split('-');return a[1]===b[1]?(+a[2])+'\u2013'+(+b[2])+' '+MON[+b[1]-1]:dnice(PERIODS[p].start)+' \u2013 '+dnice(PERIODS[p].end);}

/* live data from HubSpot via /api/data; snapshot.js is only an empty placeholder */
var SOURCE='loading',GENERATED=SNAPSHOT_AT,loading=false;
function ago(iso){var m=Math.round((Date.now()-Date.parse(iso))/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';var h=Math.round(m/60);return h<24?h+' h ago':new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function status(kind,text){$('statusDot').className=kind;$('statusText').textContent=text;}
function stamp(){if(SOURCE==='live')status('live','Live from HubSpot \u00b7 updated '+ago(GENERATED));else if(SOURCE==='snapshot')status('err','Not connected to HubSpot');}
function banner(html){var b=$('banner');b.hidden=!html;b.innerHTML=html||'';}
function load(fresh){
  if(loading)return;loading=true;$('refreshBtn').disabled=true;
  if(SOURCE!=='live'){status('','Connecting to HubSpot\u2026');document.body.classList.add('sdr-wait');banner('<b>Loading live data from HubSpot\u2026</b> Longer date ranges can take up to a minute. The daily, weekly and monthly reports load on their own.');}
  var qs=(state.cus?['from='+state.cus.from,'to='+state.cus.to]:[]).concat(fresh?['t='+Date.now()]:[]);
  fetch('api/data'+(qs.length?'?'+qs.join('&'):'')).then(function(r){return r.json().catch(function(){return {error:'bad_response'};}).then(function(d){return {ok:r.ok,d:d};});})
  .then(function(x){
    if(!x.ok||x.d.error)throw x.d;var d=x.d;
    SDRS=d.SDRS;NF=d.NF;TEAM_CQ=d.TEAM_CQ;OUT=d.OUT;MEETINGS=d.MEETINGS;DEALS=d.DEALS;LEADS=d.LEADS;WINS=d.WINS;PERIODS=d.periods;PIPE=d.pipeline;GENERATED=d.generatedAt;LISTS=d.LISTS||null;CO=d.CO||null;TRENDS=d.TRENDS||null;
    SOURCE='live';document.body.classList.remove('sdr-wait','sdr-fail');banner('');render();
  }).catch(function(e){
    var code=e&&e.error;
    if(SOURCE==='live'){status('err','Refresh failed \u00b7 showing data from '+ago(GENERATED));return;}
    SOURCE='snapshot';render();
    if(code==='locked'||code==='no_password')return;
    banner('<b>Live data couldn\u2019t load.</b> '+(code==='missing_token'?'The HubSpot key hasn\u2019t been added to Vercel yet.':code==='bad_token'?'HubSpot rejected the key.':code==='missing_scope'?'The HubSpot key is missing a read permission.':'HubSpot couldn\u2019t be reached just now. Try Refresh now in a few minutes.'));
  }).then(function(){loading=false;if(SOURCE!=='live'&&document.body.classList.contains('sdr-wait')){document.body.classList.remove('sdr-wait');document.body.classList.add('sdr-fail');}$('refreshBtn').disabled=false;$('refreshBtn').hidden=false;stamp();});
}
$('refreshBtn').addEventListener('click',function(){load(true);});
setInterval(function(){if(SOURCE==='live'&&!loading)stamp();},60000);

function setView(k){state.view=k;try{history.replaceState(null,'','#'+k);}catch(e){}render();window.scrollTo(0,0);}
function setPod(k){state.pod=(state.pod===k&&k!=='all')?'all':k;try{localStorage.setItem('sdrPortalPod',state.pod);}catch(e){}render();}

function render(){
  var P=state.per,S=sel(),all=state.pod==='all';
  var isCus=P==='mtd'&&PERIODS.mtd&&PERIODS.mtd.custom;syncDateBar();var perLabel=perName(P)+' \u00b7 '+rangeLabel(P);
  $('winsTag').textContent=rangeLabel('wk')+' \u00b7 always this week';
  var pace1=8*PERIODS.dayOfMonth/PERIODS.daysInMonth;
  $('paceNote').textContent='Target 8 a month, floor 6. Today is day '+PERIODS.dayOfMonth+' of '+PERIODS.daysInMonth+', so the on-pace figure is '+(Math.round(pace1*10)/10)+'.';
  $('defPeriods').textContent='This week is '+dnice(PERIODS.wk.start)+' to '+dnice(PERIODS.wk.end)+'. Month to date is '+dnice(PERIODS.mtd.start)+' to '+dnice(PERIODS.mtd.end)+'. Dates are UK time.';
  var V=VIEWS.filter(function(v){return v.k===state.view;})[0];
  Array.prototype.forEach.call(document.querySelectorAll('.view'),function(el){el.hidden=el.dataset.view!==state.view;});
  syncRes();syncOv();
  Array.prototype.forEach.call(nav.querySelectorAll('button[data-view]'),function(b){if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  Array.prototype.forEach.call(pods.querySelectorAll('.opt'),function(b){b.setAttribute('aria-pressed',String(b.dataset.pod===state.pod));});
  Array.prototype.forEach.call(document.querySelectorAll('#per button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.per===P));});
  $('viewTitle').textContent=V.title; $('crumbView').textContent=V.label;
  var who=all?'All SDRs':byK(state.pod).name+' \u00b7 '+byK(state.pod).pod;
  $('ctx').innerHTML='<span><b>'+esc(who)+'</b></span><span>'+esc(perLabel)+'</span>';
  ['scoreTag','callsTag','cqTag','meetTag'].forEach(function(id){$(id).textContent=perLabel;});
  $('twHead').textContent='Two-way contacts ('+(P==='wk'?'week':isCus?'period':'MTD')+')';

  /* nav counts */
  $('cnt-meetings').textContent=sum(S,function(s){return s.first[P];});
  $('cnt-calls').textContent=sum(S,function(s){return ct(s.calls[P]);});
  $('cnt-pipeline').textContent=DEALS.filter(function(d){return all||d.s===state.pod;}).length;
  $('cnt-review').textContent=sum(S,function(s){return s.review.stuck;});

  /* overview kpis */
  var tCalls=sum(S,function(s){return ct(s.calls[P]);}),tConv=sum(S,function(s){return s.calls[P].conv;});
  var tAsg=sum(S,function(s){return s.assigned;}),tCtd=sum(S,function(s){return s.contacted[P];});
  var oD=DEALS.filter(function(d){return all||d.s===state.pod;});
  $('ovKpis').innerHTML=kpi(dn(tCtd,'contacted',P),'Accounts contacted',pct(tCtd,tAsg)+' of the '+tAsg.toLocaleString()+' assigned')+
    kpi(dn(tCalls,'calls',P),'Calls made',dn(tConv,'conv',P)+' were real conversations ('+pct(tConv,tCalls)+')')+
    kpi(dn(sum(S,function(s){return s.emails[P];}),'emails',P),'Emails sent','Includes logged calendar invites')+
    kpi(dn(sum(S,function(s){return s.first[P];}),'booked',P),'Meetings booked','Companies moved to Meeting Booked, even if they have since moved on')+
    kpi(dn(sum(S,function(s){return s.held;}),'held','all')+' <small style="font-size:.55em;color:var(--muted);font-weight:500">of '+(8*S.length)+'</small>','First meetings held \u00b7 month',(S.length>1?'Target is 8 per SDR ('+S.length+' SDRs)':'Target is 8 a month, floor 6'))+
    kpi(dn(oD.length,'deals','all'),'Open SDR deals',fmtK(sum(oD,function(d){return d.a;}))+' in total \u00b7 '+(PIPE.createdMtd||0)+' new this month');

  /* scorecard */
  function row(s,team){
    var g=function(f){return team?sum(S,f):f(s);};
    var asg=g(function(x){return x.assigned;}),ctd=g(function(x){return x.contacted[P];}),cts=g(function(x){return x.contacts[P];});
    var calls=g(function(x){return ct(x.calls[P]);}),conv=g(function(x){return x.calls[P].conv;}),em=g(function(x){return x.emails[P];}),fm=g(function(x){return x.first[P];});
    var sk=team?'':s.k;
    var first=team?'<td>Team</td>':'<td>'+esc(s.name)+'<span class="pod">'+esc(s.pod)+(s.lead?' \u00b7 '+esc(s.lead):'')+'</span></td>';
    return '<tr class="'+(team?'team':'sdr-row')+'"'+(team?'':' data-k="'+s.k+'" tabindex="0" title="Filter to '+esc(s.short)+'"')+'>'+first+
      '<td class="n">'+dn(asg.toLocaleString(),'assigned','all',sk)+'</td><td class="n">'+dn(ctd,'contacted',P,sk)+'</td><td class="n">'+pct(ctd,asg)+'</td><td class="n">'+cts+'</td><td class="n">'+ratio(cts,ctd)+
      '</td><td class="n">'+dn(calls,'calls',P,sk)+'</td><td class="n">'+dn(conv,'conv',P,sk)+'</td><td class="n">'+dn(em,'emails',P,sk)+'</td><td class="n">'+dn(fm,'booked',P,sk)+'</td></tr>';
  }
  $('scoreBody').innerHTML=S.map(function(s){return row(s,false);}).join('')+(all?row(null,true):'');
  Array.prototype.forEach.call(document.querySelectorAll('#scoreBody tr.sdr-row'),function(tr){
    tr.addEventListener('click',function(e){if(e.target.closest('[data-drill]'))return;setPod(tr.dataset.k);});
    tr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();setPod(tr.dataset.k);}});});

  /* new vs follow-up */
  $('nfTag').textContent=perLabel;
  function nfRow(lbl,v,team,sk){var a=v.a,c=v.c;return '<tr'+(team?' class="team"':'')+'><td>'+lbl+'</td><td class="n">'+dn(a[0]+a[1],'calls',P,sk)+'</td><td class="n">'+(team?a[0]:dn(a[0],'newAcc'+P,P,sk))+'</td><td class="n">'+(team?a[1]:dn(a[1],'fuAcc'+P,P,sk))+'</td><td class="n">'+(c[0]+c[1])+'</td><td class="n">'+c[0]+'</td><td class="n">'+c[1]+'</td></tr>';}
  $('nfBody').innerHTML=S.map(function(s){return nfRow(esc(s.short),NF[s.k][P],false,s.k);}).join('')+(all?nfRow('Team',NF.team[P],true):'');
  function nfBars(key){var mx=Math.max.apply(null,S.map(function(s){var v=NF[s.k][P][key];return v[0]+v[1];}).concat([1]));
    return S.map(function(s){var v=NF[s.k][P][key],t=v[0]+v[1];
      return '<div class="bar-row"><span class="lbl">'+esc(s.short)+'</span><div>'+(t?'<div class="bar" style="width:'+(t/mx*100)+'%">'+seg('c-new',v[0]/t*100,'New: '+v[0],key==='a'&&v[0]?'newAcc'+P:'',P,s.k)+seg('c-fu',v[1]/t*100,'Follow-up: '+v[1],key==='a'&&v[1]?'fuAcc'+P:'',P,s.k)+'</div>':'<span class="empty">No calls</span>')+'</div><span class="tot">'+v[0]+' / '+v[1]+'</span></div>';}).join('');}
  $('nfAccBars').innerHTML='<h3>Accounts</h3>'+nfBars('a');
  $('nfConBars').innerHTML='<h3>Contacts</h3>'+nfBars('c');
  $('nfNote').textContent=(all||state.pod==='matthew')?'Matthew\u2019s account numbers are understated because most of his calls aren\u2019t linked to a company in HubSpot. His contact numbers are complete.':'';

  /* meetings: counted by the date they were booked */
  var pS=PERIODS[P].start,pE=PERIODS[P].end;
  var inPer=function(d){return d&&d>=pS&&d<=pE;};
  var mAll=MEETINGS.filter(function(m){return (all||m.s===state.pod)&&inPer(m.bs);});
  var mB=mAll.filter(function(m){return /^Meeting booked/.test(m.kind||'');});
  var mCal=mAll.filter(function(m){return !/^Meeting booked/.test(m.kind||'');});
  var oc=function(m){return m.o?m.o[1]:'';};
  var GR={held:function(m){return oc(m)==='Held';},up:function(m){return oc(m)==='Upcoming'||oc(m)==='Today';},ns:function(m){return oc(m)==='No show';},
    cx:function(m){return oc(m)==='Cancelled'||oc(m)==='Rescheduled';},no:function(m){return oc(m)==='No outcome';},nl:function(m){return oc(m)==='No meeting logged';},
    self:function(m){return m.by&&byK(m.s)&&m.by===byK(m.s).name;},other:function(m){return m.by&&m.by!=='\u2013'&&!(byK(m.s)&&m.by===byK(m.s).name);}};
  MLIST={};var mk=function(list,title){var id='m'+Object.keys(MLIST).length;MLIST[id]=[list,title];return id;};
  var mnum=function(list,title,txt){return list.length?'<button class="num" data-mlist="'+mk(list,title)+'">'+(txt==null?list.length:txt)+'</button>':'0';};
  var tagTxt=(P==='wk'?'This week':PERIODS.mtd.custom?cusName():'Month to date')+' \u00b7 '+rangeLabel(P)+' \u00b7 by date booked';
  ['meetTag','meetTag2','meetDayTag','meetBdTag'].forEach(function(id){if($(id))$(id).textContent=tagTxt;});
  var held=mB.filter(GR.held);
  $('meetKpis').innerHTML=kpi(mnum(mB,'Meetings booked'),'Meetings booked','Moved to Meeting Booked in the period, even if since moved on')+
    kpi(mnum(held,'Booked in the period and already held'),'Already held',pct(held.length,mB.length)+' of those booked')+
    kpi(mnum(mB.filter(GR.up),'Booked, meeting still to come'),'Still to come','Meeting date today or later')+
    kpi(mnum(mB.filter(function(m){return GR.ns(m)||GR.cx(m);}),'Booked: no show, cancelled or rescheduled'),'No show / cancelled','Includes rescheduled')+
    kpi(mnum(mB.filter(function(m){return GR.no(m)||GR.nl(m);}),'Booked: outcome or meeting missing'),'Needs updating','Past with no outcome, or no meeting logged')+
    kpi(mnum(mCal,'Other first meetings put in the calendar'),'Other calendar bookings','First meetings created in the period whose company isn\u2019t at Meeting Booked');
  var per=P==='mtd'&&!PERIODS.mtd.custom;
  var below=S.filter(function(s){return mB.filter(function(m){return m.s===s.k;}).length<6;}).length;
  $('meetPill').hidden=!per;$('meetPill').textContent=below===S.length?(S.length>1?'Below floor for every SDR':'Below floor'):below+' below floor';
  var pace1=8*PERIODS.dayOfMonth/PERIODS.daysInMonth;
  $('paceNote').textContent=per?'Target 8 meetings booked a month, floor 6 (the two marks). Today is day '+PERIODS.dayOfMonth+' of '+PERIODS.daysInMonth+', so on pace is '+(Math.round(pace1*10)/10)+'. The faint bar is how many of those meetings have been held.':'Target is 8 meetings booked a month (floor 6); the period shown isn\u2019t a calendar month, so compare with care. The faint bar is how many have been held.';
  var tMax=Math.max(8,Math.max.apply(null,S.map(function(s){return mB.filter(function(m){return m.s===s.k;}).length;})));
  $('targetBars').innerHTML=S.map(function(s){var b=mB.filter(function(m){return m.s===s.k;}),h=b.filter(GR.held);
    return '<div class="t-row"><span style="font-size:.85rem;font-weight:600">'+esc(s.short)+'</span><div class="t-track" style="cursor:pointer" data-mlist="'+mk(b,'Meetings booked \u00b7 '+s.short)+'" title="Click for the meetings">'+
      '<div class="t-fill" style="width:'+(b.length/tMax*100)+'%;opacity:.35"></div><div class="t-fill" style="width:'+(h.length/tMax*100)+'%"></div>'+
      '<div class="t-mark floor" style="left:'+(6/tMax*100)+'%"></div><div class="t-mark" style="left:calc('+(8/tMax*100)+'% - 2px)"></div></div>'+
      '<span style="font-family:var(--f-data);text-align:right;font-size:.85rem">'+mnum(b,'Meetings booked \u00b7 '+s.short)+' / 8</span></div>';
  }).join('')+'<div class="t-scale"><div></div><div><span style="left:0">0</span><span style="left:'+(4/tMax*100)+'%">4</span><span style="left:'+(6/tMax*100)+'%">6 floor</span><span style="left:calc('+(8/tMax*100)+'% - 8px)">8</span></div><div></div></div>'+
    '<div class="legend" style="margin-top:10px"><span><i style="background:var(--accent);opacity:.35"></i>Booked</span><span><i style="background:var(--accent)"></i>Of which held</span></div>';
  /* booked by day, stacked by SDR */
  var days=[];for(var dd=new Date(pS+'T12:00:00Z');dd.toISOString().slice(0,10)<=pE;dd=new Date(dd.getTime()+86400000))days.push(dd.toISOString().slice(0,10));
  var SC=['var(--s-conv)','var(--s-bot)','#E0A030','#7C97B0'];
  var dMax=Math.max.apply(null,days.map(function(d){return mB.filter(function(m){return m.bs===d;}).length;}).concat([1]));
  var every=days.length>20?Math.ceil(days.length/12):1;
  $('meetDays').innerHTML='<div class="legend">'+S.map(function(s,i){return '<span><i style="background:'+SC[SDRS.indexOf(s)%4]+'"></i>'+esc(s.short)+'</span>';}).join('')+'</div>'+
    '<div class="mt-cols">'+days.map(function(d){var l=mB.filter(function(m){return m.bs===d;});
      return '<button data-mlist="'+mk(l,'Meetings booked on '+dnice(d))+'" title="'+esc(dnice(d))+': '+l.length+' booked'+(l.length?' \u00b7 '+S.map(function(s){var n=l.filter(function(m){return m.s===s.k;}).length;return n?s.short+' '+n:'';}).filter(Boolean).join(', '):'')+'"><span class="v">'+(l.length||'')+'</span><span class="mt-cs" style="height:'+(l.length/dMax*100)+'%">'+
        S.map(function(s){var n=l.filter(function(m){return m.s===s.k;}).length;return n?'<span style="height:'+(n/l.length*100)+'%;background:'+SC[SDRS.indexOf(s)%4]+'"></span>':'';}).join('')+'</span></button>';}).join('')+'</div>'+
    '<div class="mt-xl">'+days.map(function(d,i){return '<span>'+(i%every===0?esc(dnice(d)):'')+'</span>';}).join('')+'</div>';
  /* breakdown */
  var bdRow=function(lbl,b,team){var f=function(g,t){return mnum(b.filter(GR[g]),t+' \u00b7 '+lbl);};
    return '<tr'+(team?' class="team"':'')+'><td>'+esc(lbl)+'</td><td class="n">'+mnum(b,'Meetings booked \u00b7 '+lbl)+'</td><td class="n">'+f('held','Held')+'</td><td class="n">'+f('up','Still to come')+'</td><td class="n">'+f('ns','No show')+'</td><td class="n">'+f('cx','Cancelled or rescheduled')+'</td><td class="n">'+f('no','Past, no outcome')+'</td><td class="n">'+f('nl','No meeting logged')+'</td><td class="n">'+f('self','Booked by the SDR')+'</td><td class="n">'+f('other','Booked by someone else')+'</td></tr>';};
  $('meetBd').innerHTML=S.map(function(s){return bdRow(s.short,mB.filter(function(m){return m.s===s.k;}),false);}).join('')+(all?bdRow('Team',mB,true):'');
  /* table: booked first, then other calendar bookings */
  var mt=mB.concat(mCal).slice().sort(function(a,b){return a.bs<b.bs?1:a.bs>b.bs?-1:0;});
  $('meetBody').innerHTML=mt.length?mt.map(function(m){
    return '<tr><td><a href="'+co(m.id)+'" data-co="'+m.id+'" target="_blank" rel="noopener">'+esc(m.c)+'</a></td><td class="l">'+esc(m.m)+(/^Meeting booked/.test(m.kind||'')?'':' <span class="pill info">In calendar only</span>')+'</td><td class="l">'+esc(byK(m.s).short)+'</td><td class="l">'+esc(m.by)+'</td><td class="n">'+esc(m.bs?dnice(m.bs):'\u2013')+'</td><td class="n">'+esc(m.d)+'</td><td class="l">'+pill(m.o)+(m.x?' '+pill(m.x):'')+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty">No meetings booked on these accounts in the period.</td></tr>';

  /* calls */
  var cu=all?TEAM_CQ[P].unique:sum(S,function(s){return s.cq[P].unique;});
  var cn=all?TEAM_CQ[P].neu:sum(S,function(s){return s.cq[P].neu;});
  var cf=all?TEAM_CQ[P].fu:sum(S,function(s){return s.cq[P].fu;});
  $('callKpis').innerHTML=kpi(dn(tCalls,'calls',P),'Calls made',ratio(tCalls,cu)+' calls per contact on average')+kpi(cu,'Unique contacts called','Each person counted once')+
    kpi(dn(tConv,'conv',P),'Real conversations',pct(tConv,tCalls)+' of calls')+
    kpi(cn,'Net-new contacts','First SDR call this year')+kpi(cf,'Follow-up contacts','Already called earlier in 2026')+
    kpi(sum(S,function(s){return s.cq[P].same;}),'Same-day redials','Extra calls to the same person that day');
  $('cqBody').innerHTML=S.map(function(s){var q=s.cq[P];
    return '<tr><td>'+esc(s.short)+'</td><td class="n">'+ct(s.calls[P])+'</td><td class="n">'+q.unique+'</td><td class="n">'+q.once+'</td><td class="n">'+q.two+'</td><td class="n">'+q.three+'</td><td class="n">'+q.neu+'</td><td class="n">'+q.fu+'</td><td class="n">'+q.same+'</td><td class="n">'+q.noc+'</td><td class="n">'+q.convC+'</td></tr>';}).join('')+
    (all?'<tr class="team"><td>Team</td><td class="n">'+tCalls+'</td><td class="n">'+TEAM_CQ[P].unique+'</td><td class="n">'+sum(S,function(s){return s.cq[P].once;})+'</td><td class="n">'+sum(S,function(s){return s.cq[P].two;})+'</td><td class="n">'+sum(S,function(s){return s.cq[P].three;})+'</td><td class="n">'+TEAM_CQ[P].neu+'</td><td class="n">'+TEAM_CQ[P].fu+'</td><td class="n">'+sum(S,function(s){return s.cq[P].same;})+'</td><td class="n">'+sum(S,function(s){return s.cq[P].noc;})+'</td><td class="n">'+sum(S,function(s){return s.cq[P].convC;})+'</td></tr>':'');
  var maxNF=Math.max.apply(null,S.map(function(s){return s.cq[P].neuCalls+s.cq[P].fuCalls;}).concat([1]));
  $('cqBars').innerHTML=S.map(function(s){var q=s.cq[P],t=q.neuCalls+q.fuCalls;
    return '<div class="bar-row"><span class="lbl">'+esc(s.short)+'</span><div>'+(t?'<div class="bar" style="width:'+(t/maxNF*100)+'%"><span class="c-new" style="width:'+(q.neuCalls/t*100)+'%" title="Net-new: '+q.neuCalls+' calls"></span><span class="c-fu" style="width:'+(q.fuCalls/t*100)+'%" title="Follow-up: '+q.fuCalls+' calls"></span></div>':'<span class="empty">No calls logged</span>')+'</div><span class="tot">'+q.neuCalls+' / '+q.fuCalls+'</span></div>';}).join('');
  var maxC=Math.max.apply(null,S.map(function(s){return ct(s.calls[P]);}).concat([1]));
  $('callBars').innerHTML=S.map(function(s){var c=s.calls[P],t=ct(c);
    var sg=t?['conv','noans','bot','other','none'].map(function(k){return c[k]?seg('c-'+k,c[k]/t*100,{conv:'Real conversation',noans:'No answer',bot:'AI screening bot',other:'Gatekeeper, wrong number, bad timing, not interested',none:'No outcome logged'}[k]+': '+c[k],'call_'+k,P,s.k):'';}).join(''):'';
    return '<div class="bar-row"><span class="lbl">'+esc(s.short)+'</span><div>'+(t?'<div class="bar" style="width:'+(t/maxC*100)+'%">'+sg+'</div>':'<span class="empty">No calls logged</span>')+'</div><span class="tot">'+t+'</span></div>';}).join('');

  /* quick wins (always this week) */
  var W=WINS.filter(function(w){return all||w.s===state.pod;});
  var wCls={book:'',today:'',held:' w-held',conv:' w-conv',later:' w-conv',seq:' w-seq'};
  $('winsList').innerHTML=W.length?W.map(function(w){
    var name=w.id?'<a href="'+co(w.id)+'" data-co="'+w.id+'" target="_blank" rel="noopener"><b>'+esc(w.c)+'</b></a>':(w.ids&&w.ids.length&&CO?'<button class="num" data-ids="'+w.ids.join(',')+'" data-ttl="Call back later \u00b7 '+esc(byK(w.s).short)+'"><b>'+esc(w.c)+'</b></button>':'<b>'+esc(w.c)+'</b>');
    return '<li><span class="w-type'+wCls[w.t]+'">'+esc(w.l)+'</span><span>'+name+' \u00b7 '+esc(w.x)+'</span><span class="who">'+esc(byK(w.s).short)+'</span></li>';
  }).join(''):'<li><span class="empty">Nothing logged for this SDR this week yet.</span></li>';

  /* outreach */
  ['mixTag','seqTag','repTag'].forEach(function(id){$(id).textContent=perLabel;});
  $('cnt-outreach').textContent=sum(S,function(s){return OUT[s.k].seq[P].em;});
  var tEm=sum(S,function(s){return s.emails[P];}),tSeq=sum(S,function(s){return OUT[s.k].seq[P].em;}),tRep=sum(S,function(s){return OUT[s.k].rep[P];});
  $('outKpis').innerHTML=kpi(dn(tSeq,'seq',P),'Sequence emails sent',pct(tSeq,tEm)+' of the '+tEm+' emails sent')+
    kpi(sum(S,function(s){return OUT[s.k].seq[P].enr;}),'Contacts enrolled','Put into a sequence in the period')+
    kpi(dn(tRep,'replies',P),'Email replies','Incoming emails, includes auto-replies');
  function mix(s){var c=ct(s.calls[P]),q=OUT[s.k].seq[P].em,o=s.emails[P]-q;return {c:c,q:q,o:o,t:c+q+o};}
  var maxM=Math.max.apply(null,S.map(function(s){return mix(s).t;}).concat([1]));
  $('mixBars').innerHTML=S.map(function(s){var m=mix(s);
    var sg=m.t?[['call',m.c,'Calls'],['seq',m.q,'Sequence emails'],['one',m.o,'One-off emails']].map(function(x){return x[1]?seg('c-'+x[0],x[1]/m.t*100,x[2]+': '+x[1],{call:'calls',seq:'seq',one:'emails'}[x[0]],P,s.k):'';}).join(''):'';
    return '<div class="bar-row"><span class="lbl">'+esc(s.short)+'</span><div>'+(m.t?'<div class="bar" style="width:'+(m.t/maxM*100)+'%">'+sg+'</div>':'<span class="empty">No outreach logged</span>')+'</div><span class="tot">'+m.t+'</span></div>';}).join('');
  function mixRow(lbl,m,team){return '<tr'+(team?' class="team"':'')+'><td>'+lbl+'</td><td class="n">'+m.c+'</td><td class="n">'+m.q+'</td><td class="n">'+m.o+'</td><td class="n">'+m.t+'</td><td class="n">'+pct(m.c,m.t)+'</td></tr>';}
  var mT={c:0,q:0,o:0,t:0};S.forEach(function(s){var m=mix(s);mT.c+=m.c;mT.q+=m.q;mT.o+=m.o;mT.t+=m.t;});
  $('mixBody').innerHTML=S.map(function(s){return mixRow(esc(s.short),mix(s),false);}).join('')+(all?mixRow('Team',mT,true):'');
  $('seqBody').innerHTML=S.map(function(s){var q=OUT[s.k].seq[P];return '<tr><td>'+esc(s.short)+'</td><td class="n">'+q.enr+'</td><td class="n">'+q.em+'</td></tr>';}).join('')+
    (all?'<tr class="team"><td>Team</td><td class="n">'+sum(S,function(s){return OUT[s.k].seq[P].enr;})+'</td><td class="n">'+tSeq+'</td></tr>':'');
  $('seqList').innerHTML=SEQS.filter(function(q){return all||!q.s||q.s===state.pod;}).map(function(q){
    return '<tr><td style="white-space:normal">'+esc(q.n)+'</td><td class="l">'+(q.s?esc(byK(q.s).short):'<span style="color:var(--muted)">Annie (shared)</span>')+'</td><td class="n">'+esc(q.cr)+'</td><td class="n">'+q.enr.toLocaleString()+'</td><td class="n">'+q.st.toLocaleString()+'</td><td class="n">'+q.rep+'</td><td class="n">'+q.mtg+'</td></tr>';}).join('');
  $('repBody').innerHTML=S.map(function(s){var r=OUT[s.k].rep[P];return '<tr><td>'+esc(s.short)+'</td><td class="n">'+s.emails[P]+'</td><td class="n">'+r+'</td><td class="n">'+(s.emails[P]?Math.round(r/s.emails[P]*100):'\u2013')+'</td></tr>';}).join('')+
    (all?'<tr class="team"><td>Team</td><td class="n">'+tEm+'</td><td class="n">'+tRep+'</td><td class="n">'+(tEm?Math.round(tRep/tEm*100):'\u2013')+'</td></tr>':'');

  /* lead response time */
  var touched=LEADS.filter(function(l){return l.r!==null;}).map(function(l){return l.r;}).sort(function(a,b){return a-b;});
  var med=touched.length?(touched.length%2?touched[(touched.length-1)/2]:(touched[touched.length/2-1]+touched[touched.length/2])/2):null;
  function fmtH(h){return h===null?'<span class="pill bad">Not touched</span>':h<0.05?'under 1 min':h<48?h.toFixed(1)+' h':(h/24).toFixed(1)+' days';}
  $('leadKpis').innerHTML=kpi(LEADS.length,'Leads received','Partner and event, since 15 Sep')+
    kpi(touched.length+' <small style="font-size:.55em;color:var(--muted);font-weight:500">of '+LEADS.length+'</small>','Leads followed up',(LEADS.length-touched.length)+' not touched yet')+
    kpi(med===null?'\u2013':med.toFixed(1)+' h','Median response time','Of the leads that were followed up');
  $('leadBody').innerHTML=LEADS.map(function(l){
    return '<tr><td><a href="'+HS+'0-1/'+l.id+'" target="_blank" rel="noopener">'+esc(l.n)+'</a></td><td class="l">'+(l.c?esc(l.c):'<span style="color:var(--muted)">\u2013</span>')+'</td><td class="l">'+esc(l.src)+'</td><td class="l">'+esc(l.o)+'</td><td class="n">'+esc(l.cr)+'</td><td class="n">'+fmtH(l.r)+'</td></tr>';}).join('');

  /* accounts */
  var maxA=Math.max.apply(null,S.map(function(s){return s.assigned;}));
  $('statusBars').innerHTML=S.map(function(s){var st=s.status,t=s.assigned;
    var sg=['pos','notint','disq','exh','work'].map(function(k){return st[k]?seg('c-'+k,st[k]/t*100,{pos:'Handed to AE',notint:'Not interested',disq:'Disqualified',exh:'Exhausted',work:'Still being worked'}[k]+': '+st[k],k,'all',s.k):'';}).join('');
    return '<div class="bar-row"><span class="lbl">'+esc(s.short)+'</span><div><div class="bar" style="width:'+(t/maxA*100)+'%">'+sg+'</div></div><span class="tot">'+t+'</span></div>';}).join('');
  $('statusBody').innerHTML=S.map(function(s){return '<tr><td>'+esc(s.short)+'</td><td class="n">'+dn(s.assigned,'assigned','all',s.k)+'</td><td class="n">'+dn(s.status.pos,'pos','all',s.k)+'</td><td class="n">'+dn(s.status.notint||0,'notint','all',s.k)+'</td><td class="n">'+dn(s.status.disq,'disq','all',s.k)+'</td><td class="n">'+dn(s.status.exh,'exh','all',s.k)+'</td><td class="n">'+s.patch+'</td></tr>';}).join('');
  $('engBody').innerHTML=S.map(function(s){return '<tr><td>'+esc(s.short)+'</td><td class="n">'+dn(s.eng,'eng','all',s.k)+'</td><td class="n" style="color:var(--muted)">'+s.bot+'</td><td class="n">'+s.tw[P]+'</td></tr>';}).join('')+
    (all?'<tr class="team"><td>Team</td><td class="n">'+sum(S,function(s){return s.eng;})+'</td><td class="n">'+sum(S,function(s){return s.bot;})+'</td><td class="n">'+sum(S,function(s){return s.tw[P];})+'</td></tr>':'');

  /* pipeline */
  var D=DEALS.filter(function(d){return all||d.s===state.pod;});
  $('pipeKpis').innerHTML=kpi(dn(D.length,'deals','all'),'Open SDR deals','Credited via the deal SDR Owner')+kpi(fmtK(sum(D,function(d){return d.a;})),'Total deal amount','Uses Amount; the ARR field is often blank')+kpi(String(PIPE.createdMtd||0),'Deals created this month','By the four SDRs')+kpi(PIPE.closedWon?fmtK(PIPE.closedWon/1000):'\u00a30','Closed-won revenue',PIPE.closedWon?'From SDR-credited deals':'No SDR deal has closed yet');
  $('dealBody').innerHTML=D.length?D.map(function(d){
    return '<tr><td><a href="'+dl(d.id)+'"'+(d.co?' data-co="'+d.co+'"':'')+' target="_blank" rel="noopener">'+esc(d.n)+'</a></td><td class="l">'+esc(byK(d.s).short)+'</td><td class="l">'+esc(d.st)+'</td><td class="n">'+fmtK(d.a)+'</td><td class="n">'+(d.arr?esc(d.arr):'<span style="color:var(--muted)">blank</span>')+'</td><td class="n">'+esc(d.cr)+'</td><td class="l">'+(d.next?esc(d.next):'<span class="pill bad">Not set</span>')+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty">No open SDR-sourced deals.</td></tr>';

  /* review */
  $('revHead').innerHTML='<tr><th>Signal</th>'+S.map(function(s){return '<th>'+esc(s.short)+'</th>';}).join('')+'</tr>';
  var rows=[['In Progress accounts not contacted in 14+ days','stuck'],['Accounts still at New','newAcc'],['Past meetings with no outcome (this month)','noOutcome'],['Open deals with no next step','noNext']];
  $('revBody').innerHTML=rows.map(function(r){return '<tr><td>'+r[0]+'</td>'+S.map(function(s){return '<td class="n">'+dn(s.review[r[1]],r[1],'all',s.k)+'</td>';}).join('')+'</tr>';}).join('')+
    '<tr><td>Calls with no outcome ('+(P==='wk'?'this week':'this month')+')</td>'+S.map(function(s){return '<td class="n">'+s.calls[P].none+'</td>';}).join('')+'</tr>'+
    '<tr><td>Same-day redials ('+(P==='wk'?'this week':'this month')+')</td>'+S.map(function(s){return '<td class="n">'+s.cq[P].same+'</td>';}).join('')+'</tr>';
  applyFilters();
  if(window.SDRMatt)try{window.SDRMatt({view:state.view,pod:state.pod,per:P,cus:state.cus,byK:byK});}catch(err){console.error(err);}
  if(window.SDRReport)try{window.SDRReport({view:state.view,pod:state.pod,byK:byK});}catch(err){console.error(err);}
  if(window.SDRCalls)try{window.SDRCalls({view:state.view,pod:state.pod,per:P,cus:state.cus,byK:byK});}catch(err){console.error(err);}
  if(window.SDRReports)try{window.SDRReports({view:state.view,P:P,S:S,all:all,pod:state.pod,byK:byK,dn:dn,fmtK:fmtK,ct:ct,DEALS:DEALS,LISTS:LISTS,TRENDS:TRENDS,PERIODS:PERIODS});}catch(err){console.error(err);}
}
/* drill-down panel: companies behind a number, then one company's journey */
var DRILL_NAMES={assigned:'Assigned accounts',contacted:'Accounts contacted',calls:'Accounts called',conv:'Accounts with a real conversation',emails:'Accounts emailed',seq:'Accounts sent sequence emails',replies:'Accounts that replied',booked:'Meetings booked (moved to Meeting Booked in the period)',booked30:'Meetings booked in the last 30 days',held:'First meetings held this month',deals:'Open SDR deals',pos:'Positive accounts',disq:'Disqualified',notint:'Not interested',work:'Still being worked',call_conv:'Calls: real conversation',call_noans:'Calls: no answer',call_bot:'Calls: AI screening bot',call_other:'Calls: gatekeeper, wrong number, bad timing, not interested',call_none:'Calls: no outcome logged',exh:'Exhausted accounts',eng:'Engaged accounts',stuck:'In Progress, not contacted in 14+ days',newAcc:'Accounts still at New',noOutcome:'Meetings with no outcome',noNext:'Open deals with no next step',newAccwk:'New accounts called',newAccmtd:'New accounts called',fuAccwk:'Follow-up accounts called',fuAccmtd:'Follow-up accounts called'};
var DRILL_NOTES={calls:'Calls not linked to a company in HubSpot are not in this list, so it can be shorter than the number.',conv:'Calls not linked to a company in HubSpot are not in this list.',emails:'Each company is listed once, however many emails it got. Emails not linked to a company are left out.',seq:'Each company is listed once. Emails not linked to a company are left out.',replies:'Includes auto-replies. Emails not linked to a company are left out.',contacted:'Each company is listed once.'};
var dr=null,drStack=[],jCache={};
var LDAY=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'}),LTIME=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),LISO=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
function fmtD(ms){if(!ms)return '';var d=new Date(ms);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();}
function fmtT(ms){var d=new Date(ms);return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function drOpen(){if(dr)return;dr=document.createElement('div');dr.className='dr';dr.innerHTML='<div class="dr-panel" role="dialog" aria-modal="true"><div class="dr-head" id="drHead"></div><div class="dr-body" id="drBody"></div></div>';
  dr.addEventListener('click',function(e){if(e.target===dr)drClose();});document.body.appendChild(dr);document.body.style.overflow='hidden';}
function drClose(){if(!dr)return;dr.remove();dr=null;drStack=[];document.body.style.overflow='';}
function drHead(title,sub,extra){$('drHead').innerHTML=(drStack.length>1?'<button class="dr-back" id="drBack">\u2190 Back to the list</button>':'')+'<div class="dr-top"><h2>'+title+'</h2><button class="dr-x" id="drX">Close</button></div>'+(sub?'<div class="dr-sub">'+sub+'</div>':'')+(extra||'');
  $('drX').addEventListener('click',drClose);if($('drBack'))$('drBack').addEventListener('click',function(){drStack.pop();var f=drStack.pop();f();});}
function showList(title,sub,ids,note){
  var rows=ids.map(function(id){var c=CO&&CO[id]||['Company '+id,'','',''];var k=c[2]&&byK(c[2]);return [[id,c[0]],c[1]||'',k?k.short:'',c[3]?Date.parse(c[3]+'T00:00:00Z'):null];});
  showTable(title,sub,[{h:'Company',t:'co'},{h:'Account Status',t:'text'},{h:'SDR',t:'text'},{h:'Last contacted',t:'date'}],rows,note);
}
/* generic drill table: any records, sortable, filterable, CSV export; company cells open the journey */
function showTable(title,sub,cols,rows,note){
  var f=function(){showTable(title,sub,cols,rows,note);};drOpen();drStack.push(f);
  var sortI=-1,sortD=1,q='',fsel={},fdate={};
  drHead(esc(title),esc(sub)+' \u00b7 '+rows.length+(rows.length===1?' row':' rows'));
  function cellTxt(c,v){if(v==null)return '';if(c.t==='co')return v[1];if(c.t==='date')return v?LISO.format(new Date(v))+(c.time?' '+LTIME.format(new Date(v)):''):'';return String(v);}
  function cellHtml(c,v){if(v==null||v==='')return '<span class="muted">\u2013</span>';
    if(c.t==='co')return v[0]?'<button class="num" data-co="'+esc(v[0])+'">'+esc(v[1])+'</button>':esc(v[1]);
    if(c.t==='link')return '<a href="'+esc(v[0])+'" target="_blank" rel="noopener">'+esc(v[1])+'</a>';
    if(c.t==='date')return LDAY.format(new Date(v))+(c.time?' '+LTIME.format(new Date(v)):'');
    if(c.t==='pill')return pill(v);
    if(c.t==='num')return typeof v==='number'?v.toLocaleString('en-GB'):esc(v);
    return esc(v);}
  function sortKey(c,v){if(v==null)return '';if(c.t==='co'||c.t==='link')return String(v[1]).toLowerCase();if(c.t==='pill')return v[1];return typeof v==='number'?v:String(v).toLowerCase();}
  function catVal(c,v){return v==null||v===''?'(blank)':c.t==='pill'?v[1]:String(v);}
  function pass(r){
    for(var i in fsel){if(fsel[i]!==''&&catVal(cols[i],r[i])!==fsel[i])return false;}
    for(var j in fdate){var d=fdate[j],v=r[j];if(!d[0]&&!d[1])continue;if(v==null)return false;var iso=LISO.format(new Date(v));if(d[0]&&iso<d[0])return false;if(d[1]&&iso>d[1])return false;}
    return true;}
  function draw(){
    var list=rows.filter(function(r){return pass(r)&&(!q||r.some(function(v,i){return cellTxt(cols[i],v).toLowerCase().indexOf(q)>=0;}));});
    if(sortI>=0)list=list.slice().sort(function(a,b){var x=sortKey(cols[sortI],a[sortI]),y=sortKey(cols[sortI],b[sortI]);return (x<y?-1:x>y?1:0)*sortD;});
    $('dtBody').innerHTML=list.length?list.map(function(r){return '<tr>'+r.map(function(v,i){return '<td'+(cols[i].t==='num'?' class="n"':' class="l"')+'>'+cellHtml(cols[i],v)+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+cols.length+'" class="empty">Nothing matches.</td></tr>';
    var active=q||Object.keys(fsel).some(function(i){return fsel[i]!=='';})||Object.keys(fdate).some(function(i){return fdate[i][0]||fdate[i][1];});
    $('dtN').textContent=active?list.length+' of '+rows.length+' rows':'';$('dtClear').hidden=!active;
    var hasNum=cols.some(function(c){return c.t==='num';});
    $('dtFoot').innerHTML=hasNum&&list.length>1?'<tr class="team">'+cols.map(function(c,i){if(i===0)return '<td class="l">Total \u00b7 '+list.length+'</td>';if(c.t!=='num')return '<td></td>';var t=0,any=false;list.forEach(function(r){if(typeof r[i]==='number'){t+=r[i];any=true;}});return '<td class="n">'+(any?Math.round(t).toLocaleString('en-GB'):'')+'</td>';}).join('')+'</tr>':'';
    Array.prototype.forEach.call($('dtHead').children,function(th,i){th.setAttribute('aria-sort',i===sortI?(sortD>0?'ascending':'descending'):'none');});
  }
  $('drBody').innerHTML=(note?'<p class="small muted">'+esc(note)+'</p>':'')+
    '<div class="dt-tools"><input class="dr-search" id="dtQ" type="search" placeholder="Search all columns\u2026" aria-label="Search rows"><span class="tag" id="dtN"></span><button class="rp-tog" id="dtClear" hidden>Clear filters</button><button class="rp-tog" id="dtCsv">Download CSV</button></div>'+
    '<div class="dt-filters" id="dtF">'+cols.map(function(c,i){
      if(c.t==='date'){if(!rows.some(function(r){return r[i]!=null;}))return '';return '<div class="dt-f dt-fd"><span>'+esc(c.h)+'</span><input type="date" data-fd="'+i+'|0" aria-label="'+esc(c.h)+' from"><em>to</em><input type="date" data-fd="'+i+'|1" aria-label="'+esc(c.h)+' to"></div>';}
      if(c.t!=='text'&&c.t!=='pill')return '';
      var cnt={};rows.forEach(function(r){var k=catVal(c,r[i]);cnt[k]=(cnt[k]||0)+1;});var ks=Object.keys(cnt);
      if(ks.length<2||ks.length>30)return '';
      ks.sort(function(a,b){return cnt[b]-cnt[a];});
      return '<label class="dt-f"><span>'+esc(c.h)+'</span><select data-fs="'+i+'"><option value="">All ('+ks.length+')</option>'+ks.map(function(k){return '<option value="'+esc(k)+'">'+esc(k)+' \u00b7 '+cnt[k]+'</option>';}).join('')+'</select></label>';}).join('')+'</div>'+
    '<div class="tbl dt"><table><thead><tr id="dtHead">'+cols.map(function(c){return '<th class="'+(c.t==='num'?'':'l')+'" tabindex="0" title="Sort">'+esc(c.h)+'</th>';}).join('')+'</tr></thead><tbody id="dtBody"></tbody><tfoot id="dtFoot"></tfoot></table></div>';
  if(!$('dtF').children.length)$('dtF').remove();
  Array.prototype.forEach.call(document.querySelectorAll('#drBody [data-fs]'),function(el){el.addEventListener('change',function(){fsel[el.dataset.fs]=el.value;el.classList.toggle('on',!!el.value);draw();});});
  Array.prototype.forEach.call(document.querySelectorAll('#drBody [data-fd]'),function(el){el.addEventListener('change',function(){var p=el.dataset.fd.split('|');fdate[p[0]]=fdate[p[0]]||['',''];fdate[p[0]][+p[1]]=el.value;el.classList.toggle('on',!!el.value);draw();});});
  $('dtClear').addEventListener('click',function(){q='';fsel={};fdate={};$('dtQ').value='';Array.prototype.forEach.call(document.querySelectorAll('#drBody [data-fs],#drBody [data-fd]'),function(el){el.value='';el.classList.remove('on');});draw();});
  Array.prototype.forEach.call($('dtHead').children,function(th,i){var go=function(){if(sortI===i)sortD=-sortD;else{sortI=i;sortD=cols[i].t==='num'||cols[i].t==='date'?-1:1;}draw();};th.addEventListener('click',go);th.addEventListener('keydown',function(e){if(e.key==='Enter')go();});});
  $('dtQ').addEventListener('input',function(){q=this.value.toLowerCase().trim();draw();});
  $('dtCsv').addEventListener('click',function(){var csv=[cols.map(function(c){return c.h;})].concat(rows.map(function(r){return r.map(function(v,i){return cellTxt(cols[i],v);});})).map(function(r){return r.map(function(x){return '"'+String(x).replace(/"/g,'""')+'"';}).join(',');}).join(String.fromCharCode(10));
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.csv';document.body.appendChild(a);a.click();a.remove();});
  draw();dr.firstChild.scrollTop=0;
}
window.SDRDrill={table:function(t,s,c,r,n){drStack=[];showTable(t,s,c,r,n);},names:function(m){CO=CO||{};Object.keys(m).forEach(function(id){if(!CO[id])CO[id]=m[id];});}};
function openDrill(spec){var p=spec.split('|'),m=p[0],per=p[1],sk=p[2];
  var ids={};(sk?[byK(sk)]:sel()).forEach(function(s){var a=LISTS[m]&&LISTS[m][s.k]&&LISTS[m][s.k][per];(a||[]).forEach(function(id){ids[id]=1;});});
  var who=sk?byK(sk).short:(state.pod==='all'?'All SDRs':byK(state.pod).short);
  showList(DRILL_NAMES[m]||'Companies',who+' \u00b7 '+(per==='all'?'current':(per==='wk'?'This week':(PERIODS.mtd&&PERIODS.mtd.custom?cusName()+' \u00b7 '+rangeLabel('mtd'):'Month to date'))),Object.keys(ids),DRILL_NOTES[m]);}
var J_TYPES=[['all','All'],['call','Calls'],['email','Emails'],['meeting','Meetings'],['note','Notes'],['deal','Deals']];
var J_LABEL={call:'Call',email:'Email sent',reply:'Email received',meeting:'Meeting',note:'Note',deal:'Deal created'};
function showJourney(id){
  var f=function(){showJourney(id);};drOpen();drStack.push(f);
  var nm=CO&&CO[id]?CO[id][0]:'Company';
  drHead(esc(nm),'<a href="'+co(id)+'" target="_blank" rel="noopener">Open in HubSpot \u2197</a>');
  $('drBody').innerHTML='<div class="dr-load">Loading the journey from HubSpot\u2026</div>';dr.firstChild.scrollTop=0;
  var got=jCache[id]?Promise.resolve(jCache[id]):fetch('api/journey?id='+encodeURIComponent(id)).then(function(r){return r.json().then(function(d){if(!r.ok||d.error)throw d;jCache[id]=d;return d;});});
  got.then(function(j){if(!dr||drStack[drStack.length-1]!==f)return;renderJourney(j,'all');})
  .catch(function(e){if(!dr)return;$('drBody').innerHTML='<p class="muted">Couldn\u2019t load this company\u2019s history'+(e&&e.error==='missing_scope'?' (the HubSpot key is missing a read permission)':'')+'. <a href="'+co(id)+'" target="_blank" rel="noopener">Open it in HubSpot instead \u2197</a></p>';});
}
function renderJourney(j,filter){
  var s=j.summary;
  drHead(esc(j.name),[j.domain?esc(j.domain):'',j.industry?esc(j.industry):'',j.employees?esc(Number(j.employees).toLocaleString())+' employees':'','<a href="'+co(j.id)+'" target="_blank" rel="noopener">Open in HubSpot \u2197</a>'].filter(Boolean).join(' \u00b7 '),
    '<div class="j-facts">'+[['SDR',j.sdr],['Account owner',j.owner],['Status',j.status],['Engagement',j.engagement],['In HubSpot since',fmtD(j.created)]].filter(function(x){return x[1];}).map(function(x){return '<span>'+x[0]+' <b>'+esc(x[1])+'</b></span>';}).join('')+'</div>');
  var ago=s.last?Math.floor((Date.now()-s.last)/86400000):null;
  var stats='<div class="j-stats">'+
    '<div><span>First touch</span><b>'+(s.first?dnice(new Date(s.first).toISOString().slice(0,10)):'\u2013')+'</b><em>'+(s.first?new Date(s.first).getFullYear():'')+'</em></div>'+
    '<div><span>Last contacted</span><b>'+(ago==null?'\u2013':ago===0?'Today':ago+'d ago')+'</b><em>'+(s.last?fmtD(s.last):'')+'</em></div>'+
    '<div><span>Calls</span><b>'+s.calls+'</b><em>'+s.conv+' real conversations</em></div>'+
    '<div><span>Emails</span><b>'+s.emails+'</b><em>'+s.replies+' received</em></div>'+
    '<div><span>Meetings</span><b>'+s.meetings+'</b><em>'+s.held+' held</em></div>'+
    '<div><span>Deals</span><b>'+s.deals+'</b><em>'+(j.deals.length?esc(j.deals[0].st):'none yet')+'</em></div></div>';
  var people=j.contacts.length?'<div class="j-people"><b style="width:100%;font-size:.78rem">'+s.contacts+' contacts</b>'+j.contacts.slice(0,12).map(function(c){return '<a href="'+HS+'0-1/'+c.id+'" target="_blank" rel="noopener">'+esc(c.n)+'</a>'+(c.j?' <span>'+esc(c.j)+'</span>':'');}).join('')+(s.contacts>12?'<span>and '+(s.contacts-12)+' more</span>':'')+'</div>':'';
  var counts={all:j.timeline.length};j.timeline.forEach(function(x){var k=x.t==='reply'?'email':x.t;counts[k]=(counts[k]||0)+1;});
  var filt='<div class="j-filter" id="jFilter">'+J_TYPES.filter(function(t){return t[0]==='all'||counts[t[0]];}).map(function(t){return '<button data-f="'+t[0]+'" aria-pressed="'+(filter===t[0])+'">'+t[1]+' '+(counts[t[0]]||0)+'</button>';}).join('')+'</div>';
  var items=j.timeline.filter(function(x){return filter==='all'||x.t===filter||(filter==='email'&&x.t==='reply');});
  var tl='',month='';
  items.forEach(function(x){
    var mo=x.ts?MON[new Date(x.ts).getMonth()]+' '+new Date(x.ts).getFullYear():'No date';
    if(mo!==month){if(month)tl+='</ul>';tl+='<div class="j-month">'+mo+'</div><ul class="tl">';month=mo;}
    var label=J_LABEL[x.t]+(x.t==='call'&&x.out?' \u00b7 '+x.out:'')+(x.t==='meeting'&&x.out?' \u00b7 '+x.out:'')+(x.t==='email'&&x.seq?' \u00b7 sequence':'')+(x.t==='deal'&&x.out?' \u00b7 '+x.out:'');
    var meta=[x.ts?fmtD(x.ts)+(x.t!=='deal'?', '+fmtT(x.ts):''):'',x.by?(x.t==='reply'?'to ':'by ')+x.by:'',x.with?(x.t==='reply'?'from ':'with ')+x.with:'',x.t==='deal'&&x.amount?'\u00a3'+Math.round(x.amount).toLocaleString():''].filter(Boolean).join(' \u00b7 ');
    var title=x.t==='deal'?'<a href="'+dl(x.id)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a>':esc(x.title);
    tl+='<li class="'+x.t+(x.conv?' conv':'')+'"><span class="k">'+esc(label)+'</span><span class="ttl">'+title+'</span><span class="meta">'+esc(meta)+'</span>'+(x.body?'<div class="body">'+esc(x.body)+'</div>':'')+'</li>';
  });
  if(month)tl+='</ul>';
  $('drBody').innerHTML=stats+people+(j.timeline.length?filt+(tl||'<p class="muted">Nothing of this type.</p>'):'<p class="muted">No calls, emails, meetings, notes or deals are logged against this company in HubSpot yet.</p>')+(s.capped?'<p class="small muted">Showing the most recent 250 of each activity type.</p>':'');
  Array.prototype.forEach.call($('jFilter')?$('jFilter').children:[],function(b){b.addEventListener('click',function(){renderJourney(j,b.dataset.f);});});
}
document.addEventListener('click',function(e){
  var ml=e.target.closest('[data-mlist]');if(ml&&MLIST[ml.dataset.mlist]){e.preventDefault();e.stopPropagation();drStack=[];var x=MLIST[ml.dataset.mlist];
    showTable(x[1],(state.pod==='all'?'All SDRs':byK(state.pod).short)+' \u00b7 '+(state.per==='wk'?'This week':PERIODS.mtd.custom?cusName():'Month to date')+' \u00b7 '+rangeLabel(state.per)+' \u00b7 by date booked',
      [{h:'Company',t:'co'},{h:'Credited SDR',t:'text'},{h:'Booked by',t:'text'},{h:'Meeting',t:'text'},{h:'Booked on',t:'date'},{h:'Meeting date',t:'date'},{h:'Outcome',t:'text'},{h:'Status now',t:'text'},{h:'Note',t:'text'}],
      x[0].map(function(m){return [[String(m.id),m.c],byK(m.s)?byK(m.s).short:'',m.by||'',m.m||'',m.bs?Date.parse(m.bs+'T12:00:00Z'):null,m.ds&&m.d!=='\u2013'?Date.parse(m.ds+'T12:00:00Z'):null,m.o?m.o[1]:'',m.now||'',(m.x?m.x[1]:'')+(/^Meeting booked/.test(m.kind||'')?'':(m.x?'; ':'')+'In calendar only: company not at Meeting Booked')];}),
      'Counted by the date the meeting was booked: the day the company moved to Meeting Booked in HubSpot. Companies that have since moved on (for example to Open Opportunity) still count.');return;}
  var d=e.target.closest('[data-drill]');if(d&&LISTS){e.preventDefault();e.stopPropagation();drStack=[];openDrill(d.dataset.drill);return;}
  var w=e.target.closest('[data-ids]');if(w&&CO){e.preventDefault();drStack=[];var p=w.dataset.ttl.split(' \u00b7 ');showList(p[0],w.dataset.sub||(p[1]+' \u00b7 This week'),w.dataset.ids.split(','),'');return;}
  var c=e.target.closest('[data-co]');
  if(c&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&(SOURCE==='live'||(dr&&dr.contains(c)))){e.preventDefault();if(!dr||!dr.contains(c))drStack=[];showJourney(c.dataset.co);}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')drClose();});
MEETINGS=MEETINGS.filter(function(m){return !m.kind||m.kind==='First meeting';});
WINS=WINS.filter(function(w){return w.t!=='held'||!/proposal/i.test(w.x);});
render();load(false);
['matt.js','calls.js','daily.js'].forEach(function(f){var ms=document.createElement('script');ms.src=f;ms.onload=function(){render();};document.body.appendChild(ms);});
var rs=document.createElement('script');rs.src='reports.js';rs.onload=function(){render();};document.body.appendChild(rs);
window.addEventListener('hashchange',function(){var h=(location.hash||'').slice(1);if(VIEWS.some(function(v){return v.k===h;})&&h!==state.view){state.view=h;render();}});
})();
