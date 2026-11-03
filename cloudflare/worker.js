const COOKIE='frame_admin_session';
const TABLES=new Set(['requests','reviews','request_notes','request_activity','request_messages','request_files','site_visitors','site_visits','site_daily_stats']);
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function valid(req,env){const bearer=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');const raw=bearer||((req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1));if(!raw)return false;const [exp,sig]=raw.split('.');if(!exp||!sig||Number(exp)<Date.now()/1000)return false;return (await sign(exp,env.SESSION_SECRET))===sig;}
function cookie(value,maxAge){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;}

function parseAgent(ua=''){
 const u=String(ua).toLowerCase();
 // Browser detection: check branded/mobile variants before Chromium's generic token.
 const browser=/samsungbrowser\//.test(u)?'Samsung Internet':/edg\//.test(u)?'Edge':/opr\//.test(u)?'Opera':/vivaldi\//.test(u)?'Vivaldi':/brave\//.test(u)?'Brave':/fxios\//.test(u)?'Firefox':/firefox\//.test(u)?'Firefox':/crios\//.test(u)?'Chrome':/chrome\//.test(u)?'Chrome':/safari\//.test(u)?'Safari':/duckduckgo\//.test(u)?'DuckDuckGo':'Other';
 // iPhone/iPad tokens must be checked before "Mac OS X" (iOS Safari includes it).
 let os='Other';
 if(/iphone|ipad|ipod/.test(u)) os='iOS';
 else if(/android/.test(u)) os='Android';
 else if(/cros\s/.test(u)) os='ChromeOS';
 else if(/windows phone|windows mobile/.test(u)) os='Windows Mobile';
 else if(/windows nt/.test(u)) os='Windows';
 else if(/macintosh|mac os x/.test(u)) os='macOS';
 else if(/ubuntu/.test(u)) os='Ubuntu';
 else if(/fedora/.test(u)) os='Fedora';
 else if(/debian/.test(u)) os='Debian';
 else if(/freebsd/.test(u)) os='FreeBSD';
 else if(/openbsd/.test(u)) os='OpenBSD';
 else if(/netbsd/.test(u)) os='NetBSD';
 else if(/linux/.test(u)) os='Linux';
 let device='Desktop';
 if(/ipad|tablet/.test(u)) device='Tablet';
 else if(/iphone|ipod|android.*mobile|windows phone|windows mobile|mobile/.test(u)) device='Mobile';
 return {browser,os,device};
}
async function supabase(env,path,init={}){
 const base=env.SUPABASE_URL.endsWith('/')?env.SUPABASE_URL.slice(0,-1):env.SUPABASE_URL;
 return fetch(base+'/rest/v1/'+path,{...init,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...(init.headers||{})}});
}

async function handle(req,env){const url=new URL(req.url),path=url.pathname;

 if(path==='/analytics/track'){
  const origin=req.headers.get('Origin')||'';
  const allowed='https://frame-studio-hub.github.io';
  const cors={'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
  if(origin!==allowed)return json({error:'Forbidden'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed'},405,cors);
  let body={};try{body=await req.json()}catch{return json({error:'Bad request'},400,cors);}
  const visitor=String(body.visitor_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(visitor))return json({error:'Invalid visitor'},400,cors);
  const ua=(req.headers.get('User-Agent')||'').slice(0,500);
  const details=parseAgent(ua);
  // Cloudflare edge supplies CF-Connecting-IP. Keep common proxy fallbacks
  // for Pages/custom-proxy paths, and normalize forwarded lists to one address.
  const ip=''; // Do not collect or store visitor IP addresses.
  const key='sb_publishable_FkRZkn5CqQwaN9GbhxBpgg_fMSvotuF';
  const result=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/track_site_visit',{
   method:'POST',
   headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({p_visitor_id:visitor,p_page_path:String(body.path||'/').slice(0,500),p_referrer:String(body.referrer||'').slice(0,1000),p_ip_address:ip,p_user_agent:ua,p_browser:details.browser,p_operating_system:details.os,p_device_type:details.device})
  });
  if(!result.ok)return json({error:'Analytics unavailable'},502,cors);
  return json({ok:true},200,cors);
 }

 if(path==='/auth/login'&&req.method==='POST'){let body={};try{body=await req.json()}catch{};const u=String(body.username||''),p=String(body.password||'');if(u!==env.ADMIN_USERNAME||p!==env.ADMIN_PASSWORD)return json({error:'Unauthorized'},401);const exp=String(Math.floor(Date.now()/1000)+60*60*12),token=exp+'.'+await sign(exp,env.SESSION_SECRET);return json({ok:true,token},200);}
 if(path==='/auth/check'&&req.method==='GET'){if(!await valid(req,env))return json({error:'Unauthorized'},401);return json({id:env.ADMIN_USER_ID,username:env.ADMIN_USERNAME});}
 if(path==='/auth/logout'&&req.method==='POST')return json({ok:true});
 if(path.startsWith('/api/')){if(!await valid(req,env))return json({error:'Unauthorized'},401);const base=env.SUPABASE_URL.replace(/\/$/,'');const headers={'apikey':env.SUPABASE_SERVICE_ROLE_KEY,'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`};

  if(path==='/api/analytics'&&req.method==='GET'){
   const from=url.searchParams.get('from')||new Date(Date.now()-30*86400000).toISOString();
   const to=url.searchParams.get('to')||new Date().toISOString();
   const q='created_at=gte.'+encodeURIComponent(from)+'&created_at=lte.'+encodeURIComponent(to);
   const [visitsRes,visitorsRes,liveRes]=await Promise.all([
    supabase(env,'site_visits?select=id,visitor_id,page_path,ip_address,browser,operating_system,device_type,referrer,created_at&'+q+'&order=created_at.desc&limit=10000'),
    supabase(env,'site_visitors?select=visitor_id,ip_address,browser,operating_system,device_type,first_seen,last_seen&order=last_seen.desc&limit=5000'),
    supabase(env,'site_visitors?select=visitor_id&last_seen=gte.'+encodeURIComponent(new Date(Date.now()-5*60000).toISOString()))
   ]);
   if(!visitsRes.ok||!visitorsRes.ok||!liveRes.ok)return json({error:'Analytics query failed'},502);
   const [visits,visitors,live]=await Promise.all([visitsRes.json(),visitorsRes.json(),liveRes.json()]);
   const ids=new Set(visitors.map(v=>v.visitor_id));
   const visitorMap=new Map(visitors.map(v=>[v.visitor_id,v]));
   const hourly={},pages={},browsers={},systems={},devices={};
   for(const v of visits){const d=new Date(v.created_at);const h=String(d.getHours()).padStart(2,'0')+':00';hourly[h]=(hourly[h]||0)+1;pages[v.page_path]=(pages[v.page_path]||0)+1;const info=visitorMap.get(v.visitor_id)||{};for(const [obj,key] of [[browsers,'browser'],[systems,'operating_system'],[devices,'device_type']]){const k=v[key]||info[key]||'Unknown';obj[k]=(obj[k]||0)+1;}}
   const rows=visits.slice(0,500).map(v=>({ ...(visitorMap.get(v.visitor_id)||{}), ...v }));
   const unique=new Set(visits.map(v=>v.visitor_id)).size;
   const grouped=new Map();
   for(const v of visits){const key=v.visitor_id||'unknown';if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(v);}
   const visitorProfiles=[...grouped.entries()].map(([id,items])=>{
    const first=items[items.length-1],last=items[0],meta=visitorMap.get(id)||{};
    return {visitor_id:id,ip_address:last.ip_address||meta.ip_address||'',browser:last.browser||meta.browser||'',operating_system:last.operating_system||meta.operating_system||'',device_type:last.device_type||meta.device_type||'',first_seen:first.created_at,last_seen:last.created_at,visits:items.length,pages:[...new Set(items.map(x=>x.page_path))].slice(0,12)};
   }).sort((a,b)=>new Date(b.last_seen)-new Date(a.last_seen)).slice(0,300);
   return json({total:visits.length,unique,online:live.length,hourly,pages,browsers,systems,devices,visits:rows,visitorProfiles,limited:visits.length>=10000});
  }

  if(path.startsWith('/api/rest/v1/')){const table=path.slice('/api/rest/v1/'.length).split('/')[0];if(!TABLES.has(table))return json({error:'Forbidden'},403);const target=base+'/rest/v1/'+path.slice('/api/rest/v1/'.length)+url.search;const h=new Headers(headers);for(const k of ['Content-Type','Prefer','Accept'])if(req.headers.has(k))h.set(k,req.headers.get(k));const upstream=await fetch(target,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body});return new Response(upstream.body,{status:upstream.status,headers:{'Content-Type':upstream.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});}
  if(path.startsWith('/api/storage/')){const rest=path.slice('/api/storage/'.length);const [bucket,...parts]=rest.split('/');if(bucket!=='client-files'||!parts.length)return json({error:'Forbidden'},403);const objectPath=parts.map(decodeURIComponent).join('/');const fd=await req.formData(),file=fd.get('file');if(!file)return json({error:'Missing file'},400);const target=base+'/storage/v1/object/'+bucket+'/'+objectPath.split('/').map(encodeURIComponent).join('/');const up=await fetch(target,{method:'POST',headers:{...headers,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:await file.arrayBuffer()});const data=await up.json().catch(()=>({}));return json(data,up.status);}
  if(path.startsWith('/api/storage-sign/')){const rest=path.slice('/api/storage-sign/'.length);const [bucket,...parts]=rest.split('/');if(bucket!=='client-files'||!parts.length)return json({error:'Forbidden'},403);const objectPath=parts.map(decodeURIComponent).join('/');const up=await fetch(base+'/storage/v1/object/sign/'+bucket+'/'+objectPath.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:Number(url.searchParams.get('expiresIn'))||60})});const data=await up.json().catch(()=>({}));if(!up.ok)return json(data,up.status);return json({signedUrl:data.signedURL?.startsWith('http')?data.signedURL:base+'/storage/v1'+data.signedURL});}
 }
 return fetch(req);
}

export default {async fetch(req,env){
 const origin=req.headers.get('Origin')||'';
 const allowed='https://frame-studio-hub.github.io';
 const cors={'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Prefer, Accept, Authorization','Vary':'Origin'};
 if(origin && origin!==allowed)return json({error:'Forbidden'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:origin===allowed?cors:{}});
 const response=await handle(req,env);
 const headers=new Headers(response.headers);
 if(origin===allowed)for(const [k,v] of Object.entries(cors))headers.set(k,v);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
