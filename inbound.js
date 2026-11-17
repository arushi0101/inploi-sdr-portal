/* Inbound › Weekly report. Everything inbound for one week (Mon–Sun, UK), in tables: where leads came from, SDR outreach,
   form submissions (with a form dropdown), website visits and event leads, each with last touch, last contacted and who.
   Data: api/data?part=inweek&day=YYYY-MM-DD (the same model as the Friday email, &fmt=email). */
(function(){
var CACHE={},ERR={},LOADING={},WEEK=null,FF={form:'all',stage:'all'},VF='all',EF={ev:'all',k:'all'};
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function d(ms){return ms?new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'}):'–';}
function nice(s){return new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});}
function ukToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());}
function monday(s){var x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return x.toISOString().slice(0,10);}
function shift(s,n){var x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
if(!WEEK)WEEK=monday(ukToday());
function link(t,id,k){return id?'<a href="'+HS+k+'/'+id+'" target="_blank" rel="noopener">'+e(t)+'</a>':e(t);}
function slot(){var el=document.getElementById('inweekView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='inweekly';el.id='inweekView';el.hidden=true;any.parentNode.appendChild(el);return el;}
document.head.insertAdjacentHTML('beforeend','<style>'+
 '#inweekView{display:grid;gap:18px}'+
 '.iw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}'+
 '.iw h3{margin:0 0 4px;font-size:1.05rem;font-family:var(--f-display)}.iw .sub{margin:0 0 12px;color:var(--muted);font-size:.84rem}'+
 '.iw table{width:100%;border-collapse:collapse;font-size:.84rem}.iw th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}'+
 '.iw td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}.iw td.n,.iw th.n{text-align:right;font-variant-numeric:tabular-nums}.iw tr.tot td{font-weight:700;border-top:2px solid var(--line)}'+
 '.iw tr.sel td{background:var(--accent-soft)}.iw .ind td:first-child{padding-left:22px;color:var(--muted)}'+
 '.iw .wrap{overflow-x:auto}.iw .muted{color:var(--muted)}.iw .pill{display:inline-block;font-size:.72rem;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--bg);border:1px solid var(--line);white-space:nowrap}'+
 '.iw .pill.q{color:#0a7a44;border-color:#9fd9b8}.iw .pill.dq{color:#a32900;border-color:#f0b9a3}.iw .pill.wip{color:#1a5fb4;border-color:#a9c7ef}.iw .pill.ns{color:#8a6100;border-color:#ecd28e}'+
 '.iw-bar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;margin-bottom:12px}.iw-bar label{display:grid;gap:4px;font-size:.7rem;color:var(--muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase}'+
 '.iw-bar select{font:inherit;font-size:.84rem;text-transform:none;letter-spacing:0;font-weight:400;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:6px 8px;max-width:280px}'+
 '.iw .who{white-space:nowrap}.iw .who small{display:block;color:var(--muted);font-size:.74rem}'+
 '</style>');

function load(w){if(LOADING[w]||CACHE[w])return;LOADING[w]=true;ERR[w]=null;
  fetch('api/data?part=inweek&day='+w+(w===monday(ukToday())?'&v='+Math.floor(Date.now()/600000):'')).then(function(r){return r.json();})
  .then(function(j){if(j&&j.S)CACHE[w]=j;else ERR[w]=(j&&(j.message||j.error))||'no data';})
  .catch(function(x){ERR[w]=String(x&&x.message||x);}).then(function(){LOADING[w]=false;draw();});}

function stagePill(s){var c=s==='Qualified'?'q':s==='Disqualified'?'dq':s==='In progress'?'wip':s==='Not started'||s==='Not assigned'?'ns':'';return '<span class="pill '+c+'">'+e(s)+'</span>';}
function who(r){return '<td class="who">'+(r.by?e(r.by)+'<small>'+e(r.byKind)+(r.byAt?' · '+d(r.byAt):'')+'</small>':'<span class="muted">No one yet</span>')+'</td>';}
function touch(r){return '<td>'+d(r.lastTouch)+'</td><td>'+d(r.lastContacted)+'</td>'+who(r);}
var TH_T='<th>Last touch</th><th>Last contacted</th><th>Last touched by</th>';
function cnt(label,n,attr,sel,cls){return '<tr class="'+(cls||'')+(sel?' sel':'')+'"><td>'+(attr?'<button type="button" class="num" '+attr+'>'+e(label)+'</button>':e(label))+'</td><td class="n"><b>'+n+'</b></td></tr>';}
function opts(list,cur){return list.map(function(o){return '<option value="'+e(o[0])+'"'+(o[0]===cur?' selected':'')+'>'+e(o[1])+'</option>';}).join('');}

function html(){
  var D=CACHE[WEEK],thisWk=monday(ukToday());
  var head='<div class="fm-card iw"><div class="fm-head"><div><h3>Weekly inbound report</h3><p>Week of '+e(nice(D?D.from:WEEK))+(D?' to '+e(nice(D.to))+(D.to<D.sunday?' (so far)':''):'')+'. Inbound leads, SDR outreach, form submissions, website visits and events. The same tables go to Arushi by email every Friday. UK time.</p></div>'+
    '<div class="fm-seg"><button type="button" data-wk="prev">← Previous</button><button type="button" data-wk="this" aria-pressed="'+(WEEK===thisWk)+'">This week</button><button type="button" data-wk="last" aria-pressed="'+(WEEK===shift(thisWk,-7))+'">Last week</button><button type="button" data-wk="next"'+(WEEK>=thisWk?' disabled':'')+'>Next →</button></div></div></div>';
  if(!D)return head+'<div class="fm-card"><p class="muted">'+(ERR[WEEK]?'Couldn’t load this week ('+e(ERR[WEEK])+'). <button type="button" class="fm-btn" data-retry>Try again</button>':'Loading the week from HubSpot and #inbound-visits… (about 30 seconds)')+'</p></div>';
  var S=D.S,O=D.outreach,o=head;
  o+='<div class="fm-kpis">'+[['Inbound leads',S.inbound.leads,'website forms, real leads'],['Companies on the website',S.visits.companies,S.visits.netNew+' net new · '+S.visits.netNewIcp+' net new ICP'],['Event leads',S.events.leads,S.events.icp+' ICP fit · '+S.events.netNewIcpCos+' net new ICP cos'],
    ['Accounts reached by SDRs',O?O.total.cos:'–',O?O.total.newCos+' net new':''],['Contacts reached by SDRs',O?O.total.cons:'–',O?O.total.newCons+' net new':'']]
    .map(function(k){return '<div class="fm-card fm-kpi"><span class="l">'+e(k[0])+'</span><span class="n">'+e(k[1])+'</span><span class="s">'+e(k[2])+'</span></div>';}).join('')+'</div>';

  /* where from */
  o+='<div class="fm-card iw"><h3>Where inbound leads came from</h3><p class="sub">Website forms count real external submissions (no spam, internal or tests). Source is HubSpot’s Original Traffic Source.</p><div class="iw-grid">'+
    '<div><table><thead><tr><th>Channel</th><th class="n">Count</th></tr></thead><tbody>'+cnt('Website forms (leads)',S.inbound.leads)+cnt('Website visits (companies)',S.inbound.visits)+cnt('Events (leads)',S.inbound.events)+'</tbody></table></div>'+
    '<div><table><thead><tr><th>Form leads by source</th><th class="n">Leads</th></tr></thead><tbody>'+(D.bySource.length?D.bySource.map(function(x){return cnt(x.name,x.n);}).join(''):'<tr><td colspan="2" class="muted">None</td></tr>')+'</tbody></table></div>'+
    '<div><table><thead><tr><th>Form leads by form</th><th class="n">Leads</th></tr></thead><tbody>'+(D.byForm.length?D.byForm.map(function(x){return cnt(x.name,x.n,'data-ff="'+e(x.name)+'"');}).join(''):'<tr><td colspan="2" class="muted">None</td></tr>')+'</tbody></table></div></div></div>';

  /* outreach */
  o+='<div class="fm-card iw"><h3>SDR outreach</h3><p class="sub">Accounts and contacts each SDR called or emailed this week. Net new = no SDR call or email earlier this year (same rule as the weekly report).</p>'+
    (O?'<div class="wrap"><table><thead><tr><th>SDR</th><th class="n">Accounts</th><th class="n">Net new accounts</th><th class="n">Contacts</th><th class="n">Net new contacts</th><th class="n">Calls</th><th class="n">Emails</th></tr></thead><tbody>'+
      O.bySdr.map(function(x){return '<tr><td>'+e(x.name)+'</td><td class="n">'+x.cos+'</td><td class="n"><b>'+x.newCos+'</b></td><td class="n">'+x.cons+'</td><td class="n"><b>'+x.newCons+'</b></td><td class="n">'+x.calls+'</td><td class="n">'+x.emails+'</td></tr>';}).join('')+
      '<tr class="tot"><td>Team</td><td class="n">'+O.total.cos+'</td><td class="n">'+O.total.newCos+'</td><td class="n">'+O.total.cons+'</td><td class="n">'+O.total.newCons+'</td><td class="n">'+O.total.calls+'</td><td class="n">'+O.total.emails+'</td></tr></tbody></table></div>'
     :'<p class="muted">Not available ('+e(D.outreachError||'')+').</p>')+'</div>';

  /* forms */
  var forms=['all'].concat(Array.from(new Set(D.forms.map(function(r){return r.form;})))),inF=function(r){return FF.form==='all'||r.form===FF.form;};
  var F=D.forms.filter(inF),real=F.filter(function(r){return !r.spam;}),internal=FF.form==='all'?D.internal:D.internal.filter(function(r){return r.form===FF.form;});
  var n=function(f){return real.filter(f).length;},stg=function(s){return n(function(r){return r.assigned&&r.stage===s;});};
  var sb=function(k,label,v,cls){return cnt(label,v,'data-fs="'+k+'"',FF.stage===k,cls);};
  var rows=F.filter(function(r){var s=FF.stage;return s==='all'||(s==='ext'&&!r.spam)||(s==='assigned'&&r.assigned&&!r.spam)||(s==='unassigned'&&!r.assigned&&!r.spam)||(s==='spam'&&r.spam)||(s==='Disqualified'?r.stage==='Disqualified':r.assigned&&!r.spam&&r.stage===s);});
  o+='<div class="fm-card iw"><h3>Form submissions</h3><p class="sub">Pick a form, then click a count to list those leads. Assigned = owned by an SDR or AE.</p>'+
    '<div class="iw-bar"><label>Form<select data-fsel>'+opts(forms.map(function(f){return [f,f==='all'?'All forms':f];}),FF.form)+'</select></label></div>'+
    '<div class="iw-grid" style="grid-template-columns:minmax(240px,340px) minmax(0,1fr)"><div><table><thead><tr><th>Breakdown</th><th class="n">Count</th></tr></thead><tbody>'+
      cnt('All submissions',F.length+internal.length)+cnt('Internal (inploi team)',internal.length,'',false,'ind')+sb('ext','External (real leads)',real.length,'ind')+
      sb('assigned','Assigned',n(function(r){return r.assigned;}),'ind')+sb('Not started','→ Not started',stg('Not started'),'ind')+sb('In progress','→ In progress (being worked)',stg('In progress'),'ind')+
      sb('Qualified','→ Qualified',stg('Qualified'),'ind')+sb('Disqualified','→ Disqualified',F.filter(function(r){return r.stage==='Disqualified';}).length,'ind')+(stg('Existing customer')?sb('Existing customer','→ Existing customer',stg('Existing customer'),'ind'):'')+
      sb('unassigned','Not assigned',n(function(r){return !r.assigned;}),'ind')+(F.some(function(r){return r.spam;})?sb('spam','Spam (disqualified on review)',F.filter(function(r){return r.spam;}).length,'ind'):'')+
      sb('all','Show every external submission',F.length)+'</tbody></table></div>'+
    '<div class="wrap"><table><thead><tr><th>Submitted</th><th>Contact</th><th>Company</th><th>Form</th><th>Source</th><th>Owner</th><th>Stage</th><th>Lead status</th>'+TH_T+'</tr></thead><tbody>'+
      (rows.length?rows.map(function(r){return '<tr><td>'+d(r.at)+'</td><td>'+link(r.name,r.id,'0-1')+(r.title?'<br><small class="muted">'+e(r.title)+'</small>':'')+'</td><td>'+link(r.company,r.coId,'0-2')+'</td><td>'+e(r.form)+'</td><td>'+e(r.source)+'</td><td>'+e(r.owner)+'</td><td>'+stagePill(r.stage)+(r.note?'<br><small class="muted">'+e(r.note)+'</small>':'')+'</td><td>'+e(r.status)+'</td>'+touch(r)+'</tr>';}).join(''):'<tr><td colspan="11" class="muted">None.</td></tr>')+
    '</tbody></table></div></div></div>';

  /* visits */
  var V=D.visits.filter(function(v){return VF==='all'||(VF==='new'&&v.netNew)||(VF==='newicp'&&v.netNewIcp)||v.verdict===VF;});
  var vb=function(k,l,x,cls){return cnt(l,x,'data-vf="'+k+'"',VF===k,cls);};
  o+='<div class="fm-card iw"><h3>Website visits</h3><p class="sub">Companies from the Dealfront alerts in #inbound-visits. Qualified = ICP score 6/10 or higher; disqualified = scored under 6. Net new = first-ever visit alert this week.</p>'+
    '<div class="iw-grid" style="grid-template-columns:minmax(240px,340px) minmax(0,1fr)"><div><table><thead><tr><th>Breakdown</th><th class="n">Companies</th></tr></thead><tbody>'+
      vb('all','Companies on the website',S.visits.companies)+vb('new','Net new companies',S.visits.netNew,'ind')+vb('Qualified','Qualified visits',S.visits.qualified,'ind')+vb('Disqualified','Disqualified visits',S.visits.disqualified,'ind')+
      (S.visits.unscored?vb('Not scored','Not scored yet',S.visits.unscored,'ind'):'')+vb('newicp','Net new ICP companies',S.visits.netNewIcp,'ind')+cnt('Matched to a HubSpot company',S.visits.inCrm,'',false,'ind')+'</tbody></table></div>'+
    '<div class="wrap"><table><thead><tr><th>First visit</th><th>Company</th><th class="n">Visits</th><th class="n">ICP</th><th>Verdict</th><th>Net new</th><th>Account status</th><th>SDR Owner</th><th>Company owner</th>'+TH_T+'</tr></thead><tbody>'+
      (V.length?V.map(function(v){return '<tr><td><a href="'+e(v.link)+'" target="_blank" rel="noopener">'+d(v.at)+'</a></td><td>'+(v.coId?link(v.name,v.coId,'0-2'):e(v.name)+'<br><small class="muted">Not in HubSpot</small>')+'</td><td class="n">'+v.visits+'</td><td class="n">'+(v.score==null?'–':v.score+'/10')+'</td><td>'+stagePill(v.verdict)+'</td><td>'+(v.netNew?(v.netNewIcp?'<b>Yes · ICP</b>':'Yes'):'No')+'</td><td>'+e(v.customer?'Customer':v.accountStatus)+'</td><td>'+e(v.sdr)+'</td><td>'+e(v.owner)+'</td>'+touch(v)+'</tr>';}).join(''):'<tr><td colspan="12" class="muted">None.</td></tr>')+
    '</tbody></table></div></div></div>';

  /* events */
  var evs=['all'].concat(Array.from(new Set(D.events.map(function(x){return x.event||'Event not set';}))));
  var E0=D.events.filter(function(x){return EF.ev==='all'||(x.event||'Event not set')===EF.ev;});
  var ec=function(f){return E0.filter(f).length;},icp=function(x){return x.icp==='ICP fit';};
  var EK={icp:icp,icpOld:function(x){return icp(x)&&x.coBucket==='Company already in CRM';},icpNew:function(x){return icp(x)&&x.coBucket==='Net new company';},notIcp:function(x){return x.icp==='Not ICP';},unchk:function(x){return x.icp==='Not checked';},
    existing:function(x){return x.existing;},newOld:function(x){return x.bucket==='New contact, company already in CRM';},net:function(x){return x.bucket==='Net new contact and company';},noco:function(x){return x.coBucket==='No company linked';}};
  var E=E0.filter(function(x){return EF.k==='all'||EK[EF.k](x);});
  var eb=function(k,l,cls){return cnt(l,k==='all'?E0.length:ec(EK[k]),'data-ek="'+k+'"',EF.k===k,cls);};
  var netIcpCos=new Set(E0.filter(EK.icpNew).map(function(x){return x.coId;})).size;
  o+='<div class="fm-card iw"><h3>Events</h3><p class="sub">Contacts with Lead Source = Event added this week, plus existing contacts tagged with an event this week. ICP fit = the company’s ICP Fit from Clay. A new contact at a company already in HubSpot counts as “company already in CRM”, not net new.</p>'+
    (evs.length>2?'<div class="iw-bar"><label>Event<select data-esel>'+opts(evs.map(function(x){return [x,x==='all'?'All events':x];}),EF.ev)+'</select></label></div>':'')+
    '<div class="iw-grid" style="grid-template-columns:minmax(240px,340px) minmax(0,1fr)"><div><table><thead><tr><th>Breakdown</th><th class="n">Leads</th></tr></thead><tbody>'+
      eb('all','Event leads')+eb('icp','ICP fit','ind')+eb('icpOld','→ Company already in CRM','ind')+eb('icpNew','→ Net new company','ind')+cnt('Net new ICP companies created',netIcpCos,'',false,'ind')+eb('notIcp','Not ICP','ind')+eb('unchk','ICP not checked yet','ind')+
      eb('existing','Existing contact (already in CRM)','ind')+eb('newOld','New contact, company already in CRM','ind')+eb('net','Net new contact and company','ind')+eb('noco','No company linked','ind')+'</tbody></table></div>'+
    '<div class="wrap"><table><thead><tr><th>Added</th><th>Contact</th><th>Company</th><th>Event</th><th>ICP</th><th>In CRM?</th><th>Owner</th><th>Lead status</th>'+TH_T+'</tr></thead><tbody>'+
      (E.length?E.map(function(x){return '<tr><td>'+d(x.at)+'</td><td>'+link(x.name,x.id,'0-1')+(x.title?'<br><small class="muted">'+e(x.title)+'</small>':'')+'</td><td>'+link(x.company,x.coId,'0-2')+'</td><td>'+e(x.event||'–')+'</td><td>'+e(x.icp)+(x.icpTier?'<br><small class="muted">'+e(x.icpTier)+(x.icpReview?' · needs review':'')+'</small>':'')+'</td><td>'+e(x.bucket)+'</td><td>'+e(x.owner)+'</td><td>'+e(x.status)+'</td>'+touch(x)+'</tr>';}).join(''):'<tr><td colspan="11" class="muted">None.</td></tr>')+
    '</tbody></table></div></div></div>';
  o+='<p class="fm-note">Stages for assigned form leads: Qualified = open deal, meeting booked or Visible Opportunity. Disqualified = Not Qualified, Lost, Do Not Contact, Bounced, or flagged as spam. In progress = No Two-Way / Two-Way / Engaged, or touched since the form. Not started = no touch since the form. Last touched by = the latest call, email, meeting or LinkedIn message on the record. Updated '+e(new Date(D.generatedAt).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}))+'.</p>';
  return o;
}
function draw(){var el=slot();if(!el||el.hidden)return;el.innerHTML=html();
  var on=function(sel,fn){Array.prototype.forEach.call(el.querySelectorAll(sel),function(b){b.addEventListener(b.tagName==='SELECT'?'change':'click',function(){fn(b);});});};
  on('[data-wk]',function(b){var k=b.getAttribute('data-wk'),t=monday(ukToday());WEEK=k==='this'?t:k==='last'?shift(t,-7):shift(WEEK,k==='prev'?-7:7);if(WEEK>t)WEEK=t;FF={form:'all',stage:'all'};VF='all';EF={ev:'all',k:'all'};load(WEEK);draw();});
  on('[data-retry]',function(){load(WEEK);draw();});
  on('[data-fsel]',function(b){FF.form=b.value;draw();});
  on('[data-ff]',function(b){FF.form=b.getAttribute('data-ff');FF.stage='all';draw();var x=el.querySelector('[data-fsel]');if(x)x.scrollIntoView({behavior:'smooth',block:'center'});});
  on('[data-fs]',function(b){FF.stage=b.getAttribute('data-fs');draw();});
  on('[data-vf]',function(b){VF=b.getAttribute('data-vf');draw();});
  on('[data-esel]',function(b){EF.ev=b.value;draw();});
  on('[data-ek]',function(b){EF.k=b.getAttribute('data-ek');draw();});
}
window.SDRInWeek=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='inweekly';if(a.view!=='inweekly')return;load(WEEK);draw();};
})();
