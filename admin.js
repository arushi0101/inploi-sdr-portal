/* Arushi's report: what was created and moved in HubSpot on a UK day (contacts, companies, deals, deal stage moves),
   with who did it and why (record source). Data: api/data?part=admin&day=YYYY-MM-DD. Also sent to Arushi's Slack DM at 18:45 UTC daily. */
(function(){
var CACHE={},ERR={},LOADING={},DAY=null,TAB='companies';
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var LISO=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
function today(){return LISO.format(new Date());}
function addD(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function nice(d){var p=d.split('-');return new Date(Date.UTC(+p[0],+p[1]-1,+p[2],12)).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});}
function tm(x){if(!x)return '';var d=new Date(x);return isNaN(d)?'':d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});}
function lk(type,id,txt){return id?'<a href="'+HS+type+'/'+e(id)+'" target="_blank" rel="noopener">'+e(txt||id)+'</a>':e(txt);}
function slot(){var el=document.getElementById('adminView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='arushi';el.id='adminView';el.hidden=true;any.parentNode.appendChild(el);return el;}
function load(d){if(LOADING[d]||CACHE[d])return;LOADING[d]=true;delete ERR[d];
  fetch('api/data?part=admin&day='+d).then(function(r){return r.json();}).then(function(x){if(x&&x.totals)CACHE[d]=x;else ERR[d]=(x&&(x.message||x.error))||'no data';})
  .catch(function(x){ERR[d]=String(x&&x.message||x);}).then(function(){LOADING[d]=false;draw();});}
var KS='flex:1 1 140px;background:var(--surface);padding:12px 14px;display:grid;gap:2px';
function kpi(l,v){return '<div style="'+KS+'"><span style="font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">'+e(l)+'</span><b style="font-size:1.5rem;font-family:var(--f-display)">'+e(v)+'</b></div>';}
function table(head,rows,empty){return '<div class="tbl" style="overflow-x:auto"><table><thead><tr>'+head.map(function(h){return '<th class="l">'+e(h)+'</th>';}).join('')+'</tr></thead><tbody>'+
  (rows.length?rows.join(''):'<tr><td colspan="'+head.length+'" class="empty">'+e(empty)+'</td></tr>')+'</tbody></table></div>';}
function td(x){return '<td class="l">'+x+'</td>';}
function html(){
  var d=DAY,A=CACHE[d];
  var bar='<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">'+
    '<button type="button" class="num" data-ad="-1">← Previous day</button>'+
    '<input type="date" id="adDay" value="'+d+'" max="'+today()+'" style="font:inherit;padding:4px 6px">'+
    '<button type="button" class="num" data-ad="1"'+(d>=today()?' disabled':'')+'>Next day →</button>'+
    (d!==today()?'<button type="button" class="num" data-ad="0">Today</button>':'')+
    '<span class="muted small" style="margin-left:auto">'+(A?'Updated '+tm(A.generatedAt)+' UK':'')+'</span></div>';
  var intro='<p class="muted small" style="margin:0 0 12px">Everything created or moved in HubSpot on <b>'+e(nice(d))+'</b> (UK time), so you can check and confirm it. '+
    '<b>By</b> is the HubSpot user who made the record or the move (or the tool, e.g. an import, form, integration or workflow); <b>reason</b> is HubSpot’s own record of where it came from. '+
    'Sent to your Slack DM at 18:45 UTC every day. Only for Arushi.</p>';
  if(!A)return '<div class="card">'+bar+intro+'<p class="muted">'+(ERR[d]?'Couldn’t load the report ('+e(ERR[d])+'). <button type="button" class="num" data-retry="1">Try again</button>':'Loading HubSpot changes for '+e(nice(d))+'… (can take up to a minute)')+'</p></div>';
  var T=A.totals,out=bar+intro;
  out+='<div style="display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:16px">'+
    kpi('Contacts created',T.contacts)+kpi('Companies created',T.companies)+kpi('Deals created',T.deals)+kpi('Deal stage moves',T.moves)+'</div>';
  out+='<h3 style="margin:4px 0 8px">By user</h3>'+table(['Who','Contacts','Companies','Deals','Stage moves'],
    (A.byUser||[]).map(function(u){return '<tr>'+td('<b>'+e(u.who)+'</b>')+'<td class="n">'+u.contacts+'</td><td class="n">'+u.companies+'</td><td class="n">'+u.deals+'</td><td class="n">'+u.moves+'</td></tr>';}),'Nothing created or moved on this day.');
  var tabs=[['companies','Companies',T.companies],['contacts','Contacts',T.contacts],['deals','Deals',T.deals],['moves','Pipeline moves',T.moves]];
  out+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:18px 0 8px">'+tabs.map(function(t){return '<button type="button" class="num'+(TAB===t[0]?' on':'')+'" data-atab="'+t[0]+'"'+(TAB===t[0]?' style="background:var(--accent-soft);font-weight:600"':'')+'>'+t[1]+' ('+t[2]+')</button>';}).join('')+'</div>';
  if(TAB==='companies')out+=table(['Company','Domain','Company owner','SDR Owner','Account status','By','Time','Reason'],
    A.companies.map(function(c){return '<tr>'+td(lk('0-2',c.id,c.name||'(no name)'))+td(e(c.domain))+td(e(c.owner))+td(e(c.sdr))+td(e(c.status))+td(e(c.by))+td(e(tm(c.at)))+td('<span class="small">'+e(c.reason)+'</span>')+'</tr>';}),'No companies created.');
  if(TAB==='contacts')out+=table(['Contact','Email','Company','Job title','Owner','By','Time','Reason'],
    A.contacts.map(function(c){return '<tr>'+td(lk('0-1',c.id,c.name||c.email||'(no name)'))+td(e(c.email))+td(e(c.company))+td(e(c.title))+td(e(c.owner))+td(e(c.by))+td(e(tm(c.at)))+td('<span class="small">'+e(c.reason)+'</span>')+'</tr>';}),'No contacts created.');
  if(TAB==='deals')out+=table(['Deal','Pipeline','Stage','Amount','Owner','By','Time','Reason'],
    A.deals.map(function(c){return '<tr>'+td(lk('0-3',c.id,c.name||'(no name)'))+td(e(c.pipeline))+td(e(c.stage))+td(c.amount?e('£'+Number(c.amount).toLocaleString('en-GB')):'')+td(e(c.owner))+td(e(c.by))+td(e(tm(c.at)))+td('<span class="small">'+e(c.reason)+'</span>')+'</tr>';}),'No deals created.');
  if(TAB==='moves')out+=table(['Deal','Pipeline','From','To','By','Time','Reason'],
    A.moves.map(function(m){return '<tr>'+td(lk('0-3',m.id,m.deal||'(no name)'))+td(e(m.pipeline))+td(e(m.from||'(new)'))+td('<b>'+e(m.to)+'</b>')+td(e(m.by))+td(e(tm(m.at)))+td('<span class="small">'+e(m.reason)+'</span>')+'</tr>';}),'No deals moved stage.');
  return '<div class="card">'+out+'</div>';
}
function go(d){DAY=d;load(d);draw();}
function draw(){var el=slot();if(!el)return;el.innerHTML=html();
  Array.prototype.forEach.call(el.querySelectorAll('[data-ad]'),function(b){b.onclick=function(){var n=+b.getAttribute('data-ad');go(n===0?today():addD(DAY,n));};});
  Array.prototype.forEach.call(el.querySelectorAll('[data-atab]'),function(b){b.onclick=function(){TAB=b.getAttribute('data-atab');draw();};});
  var r=el.querySelector('[data-retry]');if(r)r.onclick=function(){delete ERR[DAY];load(DAY);draw();};
  var inp=el.querySelector('#adDay');if(inp)inp.onchange=function(){if(/^\d{4}-\d{2}-\d{2}$/.test(inp.value))go(inp.value);};}
window.SDRAdmin=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='arushi';if(a.view!=='arushi')return;if(!DAY)DAY=today();if(!CACHE[DAY]&&!ERR[DAY])load(DAY);draw();};
})();
