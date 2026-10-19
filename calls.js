/* Call reports: the HubSpot calling reports (SDR Activity by Calls, Team Call Outcome Breakdown, Calls made daily,
   Calls Connected -> Valuable Conversations, Team Calls vs Connects Trend, Connected Calls by Rep), live via api/data?part=calls.
   Every bar, slice, point and number opens the calls behind it. */
(function(){
var view=document.querySelector('.view[data-view="calls"]');if(!view)return;
view.insertAdjacentHTML('afterbegin','<div class="rp" id="callsRoot"><div class="card"><p class="muted">Loading call reports…</p></div></div>');
document.head.insertAdjacentHTML('beforeend','<style>'+
':root{--oc-conn:#182d63;--oc-val:#495985;--oc-wrong:#7a4a2a;--oc-left:#5c6670;--oc-none:#dcdfe4}'+
'@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--oc-conn:#5a78c9;--oc-val:#8b9bd0;--oc-wrong:#b07a55;--oc-left:#8a949e;--oc-none:#3a3f47}}'+
':root[data-theme="dark"]{--oc-conn:#5a78c9;--oc-val:#8b9bd0;--oc-wrong:#b07a55;--oc-left:#8a949e;--oc-none:#3a3f47}'+
'.view.cx-on #callKpis,.view.cx-on .card:has(#callBars){display:none}'+
'#callsRoot .cx-sub{font-size:.82rem;color:var(--muted);margin:4px 0 0}'+
'.cx-donut{display:grid;grid-template-columns:minmax(150px,210px) minmax(0,1fr);gap:20px;align-items:center}.cx-donut svg{width:100%;height:auto;display:block}'+
'.cx-donut circle[data-ck]{cursor:pointer}.cx-donut circle[data-ck]:hover{opacity:.75}.cx-donut text{pointer-events:none;fill:var(--fg);font-family:var(--f-display)}'+
'.cx-leg{width:100%;border-collapse:collapse;font-size:.83rem}.cx-leg td{padding:4px 6px;border-bottom:1px solid var(--line)}.cx-leg td.n{text-align:right;font-family:var(--f-data)}.cx-leg i{display:inline-block;width:10px;height:10px;margin-right:8px;vertical-align:-1px}'+
'.cx-line svg{width:100%;height:auto;display:block;overflow:visible}.cx-line circle{cursor:pointer}.cx-line circle:hover{r:6}.cx-line text{fill:var(--muted);font-size:11px;font-family:var(--f-data)}'+
'.cx-mx th{font-size:.7rem;line-height:1.2}.cx-mx th i{display:block;width:100%;height:4px;margin-bottom:4px}'+
'@media (max-width:620px){.cx-donut{grid-template-columns:1fr}.cx-donut svg{max-width:220px;margin:0 auto}}'+
'</style>');

var D=null,api=null,loading=false,err=null,loadedKey=null,range='mtd',H={},hid=0;
var CONN=['connected','valuable conversation','bad timing','not interested'];
var OUT=[['meeting booked','#65bc67'],['valuable conversation','var(--oc-val)'],['connected','var(--oc-conn)'],['bad timing','#ffd233'],['not interested','#b8324f'],
  ['gatekeeper','#8e6bbf'],['left voicemail','#f29e4c'],['busy','#5081ff'],['ai screening bot','#9aa3b0'],['wrong number','var(--oc-wrong)'],['left company/retired','var(--oc-left)'],
  ['no answer','#FF4D00'],['no outcome logged','var(--oc-none)']];
var SDRC=['#FF4D00','var(--oc-conn)','#65bc67','#5081ff','#8e6bbf','#f29e4c'];
var LDAY=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'}),LISO=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
var LMON=new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'});

function e(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(n){return Math.round(n).toLocaleString('en-GB');}
function pct(a,b){return b?Math.round(a/b*100)+'%':'–';}
function isoD(ms){return LISO.format(new Date(ms));}
function dnice(ms){return LDAY.format(new Date(ms));}
function reg(fn){var id='c'+(++hid);H[id]=fn;return id;}
function cusKey(){return api&&api.cus?api.cus.from+'|'+api.cus.to:'';}
function rng(){return D.R[range]||D.R.mtd;}
function rangeLabel(){var r=rng(),a=r[0],b=Math.min(r[1],D.today+86400000)-1;
  var lbl=range==='cus'&&window.SDRCustom?window.SDRCustom.name():range==='wk'?'This week':'Month to date';
  return lbl+' · '+(isoD(a).slice(0,7)===isoD(b).slice(0,7)?(+isoD(a).slice(8))+'–'+dnice(b):dnice(a)+' – '+dnice(b));}

/* which SDRs are in view */
function SI(){var out=[];D.SDRS.forEach(function(s,i){if(!api||api.pod==='all'||api.pod===s.k)out.push(i);});return out;}
function who(){return api&&api.pod!=='all'?api.byK(api.pod).short:'All SDRs';}

/* outcomes */
function lab(d){return d?(D.labels[d]||'Other outcome'):'No outcome logged';}
function key(d){return lab(d).toLowerCase();}
function isConn(d){return CONN.indexOf(key(d))>=0;}
function colour(k){for(var i=0;i<OUT.length;i++)if(OUT[i][0]===k)return OUT[i][1];return '#c7a2d6';}
function order(keys){var known=OUT.map(function(o){return o[0];});return keys.slice().sort(function(a,b){var x=known.indexOf(a),y=known.indexOf(b);return (x<0?50:x)-(y<0?50:y)||(a<b?-1:1);});}
function nice(k){var m={};Object.keys(D.labels).forEach(function(id){m[D.labels[id].toLowerCase()]=D.labels[id];});return m[k]||k.charAt(0).toUpperCase()+k.slice(1);}
function tally(list){var o={};list.forEach(function(c){var k=key(c[2]);o[k]=(o[k]||0)+1;});return o;}

/* the calls in view */
function cur(){var r=rng(),s=SI();return D.CALLS.filter(function(c){return c[0]>=r[0]&&c[0]<r[1]&&s.indexOf(c[1])>=0;});}

/* drill: open the calls behind a number */
var COLS=[{h:'Date',t:'date',time:true},{h:'SDR',t:'text'},{h:'Outcome',t:'text'},{h:'Company',t:'co'},{h:'Contact',t:'text'},{h:'Talk time (min)',t:'num'},{h:'Call in HubSpot',t:'link'}];
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
function drill(title,list,note){if(!window.SDRDrill)return;
  var names={};list.forEach(function(c){if(c[3]&&D.CO[c[3]])names[c[3]]=[D.CO[c[3]],'','',''];});window.SDRDrill.names(names);
  var rows=list.slice().sort(function(a,b){return b[0]-a[0];}).map(function(c){return [c[0],D.SDRS[c[1]].short,lab(c[2]),c[3]?[c[3],D.CO[c[3]]||'Company '+c[3]]:null,c[4]?(D.CON[c[4]]||''):'',Math.round((c[5]||0)/6)/10,c[6]?[HS+'0-48/'+c[6],'Open call']:null];});
  window.SDRDrill.table(title,who()+' · '+rangeLabel(),COLS,rows,note);}
function btn(v,fn,title){return '<button class="num" data-ck="'+reg(fn)+'" title="'+e(title||'See the calls')+'">'+v+'</button>';}
function dnum(n,title,list,note){return n?btn(fmt(n),function(){drill(title,list,note);}):'<span class="muted">0</span>';}
function kpi(label,v,sub){return '<div class="mt-kpi"><span>'+e(label)+'</span><b>'+v+'</b><em>'+sub+'</em></div>';}
function legend(keys){return '<div class="mt-legend">'+keys.map(function(k){return '<span><i style="background:'+colour(k)+'"></i>'+e(nice(k))+'</span>';}).join('')+'</div>';}
function sec(t,sub,body,tag){return '<div class="card"><div class="sec-head"><h2>'+e(t)+'</h2>'+(tag?'<span class="tag">'+e(tag)+'</span>':'')+'</div>'+(sub?'<p class="cx-sub">'+sub+'</p>':'')+'<div style="margin-top:12px">'+body+'</div></div>';}

/* KPI tiles */
function kpis(L){var conn=L.filter(function(c){return isConn(c[2]);}),val=L.filter(function(c){return key(c[2])==='valuable conversation';}),mb=L.filter(function(c){return key(c[2])==='meeting booked';}),
  na=L.filter(function(c){return key(c[2])==='no answer';}),none=L.filter(function(c){return !c[2];}),talk=conn.reduce(function(t,c){return t+(c[5]||0);},0);
  return '<div class="mt-kpis">'+
    kpi('Calls made',dnum(L.length,'Calls made',L),fmt(L.length/Math.max(1,SI().length))+' per SDR')+
    kpi('Connected',dnum(conn.length,'Connected calls',conn,'Connected = Connected, Valuable Conversation, Bad Timing or Not Interested, as in HubSpot’s Connected Calls reports.'),pct(conn.length,L.length)+' of calls'+(conn.length?' \u00b7 avg '+(Math.round(talk/conn.length/6)/10)+' min talk':''))+
    kpi('Valuable conversations',dnum(val.length,'Valuable conversations',val),pct(val.length,conn.length)+' of connected calls')+
    kpi('Meeting Booked outcome',dnum(mb.length,'Calls with outcome Meeting Booked',mb),'Calls logged as Meeting Booked')+
    kpi('No answer',dnum(na.length,'Calls: No answer',na),pct(na.length,L.length)+' of calls')+
    kpi('No outcome logged',dnum(none.length,'Calls with no outcome logged',none),none.length?pct(none.length,L.length)+' of calls · needs updating':'Every call has an outcome')+
  '</div>';}

/* SDR Activity - By Calls: stacked bar per SDR */
function byRep(L){var ks=order(Object.keys(tally(L))),rows=SI().map(function(i){return {i:i,l:L.filter(function(c){return c[1]===i;})};}),mx=Math.max.apply(null,rows.map(function(r){return r.l.length;}).concat([1]));
  return legend(ks)+'<div class="mt-rows">'+rows.map(function(r){var t=tally(r.l),n=r.l.length,s=D.SDRS[r.i].short,conn=r.l.filter(function(c){return isConn(c[2]);}).length;
    var segs=ks.map(function(k){if(!t[k])return '';var sub=r.l.filter(function(c){return key(c[2])===k;});
      return '<button style="width:'+(t[k]/n*100)+'%;background:'+colour(k)+'" title="'+e(nice(k)+': '+t[k]+' ('+pct(t[k],n)+')')+'" data-ck="'+reg(function(){drill(s+' · '+nice(k),sub);})+'"></button>';}).join('');
    return '<div class="mt-row"><span class="lbl">'+e(s)+'<small>'+pct(conn,n)+' connected</small></span><div class="mt-track">'+(n?'<div class="mt-stack" style="width:'+(n/mx*100)+'%">'+segs+'</div>':'<span class="muted" style="font-size:.78rem">No calls</span>')+'</div>'+
      (n?'<button class="mt-tot" data-ck="'+reg(function(){drill('Calls · '+s,r.l);})+'">'+fmt(n)+'</button>':'<span class="mt-tot">0</span>')+'</div>';}).join('')+'</div>';}

/* Team Call Outcome Breakdown: donut and legend */
function donut(L){var t=tally(L),ks=order(Object.keys(t)),n=L.length;if(!n)return '<p class="muted">No calls in this period.</p>';
  var off=25,arcs=ks.map(function(k){var p=t[k]/n*100,sub=L.filter(function(c){return key(c[2])===k;}),id=reg(function(){drill('Calls · '+nice(k),sub);});
    var a='<circle cx="21" cy="21" r="15.915" fill="none" stroke="'+colour(k)+'" stroke-width="6.5" stroke-dasharray="'+p+' '+(100-p)+'" stroke-dashoffset="'+off+'" data-ck="'+id+'"><title>'+e(nice(k)+': '+t[k]+' ('+pct(t[k],n)+')')+'</title></circle>';off-=p;return a;}).join('');
  return '<div class="cx-donut"><svg viewBox="0 0 42 42" role="img" aria-label="Call outcomes">'+arcs+'<text x="21" y="21" text-anchor="middle" font-size="6" font-weight="600">'+fmt(n)+'</text><text x="21" y="26.5" text-anchor="middle" font-size="2.6" style="fill:var(--muted)">calls</text></svg>'+
    '<table class="cx-leg"><tbody>'+ks.map(function(k){var sub=L.filter(function(c){return key(c[2])===k;});return '<tr><td><i style="background:'+colour(k)+'"></i>'+e(nice(k))+'</td><td class="n">'+dnum(t[k],'Calls · '+nice(k),sub)+'</td><td class="n">'+pct(t[k],n)+'</td></tr>';}).join('')+'</tbody></table></div>';}

/* Outcome by SDR: the HubSpot table view */
function matrix(L){var ks=order(Object.keys(tally(L)));if(!L.length)return '<p class="muted">No calls in this period.</p>';
  var row=function(lbl,l,team){var t=tally(l),conn=l.filter(function(c){return isConn(c[2]);});return '<tr'+(team?' class="team"':'')+'><td>'+e(lbl)+'</td>'+ks.map(function(k){return '<td class="n">'+dnum(t[k]||0,lbl+' · '+nice(k),l.filter(function(c){return key(c[2])===k;}))+'</td>';}).join('')+
    '<td class="n">'+dnum(l.length,'Calls · '+lbl,l)+'</td><td class="n">'+pct(conn.length,l.length)+'</td></tr>';};
  var s=SI();
  return '<div class="tbl mt-tbl cx-mx"><table><thead><tr><th class="l">SDR</th>'+ks.map(function(k){return '<th><i style="background:'+colour(k)+'"></i>'+e(nice(k))+'</th>';}).join('')+'<th>Total</th><th>Connect<br>rate</th></tr></thead><tbody>'+
    s.map(function(i){return row(D.SDRS[i].short,L.filter(function(c){return c[1]===i;}));}).join('')+(s.length>1?row('Team',L,true):'')+'</tbody></table></div>';}

/* Calls made per day (per week for long ranges), stacked by outcome */
function addD(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function monday(iso){var d=new Date(iso+'T12:00:00Z');return addD(iso,-((d.getUTCDay()+6)%7));}
function daily(L){var r=rng(),a=isoD(r[0]),z=isoD(Math.min(r[1],D.today+86400000)-1),wk=(Date.parse(z)-Date.parse(a))/86400000>62,bk=wk?monday:function(x){return x;},buckets=[];
  for(var d=bk(a);d<=z&&buckets.length<400;d=addD(d,wk?7:1))buckets.push(d);
  var per=buckets.map(function(){return [];}),ix={};buckets.forEach(function(b,i){ix[b]=i;});L.forEach(function(c){var i=ix[bk(isoD(c[0]))];if(i!=null)per[i].push(c);});
  var lbs=buckets.map(function(b){return (wk?'Week of ':'')+dnice(Date.parse(b+'T12:00:00Z'));});
  var ks=order(Object.keys(tally(L))),tot=per.map(function(l){return l.length;}),mx=Math.max.apply(null,tot.concat([1]));
  var every=Math.ceil(buckets.length/(window.innerWidth<620?6:14));
  return legend(ks)+'<div class="mt-cols">'+per.map(function(l,i){var t=tally(l),lbl=lbs[i];
    return '<button data-ck="'+reg(function(){drill('Calls · '+lbl,l);})+'" title="'+e(lbl+': '+tot[i]+' calls'+ks.filter(function(k){return t[k];}).map(function(k){return ', '+nice(k)+' '+t[k];}).join(''))+'"><span class="v">'+(tot[i]||'')+'</span><span class="mt-cs" style="height:'+(tot[i]/mx*100)+'%">'+
      ks.map(function(k){return t[k]?'<span style="height:'+(t[k]/tot[i]*100)+'%;background:'+colour(k)+'"></span>':'';}).join('')+'</span></button>';}).join('')+'</div>'+
    '<div class="mt-xl">'+buckets.map(function(b,i){return '<span>'+(i%every===0?e(dnice(Date.parse(b+'T12:00:00Z'))):'')+'</span>';}).join('')+'</div>';}

/* Calls Connected -> Valuable Conversations, by SDR */
function funnel(L){var s=SI();
  var row=function(lbl,l,team){var conn=l.filter(function(c){return isConn(c[2]);}),val=l.filter(function(c){return key(c[2])==='valuable conversation';}),mb=l.filter(function(c){return key(c[2])==='meeting booked';});
    return '<tr'+(team?' class="team"':'')+'><td>'+e(lbl)+'</td><td class="n">'+dnum(l.length,'Calls · '+lbl,l)+'</td><td class="n">'+dnum(conn.length,'Connected calls · '+lbl,conn)+'</td><td class="n">'+pct(conn.length,l.length)+'</td>'+
      '<td class="n">'+dnum(val.length,'Valuable conversations · '+lbl,val)+'</td><td class="n">'+pct(val.length,conn.length)+'</td><td class="n">'+dnum(mb.length,'Meeting Booked calls · '+lbl,mb)+'</td><td class="n">'+(mb.length?fmt(l.length/mb.length):'–')+'</td></tr>';};
  return '<div class="tbl mt-tbl"><table><thead><tr><th class="l">SDR</th><th>Calls</th><th>Connected</th><th>Connect<br>rate</th><th>Valuable<br>conversations</th><th>Connected →<br>valuable</th><th>Meeting Booked<br>outcome</th><th>Calls per<br>meeting</th></tr></thead><tbody>'+
    s.map(function(i){return row(D.SDRS[i].short,L.filter(function(c){return c[1]===i;}));}).join('')+(s.length>1?row('Team',L,true):'')+'</tbody></table></div>';}

/* this year by month */
function monthRange(m){var y=+m.slice(0,4),mo=+m.slice(5,7),last=new Date(Date.UTC(y,mo,0)).getUTCDate(),to=m+'-'+String(last).padStart(2,'0'),today=isoD(D.today);return [m+'-01',to>today?today:to];}
function goMonth(m){var r=monthRange(m);if(window.SDRCustom)window.SDRCustom.set(r[0],r[1],'custom');}
function mlabel(m){return LMON.format(new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1,1)));}
function monthCounts(M){var s=SI();if(s.length===D.SDRS.length)return M.o;var o={};s.forEach(function(i){var c=M.c[D.SDRS[i].k]||{};Object.keys(c).forEach(function(d){o[d]=(o[d]||0)+c[d];});});return o;}
function trend(){var team=SI().length===D.SDRS.length,per=D.MONTHS.map(function(M){var o=monthCounts(M),t={};Object.keys(o).forEach(function(d){var k=key(d);t[k]=(t[k]||0)+o[d];});return t;});
  var ks=order(Object.keys(per.reduce(function(a,t){Object.keys(t).forEach(function(k){if(t[k])a[k]=1;});return a;},{}))),tot=per.map(function(t){return ks.reduce(function(a,k){return a+(t[k]||0);},0);}),mx=Math.max.apply(null,tot.concat([1]));
  return legend(ks)+'<div class="mt-cols">'+D.MONTHS.map(function(M,i){var t=per[i],conn=CONN.reduce(function(a,k){return a+(t[k]||0);},0);
    return '<button data-ck="'+reg(function(){goMonth(M.m);})+'" title="'+e(mlabel(M.m)+': '+tot[i]+' calls, '+conn+' connected ('+pct(conn,tot[i])+'). Click to view this month.')+'"><span class="v">'+(tot[i]?fmt(tot[i]):'')+'</span><span class="mt-cs" style="height:'+(tot[i]/mx*100)+'%">'+
      ks.map(function(k){return t[k]?'<span style="height:'+(t[k]/tot[i]*100)+'%;background:'+colour(k)+'"></span>':'';}).join('')+'</span></button>';}).join('')+'</div>'+
    '<div class="mt-xl">'+D.MONTHS.map(function(M){return '<span>'+mlabel(M.m)+'</span>';}).join('')+'</div>'+
    (team?'':'<p class="mt-note">For one SDR this shows calls with an outcome other than No answer. HubSpot only splits No answer and no-outcome calls by month for the whole team.</p>');}
function lines(){var s=SI(),M=D.MONTHS,W=600,Ht=220,pl=34,pr=12,pt=12,pb=26;
  var ser=s.map(function(i){var k=D.SDRS[i].k;return {i:i,v:M.map(function(m){var c=m.c[k]||{};return Object.keys(c).reduce(function(a,d){return a+(isConn(d)?c[d]:0);},0);})};});
  var mx=Math.max.apply(null,[].concat.apply([4],ser.map(function(x){return x.v;}))),step=Math.pow(10,Math.floor(Math.log10(mx))),top=Math.ceil(mx/step)*step;if(top/step<3)step/=2;
  var X=function(j){return pl+(M.length<2?(W-pl-pr)/2:j*(W-pl-pr)/(M.length-1));},Y=function(v){return pt+(1-v/top)*(Ht-pt-pb);};
  var grid='';for(var g=0;g<=top+1e-9;g+=step)grid+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(g)+4)+'" text-anchor="end">'+fmt(g)+'</text>';
  var xl=M.map(function(m,j){return '<text x="'+X(j)+'" y="'+(Ht-6)+'" text-anchor="middle">'+mlabel(m.m)+'</text>';}).join('');
  var body=ser.map(function(x,n){var c=SDRC[x.i%SDRC.length],nm=D.SDRS[x.i].short;return '<polyline fill="none" stroke="'+c+'" stroke-width="2.2" points="'+x.v.map(function(v,j){return X(j)+','+Y(v);}).join(' ')+'"/>'+
    x.v.map(function(v,j){return '<circle cx="'+X(j)+'" cy="'+Y(v)+'" r="4" fill="'+c+'" stroke="var(--surface)" stroke-width="1.5" data-ck="'+reg(function(){goMonth(M[j].m);})+'"><title>'+e(nm+' · '+mlabel(M[j].m)+': '+v+' connected calls. Click to view this month.')+'</title></circle>';}).join('');}).join('');
  return '<div class="mt-legend">'+ser.map(function(x){return '<span><i style="background:'+SDRC[x.i%SDRC.length]+'"></i>'+e(D.SDRS[x.i].short)+'</span>';}).join('')+'</div>'+
    '<div class="cx-line"><svg viewBox="0 0 '+W+' '+Ht+'" role="img" aria-label="Connected calls by SDR each month">'+grid+xl+body+'</svg></div>';}

function render(){var root=document.getElementById('callsRoot');if(!root)return;H={};hid=0;
  if(err){view.classList.remove('cx-on');root.innerHTML='<div class="card"><p class="muted">Call reports couldn’t load ('+e(err)+'). The tables below still work.</p></div>';return;}
  if(!D){view.classList.remove('cx-on');root.innerHTML='<div class="card"><p class="muted">Loading call reports…</p></div>';return;}
  view.classList.add('cx-on');
  var L=cur(),yr=D.MONTHS.length?D.MONTHS[0].m.slice(0,4):'';
  root.innerHTML=
    '<div class="card"><div class="sec-head"><h2>Call reports</h2><span class="tag">'+e(who()+' · '+rangeLabel())+'</span></div><p class="cx-sub">The same outcomes and colours as HubSpot’s call reports, for the dates picked above. Click any bar, slice, point or number to see the calls.</p></div>'+
    kpis(L)+
    '<h3 class="mt-h">Outcomes</h3>'+
    '<div class="mt-two">'+sec('SDR activity by calls','Every call each SDR made, split by Call outcome.',byRep(L))+sec('Team call outcome breakdown','Share of all calls by outcome.',donut(L))+'</div>'+
    sec('Call outcomes by SDR','The table behind the charts above.',matrix(L))+
    '<h3 class="mt-h">Day by day</h3>'+
    sec('Calls made per day','Every call, stacked by outcome. Long ranges are grouped by week.',daily(L))+
    sec('Calls connected → valuable conversations','How many calls reach someone, and how many of those turn into a valuable conversation or a meeting.',funnel(L))+
    '<h3 class="mt-h">This year</h3>'+
    '<div class="mt-two">'+sec('Team calls vs connects trend','Every call by month since 1 Jan '+e(yr)+', stacked by outcome. Click a month to view it.',trend())+sec('Connected calls by SDR','Connected calls each month. Click a point to view that month.',lines())+'</div>'+
    '<div class="card"><ul class="notes muted small"><li><b>Connected</b> means the Call outcome is Connected, Valuable Conversation, Bad Timing or Not Interested, the same as HubSpot’s Connected Calls reports.</li>'+
    '<li>Calls are counted by <b>call owner</b> for the four SDRs. HubSpot’s “SDR Activity – By Calls” report counts by <b>created by</b> and also includes Annie, so its totals can be a little higher.</li>'+
    '<li>HubSpot’s daily reports leave out calls with no outcome. They are shown here in grey so they can be fixed.</li><li>Dates are UK time.</li></ul></div>';}

document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-ck]');if(!b||!document.getElementById('callsRoot').contains(b))return;
  ev.preventDefault();ev.stopPropagation();var fn=H[b.getAttribute('data-ck')];if(fn)fn();});

function load(fresh){if(loading)return;loading=true;var k=cusKey();
  fetch('api/data?part=calls'+(api&&api.cus?'&from='+api.cus.from+'&to='+api.cus.to:'')+(fresh?'&t='+Date.now():'')).then(function(r){return r.json().catch(function(){return {error:'bad_response'};}).then(function(d){if(!r.ok||d.error)throw d;return d;});})
  .then(function(d){D=d;err=null;loadedKey=k;}).catch(function(x){loadedKey=k;err=(x&&(x.error==='missing_token'?'the HubSpot key isn’t set':x.error))||'network error';})
  .then(function(){loading=false;if(api&&api.view==='calls'){setRange();render();}});}
var rb=document.getElementById('refreshBtn');if(rb)rb.addEventListener('click',function(){if(D||err){D=null;err=null;load(true);}});
function setRange(){range=api.cus?'cus':api.per;if(D&&!D.R[range])range='mtd';}

window.SDRCalls=function(a){api=a;if(a.view!=='calls')return;
  if((D||err)&&!loading&&cusKey()!==loadedKey){D=null;err=null;}
  if(!D&&!loading&&!err)load(false);setRange();render();};
})();
