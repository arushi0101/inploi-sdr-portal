/* Daily, weekly and monthly reports: reach (accounts and contacts, net new vs follow-up), calls by outcome, emails, replies,
   meetings booked, coverage, industry mix, conversion rates, data gaps and a leaderboard. Live via api/data?part=report.
   Every number opens the records behind it. */
(function(){
var SPANS={daily:'day',weekly:'week',monthly:'month'},TITLES={daily:'Daily report',weekly:'Weekly report',monthly:'Monthly report'};
var anchorView=document.querySelector('.view[data-view="overview"]');
Object.keys(SPANS).reverse().forEach(function(v){if(anchorView&&!document.querySelector('.view[data-view="'+v+'"]'))anchorView.insertAdjacentHTML('afterend','<div class="view" data-view="'+v+'" hidden><div class="rp" id="rp-'+v+'"><div class="card"><p class="muted">Loading…</p></div></div></div>');});
document.head.insertAdjacentHTML('beforeend','<style>'+
'.rx-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}.rx-bar h2{margin:0}'+
'.rx-pick{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.rx-pick button,.rx-pick input{background:var(--surface);border:1px solid var(--line);color:var(--fg);padding:6px 11px;font:inherit;font-size:.85rem}.rx-pick button{cursor:pointer}.rx-pick button:disabled{opacity:.4;cursor:default}.rx-pick .now{background:var(--fg);color:var(--bg);border-color:var(--fg)}'+
'.rx-sub{font-size:.82rem;color:var(--muted);margin:6px 0 0}'+
'.rx-split{font-size:.78rem;color:var(--muted);font-style:normal}.rx-split strong{font-weight:600;color:var(--fg)}.rx-k{grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))}'+
'.rx-lb{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px}'+
'.rx-lbc{border:1px solid var(--line);background:var(--surface);padding:14px 16px}.rx-lbc h3{margin:0 0 10px;font-size:.78rem;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}'+
'.rx-lbr{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 0}.rx-lbr .md{font-size:1.05rem;text-align:center}.rx-lbr .nm{font-weight:600;font-size:.88rem}'+
'.rx-lbr .tr{grid-column:2/4;height:5px;background:color-mix(in oklab,var(--fg) 8%,transparent)}.rx-lbr .tr i{display:block;height:100%;background:var(--accent)}.rx-lbr.top .nm{color:var(--accent)}'+
'.rx-gf{display:inline-flex;align-items:center;gap:8px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:10px}.rx-gf select{border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:6px 8px;font:inherit;font-size:.85rem;text-transform:none;letter-spacing:0;font-weight:400}.rx-gap td.n button.num{color:var(--warn-fg,#b8324f)}.rx-ok{color:var(--ok-fg,#2e7d4f);font-weight:600}'+
'</style>');

var api=null,cache={},loading={},errs={},state={},H={},hid=0;
var CONN=['connected','valuable conversation','bad timing','not interested'];
var OUT=[['meeting booked','#65bc67'],['valuable conversation','#495985'],['connected','#182d63'],['bad timing','#ffd233'],['not interested','#b8324f'],['gatekeeper','#8e6bbf'],['left voicemail','#f29e4c'],['busy','#5081ff'],['ai screening bot','#9aa3b0'],['wrong number','#7a4a2a'],['left company/retired','#5c6670'],['no answer','#FF4D00'],['no outcome logged','#c9cdd3']];
var LDAY=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short'}),LDM=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'}),LMON=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',month:'long',year:'numeric'});
var LISO=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';

function e(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(n){return Math.round(n).toLocaleString('en-GB');}
function pct(a,b){return b?Math.round(a/b*100)+'%':'–';}
function reg(fn){var id='x'+(++hid);H[id]=fn;return id;}
function ukToday(){return LISO.format(new Date());}
function addD(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function addM(iso,n){var d=new Date(iso.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10);}
function monday(iso){var d=new Date(iso+'T12:00:00Z');return addD(iso,-((d.getUTCDay()+6)%7));}
function norm(view,iso){return SPANS[view]==='week'?monday(iso):SPANS[view]==='month'?iso.slice(0,7)+'-01':iso;}
function dl(iso){return new Date(iso+'T12:00:00Z');}

/* period label */
function periodName(view,D){var s=SPANS[view];
  if(s==='day')return LDAY.format(dl(D.day));
  if(s==='month')return LMON.format(dl(D.day));
  return 'Week of '+LDM.format(dl(D.day))+' – '+LDM.format(dl(addD(D.day,6)));}
function periodEnd(D){var s=D.span;return s==='day'?D.day:s==='week'?addD(D.day,6):addD(addM(D.day,1),-1);}
function soFar(D){return D.last<periodEnd(D)?' \u00b7 so far (to '+LDM.format(dl(D.last))+')':'';}

/* outcomes */
function lab(D,d){return d?(D.labels[d]||'Other outcome'):'No outcome logged';}
function key(D,d){return lab(D,d).toLowerCase();}
function colour(k){for(var i=0;i<OUT.length;i++)if(OUT[i][0]===k)return OUT[i][1];return '#c7a2d6';}
function order(keys){var known=OUT.map(function(o){return o[0];});return keys.slice().sort(function(a,b){var x=known.indexOf(a),y=known.indexOf(b);return (x<0?50:x)-(y<0?50:y)||(a<b?-1:1);});}
function nice(D,k){var m={};Object.keys(D.labels).forEach(function(id){m[D.labels[id].toLowerCase()]=D.labels[id];});return m[k]||k.charAt(0).toUpperCase()+k.slice(1);}

/* which SDRs are in view */
function SI(D){var out=[];D.SDRS.forEach(function(s,i){if(!api||api.pod==='all'||api.pod===s.k)out.push(i);});return out;}
function who(D){return api&&api.pod!=='all'?api.byK(api.pod).short:'All SDRs';}

/* the numbers for one set of SDRs */
function crunch(D,sis){
  var A=D.ACT.filter(function(a){return sis.indexOf(a[1])>=0;});
  var out=A.filter(function(a){return a[2]!=='r';}),calls=A.filter(function(a){return a[2]==='c';}),ems=A.filter(function(a){return a[2]==='e';}),reps=A.filter(function(a){return a[2]==='r';});
  var newCo={},newCon={};D.NEWCO.forEach(function(id){newCo[id]=1;});D.NEWCON.forEach(function(id){newCon[id]=1;});
  var cos={},cons={};out.forEach(function(a){a[4].forEach(function(id){(cos[id]=cos[id]||[]).push(a);});a[5].forEach(function(id){(cons[id]=cons[id]||[]).push(a);});});
  var coIds=Object.keys(cos),conIds=Object.keys(cons);
  var conn=calls.filter(function(a){return CONN.indexOf(key(D,a[3]))>=0;});
  var mb=D.MB.filter(function(r){return sis.indexOf(r[2])>=0;}),meet=D.MEET.filter(function(r){return sis.indexOf(r[3])>=0;});
  var assigned=0,l30=0;sis.forEach(function(i){assigned+=D.COV[i].assigned;l30+=D.COV[i].l30;});
  var assignedReached=coIds.filter(function(id){return D.CO[id]&&sis.indexOf(D.CO[id][2])>=0;});
  return {A:A,out:out,calls:calls,ems:ems,reps:reps,conn:conn,cos:cos,cons:cons,coIds:coIds,conIds:conIds,
    newCo:coIds.filter(function(id){return newCo[id];}),fuCo:coIds.filter(function(id){return !newCo[id];}),
    newCon:conIds.filter(function(id){return newCon[id];}),fuCon:conIds.filter(function(id){return !newCon[id];}),
    mb:mb,meet:meet,assigned:assigned,l30:l30,assignedReached:assignedReached,isNewCo:function(id){return !!newCo[id];},isNewCon:function(id){return !!newCon[id];}};}

/* drills */
var ACT_COLS=[{h:'When',t:'date',time:true},{h:'SDR',t:'text'},{h:'Activity',t:'text'},{h:'Outcome / subject',t:'text'},{h:'Company',t:'co'},{h:'Contact',t:'text'},{h:'Call type',t:'text'},{h:'Talk time (min)',t:'num'},{h:'HubSpot',t:'link'}];
function names(D){if(!window.SDRDrill)return;var m={};Object.keys(D.CO).forEach(function(id){var c=D.CO[id];m[id]=[c[0],c[3],c[2]>=0?D.SDRS[c[2]].k:'',''];});window.SDRDrill.names(m);}
function sub(D){return who(D)+' · '+periodName(cur,D);}
function drillActs(D,title,list,note){if(!window.SDRDrill)return;names(D);
  window.SDRDrill.table(title,sub(D),ACT_COLS,list.slice().sort(function(a,b){return b[0]-a[0];}).map(function(a){var co=a[4][0];
    return [a[0],D.SDRS[a[1]].short,a[2]==='c'?'Call':a[2]==='e'?(a[3]==='seq'?'Sequence email':'Email'):'Reply',a[2]==='c'?lab(D,a[3]):a[6],co?[co,D.CO[co]?D.CO[co][0]:'Company '+co]:null,a[5].map(function(id){return D.CON[id]?D.CON[id][0]:'';}).filter(Boolean).join(', '),a[2]==='c'?(a[6]||'– missing'):'',a[2]==='c'?Math.round(a[8]/6)/10:null,[HS+(a[2]==='c'?'0-48/':'0-49/')+a[7],'Open']];}),note);}
function drillCos(D,title,ids,C,note){if(!window.SDRDrill)return;names(D);
  window.SDRDrill.table(title,sub(D),[{h:'Company',t:'co'},{h:'Net new or follow-up',t:'text'},{h:'Worked by',t:'text'},{h:'SDR Owner',t:'text'},{h:'Account Status',t:'text'},{h:'Industry',t:'text'},{h:'Touches',t:'num'},{h:'Contacts reached',t:'num'}],
    ids.map(function(id){var c=D.CO[id]||['Company '+id,'',-1,'',0],acts=(C&&C.cos[id])||[],by={};acts.forEach(function(a){by[D.SDRS[a[1]].short]=1;});var cn={};acts.forEach(function(a){a[5].forEach(function(x){cn[x]=1;});});
      return [[id,c[0]],C?(C.isNewCo(id)?'Net new':'Follow-up'):'',Object.keys(by).join(', '),c[2]>=0?D.SDRS[c[2]].short:(c[4]?'Not one of the 4 SDRs':'– missing'),c[3]||'– missing',c[1]||'– missing',acts.length,Object.keys(cn).length];}),note);}
function drillCons(D,title,ids,C,note){if(!window.SDRDrill)return;names(D);
  window.SDRDrill.table(title,sub(D),[{h:'Contact',t:'link'},{h:'Job title',t:'text'},{h:'Company',t:'co'},{h:'Net new or follow-up',t:'text'},{h:'Worked by',t:'text'},{h:'Touches',t:'num'}],
    ids.map(function(id){var c=D.CON[id]||['Contact '+id,'',null],acts=C.cons[id]||[],by={};acts.forEach(function(a){by[D.SDRS[a[1]].short]=1;});var co=c[2]||(acts[0]&&acts[0][4][0]);
      return [[HS+'0-1/'+id,c[0]],c[1],co?[co,D.CO[co]?D.CO[co][0]:'Company '+co]:null,C.isNewCon(id)?'Net new':'Follow-up',Object.keys(by).join(', '),acts.length];}),note);}
function drillMeet(D,title,rows,note){if(!window.SDRDrill)return;names(D);
  window.SDRDrill.table(title,sub(D),[{h:'Meeting',t:'link'},{h:'Company',t:'co'},{h:'SDR',t:'text'},{h:'Logged',t:'date',time:true},{h:'Meeting date',t:'date',time:true},{h:'Meeting type',t:'text'},{h:'Outcome',t:'text'},{h:'Owner',t:'text'}],
    rows.map(function(r){return [[HS+'0-47/'+r[0],r[1]],r[2]?[r[2],D.CO[r[2]]?D.CO[r[2]][0]:'Company '+r[2]]:null,D.SDRS[r[3]].short,r[4],r[5],r[6]||'– missing',r[7]||'– missing',r[8]];}),note);}
function drillMB(D,title,rows){if(!window.SDRDrill)return;names(D);
  window.SDRDrill.table(title,sub(D),[{h:'Company',t:'co'},{h:'SDR',t:'text'},{h:'Moved to Meeting Booked',t:'date',time:true},{h:'Account Status now',t:'text'},{h:'Industry',t:'text'}],
    rows.map(function(r){var c=D.CO[r[0]]||['Company '+r[0],'',-1,''];return [[r[0],c[0]],r[2]>=0?D.SDRS[r[2]].short:'',r[1],c[3],c[1]];}),'Companies whose Account Status changed to Meeting Booked in this period, as on the Meetings page.');}

function btn(v,fn,t){return '<button class="num" data-rx="'+reg(fn)+'" title="'+e(t||'See the records')+'">'+v+'</button>';}
function dn(n,fn,t){return n?btn(fmt(n),fn,t):'<span class="muted">0</span>';}
function kpi(label,v,sub){return '<div class="mt-kpi"><span>'+e(label)+'</span><b>'+v+'</b><em>'+sub+'</em></div>';}
function sec(t,s,body){return '<div class="card"><div class="sec-head"><h2>'+e(t)+'</h2></div>'+(s?'<p class="rx-sub">'+s+'</p>':'')+'<div style="margin-top:12px">'+body+'</div></div>';}

/* ----- sections ----- */
function split(a,b){return '<i class="rx-split"><strong>'+a+'</strong> net new \u00b7 <strong>'+b+'</strong> follow-up</i>';}
function kpis(D,C){var nAcc=C.coIds.length,nCon=C.conIds.length;
  return '<div class="mt-kpis rx-k">'+
    kpi('Accounts reached',dn(nAcc,function(){drillCos(D,'Accounts reached',C.coIds,C);}),split(dn(C.newCo.length,function(){drillCos(D,'Net new accounts',C.newCo,C);}),dn(C.fuCo.length,function(){drillCos(D,'Follow-up accounts',C.fuCo,C);})))+
    kpi('Contacts reached',dn(nCon,function(){drillCons(D,'Contacts reached',C.conIds,C);}),split(dn(C.newCon.length,function(){drillCons(D,'Net new contacts',C.newCon,C);}),dn(C.fuCon.length,function(){drillCons(D,'Follow-up contacts',C.fuCon,C);})))+
    kpi('Contacts per account',nAcc?(Math.round(nCon/nAcc*10)/10).toString():'–','Average contacts reached at each account')+
    kpi('Calls made',dn(C.calls.length,function(){drillActs(D,'Calls made',C.calls);}),dn(C.conn.length,function(){drillActs(D,'Connected calls',C.conn,'Connected = Connected, Valuable Conversation, Bad Timing or Not Interested.');})+' connected · '+pct(C.conn.length,C.calls.length)+' connect rate')+
    kpi('Emails sent',dn(C.ems.length,function(){drillActs(D,'Emails sent',C.ems);}),C.ems.filter(function(a){return a[3]==='seq';}).length+' from sequences')+
    kpi('Replies received',dn(C.reps.length,function(){drillActs(D,'Replies received',C.reps);}),pct(C.reps.length,C.ems.length)+' reply rate (replies ÷ emails sent)')+
    kpi('Meetings booked',dn(C.mb.length,function(){drillMB(D,'Meetings booked',C.mb);}),pct(C.mb.length,nAcc)+' of accounts reached · '+dn(C.meet.length,function(){drillMeet(D,'Meetings logged in HubSpot',C.meet);})+' meetings logged')+
    kpi('Account coverage',pct(C.assignedReached.length,C.assigned),btn(fmt(C.assignedReached.length),function(){drillCos(D,'Assigned accounts reached',C.assignedReached,C);})+' of '+fmt(C.assigned)+' assigned accounts reached · '+pct(C.l30,C.assigned)+' contacted in the last 30 days')+
  '</div>';}

function bySdr(D){var sis=SI(D);
  var row=function(lbl,C,team){
    return '<tr'+(team?' class="team"':'')+'><td>'+e(lbl)+'</td>'+
      '<td class="n">'+dn(C.coIds.length,function(){drillCos(D,'Accounts reached · '+lbl,C.coIds,C);})+'</td><td class="n">'+dn(C.newCo.length,function(){drillCos(D,'Net new accounts · '+lbl,C.newCo,C);})+'</td><td class="n">'+dn(C.fuCo.length,function(){drillCos(D,'Follow-up accounts · '+lbl,C.fuCo,C);})+'</td>'+
      '<td class="n">'+dn(C.conIds.length,function(){drillCons(D,'Contacts reached · '+lbl,C.conIds,C);})+'</td><td class="n">'+dn(C.newCon.length,function(){drillCons(D,'Net new contacts · '+lbl,C.newCon,C);})+'</td><td class="n">'+dn(C.fuCon.length,function(){drillCons(D,'Follow-up contacts · '+lbl,C.fuCon,C);})+'</td>'+
      '<td class="n">'+(C.coIds.length?Math.round(C.conIds.length/C.coIds.length*10)/10:'–')+'</td>'+
      '<td class="n">'+dn(C.calls.length,function(){drillActs(D,'Calls · '+lbl,C.calls);})+'</td><td class="n">'+pct(C.conn.length,C.calls.length)+'</td>'+
      '<td class="n">'+dn(C.ems.length,function(){drillActs(D,'Emails sent · '+lbl,C.ems);})+'</td><td class="n">'+dn(C.reps.length,function(){drillActs(D,'Replies · '+lbl,C.reps);})+'</td><td class="n">'+pct(C.reps.length,C.ems.length)+'</td>'+
      '<td class="n">'+dn(C.mb.length,function(){drillMB(D,'Meetings booked · '+lbl,C.mb);})+'</td><td class="n">'+pct(C.assignedReached.length,C.assigned)+'</td></tr>';};
  return '<div class="tbl mt-tbl"><table><thead><tr><th class="l">SDR</th><th>Accounts<br>reached</th><th>Net new<br>accounts</th><th>Follow-up<br>accounts</th><th>Contacts<br>reached</th><th>Net new<br>contacts</th><th>Follow-up<br>contacts</th><th>Contacts<br>per account</th><th>Calls</th><th>Connect<br>rate</th><th>Emails<br>sent</th><th>Replies</th><th>Reply<br>rate</th><th>Meetings<br>booked</th><th>Coverage</th></tr></thead><tbody>'+
    sis.map(function(i){return row(D.SDRS[i].short,crunch(D,[i]));}).join('')+(sis.length>1?row('Team',crunch(D,sis),true):'')+'</tbody></table></div>';}

function outcomes(D){var sis=SI(D),all=crunch(D,sis).calls,t={};all.forEach(function(a){var k=key(D,a[3]);t[k]=(t[k]||0)+1;});var ks=order(Object.keys(t));
  if(!all.length)return '<p class="muted">No calls in this period.</p>';
  var rows=sis.map(function(i){return {i:i,l:all.filter(function(a){return a[1]===i;})};}),mx=Math.max.apply(null,rows.map(function(r){return r.l.length;}).concat([1]));
  return '<div class="mt-legend">'+ks.map(function(k){return '<span><i style="background:'+colour(k)+'"></i>'+e(nice(D,k))+' '+t[k]+'</span>';}).join('')+'</div><div class="mt-rows">'+rows.map(function(r){var n=r.l.length,s=D.SDRS[r.i].short,tt={};r.l.forEach(function(a){var k=key(D,a[3]);tt[k]=(tt[k]||0)+1;});
    return '<div class="mt-row"><span class="lbl">'+e(s)+'</span><div class="mt-track">'+(n?'<div class="mt-stack" style="width:'+(n/mx*100)+'%">'+ks.map(function(k){if(!tt[k])return '';var l=r.l.filter(function(a){return key(D,a[3])===k;});return '<button style="width:'+(tt[k]/n*100)+'%;background:'+colour(k)+'" title="'+e(nice(D,k)+': '+tt[k])+'" data-rx="'+reg(function(){drillActs(D,s+' · '+nice(D,k),l);})+'"></button>';}).join('')+'</div>':'<span class="muted" style="font-size:.78rem">No calls</span>')+'</div>'+
      (n?'<button class="mt-tot" data-rx="'+reg(function(){drillActs(D,'Calls · '+s,r.l);})+'">'+n+'</button>':'<span class="mt-tot">0</span>')+'</div>';}).join('')+'</div>';}

function industries(D){var C=crunch(D,SI(D)),by={};C.coIds.forEach(function(id){var ind=(D.CO[id]&&D.CO[id][1])||'No industry set';(by[ind]=by[ind]||[]).push(id);});
  var ks=Object.keys(by).sort(function(a,b){return by[b].length-by[a].length||(a<b?-1:1);});if(!ks.length)return '<p class="muted">No accounts reached in this period.</p>';
  var mx=by[ks[0]].length;
  return '<div class="mt-rows">'+ks.map(function(k){var l=by[k],nn=l.filter(C.isNewCo).length;
    return '<div class="mt-row"><span class="lbl">'+e(k)+'<small>'+nn+' net new · '+(l.length-nn)+' follow-up</small></span><div class="mt-track"><div class="mt-stack" style="width:'+(l.length/mx*100)+'%">'+
      (nn?'<button style="width:'+(nn/l.length*100)+'%;background:#65bc67" title="Net new: '+nn+'" data-rx="'+reg(function(){drillCos(D,k+' · net new',l.filter(C.isNewCo),C);})+'"></button>':'')+
      (l.length-nn?'<button style="width:'+((l.length-nn)/l.length*100)+'%;background:var(--oc-conn,#182d63)" title="Follow-up: '+(l.length-nn)+'" data-rx="'+reg(function(){drillCos(D,k+' · follow-up',l.filter(function(id){return !C.isNewCo(id);}),C);})+'"></button>':'')+
      '</div></div><button class="mt-tot" data-rx="'+reg(function(){drillCos(D,'Accounts reached · '+k,l,C);})+'">'+l.length+'</button></div>';}).join('')+'</div>'+
    '<div class="mt-legend" style="margin-top:10px"><span><i style="background:#65bc67"></i>Net new</span><span><i style="background:var(--oc-conn,#182d63)"></i>Follow-up</span></div>';}

var gapWho={};
function gaps(D,view){var C=crunch(D,SI(D)),now=Date.now(),sdr=function(i){return D.SDRS[i].short;};
  var full={};D.SDRS.forEach(function(x){full[x.name]=x.short;});var meetWho=function(r){return [full[r[8]]||r[8]||sdr(r[3])];},coWho=function(id){var by={};(C.cos[id]||[]).forEach(function(a){by[sdr(a[1])]=1;});return Object.keys(by);},actWho=function(a){return [sdr(a[1])];};
  var G=[
    ['New meetings with no meeting type',C.meet.filter(function(r){return !r[6];}),'meet','Set Meeting type (e.g. Discovery Call) on the meeting.','Meeting owner',meetWho],
    ['Past meetings with no outcome',C.meet.filter(function(r){return r[5]&&r[5]<now&&(!r[7]||/SCHEDULED/i.test(r[7]));}),'meet','Set the meeting outcome (Completed, No show, Cancelled, Rescheduled) once it has happened.','Meeting owner',meetWho],
    ['Accounts worked with no SDR Owner',C.coIds.filter(function(id){return D.CO[id]&&!D.CO[id][4];}),'co','Set SDR Owner on the company.','SDR who worked it',coWho],
    ['Accounts worked with no Account Status',C.coIds.filter(function(id){return D.CO[id]&&!D.CO[id][3];}),'co','Set Account Status on the company.','SDR who worked it',coWho],
    ['Calls with no outcome',C.calls.filter(function(a){return !a[3];}),'act','Set Call outcome on the call.','SDR who made the call',actWho],
    ['Calls with no call type',C.calls.filter(function(a){return !a[6];}),'act','Set the activity (call) type on the call.','SDR who made the call',actWho],
    ['Calls and emails not linked to a contact',C.out.filter(function(a){return !a[5].length;}),'act','Associate the activity with the contact spoken to.','SDR who logged it',actWho],
    ['Calls and emails not linked to a company',C.out.filter(function(a){return !a[4].length;}),'act','Associate the activity (or its contact) with the company.','SDR who logged it',actWho]];
  // everyone with something to fix, for the filter
  var people={};G.forEach(function(g){g[1].forEach(function(x){g[5](x).forEach(function(n){people[n]=(people[n]||0)+1;});});});
  var names=Object.keys(people).sort(function(a,b){return people[b]-people[a]||(a<b?-1:1);}),f=gapWho[view]||'';if(f&&!people[f])f='';
  var open=function(g,l,t){if(g[2]==='meet')drillMeet(D,t,l,g[3]);else if(g[2]==='co')drillCos(D,t,l,C,g[3]);else drillActs(D,t,l,g[3]);};
  var total=0;
  var rows=G.map(function(g){var l=f?g[1].filter(function(x){return g[5](x).indexOf(f)>=0;}):g[1];total+=l.length;
    var per={};l.forEach(function(x){g[5](x).forEach(function(n){(per[n]=per[n]||[]).push(x);});});
    var who=Object.keys(per).sort(function(a,b){return per[b].length-per[a].length||(a<b?-1:1);}).map(function(n){return '<span style="white-space:nowrap">'+btn(e(n)+' '+per[n].length,function(){open(g,per[n],g[0]+' · '+n);},'See '+n+'’s list')+'</span>';}).join(' · ');
    return '<tr><td>'+e(g[0])+'</td><td class="n">'+(l.length?btn(fmt(l.length),function(){open(g,l,g[0]+(f?' · '+f:''));}):'<span class="rx-ok">0</span>')+'</td><td class="l">'+(who||'<span class="muted">–</span>')+'<div class="muted" style="font-size:.72rem">'+e(g[4])+'</div></td><td class="l muted">'+e(g[3])+'</td></tr>';}).join('');
  var filter='<label class="rx-gf">Who fixes it <select id="rxGap-'+view+'"><option value="">Everyone ('+names.reduce(function(t,n){return t+people[n];},0)+')</option>'+names.map(function(n){return '<option value="'+e(n)+'"'+(n===f?' selected':'')+'>'+e(n)+' ('+people[n]+')</option>';}).join('')+'</select></label>';
  return (names.length?filter:'')+(total?'':'<p class="rx-ok">'+(f?'Nothing for '+e(f)+' to fix in this period.':'No data gaps in this period. Nice work.')+'</p>')+
    '<div class="tbl mt-tbl rx-gap"><table><thead><tr><th class="l">Gap</th><th>Count</th><th class="l">Who fixes it</th><th class="l">How to fix</th></tr></thead><tbody>'+rows+'</tbody></table></div>';}
function leaderboard(D){var all=D.SDRS.map(function(s,i){return {i:i,C:crunch(D,[i])};});
  var M=[['Calls made',function(C){return C.calls;},'act'],['Connected calls',function(C){return C.conn;},'act'],['Emails sent',function(C){return C.ems;},'act'],['Replies received',function(C){return C.reps;},'act'],
    ['Accounts reached',function(C){return C.coIds;},'co'],['Net new accounts',function(C){return C.newCo;},'co'],['Contacts reached',function(C){return C.conIds;},'con'],['Meetings booked',function(C){return C.mb;},'mb']];
  var medal=['🥇','🥈','🥉'];
  return '<div class="rx-lb">'+M.map(function(m){var rows=all.map(function(x){return {i:x.i,C:x.C,l:m[1](x.C)};}).sort(function(a,b){return b.l.length-a.l.length||(D.SDRS[a.i].short<D.SDRS[b.i].short?-1:1);}),mx=Math.max(1,rows[0].l.length);
    var rank=0,prev=null;
    return '<div class="rx-lbc"><h3>'+e(m[0])+'</h3>'+rows.map(function(r,j){if(r.l.length!==prev){rank=j;prev=r.l.length;}var s=D.SDRS[r.i].short,go=function(){var t=m[0]+' · '+s;if(m[2]==='act')drillActs(D,t,r.l);else if(m[2]==='co')drillCos(D,t,r.l,r.C);else if(m[2]==='con')drillCons(D,t,r.l,r.C);else drillMB(D,t,r.l);};
      return '<div class="rx-lbr'+(rank===0&&r.l.length?' top':'')+'"><span class="md">'+(r.l.length&&rank<3?medal[rank]:'<span class="muted">'+(rank+1)+'</span>')+'</span><span class="nm">'+e(s)+'</span><span>'+dn(r.l.length,go)+'</span><span class="tr"><i style="width:'+(r.l.length/mx*100)+'%"></i></span></div>';}).join('')+'</div>';}).join('')+'</div>';}

/* ----- page ----- */
var cur=null;
function sel(view){var t=norm(view,ukToday());return state[view]||t;}
function maxFor(view){return norm(view,ukToday());}
function picker(view){var s=SPANS[view],v=sel(view),mx=maxFor(view);
  var input=s==='month'?'<input type="month" id="rxIn-'+view+'" value="'+v.slice(0,7)+'" max="'+mx.slice(0,7)+'" aria-label="Month">':'<input type="date" id="rxIn-'+view+'" value="'+v+'" max="'+ukToday()+'" aria-label="'+(s==='week'?'Any day in the week':'Day')+'">';
  return '<div class="rx-pick"><button id="rxPrev-'+view+'" aria-label="Previous">‹</button>'+input+'<button id="rxNext-'+view+'" aria-label="Next"'+(v>=mx?' disabled':'')+'>›</button><button id="rxNow-'+view+'" class="'+(v===mx?'now':'')+'">'+(s==='day'?'Today':s==='week'?'This week':'This month')+'</button></div>';}
function go(view,iso){if(iso>ukToday())iso=ukToday();state[view]=norm(view,iso);try{localStorage.setItem('sdrRx_'+view,state[view]);}catch(x){}render(view);}
function wire(view){var s=SPANS[view],v=sel(view),step=function(n){return s==='month'?addM(v,n):addD(v,s==='week'?7*n:n);};
  var p=document.getElementById('rxPrev-'+view),n=document.getElementById('rxNext-'+view),i=document.getElementById('rxIn-'+view),t=document.getElementById('rxNow-'+view);
  if(p)p.onclick=function(){go(view,step(-1));};if(n)n.onclick=function(){go(view,step(1));};if(t)t.onclick=function(){go(view,ukToday());};
  if(i)i.onchange=function(){if(!i.value)return;go(view,s==='month'?i.value+'-01':i.value);};}

function render(view){var root=document.getElementById('rp-'+view);if(!root)return;cur=view;H={};hid=0;
  var k=SPANS[view]+'|'+sel(view),D=cache[k];
  var head='<div class="card"><div class="rx-bar"><h2>'+e(TITLES[view])+'</h2>'+picker(view)+'</div><p class="rx-sub" id="rxSub-'+view+'"></p></div>';
  if(!D){root.innerHTML=head+'<div class="card"><p class="muted">'+(errs[k]?'Couldn’t load this report ('+e(errs[k])+'). Try Refresh now.':'Loading from HubSpot… weekly and monthly reports can take up to a minute.')+'</p></div>';wire(view);if(!loading[k]&&!errs[k])load(view,k);return;}
  var C=crunch(D,SI(D));
  root.innerHTML=head+
    kpis(D,C)+
    '<h3 class="mt-h">By SDR</h3>'+sec('Activity and conversion by SDR','Net new = no SDR call or email to that account or contact earlier this year. Follow-up = reached before. Coverage = assigned accounts reached in this period.',bySdr(D))+
    '<h3 class="mt-h">Calls and accounts</h3>'+
    '<div class="mt-two">'+sec('Calls by outcome','Every call, split by Call outcome. Click a segment to see the calls.',outcomes(D))+sec('Industry of accounts reached','From the company’s Industry. field.',industries(D))+'</div>'+
    '<h3 class="mt-h">Leaderboard</h3>'+sec('Who’s leading','All four SDRs, whatever pod is selected. Click a number to see the records.',leaderboard(D))+
    '<h3 class="mt-h">Data gaps</h3>'+sec('Fix these in HubSpot','Missing fields on the records worked in this period, and who should fix each one. Click a count or a name for the list.',gaps(D,view));
  document.getElementById('rxSub-'+view).textContent=who(D)+' · '+periodName(view,D)+soFar(D)+' · UK time';
  var gs=document.getElementById('rxGap-'+view);if(gs)gs.onchange=function(){gapWho[view]=gs.value;var y=window.scrollY;render(view);window.scrollTo(0,y);};
  wire(view);}

function load(view,k,fresh){loading[k]=true;var p=k.split('|');
  fetch('api/data?part=report&span='+p[0]+'&day='+p[1]+(fresh?'&t='+Date.now():'')).then(function(r){return r.json().catch(function(){return {error:'bad_response'};}).then(function(d){if(!r.ok||d.error)throw d;return d;});})
  .then(function(d){cache[k]=d;delete errs[k];}).catch(function(x){errs[k]=(x&&(x.error==='missing_token'?'the HubSpot key isn’t set':x.message||x.error))||'network error';})
  .then(function(){loading[k]=false;if(api&&api.view===view)render(view);});}

document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-rx]');if(!b)return;ev.preventDefault();ev.stopPropagation();var fn=H[b.getAttribute('data-rx')];if(fn)fn();});
var rb=document.getElementById('refreshBtn');if(rb)rb.addEventListener('click',function(){if(api&&SPANS[api.view]){var k=SPANS[api.view]+'|'+sel(api.view);delete cache[k];delete errs[k];load(api.view,k,true);render(api.view);}});
Object.keys(SPANS).forEach(function(v){try{var s=localStorage.getItem('sdrRx_'+v);if(s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s<=ukToday())state[v]=s;}catch(x){}});

window.SDRReport=function(a){api=a;var db=document.getElementById('dateBar');if(db)db.style.display=SPANS[a.view]?'none':'';var cx=document.getElementById('ctx');if(cx)cx.style.visibility=SPANS[a.view]?'hidden':'';if(SPANS[a.view])render(a.view);};
})();
