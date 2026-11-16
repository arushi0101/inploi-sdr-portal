/* Inbound › Form submissions. Demo requests, audit unlocks and other website forms from HubSpot.
   Data: api/data?part=forms (latest form per contact, with company context) and api/data?part=formshist (history for the charts).
   Layout: header + period switch, KPI cards, an editable report (week on week / month on month, break down by any field),
   then the leads in tabs: needs an owner, assigned (by owner), internal, tests. */
(function(){
var DATA=null,ERR=null,LOADING=false,DAYS=30,TAB='un',FILTER='all',Q='',FSEL='all',MXBY='type',DRILL=null,CW=760;
var HIST=null,HERR=null,HLOADING=false,SHOWTABLE=false;
var HSB='https://app-eu1.hubspot.com/contacts/25735731/record/';
var PRESETS=[
  {id:'wow',name:'Form submissions, week on week',group:'week',range:12,by:'kind',scope:'external',form:'all',type:'bar'},
  {id:'mom',name:'Form submissions, month on month',group:'month',range:12,by:'kind',scope:'external',form:'all',type:'bar'},
  {id:'demo-sdr',name:'Demo requests by SDR, monthly',group:'month',range:6,by:'owner',scope:'external',form:'type:Demo request',type:'bar'},
  {id:'stage',name:'New business vs pipeline, weekly',group:'week',range:12,by:'stage',scope:'external',form:'all',type:'bar'},
  {id:'forms',name:'Every form, month on month',group:'month',range:6,by:'form',scope:'external',form:'all',type:'line'},
  {id:'src',name:'Internal vs external, monthly',group:'month',range:6,by:'src',scope:'all',form:'all',type:'bar'}
];
var BY=[['none','Nothing (total only)'],['kind','Form type'],['form','Form'],['stage','Customer or pipeline'],['owner','Assigned SDR or AE'],['src','Internal or external'],['mail','Work or personal email']];
var SAVED=[];try{SAVED=JSON.parse(localStorage.getItem('sdrFormReports')||'[]')||[];}catch(x){SAVED=[];}
var R=null;try{R=JSON.parse(localStorage.getItem('sdrFormReport')||'null');}catch(x){}
if(!R||!R.group)R=Object.assign({},PRESETS[0]);if(!R.form)R.form=R.kind&&R.kind!=='all'?'type:'+R.kind:'all';
SAVED.forEach(function(p){if(!p.form)p.form=p.kind&&p.kind!=='all'?'type:'+p.kind:'all';});
function saveR(){try{localStorage.setItem('sdrFormReport',JSON.stringify(R));}catch(x){}}
function saveList(){try{localStorage.setItem('sdrFormReports',JSON.stringify(SAVED));}catch(x){}}

function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function nice(ms){if(!ms)return '–';return new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'});}
function ago(ms){if(!ms)return '';var n=Math.floor((Date.now()-ms)/86400000);return n<=0?'today':n===1?'yesterday':n+' days ago';}

document.head.insertAdjacentHTML('beforeend','<style>'+
 ':root{--fm-s1:#2a78d6;--fm-s2:#eb6834;--fm-s3:#1baf7a;--fm-s4:#eda100;--fm-s5:#e87ba4;--fm-s6:#008300;--fm-s7:#6250d6;--fm-s8:#e34948;--fm-other:#a8a6a0;--fm-grid:#e1e0d9;--fm-axis:#c3c2b7;--fm-shadow:0 1px 2px rgba(20,18,16,.04),0 6px 18px rgba(20,18,16,.05);--fm-up:#006300;--fm-down:#a32900}'+
 '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fm-s1:#3987e5;--fm-s2:#d95926;--fm-s3:#199e70;--fm-s4:#c98500;--fm-s5:#d55181;--fm-s6:#0ca30c;--fm-s7:#9085e9;--fm-s8:#e66767;--fm-other:#6b6964;--fm-grid:#2c2c2a;--fm-axis:#383835;--fm-shadow:0 1px 2px rgba(0,0,0,.3);--fm-up:#0ca30c;--fm-down:#ffb089}}'+
 ':root[data-theme="dark"]{--fm-s1:#3987e5;--fm-s2:#d95926;--fm-s3:#199e70;--fm-s4:#c98500;--fm-s5:#d55181;--fm-s6:#0ca30c;--fm-s7:#9085e9;--fm-s8:#e66767;--fm-other:#6b6964;--fm-grid:#2c2c2a;--fm-axis:#383835;--fm-shadow:0 1px 2px rgba(0,0,0,.3);--fm-up:#0ca30c;--fm-down:#ffb089}'+
 '#formsView{display:grid;gap:18px;animation:fmIn .25s ease}@keyframes fmIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'+
 '.fm-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--fm-shadow);padding:18px 20px;min-width:0}'+
 '.fm-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}'+
 '.fm-head p{margin:0;color:var(--muted);font-size:.86rem;max-width:70ch}'+
 '.fm-seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}'+
 '.fm-seg button{border:0;background:none;color:var(--muted);padding:6px 12px;border-radius:7px;font-size:.82rem;font-weight:500;cursor:pointer;transition:background .15s,color .15s}'+
 '.fm-seg button:hover{color:var(--fg)}.fm-seg button[aria-pressed=true]{background:var(--surface);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.08)}'+
 '.fm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}'+
 '.fm-kpi{display:grid;gap:4px;padding:16px 18px}.fm-kpi .l{font-size:.78rem;color:var(--muted);font-weight:500}'+
 '.fm-kpi .n{font-family:var(--f-display);font-size:1.9rem;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}'+
 '.fm-kpi .s{font-size:.78rem;color:var(--muted)}.fm-kpi.hot{border-color:var(--accent)}.fm-kpi.hot .n{color:var(--link)}'+
 '.fm-d{font-size:.76rem;font-weight:600;padding:1px 7px;border-radius:99px;background:var(--bg);margin-left:6px;vertical-align:middle}.fm-d.up{color:var(--fm-up)}.fm-d.down{color:var(--fm-down)}'+
 '.fm-rtop{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}'+
 '.fm-rtop h3{margin:0;font-size:1.05rem;font-family:var(--f-display)}'+
 '.fm-ctrls{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-end;padding:12px;background:var(--bg);border:1px solid var(--line);border-radius:10px;margin-bottom:14px}'+
 '.fm-f{display:grid;gap:4px;font-size:.7rem;color:var(--muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase}'+
 '.fm-f select{font:inherit;font-size:.84rem;text-transform:none;letter-spacing:0;font-weight:400;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:6px 8px;min-width:0;max-width:240px;cursor:pointer}'+
 '.fm-btn{font:inherit;font-size:.82rem;font-weight:500;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:8px;padding:6px 12px;cursor:pointer;transition:border-color .15s,background .15s}'+
 '.fm-btn:hover{border-color:var(--muted)}.fm-btn.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}.fm-btn.pri:hover{filter:brightness(1.05)}'+
 '.fm-sum{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:.86rem;color:var(--muted);margin-bottom:10px}.fm-sum b{color:var(--fg);font-variant-numeric:tabular-nums}'+
 '.fm-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.8rem;color:var(--muted);margin-bottom:6px}.fm-leg span{display:inline-flex;align-items:center;gap:6px}.fm-leg i{width:10px;height:10px;border-radius:3px;display:inline-block}.fm-leg b{color:var(--fg);font-weight:600}'+
 '.fm-chart{position:relative}.fm-chart svg{display:block;width:100%;height:auto;overflow:visible}'+
 '.fm-chart text{font-family:var(--f-body);font-size:11px;fill:var(--muted)}.fm-chart .tot{fill:var(--fg);font-weight:600}'+
 '.fm-tip{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:10px 12px;font-size:.8rem;min-width:170px;z-index:5;opacity:0;transition:opacity .12s}'+
 '.fm-tip b{display:block;margin-bottom:4px}.fm-tip div{display:flex;justify-content:space-between;gap:14px}.fm-tip i{width:8px;height:8px;border-radius:2px;display:inline-block;margin-right:6px}'+
 '.fm-note{font-size:.76rem;color:var(--muted);margin:10px 0 0}'+
 '.fm-tabs{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line);margin:-4px -20px 14px;padding:0 20px}'+
 '.fm-tabs nav{display:flex;gap:4px;overflow-x:auto}.fm-tabs nav button{border:0;background:none;color:var(--muted);padding:12px 10px;font-size:.88rem;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}'+
 '.fm-tabs nav button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent)}.fm-tabs nav button .c{font-size:.72rem;background:var(--bg);border:1px solid var(--line);border-radius:99px;padding:0 7px;margin-left:6px}'+
 '.fm-search{font:inherit;font-size:.84rem;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:8px;padding:6px 10px;width:220px;max-width:100%;margin:8px 0}'+
 '.fm-tw{overflow-x:auto;border:1px solid var(--line);border-radius:10px}'+
 '.fm-t{width:100%;border-collapse:collapse;font-size:.84rem}.fm-t th{text-align:left;font-size:.72rem;color:var(--muted);font-weight:600;padding:9px 12px;background:var(--bg);border-bottom:1px solid var(--line);white-space:nowrap}'+
 '.fm-t td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}.fm-t tbody tr{transition:background .12s}.fm-t tbody tr:hover{background:var(--bg)}.fm-t tr:last-child td{border-bottom:0}'+
 '.fm-t td.n,.fm-t th.n{text-align:right;font-variant-numeric:tabular-nums}'+
 '.fm-sub{display:block;color:var(--muted);font-size:.76rem}'+
 '.fm-pill{display:inline-block;font-size:.72rem;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap;background:var(--bg);border:1px solid var(--line);color:var(--fg)}'+
 '.fm-p-demo{background:var(--accent-soft);border-color:transparent;color:var(--link)}.fm-p-new{background:var(--ok-bg);border-color:transparent;color:var(--ok-fg)}.fm-p-pipe{background:var(--accent-soft);border-color:transparent;color:var(--link)}'+
 '.fm-p-cust{background:var(--bad-bg);border-color:transparent;color:var(--bad-fg)}.fm-p-warn{background:var(--warn-bg);border-color:transparent;color:var(--warn-fg)}.fm-p-spam{color:var(--muted)}'+
 '.fm-grp td{background:var(--bg);font-weight:600;font-size:.76rem;color:var(--muted);padding:7px 12px}'+
 '.fm-kpi{text-align:left;font:inherit;color:inherit;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s}.fm-kpi:hover{transform:translateY(-2px);border-color:var(--muted);box-shadow:0 8px 22px rgba(20,18,16,.08)}.fm-go{font-size:.74rem;color:var(--link);opacity:0;transition:opacity .15s}.fm-kpi:hover .fm-go,.fm-kpi:focus-visible .fm-go{opacity:1}'+
 '.fm-num{border:0;background:none;font:inherit;color:var(--link);cursor:pointer;padding:2px 6px;border-radius:6px;font-variant-numeric:tabular-nums}.fm-num:hover{background:var(--accent-soft)}'+
 '.fm-sel{font:inherit;font-size:.84rem;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:7px 10px;max-width:260px;cursor:pointer}'+
 '.fm-dr{position:fixed;inset:0;z-index:60;background:rgba(19,18,17,.38);display:flex;justify-content:flex-end;animation:fmFade .15s ease}@keyframes fmFade{from{opacity:0}}'+
 '.fm-dr-p{background:var(--bg);width:min(720px,100%);height:100%;overflow-y:auto;box-shadow:-12px 0 32px rgba(0,0,0,.18);animation:fmSlide .2s ease}@keyframes fmSlide{from{transform:translateX(24px)}}'+
 '.fm-dr-p header{position:sticky;top:0;background:var(--surface);border-bottom:1px solid var(--line);padding:16px 20px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;z-index:1}.fm-dr-p h3{margin:0 0 2px;font-family:var(--f-display)}.fm-dr-p header span{font-size:.8rem;color:var(--muted)}'+
 '.fm-dr-b{padding:16px 20px 40px;display:grid;gap:10px}.fm-li{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;gap:6px}.fm-li-h{display:flex;justify-content:space-between;gap:10px}.fm-li-m{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.8rem;color:var(--muted);align-items:center}.fm-li-m .fm-sub{display:inline;margin-left:6px}'+
 '.fm-skel{height:14px;border-radius:6px;background:linear-gradient(90deg,var(--bg),var(--line),var(--bg));background-size:200% 100%;animation:fmSk 1.2s infinite}@keyframes fmSk{to{background-position:-200% 0}}'+
 '@media (max-width:620px){.fm-card{padding:14px}.fm-tabs{margin:-4px -14px 12px;padding:0 14px}}'+
 '</style>');

function slot(){var el=document.getElementById('formsView');if(el)return el;var any=document.querySelector('.view');if(!any)return null;
  el=document.createElement('section');el.className='view';el.dataset.view='forms';el.id='formsView';el.hidden=true;any.parentNode.appendChild(el);return el;}
function load(){if(LOADING)return;LOADING=true;ERR=null;
  fetch('api/data?part=forms&days='+DAYS).then(function(r){return r.json();}).then(function(d){if(d&&d.external)DATA=d;else ERR=(d&&(d.message||d.error))||'no data';})
  .catch(function(x){ERR=String(x&&x.message||x);}).then(function(){LOADING=false;draw();});}
function loadHist(){if(HLOADING||HIST)return;HLOADING=true;
  fetch('api/data?part=formshist&months=13').then(function(r){return r.json();}).then(function(d){if(d&&d.rows)HIST=d;else HERR=(d&&(d.message||d.error))||'no data';})
  .catch(function(x){HERR=String(x&&x.message||x);}).then(function(){HLOADING=false;draw();});}

/* ---------- report: bucket the history rows ---------- */
var LISO=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
function dayIso(ms){return LISO.format(new Date(ms));}
function weekKey(ms){var d=new Date(dayIso(ms)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
function monthKey(ms){return dayIso(ms).slice(0,7);}
function periods(){var out=[],now=Date.now();
  if(R.group==='week'){var k=weekKey(now);for(var i=R.range-1;i>=0;i--){var d=new Date(k+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-7*i);out.push(d.toISOString().slice(0,10));}}
  else{var m=monthKey(now).split('-').map(Number);for(var j=R.range-1;j>=0;j--){var y=m[0],mm=m[1]-j;while(mm<1){mm+=12;y--;}out.push(y+'-'+(mm<10?'0':'')+mm);}}
  return out;}
function plabel(k,short){if(R.group==='week'){var d=new Date(k+'T12:00:00Z');return (short?'':'w/c ')+d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});}
  var p=k.split('-');return new Date(Date.UTC(+p[0],+p[1]-1,1)).toLocaleDateString('en-GB',{month:'short',year:short?'2-digit':'numeric',timeZone:'UTC'});}
function inScope(r){if(R.scope==='external'&&r.src!=='External')return false;if(R.scope==='nointernal'&&r.src==='Test')return false;if(R.scope==='all'&&r.src==='Test')return false;
  return formOk(R.form,r.kind,r.form);}
function formOk(f,kind,label){if(!f||f==='all')return true;if(f.indexOf('type:')===0)return kind===f.slice(5);return label===f.slice(5);}
function leadKind(r){return r.form==='demo'?'Demo request':r.formLabel==='Audit unlock'?'Audit unlock':'Other';}
function leadOk(r){return formOk(FSEL,leadKind(r),r.formLabel);}
function formOptions(){var L={};(HIST?HIST.rows:[]).forEach(function(r){L[r.form]=1;});if(DATA)DATA.external.concat(DATA.internal).forEach(function(r){L[r.formLabel]=1;});
  return [['all','All forms'],['type:Demo request','All demo requests'],['type:Audit unlock','All audit unlocks'],['type:Other','All other forms']].concat(Object.keys(L).sort().map(function(k){return ['form:'+k,'Form: '+k];}));}
var ORDER={kind:['Demo request','Audit unlock','Other'],stage:['New business','In pipeline','Existing customer','No company'],owner:['James','Matthew','Nikita','Evan','Jason (AE)','Felix (AE)','No SDR or AE'],src:['External','Internal','Test'],mail:['Work email','Personal email','Unknown']};
function seriesKeys(rows){if(R.by==='none')return ['Submissions'];
  if(ORDER[R.by])return ORDER[R.by].filter(function(k){return rows.some(function(r){return r[R.by]===k;});});
  // 'form': fixed order by all-time volume across the whole history, so a filter never repaints a form
  var c={};(HIST?HIST.rows:[]).forEach(function(r){c[r.form]=(c[r.form]||0)+1;});
  var all=Object.keys(c).sort(function(a,b){return c[b]-c[a]||a.localeCompare(b);});
  var used=all.filter(function(k){return rows.some(function(r){return r.form===k;});});
  return used.length>8?used.slice(0,7).concat(['Other forms']):used;}
function colorOf(key,keys){if(key==='Other forms')return 'var(--fm-other)';if(R.by==='none')return 'var(--fm-s1)';
  var base=ORDER[R.by]||(function(){var c={};(HIST?HIST.rows:[]).forEach(function(r){c[r.form]=(c[r.form]||0)+1;});return Object.keys(c).sort(function(a,b){return c[b]-c[a]||a.localeCompare(b);});})();
  var i=base.indexOf(key);return i>=0&&i<8?'var(--fm-s'+(i+1)+')':'var(--fm-other)';}
function compute(){var P=periods(),gk=R.group==='week'?weekKey:monthKey,rows=(HIST?HIST.rows:[]).filter(inScope).filter(function(r){return P.indexOf(gk(r.t))>=0;});
  var keys=seriesKeys(rows),top=keys.filter(function(k){return k!=='Other forms';});
  var M={};P.forEach(function(p){M[p]={};keys.forEach(function(k){M[p][k]=0;});});
  rows.forEach(function(r){var p=gk(r.t),k=R.by==='none'?'Submissions':R.by==='form'&&top.indexOf(r.form)<0?'Other forms':r[R.by];if(M[p]&&M[p][k]!=null)M[p][k]++;});
  return {P:P,keys:keys,M:M,tot:P.map(function(p){return keys.reduce(function(t,k){return t+M[p][k];},0);})};}

function chartSVG(C){var W=Math.max(320,CW),H=250,L=34,Rr=10,T=18,B=28,iw=W-L-Rr,ih=H-T-B,n=C.P.length;
  var max=Math.max(1,Math.max.apply(null,C.tot.concat(R.type==='line'?[].concat.apply([],C.keys.map(function(k){return C.P.map(function(p){return C.M[p][k];});})):[])));
  var step=max<=5?1:max<=10?2:max<=25?5:max<=50?10:Math.ceil(max/50)*10,top=Math.ceil(max/step)*step;
  var y=function(v){return T+ih-(v/top)*ih;},bw=iw/n,barW=Math.min(34,bw*0.62);
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+e(curName())+'">';
  for(var g=0;g<=top;g+=step){s+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var('+(g===0?'--fm-axis':'--fm-grid')+')" stroke-width="1"/><text x="'+(L-8)+'" y="'+(y(g)+4)+'" text-anchor="end">'+g+'</text>';}
  var every=n>14?Math.ceil(n/12):1;
  C.P.forEach(function(p,i){var cx=L+bw*i+bw/2;if(i%every===0||i===n-1)s+='<text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+e(plabel(p,true))+'</text>';});
  if(R.type==='line'){
    C.keys.forEach(function(k){var pts=C.P.map(function(p,i){return [L+bw*i+bw/2,y(C.M[p][k])];});
      s+='<polyline fill="none" stroke="'+colorOf(k)+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="'+pts.map(function(q){return q.join(',');}).join(' ')+'"/>';
      pts.forEach(function(q){s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="4" fill="'+colorOf(k)+'" stroke="var(--surface)" stroke-width="2"/>';});});
  } else {
    C.P.forEach(function(p,i){var x=L+bw*i+(bw-barW)/2,acc=0,segs=C.keys.filter(function(k){return C.M[p][k]>0;});
      segs.forEach(function(k,j){var v=C.M[p][k],y0=y(acc),y1=y(acc+v),h=Math.max(0,y0-y1-(j>0?2:0)),yy=y1;acc+=v;
        if(j===segs.length-1){var r=Math.min(4,h,barW/2);s+='<path d="M'+x+','+(yy+h)+'V'+(yy+r)+'Q'+x+','+yy+' '+(x+r)+','+yy+'H'+(x+barW-r)+'Q'+(x+barW)+','+yy+' '+(x+barW)+','+(yy+r)+'V'+(yy+h)+'Z" fill="'+colorOf(k)+'"/>';}
        else s+='<rect x="'+x+'" y="'+yy+'" width="'+barW+'" height="'+h+'" fill="'+colorOf(k)+'"/>';});
      if(C.tot[i]&&(n<=13||i===n-1))s+='<text class="tot" x="'+(x+barW/2)+'" y="'+(y(C.tot[i])-6)+'" text-anchor="middle">'+C.tot[i]+'</text>';});
  }
  C.P.forEach(function(p,i){s+='<rect class="fm-hit" style="cursor:pointer" data-i="'+i+'" x="'+(L+bw*i)+'" y="'+T+'" width="'+bw+'" height="'+ih+'" fill="transparent"/>';});
  return s+'<line class="fm-cross" pointer-events="none" x1="0" x2="0" y1="'+T+'" y2="'+(T+ih)+'" stroke="var(--fm-axis)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/></svg>';}
function curName(){var all=PRESETS.concat(SAVED);for(var i=0;i<all.length;i++){var p=all[i];if(['group','range','by','scope','form','type'].every(function(k){return p[k]===R[k];}))return p.name;}return 'Custom report';}
function delta(a,b){if(b==null)return '';var d=a-b;if(!d)return '<span class="fm-d">same as before</span>';return '<span class="fm-d '+(d>0?'up':'down')+'">'+(d>0?'▲ ':'▼ ')+Math.abs(d)+'</span>';}

function reportHTML(){
  var all=PRESETS.concat(SAVED),cur=curName(),isSaved=SAVED.some(function(p){return p.name===cur;});
  var o='<div class="fm-card"><div class="fm-rtop"><h3>Reports</h3><div style="display:flex;gap:8px;flex-wrap:wrap">'+
    '<button type="button" class="fm-btn" data-fm="table">'+(SHOWTABLE?'Hide table':'Show table')+'</button>'+
    (isSaved?'<button type="button" class="fm-btn" data-fm="del">Delete report</button>':'')+
    '<button type="button" class="fm-btn pri" data-fm="save">Save as report</button></div></div>';
  o+='<div class="fm-ctrls">'+
    sel('preset','Report',all.map(function(p,i){return [String(i),p.name];}).concat(cur==='Custom report'?[['custom','Custom report']]:[]),String(all.map(function(p){return p.name;}).indexOf(cur)>=0?all.map(function(p){return p.name;}).indexOf(cur):'custom'))+
    sel('group','Compare',[['week','Week on week'],['month','Month on month']],R.group)+
    sel('range','Range',R.group==='week'?[['8','Last 8 weeks'],['12','Last 12 weeks'],['26','Last 26 weeks']]:[['3','Last 3 months'],['6','Last 6 months'],['12','Last 12 months']],String(R.range))+
    sel('by','Break down by',BY,R.by)+
    sel('form','Which form',formOptions(),R.form)+
    sel('scope','Include',[['external','Prospects only'],['all','Prospects + internal'],['tests','Everything, incl. tests']],R.scope)+
    sel('type','Chart',[['bar','Stacked bars'],['line','Lines']],R.type)+'</div>';
  if(!HIST)return o+(HERR?'<p class="muted">Couldn’t load the history ('+e(HERR)+').</p>':'<div class="fm-skel" style="height:220px"></div>')+'</div>';
  var C=compute(),n=C.P.length,last=C.tot[n-1],prev=C.tot[n-2],sum=C.tot.reduce(function(a,b){return a+b;},0),unit=R.group==='week'?'week':'month';
  o+='<div class="fm-sum"><span>This '+unit+' so far: <b>'+last+'</b>'+delta(last,prev)+'</span><span>Last '+unit+': <b>'+(prev==null?'–':prev)+'</b></span><span>Average per '+unit+': <b>'+(Math.round(sum/n*10)/10)+'</b></span><span>Total in range: <b>'+sum+'</b></span></div>';
  if(C.keys.length>1)o+='<div class="fm-leg">'+C.keys.map(function(k){var t=C.P.reduce(function(a,p){return a+C.M[p][k];},0);return '<span><i style="background:'+colorOf(k)+'"></i>'+e(k)+' <b>'+t+'</b></span>';}).join('')+'</div>';
  o+='<div class="fm-chart">'+chartSVG(C)+'<div class="fm-tip" role="status"></div></div>';
  if(SHOWTABLE){var rows=C.P.map(function(p,i){return i;}).reverse();
    o+='<div class="fm-tw" style="margin-top:12px"><table class="fm-t"><thead><tr><th>'+(R.group==='week'?'Week':'Month')+'</th>'+C.keys.map(function(k){return '<th class="n">'+e(k)+'</th>';}).join('')+'<th class="n">Total</th><th class="n">Change</th></tr></thead><tbody>'+
      rows.map(function(i){var p=C.P[i],d=i>0?C.tot[i]-C.tot[i-1]:null;return '<tr><td>'+e(plabel(p))+'</td>'+C.keys.map(function(k){return '<td class="n">'+C.M[p][k]+'</td>';}).join('')+'<td class="n"><b>'+C.tot[i]+'</b></td><td class="n">'+(d==null?'–':d>0?'+'+d:d)+'</td></tr>';}).join('')+'</tbody></table></div>';}
  o+='<p class="fm-note">'+(HIST.source==='contacts'?'Counted from each contact’s first and latest form in HubSpot, so a repeat submission in between isn’t counted. Weeks start on Monday, UK time.':'Every submission of every HubSpot form. Weeks start on Monday, UK time.')+' Your report settings are remembered on this device.</p>';
  return o+'</div>';
}
function sel(k,label,opts,v){return '<label class="fm-f">'+label+'<select data-r="'+k+'">'+opts.map(function(x){return '<option value="'+e(x[0])+'"'+(String(x[0])===String(v)?' selected':'')+'>'+e(x[1])+'</option>';}).join('')+'</select></label>';}

/* ---------- leads ---------- */
function pill(r){return '<span class="fm-pill'+(r.form==='demo'?' fm-p-demo':'')+'">'+e(r.formLabel)+'</span>'+(r.site?'<span class="fm-sub">'+e(r.site)+'</span>':'');}
function who(r){return '<a href="'+HSB+'0-1/'+e(r.id)+'" target="_blank" rel="noopener"><b>'+e(r.name)+'</b></a>'+(r.title?'<span class="fm-sub">'+e(r.title)+'</span>':'');}
function cname(r){var c=r.co;return c?'<a href="'+HSB+'0-2/'+e(c.id)+'" target="_blank" rel="noopener">'+e(c.name)+'</a>':e(r.company);}
function ctx(r){var c=r.co||{};var t=r.bucket==='customer'?'<span class="fm-pill fm-p-cust">Existing customer</span>':r.bucket==='pipeline'?'<span class="fm-pill fm-p-pipe">In the pipeline</span>':'<span class="fm-pill fm-p-new">New business</span>';
  var D=c.openDeals||[];return t+'<span class="fm-sub">Account Status: '+e(c.accountStatus||'empty')+'</span>'+(D.length?'<span class="fm-sub">Open deal: '+D.map(function(d){return e(d.stage)+' ('+e(d.owner)+')';}).join(', ')+'</span>':'');}
function own(r){var c=r.co||{};return '<b>'+e(c.sdr||r.owner||'None')+'</b><span class="fm-sub">Company owner: '+e(c.owner||'none')+'</span><span class="fm-sub">Working on it: '+e(r.working||'nobody yet')+'</span>';}
function touch(r){if(!r.touch)return '<span class="muted">None logged</span>';return e(nice(r.touch))+'<span class="fm-sub">'+ago(r.touch)+'</span>';}
function match(r){if(!Q)return true;return JSON.stringify([r.name,r.company,r.title,r.owner,r.formLabel,r.co&&r.co.name,r.co&&r.co.sdr]).toLowerCase().indexOf(Q)>=0;}
function table(head,body,cols){return '<div class="fm-tw"><table class="fm-t"><thead><tr>'+head.map(function(h){return '<th'+(h[1]?' class="'+h[1]+'"':'')+'>'+h[0]+'</th>';}).join('')+'</tr></thead><tbody>'+(body||'<tr><td colspan="'+cols+'" class="muted">Nothing here.</td></tr>')+'</tbody></table></div>';}
function leadsHTML(){
  var D=view(),ext=D.external,un=ext.filter(function(r){return !r.assigned;}),as=ext.filter(function(r){return r.assigned;});
  var tabs=[['un','Needs an owner',un.length],['as','Assigned',as.length],['in','Internal',D.internal.length],['te','Tests',D.tests.length]];
  var o='<div class="fm-card"><div class="fm-tabs"><nav role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(TAB===t[0])+'">'+t[1]+'<span class="c">'+t[2]+'</span></button>';}).join('')+'</nav>'+
    '<input type="search" class="fm-search" placeholder="Search name, company, owner…" aria-label="Search leads" value="'+e(Q)+'"></div>';
  if(TAB==='un'){
    o+='<div class="fm-seg" role="group" aria-label="Filter" style="margin-bottom:12px">'+[['all','All'],['real','Real leads'],['spam','Likely spam']].map(function(f){return '<button type="button" data-ffil="'+f[0]+'" aria-pressed="'+(FILTER===f[0])+'">'+f[1]+'</button>';}).join('')+'</div>';
    var L=un.filter(function(r){return (FILTER==='all'||(FILTER==='spam'?r.spam:!r.spam))&&match(r);});
    o+=table([['Submitted'],['Form'],['Company'],['Contact'],['Customer or pipeline'],['Current owner'],['Last touch'],['Next step']],
      L.map(function(r){return '<tr><td>'+e(nice(r.at))+'</td><td>'+pill(r)+'</td><td>'+cname(r)+'</td><td>'+who(r)+'</td><td>'+ctx(r)+'</td><td>'+e(r.owner)+'</td><td>'+touch(r)+'</td><td>'+
        (r.spam?'<span class="fm-pill fm-p-spam">Likely spam</span>':r.bucket==='new'?'<span class="fm-pill fm-p-warn">Assign an SDR</span>':'<span class="fm-pill">Check with the account owner</span>')+(r.note?'<span class="fm-sub">'+e(r.note)+'</span>':'')+'</td></tr>';}).join(''),8);
  } else if(TAB==='as'){
    var order=D.order.slice();as.forEach(function(r){if(order.indexOf(r.owner)<0)order.push(r.owner);});
    o+=table([['Submitted'],['Form'],['Company'],['Contact'],['Customer or pipeline'],['SDR and owners'],['Last touch']],
      order.map(function(w){var G=as.filter(function(r){return r.owner===w&&match(r);});if(!G.length)return '';
        return '<tr class="fm-grp"><td colspan="7">'+e(w)+' · '+G.length+'</td></tr>'+G.map(function(r){return '<tr><td>'+e(nice(r.at))+'</td><td>'+pill(r)+'</td><td>'+cname(r)+'</td><td>'+who(r)+(r.note?'<span class="fm-sub">'+e(r.note)+'</span>':'')+'</td><td>'+ctx(r)+'</td><td>'+own(r)+'</td><td>'+touch(r)+'</td></tr>';}).join('');}).join(''),7);
  } else if(TAB==='in'){
    o+='<p class="fm-note" style="margin:0 0 10px">The inploi team running the audit or testing forms. Not leads, no action needed.</p>';
    o+=table([['Latest'],['Form'],['Person'],['Forms in total','n'],['Latest site checked']],
      D.internal.filter(match).map(function(r){return '<tr><td>'+e(nice(r.at))+'</td><td><span class="fm-pill">'+e(r.formLabel)+'</span></td><td>'+e(r.name)+'</td><td class="n">'+r.runs+'</td><td class="muted">'+e(r.site||'–')+'</td></tr>';}).join(''),5);
  } else {
    o+='<p class="fm-note" style="margin:0 0 10px">Left out of every count on this page.</p>';
    o+=table([['Date'],['Form'],['Contact'],['Why left out']],D.tests.filter(match).map(function(r){return '<tr><td>'+e(nice(r.at))+'</td><td><span class="fm-pill">'+e(r.formLabel)+'</span></td><td>'+e(r.name)+'</td><td class="muted">'+e(r.why)+'</td></tr>';}).join(''),4);
  }
  return o+'<p class="fm-note">Each person appears once, under their latest form. Click a name or company to open it in HubSpot.</p></div>';
}

function view(){var D=DATA;return {order:D.order,generatedAt:D.generatedAt,external:D.external.filter(leadOk),internal:D.internal.filter(leadOk),tests:D.tests.filter(leadOk)};}
function kpis(){var D=view(),ext=D.external,un=ext.filter(function(r){return !r.assigned;}),real=un.filter(function(r){return !r.spam;});
  var hr=HIST?HIST.rows.filter(function(r){return r.src==='External'&&formOk(FSEL,r.kind,r.form);}):null,now=Date.now(),a=now-DAYS*86400000,b=a-DAYS*86400000;
  var prev=hr?hr.filter(function(r){return r.t>=b&&r.t<a;}).length:null,cur=hr?hr.filter(function(r){return r.t>=a;}).length:null;
  var c=function(x){return ext.filter(function(r){return !r.spam&&r.bucket===x;}).length;};
  return '<div class="fm-kpis">'+
    k('ext','Prospect submissions',ext.length,(cur!=null&&prev!=null?delta(cur,prev)+' vs previous '+DAYS+' days':cntForms(ext)),'')+
    k('as','Assigned',ext.length-un.length,'Owned by an active SDR or AE','')+
    k('un','Needs an owner',un.length,real.length+' real lead'+(real.length===1?'':'s')+', '+(un.length-real.length)+' likely spam',real.length?'hot':'')+
    k('new','New business',c('new'),c('pipeline')+' in the pipeline, '+c('customer')+' existing customer'+(c('customer')===1?'':'s'),'')+
    k('in','Internal',D.internal.length,'inploi team, no action','')+'</div>';}
function k(id,l,n,s,c){return '<button type="button" class="fm-card fm-kpi '+c+'" data-drill="k|'+id+'" title="See the list"><span class="l">'+l+'</span><span class="n">'+n+'</span><span class="s">'+s+'</span><span class="fm-go">View list →</span></button>';}
/* by-form table: rows = who owns it, columns = form type or each form; every number opens its list */
function mxCols(){var D=view(),all=D.external.concat(D.internal);
  if(MXBY==='type')return ['Demo request','Audit unlock','Other'].map(function(t){return {k:'type:'+t,l:t==='Other'?'Other forms':t+'s'};});
  var L={};all.forEach(function(r){L[r.formLabel]=(L[r.formLabel]||0)+1;});return Object.keys(L).sort(function(a,b){return L[b]-L[a];}).map(function(f){return {k:'form:'+f,l:f};});}
function mxRows(){var D=view();return [['as','Assigned',D.external.filter(function(r){return r.assigned;})],['un','Needs an owner',D.external.filter(function(r){return !r.assigned;})],['ext','All prospects',D.external],['in','Internal',D.internal]];}
function inCol(r,c){return formOk(c,leadKind(r),r.formLabel);}
function matrixHTML(){var C=mxCols(),Rw=mxRows();
  var o='<div class="fm-card"><div class="fm-rtop"><h3>By form</h3><div class="fm-seg" role="group" aria-label="Columns">'+[['type','Form type'],['each','Each form']].map(function(x){return '<button type="button" data-mx="'+x[0]+'" aria-pressed="'+(MXBY===x[0])+'">'+x[1]+'</button>';}).join('')+'</div></div>';
  o+='<div class="fm-tw"><table class="fm-t"><thead><tr><th></th>'+C.map(function(c){return '<th class="n">'+e(c.l)+'</th>';}).join('')+'<th class="n">Total</th></tr></thead><tbody>'+
    Rw.map(function(r){var b=r[0]==='ext'?'<b>':'',be=r[0]==='ext'?'</b>':'';return '<tr><td>'+b+e(r[1])+be+'</td>'+C.map(function(c,ci){var n=r[2].filter(function(x){return inCol(x,c.k);}).length;
      return '<td class="n">'+(n?'<button type="button" class="fm-num" data-drill="m|'+r[0]+'|'+ci+'">'+b+n+be+'</button>':'<span class="muted">0</span>')+'</td>';}).join('')+
      '<td class="n">'+(r[2].length?'<button type="button" class="fm-num" data-drill="m|'+r[0]+'|t"><b>'+r[2].length+'</b></button>':'<span class="muted">0</span>')+'</td></tr>';}).join('')+'</tbody></table></div>';
  return o+'<p class="fm-note">Click any number to see the leads behind it.</p></div>';}
/* drawer: the list behind a clicked number */
function openDrill(key){var p=key.split('|'),D=view(),L=[],t='';
  if(p[0]==='k'){var ext=D.external;
    if(p[1]==='ext'){L=ext;t='Prospect submissions';}if(p[1]==='as'){L=ext.filter(function(r){return r.assigned;});t='Assigned';}
    if(p[1]==='un'){L=ext.filter(function(r){return !r.assigned;});t='Needs an owner';}if(p[1]==='new'){L=ext.filter(function(r){return !r.spam&&r.bucket==='new';});t='New business';}
    if(p[1]==='in'){L=D.internal;t='Internal submissions';}
    DRILL={t:t,sub:'Last '+DAYS+' days'+(FSEL!=='all'?' · '+fname(FSEL):''),leads:L};}
  if(p[0]==='m'){var row=mxRows().filter(function(r){return r[0]===p[1];})[0],C=mxCols();L=row[2];if(p[2]!=='t'){var c=C[Number(p[2])];L=L.filter(function(x){return inCol(x,c.k);});t=row[1]+' · '+c.l;}else t=row[1]+' · all forms';
    DRILL={t:t,sub:'Last '+DAYS+' days',leads:L};}
  if(p[0]==='c'){var Cc=compute(),per=Cc.P[Number(p[1])],gk=R.group==='week'?weekKey:monthKey;
    var H=HIST.rows.filter(inScope).filter(function(r){return gk(r.t)===per;});DRILL={t:plabel(per),sub:curName()+' · '+H.length+' submission'+(H.length===1?'':'s'),hist:H};}
  draw();}
function fname(f){var o=formOptions().filter(function(x){return x[0]===f;})[0];return o?o[1]:f;}
function drawerHTML(){if(!DRILL)return '';var o='<div class="fm-dr" data-close="1"><aside class="fm-dr-p" role="dialog" aria-modal="true" aria-label="'+e(DRILL.t)+'"><header><div><h3>'+e(DRILL.t)+'</h3><span>'+e(DRILL.sub)+'</span></div><button type="button" class="fm-btn" data-close="1">Close</button></header><div class="fm-dr-b">';
  if(DRILL.leads){var L=DRILL.leads;o+=L.length?L.map(function(r){var c=r.co||{};return '<div class="fm-li"><div class="fm-li-h">'+who(r)+'<span class="muted">'+e(nice(r.at))+'</span></div><div class="fm-li-m">'+pill(r)+' '+(r.co?ctx(r):'')+'</div>'+
      (r.co||r.owner?'<div class="fm-li-m"><span>Company: '+cname(r)+'</span><span>SDR: <b>'+e(c.sdr||r.owner||'none')+'</b></span><span>Working on it: '+e(r.working||'–')+'</span><span>Last touch: '+(r.touch?e(nice(r.touch))+' ('+ago(r.touch)+')':'none logged')+'</span></div>':'')+'</div>';}).join(''):'<p class="muted">Nothing here.</p>';}
  else {var H=DRILL.hist.slice().sort(function(a,b){return b.t-a.t;});o+=H.length?'<div class="fm-tw"><table class="fm-t"><thead><tr><th>Date</th><th>Form</th><th>Contact</th><th>Company</th><th>Owner</th><th>Customer or pipeline</th></tr></thead><tbody>'+
      H.map(function(r){return '<tr><td>'+e(nice(r.t))+'</td><td><span class="fm-pill">'+e(r.form)+'</span></td><td>'+(r.id?'<a href="'+HSB+'0-1/'+e(r.id)+'" target="_blank" rel="noopener">'+e(r.name)+'</a>':e(r.name))+'</td><td>'+e(r.company||'–')+'</td><td>'+e(r.owner)+'</td><td>'+e(r.stage)+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="muted">No submissions in this period.</p>';}
  return o+'</div></aside></div>';}
function cntForms(L){var f=function(x){return L.filter(function(r){return r.form===x;}).length;};return f('demo')+' demo · '+f('audit')+' audit · '+f('other')+' other';}

function html(){
  var head='<div class="fm-head"><p>Every website form from prospects: demo requests, audit unlocks and other forms, with who owns each lead and where the company stands. Internal and test submissions are kept apart.</p>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select class="fm-sel" data-fsel="1" aria-label="Which form">'+formOptions().map(function(x){return '<option value="'+e(x[0])+'"'+(x[0]===FSEL?' selected':'')+'>'+e(x[1])+'</option>';}).join('')+'</select><div class="fm-seg" role="group" aria-label="Period">'+[7,30,90].map(function(d){return '<button type="button" data-fdays="'+d+'" aria-pressed="'+(d===DAYS)+'">'+d+' days</button>';}).join('')+'</div></div></div>';
  if(!DATA)return head+(ERR?'<div class="fm-card"><p class="muted">Couldn’t load form submissions ('+e(ERR)+').</p></div>':'<div class="fm-kpis">'+[1,2,3,4].map(function(){return '<div class="fm-card fm-kpi"><div class="fm-skel" style="width:60%"></div><div class="fm-skel" style="height:28px;width:40%"></div></div>';}).join('')+'</div>')+reportHTML();
  return head+kpis()+matrixHTML()+reportHTML()+leadsHTML()+drawerHTML()+'<p class="fm-note">Updated '+e(new Date(DATA.generatedAt).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}))+' UK.</p>';
}
function draw(){var el=slot();if(!el)return;CW=Math.round((el.clientWidth||800)-42);
  var a=document.activeElement,wasSearch=a&&a.classList&&a.classList.contains('fm-search'),pos=wasSearch?a.selectionStart:0;
  el.innerHTML=html();bind(el);
  if(wasSearch){var s=el.querySelector('.fm-search');if(s){s.focus();try{s.setSelectionRange(pos,pos);}catch(x){}}}}
function bind(el){
  el.querySelectorAll('[data-fdays]').forEach(function(b){b.onclick=function(){var d=Number(b.dataset.fdays);if(d===DAYS)return;DAYS=d;DATA=null;draw();load();};});
  el.querySelectorAll('[data-ffil]').forEach(function(b){b.onclick=function(){FILTER=b.dataset.ffil;draw();};});
  el.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){TAB=b.dataset.tab;draw();};});
  el.querySelectorAll('[data-drill]').forEach(function(b){b.onclick=function(){openDrill(b.dataset.drill);};});
  el.querySelectorAll('[data-mx]').forEach(function(b){b.onclick=function(){MXBY=b.dataset.mx;draw();};});
  var fs=el.querySelector('[data-fsel]');if(fs)fs.onchange=function(){FSEL=fs.value;R.form=FSEL;saveR();draw();};
  el.querySelectorAll('[data-close]').forEach(function(x){x.onclick=function(ev){if(ev.target!==x)return;DRILL=null;draw();};});
  var s=el.querySelector('.fm-search');if(s)s.oninput=function(){Q=s.value.toLowerCase().trim();draw();};
  el.querySelectorAll('[data-r]').forEach(function(x){x.onchange=function(){var k=x.dataset.r,v=x.value;
    if(k==='preset'){if(v!=='custom'){var p=PRESETS.concat(SAVED)[Number(v)];if(p)['group','range','by','scope','form','type'].forEach(function(f){R[f]=p[f];});}}
    else if(k==='range')R.range=Number(v);
    else if(k==='group'){R.group=v;R.range=v==='week'?12:6;}
    else R[k]=v;
    saveR();draw();};});
  el.querySelectorAll('[data-fm]').forEach(function(b){b.onclick=function(){var a=b.dataset.fm;
    if(a==='table'){SHOWTABLE=!SHOWTABLE;draw();}
    if(a==='save'){var n=window.prompt('Name this report','');if(!n)return;n=n.trim().slice(0,60);if(!n)return;SAVED=SAVED.filter(function(p){return p.name!==n;});
      SAVED.push({name:n,group:R.group,range:R.range,by:R.by,scope:R.scope,form:R.form,type:R.type});saveList();draw();}
    if(a==='del'){var cur=curName();SAVED=SAVED.filter(function(p){return p.name!==cur;});saveList();draw();}};});
  var ch=el.querySelector('.fm-chart');if(ch&&HIST){var C=compute(),tip=ch.querySelector('.fm-tip'),cross=ch.querySelector('.fm-cross'),svg=ch.querySelector('svg');
    ch.querySelectorAll('.fm-hit').forEach(function(h){
      h.addEventListener('mouseenter',function(){var i=Number(h.dataset.i),p=C.P[i],x=Number(h.getAttribute('x'))+Number(h.getAttribute('width'))/2;
        cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.setAttribute('opacity','1');
        tip.innerHTML='<b>'+e(plabel(p))+'</b>'+C.keys.slice().reverse().map(function(k){return '<div><span><i style="background:'+colorOf(k)+'"></i>'+e(k)+'</span><span>'+C.M[p][k]+'</span></div>';}).join('')+(C.keys.length>1?'<div style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Total</span><b style="margin:0">'+C.tot[i]+'</b></div>':'');
        var sc=svg.getBoundingClientRect().width/Math.max(320,CW),left=x*sc+12;if(left+190>ch.clientWidth)left=x*sc-200;tip.style.left=Math.max(0,left)+'px';tip.style.top='10px';tip.style.opacity='1';});
      h.addEventListener('click',function(){openDrill('c|'+h.dataset.i);});
      h.addEventListener('mouseleave',function(){tip.style.opacity='0';cross.setAttribute('opacity','0');});});}
}
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&DRILL){DRILL=null;draw();}});
window.SDRForms=function(a){var el=slot();if(!el)return;el.hidden=a.view!=='forms';if(a.view!=='forms')return;if(!DATA&&!ERR)load();loadHist();if(!el.innerHTML)draw();};
})();
