/* Password gate. Every api/ call carries the key from api/login as ?k=; without it the API returns 401 and this shows the sign-in screen.
   The key is kept in this browser (localStorage), so people sign in once per browser. */
(function(){
var KEY='sdrPortalKey',mem=null;
function get(){try{return localStorage.getItem(KEY)||mem;}catch(e){return mem;}}
function set(v){mem=v;try{if(v)localStorage.setItem(KEY,v);else localStorage.removeItem(KEY);}catch(e){}}
var native=window.fetch.bind(window);
function isApi(u){return typeof u==='string'&&/^\/?api\//.test(u)&&!/^\/?api\/login/.test(u);}
window.fetch=function(u,o){
  if(!isApi(u))return native(u,o);
  var k=get();if(!k){show();return Promise.resolve(new Response(JSON.stringify({error:'locked'}),{status:401,headers:{'Content-Type':'application/json'}}));}
  return native(u+(u.indexOf('?')<0?'?':'&')+'k='+encodeURIComponent(k),o).then(function(r){if(r.status===401){set(null);show();}return r;});};

document.head.insertAdjacentHTML('beforeend','<style>'+
'.gate{position:fixed;inset:0;z-index:1000;background:var(--bg,#f6f5f2);display:grid;place-items:center;padding:16px}'+
'.gate form{width:min(360px,100%);background:var(--surface,#fff);border:1px solid var(--line,#ddd);padding:28px 24px;display:grid;gap:14px}'+
'.gate h1{margin:0;font-size:1.3rem}.gate p{margin:0;color:var(--muted,#666);font-size:.88rem}'+
'.gate input{border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--fg,#111);padding:10px 12px;font:inherit;font-size:1rem}'+
'.gate button{background:var(--accent,#FF4D00);color:#fff;border:0;padding:11px 14px;font:inherit;font-weight:600;cursor:pointer}.gate button:disabled{opacity:.6}'+
'.gate .err{color:#b8324f;font-size:.85rem;min-height:1em}'+
'</style>');
var shown=false;
function show(){if(shown)return;shown=true;var go=function(){
  document.body.insertAdjacentHTML('beforeend','<div class="gate" role="dialog" aria-modal="true" aria-labelledby="gateT"><form id="gateF"><h1 id="gateT">SDR Portal</h1><p>Enter the portal password to see live HubSpot data.</p>'+
    '<input type="password" id="gateP" autocomplete="current-password" aria-label="Password" placeholder="Password" required><button type="submit" id="gateB">Open the portal</button><span class="err" id="gateE" role="alert"></span></form></div>');
  var f=document.getElementById('gateF'),p=document.getElementById('gateP'),b=document.getElementById('gateB'),e=document.getElementById('gateE');p.focus();
  f.addEventListener('submit',function(ev){ev.preventDefault();b.disabled=true;e.textContent='';
    native('api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p.value})})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(d){
      if(r.ok&&d.key){set(d.key);location.reload();return;}
      e.textContent=d.error==='no_password'?'The portal password hasn’t been set up in Vercel yet.':d.error==='wrong_password'?'That password isn’t right.':'Couldn’t sign in. Try again.';b.disabled=false;p.select();});})
    .catch(function(){e.textContent='Couldn’t reach the portal. Try again.';b.disabled=false;});});};
  if(document.body)go();else document.addEventListener('DOMContentLoaded',go);}
if(!get())show();
window.SDRAuth={signOut:function(){set(null);location.reload();}};
})();
