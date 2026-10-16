/* Matt's dashboard: the reports from Matt's SDR Dashboard spec (sections A-H plus the weekly review), live from HubSpot via api/data?part=matt.
   Every bar, segment and number opens the records behind it; any company opens its full journey. */
(function(){
document.head.insertAdjacentHTML('beforeend','<style>'+
'.mt-ranges{display:flex;flex-wrap:wrap;gap:4px}.mt-ranges button{background:var(--surface);border:1px solid var(--line);color:var(--fg);padding:6px 12px;font:inherit;font-size:.82rem;cursor:pointer}'+
'.mt-ranges button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}'+
'.mt-bar-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 18px}.mt-bar-top .muted{font-size:.8rem}'+
'.mt-h{font-family:var(--f-display);font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:14px 0 -6px;display:flex;align-items:center;gap:10px}.mt-h::after{content:"";flex:1;height:1px;background:var(--line)}'+
'.mt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:1px;background:var(--line);border:1px solid var(--line)}'+
'.mt-kpi{background:var(--surface);padding:14px 16px;display:grid;gap:3px;align-content:start}.mt-kpi span{font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600}'+
'.mt-kpi b{font-family:var(--f-display);font-size:1.9rem;font-weight:600;line-height:1.15}.mt-kpi em{font-style:normal;font-size:.78rem;color:var(--muted)}.mt-kpi .code{font-size:.66rem;color:var(--muted);font-family:var(--f-data)}'+
'.mt-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.76rem;color:var(--muted);margin-bottom:10px}.mt-legend i{display:inline-block;width:9px;height:9px;margin-right:6px}'+
'.mt-rows{display:grid}.mt-row{display:grid;grid-template-columns:minmax(90px,150px) minmax(0,1fr) 56px;gap:12px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}.mt-row:last-child{border-bottom:0}'+
'.mt-row .lbl{font-size:.85rem;font-weight:600;line-height:1.2}.mt-row .lbl small{display:block;font-weight:400;color:var(--muted);font-size:.72rem}'+
'.mt-track{height:18px;position:relative}.mt-stack{display:flex;height:100%;min-width:2px}.mt-stack button{border:0;padding:0;height:100%;cursor:pointer;min-width:2px}.mt-stack button:hover,.mt-cols button:hover .mt-cs span{opacity:.72;outline:2px solid var(--fg);outline-offset:-2px}'+
'.mt-tot{background:none;border:0;font:inherit;font-family:var(--f-data);font-weight:600;text-align:right;cursor:pointer;color:var(--fg);padding:0;font-size:.9rem}.mt-tot:hover{color:var(--link)}'+
'.mt-mark{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--fg);opacity:.55}.mt-mark.floor{opacity:.3}'+
'.mt-cols{display:flex;align-items:flex-end;gap:3px;height:150px;border-bottom:1px solid var(--line);padding-top:16px}.mt-cols button{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;background:none;border:0;padding:0;cursor:pointer;position:relative}'+
'.mt-cols button:hover{background:color-mix(in oklab,var(--fg) 5%,transparent)}.mt-cs{display:flex;flex-direction:column-reverse;width:100%}.mt-cs span{display:block;width:100%}.mt-cols .v{font-size:.62rem;font-family:var(--f-data);color:var(--muted);text-align:center;margin-bottom:2px}'+
'.mt-xl{display:flex;gap:3px;font-size:.62rem;color:var(--muted);font-family:var(--f-data);margin-top:4px}.mt-xl span{flex:1;min-width:0;text-align:center;overflow:hidden;white-space:nowrap}'+
'.mt-cus{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin-top:12px}.mt-cus label{display:grid;gap:3px;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}.mt-cus input{border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:6px 8px;font:inherit;font-size:.85rem}.mt-cus button[type=submit]{background:var(--fg);color:var(--bg);border:0;padding:8px 14px;font:inherit;font-size:.82rem;cursor:pointer}'+
'.mt-flag{display:inline-block;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;font-weight:700;padding:2px 7px;background:var(--warn-bg);color:var(--warn-fg);margin-left:8px;vertical-align:2px}'+
'.mt-flag.ok{background:var(--ok-bg);color:var(--ok-fg)}.mt-code{font-family:var(--f-data);font-size:.7rem;color:var(--muted);font-weight:600;margin-right:6px}'+
'.mt-note{font-size:.8rem;color:var(--muted);margin:8px 0 0}.mt-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}'+
'.mt-tbl td.n button.num,.mt-tbl td button.num{font-family:var(--f-data)}.mt-tbl tr.team td{font-weight:700}'+
'.dr-panel:has(.dt){width:min(1080px,100%)}.dt table{font-size:.83rem}.dt th{cursor:pointer;user-select:none;white-space:nowrap}.dt th[aria-sort=ascending]::after{content:" \u2191"}.dt th[aria-sort=descending]::after{content:" \u2193"}'+
'.dt td{white-space:normal;vertical-align:top}.dt-tools{display:flex;gap:10px;align-items:center}.dt-tools .dr-search{flex:1}'+
'@media (max-width:620px){.mt-row{grid-template-columns:76px minmax(0,1fr) 44px;gap:8px}.mt-cols{height:120px}}'+
'</style>');

var HS='https://app-eu1.hubspot.com/contacts/25735731/record/';
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var COL={conv:'var(--s-conv)',noans:'var(--s-noans)',bot:'var(--s-bot)',other:'var(--s-other)',none:'var(--s-none)',green:'#2F9E6B',amber:'#E0A030',sky:'#7C97B0'};
var RANGES=[['wk','This week'],['lwk','Last week'],['mtd','This month'],['lm','Last month'],['cus','Custom dates']];
var D=null,loading=false,err=null,api=null,H={},hid=0,loadedKey='',showCus=false;
function cusKey(){return api&&api.cus?api.cus.from+'|'+api.cus.to:'';}
var range='mtd';try{var sr=localStorage.getItem('sdrMattRange');if(sr!=='cus'&&RANGES.some(function(r){return r[0]===sr;}))range=sr;}catch(e){}

function e(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(n){return Math.round(n).toLocaleString('en-GB');}
function dnice(ms){var d=new Date(ms);return d.getDate()+' '+MON[d.getMonth()];}
function isoD(ms){return ms?new Date(ms).toISOString().slice(0,10):'';}
function kfmt(v){return '\u00a3'+(Math.round(v/100)/10)+'k';}
function pctS(a,b){return b?Math.round(a/b*100)+'%':'\u2013';}
function median(a){if(!a.length)return null;a=a.slice().sort(function(x,y){return x-y;});var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function reg(fn){var id='h'+(++hid);H[id]=fn;return id;}
function rng(k){return D.R[k||range];}
function inR(ts,k){var r=rng(k);return ts!=null&&ts>=r[0]&&ts<r[1];}
function rangeLabel(k){k=k||range;var r=rng(k),a=new Date(r[0]+3*3600000),b=new Date(Math.min(r[1],D.today+86400000)-1);
  var lbl=RANGES.filter(function(x){return x[0]===k;})[0][1];
  return lbl+' \u00b7 '+(a.getMonth()===b.getMonth()?a.getDate()+'\u2013'+b.getDate()+' '+MON[b.getMonth()]:dnice(a.getTime())+' \u2013 '+dnice(b.getTime()));}
function coName(id){var c=D.CO[id];return c?c[0]:'Company '+id;}
function coCell(id){return id?[id,coName(id)]:null;}
function sdrName(i){return i>=0&&D.SDRS[i]?D.SDRS[i].short:'\u2013';}
function conName(id){var c=D.CON[id];return c?c[0]:'';}
function who(){return api&&api.pod!=='all'?api.byK(api.pod).short:'All SDRs';}

/* which SDRs are in view */
function SI(){var out=[];D.SDRS.forEach(function(s,i){if(!api||api.pod==='all'||api.pod===s.k)out.push(i);});return out;}
function inS(i){return SI().indexOf(i)>=0;}

/* drill: open a records table */
function drill(title,cols,rows,note,sub){
  if(!window.SDRDrill)return;
  var names={};Object.keys(D.CO).forEach(function(id){var c=D.CO[id];names[id]=[c[0],c[1],c[2]>=0?D.SDRS[c[2]].k:'',c[3]?isoD(c[3]):''];});window.SDRDrill.names(names);
  window.SDRDrill.table(title,sub||(who()+' \u00b7 '+rangeLabel()),cols,rows,note);
}
var CO_COLS=[{h:'Company',t:'co'},{h:'SDR',t:'text'},{h:'Account Status',t:'text'},{h:'Status changed',t:'date'},{h:'Last contacted',t:'date'},{h:'Contacts in HubSpot',t:'num'},{h:'Patch',t:'text'}];
function coRows(ids){return ids.map(function(id){var c=D.CO[id]||[];return [coCell(id),sdrName(c[2]),c[1]||'',c[8]||null,c[3]||null,c[5]||0,c[4]||'Round-robin'];});}
function drillCos(title,ids,note,extraCols,extraFn){var cols=CO_COLS.concat(extraCols||[]);drill(title,cols,coRows(ids).map(function(r,i){return extraFn?r.concat(extraFn(ids[i])):r;}),note);}
var CALL_LBL={conv:'Real conversation',noans:'No answer / voicemail',bot:'AI screening bot',gate:'Gatekeeper / wrong number',later:'Bad timing, call back',notint:'Not interested',none:'No outcome logged'};
var DISP_LBL={connected:'Connected',valuable:'Valuable conversation',booked:'Meeting booked',noans:'No answer',voicemail:'Left voicemail',bot:'AI screening bot',gatekeeper:'Gatekeeper',wrong:'Wrong number',badtiming:'Bad timing',notint:'Not interested',other:'Other',none:'No outcome logged'};
function callBucket(d){return d==='connected'||d==='valuable'||d==='booked'?'conv':d==='noans'||d==='voicemail'?'noans':d==='bot'?'bot':d==='gatekeeper'||d==='wrong'?'gate':d==='badtiming'?'later':d==='notint'?'notint':'none';}
function drillCalls(title,calls,note){drill(title,[{h:'When',t:'date',time:1},{h:'SDR',t:'text'},{h:'Company',t:'co'},{h:'Contact',t:'text'},{h:'Outcome',t:'text'}],
  calls.map(function(r){return [r[0],sdrName(r[1]),coCell(r[3]),conName(r[4]),DISP_LBL[r[2]]||r[2]];}),note);}
function drillEmails(title,ems,note){drill(title,[{h:'When',t:'date',time:1},{h:'SDR',t:'text'},{h:'Company',t:'co'},{h:'Contact',t:'text'},{h:'Subject',t:'text'},{h:'Type',t:'text'}],
  ems.map(function(r){return [r[0],sdrName(r[1]),coCell(r[4]),conName(r[5]),r[7]||'',r[2]===1?'Reply received':r[3]?'Sequence':'One-off'];}),note);}
function meetOut(m){var o=m.out||'';if(/^COMPLETED/i.test(o)||m.g)return 'Held';if(/NO_SHOW/i.test(o))return 'No show';if(/CANCEL/i.test(o))return 'Cancelled';if(/RESCHED/i.test(o))return 'Rescheduled';
  if(m.st>Date.now())return 'Upcoming';return o&&o!=='SCHEDULED'?o.charAt(0)+o.slice(1).toLowerCase().replace(/_/g,' '):'No outcome';}
function drillMeet(title,ms,note){drill(title,[{h:'Company',t:'co'},{h:'Credited SDR',t:'text'},{h:'Booked by',t:'text'},{h:'Meeting',t:'text'},{h:'Type',t:'text'},{h:'Booked on',t:'date'},{h:'Meeting date',t:'date'},{h:'Outcome',t:'text'}],
  ms.map(function(m){var c=D.CO[m.co]||[];return [coCell(m.co),sdrName(c[2]),m.by||'\u2013',m.t,m.ty||'Not set',m.cr,m.st,meetOut(m)+(m.g&&!/^COMPLETED/i.test(m.out||'')?' (per Gong; outcome not updated)':'')];}),note);}
function drillDeals(title,ds,note){drill(title,[{h:'Deal',t:'link'},{h:'Company',t:'co'},{h:'Credited SDR',t:'text'},{h:'AE',t:'text'},{h:'Stage',t:'text'},{h:'Amount',t:'num'},{h:'ARR',t:'num'},{h:'AE accepted',t:'text'},{h:'Next step',t:'text'},{h:'Created',t:'date'},{h:'Closed',t:'date'}],
  ds.map(function(d){return [[HS+'0-3/'+d.id,d.n],coCell(d.co),sdrName(d.s),d.ae||'\u2013',d.st,Math.round(d.amt),d.arr!=null?Math.round(d.arr):'blank',d.acc?'Yes':'Not marked',d.next||'',d.cr,d.closed?d.cl:null];}),note);}
function drillLeads(title,ls,note){drill(title,[{h:'Lead',t:'link'},{h:'Company',t:'text'},{h:'Stream',t:'text'},{h:'Lead Source',t:'text'},{h:'SDR',t:'text'},{h:'Contact owner',t:'text'},{h:'Created',t:'date'},{h:'Last contacted',t:'date'},{h:'Time to first touch (h)',t:'num'}],
  ls.map(function(l){return [[HS+'0-1/'+l.id,l.n],l.c,l.str,l.src,sdrName(l.s),l.o,l.cr,l.last,l.r==null?'Not touched':Math.round(l.r*10)/10];}),note);}

/* chart pieces */
function legend(cats){return '<div class="mt-legend">'+cats.map(function(c){return '<span><i style="background:'+c.c+'"></i>'+e(c.l)+'</span>';}).join('')+'</div>';}
/* rows: [{l,sub,v:{cat:n}}]; onSeg(rowIndex,cat|'*') */
function stack(rows,cats,onSeg,opts){opts=opts||{};var id=reg(onSeg);
  var mx=opts.max||Math.max.apply(null,rows.map(function(r){return cats.reduce(function(t,c){return t+(r.v[c.k]||0);},0);}).concat([1]));
  return (opts.noLegend?'':legend(cats))+'<div class="mt-rows">'+rows.map(function(r,ri){var tot=cats.reduce(function(t,c){return t+(r.v[c.k]||0);},0);
    var segs=cats.map(function(c){var n=r.v[c.k]||0;return n?'<button style="width:'+(n/tot*100)+'%;background:'+c.c+'" data-mk="'+id+'|'+ri+'|'+c.k+'" title="'+e(r.l+' \u00b7 '+c.l+': '+fmt(n))+' \u00b7 click for the records"></button>':'';}).join('');
    var marks=(opts.marks||[]).map(function(m){return '<span class="mt-mark'+(m.f?' floor':'')+'" style="left:'+Math.min(100,m.v/mx*100)+'%" title="'+e(m.l)+'"></span>';}).join('');
    return '<div class="mt-row"><span class="lbl">'+e(r.l)+(r.sub?'<small>'+e(r.sub)+'</small>':'')+'</span><div class="mt-track">'+(tot?'<div class="mt-stack" style="width:'+(tot/mx*100)+'%">'+segs+'</div>':'<span class="muted" style="font-size:.78rem">None</span>')+marks+'</div>'+
      '<button class="mt-tot" data-mk="'+id+'|'+ri+'|*" title="All '+e(r.l)+'">'+(opts.totFmt?opts.totFmt(tot,r):fmt(tot))+'</button></div>';}).join('')+'</div>';}
/* columns over time: labels[], series[{k,l,c,v:[]}] onCol(i,k) */
function cols(labels,series,onCol){var id=reg(onCol);var tot=labels.map(function(_,i){return series.reduce(function(t,s){return t+(s.v[i]||0);},0);});var mx=Math.max.apply(null,tot.concat([1]));
  var every=labels.length>20?Math.ceil(labels.length/12):1;
  return legend(series)+'<div class="mt-cols">'+labels.map(function(l,i){return '<button data-mk="'+id+'|'+i+'|*" title="'+e(l+': '+series.map(function(s){return s.l+' '+(s.v[i]||0);}).join(', '))+'"><span class="v">'+(tot[i]||'')+'</span><span class="mt-cs" style="height:'+(tot[i]/mx*100)+'%">'+
    series.map(function(s){var n=s.v[i]||0;return n?'<span style="height:'+(n/tot[i]*100)+'%;background:'+s.c+'"></span>':'';}).join('')+'</span></button>';}).join('')+'</div>'+
    '<div class="mt-xl">'+labels.map(function(l,i){return '<span>'+(i%every===0?e(l):'')+'</span>';}).join('')+'</div>';}
function num(v,fn,title){var id=reg(fn);return '<button class="num" data-mk="'+id+'|0|*" title="'+e(title||'See the records')+'">'+v+'</button>';}
function kpiT(code,label,v,sub){return '<div class="mt-kpi"><span>'+label+'</span><b>'+v+'</b><em>'+sub+'</em><span class="code">'+code+'</span></div>';}
function card(code,title,tag,body,flag){return '<div class="card"><div class="sec-head"><h2><span class="mt-code">'+code+'</span>'+title+(flag?'<span class="mt-flag'+(flag[0]==='ok'?' ok':'')+'">'+e(flag[1])+'</span>':'')+'</h2>'+(tag?'<span class="tag">'+e(tag)+'</span>':'')+'</div>'+body+'</div>';}
function tbl(head,rows,teamRow){return '<div class="tbl mt-tbl"><table><thead><tr>'+head.map(function(h,i){return '<th'+(i?'':' class="l"')+'>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+
  rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td'+(i?' class="n"':'')+'>'+c+'</td>';}).join('')+'</tr>';}).join('')+(teamRow?'<tr class="team">'+teamRow.map(function(c,i){return '<td'+(i?' class="n"':'')+'>'+c+'</td>';}).join('')+'</tr>':'')+'</tbody></table></div>';}
function sdrRows(){return SI().map(function(i){var s=D.SDRS[i];return {i:i,l:s.short,sub:s.pod+(s.lead?' \u00b7 '+s.lead:'')};});}

/* ---------- derived data for the selected range and SDRs ---------- */
function compute(){
  var S=SI(),X={};
  var sdrCos=Object.keys(D.CO).filter(function(id){return D.CO[id][2]>=0&&S.indexOf(D.CO[id][2])>=0;});
  X.cos=sdrCos;
  X.calls=D.CALLS.filter(function(r){return inR(r[0])&&S.indexOf(r[1])>=0;});
  X.sent=D.EMAILS.filter(function(r){return inR(r[0])&&S.indexOf(r[1])>=0&&r[2]===0;});
  X.sentReal=X.sent.filter(function(r){return !r[6];});
  X.replies=D.EMAILS.filter(function(r){return inR(r[0])&&S.indexOf(r[1])>=0&&r[2]===1;});
  X.enrol=D.ENROL.filter(function(r){return inR(r[0])&&S.indexOf(r[1])>=0;});
  // accounts contacted: SDR call or email in range, or Last Contacted in range; credited to the company SDR Owner
  var touched={},conBy={};
  X.calls.forEach(function(r){if(r[3]){touched[r[3]]=1;if(r[4])(conBy[r[3]]=conBy[r[3]]||{})[r[4]]=1;}});
  X.sentReal.forEach(function(r){if(r[4]){touched[r[4]]=1;if(r[5])(conBy[r[4]]=conBy[r[4]]||{})[r[5]]=1;}});
  sdrCos.forEach(function(id){if(inR(D.CO[id][3]))touched[id]=1;});
  X.contacted=sdrCos.filter(function(id){return touched[id];});
  X.conBy=conBy;
  X.newReached=sdrCos.filter(function(id){return inR(D.CO[id][7]);});
  X.mb=sdrCos.filter(function(id){return inR(D.CO[id][9]);});
  X.outcomeMoved=sdrCos.filter(function(id){return outcome(D.CO[id][1])!=='work'&&inR(D.CO[id][8]);});
  X.firstMeet=D.MEET.filter(function(m){return m.first&&D.CO[m.co]&&S.indexOf(D.CO[m.co][2])>=0;});
  X.deals=D.DEALS.filter(function(d){return S.indexOf(d.s)>=0;});
  X.leads=D.LEADS.filter(function(l){return inR(l.cr)&&(api.pod==='all'||S.indexOf(l.s)>=0);});
  return X;
}
function outcome(st){st=(st||'').toLowerCase();return /meeting booked|open opportunity/.test(st)?'pos':/not interested/.test(st)?'notint':/disqualified/.test(st)?'disq':/exhausted/.test(st)?'exh':'work';}
var OUT_CATS=[{k:'pos',l:'Handed to AE (Meeting Booked, Open Opportunity)',c:COL.conv},{k:'notint',l:'Not interested',c:COL.none},{k:'disq',l:'Disqualified',c:COL.other},{k:'exh',l:'Exhausted',c:COL.bot},{k:'work',l:'Still being worked',c:COL.noans}];
function bySdr(list,f){var o={};list.forEach(function(x){var s=f(x);(o[s]=o[s]||[]).push(x);});return o;}

/* ---------- render ---------- */
function render(){
  var root=document.getElementById('mattRoot');if(!root)return;
  if(!D){root.innerHTML='<div class="card"><p class="muted">'+(err?'Couldn\u2019t load Matt\u2019s dashboard from HubSpot ('+e(err)+'). <button class="rp-tog" id="mtRetry">Try again</button>':'Loading Matt\u2019s dashboard from HubSpot. This pulls six weeks of calls, emails, meetings and status history, so it can take up to a minute the first time\u2026')+'</p></div>';
    var rt=document.getElementById('mtRetry');if(rt)rt.addEventListener('click',function(){err=null;load(true);});return;}
  H={};hid=0;
  var X=compute(),R=sdrRows(),S=SI(),html='';
  var monthLbl=MON[new Date(D.R.mtd[0]).getMonth()];

  var cus=api&&api.cus;
  html+='<div class="card"><div class="mt-bar-top"><div class="mt-ranges" id="mtRanges">'+RANGES.map(function(r){return '<button data-r="'+r[0]+'" aria-pressed="'+(r[0]===range)+'"'+(r[0]==='cus'?' aria-expanded="'+showCus+'"':'')+'>'+r[1]+(r[0]==='cus'&&cus&&range==='cus'?' \u00b7 '+e(rangeLabel('cus').split(' \u00b7 ')[1]):'')+'</button>';}).join('')+'</div>'+
    '<span class="muted">'+e(who())+' \u00b7 '+e(rangeLabel())+' \u00b7 live from HubSpot, updated '+e(new Date(D.generatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))+'</span></div>'+
    (showCus?'<form class="mt-cus" id="mtCus"><label>From <input type="date" id="mtFrom" required value="'+e(cus?cus.from:isoD(D.R.mtd[0]+3*3600000))+'"></label><label>To <input type="date" id="mtTo" required value="'+e(cus?cus.to:isoD(D.today+3*3600000))+'"></label><button type="submit">Apply dates</button>'+(cus?'<button type="button" id="mtCusClear" class="rp-tog">Clear custom dates</button>':'')+'<span class="muted" style="font-size:.76rem">Applies to the whole portal. Long ranges take longer to load.</span></form>':'')+
    '<p class="mt-note">Built from Matt\u2019s SDR Dashboard spec. Codes (B3, C1\u2026) match the spec. Click any bar, segment or number to see the records behind it, then any company for its full journey. Use the Pod filter on the left for one SDR.</p></div>';

  /* Friday row */
  var cpa=X.contacted.length?(X.contacted.reduce(function(t,id){return t+Object.keys(X.conBy[id]||{}).length;},0)/X.contacted.length):0;
  var conv=X.calls.filter(function(r){return callBucket(r[2])==='conv';});
  html+='<div class="mt-h">Friday row</div><div class="mt-kpis">'+
    kpiT('B3','New accounts reached',num(fmt(X.newReached.length),function(){drillCos('New accounts reached',X.newReached,'Accounts whose Account Status first moved off New in this period, from HubSpot\u2019s status history. This is the spec\u2019s \u201cSDR First Outreach Date\u201d, worked out without a new field or backfill.');}),'First moved from New to being worked')+
    kpiT('B4','Contacts per account',num(cpa.toFixed(1),function(){drillContactsPer();}),fmt(X.contacted.length)+' accounts contacted')+
    kpiT('B5','Accounts moved to an outcome',num(fmt(X.outcomeMoved.length),function(){drillCos('Accounts moved to an outcome',X.outcomeMoved,'Accounts whose Account Status changed in this period to Meeting Booked, Open Opportunity, Not Interested, Disqualified or Exhausted.');}),X.outcomeMoved.filter(function(id){return outcome(D.CO[id][1])==='pos';}).length+' handed to an AE')+
    kpiT('E1','Meetings booked',num(fmt(X.mb.length),function(){drillBooked(X.mb);}),'Moved to Meeting Booked')+
    kpiT('C1','Calls made',num(fmt(X.calls.length),function(){drillCalls('Calls made',X.calls);}),num(fmt(conv.length),function(){drillCalls('Real conversations',conv);})+' real conversations ('+pctS(conv.length,X.calls.length)+')')+
  '</div>';

  /* A. Capacity and ramp */
  var heldM=D.MEET.filter(function(m){return m.first&&inR(m.st,'mtd')&&m.st<Date.now()&&meetOut(m)==='Held';});
  html+='<div class="mt-h">A. Capacity and ramp</div>'+card('A1','Ramp status and expectations',monthLbl+' to date',
    tbl(['SDR','Pod','Pod lead','First meetings held this month','Expectation','Ramp status'],R.map(function(r){var h=heldM.filter(function(m){return D.CO[m.co][2]===r.i;});
      return [e(D.SDRS[r.i].name),e(D.SDRS[r.i].pod),e(D.SDRS[r.i].lead||'\u2013'),num(h.length,function(){drillMeet('First meetings held this month \u00b7 '+r.l,h);}),'8 a month, floor 6','<span class="muted">Set by Annie</span>'];}))+
    '<p class="mt-note">Ramp status (Unramped, Ramping, Ramped) and support needed aren\u2019t tracked in HubSpot. Annie sets them before each weekly review; agree lower expectations during ramp.</p>',['warn','Manual']);

  /* B. Coverage */
  html+='<div class="mt-h">B. Coverage and follow-up</div>';
  var asg=bySdr(X.cos,function(id){return D.CO[id][2];}),ctd=bySdr(X.contacted,function(id){return D.CO[id][2];}),nr=bySdr(X.newReached,function(id){return D.CO[id][2];});
  html+='<div class="mt-two">'+card('B1\u2013B3','Accounts assigned, contacted and newly reached',rangeLabel(),
    stack(R.map(function(r){var a=(asg[r.i]||[]).length,c=(ctd[r.i]||[]).length;return {l:r.l,sub:r.sub,v:{c:c,u:a-c}};}),[{k:'c',l:'Contacted in period',c:COL.conv},{k:'u',l:'Not contacted in period',c:COL.noans}],
      function(ri,k){var i=R[ri].i;if(k==='c')drillCos('Accounts contacted \u00b7 '+R[ri].l,ctd[i]||[],'An SDR call or email in the period, or HubSpot\u2019s Last Contacted date in the period.');else if(k==='u')drillCos('Assigned, not contacted in period \u00b7 '+R[ri].l,(asg[i]||[]).filter(function(id){return (ctd[i]||[]).indexOf(id)<0;}));else drillCos('Accounts assigned \u00b7 '+R[ri].l,asg[i]||[]);},
      {totFmt:function(t,r){return fmt(t);}})+
    tbl(['SDR','Assigned (B1)','Contacted (B2)','Coverage','New reached (B3)'],R.map(function(r){var a=asg[r.i]||[],c=ctd[r.i]||[],n=nr[r.i]||[];
      return [e(r.l),num(fmt(a.length),function(){drillCos('Accounts assigned \u00b7 '+r.l,a);}),num(fmt(c.length),function(){drillCos('Accounts contacted \u00b7 '+r.l,c);}),pctS(c.length,a.length),num(fmt(n.length),function(){drillCos('New accounts reached \u00b7 '+r.l,n);})];}),
      R.length>1?['Team',num(fmt(X.cos.length),function(){drillCos('Accounts assigned',X.cos);}),num(fmt(X.contacted.length),function(){drillCos('Accounts contacted',X.contacted);}),pctS(X.contacted.length,X.cos.length),num(fmt(X.newReached.length),function(){drillCos('New accounts reached',X.newReached);})]:null)+
    '<p class="mt-note">Assigned uses the company SDR Owner (not Company owner) with no activity filter, as the spec asks. Annie is excluded.</p>');

  // B4 contacts per account
  var cpBand=function(n){return n>=4?'4':String(n);};
  var CPB=[{k:'1',l:'1 contact',c:COL.noans},{k:'2',l:'2 contacts',c:COL.sky},{k:'3',l:'3 contacts',c:COL.bot},{k:'4',l:'4 or more',c:COL.conv}];
  var withCons=X.contacted.filter(function(id){return X.conBy[id];});
  html+=card('B4','Contacts reached per account',rangeLabel(),
    stack(R.map(function(r){var v={};withCons.filter(function(id){return D.CO[id][2]===r.i;}).forEach(function(id){var b=cpBand(Object.keys(X.conBy[id]).length);v[b]=(v[b]||0)+1;});return {l:r.l,sub:r.sub,v:v};}),CPB,
      function(ri,k){var i=R[ri].i;drillContactsPer(withCons.filter(function(id){return D.CO[id][2]===i&&(k==='*'||cpBand(Object.keys(X.conBy[id]).length)===k);}),R[ri].l);})+
    tbl(['SDR','Accounts with a named contact reached','Contacts reached','Average per account'],R.map(function(r){var ids=withCons.filter(function(id){return D.CO[id][2]===r.i;}),n=ids.reduce(function(t,id){return t+Object.keys(X.conBy[id]).length;},0);
      return [e(r.l),num(fmt(ids.length),function(){drillContactsPer(ids,r.l);}),fmt(n),ids.length?(n/ids.length).toFixed(1):'\u2013'];}))+
    '<p class="mt-note">Distinct people called or emailed per account in the period (logged calendar invites excluded). Accounts contacted only through Last Contacted aren\u2019t in this chart.</p>')+'</div>';

  // B5 outcomes, B6 patch
  var stat={};X.cos.forEach(function(id){var s=D.CO[id][2],o=outcome(D.CO[id][1]);(stat[s]=stat[s]||{})[o]=(stat[s][o]||[]).concat([id]);});
  var patch={};X.cos.forEach(function(id){var s=D.CO[id][2],k=D.CO[id][4]?'pod':'rr';(patch[s]=patch[s]||{})[k]=(patch[s][k]||[]).concat([id]);});
  html+='<div class="mt-two">'+card('B5','Accounts worked to an outcome','Current status',
    stack(R.map(function(r){var v={};OUT_CATS.forEach(function(c){v[c.k]=((stat[r.i]||{})[c.k]||[]).length;});return {l:r.l,sub:r.sub,v:v};}),OUT_CATS,
      function(ri,k){var i=R[ri].i,ids=k==='*'?asg[i]||[]:((stat[i]||{})[k]||[]);drillCos((k==='*'?'All accounts':OUT_CATS.filter(function(c){return c.k===k;})[0].l)+' \u00b7 '+R[ri].l,ids);})+
    '<p class="mt-note">'+num(fmt(X.outcomeMoved.length),function(){drillCos('Accounts moved to an outcome',X.outcomeMoved);})+' accounts moved to an outcome in the selected period. Exhausted has no agreed touch rule yet (Q3), so few accounts use it.</p>',['warn','Partly'])+
  card('B6','Patch vs round-robin','Current',
    stack(R.map(function(r){return {l:r.l,sub:r.sub,v:{pod:((patch[r.i]||{}).pod||[]).length,rr:((patch[r.i]||{}).rr||[]).length}};}),[{k:'pod',l:'In an AE / pod patch',c:COL.bot},{k:'rr',l:'Round-robin',c:COL.noans}],
      function(ri,k){var i=R[ri].i,ids=k==='*'?asg[i]||[]:((patch[i]||{})[k]||[]);drillCos((k==='pod'?'In a pod patch':k==='rr'?'Round-robin':'All accounts')+' \u00b7 '+R[ri].l,ids);})+
    '<p class="mt-note">Pod Catagory filled = in a pod patch. Source stays separate from ownership.</p>')+'</div>';

  // B7 other streams
  var streams=['Partner','Marketing / event','Direct inbound'];
  var L=X.leads,cell=function(list,t){return num(fmt(list.length),function(){drillLeads(t,list);});};
  html+=card('B7','Partner, marketing / event and inbound leads',rangeLabel(),
    tbl(['Stream','Received','Assigned to an SDR','Worked','Awaiting follow-up'],streams.map(function(st){var l=L.filter(function(x){return x.str===st;}),a=l.filter(function(x){return x.s>=0;}),w=l.filter(function(x){return x.last;}),aw=a.filter(function(x){return !x.last;});
      return [e(st),cell(l,st+' leads'),cell(a,st+' leads assigned to an SDR'),cell(w,st+' leads worked'),cell(aw,st+' leads awaiting follow-up')];}),
      ['All',cell(L,'All leads'),cell(L.filter(function(x){return x.s>=0;}),'Leads assigned to an SDR'),cell(L.filter(function(x){return x.last;}),'Leads worked'),cell(L.filter(function(x){return x.s>=0&&!x.last;}),'Leads awaiting follow-up')])+
    '<p class="mt-note">Contacts created in the period with Lead Source Partner, Customer Referral, Content Partner (Partner), Event, Marketing Email (Marketing / event) or Inbound. These streams aren\u2019t routed to SDRs yet and Lead Source is often blank, so expect low numbers.</p>',['warn','Thin data']);

  /* C. Activity */
  html+='<div class="mt-h">C. Activity</div>';
  var CC=[{k:'conv',l:CALL_LBL.conv,c:COL.conv},{k:'later',l:CALL_LBL.later,c:COL.amber},{k:'notint',l:CALL_LBL.notint,c:COL.none},{k:'gate',l:CALL_LBL.gate,c:COL.other},{k:'bot',l:CALL_LBL.bot,c:COL.bot},{k:'noans',l:CALL_LBL.noans,c:COL.noans},{k:'none',l:CALL_LBL.none,c:'#B8B2AC'}];
  var cBy=bySdr(X.calls,function(r){return r[1];});
  html+='<div class="mt-two">'+card('C1','Calls made and outcomes',rangeLabel(),
    stack(R.map(function(r){var v={};(cBy[r.i]||[]).forEach(function(c){var b=callBucket(c[2]);v[b]=(v[b]||0)+1;});return {l:r.l,sub:r.sub,v:v};}),CC,
      function(ri,k){var l=cBy[R[ri].i]||[];drillCalls((k==='*'?'Calls':CALL_LBL[k])+' \u00b7 '+R[ri].l,k==='*'?l:l.filter(function(c){return callBucket(c[2])===k;}));})+
    '<p class="mt-note">Real conversation = Connected, Valuable Conversation or Meeting Booked. '+pctS(X.calls.filter(function(r){return r[2]==='none';}).length,X.calls.length)+' of calls have no outcome logged.</p>')+
  card('C1','Calls and conversations by day',rangeLabel(),dailyCalls(X))+'</div>';

  var eBy=bySdr(X.sentReal,function(r){return r[1];}),rBy=bySdr(X.replies,function(r){return r[1];}),enBy=bySdr(X.enrol,function(r){return r[1];});
  var MIX=[{k:'call',l:'Calls',c:COL.bot},{k:'seq',l:'Sequence emails',c:COL.conv},{k:'one',l:'One-off emails',c:COL.noans}];
  html+='<div class="mt-two">'+card('C2 \u00b7 C5','Outbound emails and channel mix',rangeLabel(),
    stack(R.map(function(r){var em=eBy[r.i]||[];return {l:r.l,sub:r.sub,v:{call:(cBy[r.i]||[]).length,seq:em.filter(function(x){return x[3];}).length,one:em.filter(function(x){return !x[3];}).length}};}),MIX,
      function(ri,k){var i=R[ri].i,em=eBy[i]||[];if(k==='call')drillCalls('Calls \u00b7 '+R[ri].l,cBy[i]||[]);else if(k==='seq')drillEmails('Sequence emails \u00b7 '+R[ri].l,em.filter(function(x){return x[3];}));else if(k==='one')drillEmails('One-off emails \u00b7 '+R[ri].l,em.filter(function(x){return !x[3];}));
        else drillEmails('All outbound emails \u00b7 '+R[ri].l,em);})+
    '<p class="mt-note">Sales emails sent by the SDRs. '+num(fmt(X.sent.length-X.sentReal.length),function(){drillEmails('Logged calendar invites (excluded)',X.sent.filter(function(r){return r[6];}));})+' logged calendar invites (subject starts \u201cInvitation:\u201d) are excluded.</p>')+
  card('C3','Sequences',rangeLabel(),
    tbl(['SDR','Contacts enrolled','Sequence emails sent','Replies received','Reply rate'],R.map(function(r){var en=enBy[r.i]||[],sq=(eBy[r.i]||[]).filter(function(x){return x[3];}),rp=rBy[r.i]||[];
      return [e(r.l),num(fmt(en.length),function(){drill('Contacts enrolled \u00b7 '+r.l,[{h:'Enrolled',t:'date'},{h:'SDR',t:'text'},{h:'Contact',t:'link'},{h:'Company',t:'co'},{h:'Lead Status',t:'text'}],en.map(function(x){var c=D.CON[x[2]]||[];return [x[0],sdrName(x[1]),[HS+'0-1/'+x[2],c[0]||'Contact '+x[2]],coCell(x[3]||c[2]),c[1]||''];}));}),
        num(fmt(sq.length),function(){drillEmails('Sequence emails \u00b7 '+r.l,sq);}),num(fmt(rp.length),function(){drillEmails('Replies \u00b7 '+r.l,rp,'Includes auto-replies; HubSpot can\u2019t filter them out.');}),pctS(rp.length,(eBy[r.i]||[]).length)];}))+
    '<p class="mt-note">Enrolments are credited to the contact owner (the enrolling SDR) by the latest enrolment date. Replies include auto-replies.</p>')+'</div>';
  html+=card('C4','LinkedIn touches','',
    '<p class="muted">Not tracked yet: waiting on the HeyReach vs Krono decision. Meetings that come from LinkedIn still show in E1 through the company Meeting Source.</p>',['warn','Not tracked']);

  /* D. Engagement */
  html+='<div class="mt-h">D. Engagement</div>';
  var convCo={};conv.forEach(function(r){if(r[3]&&D.CO[r[3]]&&D.CO[r[3]][2]>=0)convCo[r[3]]=1;});
  var convCos=Object.keys(convCo).filter(function(id){return S.indexOf(D.CO[id][2])>=0;});
  var engCos=X.cos.filter(function(id){var g=(D.CO[id][6]||'').toLowerCase();return /connected|valuable|meeting booked/.test(g)&&!/attempting/.test(g);});
  var repCo={};X.replies.forEach(function(r){if(r[4])repCo[r[4]]=1;});var repCos=Object.keys(repCo);
  var cvBy=bySdr(convCos,function(id){return D.CO[id][2];}),egBy=bySdr(engCos,function(id){return D.CO[id][2];}),rpcBy=bySdr(repCos,function(id){return D.CO[id]?D.CO[id][2]:-1;});
  html+='<div class="mt-two">'+card('D1 \u00b7 D3','Accounts with a meaningful response',rangeLabel(),
    tbl(['SDR','Real conversation in period','Engaged (account property)','Replied by email'],R.map(function(r){var a=cvBy[r.i]||[],b=egBy[r.i]||[],c=rpcBy[r.i]||[];
      return [e(r.l),num(fmt(a.length),function(){drillCos('Accounts with a real conversation \u00b7 '+r.l,a,'At least one call logged as Connected, Valuable Conversation or Meeting Booked in the period. Each account counted once.');}),
        num(fmt(b.length),function(){drillCos('Engaged accounts \u00b7 '+r.l,b,'Call Outcome \u2013 Account engagement is Valuable Conversation, Connected or Meeting booked. \u201cAttempting To Connect\u201d (the AI screening bot) is excluded.');}),
        num(fmt(c.length),function(){drillCos('Accounts that replied by email \u00b7 '+r.l,c,'Includes possible auto-replies.');})];}),
      R.length>1?['Team',fmt(convCos.length),fmt(engCos.length),fmt(repCos.length)]:null)+
    '<p class="mt-note">Each company counts once. Opens and the AI screening bot don\u2019t count. Email replies are shown separately because HubSpot can\u2019t filter out auto-replies.</p>')+
  card('D2','Contact-level outcomes',rangeLabel(),contactOutcomes(X,R))+'</div>';

  /* E. Meetings */
  html+='<div class="mt-h">E. Meetings</div>';
  var mbBy=bySdr(X.mb,function(id){return D.CO[id][2];});
  var past=X.firstMeet.filter(function(m){return inR(m.st)&&m.st<Date.now();});
  var MO=[{k:'Held',l:'Held',c:COL.green},{k:'No show',l:'No show',c:COL.none},{k:'Cancelled',l:'Cancelled',c:COL.other},{k:'Rescheduled',l:'Rescheduled',c:COL.amber},{k:'No outcome',l:'No outcome logged',c:'#B8B2AC'}];
  var moBy=bySdr(past,function(m){return D.CO[m.co][2];});
  html+='<div class="mt-two">'+card('E1','Meetings booked',rangeLabel(),
    stack(R.map(function(r){return {l:r.l,sub:r.sub,v:{b:(mbBy[r.i]||[]).length}};}),[{k:'b',l:'Moved to Meeting Booked',c:COL.conv}],function(ri){drillBooked(mbBy[R[ri].i]||[],R[ri].l);},{noLegend:true})+
    '<p class="mt-note">Companies moved to Meeting Booked in the period, credited to the company SDR Owner, not the booker. Same rule as the HubSpot \u201cMeetings Booked\u201d report, but it also keeps companies that have since moved on to Open Opportunity.</p>'+
    bookedTable(X))+
  card('E2','Qualified meetings held vs target',monthLbl+' to date',heldTarget(heldM,R)+'<h3 style="margin-top:18px;font-size:.85rem">First meetings held by week</h3>'+heldWeeks(S))+'</div>';
  html+='<div class="mt-two">'+card('E3','Cancellations and no-shows',rangeLabel(),
    stack(R.map(function(r){var v={};(moBy[r.i]||[]).forEach(function(m){var o=meetOut(m);v[o]=(v[o]||0)+1;});return {l:r.l,sub:r.sub,v:v};}),MO,
      function(ri,k){var l=moBy[R[ri].i]||[];drillMeet((k==='*'?'First meetings':k)+' \u00b7 '+R[ri].l,k==='*'?l:l.filter(function(m){return meetOut(m)===k;}));})+
    '<p class="mt-note">First meetings that were due in the period. A Gong recording marked completed counts as held even if the HubSpot outcome wasn\u2019t updated.</p>')+
  card('E4','Meetings with no outcome','Since '+dnice(D.R.lm[0]),noOutcome(S),['warn','Data quality'])+'</div>';

  /* F + G. Pipeline and revenue */
  html+='<div class="mt-h">F. Qualified pipeline \u00b7 G. Revenue</div>';
  var open=X.deals.filter(function(d){return !d.closed;}),created=X.deals.filter(function(d){return inR(d.cr);}),won=X.deals.filter(function(d){return d.won;});
  var stages={};open.forEach(function(d){stages[d.st]=Math.min(stages[d.st]==null?99:stages[d.st],d.so);});
  var stList=Object.keys(stages).sort(function(a,b){return stages[a]-stages[b];});
  var stCols=['#D3D0CC','#7C97B0','#203444','#E0A030','#FF4D00','#2F9E6B','#782B32','#57534F'];
  var SC=stList.map(function(s,i){return {k:s,l:s,c:stCols[i%stCols.length]};});
  var oBy=bySdr(open,function(d){return d.s;}),crBy=bySdr(created,function(d){return d.s;});
  var tot=open.reduce(function(t,d){return t+d.amt;},0),acc=open.filter(function(d){return d.acc;});
  html+='<div class="mt-kpis">'+kpiT('F1','Opportunities created',num(fmt(created.length),function(){drillDeals('Opportunities created',created);}),rangeLabel().split(' \u00b7 ')[0])+
    kpiT('F2','Open SDR pipeline',num(kfmt(tot),function(){drillDeals('Open SDR pipeline',open);}),fmt(open.length)+' open deals (Amount)')+
    kpiT('F2','AE accepted',num(fmt(acc.length),function(){drillDeals('AE-accepted opportunities',acc);}),'of '+open.length+' open \u00b7 '+(open.length-acc.length)+' not marked')+
    kpiT('F3','Missing a next step',num(fmt(open.filter(function(d){return !d.next;}).length),function(){drillDeals('Open deals with no next step',open.filter(function(d){return !d.next;}));}),'Open SDR deals')+
    kpiT('G1','Closed-won from SDR deals',num(kfmt(won.reduce(function(t,d){return t+(d.arr!=null?d.arr:d.amt);},0)),function(){drillDeals('Closed-won SDR deals',won);}),fmt(won.length)+' deals all time \u00b7 '+won.filter(function(d){return inR(d.cl);}).length+' in period')+'</div>';
  html+='<div class="mt-two">'+card('F2','Open pipeline by stage','Amount, current',
    stack(R.map(function(r){var v={};(oBy[r.i]||[]).forEach(function(d){v[d.st]=(v[d.st]||0)+d.amt;});return {l:r.l,sub:r.sub,v:v};}),SC,
      function(ri,k){var l=oBy[R[ri].i]||[];drillDeals((k==='*'?'Open deals':k)+' \u00b7 '+R[ri].l,k==='*'?l:l.filter(function(d){return d.st===k;}));},{totFmt:function(t){return kfmt(t);}})+
    '<p class="mt-note">Credited through the deal SDR Owner, which stays with the SDR after AE handover. Meeting Accepted is blank on most open deals and the ARR field is often empty (Q1), so Amount is shown.</p>',acc.length<open.length?['warn','AE acceptance missing']:null)+
  card('F1','Opportunities created by SDR',rangeLabel(),
    stack(R.map(function(r){return {l:r.l,sub:r.sub,v:{n:(crBy[r.i]||[]).length}};}),[{k:'n',l:'Deals created',c:COL.bot}],function(ri){drillDeals('Opportunities created \u00b7 '+R[ri].l,crBy[R[ri].i]||[]);},{noLegend:true})+
    '<h3 style="margin-top:16px;font-size:.85rem">F3 \u00b7 SDR opportunities: stage and next step</h3>'+
    tbl(['Deal','SDR','Stage','Amount','AE accepted','Next step'],open.slice().sort(function(a,b){return b.amt-a.amt;}).map(function(d){return [(d.co?'<button class="num" data-co="'+e(d.co)+'">'+e(d.n)+'</button>':e(d.n)),e(sdrName(d.s)),e(d.st),kfmt(d.amt),d.acc?'Yes':'<span class="muted">Not marked</span>',d.next?e(d.next):'<span class="pill bad">Missing</span>'];})))+'</div>';

  /* H. Lead follow-up */
  var touchedL=L.filter(function(l){return l.r!=null;}),med=median(touchedL.map(function(l){return l.r;}));
  html+='<div class="mt-h">H. Lead follow-up</div>'+card('H1','Lead response time',rangeLabel(),
    '<div class="mt-kpis">'+kpiT('H1','Leads received',num(fmt(L.length),function(){drillLeads('Leads received',L);}),'Partner, marketing / event, inbound')+
      kpiT('H1','Followed up',num(fmt(touchedL.length),function(){drillLeads('Leads followed up',touchedL);}),(L.length-touchedL.length)+' not touched yet')+
      kpiT('H1','Median time to first touch',med==null?'\u2013':(med<48?med.toFixed(1)+' h':(med/24).toFixed(1)+' days'),'No target set')+'</div>'+
    '<p class="mt-note">The \u201c% within the agreed timeframe\u201d measure stays parked until inbound is over about 50 leads a week.</p>',['warn','Parked']);

  /* Weekly review */
  html+='<div class="mt-h">Weekly review</div>'+card('Review','What\u2019s stuck and what needs action','Live',reviewTable(X,R));

  root.innerHTML=html;
  Array.prototype.forEach.call(root.querySelectorAll('#mtRanges button'),function(b){b.addEventListener('click',function(){
    if(b.dataset.r==='cus'){if(api.cus&&range!=='cus'&&D.R.cus){range='cus';showCus=false;}else showCus=!showCus;render();return;}
    showCus=false;range=b.dataset.r;try{localStorage.setItem('sdrMattRange',range);}catch(x){}render();});});
  var cf=document.getElementById('mtCus');if(cf){cf.addEventListener('submit',function(ev){ev.preventDefault();var f=document.getElementById('mtFrom').value,t=document.getElementById('mtTo').value;
      if(!f||!t||f>t){alert('Pick a From date on or before the To date.');return;}if(window.SDRCustom&&window.SDRCustom.set(f,t)!==false){showCus=false;range='cus';}});
    var cc=document.getElementById('mtCusClear');if(cc)cc.addEventListener('click',function(){showCus=false;range='mtd';window.SDRCustom.clear();});}
}

function drillContactsPer(ids,lbl){var X=compute();ids=ids||X.contacted.filter(function(id){return X.conBy[id];});
  drill('Contacts reached per account'+(lbl?' \u00b7 '+lbl:''),[{h:'Company',t:'co'},{h:'SDR',t:'text'},{h:'Account Status',t:'text'},{h:'Contacts reached in period',t:'num'},{h:'Who',t:'text'},{h:'Contacts in HubSpot',t:'num'}],
    ids.map(function(id){var c=D.CO[id],cs=Object.keys(X.conBy[id]||{});return [coCell(id),sdrName(c[2]),c[1],cs.length,cs.map(conName).filter(Boolean).join(', '),c[5]];}));}
function drillBooked(ids,lbl){
  drill('Meetings booked'+(lbl?' \u00b7 '+lbl:''),[{h:'Company',t:'co'},{h:'Credited SDR',t:'text'},{h:'Moved to Meeting Booked',t:'date'},{h:'Current status',t:'text'},{h:'Meeting',t:'text'},{h:'Meeting date',t:'date'},{h:'Booked by',t:'text'},{h:'Outcome',t:'text'}],
    ids.map(function(id){var c=D.CO[id],at=c[9];var ms=D.MEET.filter(function(m){return m.co===id;}).sort(function(a,b){return a.st-b.st;});var m=ms.filter(function(x){return x.st>=at-86400000;})[0]||ms[ms.length-1]||null;
      return [coCell(id),sdrName(c[2]),at,c[1],m?m.t:'No meeting logged in HubSpot',m?m.st:null,m?m.by:'\u2013',m?meetOut(m):'\u2013'];}),
    'Companies whose Account Status moved to Meeting Booked in the period, with the matching meeting if one is logged.');}
function bookedTable(X){var cal=X.firstMeet.filter(function(m){return inR(m.cr);});
  return '<p class="mt-note" style="margin-top:12px">Meetings put in the calendar in the period: '+num(fmt(cal.length),function(){drillMeet('First meetings put in the calendar',cal,'Meeting records created in the period on SDR accounts, with the credited SDR (company SDR Owner) shown separately from the booker (meeting owner).');})+
    ' ('+cal.filter(function(m){return m.ty==='Discovery Call';}).length+' typed as Discovery Call, '+cal.filter(function(m){return !m.ty;}).length+' with no type).</p>';}
var LH=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'});
function dailyCalls(X){var r=rng(),days=[],t=r[0],end=Math.min(r[1],D.today+86400000);
  while(t<end){days.push(t);t+=86400000;var h=+LH.format(new Date(t));if(h===23)t+=3600000;else if(h===1)t-=3600000;}
  var cv=days.map(function(){return 0;}),ot=days.map(function(){return 0;});
  X.calls.forEach(function(c){var j=dayOf(c[0],days);if(j<0)return;if(callBucket(c[2])==='conv')cv[j]++;else ot[j]++;});
  return cols(days.map(function(d){var x=new Date(d+3*3600000);return ['Su','Mo','Tu','We','Th','Fr','Sa'][x.getUTCDay()]+' '+x.getUTCDate();}),
    [{k:'conv',l:'Real conversations',c:COL.conv,v:cv},{k:'other',l:'Other calls',c:COL.noans,v:ot}],
    function(i){var a=days[i],b=days[i+1]||end;drillCalls('Calls on '+dnice(a+3*3600000),X.calls.filter(function(c){return c[0]>=a&&c[0]<b;}));});}
function dayOf(ts,days){for(var i=days.length-1;i>=0;i--)if(ts>=days[i])return i;return -1;}
function contactOutcomes(X,R){
  var seen={};var rows=[];X.calls.concat(X.sentReal.map(function(r){return [r[0],r[1],'',r[4],r[5]];})).forEach(function(r){var c=r[4];if(!c||seen[c+'|'+r[1]])return;seen[c+'|'+r[1]]=1;rows.push([r[1],c]);});
  var LS=[{k:'Discovery Meeting Booked',l:'Meeting booked (Discovery / NBM)',c:COL.conv},{k:'Visible Opportunity',l:'Visible Opportunity',c:COL.green},{k:'Two-Way Contact',l:'Two-way contact',c:COL.amber},{k:'Engaged',l:'Engaged',c:COL.sky},{k:'No Two-Way Contact',l:'No two-way contact',c:COL.noans},{k:'Lost',l:'Lost / not qualified / left',c:COL.none},{k:'Other',l:'New, blank or other',c:'#B8B2AC'}];
  var b=function(s){s=s||'';if(/discovery|nbm/i.test(s))return 'Discovery Meeting Booked';if(/visible/i.test(s))return 'Visible Opportunity';if(/^two-way/i.test(s))return 'Two-Way Contact';if(/^engaged/i.test(s))return 'Engaged';if(/no two-way/i.test(s))return 'No Two-Way Contact';if(/lost|not qualified|left|bounced/i.test(s))return 'Lost';return 'Other';};
  var by=bySdr(rows,function(r){return r[0];});
  return stack(R.map(function(r){var v={};(by[r.i]||[]).forEach(function(x){var k=b((D.CON[x[1]]||[])[1]);v[k]=(v[k]||0)+1;});return {l:r.l,sub:r.sub,v:v};}),LS,
    function(ri,k){var l=(by[R[ri].i]||[]).filter(function(x){return k==='*'||b((D.CON[x[1]]||[])[1])===k;});
      drill('Contacts reached'+(k==='*'?'':' \u00b7 '+LS.filter(function(c){return c.k===k;})[0].l)+' \u00b7 '+R[ri].l,[{h:'Contact',t:'link'},{h:'Job title',t:'text'},{h:'Company',t:'co'},{h:'SDR',t:'text'},{h:'Lead Status',t:'text'}],
        l.map(function(x){var c=D.CON[x[1]]||[];return [[HS+'0-1/'+x[1],c[0]||'Contact '+x[1]],c[3]||'',coCell(c[2]),sdrName(x[0]),c[1]||'Blank'];}));})+
    '<p class="mt-note">People called or emailed in the period, by their current Lead Status.</p>';}
function heldTarget(heldM,R){var by=bySdr(heldM,function(m){return D.CO[m.co][2];});var pace=8*D.dayOfMonth/D.daysInMonth;
  return stack(R.map(function(r){return {l:r.l,sub:r.sub,v:{h:(by[r.i]||[]).length}};}),[{k:'h',l:'First meetings held',c:COL.conv}],function(ri){drillMeet('First meetings held this month \u00b7 '+R[ri].l,by[R[ri].i]||[]);},
    {noLegend:true,max:9,marks:[{v:6,l:'Floor 6',f:1},{v:8,l:'Target 8'}],totFmt:function(t){return t+' / 8';}})+
    '<p class="mt-note">Target 8 a month per SDR, floor 6 (the two marks). Day '+D.dayOfMonth+' of '+D.daysInMonth+', so on pace is '+(Math.round(pace*10)/10)+'. Held = a first meeting (not a deal follow-up) marked Completed or recorded in Gong. \u201cQualified\u201d also needs AE acceptance once agreed (Q2).</p>';}
function heldWeeks(S){var mon=D.R.wk[0],weeks=[];for(var w=mon;w>=D.R.lm[0]-6*86400000;w-=7*86400000)weeks.unshift(w);
  var held=D.MEET.filter(function(m){return m.first&&D.CO[m.co]&&S.indexOf(D.CO[m.co][2])>=0&&meetOut(m)==='Held'&&m.st>=weeks[0]&&m.st<Date.now();});
  var v=weeks.map(function(w){return held.filter(function(m){return m.st>=w&&m.st<w+7*86400000;}).length;});
  return cols(weeks.map(function(w){return dnice(w+3*3600000);}),[{k:'h',l:'First meetings held (week starting)',c:COL.conv,v:v}],function(i){drillMeet('First meetings held, week of '+dnice(weeks[i]+3*3600000),held.filter(function(m){return m.st>=weeks[i]&&m.st<weeks[i]+7*86400000;}));});}
function noOutcome(S){var list=D.MEET.filter(function(m){return D.CO[m.co]&&S.indexOf(D.CO[m.co][2])>=0&&m.st<D.today&&!m.g&&(!m.out||m.out==='SCHEDULED');});
  var by=bySdr(list,function(m){return m.by||'Unknown';});var names=Object.keys(by).sort(function(a,b){return by[b].length-by[a].length;});
  return (names.length?tbl(['Meeting owner (booker)','Meetings with no outcome'],names.map(function(n){return [e(n),num(fmt(by[n].length),function(){drillMeet('Meetings with no outcome \u00b7 '+n,by[n]);})];}),['All',num(fmt(list.length),function(){drillMeet('Meetings with no outcome',list);})]):'<p class="muted">None. Every past meeting has an outcome.</p>')+
    '<p class="mt-note">Past meetings on SDR accounts still marked Scheduled or blank, including AEs\u2019 meetings. Target is 0; these make E3 undercount.</p>';}
function reviewTable(X,R){
  var stuckBefore=D.today-14*86400000;
  var stuck=X.cos.filter(function(id){var c=D.CO[id];return /in progress/i.test(c[1])&&(!c[3]||c[3]<stuckBefore);});
  var newAcc=X.cos.filter(function(id){return /^new/i.test(D.CO[id][1]);});
  var leadsAll=D.LEADS.filter(function(l){return l.s>=0&&!l.last&&(api.pod==='all'||SI().indexOf(l.s)>=0);});
  var noOut=D.MEET.filter(function(m){return D.CO[m.co]&&SI().indexOf(D.CO[m.co][2])>=0&&m.st<D.today&&!m.g&&(!m.out||m.out==='SCHEDULED');});
  var dealsMiss=X.deals.filter(function(d){return !d.closed&&(!d.next||!d.acc);});
  var rows=[
    ['Stuck accounts: In Progress, not contacted in 14+ days',function(i){return stuck.filter(function(id){return D.CO[id][2]===i;});},function(l,t){drillCos(t,l,'Patch not being worked. Move these to Exhausted, Not Interested or Nurture, or work them.');}],
    ['Accounts still at New',function(i){return newAcc.filter(function(id){return D.CO[id][2]===i;});},function(l,t){drillCos(t,l);}],
    ['Overdue follow-ups: leads assigned but not contacted',function(i){return leadsAll.filter(function(x){return x.s===i;});},function(l,t){drillLeads(t,l);}],
    ['Overdue follow-ups: past meetings with no outcome',function(i){return noOut.filter(function(m){return D.CO[m.co][2]===i;});},function(l,t){drillMeet(t,l);}],
    ['Opportunities missing a next step or AE acceptance',function(i){return dealsMiss.filter(function(d){return d.s===i;});},function(l,t){drillDeals(t,l);}]
  ];
  return '<div class="tbl mt-tbl"><table><thead><tr><th class="l">Signal</th>'+R.map(function(r){return '<th>'+e(r.l)+'</th>';}).join('')+'</tr></thead><tbody>'+
    rows.map(function(row){return '<tr><td>'+e(row[0])+'</td>'+R.map(function(r){var l=row[1](r.i);return '<td class="n">'+num(fmt(l.length),function(){row[2](l,row[0]+' \u00b7 '+r.l);})+'</td>';}).join('')+'</tr>';}).join('')+
    '</tbody></table></div><p class="mt-note">Ramp and support needs come from A1. Every list is built from data already in HubSpot; there are no manual follow-up tasks.</p>';}

/* clicks */
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-mk]');if(!b||!document.getElementById('mattRoot')||!document.getElementById('mattRoot').contains(b))return;
  ev.preventDefault();ev.stopPropagation();var p=b.dataset.mk.split('|');var fn=H[p[0]];if(fn)fn(+p[1],p[2]);});

function load(fresh){if(loading)return;loading=true;var key=cusKey();
  fetch('api/data?part=matt'+(api&&api.cus?'&from='+api.cus.from+'&to='+api.cus.to:'')+(fresh?'&t='+Date.now():'')).then(function(r){return r.json().catch(function(){return {error:'bad_response'};}).then(function(d){if(!r.ok||d.error)throw d;return d;});})
  .then(function(d){D=d;err=null;loadedKey=key;if(key)range='cus';else if(range==='cus')range='mtd';}).catch(function(x){err=(x&&(x.error==='missing_token'?'the HubSpot key isn\u2019t set':x.error))||'network error';})
  .then(function(){loading=false;if(api&&api.view==='matt')render();});}
var rb=document.getElementById('refreshBtn');if(rb)rb.addEventListener('click',function(){if(D||err)load(true);});

var lastPer=null;
window.SDRMatt=function(a){api=a;var pk=a.per+'|'+cusKey();if(lastPer!==null&&pk!==lastPer){range=a.cus?'cus':a.per;try{localStorage.setItem('sdrMattRange',range);}catch(x){}}lastPer=pk;
  if(a.view==='matt'&&D&&!loading&&cusKey()!==loadedKey){D=null;load(false);}
  if(range==='cus'&&D&&!D.R.cus)range='mtd';if(a.view!=='matt')return;if(!D&&!loading&&!err)load(false);render();};
})();
