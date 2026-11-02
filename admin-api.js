// Same-origin API client. All privileged Supabase credentials stay in Cloudflare Worker secrets.
class Query {
  constructor(table){this.table=table;this.method='GET';this.body=null;this.params=new URLSearchParams();this.single=false;this.returning=false;}
  select(cols='*'){this.params.set('select',cols);this.returning=true;return this;}
  order(col,{ascending=true}={}){this.params.set('order',`${col}.${ascending?'asc':'desc'}`);return this;}
  eq(col,val){this.params.append(col,`eq.${val}`);return this;}
  insert(body){this.method='POST';this.body=body;return this;}
  update(body){this.method='PATCH';this.body=body;return this;}
  delete(){this.method='DELETE';return this;}
  async maybeSingle(){this.single=true;const r=await this.run();return {data:Array.isArray(r.data)?r.data[0]||null:r.data,error:r.error};}
  then(resolve,reject){return this.run().then(resolve,reject);}
  async run(){try{const q=this.params.toString();const res=await fetch(`/api/rest/v1/${this.table}${q?'?'+q:''}`,{method:this.method,credentials:'same-origin',headers:{'Content-Type':'application/json','Prefer':this.returning?'return=representation':'return=minimal'},body:this.body?JSON.stringify(this.body):undefined});const data=res.status===204?null:await res.json().catch(()=>null);if(!res.ok)return {data:null,error:{message:data?.message||data?.error||`HTTP ${res.status}`}};return {data,error:null};}catch(e){return {data:null,error:{message:e.message}}}}
}
export const db={from:t=>new Query(t),auth:{getUser:async()=>({data:{user:window.__FRAME_ADMIN__||null}}),getSession:async()=>({data:{session:window.__FRAME_ADMIN__?{}:null}}),signOut:async()=>{await fetch('/auth/logout',{method:'POST',credentials:'same-origin'});return {error:null}}},storage:{from:bucket=>({upload:async(path,file)=>{const fd=new FormData();fd.append('file',file);const r=await fetch(`/api/storage/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',body:fd,credentials:'same-origin'});const j=await r.json().catch(()=>({}));return r.ok?{data:j,error:null}:{data:null,error:{message:j.error||'Upload failed'}}},createSignedUrl:async(path,expiresIn)=>{const r=await fetch(`/api/storage-sign/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}?expiresIn=${expiresIn}`,{method:'POST',credentials:'same-origin'});const j=await r.json();return r.ok?{data:{signedUrl:j.signedUrl},error:null}:{data:null,error:{message:j.error||'Could not create download link'}}}})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};
