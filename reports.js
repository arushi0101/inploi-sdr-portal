/* Section charts for the SDR portal. app.js calls window.SDRReports(api) after every render; each chart lives in its own section. */
(function(){
document.head.insertAdjacentHTML('beforeend','<style>'+
'.rp{display:grid;gap:20px;min-width:0}.rp>*,.rp-row>*{min-width:0}.rp .card>*{min-width:0}.rp:empty{display:none}'+
'.rp-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:20px}'+
'.rp-seg{display:inline-flex;gap:14px;font-size:.8rem}.rp-seg button{background:none;border:0;padding:0 0 3px;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;font:inherit}'+
'.rp-seg button[aria-pressed=true]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}'+
'.rp-tog{background:none;border:0;color:var(--muted);font-size:.76rem;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}'+
'.rp-chart{position:relative;min-width:0;max-width:100%}.rp .tbl{overflow-x:auto}.rp-chart svg{display:block;overflow:visible}'+
'.rp-chart text{font-family:var(--f-data);font-size:10.5px;fill:var(--muted)}'+
'.rp-grid{stroke:var(--line);stroke-width:1}.rp-base{stroke:var(--fg);stroke-width:1;opacity:.25}'+
'.rp-ref{stroke:var(--fg);stroke-width:1;stroke-dasharray:3 4;opacity:.55}'+
'.rp-hit{fill:transparent}.rp-hit:hover{fill:var(--fg);fill-opacity:.045}'+
'.rp-mult{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}'+
'.rp-pan{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 14px 10px;display:grid;gap:2px;background:var(--surface)}'+
'.rp-pan .nm{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}'+
'.rp-pan .vv{display:flex;align-items:baseline;gap:8px}.rp-pan .vv b{font-family:var(--f-display);font-size:1.45rem;font-weight:600;line-height:1.15}'+
'.rp-pan .sub{font-size:.74rem;color:var(--muted)}.rp-pan.team{background:var(--bg)}'+
'.rp-d{font-size:.74rem;font-weight:600;font-variant-numeric:tabular-nums}.rp-d.up{color:var(--ok-fg)}.rp-d.dn{color:var(--bad-fg)}.rp-d.eq{color:var(--muted);font-weight:500}'+
'.rp-mini{display:flex;align-items:flex-end;gap:3px;height:38px;margin-top:6px}.rp-mini span{flex:1;background:var(--fg);opacity:.16;min-height:1px}.rp-mini span.cur{background:var(--accent);opacity:1}.rp-mini span:hover{opacity:.45}.rp-mini span.cur:hover{opacity:.8}'+
'.rp-wk{display:flex;justify-content:space-between;font-size:.66rem;color:var(--muted);margin-top:3px}'+
'.rp-rows{display:grid}.rp-r{display:grid;grid-template-columns:minmax(120px,190px) 1fr 70px 64px;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:.86rem}'+
'.rp-r:last-child{border-bottom:0}.rp-r .n{font-family:var(--f-data);text-align:right;font-weight:600}.rp-r .p{font-family:var(--f-data);text-align:right;color:var(--muted);font-size:.78rem}'+
'.rp-r .trk{height:8px;background:var(--line);position:relative;display:block;border:0;padding:0;width:100%}.rp-r .fill{display:block;height:100%;background:var(--fg)}.rp-r .fill.acc{background:var(--accent)}'+
'.rp-r button.trk{cursor:pointer}.rp-r button.trk:hover .fill{opacity:.75}'+
'.rp-rh{display:grid;grid-template-columns:minmax(120px,190px) 1fr 70px 64px;gap:14px;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;padding-bottom:6px;border-bottom:1px solid var(--line)}.rp-rh span:nth-child(n+3){text-align:right}'+
'.rp-heat{display:grid;grid-template-columns:40px repeat(12,minmax(0,1fr));gap:2px;font-size:.7rem}'+
'.rp-heat .h{color:var(--muted);text-align:center;padding-bottom:3px;font-family:var(--f-data)}.rp-heat .d{color:var(--muted);display:flex;align-items:center}'+
'.rp-heat .c{height:30px;display:flex;align-items:center;justify-content:center;font-family:var(--f-data);color:var(--fg);font-size:.68rem}'+
'.rp-heat .c.lo{color:var(--muted);background:repeating-linear-gradient(135deg,transparent 0 4px,var(--line) 4px 5px)}.rp-heat .c.inv{color:#fff}'+
'.rp-scale{display:flex;align-items:center;gap:8px;font-size:.72rem;color:var(--muted)}.rp-scale i{display:inline-block;width:110px;height:8px;background:linear-gradient(90deg,color-mix(in oklab,var(--s-bot) 10%,var(--surface)),var(--s-bot))}'+
'.rp-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:.76rem;color:var(--muted)}.rp-legend i{display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:0}'+
'.rp-note{font-size:.78rem;color:var(--muted)}.rp-insight{font-size:.86rem;color:var(--fg)}.rp-insight b{font-weight:600}'+
'.rp-lb td{vertical-align:middle}.rp-lb .bar0{height:2px;background:var(--line);margin-top:5px}.rp-lb .bar0 i{display:block;height:100%;background:var(--fg);opacity:.5}.rp-lb td.top .bar0 i{background:var(--accent);opacity:1}.rp-lb td.top{font-weight:700}'+
'.rp-tip{position:fixed;z-index:60;pointer-events:none;background:var(--fg);color:var(--bg);padding:8px 10px;font-size:.78rem;display:grid;gap:2px;min-width:130px;max-width:260px}'+
'.rp-tip b{font-weight:600}.rp-tip .r{display:flex;gap:12px;justify-content:space-between}.rp-tip .r span{opacity:.75}.rp-tip .f{opacity:.7;font-size:.72rem;margin-top:2px}'+
'@media (max-width:620px){.rp-r,.rp-rh{grid-template-columns:100px 1fr 52px 46px;gap:8px}.rp-heat{grid-template-columns:30px repeat(12,minmax(0,1fr));font-size:.6rem}.rp-heat .c{height:24px;font-size:.58rem}}'+
'</style>');

var TT=null,TRD=null,trLoad=false,trErr=false;
var A=null, ui={calls:'calls',mail:'emails',ovm:'calls',tables:{}};
var MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function wkLabel(iso){var p=iso.split('-');return (+p[2])+' '+MONS[+p[1]-1];}
function e(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(n){return Math.round(n).toLocaleString('en-GB');}
function niceMax(v,minTop){v=Math.max(v,minTop||4);var p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=4?4:n<=5?5:10)*p;}
function addArr(a,b){return a.map(function(x,i){return x+(b[i]||0);});}
function trend(S,key){var out=null;S.forEach(function(s){var t=TT.bySdr[s.k];if(!t)return;out=out?addArr(out,t[key]):t[key].slice();});return out||[];}
function sumArr(a){return a.reduce(function(x,y){return x+y;},0);}

/* tooltip */
var tip=document.createElement('div');tip.className='rp-tip';tip.hidden=true;document.body.appendChild(tip);
var TIPS={},tipSeq=0;
function tipAttr(d){var id='t'+(++tipSeq);TIPS[id]=d;return ' data-tip="'+id+'"';}
function showTip(ev,d){tip.textContent='';var h=document.createElement('b');h.textContent=d.t;tip.appendChild(h);
  (d.r||[]).forEach(function(r){var row=document.createElement('div');row.className='r';var l=document.createElement('span');l.textContent=r.l;var v=document.createElement('b');v.textContent=r.v;row.appendChild(l);row.appendChild(v);tip.appendChild(row);});
  if(d.f){var f=document.createElement('div');f.className='f';f.textContent=d.f;tip.appendChild(f);}tip.hidden=false;moveTip(ev);}
function moveTip(ev){var r=tip.getBoundingClientRect(),x=ev.clientX+14,y=ev.clientY+14;if(x+r.width>innerWidth-8)x=ev.clientX-r.width-14;if(y+r.height>innerHeight-8)y=ev.clientY-r.height-14;tip.style.left=x+'px';tip.style.top=y+'px';}
document.addEventListener('pointermove',function(ev){var t=ev.target.closest&&ev.target.closest('[data-tip]');if(t&&TIPS[t.dataset.tip]){if(tip.hidden||tip._id!==t.dataset.tip){tip._id=t.dataset.tip;showTip(ev,TIPS[t.dataset.tip]);}else moveTip(ev);}else if(!tip.hidden){tip.hidden=true;tip._id=null;}});
addEventListener('scroll',function(){tip.hidden=true;},true);

function card(id,title,tag,body,table,controls){
  var showT=!!ui.tables[id];
  return '<div class="card" id="rp-'+id+'"><div class="sec-head"><h2>'+title+'</h2><div class="right">'+(controls||'')+(tag?'<span class="tag">'+tag+'</span>':'')+
    (table?'<button class="rp-tog" data-rptable="'+id+'">'+(showT?'Chart':'Table')+'</button>':'')+'</div></div>'+
    '<div class="rp-chart"'+(showT?' hidden':'')+'>'+body+'</div>'+(table?'<div class="tbl"'+(showT?'':' hidden')+'>'+table+'</div>':'')+'</div>';
}
function tbl(head,rows){return '<table><thead><tr>'+head.map(function(h,i){return '<th'+(i?'':' class="l"')+'>'+e(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return i?'<td class="n">'+c+'</td>':'<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';}
function seg(group,opts,cur){return '<span class="rp-seg" data-rpgroup="'+group+'">'+opts.map(function(o){return '<button data-rpv="'+o[0]+'" aria-pressed="'+(cur===o[0])+'">'+o[1]+'</button>';}).join('')+'</span>';}
function delta(now,prev){if(!prev&&!now)return '<span class="rp-d eq">flat</span>';if(!prev)return '<span class="rp-d up">new</span>';var d=Math.round((now-prev)/prev*100);
  return d>0?'<span class="rp-d up">+'+d+'%</span>':d<0?'<span class="rp-d dn">\u2212'+Math.abs(d)+'%</span>':'<span class="rp-d eq">flat</span>';}

/* small multiples: one panel per SDR (plus team), 8 weekly columns, current week in accent */
function multiples(S,key,label,weeks){
  var panels=[];
  if(S.length>1)panels.push({name:'Team',v:trend(S,key),team:true});
  S.forEach(function(s){panels.push({name:s.short,v:TT.bySdr[s.k][key]});});
  var last=weeks.length-1;
  return '<div class="rp-mult">'+panels.map(function(p){var mx=Math.max.apply(null,p.v.concat([1]));
    var avg=sumArr(p.v.slice(0,last))/last;
    return '<div class="rp-pan'+(p.team?' team':'')+'"><span class="nm">'+e(p.name)+'</span><div class="vv"><b>'+fmt(p.v[last])+'</b>'+delta(p.v[last],p.v[last-1])+'</div>'+
      '<span class="sub">this week vs last \u00b7 avg '+(Math.round(avg*10)/10)+' before</span>'+
      '<div class="rp-mini">'+p.v.map(function(v,i){return '<span'+(i===last?' class="cur"':'')+' style="height:'+Math.max(2,v/mx*100)+'%"'+tipAttr({t:p.name+' \u00b7 week of '+weeks[i],r:[{l:label,v:fmt(v)}]})+'></span>';}).join('')+'</div>'+
      '<div class="rp-wk"><span>'+weeks[0]+'</span><span>'+weeks[last]+'</span></div></div>';}).join('')+'</div>';
}

/* thin columns, one per day; hover shows the split by SDR */
function dayColumns(w,S,key,label){
  var dm=A.PERIODS.dayOfMonth,p=A.PERIODS.mtd.start.split('-'),yr=+p[0],mi=+p[1]-1,mon=MONS[mi];
  var tot=[];for(var i=0;i<dm;i++)tot.push(S.reduce(function(a,s){return a+(TT.bySdr[s.k][key][i]||0);},0));
  var wd=function(i){return new Date(Date.UTC(yr,mi,i+1)).getUTCDay();},isWe=function(i){var g=wd(i);return g===0||g===6;};
  var work=tot.filter(function(_,i){return !isWe(i);}),avg=work.length?sumArr(work)/work.length:0;
  var H=170,L=30,R=6,T=10,B=22,iw=Math.max(60,w-L-R),ih=H-T-B,step=iw/dm,bw=Math.max(2,Math.min(18,step*0.55));
  var max=niceMax(Math.max.apply(null,tot.concat([avg,1])),4),y=function(v){return T+ih-v/max*ih;};
  var o='<svg width="'+w+'" height="'+H+'" role="img" aria-label="'+e(label)+' per day this month">';
  [0.5,1].forEach(function(f){var gv=max*f;o+='<line class="rp-grid" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(gv)+'" y2="'+y(gv)+'"/><text x="'+(L-6)+'" y="'+(y(gv)+3)+'" text-anchor="end">'+fmt(gv)+'</text>';});
  o+='<line class="rp-base" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
  tot.forEach(function(v,i){var cx=L+step*i+step/2,h=Math.max(v?1.5:0,y(0)-y(v));
    o+='<rect x="'+(cx-bw/2)+'" y="'+(y(0)-h)+'" width="'+bw+'" height="'+h+'" fill="'+(i===dm-1?'var(--accent)':'var(--fg)')+'" opacity="'+(i===dm-1?1:isWe(i)?.25:.7)+'"/>';
    if(dm<=16||i%2===0||i===dm-1)o+='<text x="'+cx+'" y="'+(H-6)+'" text-anchor="middle"'+(isWe(i)?' opacity=".55"':'')+'>'+(i+1)+'</text>';
    o+='<rect class="rp-hit" x="'+(L+step*i)+'" y="'+T+'" width="'+step+'" height="'+ih+'"'+tipAttr({t:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd(i)]+' '+(i+1)+' '+mon,r:[{l:'Total',v:fmt(v)}].concat(S.length>1?S.map(function(s){return {l:s.short,v:fmt(TT.bySdr[s.k][key][i]||0)};}):[])})+'/>';});
  if(avg)o+='<line class="rp-ref" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(avg)+'" y2="'+y(avg)+'"/>';
  o+='</svg>';
  return {svg:o,avg:avg,tot:tot,mon:mon,dm:dm};
}

/* meetings per week: booked (outline) and held (filled) side by side, with target pace */
function meetChart(w,weeks,bk,hd,pace){
  var H=190,L=30,R=6,T=14,B=22,iw=Math.max(60,w-L-R),ih=H-T-B,n=weeks.length,step=iw/n,bw=Math.min(16,step*0.28);
  var max=niceMax(Math.max.apply(null,bk.concat(hd).concat([pace,1])),4),y=function(v){return T+ih-v/max*ih;};
  var o='<svg width="'+w+'" height="'+H+'" role="img" aria-label="First meetings booked and held per week">';
  [0.5,1].forEach(function(f){var gv=max*f;o+='<line class="rp-grid" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(gv)+'" y2="'+y(gv)+'"/><text x="'+(L-6)+'" y="'+(y(gv)+3)+'" text-anchor="end">'+(gv%1?gv.toFixed(1):fmt(gv))+'</text>';});
  o+='<line class="rp-base" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
  weeks.forEach(function(wl,i){var cx=L+step*i+step/2,hb=y(0)-y(bk[i]),hh=y(0)-y(hd[i]);
    if(bk[i])o+='<rect x="'+(cx-bw-1)+'" y="'+(y(0)-hb+0.5)+'" width="'+(bw-1)+'" height="'+(hb-0.5)+'" fill="none" stroke="var(--fg)" stroke-width="1"/>';
    if(hd[i])o+='<rect x="'+(cx+1)+'" y="'+(y(0)-hh)+'" width="'+bw+'" height="'+hh+'" fill="var(--accent)"/>';
    if(step>=46||i%2===0||i===n-1)o+='<text x="'+cx+'" y="'+(H-6)+'" text-anchor="middle">'+e(wl)+'</text>';
    o+='<rect class="rp-hit" x="'+(L+step*i)+'" y="'+T+'" width="'+step+'" height="'+ih+'"'+tipAttr({t:'Week of '+wl,r:[{l:'Booked',v:bk[i]},{l:'Held',v:hd[i]}],f:'Target pace: '+(Math.round(pace*10)/10)+' held a week'})+'/>';});
  o+='<line class="rp-ref" x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(pace)+'" y2="'+y(pace)+'"/>';
  return o+'</svg>';
}

function rowsBlock(head,rows){
  return '<div class="rp-rh">'+head.map(function(h){return '<span>'+h+'</span>';}).join('')+'</div><div class="rp-rows">'+rows.join('')+'</div>';
}

/* slot inside a section's view: created once, refilled on every render */
function slot(view,where,id){
  var v=document.querySelector('.view[data-view="'+view+'"]');if(!v)return null;
  var el=document.getElementById('rp-slot-'+id);
  if(!el){el=document.createElement('div');el.className='rp';el.id='rp-slot-'+id;
    if(where==='end')v.appendChild(el);else{var cards=v.querySelectorAll(':scope > .card, :scope > .grid2');var ref=cards[where]||null;v.insertBefore(el,ref?ref.nextSibling:null);}}
  return el;
}

function render(api){
  A=api;TIPS={};tipSeq=0;
  TT=api.TRENDS||TRD;
  /* the 8-week history comes from a second, slower request once the main data is live */
  if(!TT&&api.LISTS&&!trLoad&&!trErr){trLoad=true;
    fetch('api/data?part=trends').then(function(r){return r.json();}).then(function(d){if(d&&d.TRENDS)TRD=d.TRENDS;else trErr=true;}).catch(function(){trErr=true;}).then(function(){trLoad=false;if(A)render(A);});}
  var pending=function(t){return trLoad?'<div class="card"><div class="sec-head"><h2>'+t+'</h2></div><p class="rp-note">Loading the last 8 weeks from HubSpot\u2026</p></div>':trErr&&api.LISTS?'<div class="card"><div class="sec-head"><h2>'+t+'</h2></div><p class="rp-note">The 8-week history couldn\u2019t be loaded just now. Try Refresh now in a minute.</p></div>':'';};
  var S=api.S,P=api.P,live=!!TT,view=api.view;
  var who=api.all?'All SDRs':api.byK(api.pod).short,perL=P==='wk'?'This week':'Month to date';
  var weeks=live?TT.weeks.map(wkLabel):[];
  var oD=api.DEALS.filter(function(x){return api.all||x.s===api.pod;});
  var widthOf=function(el){var p=el.parentElement;return Math.max(240,((p&&p.clientWidth)||el.clientWidth||900)-42);};

  /* OVERVIEW: week on week panels, funnel, leaderboard */
  if(view==='overview'){
    var top=slot('overview',0,'ov-top'),bot=slot('overview','end','ov-bot');
    var OVM={calls:'Calls',conv:'Real conversations',emails:'Emails sent',booked:'Meetings booked'};
    if(top)top.innerHTML=live?card('ovtrend','Week on week',e(who)+' \u00b7 last 8 weeks',multiples(S,ui.ovm,OVM[ui.ovm],weeks),
      tbl(['Week'].concat(S.map(function(s){return s.short;})),weeks.map(function(wl,i){return [e(wl)].concat(S.map(function(s){return fmt(TT.bySdr[s.k][ui.ovm][i]);}));})),
      seg('ovm',[['calls','Calls'],['conv','Conversations'],['emails','Emails'],['booked','Meetings']],ui.ovm)):pending('Week on week');
    if(bot){
      var sumS=function(f){return S.reduce(function(a,s){return a+f(s);},0);};
      var uniq=function(m,per){if(!api.LISTS)return null;var o={};S.forEach(function(s){var a=((api.LISTS[m]||{})[s.k]||{})[per];(a||[]).forEach(function(id){o[id]=1;});});return Object.keys(o).length;};
      var steps=[['Assigned accounts',sumS(function(s){return s.assigned;}),'assigned','all'],['Accounts contacted',sumS(function(s){return s.contacted[P];}),'contacted',P],
        ['Accounts with a real conversation',uniq('conv',P),'conv',P],['Meetings booked',sumS(function(s){return s.first[P];}),'booked',P],
        ['First meetings held (month)',sumS(function(s){return s.held;}),'held','all']].filter(function(s){return s[1]!=null;});
      var fmax=Math.max(1,steps[0][1]);
      var frows=steps.map(function(st,i){var conv=i&&steps[i-1][1]?Math.round(st[1]/steps[i-1][1]*1000)/10+'%':'';
        var bar='<span class="fill'+(i===steps.length-1?' acc':'')+'" style="width:'+Math.max(st[1]/fmax*100,st[1]?0.8:0)+'%"></span>';
        return '<div class="rp-r"><span class="lb">'+e(st[0])+'</span>'+(api.LISTS?'<button class="trk" data-drill="'+st[2]+'|'+st[3]+'|"'+tipAttr({t:st[0],r:[{l:'Count',v:fmt(st[1])}].concat(conv?[{l:'Of stage above',v:conv}]:[]),f:'Click to see the companies'})+'>'+bar+'</button>':'<span class="trk">'+bar+'</span>')+'<span class="n">'+fmt(st[1])+'</span><span class="p">'+conv+'</span></div>';});
      var funnel=card('funnel','Conversion funnel',e(who)+' \u00b7 '+perL,rowsBlock(['Stage','','Count','Step rate'],frows)+'<p class="rp-note" style="margin-top:8px">Step rate is the share of the stage above. Held meetings are month to date. Click a bar to see the companies.</p>',
        tbl(['Stage','Count','Step rate'],steps.map(function(st,i){return [e(st[0]),fmt(st[1]),i&&steps[i-1][1]?(Math.round(st[1]/steps[i-1][1]*1000)/10)+'%':'\u2013'];})));
      var rows=S.map(function(s){var c=s.calls[P],calls=api.ct(c);return {s:s,calls:calls,conv:c.conv,rate:calls?c.conv/calls:0,emails:s.emails[P],booked:s.first[P],held:s.held,pipe:api.DEALS.filter(function(x){return x.s===s.k;}).reduce(function(a,x){return a+x.a;},0)};})
        .sort(function(a,b){return b.booked-a.booked||b.held-a.held||b.conv-a.conv;});
      var cols=[['calls','Calls',fmt,'calls',P],['conv','Conversations',fmt,'conv',P],['rate','Connect rate',function(v){return (Math.round(v*1000)/10)+'%';}],['emails','Emails',fmt,'emails',P],['booked','Meetings booked',fmt,'booked',P],['held','Held (month)',fmt,'held','all'],['pipe','Open pipeline',api.fmtK,'deals','all']];
      var mx={};cols.forEach(function(c){mx[c[0]]=Math.max.apply(null,rows.map(function(r){return r[c[0]];}).concat([0]));});
      var lb='<div class="tbl"><table class="rp-lb"><thead><tr><th class="l">Rank</th><th class="l">SDR</th>'+cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+
        rows.map(function(r,i){return '<tr><td class="l">'+(i+1)+'</td><td class="l">'+e(r.s.short)+'</td>'+cols.map(function(c){var v=r[c[0]],topv=rows.length>1&&v&&v===mx[c[0]];
          return '<td class="n'+(topv?' top':'')+'">'+(c[3]?api.dn(c[2](v),c[3],c[4],r.s.k):c[2](v))+'<div class="bar0"><i style="width:'+(mx[c[0]]?v/mx[c[0]]*100:0)+'%"></i></div></td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
      var board=card('lb','SDR leaderboard',perL+' \u00b7 ranked by first meetings booked',lb+'<p class="rp-note" style="margin-top:8px">Orange marks the leader in each column.</p>',null);
      bot.innerHTML=board+funnel;
    }
  }

  /* MEETINGS: booked vs held per week */
  if(view==='meetings'){
    var ms=slot('meetings',0,'meet');
    if(ms){if(!live)ms.innerHTML=pending('Meetings booked and held by week');else{
      var bk=trend(S,'booked'),hd=trend(S,'held'),pace=8*12/52*S.length;
      var lastH=hd[hd.length-1],avgH=sumArr(hd.slice(0,-1))/(hd.length-1);
      ms.innerHTML=card('meetwk','Meetings booked and held by week',e(who)+' \u00b7 last 8 weeks',
        '<div class="rp-legend" style="margin-bottom:8px"><span><i style="border:1px solid var(--fg)"></i>Booked</span><span><i style="background:var(--accent)"></i>Held</span><span><svg width="20" height="8" style="margin-right:6px"><line x1="0" x2="20" y1="4" y2="4" class="rp-ref"/></svg>Target pace, '+(Math.round(pace*10)/10)+' held a week</span></div><p class="rp-note" style="margin-bottom:6px">Booked: companies moved to Account Status Meeting Booked that week. Held: first meetings marked completed in HubSpot or Gong.</p>'+
        meetChart(widthOf(ms),weeks,bk,hd,pace)+
        '<p class="rp-insight" style="margin-top:10px"><b>'+sumArr(bk)+'</b> booked and <b>'+sumArr(hd)+'</b> held over 8 weeks. Held this week: <b>'+lastH+'</b>, against a weekly average of '+(Math.round(avgH*10)/10)+' before.</p>',
        tbl(['Week','Booked','Held'],weeks.map(function(wl,i){return [e(wl),bk[i],hd[i]];})));}}
  }

  /* CALLS: weekly multiples, daily columns, when calls connect */
  if(view==='calls'){
    var cs=slot('calls',0,'calls');
    if(cs){if(!live)cs.innerHTML=pending('Calls by week');else{
      var CM={calls:'Calls',conv:'Real conversations'},dkey=ui.calls==='conv'?'dConv':'dCalls';
      var dc=dayColumns(widthOf(cs),S,dkey,CM[ui.calls]);
      var hm=Array.from({length:5},function(){return Array.from({length:12},function(){return [0,0];});});
      S.forEach(function(s){TT.bySdr[s.k].heat.forEach(function(r,di){r.forEach(function(c,hi){hm[di][hi][0]+=c[0];hm[di][hi][1]+=c[1];});});});
      var rates=[];hm.forEach(function(r){r.forEach(function(c){if(c[0]>=5)rates.push(c[1]/c[0]);});});var rmax=Math.max.apply(null,rates.concat([0.01]));
      var DN=['Mon','Tue','Wed','Thu','Fri'],best=null,busiest=null;
      hm.forEach(function(r,di){r.forEach(function(c,hi){if(c[0]>=5&&(!best||c[1]/c[0]>best.r))best={r:c[1]/c[0],d:di,h:hi,n:c[0]};if(!busiest||c[0]>busiest.n)busiest={d:di,h:hi,n:c[0]};});});
      var hh=function(h){return ('0'+(h+7)).slice(-2)+':00';};
      var heat='<div class="rp-heat"><span></span>'+Array.from({length:12},function(_,i){return '<span class="h">'+hh(i).slice(0,2)+'</span>';}).join('')+
        hm.map(function(r,di){return '<span class="d">'+DN[di]+'</span>'+r.map(function(c,hi){var lo=c[0]<5,rt=c[0]?c[1]/c[0]:0,pc=Math.round(rt*100),k=lo?0:Math.round(8+rt/rmax*86);
          return '<div class="c'+(lo?' lo':'')+(k>55?' inv':'')+'" style="'+(lo?'':'background:color-mix(in oklab,var(--s-bot) '+k+'%,var(--surface))')+'"'+tipAttr({t:DN[di]+' '+hh(hi)+'\u2013'+hh(hi+1),r:[{l:'Calls',v:fmt(c[0])},{l:'Conversations',v:fmt(c[1])},{l:'Connect rate',v:c[0]?pc+'%':'\u2013'}],f:lo?'Fewer than 5 calls: too few to judge':''})+'>'+(lo?'':pc+'%')+'</div>';}).join('');}).join('')+'</div>';
      cs.innerHTML=card('callwk','Calls by week',e(who)+' \u00b7 last 8 weeks',multiples(S,ui.calls,CM[ui.calls],weeks),
          tbl(['Week'].concat(S.map(function(s){return s.short;})),weeks.map(function(wl,i){return [e(wl)].concat(S.map(function(s){return fmt(TT.bySdr[s.k][ui.calls][i]);}));})),seg('calls',[['calls','Calls'],['conv','Conversations']],ui.calls))+
        card('callday',CM[ui.calls]+' by day',e(who)+' \u00b7 1\u2013'+dc.dm+' '+dc.mon,dc.svg+'<p class="rp-note" style="margin-top:6px">Dashed line: weekday average ('+(Math.round(dc.avg*10)/10)+'). Weekends are faded; today is orange.</p>',
          tbl(['Day'].concat(S.length>1?S.map(function(s){return s.short;}):[]).concat(['Total']),dc.tot.map(function(t,i){return [(i+1)+' '+dc.mon].concat(S.length>1?S.map(function(s){return fmt(TT.bySdr[s.k][dkey][i]||0);}):[]).concat([fmt(t)]);})))+
        card('heat','When calls connect',e(who)+' \u00b7 last 8 weeks \u00b7 UK time',
          (best?'<p class="rp-insight" style="margin-bottom:10px">Best slot: <b>'+DN[best.d]+' '+hh(best.h)+'\u2013'+hh(best.h+1)+'</b>, where '+Math.round(best.r*100)+'% of '+best.n+' calls connected. Most calls are made '+DN[busiest.d]+' '+hh(busiest.h)+'\u2013'+hh(busiest.h+1)+'.</p>':'')+heat+
          '<div class="rp-scale" style="margin-top:10px">Connect rate: lower <i></i> higher. Hatched cells have fewer than 5 calls.</div>',
          tbl(['Day'].concat(Array.from({length:12},function(_,i){return hh(i);})),hm.map(function(r,di){return [DN[di]].concat(r.map(function(c){return c[0]?Math.round(c[1]/c[0]*100)+'% of '+c[0]:'\u2013';}));})));
    }}
  }

  /* EMAILS: weekly multiples and daily columns */
  if(view==='outreach'){
    var es=slot('outreach',0,'mail');
    if(es){if(!live)es.innerHTML=pending('Emails by week');else{
      var EM={emails:'Emails sent',replies:'Email replies'};
      var de=ui.mail==='emails'?dayColumns(widthOf(es),S,'dEmails','Emails sent'):null;
      es.innerHTML=card('mailwk','Emails by week',e(who)+' \u00b7 last 8 weeks',multiples(S,ui.mail,EM[ui.mail],weeks),
          tbl(['Week'].concat(S.map(function(s){return s.short;})),weeks.map(function(wl,i){return [e(wl)].concat(S.map(function(s){return fmt(TT.bySdr[s.k][ui.mail][i]);}));})),seg('mail',[['emails','Sent'],['replies','Replies']],ui.mail))+
        (de?card('mailday','Emails sent by day',e(who)+' \u00b7 1\u2013'+de.dm+' '+de.mon,de.svg+'<p class="rp-note" style="margin-top:6px">Dashed line: weekday average ('+(Math.round(de.avg*10)/10)+'). Includes logged calendar invites.</p>',
          tbl(['Day','Emails'],de.tot.map(function(t,i){return [(i+1)+' '+de.mon,fmt(t)];}))):'');
    }}
  }

  /* PIPELINE: open pipeline by stage */
  if(view==='pipeline'){
    var ps=slot('pipeline',0,'pipe');
    if(ps){
      var byStage={};oD.forEach(function(x){var k=x.st||'No stage';(byStage[k]=byStage[k]||{n:0,a:0,co:[]}).n++;byStage[k].a+=x.a;if(x.co)byStage[k].co.push(x.co);});
      var stg=Object.keys(byStage).sort(function(a,b){return byStage[b].a-byStage[a].a;});
      var smax=Math.max.apply(null,stg.map(function(k){return byStage[k].a;}).concat([1])),stot=oD.reduce(function(a,x){return a+x.a;},0);
      var prow=stg.map(function(k){var b=byStage[k],sh=Math.round(b.a/(stot||1)*100);var bar='<span class="fill acc" style="width:'+Math.max(b.a/smax*100,1)+'%"></span>';
        var attrs=b.co.length?' data-ids="'+b.co.join(',')+'" data-ttl="'+e(k)+' \u00b7 '+e(who)+'" data-sub="'+e(who)+' \u00b7 open SDR deals at this stage"':'';
        return '<div class="rp-r"><span class="lb">'+e(k)+' <span class="muted" style="font-size:.76rem">\u00b7 '+b.n+(b.n===1?' deal':' deals')+'</span></span>'+(b.co.length?'<button class="trk"'+attrs+tipAttr({t:k,r:[{l:'Deals',v:b.n},{l:'Amount',v:api.fmtK(b.a)},{l:'Share of pipeline',v:sh+'%'}],f:'Click to see the companies'})+'>'+bar+'</button>':'<span class="trk">'+bar+'</span>')+
          '<span class="n">'+api.fmtK(b.a)+'</span><span class="p">'+sh+'%</span></div>';});
      ps.innerHTML=stg.length?card('pipestage','Open pipeline by stage',e(who)+' \u00b7 '+oD.length+' deals \u00b7 '+api.fmtK(stot),rowsBlock(['Stage','','Amount','Share'],prow),
        tbl(['Stage','Deals','Amount','Share'],stg.map(function(k){return [e(k),byStage[k].n,api.fmtK(byStage[k].a),Math.round(byStage[k].a/(stot||1)*100)+'%'];}))):'';
    }
  }
}
var rt;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(A)render(A);},150);});
document.addEventListener('click',function(ev){
  var t=ev.target.closest('[data-rptable]');if(t){ui.tables[t.dataset.rptable]=!ui.tables[t.dataset.rptable];render(A);return;}
  var b=ev.target.closest('[data-rpgroup] [data-rpv]');if(b){ui[b.parentNode.dataset.rpgroup]=b.dataset.rpv;render(A);}
});
window.SDRReports=render;
})();
