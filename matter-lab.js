import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/environments/RoomEnvironment.js";

const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scenes=[];
const clock=new THREE.Clock();

function physical(color,opts={}){
 return new THREE.MeshPhysicalMaterial({
  color,metalness:opts.metalness??.88,roughness:opts.roughness??.16,
  clearcoat:1,clearcoatRoughness:.045,iridescence:opts.iridescence??1,
  iridescenceIOR:1.32,iridescenceThicknessRange:opts.thickness??[180,950],
  reflectivity:1,side:THREE.DoubleSide
 });
}
function curveTube(points,r,mat,closed=true,segments=900,radial=20){
 const path=new THREE.CatmullRomCurve3(points,closed,"centripetal");
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,segments,r,radial,closed),mat);
 mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function braidedRibbon({turns=2.4,phase=0,width=.2,mat,detail=520}){
 const rows=detail,cols=32,positions=[],indices=[];
 for(let i=0;i<=rows;i++){
  const u=i/rows*Math.PI*2*turns;
  const major=1.05+.19*Math.cos(3*u/turns+phase)+.06*Math.sin(7*u/turns+phase);
  const angle=u+phase;
  const center=new THREE.Vector3(major*Math.cos(angle),.42*Math.sin(2*angle+phase)+.12*Math.sin(5*angle),major*Math.sin(angle));
  const tangent=new THREE.Vector3(-Math.sin(angle),.34*Math.cos(2*angle+phase),Math.cos(angle)).normalize();
  const side=new THREE.Vector3(Math.cos(angle),.15*Math.sin(3*angle+phase),Math.sin(angle)).normalize();
  const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
  const twist=angle*1.55+phase;
  const wdir=side.multiplyScalar(Math.cos(twist)).add(normal.multiplyScalar(Math.sin(twist))).normalize();
  const w=width*(.76+.24*Math.sin(5*angle+phase)**2);
  for(let j=0;j<=cols;j++){
   const v=j/cols*2-1;
   const p=center.clone().addScaledVector(wdir,v*w);
   p.addScaledVector(normal,.025*Math.cos(v*Math.PI*5+angle*3));
   positions.push(p.x,p.y,p.z);
   if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function createAether(){
 const g=new THREE.Group();
 const chrome=physical(0xcbdcda,{roughness:.12,thickness:[240,1050]});
 const opal=physical(0xb8a7ee,{roughness:.19,thickness:[320,1000]});
 const cyan=physical(0x72d8d0,{metalness:.76,roughness:.13,thickness:[120,780]});
 const warm=physical(0xe8d9c5,{metalness:.9,roughness:.2,iridescence:.72});
 for(let k=0;k<4;k++){
  const m=[chrome,opal,cyan,warm][k];
  const ribbon=braidedRibbon({turns:2.12,width:[.17,.125,.095,.072][k],phase:k*Math.PI*.5,mat:m,detail:560});
  ribbon.rotation.set(k*.18,k*.34,k*.22);g.add(ribbon);
 }
 const knot=new THREE.Mesh(new THREE.TorusKnotGeometry(.55,.055,420,24,3,7),physical(0xd8e8e1,{roughness:.11,thickness:[180,920]}));
 knot.rotation.set(.6,.2,.4);g.add(knot);
 for(let k=0;k<3;k++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.37+k*.12,.012-k*.002,10,260),k===1?opal:chrome);
  ring.rotation.set(.6+k*.51,.35+k*.42,.18+k*.72);g.add(ring);
 }
 // Micro-spheres trace selected intersections and give the sculpture scale.
 for(let i=0;i<42;i++){
  const t=i/42*Math.PI*2,r=1.05+.19*Math.cos(3*t*2.12);
  const bead=new THREE.Mesh(new THREE.SphereGeometry(i%7===0?.027:.012,12,10),i%3===0?cyan:chrome);
  bead.position.set(r*Math.cos(t*2.12),.42*Math.sin(2*t*2.12),r*Math.sin(t*2.12));g.add(bead);
 }
 return g;
}
function createMembrane(){
 const g=new THREE.Group(),glass=physical(0x9ddde0,{metalness:.48,roughness:.085,iridescence:1,thickness:[400,1200]});
 const edge=physical(0xe2d2ff,{metalness:.9,roughness:.11});
 for(let k=0;k<3;k++){
  const sheet=braidedRibbon({turns:1.15+k*.22,width:.25-k*.045,phase:k*2.1,mat:k===1?edge:glass,detail:380});
  sheet.scale.set(1.08-k*.12,.8+k*.16,1.08-k*.1);sheet.rotation.set(k*.6,k*.8,k*.32);g.add(sheet);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(.31,64,48),physical(0x9ac9d0,{roughness:.09,metalness:.35,thickness:[500,1300]}));
 core.scale.set(.78,1.15,.78);g.add(core);
 return g;
}
function createOrbit(){
 const g=new THREE.Group(),mats=[physical(0xcbd8d0,{roughness:.14}),physical(0x9c8bd1,{roughness:.17}),physical(0x75c9bd,{roughness:.12})];
 for(let k=0;k<7;k++){
  const pts=[];
  for(let i=0;i<460;i++){
   const t=i/460*Math.PI*2,rad=.82+.16*Math.cos((k%3+2)*t+k*.8);
   pts.push(new THREE.Vector3(rad*Math.cos(t+k*.37),.48*Math.sin((k%3+1)*t+k),rad*Math.sin(t+k*.37)));
  }
  g.add(curveTube(pts,.018+(k%3)*.008,mats[k%3],true,900,12));
 }
 for(let k=0;k<4;k++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.8+k*.17,.012,10,240),mats[(k+1)%3]);
  ring.rotation.set(.4+k*.48,.7-k*.21,.25+k*.52);g.add(ring);
 }
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.23,4),physical(0xe1e9df,{roughness:.1,thickness:[200,850]}));g.add(core);
 return g;
}
function dustField(){
 const count=360,arr=new Float32Array(count*3);let seed=17391;
 const random=()=>{seed=seed*48271%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){const r=1.9+random()*1.5,a=random()*Math.PI*2,b=(random()-.5)*Math.PI;arr[i*3]=Math.cos(a)*Math.cos(b)*r;arr[i*3+1]=Math.sin(b)*r*.8;arr[i*3+2]=Math.sin(a)*Math.cos(b)*r;}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(arr,3));
 return new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5ddd5,size:.009,transparent:true,opacity:.38,sizeAttenuation:true}));
}
function init(canvas){
 const kind=canvas.dataset.sculpture;
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,40);
 camera.position.set(0,.04,kind==="aether"?4.7:4.4);
 const key=new THREE.DirectionalLight(0xfff5e9,3.5);key.position.set(-3.5,4.5,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x83e5df,4.2);rim.position.set(4,1,-4);scene.add(rim);
 const violet=new THREE.PointLight(0x9675ff,24,8);violet.position.set(-2,-1.4,2.5);scene.add(violet);
 const soft=new THREE.PointLight(0xe0fff1,13,7);soft.position.set(1.5,3,1);scene.add(soft);
 const lower=new THREE.PointLight(0x63a6cb,8,6);lower.position.set(0,-3,2);scene.add(lower);
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.035).texture;pmrem.dispose();
 const object=kind==="aether"?createAether():kind==="membrane"?createMembrane():createOrbit();
 object.scale.setScalar(kind==="aether"?1.02:kind==="membrane"?.91:.95);scene.add(object);
 const dust=dustField();scene.add(dust);
 const state={canvas,renderer,scene,camera,object,dust,visible:false,px:0,py:0,tx:0,ty:0,kind};
 const resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();state.tx=((e.clientX-r.left)/r.width-.5)*.72;state.ty=((e.clientY-r.top)/r.height-.5)*.5;},{passive:true});
 canvas.addEventListener("pointerleave",()=>{state.tx=0;state.ty=0;},{passive:true});
 canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();canvas.closest(".matter-card")?.classList.add("matter-context-lost");});
 canvas.addEventListener("webglcontextrestored",()=>canvas.closest(".matter-card")?.classList.remove("matter-context-lost"));
 state.resize=resize;state.ro=ro;return state;
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=scenes.find(x=>x.canvas===e.target);if(s)s.visible=e.isIntersecting;}},{rootMargin:"220px 0px"});
for(const canvas of document.querySelectorAll(".matter-canvas")){
 try{const s=init(canvas);scenes.push(s);observer.observe(canvas);canvas.closest(".matter-card")?.classList.add("matter-ready");}
 catch(error){canvas.closest(".matter-card")?.classList.add("matter-fallback");console.error("FRAME Matter engine:",error);}
}
function render(){
 const t=clock.getElapsedTime();
 for(const s of scenes){
  if(!s.visible)continue;
  s.px+=(s.tx-s.px)*.045;s.py+=(s.ty-s.py)*.045;
  if(!reducedMotion){
   const speed=s.kind==="aether"?.12:.17;
   s.object.rotation.y=t*speed+s.px;s.object.rotation.x=Math.sin(t*.21)*.11+s.py;s.object.rotation.z=Math.sin(t*.14)*.055;
   s.dust.rotation.y=-t*.012;
  }
  s.renderer.render(s.scene,s.camera);
 }
 requestAnimationFrame(render);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)scenes.forEach(s=>s.resize());});
window.addEventListener("pagehide",()=>scenes.forEach(s=>s.ro?.disconnect()),{once:true});
requestAnimationFrame(render);
