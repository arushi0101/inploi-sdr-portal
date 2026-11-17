/* Pipeline › Open SDR-sourced deals as a board (one column per stage, in HubSpot's pipeline order), a bar chart by stage, or the table.
   Called by app.js after it renders the deals table: SDRPipeBoard(deals, {byK, fmtK, dl, esc}). Deals carry so = the stage's pipeline order. */
(function(){
var MODE='board',SEL=null;try{MODE=localStorage.getItem('pipeMode')||'board';}catch(x){}
document.head.insertAdjacentHTML('beforeend','<style>'+
 '.pb-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px}'+
 '.pb-seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}'+
 '.pb-seg button{border:0;background:none;color:var(--muted);padding:6px 12px;border-radius:7px;font-size:.82rem;font-weight:500;cursor:pointer}'+
 '.pb-seg button[aria-pressed=true]{background:var(--surface);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.08)}'+
 '.pb-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(230px,1fr);gap:12px;overflow-x:auto;padding-bottom:6px}'+
 '.pb-col{background:var(--bg);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;min-width:0;max-height:640px}'+
 '.pb-ch{padding:12px 12px 10px;border-bottom:1px solid var(--line);display:grid;gap:4px}'+
 '.pb-ch b{font-size:.9rem;display:flex;justify-content:space-between;gap:8px}.pb-ch b em{font-style:normal;font-size:.72rem;font-weight:600;background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:0 8px;color:var(--muted)}'+
 '.pb-ch span{font-size:.8rem;color:var(--muted)}.pb-ch i{display:block;height:4px;border-radius:99px;background:var(--line);overflow:hidden}.pb-ch i s{display:block;height:100%;background:var(--accent);text-decoration:none}'+
 '.pb-cards{padding:10px;display:grid;gap:8px;overflow-y:auto;align-content:start}'+
 '.pb-card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:6px;transition:border-color .15s,box-shadow .15s}'+
 '.pb-card:hover{border-color:var(--muted);box-shadow:0 4px 12px rgba(0,0,0,.06)}'+
 '.pb-card a{color:var(--fg);font-weight:600;font-size:.88rem;text-decoration:none;line-height:1.3}.pb-card a:hover{color:var(--link);text-decoration:underline}'+
 '.pb-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.78rem;color:var(--muted)}'+
 '.pb-amt{font-weight:700;color:var(--fg);font-size:.86rem}'+
 '.pb-av{display:inline-flex;align-items:center;gap:6px}.pb-av i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:.6rem;font-weight:700;background:var(--accent-soft);color:var(--accent)}'+
 '.pb-next{font-size:.76rem;color:var(--muted);border-top:1px dashed var(--line);padding-top:6px}.pb-next.bad{color:#b4321b}'+
 '.pb-acc{display:inline-block;font-size:.68rem;font-weight:600;padding:1px 8px;border-radius:99px;background:#e3f4ea;color:#0e7a46;justify-self:start}.pb-acc.no{background:#fbf0d9;color:#8a5a00}'+
 '.pb-empty{font-size:.8rem;color:var(--muted);padding:8px 2px}'+
 '.pb-chart{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:14px;align-items:end;height:280px;padding:10px 4px 0;border-bottom:1px solid var(--line)}'+
 '.pb-bar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;cursor:pointer;border:0;background:none;font:inherit;color:inherit;padding:0}'+
 '.pb-bar b{font-size:.86rem}.pb-bar small{font-size:.72rem;color:var(--muted)}'+
 '.pb-bar span{display:block;width:min(64px,80%);border-radius:8px 8px 0 0;background:var(--accent);opacity:.85;transition:opacity .15s}.pb-bar:hover span,.pb-bar[aria-pressed=true] span{opacity:1;outline:2px solid var(--fg);outline-offset:2px}'+
 '.pb-xl{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:14px;padding:8px 4px 0;text-align:center;font-size:.8rem;font-weight:600}'+
 '.pb-xl span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pb-xl em{display:block;font-style:normal;font-weight:400;font-size:.72rem;color:var(--muted)}'+
 '.pb-list{margin-top:16px}'+
 '</style>');
function ini(n){n=String(n||'').trim();return n?n[0].toUpperCase():'?';}
window.SDRPipeBoard=function(D,api){
  var root=document.getElementById('pipeBoard'),tbl=document.getElementById('pipeTable');if(!root)return;
  var esc=api.esc,fmtK=api.fmtK;
  var stages={};D.forEach(function(d){var k=d.st||'No stage';var s=stages[k]||(stages[k]={k:k,so:d.so!=null?d.so:99,n:0,a:0,deals:[]});s.n++;s.a+=d.a;s.deals.push(d);});
  var S=Object.keys(stages).map(function(k){return stages[k];}).sort(function(a,b){return a.so-b.so||(a.k>b.k?1:-1);});
  var tot=D.reduce(function(t,d){return t+d.a;},0),amax=Math.max.apply(null,S.map(function(s){return s.a;}).concat([1]));
  var isAcc=function(d){return !!d.st&&!/^discovery/i.test(d.st);};
  var card=function(d){var k=api.byK(d.s)||{};return '<div class="pb-card">'+(isAcc(d)?'<span class="pb-acc">Sales accepted</span>':'<span class="pb-acc no">Awaiting acceptance</span>')+'<a href="'+api.dl(d.id)+'"'+(d.co?' data-co="'+d.co+'"':'')+' target="_blank" rel="noopener">'+esc(d.n)+'</a>'+
    '<div class="pb-meta"><span class="pb-av"><i>'+esc(ini(k.short))+'</i>'+esc(k.short||'')+'</span><span class="pb-amt">'+(d.a?fmtK(d.a):'<span style="color:var(--muted);font-weight:400">No amount</span>')+'</span></div>'+
    '<div class="pb-meta"><span>Created '+esc(d.cr)+'</span>'+(d.arr?'<span>ARR '+esc(d.arr)+'</span>':'')+'</div>'+
    '</div>';};
  var nAcc=D.filter(isAcc).length,aAcc=D.filter(isAcc).reduce(function(t,d){return t+d.a;},0);
  var o='<div class="pb-top"><span class="muted small">'+D.length+' open deals · '+fmtK(tot)+' · <b style="color:#0e7a46">'+nAcc+' sales accepted ('+fmtK(aAcc)+')</b> = everything past Discovery</span><div class="pb-seg" role="group" aria-label="View">'+
    [['board','Board'],['chart','Bar chart'],['table','Table']].map(function(m){return '<button type="button" data-pbm="'+m[0]+'" aria-pressed="'+(MODE===m[0])+'">'+m[1]+'</button>';}).join('')+'</div></div>';
  if(MODE==='board'){
    o+=S.length?'<div class="pb-board">'+S.map(function(s){return '<div class="pb-col"><div class="pb-ch"><b>'+esc(s.k)+'<em>'+s.n+'</em></b><span>'+fmtK(s.a)+' · '+Math.round(s.a/(tot||1)*100)+'% of pipeline</span><i><s style="width:'+Math.max(2,s.a/amax*100)+'%"></s></i></div>'+
      '<div class="pb-cards">'+s.deals.slice().sort(function(a,b){return b.a-a.a;}).map(card).join('')+'</div></div>';}).join('')+'</div>':'<p class="pb-empty">No open SDR-sourced deals.</p>';
  } else if(MODE==='chart'){
    o+='<div class="pb-chart">'+S.map(function(s){return '<button type="button" class="pb-bar" data-pbs="'+esc(s.k)+'" aria-pressed="'+(SEL===s.k)+'" title="'+esc(s.k)+': '+s.n+' deals, '+fmtK(s.a)+'"><b>'+fmtK(s.a)+'</b><small>'+s.n+(s.n===1?' deal':' deals')+'</small><span style="height:'+Math.max(2,s.a/amax*200)+'px"></span></button>';}).join('')+'</div>'+
      '<div class="pb-xl">'+S.map(function(s){return '<span title="'+esc(s.k)+'">'+esc(s.k)+'<em>'+Math.round(s.a/(tot||1)*100)+'%</em></span>';}).join('')+'</div>';
    var sel=SEL&&stages[SEL];
    o+=sel?'<div class="pb-list"><div class="pb-top"><b>'+esc(sel.k)+' · '+sel.n+' deals · '+fmtK(sel.a)+'</b><button type="button" class="pb-seg" style="padding:5px 10px;cursor:pointer;font-size:.8rem" data-pbs="">Clear</button></div><div class="pb-board" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">'+sel.deals.slice().sort(function(a,b){return b.a-a.a;}).map(card).join('')+'</div></div>'
      :'<p class="muted small" style="margin-top:10px">Click a bar to see its deals.</p>';
  }
  root.innerHTML=o;if(tbl)tbl.hidden=MODE!=='table';
  Array.prototype.forEach.call(root.querySelectorAll('[data-pbm]'),function(b){b.onclick=function(){MODE=b.getAttribute('data-pbm');try{localStorage.setItem('pipeMode',MODE);}catch(x){}window.SDRPipeBoard(D,api);};});
  Array.prototype.forEach.call(root.querySelectorAll('[data-pbs]'),function(b){b.onclick=function(){var k=b.getAttribute('data-pbs');SEL=k&&SEL!==k?k:null;window.SDRPipeBoard(D,api);};});
};
})();
