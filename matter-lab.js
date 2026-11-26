import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/environments/RoomEnvironment.js";

const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scenes=[];
const clock=new THREE.Clock();

function physical(color,metalness=.82,roughness=.16,iridescence=.7,extra={}){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:1,clearcoatRoughness:.035,iridescence,iridescenceIOR:1.32,iridescenceThicknessRange:[190,980],side:THREE.DoubleSide,...extra});
}
function makeRibbonGeometry(pathFn,width=.3,twist=2.2,steps=260,sides=28){
 const positions=[],uvs=[],indices=[];
 const centerAt=u=>pathFn(u*Math.PI*2);
 const frameAt=u=>{
  const p=centerAt(u),p0=centerAt(u-.001),p1=centerAt(u+.001);
  const tangent=p1.sub(p0).normalize();
  let side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0));
  if(side.length()<.08)side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(1,0,0));
  side.normalize();
  const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
  return {p,side,normal};
 };
 for(let i=0;i<=steps;i++){
  const u=i/steps,{p,side,normal}=frameAt(u);
  for(let j=0;j<=sides;j++){
   const v=j/sides*2-1,angle=v*Math.PI*.5+u*Math.PI*twist;
   const w=width*(.78+.22*Math.cos(u*Math.PI*6));
   const frame=frameAt(u);
   const point=p.clone().addScaledVector(frame.side,Math.sin(angle)*w*v*.18)
    .addScaledVector(frame.normal,Math.cos(angle)*w*.62*v)
    .addScaledVector(frameAt(u).normal,Math.sin(u*Math.PI*8+v*2)*.045);
   positions.push(point.x,point.y,point.z);uvs.push(u,j/sides);
  }
 }
 for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){
  const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function curveTube(points,radius,material,closed=false){
 const curve=new THREE.CatmullRomCurve3(points,closed,"centripetal");
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,320,radius,10,closed),material);
 mesh.castShadow=true;return mesh;
}
function createAether(){
 const root=new THREE.Group();
 const chrome=physical(0xdce8e4,.98,.105,1),edge=physical(0x8de5dc,.86,.12,1),dark=physical(0x8b9ca4,.95,.2,.5);
 const path=u=>new THREE.Vector3(
  1.12*Math.cos(u)+.22*Math.cos(3*u),
  .78*Math.sin(2*u)+.12*Math.sin(5*u),
  .72*Math.sin(u+.35)
 );
 const ribbon=new THREE.Mesh(makeRibbonGeometry(path,.36,2.4),chrome);ribbon.rotation.set(.24,.12,-.2);root.add(ribbon);
 for(const sign of [-1,1]){
  const pts=[];for(let i=0;i<=240;i++){const u=i/240,p=path(u),p0=path(u-.001),p1=path(u+.001),t=p1.sub(p0).normalize(),side=new THREE.Vector3().crossVectors(t,new THREE.Vector3(0,1,0)).normalize(),normal=new THREE.Vector3().crossVectors(t,side).normalize();pts.push(p.addScaledVector(normal,sign*.22));}
  const rail=curveTube(pts,.012,sign>0?edge:dark,true);rail.rotation.copy(ribbon.rotation);root.add(rail);
 }
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,3),physical(0xdffff6,.62,.07,.9,{emissive:0x164b48,emissiveIntensity:.5}));root.add(core);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.34,48,32),new THREE.MeshBasicMaterial({color:0x80e7d5,transparent:true,opacity:.055,side:THREE.BackSide}));root.add(halo);
 root.userData.ribbon=ribbon;root.userData.core=core;return root;
}
function createVeil(){
 const root=new THREE.Group(),petals=[];
 const glass=physical(0xa6e5e2,.08,.035,1,{transmission:.94,thickness:1.15,ior:1.52,dispersion:.12,transparent:true,opacity:.96});
 const glassLilac=physical(0xc7b6fa,.12,.055,1,{transmission:.82,thickness:.85,ior:1.48,dispersion:.08,transparent:true,opacity:.9});
 const edgeMat=new THREE.MeshBasicMaterial({color:0xb9fff0,transparent:true,opacity:.5});
 for(let k=0;k<5;k++){
  const group=new THREE.Group(),positions=[],uvs=[],indices=[],nu=100,nv=24;
  for(let i=0;i<=nu;i++){
   const u=i/nu;
   for(let j=0;j<=nv;j++){
    const v=j/nv*2-1;
    const taper=Math.pow(Math.sin(Math.PI*u),.72);
    const x=(u-.5)*1.85;
    const y=taper*(.18+.27*Math.cos(v*Math.PI*.5))+v*.055;
    const z=v*(.34+.13*Math.sin(Math.PI*u))+.12*Math.sin(u*Math.PI*2+k*.35)*taper;
    positions.push(x,y,z);uvs.push(u,j/nv);
   }
  }
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,k%2?glassLilac:glass);mesh.rotation.z=(k-2)*.14;mesh.rotation.y=(k-2)*.38;mesh.position.y=(k-2)*.055;mesh.scale.set(1,1,.92+k*.025);group.add(mesh);
  const edgeGeo=new THREE.EdgesGeometry(geo,28);const lines=new THREE.LineSegments(edgeGeo,edgeMat);lines.rotation.copy(mesh.rotation);lines.position.copy(mesh.position);lines.scale.copy(mesh.scale);group.add(lines);
  root.add(group);petals.push(group);
 }
 const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.24,2),physical(0xf0fffc,.38,.045,1,{emissive:0x235c62,emissiveIntensity:.35}));root.add(gem);
 const halo=new THREE.PointLight(0x8eece4,8,4);halo.position.set(0,0,1.1);root.add(halo);
 root.userData.petals=petals;root.userData.gem=gem;return root;
}
function makeTwistedBand(radius,tube,twist,material,segments=240){
 const positions=[],indices=[],uvs=[],major=segments,minor=28;
 for(let i=0;i<=major;i++){
  const u=i/major*Math.PI*2;
  for(let j=0;j<=minor;j++){
   const v=j/minor*Math.PI*2,phase=v+twist*u*.5;
   const rr=radius+tube*Math.cos(phase);
   const x=rr*Math.cos(u),y=tube*Math.sin(phase),z=rr*Math.sin(u);
   positions.push(x,y,z);uvs.push(i/major,j/minor);
  }
 }
 for(let i=0;i<major;i++)for(let j=0;j<minor;j++){const a=i*(minor+1)+j,b=a+minor+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return new THREE.Mesh(geo,material);
}
function createVector(){
 const root=new THREE.Group(),bands=[];
 const titanium=physical(0xdce5df,.96,.17,.65),black=physical(0x71888b,.92,.13,.75),lime=physical(0xcaff68,.76,.12,.9,{emissive:0x263c0c,emissiveIntensity:.35});
 const specs=[{r:1.02,t:.075,tw:2,rot:[.35,.2,.15],mat:titanium},{r:.86,t:.055,tw:3,rot:[1.05,.75,-.55],mat:black},{r:1.18,t:.035,tw:1,rot:[.85,-.45,.9],mat:lime}];
 specs.forEach((s,i)=>{const group=new THREE.Group(),band=makeTwistedBand(s.r,s.t,s.tw,s.mat);band.rotation.set(...s.rot);group.add(band);root.add(group);bands.push(group);});
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,3),physical(0xe7fff2,.58,.055,.8,{emissive:0x6bffb7,emissiveIntensity:.7}));root.add(core);
 const satellites=[];
 for(let i=0;i<4;i++){
  const node=new THREE.Mesh(new THREE.SphereGeometry(i===0?.075:.045,28,20),i===0?lime:titanium);
  root.add(node);satellites.push(node);
 }
 const guides=new THREE.Group();
 for(let i=0;i<3;i++){
  const torus=new THREE.Mesh(new THREE.TorusGeometry(1.38+i*.08,.006,8,220),new THREE.MeshBasicMaterial({color:i===1?0xb7c4be:0x6f8e88,transparent:true,opacity:.48}));
  torus.rotation.set(i*.8,.5+i*.45,i*.35);guides.add(torus);
 }
 root.add(guides);root.userData.bands=bands;root.userData.core=core;root.userData.satellites=satellites;root.userData.guides=guides;return root;
}
function dust(){
 const count=220,arr=new Float32Array(count*3);let seed=713;
 const rand=()=>{seed=seed*48271%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){const r=1.9+rand()*1.05,a=rand()*Math.PI*2,b=(rand()-.5)*Math.PI;arr.set([Math.cos(a)*Math.cos(b)*r,Math.sin(b)*r,Math.sin(a)*Math.cos(b)*r],i*3);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(arr,3));
 return new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5ddd5,size:.009,transparent:true,opacity:.34,sizeAttenuation:true}));
}
function init(canvas){
 const kind=canvas.dataset.sculpture;
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);camera.position.set(0,0,kind==="aether"?4.05:4.25);
 const key=new THREE.DirectionalLight(0xfff8ed,4.1);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x80e9db,5.5);rim.position.set(4,1,-3);scene.add(rim);
 const violet=new THREE.PointLight(0x9c86ed,18,8);violet.position.set(-2,-1,2);scene.add(violet);
 const soft=new THREE.PointLight(0xe0fff1,13,8);soft.position.set(1,3,1);scene.add(soft);
 const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),.04).texture;env.dispose();
 const object=kind==="aether"?createAether():kind==="membrane"?createVeil():createVector();scene.add(object);
 const particles=dust();scene.add(particles);
 const state={canvas,renderer,scene,camera,object,particles,visible:false,kind,playing:!reducedMotion,time:0,px:0,py:0,tx:0,ty:0,dragging:false,lastX:0,lastY:0,dragX:0,dragY:0,speed:1};
 const resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 canvas.addEventListener("pointerdown",e=>{if(e.button!==0)return;state.dragging=true;state.lastX=e.clientX;state.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener("pointermove",e=>{
  if(state.dragging){const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;state.dragY+=dx*.008;state.dragX+=dy*.008;state.lastX=e.clientX;state.lastY=e.clientY;}
  else{const r=canvas.getBoundingClientRect();state.tx=((e.clientX-r.left)/r.width-.5)*.28;state.ty=((e.clientY-r.top)/r.height-.5)*.22;}
 },{passive:true});
 const release=()=>{state.dragging=false;state.tx=0;state.ty=0;};canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",release);canvas.addEventListener("lostpointercapture",release);
 canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();canvas.closest(".matter-card")?.classList.add("matter-context-lost");});
 state.resize=resize;state.ro=ro;return state;
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=scenes.find(x=>x.canvas===e.target);if(s)s.visible=e.isIntersecting;}},{rootMargin:"180px"});
for(const canvas of document.querySelectorAll(".matter-canvas")){try{const s=init(canvas);scenes.push(s);observer.observe(canvas);}catch(error){canvas.closest(".matter-card")?.classList.add("matter-fallback");console.error("FRAME Matter:",error);}}
const grid=document.querySelector("#matter-grid"),cards=[...document.querySelectorAll("[data-matter-card]")];
function resizeAll(){scenes.forEach(s=>s.resize());}
function selectCard(card){
 const close=card.classList.contains("is-selected");cards.forEach(c=>c.classList.remove("is-selected"));
 if(!close){card.classList.add("is-selected");grid.classList.add("has-selection");}else grid.classList.remove("has-selection");
 requestAnimationFrame(resizeAll);
}
cards.forEach(card=>{
 card.querySelector(".matter-select")?.addEventListener("click",()=>selectCard(card));
 const state=scenes.find(s=>s.canvas===card.querySelector("canvas"));
 const toggle=card.querySelector("[data-motion-toggle]");
 if(state&&toggle)toggle.textContent=state.playing?"PAUSE MOTION":"PLAY MOTION";
 toggle?.addEventListener("click",()=>{if(!state)return;state.playing=!state.playing;toggle.textContent=state.playing?"PAUSE MOTION":"PLAY MOTION";toggle.setAttribute("aria-pressed",String(!state.playing));});
 card.querySelector("[data-view-reset]")?.addEventListener("click",()=>{if(!state)return;state.object.rotation.set(0,0,0);state.dragX=state.dragY=0;state.tx=state.ty=state.px=state.py=0;state.camera.position.set(0,0,state.kind==="aether"?4.05:4.25);state.camera.lookAt(0,0,0);});
});
document.querySelector("#matter-reset")?.addEventListener("click",()=>{cards.forEach(c=>c.classList.remove("is-selected"));grid.classList.remove("has-selection");resizeAll();});
function animateObject(s,dt){
 const t=s.time,o=s.object;
 if(s.kind==="aether"){o.userData.ribbon.rotation.z=Math.sin(t*.42)*.13;o.userData.ribbon.rotation.x=.24+Math.sin(t*.31)*.08;o.userData.core.rotation.y=t*.4;}
 if(s.kind==="membrane"){o.userData.petals.forEach((p,i)=>{p.rotation.y=(i-2)*.38+Math.sin(t*.48+i*.8)*.09;p.rotation.z=(i-2)*.14+Math.cos(t*.36+i*.65)*.035;});o.userData.gem.rotation.set(t*.22,t*.34,t*.16);}
 if(s.kind==="orbit"){o.userData.bands.forEach((b,i)=>{b.rotation.y=t*(i%2?.18:-.13)*(i+1);b.rotation.x=Math.sin(t*.25+i)*.07;});o.userData.core.rotation.set(t*.35,t*.5,t*.22);o.userData.satellites.forEach((n,i)=>{const a=t*(.35+i*.09)+i*Math.PI*.5,r=1.34+(i%2)*.13;n.position.set(Math.cos(a)*r,Math.sin(a*1.7+i)*.22,Math.sin(a)*r);});o.userData.guides.rotation.y=-t*.045;}
}
let last=performance.now();
function render(now){
 const dt=Math.min(.04,(now-last)/1000||0);last=now;
 for(const s of scenes){
  if(!s.visible)continue;
  if(s.playing){s.time+=dt;s.particles.rotation.y=-s.time*.012;animateObject(s,dt);}
  s.px+=(s.tx-s.px)*.055;s.py+=(s.ty-s.py)*.055;
  s.object.rotation.y=s.time*(s.kind==="aether"?.105:.075)+s.dragY+s.px*.045;
  s.object.rotation.x=Math.sin(s.time*.22)*.055+s.dragX+s.py*.04;
  s.object.rotation.z=Math.sin(s.time*.16)*.025;
  s.renderer.render(s.scene,s.camera);
 }
 requestAnimationFrame(render);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)resizeAll();});
window.addEventListener("pagehide",()=>scenes.forEach(s=>s.ro?.disconnect()),{once:true});
requestAnimationFrame(render);
