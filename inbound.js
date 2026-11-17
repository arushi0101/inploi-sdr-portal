/* Inbound › Weekly inbound report. Everything inbound for one week (Mon–Sun, UK): where leads came from, SDR outreach,
   form submissions (with a form dropdown), website visits and event leads, each with last touch, last contacted and who.
   Layout: header with week switcher, KPI cards (with change vs the week before), then tabs: Overview, Forms, Visits, Events, Outreach.
   Data: api/data?part=inweek&day=YYYY-MM-DD (the same model as the Friday email, &fmt=email). */
(function(){
var CACHE={},ERR={},LOADING={},WEEK=null,TAB='overview',FF={form:'all',stage:'ext'},VF='all',EF={ev:'all',k:'all'},Q='';
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
try{var t=localStorage.getItem('iwTab');if(t)TAB=t;}catch(x){}
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function d(ms){return ms?new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'}):'–';}
function ago(ms){if(!ms)return '';var n=Math.floor((Date.now()-ms)/86400000);return n<=0?'today':n===1?'yesterday':n+'d ago';}
function nice(s){return new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});}
function ukToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());}
function monday(s){var x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return x.toISOString().slice(0,10);}
function shift(s,n){var x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
if(!WEEK)WEEK=monday(ukToday());
function link(t,id,k){return id?'<a class="iw-a" href="'+HS+k+'/'+id+'" target="_blank" rel="noopener">'+e(t)+'</a>':e(t);}
function ini(n){n=String(n||'').replace(/\(.*?\)/g,'').trim();if(!n)return '?';var p=n.split(/\s+/);return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase();}
function av(n){if(!n||/^No owner|^No one/.test(n))return '<span class="iw-none">'+e(n||'—')+'</span>';var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%360;
  return '<span class="iw-av"><i style="background:hsl('+h+' 55% 92%);color:hsl('+h+' 45% 32%)">'+e(ini(n))+'</i>'+e(n)+'</span>';}
function slot(){var el=document.getElementById('inweekView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='inweekly';el.id='inweekView';el.hidden=true;any.parentNode.appendChild(el);return el;}
var I={
  leads:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  web:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  ev:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  co:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01"/>',
  con:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',ext:'<path d="M7 17 17 7M8 7h9v9"/>'};
function ic(k,s){return '<svg viewBox="0 0 24 24" width="'+(s||16)+'" height="'+(s||16)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+I[k]+'</svg>';}

document.head.insertAdjacentHTML('beforeend','<style>'+
 ':root{--iw-q:#0e7a46;--iw-qb:#e6f5ec;--iw-dq:#b4321b;--iw-dqb:#fcebe6;--iw-wip:#1f5fbf;--iw-wipb:#e8f0fc;--iw-ns:#8a5a00;--iw-nsb:#fbf1dc;--iw-n:#6f6b66;--iw-nb:#f1efeb;--iw-sh:0 1px 2px rgba(20,18,16,.04),0 4px 14px rgba(20,18,16,.05)}'+
 '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--iw-q:#5fd39a;--iw-qb:#14301f;--iw-dq:#ff9b85;--iw-dqb:#3a1a14;--iw-wip:#8fb6ff;--iw-wipb:#16243d;--iw-ns:#f0c060;--iw-nsb:#332710;--iw-n:#a8a29c;--iw-nb:#262422;--iw-sh:0 1px 2px rgba(0,0,0,.3)}}'+
 ':root[data-theme="dark"]{--iw-q:#5fd39a;--iw-qb:#14301f;--iw-dq:#ff9b85;--iw-dqb:#3a1a14;--iw-wip:#8fb6ff;--iw-wipb:#16243d;--iw-ns:#f0c060;--iw-nsb:#332710;--iw-n:#a8a29c;--iw-nb:#262422;--iw-sh:0 1px 2px rgba(0,0,0,.3)}'+
 '#inweekView{display:grid;gap:16px;font-variant-numeric:tabular-nums}'+
 '.iw-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--iw-sh);min-width:0}'+
 '.iw-pad{padding:18px 20px}'+
 /* header */
 '.iw-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px}'+
 '.iw-top h2{margin:0;font-size:1.35rem;font-family:var(--f-display);letter-spacing:-.01em}'+
 '.iw-top p{margin:4px 0 0;color:var(--muted);font-size:.85rem}'+
 '.iw-wk{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'+
 '.iw-step{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--fg);cursor:pointer;font-size:.95rem;display:grid;place-items:center}'+
 '.iw-step:hover:not(:disabled){border-color:var(--muted)}.iw-step:disabled{opacity:.35;cursor:default}'+
 '.iw-range{font-weight:600;font-size:.9rem;padding:0 4px;white-space:nowrap}'+
 '.iw-seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}'+
 '.iw-seg button{border:0;background:none;color:var(--muted);padding:5px 11px;border-radius:7px;font-size:.8rem;font-weight:500;cursor:pointer}'+
 '.iw-seg button[aria-pressed=true]{background:var(--surface);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.08)}'+
 '.iw-live{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:600;color:var(--iw-wip);background:var(--iw-wipb);padding:3px 9px;border-radius:99px;margin-left:8px;vertical-align:middle}.iw-live::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}'+
 /* kpis */
 '.iw-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,46%),1fr));gap:12px}'+
 '.iw-kpi{padding:16px 18px;display:grid;gap:6px;cursor:pointer;text-align:left;font:inherit;color:inherit;transition:border-color .15s,transform .15s}.iw-kpi:hover{border-color:var(--muted);transform:translateY(-1px)}'+
 '.iw-kpi .h{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:.78rem;font-weight:500}'+
 '.iw-kpi .h span{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}'+
 '.iw-kpi .v{display:flex;align-items:baseline;gap:8px}.iw-kpi .v b{font-family:var(--f-display);font-size:2rem;font-weight:600;line-height:1}'+
 '.iw-kpi .s{font-size:.78rem;color:var(--muted)}'+
 '.iw-dl{font-size:.72rem;font-weight:600;padding:2px 7px;border-radius:99px;background:var(--iw-nb);color:var(--iw-n)}.iw-dl.up{background:var(--iw-qb);color:var(--iw-q)}.iw-dl.down{background:var(--iw-dqb);color:var(--iw-dq)}'+
 /* tabs */
 '.iw-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 12px;overflow-x:auto}'+
 '.iw-tabs button{border:0;background:none;color:var(--muted);padding:13px 12px 11px;font-size:.88rem;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;display:inline-flex;align-items:center;gap:7px}'+
 '.iw-tabs button:hover{color:var(--fg)}.iw-tabs button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent)}'+
 '.iw-tabs em{font-style:normal;font-size:.7rem;font-weight:600;background:var(--bg);border:1px solid var(--line);border-radius:99px;padding:0 7px;color:var(--muted)}'+
 '.iw-body{padding:18px 20px 20px;display:grid;gap:20px}'+
 '.iw-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 10px}.iw-h h3{margin:0;font-size:.95rem;font-weight:600}.iw-h p{margin:0;font-size:.78rem;color:var(--muted)}'+
 '.iw-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:16px}.iw-t td:nth-child(2),.iw-t td:nth-child(3){min-width:140px}'+
 '.iw-split{display:grid;grid-template-columns:minmax(250px,300px) minmax(0,1fr);gap:20px;align-items:start}@media (max-width:980px){.iw-split{grid-template-columns:minmax(0,1fr)}}.iw-split>*,.iw-cols>*{min-width:0}'+
 '.iw-panel{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--surface)}'+
 /* bar breakdown lists */
 '.iw-bars{list-style:none;margin:0;padding:0;display:grid;gap:2px}'+
 '.iw-bars li>*{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;width:100%;padding:7px 8px;border-radius:8px;border:0;background:none;font:inherit;color:inherit;text-align:left}'+
 '.iw-bars button{cursor:pointer}.iw-bars button:hover{background:var(--bg)}.iw-bars button[aria-pressed=true]{background:var(--accent-soft)}'+
 '.iw-bars .lb{font-size:.84rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iw-bars .ct{font-weight:600;font-size:.88rem}'+
 '.iw-bars .tr{grid-column:1/-1;height:5px;border-radius:99px;background:var(--bg);overflow:hidden}.iw-bars .tr i{display:block;height:100%;border-radius:99px;background:var(--accent);opacity:.75}'+
 '.iw-bars li.sub .lb{padding-left:12px;color:var(--muted)}.iw-bars li.hd>*{padding-top:12px}.iw-bars li.hd .lb{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:var(--muted)}'+
 '.iw-bars .q i{background:var(--iw-q)}.iw-bars .dq i{background:var(--iw-dq)}.iw-bars .wip i{background:var(--iw-wip)}.iw-bars .ns i{background:var(--iw-ns)}'+
 /* funnel */
 '.iw-fun{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}'+
 '.iw-fun>*{background:var(--surface);padding:12px 14px;display:grid;gap:2px;border:0;text-align:left;font:inherit;color:inherit;cursor:pointer}.iw-fun>*:hover{background:var(--bg)}'+
 '.iw-fun span{font-size:.72rem;color:var(--muted);font-weight:500}.iw-fun b{font-size:1.35rem;font-family:var(--f-display)}.iw-fun small{font-size:.72rem;color:var(--muted)}'+
 /* toolbar */
 '.iw-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}'+
 '.iw-sel{font:inherit;font-size:.84rem;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:7px 30px 7px 10px;cursor:pointer;max-width:300px;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 15px) 52%,calc(100% - 10px) 52%;background-size:5px 5px;background-repeat:no-repeat}'+
 '.iw-search{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:9px;padding:0 10px;background:var(--surface);color:var(--muted);flex:1 1 200px;max-width:280px}.iw-search input{border:0;background:none;font:inherit;font-size:.84rem;color:var(--fg);padding:7px 0;width:100%;outline:none}'+
 '.iw-chip{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:500;background:var(--accent-soft);color:var(--fg);border-radius:99px;padding:4px 6px 4px 11px}.iw-chip button{border:0;background:none;cursor:pointer;color:var(--muted);font-size:.9rem;line-height:1;padding:0 4px}'+
 '.iw-cnt{margin-left:auto;font-size:.78rem;color:var(--muted)}'+
 /* tables */
 '.iw-tw{border:1px solid var(--line);border-radius:12px;overflow:auto;max-height:620px}'+
 '.iw-t{width:100%;min-width:1040px;border-collapse:separate;border-spacing:0;font-size:.83rem}'+
 '.iw-t th{position:sticky;top:0;z-index:1;background:var(--bg);text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap}'+
 '.iw-t td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}.iw-t tr:last-child td{border-bottom:0}.iw-t tbody tr:hover td{background:var(--bg)}'+
 '.iw-t .n{text-align:right}.iw-t tr.tot td{font-weight:700;background:var(--bg);border-top:1px solid var(--line)}'+
 '.iw-t .pri{font-weight:600}.iw-t small{display:block;color:var(--muted);font-size:.74rem;margin-top:1px}.iw-t .nw{white-space:nowrap}'+
 '.iw-a{color:var(--fg);text-decoration:none;font-weight:600}.iw-a:hover{color:var(--link);text-decoration:underline}'+
 '.iw-p{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:600;padding:3px 9px;border-radius:99px;background:var(--iw-nb);color:var(--iw-n);white-space:nowrap}.iw-p::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}'+
 '.iw-p.q{background:var(--iw-qb);color:var(--iw-q)}.iw-p.dq{background:var(--iw-dqb);color:var(--iw-dq)}.iw-p.wip{background:var(--iw-wipb);color:var(--iw-wip)}.iw-p.ns{background:var(--iw-nsb);color:var(--iw-ns)}'+
 '.iw-av{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}.iw-av i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:.62rem;font-weight:700;flex:none}'+
 '.iw-none{color:var(--muted)}.iw-sc{display:inline-flex;align-items:center;gap:6px}.iw-sc i{width:34px;height:5px;border-radius:99px;background:var(--bg);overflow:hidden;display:inline-block}.iw-sc i b{display:block;height:100%;background:var(--accent)}'+
 '.iw-empty{padding:34px;text-align:center;color:var(--muted);font-size:.86rem}'+
 '.iw-foot{font-size:.74rem;color:var(--muted);margin:0;line-height:1.5}'+
 '.iw-skel{display:grid;gap:12px}.iw-skel i{display:block;height:84px;border-radius:14px;background:linear-gradient(90deg,var(--surface),var(--bg),var(--surface));background-size:200% 100%;animation:iwSk 1.2s linear infinite}@keyframes iwSk{to{background-position:-200% 0}}'+
 '@media (max-width:620px){.iw-pad,.iw-body{padding-left:14px;padding-right:14px}.iw-kpi{padding:12px 14px}.iw-kpi .v b{font-size:1.6rem}.iw-fun{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
 '</style>');

function load(w){if(LOADING[w]||CACHE[w])return;LOADING[w]=true;ERR[w]=null;
  fetch('api/data?part=inweek&day='+w+(w===monday(ukToday())?'&v='+Math.floor(Date.now()/600000):'')).then(function(r){return r.json();})
  .then(function(j){if(j&&j.S)CACHE[w]=j;else ERR[w]=(j&&(j.message||j.error))||'no data';})
  .catch(function(x){ERR[w]=String(x&&x.message||x);}).then(function(){LOADING[w]=false;
    if(w===WEEK&&CACHE[w])load(shift(w,-7)); // the week before, for the change on each KPI card
    draw();});}

var STAGE_CLS={'Qualified':'q','Disqualified':'dq','In progress':'wip','Not started':'ns','Not assigned':'ns'};
function pill(s){return '<span class="iw-p '+(STAGE_CLS[s]||'')+'">'+e(s)+'</span>';}
function delta(cur,prev,partial){if(prev==null||partial)return '';var x=cur-prev;return '<span class="iw-dl '+(x>0?'up':x<0?'down':'')+'" title="vs the week before ('+prev+')">'+(x>0?'▲ ':x<0?'▼ ':'')+(x===0?'no change':Math.abs(x))+'</span>';}
function who(r){return '<td class="nw">'+(r.by?av(r.by)+'<small>'+e(r.byKind)+(r.byAt?' · '+d(r.byAt):'')+'</small>':'<span class="iw-none">No one yet</span>')+'</td>';}
function touch(r){return '<td class="nw">'+d(r.lastTouch)+(r.lastTouch?'<small>'+ago(r.lastTouch)+'</small>':'')+'</td><td class="nw">'+d(r.lastContacted)+(r.lastContacted?'<small>'+ago(r.lastContacted)+'</small>':'')+'</td>'+who(r);}
var TH_T='<th>Last touch</th><th>Last contacted</th><th>Last touched by</th>';
function bars(items,max,attr,cur){max=Math.max(1,max);return '<ul class="iw-bars">'+items.map(function(x){
  if(x.hd)return '<li class="hd"><div><span class="lb">'+e(x.hd)+'</span></div></li>';
  var inner='<span class="lb" title="'+e(x.l)+'">'+e(x.l)+'</span><span class="ct">'+x.n+'</span><span class="tr '+(x.c||'')+'"><i style="width:'+Math.round(x.n/max*100)+'%"></i></span>';
  return '<li class="'+(x.sub?'sub':'')+'">'+(attr&&x.k!=null?'<button type="button" '+attr+'="'+e(x.k)+'" aria-pressed="'+(cur===x.k)+'">'+inner+'</button>':'<div>'+inner+'</div>')+'</li>';}).join('')+'</ul>';}
function match(r,keys){if(!Q)return true;var q=Q.toLowerCase();return keys.some(function(k){return String(r[k]||'').toLowerCase().indexOf(q)>=0;});}
function toolbar(sel,chip,n,unit){return '<div class="iw-tool">'+sel+'<label class="iw-search">'+ic('search',14)+'<input type="search" data-q placeholder="Search company or contact" value="'+e(Q)+'"></label>'+
  (chip?'<span class="iw-chip">'+e(chip)+'<button type="button" data-clear aria-label="Clear filter">×</button></span>':'')+'<span class="iw-cnt">'+n+' '+(n===1?unit:unit==='company'?'companies':unit+'s')+'</span></div>';}
function opts(list,cur){return list.map(function(o){return '<option value="'+e(o[0])+'"'+(o[0]===cur?' selected':'')+'>'+e(o[1])+'</option>';}).join('');}
function table(head,rows,cols){return '<div class="iw-tw"><table class="iw-t"><thead><tr>'+head+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+cols+'"><div class="iw-empty">Nothing matches this filter.</div></td></tr>')+'</tbody></table></div>';}

/* ---------- sections ---------- */
function overview(D,S,O){
  var o='<div class="iw-cols">';
  o+='<div class="iw-panel"><div class="iw-h"><h3>Where inbound came from</h3></div>'+bars([{l:'Website forms (leads)',n:S.inbound.leads,k:'forms'},{l:'Website visits (companies)',n:S.inbound.visits,k:'visits'},{l:'Events (leads)',n:S.inbound.events,k:'events'}],Math.max(S.inbound.leads,S.inbound.visits,S.inbound.events),'data-go')+'</div>';
  o+='<div class="iw-panel"><div class="iw-h"><h3>Form leads by source</h3><p>Original traffic source</p></div>'+(D.bySource.length?bars(D.bySource.map(function(x){return {l:x.name,n:x.n};}),D.bySource[0].n):'<div class="iw-empty">No form leads</div>')+'</div>';
  o+='<div class="iw-panel"><div class="iw-h"><h3>Form leads by form</h3></div>'+(D.byForm.length?bars(D.byForm.map(function(x){return {l:x.name,n:x.n,k:x.name};}),D.byForm[0].n,'data-ff'):'<div class="iw-empty">No form leads</div>')+'</div></div>';
  o+='<div><div class="iw-h"><h3>Form submissions</h3><p>External leads, by where they are now</p></div><div class="iw-fun">'+
    [['ext','External leads',S.forms.external-S.forms.spam,S.forms.internal+' internal'],['assigned','Assigned',S.forms.assigned,S.forms.unassigned+' not assigned'],['In progress','In progress',S.forms.inProgress,S.forms.notStarted+' not started'],['Qualified','Qualified',S.forms.qualified,''],['Disqualified','Disqualified',S.forms.disqualified,S.forms.spam?S.forms.spam+' spam':'']]
    .map(function(x){return '<button type="button" data-fgo="'+e(x[0])+'"><span>'+e(x[1])+'</span><b>'+x[2]+'</b><small>'+e(x[3])+'</small></button>';}).join('')+'</div></div>';
  o+='<div class="iw-cols"><div><div class="iw-h"><h3>Website visits</h3></div><div class="iw-fun">'+
    [['all','Companies',S.visits.companies,S.visits.inCrm+' in HubSpot'],['new','Net new',S.visits.netNew,''],['Qualified','Qualified',S.visits.qualified,''],['Disqualified','Disqualified',S.visits.disqualified,S.visits.unscored?S.visits.unscored+' not scored':''],['newicp','Net new ICP',S.visits.netNewIcp,'']]
    .map(function(x){return '<button type="button" data-vgo="'+e(x[0])+'"><span>'+e(x[1])+'</span><b>'+x[2]+'</b><small>'+e(x[3])+'</small></button>';}).join('')+'</div></div>'+
    '<div><div class="iw-h"><h3>Events</h3></div><div class="iw-fun">'+
    [['all','Event leads',S.events.leads,S.events.met+' met'],['icp','ICP fit',S.events.icp,S.events.notIcp+' not ICP'],['icpOld','ICP, already in CRM',S.events.icpExisting,''],['icpNew','ICP, net new co.',S.events.icpNew,S.events.netNewIcpCos+' companies created']]
    .map(function(x){return '<button type="button" data-ego="'+e(x[0])+'"><span>'+e(x[1])+'</span><b>'+x[2]+'</b><small>'+e(x[3])+'</small></button>';}).join('')+'</div></div></div>';
  if(O)o+='<div><div class="iw-h"><h3>SDR outreach</h3><p>Accounts and contacts called or emailed</p></div>'+outTable(O)+'</div>';
  return o;
}
function outTable(O){
  var mx=Math.max.apply(null,O.bySdr.map(function(x){return x.cos;}).concat([1]));
  return table('<th>SDR</th><th class="n">Accounts</th><th class="n">Net new accounts</th><th class="n">Contacts</th><th class="n">Net new contacts</th><th class="n">Calls</th><th class="n">Emails</th>',
    O.bySdr.map(function(x){return '<tr><td>'+av(x.name)+'</td><td class="n"><span class="iw-sc">'+x.cos+'<i><b style="width:'+Math.round(x.cos/mx*100)+'%"></b></i></span></td><td class="n pri">'+x.newCos+'</td><td class="n">'+x.cons+'</td><td class="n pri">'+x.newCons+'</td><td class="n">'+x.calls+'</td><td class="n">'+x.emails+'</td></tr>';})
    .concat(['<tr class="tot"><td>Team</td><td class="n">'+O.total.cos+'</td><td class="n">'+O.total.newCos+'</td><td class="n">'+O.total.cons+'</td><td class="n">'+O.total.newCons+'</td><td class="n">'+O.total.calls+'</td><td class="n">'+O.total.emails+'</td></tr>']),7);
}
var FSTAGE={ext:'External leads',assigned:'Assigned',unassigned:'Not assigned','Not started':'Not started','In progress':'In progress',Qualified:'Qualified',Disqualified:'Disqualified','Existing customer':'Existing customer',spam:'Spam',all:'Every external submission'};
function formsTab(D){
  var forms=['all'].concat(Array.from(new Set(D.forms.map(function(r){return r.form;})))),inF=function(r){return FF.form==='all'||r.form===FF.form;};
  var F=D.forms.filter(inF),real=F.filter(function(r){return !r.spam;}),internal=FF.form==='all'?D.internal:D.internal.filter(function(r){return r.form===FF.form;});
  var n=function(f){return real.filter(f).length;},stg=function(s){return n(function(r){return r.assigned&&r.stage===s;});};
  var items=[{l:'All submissions',n:F.length+internal.length},{l:'Internal (inploi team)',n:internal.length,sub:1},{l:'External leads',n:real.length,k:'ext',sub:1},
    {hd:'External leads'},{l:'Assigned',n:n(function(r){return r.assigned;}),k:'assigned'},{l:'Not started',n:stg('Not started'),k:'Not started',sub:1,c:'ns'},{l:'In progress',n:stg('In progress'),k:'In progress',sub:1,c:'wip'},
    {l:'Qualified',n:stg('Qualified'),k:'Qualified',sub:1,c:'q'},{l:'Disqualified',n:F.filter(function(r){return r.stage==='Disqualified';}).length,k:'Disqualified',sub:1,c:'dq'}];
  if(stg('Existing customer'))items.push({l:'Existing customer',n:stg('Existing customer'),k:'Existing customer',sub:1});
  items.push({l:'Not assigned',n:n(function(r){return !r.assigned;}),k:'unassigned',c:'ns'});
  if(F.some(function(r){return r.spam;}))items.push({l:'Spam (disqualified on review)',n:F.filter(function(r){return r.spam;}).length,k:'spam',c:'dq'});
  var s=FF.stage,rows=F.filter(function(r){return (s==='all'||(s==='ext'&&!r.spam)||(s==='assigned'&&r.assigned&&!r.spam)||(s==='unassigned'&&!r.assigned&&!r.spam)||(s==='spam'&&r.spam)||(s==='Disqualified'?r.stage==='Disqualified':r.assigned&&!r.spam&&r.stage===s))&&match(r,['name','company','owner']);});
  return '<div class="iw-split"><div class="iw-panel">'+bars(items,F.length+internal.length,'data-fs',FF.stage)+'</div><div>'+
    toolbar('<select class="iw-sel" data-fsel aria-label="Form">'+opts(forms.map(function(f){return [f,f==='all'?'All forms':f];}),FF.form)+'</select>',FSTAGE[s]&&s!=='ext'?FSTAGE[s]:'',rows.length,'lead')+
    table('<th>Submitted</th><th>Contact</th><th>Company</th><th>Form</th><th>Source</th><th>Owner</th><th>Stage</th>'+TH_T,
      rows.map(function(r){return '<tr><td class="nw">'+d(r.at)+'</td><td>'+link(r.name,r.id,'0-1')+(r.title?'<small>'+e(r.title)+'</small>':'')+'</td><td>'+link(r.company,r.coId,'0-2')+(r.accountStatus?'<small>'+e(r.accountStatus)+'</small>':'')+'</td><td>'+e(r.form)+'</td><td>'+e(r.source)+(r.utm?'<small>UTM '+e(r.utm)+'</small>':r.sourceDetail?'<small>'+e(r.sourceDetail)+'</small>':'')+'</td><td>'+av(r.owner)+'</td><td>'+pill(r.stage)+'<small>'+e(r.note||r.status)+'</small></td>'+touch(r)+'</tr>';}),10)+'</div></div>';
}
var VLAB={all:'',new:'Net new',Qualified:'Qualified',Disqualified:'Disqualified','Not scored':'Not scored',newicp:'Net new ICP'};
function visitsTab(D,S){
  var V=D.visits.filter(function(v){return (VF==='all'||(VF==='new'&&v.netNew)||(VF==='newicp'&&v.netNewIcp)||v.verdict===VF)&&match(v,['name','sdr','owner']);});
  var items=[{l:'Companies on the website',n:S.visits.companies,k:'all'},{l:'Net new companies',n:S.visits.netNew,k:'new',sub:1},{hd:'ICP verdict'},{l:'Qualified (6/10+)',n:S.visits.qualified,k:'Qualified',sub:1,c:'q'},{l:'Disqualified (under 6)',n:S.visits.disqualified,k:'Disqualified',sub:1,c:'dq'}];
  if(S.visits.unscored)items.push({l:'Not scored yet',n:S.visits.unscored,k:'Not scored',sub:1,c:'ns'});
  items.push({hd:'Net new ICP'},{l:'Net new ICP companies',n:S.visits.netNewIcp,k:'newicp',c:'q'},{l:'Matched to HubSpot',n:S.visits.inCrm});
  return '<div class="iw-split"><div class="iw-panel">'+bars(items,S.visits.companies,'data-vf',VF)+'</div><div>'+toolbar('',VLAB[VF],V.length,'company')+
    table('<th>First visit</th><th>Company</th><th class="n">Visits</th><th>ICP score</th><th>Net new</th><th>Account status</th><th>SDR Owner</th>'+TH_T,
      V.map(function(v){var sc=v.score==null?'<span class="iw-none">Not scored</span>':'<span class="iw-sc"><i><b style="width:'+(v.score*10)+'%"></b></i>'+v.score+'/10</span>';
        return '<tr><td class="nw"><a class="iw-a" href="'+e(v.link)+'" target="_blank" rel="noopener" title="Open the alert">'+d(v.at)+'</a></td><td>'+(v.coId?link(v.name,v.coId,'0-2'):'<span class="pri">'+e(v.name)+'</span><small>Not in HubSpot</small>')+'</td><td class="n">'+v.visits+'</td><td class="nw">'+sc+'<small>'+pill(v.verdict)+'</small></td><td>'+(v.netNew?(v.netNewIcp?'<span class="iw-p q">Net new ICP</span>':'<span class="iw-p">Net new</span>'):'<span class="iw-none">Seen before</span>')+'</td><td>'+e(v.customer?'Customer':v.accountStatus||'—')+(v.owner?'<small>Owner: '+e(v.owner)+'</small>':'')+'</td><td>'+av(v.sdr||'No owner')+'</td>'+touch(v)+'</tr>';}),10)+'</div></div>';
}
var EK={all:function(){return true;},met:function(x){return x.met;},want:function(x){return x.want;},icp:function(x){return x.icp==='ICP fit';},icpOld:function(x){return x.icp==='ICP fit'&&x.coBucket==='Company already in CRM';},icpNew:function(x){return x.icp==='ICP fit'&&x.coBucket==='Net new company';},icpMiss:function(x){return x.icp==='ICP fit'&&x.coBucket==='Not in HubSpot';},notIcp:function(x){return x.icp==='Not ICP';},unchk:function(x){return x.icp==='Not checked';},
  existing:function(x){return x.existing;},newOld:function(x){return x.bucket==='New contact, company already in CRM';},net:function(x){return x.bucket==='Net new contact and company';},noct:function(x){return !x.inCrm;}};
var ELAB={met:'Met / attended',want:'Wanted to meet',icp:'ICP fit',icpOld:'ICP · company already in CRM',icpNew:'ICP · net new company',icpMiss:'ICP · company not in HubSpot',notIcp:'Not ICP',unchk:'ICP not marked',existing:'Contact already in CRM',newOld:'New contact, company in CRM',net:'Net new contact and company',noct:'Contact not in HubSpot'};
var EBK={'Existing contact':'Contact already in CRM','New contact, company already in CRM':'New contact · company in CRM','Net new contact and company':'Net new contact + company','New contact, no company':'New contact · no company','Company in CRM, contact not added':'Company in CRM · contact not added','Company added, contact not added':'Company added · contact not added','Not in HubSpot yet':'Not in HubSpot yet'};
function eventsTab(D){
  var evs=['all'].concat(Array.from(new Set(D.events.map(function(x){return x.event||'Event';}))));
  var E0=D.events.filter(function(x){return EF.ev==='all'||(x.event||'Event')===EF.ev;}),c=function(k){return E0.filter(EK[k]).length;};
  var E=E0.filter(function(x){return EK[EF.k](x)&&match(x,['name','company','owner','event']);});
  var netIcpCos=new Set(E0.filter(EK.icpNew).map(function(x){return x.coId;})).size;
  var items=[{l:'Event leads',n:E0.length,k:'all'},{l:'Met / attended',n:c('met'),k:'met',sub:1},{l:'Wanted to meet / signed up',n:c('want'),k:'want',sub:1},
    {hd:'ICP (events sheet)'},{l:'ICP fit',n:c('icp'),k:'icp',c:'q'},{l:'Company already in CRM',n:c('icpOld'),k:'icpOld',sub:1},{l:'Net new company created',n:c('icpNew'),k:'icpNew',sub:1},{l:'Company not in HubSpot yet',n:c('icpMiss'),k:'icpMiss',sub:1,c:'ns'},{l:'Net new ICP companies created',n:netIcpCos,sub:1},
    {l:'Not ICP',n:c('notIcp'),k:'notIcp',c:'dq'}].concat(c('unchk')?[{l:'ICP not marked in the sheet',n:c('unchk'),k:'unchk',c:'ns'}]:[]).concat([
    {hd:'Already in the CRM?'},{l:'Contact already in CRM',n:c('existing'),k:'existing'},{l:'New contact, company in CRM',n:c('newOld'),k:'newOld'},{l:'Net new contact and company',n:c('net'),k:'net'},{l:'Contact not in HubSpot',n:c('noct'),k:'noct',c:'ns'}]);
  return '<div class="iw-split"><div class="iw-panel">'+bars(items,E0.length,'data-ek',EF.k)+'<p class="iw-foot" style="margin-top:10px">From the events sheet'+(D.S.events.syncedAt?', synced '+e(new Date(D.S.events.syncedAt).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})):'')+'.</p></div><div>'+
    toolbar(evs.length>2?'<select class="iw-sel" data-esel aria-label="Event">'+opts(evs.map(function(x){return [x,x==='all'?'All events':x];}),EF.ev)+'</select>':'',ELAB[EF.k]||'',E.length,'lead')+
    table('<th>Event</th><th>Contact</th><th>Company</th><th>ICP</th><th>In the CRM</th><th>Owner</th>'+TH_T,
      E.map(function(x){return '<tr><td>'+e(x.event||'—')+'<small>'+d(x.at)+(x.met?' · met':x.want?' · wanted to meet':'')+'</small></td><td>'+(x.id?link(x.name,x.id,'0-1')+(x.title?'<small>'+e(x.title)+'</small>':''):'<span class="iw-none">Not in HubSpot</span>')+'</td><td>'+link(x.company,x.coId,'0-2')+(x.accountStatus?'<small>'+e(x.accountStatus)+'</small>':x.industry?'<small>'+e(x.industry)+'</small>':'')+'</td><td>'+pill(x.icp==='ICP fit'?'Qualified':x.icp==='Not ICP'?'Disqualified':'Not started').replace(/>(Qualified|Disqualified|Not started)</,'>'+e(x.icp)+'<')+(x.icpAt&&x.icpAt.length?'<small>ICP at '+e(x.icpAt.join(', '))+'</small>':'')+(x.why&&!(x.icpAt&&x.icpAt.length)?'<small title="'+e(x.why)+'">'+e(x.why.length>70?x.why.slice(0,70)+'…':x.why)+'</small>':'')+'</td><td>'+e(EBK[x.bucket]||x.bucket)+'</td><td>'+av(x.owner)+(x.status?'<small>'+e(x.status)+'</small>':'')+'</td>'+touch(x)+'</tr>';}),10)+'</div></div>';
}

function html(){
  var D=CACHE[WEEK],thisWk=monday(ukToday()),P=CACHE[shift(WEEK,-7)],partial=D&&D.to<D.sunday;
  var head='<div class="iw-card iw-pad iw-top"><div><h2>Weekly inbound report'+(WEEK===thisWk?'<span class="iw-live">This week so far</span>':'')+'</h2><p>'+e(nice(D?D.from:WEEK))+' – '+e(nice(D?D.to:shift(WEEK,6)))+' · UK time · Emailed to Arushi every Friday</p></div>'+
    '<div class="iw-wk"><button type="button" class="iw-step" data-wk="prev" aria-label="Previous week">‹</button><button type="button" class="iw-step" data-wk="next" aria-label="Next week"'+(WEEK>=thisWk?' disabled':'')+'>›</button>'+
    '<div class="iw-seg"><button type="button" data-wk="this" aria-pressed="'+(WEEK===thisWk)+'">This week</button><button type="button" data-wk="last" aria-pressed="'+(WEEK===shift(thisWk,-7))+'">Last week</button></div></div></div>';
  if(!D)return head+(ERR[WEEK]?'<div class="iw-card iw-pad"><p>Couldn’t load this week ('+e(ERR[WEEK])+').</p><button type="button" class="iw-step" style="width:auto;padding:0 12px" data-retry>Try again</button></div>'
    :'<div class="iw-skel"><div class="iw-kpis">'+'<i></i><i></i><i></i><i></i><i></i>'+'</div><i style="height:360px"></i><p class="iw-foot">Pulling the week from HubSpot and #inbound-visits. This takes about 30 seconds.</p></div>');
  var S=D.S,O=D.outreach,PS=P&&P.S,PO=P&&P.outreach;
  var k=function(tab,icon,label,v,pv,sub){return '<button type="button" class="iw-card iw-kpi" data-tab="'+tab+'"><span class="h">'+e(label)+'<span>'+ic(icon,15)+'</span></span><span class="v"><b>'+v+'</b>'+delta(v,pv,partial)+'</span><span class="s">'+e(sub)+'</span></button>';};
  var o=head+'<div class="iw-kpis">'+
    k('forms','leads','Inbound leads',S.inbound.leads,PS&&PS.inbound.leads,S.forms.assigned+' assigned · '+S.forms.unassigned+' not assigned')+
    k('visits','web','Companies on the website',S.visits.companies,PS&&PS.visits.companies,S.visits.netNew+' net new · '+S.visits.netNewIcp+' net new ICP')+
    k('events','ev','Event leads',S.events.leads,PS&&PS.events.leads,S.events.icp+' ICP fit · '+S.events.netNewIcpCos+' net new ICP companies')+
    (O?k('outreach','co','Accounts reached',O.total.cos,PO&&PO.total.cos,O.total.newCos+' net new accounts')+k('outreach','con','Contacts reached',O.total.cons,PO&&PO.total.cons,O.total.newCons+' net new contacts'):'')+'</div>';
  var tabs=[['overview','Overview',''],['forms','Form submissions',S.forms.external],['visits','Website visits',S.visits.companies],['events','Events',S.events.leads],['outreach','SDR outreach',O?O.total.cos:'']];
  o+='<div class="iw-card"><nav class="iw-tabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(TAB===t[0])+'">'+e(t[1])+(t[2]!==''?'<em>'+t[2]+'</em>':'')+'</button>';}).join('')+'</nav><div class="iw-body">'+
    (TAB==='forms'?formsTab(D):TAB==='visits'?visitsTab(D,S):TAB==='events'?eventsTab(D):TAB==='outreach'?(O?'<div><div class="iw-h"><h3>Accounts and contacts the SDRs called or emailed</h3><p>Net new = no SDR call or email earlier this year</p></div>'+outTable(O)+'</div>':'<div class="iw-empty">Outreach isn’t available for this week.</div>'):overview(D,S,O))+'</div></div>';
  o+='<p class="iw-foot">Form stages: <b>Qualified</b> = open deal, meeting booked or Visible Opportunity · <b>Disqualified</b> = Not Qualified, Lost, Do Not Contact, Bounced, or spam · <b>In progress</b> = No Two-Way / Two-Way / Engaged, or touched since the form · <b>Not started</b> = no touch since the form. Visits: qualified = ICP score 6/10+ in the alert thread; net new = first-ever alert this week. Events: from the events sheet (EVENTS LEADS LISTS 26) by event date; ICP = the sheet’s “Company Fits ICP Matrix?”; CRM status is checked in HubSpot as of the event date. <b>Last touched by</b> = the latest call, email, meeting or LinkedIn message. Updated '+e(new Date(D.generatedAt).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}))+'.</p>';
  return o;
}
function setTab(t){TAB=t;try{localStorage.setItem('iwTab',t);}catch(x){}}
function draw(){var el=slot();if(!el||el.hidden)return;
  var a=document.activeElement,typing=a&&a.matches&&a.matches('[data-q]'),pos=typing?a.selectionStart:0;
  el.innerHTML=html();
  if(typing){var q=el.querySelector('[data-q]');if(q){q.focus();try{q.setSelectionRange(pos,pos);}catch(x){}}}
  var on=function(sel,ev,fn){Array.prototype.forEach.call(el.querySelectorAll(sel),function(b){b.addEventListener(ev,function(){fn(b);});});};
  on('[data-wk]','click',function(b){var k=b.getAttribute('data-wk'),t=monday(ukToday());WEEK=k==='this'?t:k==='last'?shift(t,-7):shift(WEEK,k==='prev'?-7:7);if(WEEK>t)WEEK=t;FF={form:'all',stage:'ext'};VF='all';EF={ev:'all',k:'all'};Q='';load(WEEK);draw();});
  on('[data-retry]','click',function(){load(WEEK);draw();});
  on('[data-tab]','click',function(b){setTab(b.getAttribute('data-tab'));Q='';draw();});
  on('[data-go]','click',function(b){setTab(b.getAttribute('data-go'));draw();});
  on('[data-fgo]','click',function(b){setTab('forms');FF.stage=b.getAttribute('data-fgo');draw();});
  on('[data-vgo]','click',function(b){setTab('visits');VF=b.getAttribute('data-vgo');draw();});
  on('[data-ego]','click',function(b){setTab('events');EF.k=b.getAttribute('data-ego');draw();});
  on('[data-ff]','click',function(b){setTab('forms');FF.form=b.getAttribute('data-ff');FF.stage='ext';draw();});
  on('[data-fsel]','change',function(b){FF.form=b.value;draw();});
  on('[data-fs]','click',function(b){FF.stage=b.getAttribute('data-fs');draw();});
  on('[data-vf]','click',function(b){VF=b.getAttribute('data-vf');draw();});
  on('[data-esel]','change',function(b){EF.ev=b.value;draw();});
  on('[data-ek]','click',function(b){EF.k=b.getAttribute('data-ek');draw();});
  on('[data-q]','input',function(b){Q=b.value;draw();});
  on('[data-clear]','click',function(){if(TAB==='forms')FF.stage='ext';else if(TAB==='visits')VF='all';else EF.k='all';draw();});
}
window.SDRInWeek=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='inweekly';if(a.view!=='inweekly')return;load(WEEK);draw();};
})();
