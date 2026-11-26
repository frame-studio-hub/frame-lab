import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/environments/RoomEnvironment.js";
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock=new THREE.Clock(),renderers=[];
function metal(color,o={}){return new THREE.MeshPhysicalMaterial({color,metalness:o.metalness??.82,roughness:o.roughness??.19,clearcoat:1,clearcoatRoughness:.08,iridescence:o.iridescence??.78,iridescenceIOR:1.32,iridescenceThicknessRange:o.thickness??[120,720],reflectivity:1,side:THREE.DoubleSide});}
function tube(points,radius,material,segments=900,radial=24){const curve=new THREE.CatmullRomCurve3(points,true,"centripetal");const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,radial,true),material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function helixSculpture(){
 const g=new THREE.Group(),silver=metal(0xc8e2e2,{roughness:.14,thickness:[160,850]}),pearl=metal(0xd8c7f4,{roughness:.2,iridescence:1,thickness:[220,900]}),cyan=metal(0x73d7d4,{roughness:.17,thickness:[100,600]}),p=[],q=[];
 for(let i=0;i<520;i++){const t=i/520*Math.PI*2,r=1+.29*Math.cos(3*t),r2=.83+.2*Math.cos(3*t+Math.PI);p.push(new THREE.Vector3(r*Math.cos(2*t),.34*Math.sin(3*t),r*Math.sin(2*t)));q.push(new THREE.Vector3(r2*Math.cos(2*t+Math.PI),.28*Math.sin(3*t+Math.PI),r2*Math.sin(2*t+Math.PI)));}
 g.add(tube(p,.145,silver,1200,28),tube(q,.105,pearl,1100,22));
 const a=new THREE.Mesh(new THREE.TorusGeometry(1.31,.018,10,220),cyan);a.rotation.set(.95,.3,.45);g.add(a);
 const b=new THREE.Mesh(new THREE.TorusGeometry(1.17,.012,8,220),silver);b.rotation.set(.25,1.12,.9);g.add(b);
 for(let i=0;i<18;i++){const t=i/18*Math.PI*2,r=1+.29*Math.cos(3*t),bead=new THREE.Mesh(new THREE.SphereGeometry(.035,18,14),i%2?cyan:silver);bead.position.set(r*Math.cos(2*t),.34*Math.sin(3*t),r*Math.sin(2*t));g.add(bead);}
 return g;
}
function ribbonGeometry(){
 const U=420,V=44,p=[],idx=[];
 for(let i=0;i<=U;i++){const u=i/U*Math.PI*2,R=.98+.13*Math.cos(3*u)+.045*Math.sin(7*u),center=new THREE.Vector3(R*Math.cos(u),.17*Math.sin(2*u),R*Math.sin(u)),radial=new THREE.Vector3(Math.cos(u),0,Math.sin(u)),up=new THREE.Vector3(0,1,0),twist=u+.16*Math.sin(3*u),widthDir=radial.multiplyScalar(Math.cos(twist)).add(up.multiplyScalar(Math.sin(twist))).normalize(),width=.34*(1+.13*Math.sin(4*u));
 for(let j=0;j<=V;j++){const v=j/V*2-1,pt=center.clone().addScaledVector(widthDir,v*width);pt.y+=.035*Math.sin(8*u+v*2);p.push(pt.x,pt.y,pt.z);if(i<U&&j<V){const a=i*(V+1)+j,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1);}}}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function ribbonSculpture(){const g=new THREE.Group(),glass=metal(0x9ad9e0,{metalness:.68,roughness:.11,iridescence:1,thickness:[260,1000]}),edge=metal(0xe4d5ff,{metalness:.9,roughness:.12,iridescence:.85}),sheet=new THREE.Mesh(ribbonGeometry(),glass);sheet.castShadow=true;sheet.receiveShadow=true;g.add(sheet);const a=new THREE.Mesh(new THREE.TorusGeometry(1.03,.014,8,240),edge);a.rotation.set(.8,.15,.25);g.add(a);const b=new THREE.Mesh(new THREE.TorusGeometry(.78,.011,8,220),glass);b.rotation.set(1.2,.85,.5);g.add(b);return g;}
function latticeSculpture(){
 const g=new THREE.Group(),m=[metal(0xc7ddd5,{roughness:.15,thickness:[150,760]}),metal(0xb9a8ed,{roughness:.18,iridescence:1,thickness:[250,900]}),metal(0x80c7c5,{roughness:.13,thickness:[120,650]})];
 for(let k=0;k<3;k++){const pts=[];for(let i=0;i<460;i++){const t=i/460*Math.PI*2,R=.82+.19*Math.cos(4*t+k*2.094),x=R*Math.cos(t+k*2.094),z=R*Math.sin(t+k*2.094),y=.43*Math.sin(2*t+k*1.7)+.12*Math.cos(5*t-k);pts.push(new THREE.Vector3(x,y,z));}g.add(tube(pts,.075+k*.012,m[k],1100,18));}
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.92+i*.12,.012,8,220),m[(i+1)%3]);ring.rotation.set(.45+i*.47,.65-i*.25,.2+i*.7);g.add(ring);}
 g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.19,3),metal(0xe5ece3,{roughness:.1,iridescence:.55})));return g;
}
function particleField(){const n=260,a=new Float32Array(n*3);let seed=9341;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};for(let i=0;i<n;i++){const r=1.7+rand()*1.25,theta=rand()*Math.PI*2,phi=(rand()-.5)*Math.PI;a[i*3]=Math.cos(theta)*Math.cos(phi)*r;a[i*3+1]=Math.sin(phi)*r*.75;a[i*3+2]=Math.sin(theta)*Math.cos(phi)*r;}const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(a,3));return new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5d8d0,size:.012,transparent:true,opacity:.42,sizeAttenuation:true}));}
function build(canvas){
 const kind=canvas.dataset.sculpture,renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,.05,4.65);
 const key=new THREE.DirectionalLight(0xfff5e9,3.2);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x8bdedc,3.8);rim.position.set(4,1,-4);scene.add(rim);
 const violet=new THREE.PointLight(0x9a75ff,22,8);violet.position.set(-2,-1,2);scene.add(violet);
 const soft=new THREE.PointLight(0xd7ffef,12,7);soft.position.set(1,3,1);scene.add(soft);
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
 const object=kind==="helix"?helixSculpture():kind==="ribbon"?ribbonSculpture():latticeSculpture();object.scale.setScalar(kind==="ribbon"?.94:kind==="lattice"?.91:.88);scene.add(object);
 const dust=particleField();scene.add(dust);
 const s={renderer,scene,camera,object,dust,canvas,visible:false,px:0,py:0,tx:0,ty:0,resize:null};
 s.resize=()=>{const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 const ro=new ResizeObserver(s.resize);ro.observe(canvas);s.resize();
 canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();s.tx=((e.clientX-r.left)/r.width-.5)*.72;s.ty=((e.clientY-r.top)/r.height-.5)*.5;},{passive:true});
 canvas.addEventListener("pointerleave",()=>{s.tx=0;s.ty=0;},{passive:true});
 canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();canvas.closest(".matter-card")?.classList.add("matter-context-lost");});
 canvas.addEventListener("webglcontextrestored",()=>canvas.closest(".matter-card")?.classList.remove("matter-context-lost"));
 renderers.push(s);return s;
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=renderers.find(x=>x.canvas===e.target);if(s)s.visible=e.isIntersecting;}},{rootMargin:"180px 0px"});
for(const canvas of document.querySelectorAll(".matter-canvas")){try{const s=build(canvas);observer.observe(canvas);canvas.closest(".matter-card")?.classList.add("matter-ready");}catch(err){canvas.closest(".matter-card")?.classList.add("matter-fallback");console.error("FRAME Matter engine:",err);}}
function frame(){const t=clock.getElapsedTime();for(const s of renderers){if(!s.visible)continue;s.px+=(s.tx-s.px)*.055;s.py+=(s.ty-s.py)*.055;if(!reducedMotion){s.object.rotation.y=t*.17+s.px;s.object.rotation.x=Math.sin(t*.22)*.12+s.py;s.object.rotation.z=Math.sin(t*.16)*.07;s.dust.rotation.y=-t*.018;}s.renderer.render(s.scene,s.camera);}requestAnimationFrame(frame);}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderers.forEach(s=>s.resize());});requestAnimationFrame(frame);
