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
function makeBladeGeometry(){
 const positions=[],uvs=[],indices=[],nu=84,nv=18;
 for(let i=0;i<=nu;i++){
  const u=i/nu;
  for(let j=0;j<=nv;j++){
   const v=j/nv*2-1;
   const radius=.22+u*1.13;
   const angle=(u*.82)+(v*.08);
   const width=Math.pow(Math.sin(Math.PI*(.06+u*.91)),.72)*(.12+.12*u);
   const side=v*width;
   const x=Math.cos(angle)*radius-Math.sin(angle)*side;
   const z=Math.sin(angle)*radius+Math.cos(angle)*side;
   const y=.14+Math.sin(u*Math.PI)*.24+v*.045+Math.sin(u*Math.PI*1.4)*.07;
   positions.push(x,y,z);uvs.push(u,j/nv);
  }
 }
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const p=i*(nv+1)+j,q=p+nv+1;indices.push(p,q,p+1,q,q+1,p+1);}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function createAether(){
 const root=new THREE.Group(),rotor=new THREE.Group(),blades=[];
 const chrome=physical(0xe7efeb,.98,.075,1),darkChrome=physical(0x879b9a,.96,.13,.8),lime=physical(0xcaff68,.72,.1,.9,{emissive:0x263d0c,emissiveIntensity:.35});
 const bladeGeo=makeBladeGeometry();
 for(let i=0;i<7;i++){
  const blade=new THREE.Group(),surface=new THREE.Mesh(bladeGeo,chrome);
  surface.rotation.y=i*Math.PI*2/7;surface.rotation.x=(i%2?-.025:.025);
  surface.castShadow=true;blade.add(surface);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(bladeGeo,42),new THREE.LineBasicMaterial({color:0xbaffef,transparent:true,opacity:.14}));
  edge.rotation.copy(surface.rotation);blade.add(edge);
  blade.rotation.y=i*Math.PI*2/7;blade.rotation.z=(i%2?-.035:.035);
  rotor.add(blade);blades.push(blade);
 }
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.27,.33,.2,96,1,false),darkChrome);hub.rotation.x=Math.PI/2;rotor.add(hub);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.19,64,48),physical(0xdffff5,.58,.045,1,{emissive:0x4e9d8a,emissiveIntensity:.48}));rotor.add(core);
 const ringA=new THREE.Mesh(new THREE.TorusGeometry(.39,.018,12,160),lime);ringA.rotation.x=Math.PI/2;rotor.add(ringA);
 const ringB=new THREE.Mesh(new THREE.TorusGeometry(.47,.006,8,180),new THREE.MeshBasicMaterial({color:0xb8d4c8,transparent:true,opacity:.48}));ringB.rotation.x=Math.PI/2;rotor.add(ringB);
 const backplate=new THREE.Mesh(new THREE.CylinderGeometry(.78,.78,.035,128),physical(0x25312f,.92,.22,.3));backplate.rotation.x=Math.PI/2;backplate.position.y=-.1;rotor.add(backplate);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(1.43,.004,6,220),new THREE.MeshBasicMaterial({color:0x8ce4d2,transparent:true,opacity:.32}));halo.rotation.x=Math.PI/2;root.add(halo);
 root.add(rotor);
 root.userData.rotor=rotor;root.userData.blades=blades;root.userData.core=core;root.userData.ring=ringA;return root;
}
function createVeil(){
 const root=new THREE.Group(),shards=[];
 const glass=physical(0xbcebe4,.04,.035,1,{transmission:.96,thickness:1.4,ior:1.53,dispersion:.16,transparent:true,opacity:.96});
 const violetGlass=physical(0xc4b9f2,.06,.055,1,{transmission:.9,thickness:1.1,ior:1.49,dispersion:.1,transparent:true,opacity:.94});
 const edgeMat=new THREE.LineBasicMaterial({color:0xd6fff4,transparent:true,opacity:.5});
 const colors=[glass,violetGlass,glass,glass,violetGlass,glass];
 for(let i=0;i<6;i++){
  const group=new THREE.Group();
  const geo=new THREE.OctahedronGeometry(1,1);
  const mesh=new THREE.Mesh(geo,colors[i]);mesh.scale.set(.24,.82,.29);mesh.rotation.z=(i%2?-.12:.12);group.add(mesh);
  const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,1),edgeMat);wire.scale.copy(mesh.scale);wire.rotation.copy(mesh.rotation);group.add(wire);
  const angle=i*Math.PI/3+.12,radius=.72;
  group.position.set(Math.cos(angle)*radius,Math.sin(i*1.7)*.12,Math.sin(angle)*radius);
  group.rotation.y=-angle+.4;group.rotation.z=(i%2?-.16:.16);
  root.add(group);shards.push(group);
 }
 const centralGeo=new THREE.IcosahedronGeometry(.53,1);
 const core=new THREE.Mesh(centralGeo,physical(0xe9fff9,.22,.035,1,{transmission:.55,thickness:1.8,ior:1.58,dispersion:.2,emissive:0x244d52,emissiveIntensity:.42}));
 root.add(core);
 const inner=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,2),physical(0xd9ffef,.7,.04,1,{emissive:0x69e7bb,emissiveIntensity:.8}));root.add(inner);
 const cage=new THREE.Group();
 for(let i=0;i<3;i++){
  const line=new THREE.Mesh(new THREE.TorusGeometry(1.38,.005,8,220),new THREE.MeshBasicMaterial({color:i===1?0xb4a7ee:0xa6e6d8,transparent:true,opacity:.28}));
  line.rotation.set(.55+i*.68,.3+i*.55,.2+i*.6);cage.add(line);
 }
 root.add(cage);
 const light=new THREE.PointLight(0x9eece0,16,5);light.position.set(0,.1,0);root.add(light);
 root.userData.shards=shards;root.userData.core=core;root.userData.inner=inner;root.userData.cage=cage;return root;
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
 if(s.kind==="aether"){o.userData.rotor.rotation.z=t*.16;o.userData.rotor.rotation.x=Math.sin(t*.32)*.08;o.userData.blades.forEach((b,i)=>{b.rotation.z=(i%2?-.035:.035)+Math.sin(t*.7+i*.8)*.018;});o.userData.core.rotation.y=t*.55;o.userData.ring.rotation.z=-t*.35;}
 if(s.kind==="membrane"){o.userData.shards.forEach((p,i)=>{p.rotation.y+=Math.sin(t*.35+i)*.0009;p.position.y=Math.sin(t*.62+i*1.1)*.045+Math.sin(i*1.7)*.12;});o.userData.core.rotation.set(t*.13,t*.2,t*.08);o.userData.inner.rotation.set(-t*.42,t*.58,t*.3);o.userData.cage.rotation.y=-t*.07;}
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
