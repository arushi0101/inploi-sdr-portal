/* Inbound form submissions: demo requests, audit unlocks and other website forms, from HubSpot (each contact's latest form).
   Data: api/data?part=forms. Sections: needs an owner, assigned (by owner), internal (inploi team), tests. */
(function(){
var DATA=null,ERR=null,LOADING=false,DAYS=30,FILTER='all';
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/0-1/';
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function nice(ms){if(!ms)return '–';return new Date(ms).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/London'});}
document.head.insertAdjacentHTML('beforeend','<style>'+
 '.fm-kpis{display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:18px}'+
 '.fm-kpis div{flex:1 1 150px;background:var(--surface);padding:12px 14px;display:grid;gap:2px}'+
 '.fm-kpis span{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}'+
 '.fm-kpis b{font-size:1.5rem;font-family:var(--f-display)}.fm-kpis em{font-style:normal;font-size:.76rem;color:var(--muted)}'+
 '.fm-kpis .warn b{color:var(--bad-fg,#b4540a)}'+
 '.fm-sec{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px;margin:22px 0 8px}'+
 '.fm-sec h3{margin:0;font-size:1rem}.fm-sec p{margin:0;font-size:.8rem;color:var(--muted)}'+
 '.fm-pill{display:inline-block;font-size:.72rem;font-weight:600;padding:2px 8px;white-space:nowrap;border:1px solid var(--line);background:var(--bg)}'+
 '.fm-demo{background:var(--accent-soft);border-color:transparent}.fm-warn{color:var(--bad-fg,#b4540a);border-color:currentColor}.fm-spam{color:var(--muted)}'+
 '.fm-grp td{background:var(--bg);font-weight:700;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}'+
 '.fm-sub{display:block;color:var(--muted);font-size:.78rem}.fm-tog{display:flex;flex-wrap:wrap;gap:4px}'+
 '.fm-tog button{background:var(--surface);border:1px solid var(--line);color:var(--fg);padding:4px 10px;font-size:.78rem;cursor:pointer}'+
 '.fm-tog button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}'+
 '</style>');
function slot(){var el=document.getElementById('formsView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='forms';el.id='formsView';el.hidden=true;any.parentNode.appendChild(el);return el;}
function load(){if(LOADING)return;LOADING=true;ERR=null;
  fetch('api/data?part=forms&days='+DAYS).then(function(r){return r.json();}).then(function(d){if(d&&d.external)DATA=d;else ERR=(d&&(d.message||d.error))||'no data';})
  .catch(function(x){ERR=String(x&&x.message||x);}).then(function(){LOADING=false;draw();});}
function pill(r){return '<span class="fm-pill'+(r.form==='demo'?' fm-demo':'')+'">'+e(r.formLabel)+'</span>'+(r.site?'<span class="fm-sub">'+e(r.site)+'</span>':'');}
function who(r){return '<a href="'+HS+e(r.id)+'" target="_blank" rel="noopener"><b>'+e(r.name)+'</b></a>'+(r.title?'<span class="fm-sub">'+e(r.title)+'</span>':'');}
function ctx(r){var c=r.co||{};var t=r.bucket==='customer'?'<span class="fm-pill fm-warn">Existing customer</span>':r.bucket==='pipeline'?'<span class="fm-pill fm-demo">In the pipeline</span>':'<span class="fm-pill">New business</span>';
  return t+'<span class="fm-sub">Account Status: '+e(c.accountStatus||'empty')+'</span>';}
function deal(r){var D=(r.co&&r.co.openDeals)||[];return D.length?D.map(function(d){return e(d.stage)+'<span class="fm-sub">'+e(d.owner)+'</span>';}).join('<br>'):'<span class="muted">None</span>';}
function own(r){var c=r.co||{};return 'SDR: <b>'+e(c.sdr||r.owner||'none')+'</b><span class="fm-sub">Company owner: '+e(c.owner||'none')+'</span><span class="fm-sub">Working on it: '+e(r.working||'nobody yet')+'</span>';}
function touch(r){if(!r.touch)return '<span class="muted">None logged</span>';var n=Math.floor((Date.now()-r.touch)/86400000);return e(nice(r.touch))+'<span class="fm-sub">'+(n<=0?'today':n===1?'yesterday':n+' days ago')+'</span>';}
function cname(r){var c=r.co;return c?'<a href="https://app-eu1.hubspot.com/contacts/25735731/record/0-2/'+e(c.id)+'" target="_blank" rel="noopener">'+e(c.name)+'</a>':e(r.company);}
function cnt(L,f){return L.filter(function(r){return r.form===f;}).length;}
function tbl(head,body){return '<div class="tbl" style="overflow-x:auto"><table><thead><tr>'+head.map(function(h){return '<th class="'+(h[1]||'l')+'">'+h[0]+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';}
function html(){
  var tog='<div class="fm-tog" role="group" aria-label="Period">'+[7,30,90].map(function(d){return '<button type="button" data-fdays="'+d+'" aria-pressed="'+(d===DAYS)+'">Last '+d+' days</button>';}).join('')+'</div>';
  if(!DATA)return '<div class="card">'+tog+'<p class="muted">'+(ERR?'Couldn’t load form submissions ('+e(ERR)+').':'Loading form submissions…')+'</p></div>';
  var D=DATA,ext=D.external,un=ext.filter(function(r){return !r.assigned;}),as=ext.filter(function(r){return r.assigned;}),real=un.filter(function(r){return !r.spam;});
  var o='<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;align-items:center;margin-bottom:12px"><p class="muted small" style="margin:0;max-width:75ch">Website forms from HubSpot: each person appears once, under their latest form. <b>Assigned</b> means the contact owner is an active SDR or AE. <b>Needs an owner</b> means no owner, an owner who has left, or an owner outside sales. Internal and test submissions are kept out of the counts.</p>'+tog+'</div>';
  o+='<div class="fm-kpis">'+
    '<div><span>External submissions</span><b>'+ext.length+'</b><em>'+cnt(ext,'demo')+' demo · '+cnt(ext,'audit')+' audit · '+cnt(ext,'other')+' other</em></div>'+
    '<div><span>Assigned</span><b>'+as.length+'</b><em>Owned by an active SDR or AE</em></div>'+
    '<div class="'+(real.length?'warn':'')+'"><span>Needs an owner</span><b>'+un.length+'</b><em>'+real.length+' real lead'+(real.length===1?'':'s')+', '+(un.length-real.length)+' likely spam</em></div>'+
    '<div><span>Internal</span><b>'+D.internal.length+'</b><em>inploi team, no action</em></div></div>';
  o+=tbl([['Form'],['Demo requests','n'],['Audit unlocks','n'],['Other','n'],['Total','n']],
    [['Assigned',as],['Needs an owner',un],['<b>External total</b>',ext]].map(function(x){return '<tr><td class="l">'+x[0]+'</td><td class="n">'+cnt(x[1],'demo')+'</td><td class="n">'+cnt(x[1],'audit')+'</td><td class="n">'+cnt(x[1],'other')+'</td><td class="n"><b>'+x[1].length+'</b></td></tr>';}).join('')+
    '<tr><td class="l muted">Internal</td><td class="n muted">'+cnt(D.internal,'demo')+'</td><td class="n muted">'+cnt(D.internal,'audit')+'</td><td class="n muted">'+cnt(D.internal,'other')+'</td><td class="n muted">'+D.internal.length+'</td></tr>');
  var L=un.filter(function(r){return FILTER==='all'?true:FILTER==='spam'?r.spam:!r.spam;});
  o+='<div class="fm-sec"><h3>1 · Needs an owner ('+un.length+')</h3><div class="fm-tog" role="group" aria-label="Filter">'+[['all','All'],['real','Real leads only'],['spam','Likely spam']].map(function(f){return '<button type="button" data-ffil="'+f[0]+'" aria-pressed="'+(FILTER===f[0])+'">'+f[1]+'</button>';}).join('')+'</div></div>';
  o+=tbl([['Date'],['Form'],['Company'],['Contact'],['Customer or pipeline?'],['Open deal'],['Current owner'],['Last touch'],['Assessment']],
    L.length?L.map(function(r){return '<tr><td class="l">'+e(nice(r.at))+'</td><td class="l">'+pill(r)+'</td><td class="l">'+cname(r)+'</td><td class="l">'+who(r)+'</td><td class="l">'+ctx(r)+'</td><td class="l">'+deal(r)+'</td><td class="l">'+e(r.owner)+'</td><td class="l">'+touch(r)+'</td><td class="l">'+(r.spam?'<span class="fm-pill fm-spam">Likely spam</span>':r.bucket==='new'?'<span class="fm-pill fm-warn">Assign an SDR</span>':'<span class="fm-pill">Check with the account owner</span>')+(r.note?'<span class="fm-sub">'+e(r.note)+'</span>':'')+'</td></tr>';}).join(''):'<tr><td class="l muted" colspan="9">Nothing here.</td></tr>');
  o+='<div class="fm-sec"><h3>2 · Assigned ('+as.length+')</h3><p>Grouped by owner</p></div>';
  var order=D.order.slice();as.forEach(function(r){if(order.indexOf(r.owner)<0)order.push(r.owner);});
  o+=tbl([['Date'],['Form'],['Company'],['Contact'],['Customer or pipeline?'],['Open deal'],['Who\u2019s on it'],['Last touch']],
    as.length?order.map(function(w){var G=as.filter(function(r){return r.owner===w;});if(!G.length)return '';
      return '<tr class="fm-grp team"><td colspan="8">'+e(w)+' · '+G.length+'</td></tr>'+G.map(function(r){return '<tr><td class="l">'+e(nice(r.at))+'</td><td class="l">'+pill(r)+'</td><td class="l">'+who(r)+'</td><td class="l">'+e(r.company)+'</td><td class="l">'+e(r.status||'–')+'</td><td class="l muted">'+e(r.note)+'</td></tr>';}).join('');}).join(''):'<tr><td class="l muted" colspan="6">Nothing here.</td></tr>');
  o+='<div class="fm-sec"><h3>3 · Internal submissions ('+D.internal.length+')</h3><p>inploi team running the audit or testing. Not leads, no action.</p></div>';
  o+=tbl([['Latest'],['Form'],['Person'],['Forms in total','n'],['Latest site checked']],
    D.internal.length?D.internal.map(function(r){return '<tr><td class="l">'+e(nice(r.at))+'</td><td class="l"><span class="fm-pill">'+e(r.formLabel)+'</span></td><td class="l">'+e(r.name)+'</td><td class="n">'+r.runs+'</td><td class="l muted">'+e(r.site||'–')+'</td></tr>';}).join(''):'<tr><td class="l muted" colspan="5">Nothing here.</td></tr>');
  o+='<div class="fm-sec"><h3>4 · Tests and samples ('+D.tests.length+')</h3><p>Left out of every count above</p></div>';
  o+=tbl([['Date'],['Form'],['Contact'],['Why left out']],
    D.tests.length?D.tests.map(function(r){return '<tr><td class="l">'+e(nice(r.at))+'</td><td class="l"><span class="fm-pill">'+e(r.formLabel)+'</span></td><td class="l">'+e(r.name)+'</td><td class="l muted">'+e(r.why)+'</td></tr>';}).join(''):'<tr><td class="l muted" colspan="4">Nothing here.</td></tr>');
  o+='<p class="muted small" style="margin-top:14px">Updated '+e(new Date(D.generatedAt).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}))+' UK. Click a name to open the contact in HubSpot.</p>';
  return '<div class="card">'+o+'</div>';
}
function draw(){var el=slot();if(!el)return;el.innerHTML=html();
  Array.prototype.forEach.call(el.querySelectorAll('[data-fdays]'),function(b){b.onclick=function(){var d=Number(b.getAttribute('data-fdays'));if(d===DAYS)return;DAYS=d;DATA=null;draw();load();};});
  Array.prototype.forEach.call(el.querySelectorAll('[data-ffil]'),function(b){b.onclick=function(){FILTER=b.getAttribute('data-ffil');draw();};});}
window.SDRForms=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='forms';if(a.view!=='forms')return;if(!DATA&&!ERR)load();draw();};
})();
