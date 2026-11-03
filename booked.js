/* Meetings booked per month, by SDR and total (last 12 months).
   Shown on the Meetings page and in the Monthly report. Data: api/data?part=booked
   (companies moving to Account Status "Meeting Booked", once per company per month, credited to the SDR Owner). */
(function(){
var DATA=null,ERR=null,LOADING=false,SEL='all';
var COL={james:'#ff4d00',matthew:'#1c1b1a',nikita:'#8e6bbf',evan:'#2f8f6b'};
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function mlabel(m){var p=m.split('-');return MON[+p[1]-1]+(p[1]==='01'?' '+p[0].slice(2):'');}
function load(){if(LOADING||DATA)return;LOADING=true;
  fetch('api/data?part=booked').then(function(r){return r.json();}).then(function(d){if(d&&d.months)DATA=d;else ERR=(d&&d.error)||'no data';})
  .catch(function(x){ERR=String(x&&x.message||x);}).then(function(){LOADING=false;draw();});}

function chart(){
  var D=DATA,S=D.SDRS.filter(function(s){return SEL==='all'||SEL===s.k;}),n=D.months.length;
  var vals=D.months.map(function(m,i){return S.map(function(s){return D.by[s.k][i];});});
  var tot=vals.map(function(v){return v.reduce(function(a,b){return a+b;},0);});
  var max=Math.max(1,Math.max.apply(null,tot)),W=760,H=240,pl=34,pb=26,pt=18,bw=(W-pl)/n,bar=Math.min(38,bw*0.62);
  var y=function(v){return pt+(H-pt-pb)*(1-v/max);};
  var step=max<=5?1:max<=10?2:max<=25?5:10,g='';
  for(var t=0;t<=max;t+=step)g+='<line x1="'+pl+'" x2="'+W+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="currentColor" stroke-opacity=".12"/><text x="'+(pl-6)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="11" fill="currentColor" opacity=".6">'+t+'</text>';
  var b='';
  vals.forEach(function(v,i){var x=pl+i*bw+(bw-bar)/2,acc=0;
    v.forEach(function(c,j){if(!c)return;var y0=y(acc),y1=y(acc+c);acc+=c;b+='<rect x="'+x+'" y="'+y1+'" width="'+bar+'" height="'+(y0-y1)+'" fill="'+COL[S[j].k]+'"><title>'+e(S[j].short)+', '+mlabel(D.months[i])+': '+c+'</title></rect>';});
    if(tot[i])b+='<text x="'+(x+bar/2)+'" y="'+(y(tot[i])-5)+'" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">'+tot[i]+'</text>';
    b+='<text x="'+(x+bar/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">'+mlabel(D.months[i])+'</text>';});
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Meetings booked per month">'+g+b+'</svg>';}

function table(){var D=DATA;
  var head='<tr><th class="l">SDR</th>'+D.months.map(function(m){return '<th>'+mlabel(m)+'</th>';}).join('')+'<th>Total</th></tr>';
  var row=function(name,arr,k,bold){var s=arr.reduce(function(a,b){return a+b;},0);return '<tr'+(bold?' class="team"':'')+'><td class="l">'+(k?'<span style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;background:'+COL[k]+'"></span>':'')+e(name)+'</td>'+arr.map(function(v){return '<td class="n">'+(v||'<span class="muted">0</span>')+'</td>';}).join('')+'<td class="n"><b>'+s+'</b></td></tr>';};
  return '<div class="tbl mt-tbl" style="margin-top:12px;overflow-x:auto"><table><thead>'+head+'</thead><tbody>'+D.SDRS.map(function(s){return row(s.short,D.by[s.k],s.k);}).join('')+row('Total',D.total,null,true)+'</tbody></table></div>';}

function html(){
  var title='<div class="rx-bar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Meetings booked by month</h3>';
  if(!DATA)return '<div class="card bk-card">'+title+'</div><p class="muted">'+(ERR?'Couldn’t load meetings by month ('+e(ERR)+').':'Loading meetings by month…')+'</p></div>';
  var pick='<div class="rx-pick">'+[['all','All SDRs']].concat(DATA.SDRS.map(function(s){return [s.k,s.short];})).map(function(o){return '<button data-bk="'+o[0]+'" class="'+(SEL===o[0]?'now':'')+'">'+e(o[1])+'</button>';}).join('')+'</div>';
  var legend='<div class="muted small" style="display:flex;gap:14px;flex-wrap:wrap;margin:6px 0">'+DATA.SDRS.map(function(s){return '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;background:'+COL[s.k]+'"></span>'+e(s.short)+'</span>';}).join('')+'</div>';
  return '<div class="card bk-card">'+title+pick+'</div><p class="muted small" style="margin:6px 0 0">Companies moved to Account Status <b>Meeting Booked</b>, counted once per company per month and credited to the company’s SDR Owner. Last 12 months, UK time.</p>'+legend+chart()+table()+'</div>';}

function draw(){Array.prototype.forEach.call(document.querySelectorAll('[data-bk-slot]'),function(el){el.innerHTML=html();
  Array.prototype.forEach.call(el.querySelectorAll('[data-bk]'),function(b){b.onclick=function(){SEL=b.getAttribute('data-bk');draw();};});});}

// Meetings page: put the chart under the KPIs
var mk=document.getElementById('meetKpis');
if(mk&&!document.getElementById('bkMeet')){mk.insertAdjacentHTML('afterend','<div id="bkMeet" data-bk-slot></div>');}
// Monthly report and anything else: call SDRBooked() after rendering a [data-bk-slot]
window.SDRBooked=function(){if(!DATA&&!ERR)load();draw();};
load();draw();
})();
