const COOKIE='frame_admin_session';
const TABLES=new Set(['requests','reviews','request_notes','request_activity','request_messages','request_files','site_visitors','site_visits','site_daily_stats']);
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function valid(req,env){const raw=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw)return false;const [exp,sig]=raw.split('.');if(!exp||!sig||Number(exp)<Date.now()/1000)return false;return (await sign(exp,env.SESSION_SECRET))===sig;}
function cookie(value,maxAge){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}

function parseAgent(ua=''){
 const browser=/Edg\\//.test(ua)?'Edge':/Firefox\\//.test(ua)?'Firefox':/Chrome\\//.test(ua)?'Chrome':/Safari\\//.test(ua)&&!/Chrome\\//.test(ua)?'Safari':'Other';
 const os=/Windows/.test(ua)?'Windows':/Mac OS X/.test(ua)?'macOS':/Android/.test(ua)?'Android':/(iPhone|iPad|iPod)/.test(ua)?'iOS':/Linux/.test(ua)?'Linux':'Other';
 const device=/(iPhone|Android.*Mobile|Mobile)/.test(ua)?'Mobile':/(iPad|Tablet)/.test(ua)?'Tablet':'Desktop';
 return {browser,os,device};
}
async function supabase(env,path,init={}){
 const base=env.SUPABASE_URL.replace(/\\/$/,'');
 return fetch(base+'/rest/v1/'+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...(init.headers||{})}});
}

export default {async fetch(req,env){const url=new URL(req.url),path=url.pathname;

 if(path==='/analytics/track'&&req.method==='POST'){
  let body={};try{body=await req.json()}catch{return json({error:'Bad request'},400);}
  const visitor=String(body.visitor_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(visitor))return json({error:'Invalid visitor'},400);
  const ua=(req.headers.get('User-Agent')||'').slice(0,500);
  const details=parseAgent(ua);
  const ip=(req.headers.get('CF-Connecting-IP')||'').slice(0,64)||null;
  const existing=await supabase(env,'site_visitors?visitor_id=eq.'+visitor+'&select=visitor_id&limit=1');
  if(!existing.ok)return json({error:'Analytics unavailable'},502);
  const found=await existing.json();
  const up=found.length
   ? await supabase(env,'site_visitors?visitor_id=eq.'+visitor,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_seen:new Date().toISOString()})})
   : await supabase(env,'site_visitors',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify([{visitor_id:visitor,ip_address:ip,user_agent:ua,browser:details.browser,operating_system:details.os,device_type:details.device}])});
  if(!up.ok)return json({error:'Analytics unavailable'},502);
  const visit=await supabase(env,'site_visits',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify([{visitor_id:visitor,page_path:String(body.path||'/').slice(0,500),referrer:String(body.referrer||'').slice(0,1000)||null}])});
  if(!visit.ok)return json({error:'Analytics unavailable'},502);
  return json({ok:true},200);
 }

 if(path==='/auth/login'&&req.method==='POST'){let body={};try{body=await req.json()}catch{};const u=String(body.username||''),p=String(body.password||'');if(u!==env.ADMIN_USERNAME||p!==env.ADMIN_PASSWORD)return json({error:'Unauthorized'},401);const exp=String(Math.floor(Date.now()/1000)+60*60*12),token=exp+'.'+await sign(exp,env.SESSION_SECRET);return json({ok:true},200,{'Set-Cookie':cookie(token,43200)});}
 if(path==='/auth/check'&&req.method==='GET'){if(!await valid(req,env))return json({error:'Unauthorized'},401);return json({id:env.ADMIN_USER_ID,username:env.ADMIN_USERNAME});}
 if(path==='/auth/logout'&&req.method==='POST')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
 if(path.startsWith('/api/')){if(!await valid(req,env))return json({error:'Unauthorized'},401);const base=env.SUPABASE_URL.replace(/\/$/,'');const headers={'apikey':env.SUPABASE_SERVICE_ROLE_KEY,'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`};

  if(path==='/api/analytics'&&req.method==='GET'){
   const from=url.searchParams.get('from')||new Date(Date.now()-30*86400000).toISOString();
   const to=url.searchParams.get('to')||new Date().toISOString();
   const q='created_at=gte.'+encodeURIComponent(from)+'&created_at=lte.'+encodeURIComponent(to);
   const [visitsRes,visitorsRes,liveRes]=await Promise.all([
    supabase(env,'site_visits?select=id,visitor_id,page_path,referrer,created_at&'+q+'&order=created_at.desc&limit=10000'),
    supabase(env,'site_visitors?select=visitor_id,ip_address,browser,operating_system,device_type,first_seen,last_seen&order=last_seen.desc&limit=5000'),
    supabase(env,'site_visitors?select=visitor_id&last_seen=gte.'+encodeURIComponent(new Date(Date.now()-5*60000).toISOString()))
   ]);
   if(!visitsRes.ok||!visitorsRes.ok||!liveRes.ok)return json({error:'Analytics query failed'},502);
   const [visits,visitors,live]=await Promise.all([visitsRes.json(),visitorsRes.json(),liveRes.json()]);
   const ids=new Set(visitors.map(v=>v.visitor_id));
   const visitorMap=new Map(visitors.map(v=>[v.visitor_id,v]));
   const hourly={},pages={},browsers={},systems={},devices={};
   for(const v of visits){const d=new Date(v.created_at);const h=String(d.getHours()).padStart(2,'0')+':00';hourly[h]=(hourly[h]||0)+1;pages[v.page_path]=(pages[v.page_path]||0)+1;const info=visitorMap.get(v.visitor_id)||{};for(const [obj,key] of [[browsers,'browser'],[systems,'operating_system'],[devices,'device_type']]){const k=info[key]||'Unknown';obj[k]=(obj[k]||0)+1;}}
   const rows=visits.slice(0,500).map(v=>({ ...v, ...(visitorMap.get(v.visitor_id)||{}) }));
   const unique=new Set(visits.map(v=>v.visitor_id)).size;
   return json({total:visits.length,unique,online:live.length,hourly,pages,browsers,systems,devices,visits:rows,limited:visits.length>=10000});
  }

  if(path.startsWith('/api/rest/v1/')){const table=path.slice('/api/rest/v1/'.length).split('/')[0];if(!TABLES.has(table))return json({error:'Forbidden'},403);const target=base+'/rest/v1/'+path.slice('/api/rest/v1/'.length)+url.search;const h=new Headers(headers);for(const k of ['Content-Type','Prefer','Accept'])if(req.headers.has(k))h.set(k,req.headers.get(k));const upstream=await fetch(target,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body});return new Response(upstream.body,{status:upstream.status,headers:{'Content-Type':upstream.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});}
  if(path.startsWith('/api/storage/')){const rest=path.slice('/api/storage/'.length);const [bucket,...parts]=rest.split('/');if(bucket!=='client-files'||!parts.length)return json({error:'Forbidden'},403);const objectPath=parts.map(decodeURIComponent).join('/');const fd=await req.formData(),file=fd.get('file');if(!file)return json({error:'Missing file'},400);const target=base+'/storage/v1/object/'+bucket+'/'+objectPath.split('/').map(encodeURIComponent).join('/');const up=await fetch(target,{method:'POST',headers:{...headers,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:await file.arrayBuffer()});const data=await up.json().catch(()=>({}));return json(data,up.status);}
  if(path.startsWith('/api/storage-sign/')){const rest=path.slice('/api/storage-sign/'.length);const [bucket,...parts]=rest.split('/');if(bucket!=='client-files'||!parts.length)return json({error:'Forbidden'},403);const objectPath=parts.map(decodeURIComponent).join('/');const up=await fetch(base+'/storage/v1/object/sign/'+bucket+'/'+objectPath.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:Number(url.searchParams.get('expiresIn'))||60})});const data=await up.json().catch(()=>({}));if(!up.ok)return json(data,up.status);return json({signedUrl:data.signedURL?.startsWith('http')?data.signedURL:base+'/storage/v1'+data.signedURL});}
 }
 return fetch(req);
}};
