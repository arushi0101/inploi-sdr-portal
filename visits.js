/* Inbound visits: company visits, net new companies and net new ICPs per day, from the Dealfront alerts in #inbound-visits.
   Data: api/data?part=visits. A company is net new on the day of its first-ever alert; ICP = scored 6/10 or higher in the alert's thread. */
(function(){
var DATA=null,ERR=null,LOADING=false,SEL=null;
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function nice(d){var p=d.split('-');var dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2],12));return dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});}
function slot(){var el=document.getElementById('visitsView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='visits';el.id='visitsView';el.hidden=true;any.parentNode.appendChild(el);return el;}
function load(){if(LOADING||DATA)return;LOADING=true;
  fetch('api/data?part=visits&days=30').then(function(r){return r.json();}).then(function(d){if(d&&d.days)DATA=d;else ERR=(d&&(d.message||d.error))||'no data';})
  .catch(function(x){ERR=String(x&&x.message||x);}).then(function(){LOADING=false;draw();});}
function kpi(label,val,sub){return '<div class="kpi"><span>'+e(label)+'</span><b>'+e(val)+'</b>'+(sub?'<em>'+e(sub)+'</em>':'')+'</div>';}
function html(){
  if(!DATA)return '<div class="card"><p class="muted">'+(ERR?'Couldn’t load inbound visits ('+e(ERR)+').':'Loading inbound visits…')+'</p></div>';
  var D=DATA,t=D.days[0],w=D.days.slice(0,7).reduce(function(a,d){a.v+=d.visits;a.n+=d.netNew;a.i+=d.netNewIcp;return a;},{v:0,n:0,i:0});
  var sel=SEL?D.days.filter(function(d){return d.date===SEL;})[0]:null;
  var out='<p class="muted small" style="margin:0 0 12px">From the Dealfront alerts in <a href="https://inploi.slack.com/archives/'+e(D.channel)+'" target="_blank" rel="noopener">#inbound-visits</a>. A company is <b>net new</b> on the day of its first-ever visit alert. <b>ICP</b> means scored '+D.icpMin+'/10 or higher in the alert’s thread (by Claude in Slack or the SDR routing reply). UK time.</p>';
  out+='<div class="kpis" style="display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:16px">'+
    [kpi('Company visits today',t.visits),kpi('Net new companies today',t.netNew),kpi('Net new ICPs today',t.netNewIcp),kpi('Last 7 days',w.v+' visits',w.n+' net new · '+w.i+' net new ICPs'),kpi('Last 30 days',D.total.visits+' visits',D.total.netNew+' net new · '+D.total.netNewIcp+' net new ICPs')]
    .map(function(x){return x.replace('class="kpi"','class="kpi" style="flex:1 1 150px;background:var(--surface);padding:12px 14px;display:grid;gap:2px"').replace('<span>','<span style="font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">').replace('<b>','<b style="font-size:1.5rem;font-family:var(--f-display)">').replace('<em>','<em style="font-style:normal;font-size:.76rem;color:var(--muted)">');}).join('')+'</div>';
  out+='<div class="tbl" style="overflow-x:auto"><table><thead><tr><th class="l">Day</th><th>Company visits</th><th>Net new companies</th><th>Net new ICPs</th><th>All ICP visits</th><th>Not scored yet</th><th></th></tr></thead><tbody>'+
    D.days.map(function(d){return '<tr'+(d.date===SEL?' style="background:var(--accent-soft)"':'')+'><td class="l">'+e(nice(d.date))+'</td><td class="n">'+d.visits+'</td><td class="n">'+d.netNew+'</td><td class="n"><b>'+d.netNewIcp+'</b></td><td class="n">'+d.icp+'</td><td class="n">'+(d.unscored||'<span class="muted">0</span>')+'</td><td>'+(d.visits?'<button type="button" class="num" data-vday="'+d.date+'">'+(d.date===SEL?'Hide':'Show')+'</button>':'')+'</td></tr>';}).join('')+
    '</tbody></table></div>';
  if(sel){out+='<h3 style="margin:18px 0 8px">'+e(nice(sel.date))+'</h3><div class="tbl"><table><thead><tr><th class="l">Company</th><th class="l">Location</th><th>ICP score</th><th class="l">Net new</th><th class="l">In HubSpot</th><th class="l">Alert</th></tr></thead><tbody>'+
    sel.companies.map(function(c){return '<tr><td class="l"><b>'+e(c.name)+'</b></td><td class="l">'+e(c.loc)+'</td><td class="n">'+(c.score==null?'<span class="muted">not scored</span>':(c.icp?'<b>'+c.score+'/10</b>':c.score+'/10'))+'</td><td class="l">'+(c.netNew?'Yes':'No')+'</td><td class="l">'+(c.inHubspot?'Yes':'Not linked')+'</td><td class="l"><a href="'+e(c.link)+'" target="_blank" rel="noopener">Open thread</a></td></tr>';}).join('')+'</tbody></table></div>';}
  return '<div class="card">'+out+'</div>';
}
function draw(){var el=slot();if(!el)return;el.innerHTML=html();
  Array.prototype.forEach.call(el.querySelectorAll('[data-vday]'),function(b){b.onclick=function(){var d=b.getAttribute('data-vday');SEL=SEL===d?null:d;draw();};});}
window.SDRVisits=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='visits';if(a.view!=='visits')return;if(!DATA&&!ERR)load();draw();};
})();
