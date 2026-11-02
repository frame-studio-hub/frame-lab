(() => {
  'use strict';
  const key='frame_lab_visitor';
  let visitor='';
  try { visitor=localStorage.getItem(key)||''; if(!/^[0-9a-f-]{36}$/i.test(visitor)){visitor=crypto.randomUUID();localStorage.setItem(key,visitor);} } catch { return; }
  const send=()=>fetch('/analytics/track',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({visitor_id:visitor,path:location.pathname,referrer:document.referrer})}).catch(()=>{});
  send();
  let last=Date.now();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>30000){last=Date.now();send();}});
  window.addEventListener('pagehide',()=>{});
})();