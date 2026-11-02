import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

(() => {
  const canvas = document.querySelector('#scene-3d');
  if (!canvas || !window.WebGLRenderingContext) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 700px)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('FRAME LAB: WebGL недоступен, включена CSS-композиция.', error);
    canvas.style.display = 'none';
    return;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.65));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( thirtyFour(), innerWidth / innerHeight, .1, 120 );
  camera.position.set(0, 0, mobile ? 14.8 : 12.8);

  // A custom studio environment gives the chrome something real to reflect.
  function makeStudioEnvironment() {
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 1024; envCanvas.height = 512;
    const ctx = envCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#d9ded2'); gradient.addColorStop(.18, '#30362d');
    gradient.addColorStop(.5, '#080a08'); gradient.addColorStop(.82, '#242a20'); gradient.addColorStop(1, '#c4cbb8');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
    const panels = [
      [80, 65, 130, 16, 'rgba(255,255,255,.95)'], [350, 35, 220, 22, 'rgba(235,242,225,.9)'],
      [720, 90, 180, 12, 'rgba(199,255,66,.95)'], [140, 360, 250, 18, 'rgba(255,255,255,.75)'],
      [620, 390, 300, 14, 'rgba(199,255,66,.85)'], [460, 220, 90, 8, 'rgba(255,255,255,.65)']
    ];
    panels.forEach(([x,y,w,h,color]) => { ctx.shadowColor = color; ctx.shadowBlur = 32; ctx.fillStyle = color; ctx.fillRect(x,y,w,h); ctx.shadowBlur = 0; });
    for (let i = 0; i < 14; i++) { ctx.strokeStyle = `rgba(220,235,210,${.025 + (i%3)*.012})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(i*83,0); ctx.lineTo(i*83+110,512); ctx.stroke(); }
    const texture = new THREE.CanvasTexture(envCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const environment = makeStudioEnvironment();
  scene.environment = environment;
  scene.environmentIntensity = 1.05;

  scene.add(new THREE.AmbientLight(0xcbd5c3, .45));
  const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(5, 7, 8); scene.add(key);
  const limeLight = new THREE.PointLight(0xbaff20, 125, 26, 1.7); limeLight.position.set(-5, -1, 5); scene.add(limeLight);
  const rim = new THREE.PointLight(0xeaffed, 90, 30, 1.8); rim.position.set(3, -5, -4); scene.add(rim);
  const topStrip = new THREE.RectAreaLight(0xffffff, 5, 8, .35); topStrip.position.set(0, 5, 2); topStrip.lookAt(0,0,0); scene.add(topStrip);

  const world = new THREE.Group(); scene.add(world);
  const sculpture = new THREE.Group(); world.add(sculpture);
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd5d9d0, metalness: 1, roughness: .075, clearcoat: 1, clearcoatRoughness: .035, envMapIntensity: 1.7 });
  const darkChrome = new THREE.MeshPhysicalMaterial({ color: 0x30352e, metalness: 1, roughness: .16, clearcoat: 1, envMapIntensity: 1.5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8f1df, metalness: .02, roughness: .025, transmission: .96, thickness: 2.2, ior: 1.48, clearcoat: 1, clearcoatRoughness: .015, envMapIntensity: 1.8, transparent: true, opacity: .98, side: THREE.DoubleSide });
  const limeGlass = new THREE.MeshPhysicalMaterial({ color: 0x9dff20, emissive: 0x4dff00, emissiveIntensity: .38, metalness: .08, roughness: .08, transmission: .72, thickness: 1.4, ior: 1.42, clearcoat: 1, transparent: true, opacity: .9 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xc7ff42, emissive: 0x9cff00, emissiveIntensity: 2.6, metalness: .55, roughness: .18 });

  // Interwoven chrome ribbons: sculptural tubes on three different spatial paths.
  function ribbon(points, radius, material, tubular = 260) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), true, 'catmullrom', .5);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius, 18, true), material);
    mesh.castShadow = true; mesh.receiveShadow = true; sculpture.add(mesh); return mesh;
  }
  const pathA = [], pathB = [], pathC = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    pathA.push([Math.cos(a)*2.65, Math.sin(a*2)*.78, Math.sin(a)*1.12]);
    pathB.push([Math.cos(a+1.4)*2.15, Math.sin(a*2+1.2)*1.2, Math.sin(a+1.4)*1.55]);
    pathC.push([Math.cos(a*1.0)*1.55, Math.sin(a+2.1)*2.05, Math.cos(a*2)*.72]);
  }
  const ribbonA = ribbon(pathA, .19, chrome, 320);
  const ribbonB = ribbon(pathB, .115, darkChrome, 300);
  const ribbonC = ribbon(pathC, .075, chrome, 280);

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.22, .115, 240, 20, 2, 5), darkChrome);
  knot.position.set(.1, .1, .35); knot.rotation.set(.5,.2,-.35); sculpture.add(knot);

  const glassCluster = new THREE.Group(); sculpture.add(glassCluster);
  const sphereA = new THREE.Mesh(new THREE.SphereGeometry(.98, 72, 56), glass); sphereA.position.set(-2.1,.9,.35); glassCluster.add(sphereA);
  const sphereB = new THREE.Mesh(new THREE.SphereGeometry(.68, 64, 48), glass); sphereB.position.set(2.15,-.85,-.35); glassCluster.add(sphereB);
  const sphereC = new THREE.Mesh(new THREE.SphereGeometry(.43, 48, 36), limeGlass); sphereC.position.set(.2,1.75,-.65); glassCluster.add(sphereC);
  const innerA = new THREE.Mesh(new THREE.TorusGeometry(.64,.018,12,180), glow); innerA.position.copy(sphereA.position); innerA.rotation.set(.8,.2,.5); glassCluster.add(innerA);
  const innerB = new THREE.Mesh(new THREE.TorusGeometry(.46,.014,10,160), glow); innerB.position.copy(sphereB.position); innerB.rotation.set(.2,.8,.1); glassCluster.add(innerB);

  const orbitalGroup = new THREE.Group(); sculpture.add(orbitalGroup);
  const orbit1 = new THREE.Mesh(new THREE.TorusGeometry(3.55,.026,10,260), glass); orbit1.rotation.set(1.12,.25,.35); orbitalGroup.add(orbit1);
  const orbit2 = new THREE.Mesh(new THREE.TorusGeometry(2.95,.045,12,240), chrome); orbit2.rotation.set(.3,1.08,-.55); orbitalGroup.add(orbit2);
  const orbit3 = new THREE.Mesh(new THREE.TorusGeometry(4.05,.012,8,280), glow); orbit3.rotation.set(1.4,.8,.2); orbitalGroup.add(orbit3);

  // Faceted glass prisms add small technical highlights around the main sculpture.
  const shardGroup = new THREE.Group(); sculpture.add(shardGroup);
  for (let i = 0; i < (mobile ? 5 : 9); i++) {
    const geo = new THREE.IcosahedronGeometry(.16 + (i%3)*.07, 1);
    const shard = new THREE.Mesh(geo, i%3===0 ? limeGlass : (i%2 ? glass : chrome));
    const a = i / (mobile ? 5 : 9) * Math.PI * 2;
    shard.position.set(Math.cos(a)*3.35, Math.sin(a*1.7)*1.75, Math.sin(a)*1.6);
    shard.rotation.set(a, a*.7, -a*.4); shardGroup.add(shard);
  }

  // Dense micro-particle field with two depth layers.
  function particleField(count, radius, size, opacity) {
    const positions = new Float32Array(count*3), phases = new Float32Array(count);
    for (let i=0;i<count;i++) { const r=radius*(.55+Math.random()*.65), a=Math.random()*Math.PI*2, z=(Math.random()-.5)*5; positions[i*3]=Math.cos(a)*r; positions[i*3+1]=(Math.random()-.5)*radius*1.1; positions[i*3+2]=z; phases[i]=Math.random()*Math.PI*2; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const material = new THREE.PointsMaterial({ color:0xc7ff42, size, transparent:true, opacity, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true });
    const points = new THREE.Points(geometry,material); points.userData.phases=phases; world.add(points); return points;
  }
  const particlesBack = particleField(mobile?180:440,6.3,.018,.52);
  const particlesFront = particleField(mobile?70:150,4.7,.028,.34);

  // Subtle architectural wireframe behind the sculpture.
  const architecture = new THREE.Group(); scene.add(architecture);
  const gridMaterial = new THREE.LineBasicMaterial({ color:0x9ab47a, transparent:true, opacity:.12 });
  for (let i=0;i<9;i++) {
    const y=-3.7+i*.92;
    const points=[new THREE.Vector3(-8,y,-4),new THREE.Vector3(8,y,-4),new THREE.Vector3(8,y,-4),new THREE.Vector3(8,y,4)];
    architecture.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),gridMaterial));
  }
  const floor = new THREE.GridHelper(26,52,0x9cb77b,0x3e4938); floor.position.set(0,-3.4,-1.8); floor.material.transparent=true; floor.material.opacity=.13; architecture.add(floor);

  let pointerX=0,pointerY=0,targetX=0,targetY=0,scrollTarget=0,scrollCurrent=0,raf=0;
  let materialMode='glass', materialMix=0, lastChapter=-1;
  const sceneLabel=document.querySelector('.scene-label');
  const chapterNames=['МАТЕРИЯ · СВЕТ · ФОРМА','СТРАТЕГИЯ · ИДЕЯ · СМЫСЛ','ОБРАЗ · СИСТЕМА · ДЕТАЛЬ','ДИЗАЙН · ДВИЖЕНИЕ · КОД','ЭКСПЕРИМЕНТ · МАТЕРИАЛ · СВЕТ','ТОЧНОСТЬ · СБОРКА · ЗАПУСК','НОВАЯ ФОРМА · НОВЫЙ ОПЫТ'];
  const materialButtons=[...document.querySelectorAll('[data-material-mode]')];
  materialButtons.forEach(button=>button.addEventListener('click',()=>{
    materialMode=button.dataset.materialMode;
    materialButtons.forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
  }));
  const onPointer = e => { targetX=(e.clientX/innerWidth-.5)*.85; targetY=(e.clientY/innerHeight-.5)*.55; };
  const onScroll = () => { const max=Math.max(1,document.documentElement.scrollHeight-innerHeight); scrollTarget=scrollY/max; };
  if (!mobile) window.addEventListener('pointermove',onPointer,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  const clock = new THREE.Clock();
  function animate() {
    if (document.hidden) return;
    const t=clock.getElapsedTime();
    pointerX += (targetX-pointerX)*.035; pointerY += (targetY-pointerY)*.035;
    if (!reducedMotion) scrollCurrent += (scrollTarget-scrollCurrent)*.035;
    const s=scrollCurrent;
    const chapterIndex=Math.min(chapterNames.length-1,Math.floor(s*chapterNames.length));
    if(sceneLabel && chapterIndex!==lastChapter){const labels=sceneLabel.querySelectorAll('span');if(labels[0])labels[0].textContent=`FL / СИСТЕМА 00${chapterIndex+1}`;if(labels[1])labels[1].textContent=chapterNames[chapterIndex];lastChapter=chapterIndex;}
    const desiredMix = materialMode==='glass' ? 0 : materialMode==='chrome' ? 1 : 2;
    materialMix += (desiredMix-materialMix)*.035;
    glass.roughness = .025 + Math.min(1,materialMix)*.045;
    glass.transmission = materialMode==='chrome' ? .42 : materialMode==='lime' ? .78 : .96;
    chrome.roughness = materialMode==='glass' ? .075 : materialMode==='chrome' ? .035 : .12;
    darkChrome.roughness = materialMode==='lime' ? .08 : .16;
    limeGlass.emissiveIntensity = materialMode==='lime' ? 1.7 : .38;
    glow.emissiveIntensity = materialMode==='lime' ? 4.2 : 2.6;
    limeLight.intensity = materialMode==='lime' ? 190 : 125;
    // The same sculpture changes its pose and camera framing as the visitor travels through the page.
    const chapter = s * Math.PI * 2.15;
    sculpture.rotation.y = pointerX*.42 + Math.sin(t*.12)*.12 + chapter*.58;
    sculpture.rotation.x = -pointerY*.32 + Math.cos(t*.16)*.08 + Math.sin(chapter)*.16;
    sculpture.rotation.z = Math.sin(chapter*.72)*.22;
    sculpture.position.y = Math.sin(t*.34)*.12 + Math.sin(chapter)*.34;
    sculpture.position.x = Math.sin(chapter*1.1)*.48 + pointerX*.24;
    sculpture.scale.setScalar((mobile?.69:1.02) * (1 + Math.sin(chapter*1.4)*.055));
    ribbonA.rotation.y = t*.12; ribbonB.rotation.x = -t*.105; ribbonC.rotation.z = t*.09;
    knot.rotation.x += reducedMotion?0:.0017; knot.rotation.y += reducedMotion?0:.0022;
    glassCluster.rotation.y = Math.sin(t*.22)*.14 + chapter*.22;
    sphereA.position.y=.9+Math.sin(t*.55)*.18;
    sphereB.position.x=2.15+Math.cos(t*.42)*.18;
    innerA.rotation.z+=.003; innerB.rotation.x-=.0025;
    orbitalGroup.rotation.x=Math.sin(t*.18)*.18+chapter*.2; orbitalGroup.rotation.y=-t*.08+chapter*.35;
    shardGroup.rotation.y=t*.08-chapter*.3; shardGroup.rotation.x=Math.sin(t*.2)*.12;
    particlesBack.rotation.y=-t*.018; particlesFront.rotation.y=t*.026; particlesFront.rotation.x=Math.sin(t*.11)*.08;
    limeLight.position.x=-5+Math.sin(t*.32)*1.4; limeLight.position.y=-1+Math.cos(t*.25)*1.1;
    camera.position.x=pointerX*.5 + Math.sin(chapter*.7)*.35;
    camera.position.y=-pointerY*.35 + Math.cos(chapter)*.18;
    camera.position.z=(mobile?14.8:12.8)+Math.sin(chapter*.8)*.65;
    camera.lookAt(Math.sin(chapter)*.2,0,0);
    renderer.render(scene,camera);
    if (!reducedMotion) raf=requestAnimationFrame(animate);
  }
  function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.65)); renderer.setSize(innerWidth,innerHeight,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) cancelAnimationFrame(raf); else if(!reducedMotion) animate(); });
  animate();

  function thirtyFour(){ return 34; }
})();
