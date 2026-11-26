import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/environments/RoomEnvironment.js";

const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scenes=[];
const clock=new THREE.Clock();

function mat(color,metalness=.8,roughness=.17,iridescence=.8){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:1,clearcoatRoughness:.045,iridescence,iridescenceIOR:1.32,iridescenceThicknessRange:[180,980],side:THREE.DoubleSide});
}
function tube(points,radius,material,closed=false,segments=260){
 const path=new THREE.CatmullRomCurve3(points,closed,"centripetal");
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,segments,radius,12,closed),material);
 mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function ring(radius,tubeRadius,material,rotation=[0,0,0]){
 const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tubeRadius,18,240),material);
 mesh.rotation.set(...rotation);mesh.castShadow=true;return mesh;
}
function createAether(){
 const g=new THREE.Group();
 const silver=mat(0xd5e1df,.94,.12,1), pearl=mat(0x9bbfc1,.72,.1,1), violet=mat(0x9583c6,.82,.16,1);
 // A single elegant toroidal knot, accented by two fine metal filaments.
 const body=new THREE.Mesh(new THREE.TorusKnotGeometry(.78,.205,420,36,2,5),silver);
 body.rotation.set(.35,.2,-.18);body.scale.set(1.18,.92,1);g.add(body);
 const inner=new THREE.Mesh(new THREE.TorusKnotGeometry(.76,.045,360,18,2,5),pearl);
 inner.rotation.set(.35,.2,-.18);inner.scale.set(1.18,.92,1);g.add(inner);
 const orbit1=ring(1.27,.012,pearl,[.85,.18,.42]);orbit1.scale.set(1,.84,1);g.add(orbit1);
 const orbit2=ring(1.38,.009,violet,[1.1,.8,-.4]);g.add(orbit2);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.12,40,32),mat(0xeaf3ed,.4,.08,.35));g.add(core);
 return g;
}
function createVeil(){
 const g=new THREE.Group();
 const glass=new THREE.MeshPhysicalMaterial({color:0x9bd8d7,metalness:.12,roughness:.055,transmission:.72,thickness:1.4,ior:1.48,clearcoat:1,clearcoatRoughness:.025,iridescence:1,iridescenceIOR:1.3,iridescenceThicknessRange:[280,1100],side:THREE.DoubleSide});
 const edge=mat(0xd8c7ff,.86,.1,1);
 // Three smooth, offset glass shells form a restrained folded crystal.
 for(let k=0;k<3;k++){
  const geo=new THREE.IcosahedronGeometry(.82-k*.13,k===0?3:2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   const f=1+.12*Math.sin(y*5+k)*Math.cos(x*4+z*3);
   pos.setXYZ(i,x*f,y*f,z*f);
  }
  geo.computeVertexNormals();
  const shell=new THREE.Mesh(geo,k===1?edge:glass);
  shell.scale.set(1.02-k*.12,1.18-k*.1,.76+k*.1);
  shell.rotation.set(.25+k*.4,.5+k*.55,.2-k*.22);
  shell.position.y=(k-1)*.07;g.add(shell);
  const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,18),new THREE.LineBasicMaterial({color:k===1?0xd7caff:0xb5eeeb,transparent:true,opacity:.22}));
  wire.scale.copy(shell.scale);wire.rotation.copy(shell.rotation);wire.position.copy(shell.position);g.add(wire);
 }
 const nucleus=new THREE.Mesh(new THREE.OctahedronGeometry(.19,2),mat(0xe4e9ed,.55,.08,.8));g.add(nucleus);
 return g;
}
function createOrbit(){
 const g=new THREE.Group(),titanium=mat(0xd3ded8,.96,.2,.55),dark=mat(0x718f91,.88,.13,.8),accent=mat(0xb4a2e6,.86,.12,1);
 // Three broad, clean orbital planes with fine inner guide rails.
 const specs=[[1.03,.13,.35],[1.18,1.08,-.58],[.92,.62,1.28]];
 specs.forEach((v,i)=>{const r=ring(v[0],i===0?.025:.017,[titanium,dark,accent][i],[v[1],v[2],i*.58]);g.add(r);});
 for(let i=0;i<4;i++){
  const pts=[];
  for(let j=0;j<=180;j++){const t=j/180*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*(1.28+i*.055),Math.sin(t*2+i)*.07,Math.sin(t)*(1.28+i*.055)));}
  g.add(tube(pts,.006,i%2?accent:titanium,false,220));
 }
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,3),mat(0xe4eee8,.7,.1,.7));g.add(core);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.4,48,32),new THREE.MeshBasicMaterial({color:0x81d8cd,transparent:true,opacity:.055,side:THREE.BackSide}));g.add(halo);
 return g;
}
function dust(){
 const count=180,arr=new Float32Array(count*3);let seed=713;
 const rand=()=>{seed=seed*48271%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){const r=1.7+rand()*1.1,a=rand()*Math.PI*2,b=(rand()-.5)*Math.PI;arr.set([Math.cos(a)*Math.cos(b)*r,Math.sin(b)*r,Math.sin(a)*Math.cos(b)*r],i*3);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(arr,3));
 return new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5ddd5,size:.008,transparent:true,opacity:.3,sizeAttenuation:true}));
}
function init(canvas){
 const kind=canvas.dataset.sculpture;
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,30);
 camera.position.set(0,0,kind==="aether"?4.15:4.25);
 const key=new THREE.DirectionalLight(0xfff8ed,3.2);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x83e5df,4.5);rim.position.set(4,1,-3);scene.add(rim);
 const violet=new THREE.PointLight(0x9980ed,17,7);violet.position.set(-2,-1,2);scene.add(violet);
 const soft=new THREE.PointLight(0xe0fff1,10,7);soft.position.set(1,3,1);scene.add(soft);
 const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),.04).texture;env.dispose();
 const object=kind==="aether"?createAether():kind==="membrane"?createVeil():createOrbit();
 object.scale.setScalar(kind==="aether"?1.02:kind==="membrane"?.98:1);scene.add(object);
 const particles=dust();scene.add(particles);
 const state={canvas,renderer,scene,camera,object,particles,visible:false,px:0,py:0,tx:0,ty:0,kind};
 const resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();state.tx=((e.clientX-r.left)/r.width-.5)*.55;state.ty=((e.clientY-r.top)/r.height-.5)*.4;},{passive:true});
 canvas.addEventListener("pointerleave",()=>{state.tx=0;state.ty=0;},{passive:true});
 canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();canvas.closest(".matter-card")?.classList.add("matter-context-lost");});
 state.resize=resize;state.ro=ro;return state;
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=scenes.find(x=>x.canvas===e.target);if(s)s.visible=e.isIntersecting;}},{rootMargin:"180px"});
for(const canvas of document.querySelectorAll(".matter-canvas")){
 try{const s=init(canvas);scenes.push(s);observer.observe(canvas);}
 catch(error){canvas.closest(".matter-card")?.classList.add("matter-fallback");console.error("FRAME Matter:",error);}
}
const grid=document.querySelector("#matter-grid");
const cards=[...document.querySelectorAll("[data-matter-card]")];
function selectCard(card){
 const wasSelected=card.classList.contains("is-selected");
 cards.forEach(c=>c.classList.remove("is-selected"));
 if(!wasSelected){card.classList.add("is-selected");grid.classList.add("has-selection");}
 else grid.classList.remove("has-selection");
 scenes.forEach(s=>s.resize());
}
cards.forEach(card=>card.querySelector(".matter-select")?.addEventListener("click",()=>selectCard(card)));
document.querySelector("#matter-reset")?.addEventListener("click",()=>{cards.forEach(c=>c.classList.remove("is-selected"));grid.classList.remove("has-selection");scenes.forEach(s=>s.resize());});
function render(){
 const t=clock.getElapsedTime();
 for(const s of scenes){
  if(!s.visible)continue;
  s.px+=(s.tx-s.px)*.045;s.py+=(s.ty-s.py)*.045;
  if(!reducedMotion){s.object.rotation.y=t*(s.kind==="aether"?.13:.1)+s.px;s.object.rotation.x=Math.sin(t*.22)*.09+s.py;s.object.rotation.z=Math.sin(t*.16)*.035;s.particles.rotation.y=-t*.009;}
  s.renderer.render(s.scene,s.camera);
 }
 requestAnimationFrame(render);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)scenes.forEach(s=>s.resize());});
window.addEventListener("pagehide",()=>scenes.forEach(s=>s.ro?.disconnect()),{once:true});
requestAnimationFrame(render);
