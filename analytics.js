(() => {
  'use strict';
  const consentKey='frame_lab_analytics_consent',visitorKey='frame_lab_visitor';
  let consent='';try{consent=localStorage.getItem(consentKey)||'';}catch{return;}
  let visitor='';try{visitor=localStorage.getItem(visitorKey)||'';if(!/^[0-9a-f-]{36}$/i.test(visitor)){visitor=crypto.randomUUID();localStorage.setItem(visitorKey,visitor);}}catch{return;}
  const send=()=>{if(consent!=='yes'||document.hidden)return;fetch('/analytics/track',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({visitor_id:visitor,path:location.pathname,referrer:document.referrer})}).catch(()=>{});};
  const banner=()=>{
    if(consent)return;
    const el=document.createElement('aside');el.className='analytics-consent';el.setAttribute('role','dialog');el.setAttribute('aria-label','Настройки аналитики');
    el.innerHTML='<div><b>ТЕХНИЧЕСКАЯ АНАЛИТИКА</b><p>Мы собираем статистику посещений, IP-адрес и сведения о браузере и устройстве. Эти данные доступны только администратору; IP и технические данные хранятся не дольше 30 дней. Можно отказаться — сайт продолжит работать.</p></div><div class="analytics-consent-actions"><button type="button" data-consent="no">ОТКЛОНИТЬ</button><button type="button" data-consent="yes">РАЗРЕШИТЬ</button></div>';
    document.body.append(el);
    el.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{consent=b.dataset.consent;try{localStorage.setItem(consentKey,consent);}catch{}el.remove();if(consent==='yes'){send();setInterval(send,60000);}}));
  };
  if(consent==='yes'){send();setInterval(send,60000);}else if(!consent)banner();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)send();});
})();