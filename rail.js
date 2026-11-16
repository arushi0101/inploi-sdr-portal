/* Left panel polish: icons on every page, rounded active pill, quieter section headers, guide line for sub-pages,
   pod filter as people chips with initials, and the HubSpot status as a small card at the bottom.
   Loaded after app.js; only decorates the rail app.js builds, so navigation logic stays in app.js. */
(function(){
var P={
  overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  calls:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  outreach:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  meetings:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  accounts:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  pipeline:'<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  visits:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  forms:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  review:'<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  fixes:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  matt:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  kb:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  defs:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  arushi:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  res:'<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>',
  hub:'<path d="M7 17 17 7M8 7h9v9"/>'
};
function ic(k){return '<svg class="rl-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+P[k]+'</svg>';}

document.head.insertAdjacentHTML('beforeend','<style>'+
 '.rail{background:linear-gradient(180deg,#171513 0%,var(--rail) 60%);border-right:1px solid rgba(255,255,255,.06);gap:18px;padding-top:20px;scrollbar-width:thin;scrollbar-color:#3a3633 transparent}'+
 '.rail::-webkit-scrollbar{width:6px}.rail::-webkit-scrollbar-thumb{background:#3a3633;border-radius:6px}'+
 '.rail .brand{padding:0 8px 14px;border-bottom:1px solid rgba(255,255,255,.07);gap:6px}.rail .brand img{width:100px}'+
 '.rail .brand b{font-size:.98rem}.rail .brand span{font-size:.74rem}'+
 /* items */
 '.rail .nav{gap:1px}'+
 '.rail .nav button{position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;font-size:.88rem;font-weight:500;color:#D9D5D0;box-shadow:none!important;transition:background .15s,color .15s}'+
 '.rail .nav button>span:first-of-type{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
 '.rail .nav button:hover{background:rgba(255,255,255,.06);color:#fff}'+
 '.rail .nav button[aria-current="page"]{background:rgba(255,77,0,.16);color:#fff}'+
 '.rail .nav button[aria-current="page"] .rl-ic{color:var(--rail-accent)}'+
 '.rail .rl-ic{width:17px;height:17px;flex:none;color:#9E9893;transition:color .15s}.rail .nav button:hover .rl-ic{color:#fff}'+
 /* section headers */
 '.rail .nav-sec{font-size:.64rem;letter-spacing:.1em;color:#8A847E;padding:16px 10px 6px;font-weight:600}'+
 '.rail .nav button.nav-sec-btn{font-size:.64rem;letter-spacing:.1em;color:#8A847E;padding:16px 10px 6px;font-weight:600;border-radius:0}'+
 '.rail .nav button.nav-sec-btn:hover{background:none;color:#D9D5D0}.rail .nav button.nav-sec-btn .rl-ic{display:none}'+
 /* sub-pages: guide line, no icon */
 '.rail .nav-sub{margin:2px 0 4px 18px;padding-left:10px;border-left:1px solid rgba(255,255,255,.1);gap:1px}'+
 '.rail .nav-sub button{padding:6px 10px!important;font-size:.84rem!important;color:#A8A29C;font-weight:400}'+
 '.rail .nav-sub button[aria-current="page"]{color:#fff;background:rgba(255,77,0,.14)}'+
 '.rail .nav-sub button[aria-current="page"]::before{content:"";position:absolute;left:-11px;top:8px;bottom:8px;width:2px;border-radius:2px;background:var(--rail-accent)}'+
 '.rail .ov-chev{color:#8A847E;border-radius:6px;padding:0 5px}.rail .ov-chev:hover{background:rgba(255,255,255,.08);color:#fff}'+
 '.rail .nav .count#cnt-meetings:not(:empty){background:var(--rail-accent);color:#fff;border-radius:99px;font-weight:600;padding:1px 7px;font-size:.68rem}'+
 /* pod filter as people chips */
 '.rail .rail-label{font-size:.64rem;letter-spacing:.1em;color:#8A847E;padding-left:10px}'+
 '.rail .pods{display:grid;gap:2px}'+
 '.rail .opt{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:9px;transition:background .15s}'+
 '.rail .opt::before{display:none!important}'+
 '.rail .opt .rl-av{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:.66rem;font-weight:700;background:#2E2A27;color:#D9D5D0;flex:none;letter-spacing:0}'+
 '.rail .opt>span:not(.rl-av){flex:1;min-width:0;display:grid;font-size:.84rem;margin:0!important;line-height:1.25}'+
 '.rail .opt small{font-size:.72rem}'+
 '.rail .opt[aria-pressed="true"]{background:rgba(255,255,255,.08)}.rail .opt[aria-pressed="true"] .rl-av{background:var(--rail-accent);color:#fff}'+
 '.rail .opt:hover{background:rgba(255,255,255,.06)}'+
 /* footer status card */
 '.rail .rail-foot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;gap:8px}'+
 '.rail .live-status i{border-radius:50%;box-shadow:0 0 0 3px rgba(76,195,138,.15)}'+
 '.rail .refresh{border-radius:8px;border-color:rgba(255,255,255,.15)}.rail .refresh:hover{background:rgba(255,255,255,.06)}'+
 '.rail .rail-foot a{display:inline-flex;align-items:center;gap:6px;color:#FF9A6B;font-weight:500}.rail .rail-foot a .rl-ic{width:14px;height:14px;color:currentColor}'+
 '@media (max-width:820px){.rail{gap:10px}.rail .brand{border:0;padding-bottom:0}.rail .nav-sec,.rail .nav button.nav-sec-btn{display:none}.rail .nav-sub{margin:0;padding:0;border:0;display:contents}.rail .nav button{padding:7px 10px}.rail .pods{display:flex}.rail .opt>span:not(.rl-av){display:none}}'+
 '</style>');

function deco(){
  var nav=document.getElementById('nav');if(!nav)return;
  Array.prototype.forEach.call(nav.querySelectorAll('button[data-view]'),function(b){
    if(b.querySelector('.rl-ic')||b.closest('.nav-sub'))return;var k=b.dataset.view;if(P[k])b.insertAdjacentHTML('afterbegin',ic(k));});
  var rb=nav.querySelector('.nav-sec-btn');if(rb&&!rb.querySelector('.rl-ic'))rb.insertAdjacentHTML('afterbegin',ic('res'));
  Array.prototype.forEach.call(document.querySelectorAll('#pods .opt'),function(o){if(o.querySelector('.rl-av'))return;
    var sub=(o.querySelector('small')||{}).textContent||'',lab=(o.querySelector('span')||{}).textContent||'';
    var ini=o.dataset.pod==='all'?'All':sub.trim().slice(0,2);o.insertAdjacentHTML('afterbegin','<span class="rl-av" aria-hidden="true">'+ini+'</span>');
    var s=o.querySelector('span:not(.rl-av)'),sm=o.querySelector('small');if(s&&sm&&sm.parentNode===o){s.appendChild(sm);}});
  var a=document.querySelector('.rail-foot a');if(a&&!a.querySelector('.rl-ic')){a.textContent=a.textContent.replace(/\s*↗\s*$/,'');a.insertAdjacentHTML('beforeend',ic('hub'));}
}
deco();
new MutationObserver(function(){deco();}).observe(document.querySelector('.rail')||document.body,{childList:true,subtree:true});
})();
