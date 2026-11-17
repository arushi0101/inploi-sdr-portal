/* Inbound › Visits. Companies on the website, from Leadfeeder (api/data?part=visits, synced into api/_visits.json).
   Prospect visits only: candidates arriving from customers' careers sites, ISPs/networks and privacy-only hits are excluded (counted separately).
   Net new = the company's first visit in the synced history. ICP = scored 6/10+ in the #inbound-visits thread for that company.
   Traffic sources & UTMs: Leadfeeder's source / medium / campaign (utm_source / utm_medium / utm_campaign). */
(function(){
var DATA={},ERR={},LOADING={},DAYS=30,SEL=null,SRCSEL=null;
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function nice(d){var p=d.split('-');var dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2],12));return dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});}
function slot(){var el=document.getElementById('visitsView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='visits';el.id='visitsView';el.hidden=true;any.parentNode.appendChild(el);return el;}
function load(d){if(LOADING[d]||DATA[d])return;LOADING[d]=true;
  fetch('api/data?part=visits&days='+d).then(function(r){return r.json();}).then(function(j){if(j&&j.days)DATA[d]=j;else ERR[d]=(j&&(j.message||j.error))||'no data';})
  .catch(function(x){ERR[d]=String(x&&x.message||x);}).then(function(){LOADING[d]=false;draw();});}
function srcKey(c){return (c.src||'Unknown')+' / '+(c.med||'(none)')+(c.cmp?' / '+c.cmp:'');}
function html(){
  var D=DATA[DAYS];
  var head='<div class="iw-card iw-pad iw-top"><div><h2>Website visits</h2><p>Companies identified on inploi.com by Leadfeeder. Prospect visits only; candidates from customers’ careers sites, ISPs and privacy-page hits are left out. UK time.</p></div>'+
    '<div class="iw-seg">'+[[7,'7 days'],[14,'14 days'],[30,'30 days'],[90,'90 days']].map(function(o){return '<button type="button" data-vd="'+o[0]+'" aria-pressed="'+(DAYS===o[0])+'">'+o[1]+'</button>';}).join('')+'</div></div>';
  if(!D)return head+'<div class="iw-card iw-pad"><p class="muted">'+(ERR[DAYS]?'Couldn’t load visits ('+e(ERR[DAYS])+').':'Loading visits from Leadfeeder… (up to a minute)')+'</p></div>';
  var all=[];D.days.forEach(function(d){d.companies.forEach(function(c){all.push(c);});});
  var cos={};all.forEach(function(c){var k=c.name;var x=cos[k]||(cos[k]=Object.assign({},c,{days:0,visitsN:0}));x.days++;x.visitsN+=c.visits||1;if(c.netNew)x.netNew=true;});
  var uniq=Object.keys(cos).length,icp=Object.keys(cos).filter(function(k){return cos[k].icp;}).length,nn=Object.keys(cos).filter(function(k){return cos[k].netNew;}).length;
  var o=head+'<div class="iw-kpis">'+[['Companies on the website',uniq,D.total.visits+' company-days'],['Net new companies',nn,'first visit in this period'],['ICP companies',icp,'scored '+D.icpMin+'/10+ in Slack'],['Candidate visits left out',D.excluded?D.excluded.candidate:0,'from customers’ careers sites'],['Networks / ISPs left out',D.excluded?D.excluded.network:0,'not identifiable companies']]
    .map(function(k){return '<div class="iw-card iw-kpi" style="cursor:default"><span class="h">'+e(k[0])+'</span><span class="v"><b>'+e(k[1])+'</b></span><span class="s">'+e(k[2])+'</span></div>';}).join('')+'</div>';
  // traffic sources & UTMs
  var src={};all.forEach(function(c){var k=srcKey(c);var x=src[k]||(src[k]={k:k,src:c.src||'Unknown',med:c.med||'',cmp:c.cmp||'',cos:{},n:0});x.cos[c.name]=1;x.n+=c.visits||1;});
  var S=Object.keys(src).map(function(k){var x=src[k];x.c=Object.keys(x.cos).length;return x;}).sort(function(a,b){return b.c-a.c;});
  var withCmp=S.filter(function(x){return x.cmp;}).length;
  o+='<div class="iw-card iw-pad iw"><div class="iw-h"><h3>Traffic sources &amp; UTMs</h3><p>utm_source / utm_medium / utm_campaign as Leadfeeder records them'+(withCmp?'':' · no utm_campaign on any visit in this period')+'</p></div>'+
    '<div class="iw-tw"><table class="iw-t" style="min-width:0"><thead><tr><th>Source (utm_source)</th><th>Medium (utm_medium)</th><th>Campaign (utm_campaign)</th><th class="n">Companies</th><th class="n">Visits</th></tr></thead><tbody>'+
    (S.length?S.map(function(x){return '<tr'+(SRCSEL===x.k?' style="background:var(--accent-soft)"':'')+'><td><button type="button" class="num" data-vs="'+e(x.k)+'">'+e(x.src)+'</button></td><td>'+e(x.med||'—')+'</td><td>'+(x.cmp?e(x.cmp):'<span class="iw-none">—</span>')+'</td><td class="n">'+x.c+'</td><td class="n">'+x.n+'</td></tr>';}).join(''):'<tr><td colspan="5"><div class="iw-empty">No visits.</div></td></tr>')+'</tbody></table></div></div>';
  // companies
  var L=Object.keys(cos).map(function(k){return cos[k];}).filter(function(c){return !SRCSEL||srcKey(c)===SRCSEL||all.some(function(a){return a.name===c.name&&srcKey(a)===SRCSEL;});}).sort(function(a,b){return b.at-a.at;});
  o+='<div class="iw-card iw-pad iw"><div class="iw-h"><h3>Companies'+(SRCSEL?' from '+e(SRCSEL)+' <button type="button" class="num" data-vs="">clear</button>':'')+'</h3><p>'+L.length+' companies · newest first</p></div>'+
    '<div class="iw-tw"><table class="iw-t"><thead><tr><th>Last visit</th><th>Company</th><th class="n">Visits</th><th>Source / medium / campaign</th><th>Pages</th><th>ICP</th><th>Intent</th><th>Net new</th></tr></thead><tbody>'+
    L.map(function(c){return '<tr><td class="nw">'+new Date(c.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})+'</td><td>'+(c.link?'<a class="iw-a" href="'+e(c.link)+'" target="_blank" rel="noopener">'+e(c.name)+'</a>':'<span class="pri">'+e(c.name)+'</span>')+'<small>'+e([c.emp?c.emp+' staff':'',c.ind,c.loc].filter(Boolean).join(' · '))+'</small></td><td class="n">'+c.visitsN+'</td><td>'+e(c.src||'—')+'<small>'+e([c.med,c.cmp].filter(Boolean).join(' / ')||'no UTM medium/campaign')+'</small></td><td><small style="margin:0">'+e((c.pages||[]).slice(0,4).join(', ')||'—')+'</small></td><td>'+(c.score==null?'<span class="iw-none">not scored</span>':'<b>'+c.score+'/10</b>')+'</td><td>'+e(c.intent||'—')+'</td><td>'+(c.netNew?'<span class="iw-p q">Net new</span>':'<span class="iw-none">Seen before</span>')+'</td></tr>';}).join('')+'</tbody></table></div>'+
    '<p class="iw-foot" style="margin-top:10px">Leadfeeder synced '+(D.syncedAt?e(new Date(D.syncedAt).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})):'—')+'. Company names open the company in Leadfeeder.</p></div>';
  return o;
}
function draw(){var el=slot();if(!el||el.hidden)return;el.style.cssText='display:grid;gap:16px';el.innerHTML=html();
  Array.prototype.forEach.call(el.querySelectorAll('[data-vd]'),function(b){b.onclick=function(){DAYS=Number(b.getAttribute('data-vd'));SRCSEL=null;load(DAYS);draw();};});
  Array.prototype.forEach.call(el.querySelectorAll('[data-vs]'),function(b){b.onclick=function(){var k=b.getAttribute('data-vs');SRCSEL=k&&SRCSEL!==k?k:null;draw();};});}
window.SDRVisits=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='visits';if(a.view!=='visits')return;load(DAYS);draw();};
})();
