(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 2)
    || navigator.connection?.saveData === true;
  if (lowPower) document.documentElement.classList.add('lite-device');


  // Gravity-distortion starfield: background-only, static on touch/low-power devices.
  const gravityCanvas = $('#gravity-canvas');
  const gravityCtx = gravityCanvas?.getContext('2d');
  let gravityWidth = 0, gravityHeight = 0, gravityDpr = 1;
  let gravityStars = [], gravityRaf = 0, gravityTimer = 0, gravityVisible = false;
  const gravitySections = $$('.hero,.visual-interlude,.work,.object-gallery,.services,.process,.lab,.start-project,.reviews,.faq,.contact');
  const gravityLightSections = $$('.about');
  const gravityVisibility = new Map();
  const gravityLightVisibility = new Map();
  let gravitySeed = 72631;
  const gravityRandom = () => {
    gravitySeed = (gravitySeed * 1664525 + 1013904223) >>> 0;
    return gravitySeed / 4294967296;
  };
  function resizeGravity() {
    if (!gravityCanvas || !gravityCtx) return;
    gravityWidth = Math.max(1, window.innerWidth);
    gravityHeight = Math.max(1, window.innerHeight);
    gravityDpr = lowPower || coarsePointer ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
    gravityCanvas.width = Math.round(gravityWidth * gravityDpr);
    gravityCanvas.height = Math.round(gravityHeight * gravityDpr);
    gravityCtx.setTransform(gravityDpr, 0, 0, gravityDpr, 0, 0);
    gravitySeed = 72631;
    const count = lowPower || coarsePointer ? 88 : 248;
    gravityStars = Array.from({ length: count }, () => {
      const tint = gravityRandom();
      return {
        x: gravityRandom(), y: gravityRandom(),
        radius: .42 + gravityRandom() * .9,
        alpha: .3 + gravityRandom() * .68,
        phase: gravityRandom() * Math.PI * 2,
        tint: tint < .12 ? 0 : tint < .28 ? 1 : 2
      };
    });
    drawGravity(0);
  }
  function gravityWarp(x, y, cx, cy, strength, phase) {
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    const swirl = strength / (d2 + 6400) * (1 + Math.sin(phase) * .045);
    const pull = strength * .19 / (d2 + 5200);
    return {
      x: x - dx * pull - dy * swirl,
      y: y - dy * pull + dx * swirl
    };
  }
  function scheduleGravity() {
    if (!gravityVisible || reduceMotion || coarsePointer || lowPower || document.hidden || gravityRaf || gravityTimer) return;
    gravityTimer = window.setTimeout(() => {
      gravityTimer = 0;
      if (gravityVisible && !document.hidden) gravityRaf = requestAnimationFrame(drawGravity);
    }, 50);
  }
  function drawGravity(time = 0) {
    if (!gravityCtx || !gravityWidth || !gravityHeight) return;
    gravityRaf = 0;
    const phase = (time || performance.now()) * .00016;
    gravityCtx.clearRect(0, 0, gravityWidth, gravityHeight);
    const lensX = gravityWidth * (.68 + Math.sin(phase * .7) * .018);
    const lensY = gravityHeight * (.46 + Math.cos(phase * .53) * .024);
    const lens2X = gravityWidth * (.18 + Math.cos(phase * .42) * .012);
    const lens2Y = gravityHeight * (.77 + Math.sin(phase * .61) * .018);

    const halo = gravityCtx.createRadialGradient(lensX, lensY, 0, lensX, lensY, Math.max(gravityWidth, gravityHeight) * .34);
    halo.addColorStop(0, 'rgba(111,151,185,.045)');
    halo.addColorStop(.35, 'rgba(76,111,147,.022)');
    halo.addColorStop(1, 'rgba(76,111,147,0)');
    gravityCtx.fillStyle = halo;
    gravityCtx.fillRect(0, 0, gravityWidth, gravityHeight);

    gravityStars.forEach(star => {
      const x0 = star.x * gravityWidth;
      const y0 = star.y * gravityHeight;
      let point = gravityWarp(x0, y0, lensX, lensY, 2450, phase + star.phase);
      point = gravityWarp(point.x, point.y, lens2X, lens2Y, 920, phase * .78 + star.phase);
      const twinkle = lowPower || reduceMotion || coarsePointer ? 1 : .78 + Math.sin(phase * 2.1 + star.phase) * .22;
      const colors = [
        'rgba(205,225,244,' + (star.alpha * twinkle) + ')',
        'rgba(139,205,198,' + (star.alpha * .76 * twinkle) + ')',
        'rgba(181,157,231,' + (star.alpha * .68 * twinkle) + ')'
      ];
      gravityCtx.beginPath();
      gravityCtx.arc(point.x, point.y, star.radius, 0, Math.PI * 2);
      gravityCtx.fillStyle = colors[star.tint];
      gravityCtx.fill();
      const dx = point.x - x0, dy = point.y - y0;
      if (Math.hypot(dx, dy) > 2.8 && star.radius > .75) {
        gravityCtx.beginPath();
        gravityCtx.moveTo(x0, y0);
        gravityCtx.lineTo(point.x, point.y);
        gravityCtx.strokeStyle = 'rgba(136,181,213,' + (.065 * twinkle) + ')';
        gravityCtx.lineWidth = .55;
        gravityCtx.stroke();
      }
    });

    // Very faint lens arcs: a shader-like distortion cue, kept entirely behind content.
    gravityCtx.save();
    gravityCtx.translate(lensX, lensY);
    gravityCtx.rotate(-.22 + Math.sin(phase) * .025);
    for (let i = 0; i < 5; i++) {
      const radius = 42 + i * 27;
      gravityCtx.beginPath();
      gravityCtx.ellipse(0, 0, radius * 1.55, radius * .56, 0, -.34, Math.PI * 1.56);
      gravityCtx.strokeStyle = 'rgba(156,190,219,' + (.035 - i * .005) + ')';
      gravityCtx.lineWidth = .8;
      gravityCtx.stroke();
    }
    gravityCtx.restore();
    scheduleGravity();
  }
  if (gravityCanvas && gravityCtx) {
    resizeGravity();
    if ('IntersectionObserver' in window) {
      const gravityObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target.matches('.about')) gravityLightVisibility.set(entry.target, entry.isIntersecting);
          else gravityVisibility.set(entry.target, entry.isIntersecting);
        });
        gravityVisible = ![...gravityLightVisibility.values()].some(Boolean) && [...gravityVisibility.values()].some(Boolean);
        if (gravityVisible && !reduceMotion && !coarsePointer && !lowPower && !document.hidden) {
          if (!gravityRaf && !gravityTimer) gravityRaf = requestAnimationFrame(drawGravity);
        } else {
          if (gravityTimer) window.clearTimeout(gravityTimer);
          gravityTimer = 0;
          cancelAnimationFrame(gravityRaf);
          gravityRaf = 0;
        }
      }, { threshold: 0, rootMargin: '0px' });
      gravitySections.forEach(section => gravityObserver.observe(section));
      gravityLightSections.forEach(section => gravityObserver.observe(section));
    } else {
      gravityVisible = true;
      if (!reduceMotion && !coarsePointer && !lowPower) scheduleGravity();
    }
    window.addEventListener('resize', () => {
      resizeGravity();
      if (!gravityRaf && !gravityTimer) drawGravity(0);
    }, { passive: true });
  }

  // Scroll progress and soft cursor light.
  const progress = $('.scroll-progress span');
  const glow = $('.cursor-glow');
  if (!coarsePointer && !reduceMotion && glow) {
    window.addEventListener('pointermove', e => {
      glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)';
    }, { passive: true });
  }
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateScroll, { passive: true }); updateScroll();

  // Reveal on entry.
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add('in-view'));

  // Header menu.
  const menuButton = $('.menu-toggle'), mobileMenu = $('.mobile-menu');
  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false'); menuButton?.setAttribute('aria-label', 'Открыть меню');
    mobileMenu?.classList.remove('open'); mobileMenu?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('menu-open');
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.classList.toggle('open', open); mobileMenu.setAttribute('aria-hidden', String(!open)); document.body.classList.toggle('menu-open', open);
  });
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeProjectModal(); } });

  // Project category filters.
  const filterButtons = $$('.filter-btn'), projectCards = $$('.project-card');
  const projectIndexRows = $$('.project-index-row');
  const workSection = $('#work');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    projectCards.forEach(card => card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter));
    projectIndexRows.forEach(row => row.classList.toggle('hidden', filter !== 'all' && row.dataset.category !== filter));
  }));

  // Portfolio presentation: switch between the immersive art direction and a clean type index.
  const workViewButtons = $$('[data-work-view]');
  workViewButtons.forEach(button => button.addEventListener('click', () => {
    const indexMode = button.dataset.workView === 'index';
    workSection?.classList.toggle('work-index-mode', indexMode);
    workViewButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  }));

  // A restrained monochrome proofing mode for the portfolio and the 3D object gallery.
  const monoToggle = $('#project-mono-toggle');
  monoToggle?.addEventListener('click', () => {
    const active = monoToggle.getAttribute('aria-pressed') !== 'true';
    workSection?.classList.toggle('is-monochrome', active);
    $('#objects')?.classList.toggle('is-monochrome', active);
    monoToggle.setAttribute('aria-pressed', String(active));
    monoToggle.classList.toggle('active', active);
    monoToggle.lastChild && (monoToggle.lastChild.textContent = active ? ' MONOCHROME ON' : ' MONOCHROME');
  });

  // Project detail modal.
  const projectData = {
    '01': { title: 'AETHER®', category: 'АЙДЕНТИКА / ФИРМЕННАЯ СИСТЕМА', description: 'Исследование визуальной идентичности на пересечении формы, материи и света. Типографика соединяется с тактильным миром отражающих поверхностей.' },
    '02': { title: 'NØRD STUDIO', category: 'ВЕБ-ДИЗАЙН / ЦИФРОВОЙ ОПЫТ', description: 'Концепция сайта студии предметного дизайна. Выразительная типографика, редакционная подача и спокойный минималистичный интерфейс.' },
    '03': { title: 'VANTA OBJECTS', category: 'ЦИФРОВОЙ ПРОДУКТ / АРТ-ДИРЕКШН', description: 'Концепция цифрового бренда объектов: орбитальная геометрия, тёмные поверхности и точная модульная айдентика.' },
    '04': { title: 'FLUX CAMPAIGN', category: 'ВИЗУАЛЬНЫЙ КОНТЕНТ / КАМПАНИЯ', description: 'Эксперимент с визуальной кампанией, построенной на текучих формах, смене материалов и контрастном художественном направлении.' },
    '05': { title: 'OBJECT / 05', category: 'АРТ-ДИРЕКШН / АЙДЕНТИКА', description: 'Исследование контраста: скульптурная геометрия, сдержанные поверхности и гибкий графический язык.' },
    '06': { title: 'SØL RETREAT', category: 'ВЕБ-ДИЗАЙН / ЦИФРОВОЙ ОПЫТ', description: 'Концепция цифрового пространства для отдыха: спокойный ритм, мягкая палитра и иммерсивная редакционная композиция.' }
  };
  const modal = $('#project-modal'); let lastFocused = null;
  function openProjectModal(id) {
    const item = projectData[id]; if (!item || !modal) return;
    lastFocused = document.activeElement;
    $('#modal-title').textContent = item.title; $('#modal-kicker').textContent = `CONCEPT PROJECT / ${id}`;
    $('#modal-category').textContent = item.category; $('#modal-description').textContent = item.description;
    const detailLink = $('#modal-project-link'); if (detailLink) { detailLink.href = `pages/projects/project.html?id=${encodeURIComponent(id)}`; detailLink.removeAttribute('target'); detailLink.removeAttribute('rel'); detailLink.textContent = 'OPEN PROJECT PAGE ↗'; }
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; $('.modal-close').focus();
  }
  function closeProjectModal() {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }
  window.closeProjectModal = closeProjectModal;
  projectCards.forEach(card => {
    card.addEventListener('click', () => openProjectModal(card.dataset.project));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProjectModal(card.dataset.project); } });
  });
  projectIndexRows.forEach(row => row.addEventListener('click', () => openProjectModal(row.dataset.project)));
  $$('[data-close-modal]').forEach(el => el.addEventListener('click', closeProjectModal));


  // PROJECT DECK — cinematic 3D coverflow, with autonomous movement and drag.
  const orbit = $('#project-orbit-scene');
  const orbitRing = $('#project-orbit-ring');
  const orbitNodes = $$('.project-orbit-node');
  const orbitCurrent = $('#orbit-current');
  const orbitProgressFill = $('#project-deck-progress-fill');
  const orbitCaption = $('.project-orbit-caption span:first-child');
  const orbitDesktop = window.matchMedia('(min-width: 1101px)');
  let orbitIndex = 0;
  let orbitAngle = 0;
  let orbitFrame = 0;
  let orbitLastTime = 0;
  let orbitInView = false;
  let orbitPointerInside = false;
  let orbitFocusInside = false;
  let orbitResumeTimer = 0;
  let orbitSettleFrame = 0;
  let orbitRailEnabled = false;
  let orbitRailGroupWidth = 0;
  let orbitDrag = null;
  let suppressOrbitClick = false;
  const orbitAccents = ['#c7ff42','#c5d8c7','#b8a8ff','#e1b58a','#d7ded0','#e8d8a4'];
  const orbitNames = [
    'AETHER® / IDENTITY SYSTEM','NØRD STUDIO / DIGITAL EXPERIENCE',
    'VANTA OBJECTS / DIGITAL PRODUCT','FLUX CAMPAIGN / VISUAL CONTENT',
    'OBJECT 05 / ART DIRECTION','SØL RETREAT / WEB EXPERIENCE'
  ];

  function syncOrbitSelection() {
    orbitNodes.forEach((node, i) => {
      const active = i === orbitIndex;
      node.classList.toggle('is-current', active);
      node.setAttribute('aria-pressed', String(active));
      if (!active) {
        const surface = node.querySelector('.orbit-node-surface');
        if (surface) { surface.style.transform = ''; surface.style.transition = 'transform 720ms cubic-bezier(.18,.72,.22,1)'; }
      }
    });
    orbit?.querySelectorAll('.project-orbit-node.is-loop-clone').forEach(node => {
      const active = Number(node.dataset.project) === orbitIndex + 1;
      node.classList.toggle('is-current', active);
      node.setAttribute('aria-pressed', String(active));
    });
    if (orbitCurrent) orbitCurrent.textContent = orbitNames[orbitIndex];
    orbit?.style.setProperty('--deck-accent', orbitAccents[orbitIndex]);
  }

  function layoutProjectDeck() {
    if (!orbit || !orbitDesktop.matches) return;
    const width = orbit.clientWidth || window.innerWidth;
    // Keep the three visible covers physically separated at every desktop width.
    const spread = Math.max(0, Math.min(540, width * .43, width / 2 - 120));
    orbitNodes.forEach((node, i) => {
      const raw = ((i * 60 - orbitAngle + 540) % 360) - 180;
      const offset = raw / 60;
      const distance = Math.abs(offset);
      const visible = distance < 2.05;
      // Continuous interpolation prevents the neighboring cover from popping in
      // when it crosses the old hard 0.5 / 1.52 distance thresholds.
      const smooth = (a, b, v) => {
        const q = Math.max(0, Math.min(1, (v - a) / (b - a)));
        return q * q * (3 - 2 * q);
      };
      const sideBlend = smooth(.18, 1.05, distance);
      const fade = 1 - smooth(1.12, 2.02, distance);
      const scale = 1 - sideBlend * .34;
      const x = offset * spread;
      const z = 48 - sideBlend * 153;
      const rotateY = Math.max(-17, Math.min(17, -offset * 10)) * sideBlend;
      const opacity = fade * (distance < .5 ? 1 : .92);
      node.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,0,' + z + 'px) rotateY(' + rotateY.toFixed(2) + 'deg) scale(' + scale + ')';
      node.style.opacity = String(opacity);
      node.style.zIndex = String(distance < .5 ? 30 : visible ? 20 : 0);
      node.style.pointerEvents = visible ? 'auto' : 'none';
      node.style.filter = distance < .5 ? 'none' : 'saturate(.8) brightness(.78)';
      node.style.setProperty('--deck-accent', orbitAccents[i]);
    });
  }

  function animateOrbitToIndex(index) {
    if (!orbitDesktop.matches || !orbitNodes.length) return;
    if (orbitSettleFrame) cancelAnimationFrame(orbitSettleFrame);
    stopOrbitMotion();
    const targetBase = (index % orbitNodes.length) * 60;
    const from = orbitAngle;
    // Choose the nearest equivalent revolution. In particular, index 0 after
    // index 5 must travel forward a few degrees, not backwards through 180°.
    const candidates = [targetBase - 360, targetBase, targetBase + 360];
    const targetAngle = candidates.reduce((best, value) =>
      Math.abs(value - from) < Math.abs(best - from) ? value : best, candidates[0]);
    const delta = targetAngle - from;
    const started = performance.now();
    const duration = Math.max(1050, Math.min(1900, 980 + Math.abs(delta) * 3.1));
    // Quintic smoothstep: zero velocity at both ends, with a gentle continuous handoff.
    const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
    const step = now => {
      const t = Math.min(1, (now - started) / duration);
      renderOrbitAngle(from + delta * ease(t));
      if (t < 1) orbitSettleFrame = requestAnimationFrame(step);
      else {
        orbitSettleFrame = 0;
        orbitAngle = ((targetBase % 360) + 360) % 360;
        renderOrbitAngle(orbitAngle);
      }
    };
    orbitSettleFrame = requestAnimationFrame(step);
  }

  function renderOrbitAngle(angle) {
    orbitAngle = ((angle % 360) + 360) % 360;
    if (orbitProgressFill) orbitProgressFill.style.width = (orbitAngle / 360 * 100).toFixed(2) + '%';
    const nextIndex = Math.round(orbitAngle / 60) % orbitNodes.length;
    if (nextIndex !== orbitIndex) {
      orbitIndex = nextIndex;
      syncOrbitSelection();
    }
    layoutProjectDeck();
  }

  function canOrbitRun() {
    return orbitDesktop.matches && orbitInView && !reduceMotion &&
      !document.hidden && !orbitPointerInside && !orbitFocusInside &&
      !orbitDrag && !modal?.classList.contains('open');
  }

  function stopOrbitMotion() {
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    orbitFrame = 0;
    orbitLastTime = 0;
    orbitRing?.classList.remove('orbit-auto-running');
  }

  function drawOrbit(timestamp) {
    orbitFrame = 0;
    if (!canOrbitRun()) return;
    if (!orbitLastTime) orbitLastTime = timestamp;
    const delta = Math.min(timestamp - orbitLastTime, 80);
    orbitLastTime = timestamp;
    // The full deck rotates slowly; every project gets a clear hero moment.
    renderOrbitAngle(orbitAngle + delta * (360 / 64000));
    orbitFrame = requestAnimationFrame(drawOrbit);
  }

  function startOrbitMotion() {
    if (!canOrbitRun() || orbitFrame) return;
    orbitRing?.classList.add('orbit-auto-running');
    orbitLastTime = 0;
    orbitFrame = requestAnimationFrame(drawOrbit);
  }

  function setOrbitIndex(index, scrollToActive = false) {
    if (!orbitNodes.length) return;
    orbitIndex = (index + orbitNodes.length) % orbitNodes.length;
    stopOrbitMotion();
    if (orbitResumeTimer) window.clearTimeout(orbitResumeTimer);
    orbitAngle = orbitIndex * 60;
    syncOrbitSelection();
    layoutProjectDeck();
    if (scrollToActive && window.innerWidth <= 900) {
      orbitNodes[orbitIndex]?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block:'nearest', inline:'center' });
    }
    orbitResumeTimer = window.setTimeout(() => {
      orbitResumeTimer = 0;
      if (!orbitPointerInside && !orbitFocusInside) startOrbitMotion();
    }, 950);
  }

  if (orbit && orbitRing && orbitNodes.length) {
    renderOrbitAngle(0);
    if ('IntersectionObserver' in window) {
      const orbitObserver = new IntersectionObserver(entries => {
        orbitInView = entries.some(entry => entry.isIntersecting);
        if (orbitInView) startOrbitMotion();
        else stopOrbitMotion();
      }, { threshold: 0.08 });
      orbitObserver.observe(orbit);
    } else {
      orbitInView = true;
      startOrbitMotion();
    }

    // Keep a hover lock while the card glides; its transform must not simulate pointerout.
    let hoveredOrbitCard = null;
    let orbitHoverLock = false;
    const resumeAfterCardLeave = () => {
      if (orbitResumeTimer) window.clearTimeout(orbitResumeTimer);
      orbitResumeTimer = window.setTimeout(() => {
        orbitResumeTimer = 0;
        if (!orbitHoverLock && !hoveredOrbitCard && !orbitFocusInside) startOrbitMotion();
      }, 520);
    };
    const focusOrbitCard = card => {
      const selectedIndex = orbitNodes.indexOf(card);
      if (selectedIndex < 0) return;
      hoveredOrbitCard = card;
      orbitHoverLock = true;
      orbitPointerInside = true;
      if (orbitResumeTimer) window.clearTimeout(orbitResumeTimer);
      orbitResumeTimer = 0;
      if (selectedIndex !== orbitIndex || orbitSettleFrame) animateOrbitToIndex(selectedIndex);
      else stopOrbitMotion();
    };
    orbit.addEventListener('pointerover', event => {
      if (!orbitDesktop.matches || orbitHoverLock || orbitDrag) return;
      const card = event.target.closest?.('.project-orbit-node');
      if (!card || !orbit.contains(card) || card.classList.contains('is-loop-clone')) return;
      if (card === hoveredOrbitCard) return;
      focusOrbitCard(card);
    });
    orbit.addEventListener('pointermove', event => {
      if (!orbitDesktop.matches || orbitDrag || !orbitHoverLock || orbitSettleFrame) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const card = hit?.closest?.('.project-orbit-node');
      const nextCard = card && orbit.contains(card) && !card.classList.contains('is-loop-clone') ? card : null;
      if (nextCard === hoveredOrbitCard) return;
      if (nextCard) focusOrbitCard(nextCard);
      else {
        hoveredOrbitCard = null;
        orbitHoverLock = false;
        orbitPointerInside = false;
        resumeAfterCardLeave();
      }
    }, { passive:true });
    // The centered cover borrows the same restrained pointer tilt as the
    // project cards below. Side covers never tilt.
    let deckTiltFrame = 0;
    let deckTiltX = 0, deckTiltY = 0;
    const clearDeckTilt = () => {
      if (deckTiltFrame) cancelAnimationFrame(deckTiltFrame);
      deckTiltFrame = 0;
      orbitNodes.forEach(node => {
        const surface = node.querySelector('.orbit-node-surface');
        if (surface) {
          surface.style.transform = '';
          surface.style.transition = 'transform 720ms cubic-bezier(.18,.72,.22,1)';
        }
      });
    };
    const updateDeckTilt = event => {
      if (!orbitDesktop.matches || orbitDrag || orbitSettleFrame) return;
      const active = orbitNodes[orbitIndex];
      if (!active || !active.matches(':hover')) { clearDeckTilt(); return; }
      const rect = active.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      deckTiltY = (px - .5) * 8;
      deckTiltX = (.5 - py) * 7;
      if (deckTiltFrame) return;
      deckTiltFrame = requestAnimationFrame(() => {
        deckTiltFrame = 0;
        const surface = active.querySelector('.orbit-node-surface');
        if (!surface || active !== orbitNodes[orbitIndex] || orbitSettleFrame || orbitDrag) return;
        surface.style.transition = 'transform 100ms cubic-bezier(.2,.72,.2,1)';
        surface.style.transform = 'perspective(1100px) rotateX(' + deckTiltX.toFixed(2) + 'deg) rotateY(' + deckTiltY.toFixed(2) + 'deg) translateZ(8px)';
      });
    };
    orbit.addEventListener('pointermove', updateDeckTilt, { passive:true });
    orbit.addEventListener('pointerleave', clearDeckTilt);
    orbitNodes.forEach(node => node.addEventListener('pointerenter', () => {
      if (node !== orbitNodes[orbitIndex]) clearDeckTilt();
    }, { passive:true }));

    // Ignore pointerout: the selected card intentionally moves away from the pointer.
    orbit.addEventListener('pointerleave', () => {
      clearDeckTilt();
      orbit.style.setProperty('--orbit-light-x','50%');
      orbit.style.setProperty('--orbit-light-y','50%');
      hoveredOrbitCard = null;
      orbitHoverLock = false;
      orbitPointerInside = false;
      resumeAfterCardLeave();
    });
    orbit.addEventListener('focusin', event => {
      // Keyboard focus pins a card; mouse click focus must not freeze the scene after pointer leave.
      if (event.target.matches?.(':focus-visible')) {
        orbitFocusInside = true;
        stopOrbitMotion();
      }
    });
    orbit.addEventListener('focusout', event => {
      if (!orbit.contains(event.relatedTarget)) {
        orbitFocusInside = false;
        startOrbitMotion();
      }
    });

    // Drag the deck like a physical carousel; a drag never accidentally opens a card.
    orbit.addEventListener('pointerdown', event => {
      if (!orbitDesktop.matches || event.button !== 0 || event.target.closest('a')) return;
      orbitDrag = { pointerId:event.pointerId, startX:event.clientX, startAngle:orbitAngle, targetAngle:orbitAngle, moved:false, frame:0 };
      // A drag owns the interaction exclusively; hover/tilt must not start
      // competing transitions while the pointer is captured.
      hoveredOrbitCard = null;
      orbitHoverLock = false;
      clearDeckTilt();
      if (orbitSettleFrame) cancelAnimationFrame(orbitSettleFrame);
      orbitSettleFrame = 0;
      if (orbitResumeTimer) window.clearTimeout(orbitResumeTimer);
      orbitResumeTimer = 0;
      stopOrbitMotion();
    });
    orbit.addEventListener('pointermove', event => {
      if (orbitDrag && orbitDrag.pointerId === event.pointerId) {
        const dx = event.clientX - orbitDrag.startX;
        if (Math.abs(dx) > 6 && !orbitDrag.moved) {
          orbitDrag.moved = true;
          orbit.classList.add('is-dragging');
          if (orbitCaption) orbitCaption.textContent = 'DRAGGING / RELEASE TO PLAY';
          try { orbit.setPointerCapture(event.pointerId); } catch (_) {}
        }
        if (orbitDrag.moved) {
          const width = orbit.clientWidth || window.innerWidth;
          const spread = Math.max(260, Math.min(540, width * .43, width / 2 - 120));
          orbitDrag.targetAngle = orbitDrag.startAngle - (dx / spread) * 60;
          // During a deliberate drag the deck follows the pointer 1:1.
          // No spring lag means it cannot jump ahead or catch up in a second burst.
          renderOrbitAngle(orbitDrag.targetAngle);
        }
      }
    }, { passive:true });
    const finishOrbitDrag = event => {
      if (!orbitDrag || (event && orbitDrag.pointerId !== event.pointerId)) return;
      if (orbitDrag.moved) {
        suppressOrbitClick = true;
        window.setTimeout(() => { suppressOrbitClick = false; }, 350);
      }
      if (orbitDrag.frame) cancelAnimationFrame(orbitDrag.frame);
      const didMove = orbitDrag.moved;
      const releaseAngle = orbitAngle;
      orbit.classList.remove('is-dragging');
      if (orbitCaption) orbitCaption.textContent = 'AUTO DECK / DRAG TO EXPLORE';
      orbitDrag = null;
      if (didMove) {
        // Snap to the nearest cover through the same cinematic transition as click/auto.
        const nearest = (Math.round(releaseAngle / 60) % orbitNodes.length + orbitNodes.length) % orbitNodes.length;
        animateOrbitToIndex(nearest);
        if (orbitResumeTimer) window.clearTimeout(orbitResumeTimer);
        orbitResumeTimer = window.setTimeout(() => {
          orbitResumeTimer = 0;
          if (!orbit.matches(':hover') && !orbitFocusInside) {
            orbitPointerInside = false;
            startOrbitMotion();
          }
        }, 1750);
      } else {
        if (!orbit.matches(':hover')) orbitPointerInside = false;
        if (!orbitFocusInside) startOrbitMotion();
      }
    };
    orbit.addEventListener('pointerup', finishOrbitDrag);
    orbit.addEventListener('pointercancel', finishOrbitDrag);

    // One delegated click handler supports both the original cards and their seamless rail copies.
    orbit.addEventListener('click', event => {
      const node = event.target.closest?.('.project-orbit-node');
      if (!node || !orbit.contains(node) || suppressOrbitClick) return;
      const index = Math.max(0, Number(node.dataset.project) - 1);
      setOrbitIndex(index);
      openProjectModal(node.dataset.project);
    });

    const setupInfiniteMobileRail = () => {
      orbit.querySelectorAll('.project-orbit-node.is-loop-clone').forEach(node => node.remove());
      orbitRailEnabled = false;
      orbitRailGroupWidth = 0;
      if (orbitDesktop.matches) return;
      const gap = parseFloat(getComputedStyle(orbitRing).columnGap || getComputedStyle(orbitRing).gap) || 12;
      const before = orbitNodes.map(node => {
        const clone = node.cloneNode(true);
        clone.classList.add('is-loop-clone');
        clone.dataset.loopClone = 'before';
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });
      const after = orbitNodes.map(node => {
        const clone = node.cloneNode(true);
        clone.classList.add('is-loop-clone');
        clone.dataset.loopClone = 'after';
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });
      before.reverse().forEach(node => orbitRing.prepend(node));
      after.forEach(node => orbitRing.append(node));
      orbitRailGroupWidth = orbitNodes.reduce((sum, node) => sum + node.getBoundingClientRect().width, 0) + gap * orbitNodes.length;
      orbit.scrollLeft = orbitRailGroupWidth;
      orbitRailEnabled = true;
    };
    setupInfiniteMobileRail();

    if (!orbitDesktop.matches) {
      let mobileScrollFrame = 0;
      orbit.addEventListener('scroll', () => {
        if (orbitRailEnabled && orbitRailGroupWidth > 0) {
          const lower = orbitRailGroupWidth * .5;
          const upper = orbitRailGroupWidth * 1.5;
          if (orbit.scrollLeft < lower) orbit.scrollLeft += orbitRailGroupWidth;
          else if (orbit.scrollLeft > upper) orbit.scrollLeft -= orbitRailGroupWidth;
        }
        if (mobileScrollFrame) return;
        mobileScrollFrame = requestAnimationFrame(() => {
          mobileScrollFrame = 0;
          const center = orbit.getBoundingClientRect().left + orbit.clientWidth / 2;
          const allNodes = $$('.project-orbit-node', orbitRing);
          let closestProject = orbitIndex, best = Infinity;
          allNodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - center);
            if (distance < best) { best = distance; closestProject = Math.max(0, Number(node.dataset.project) - 1); }
          });
          if (closestProject !== orbitIndex) {
            orbitIndex = closestProject;
            syncOrbitSelection();
          }
        });
      }, { passive:true });
    }

    orbit.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      if (event.target.closest('.project-orbit-node')) {
        event.preventDefault();
        setOrbitIndex(event.key === 'Home' ? 0 : event.key === 'End' ? orbitNodes.length - 1 : orbitIndex + (event.key === 'ArrowRight' ? 1 : -1));
        orbitNodes[orbitIndex]?.focus();
      }
    });

    if (!coarsePointer && !reduceMotion && !lowPower) {
      let lightFrame = 0;
      orbit.addEventListener('pointermove', event => {
        const rect = orbit.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        if (lightFrame) return;
        lightFrame = requestAnimationFrame(() => {
          orbit.style.setProperty('--orbit-light-x', x.toFixed(1) + '%');
          orbit.style.setProperty('--orbit-light-y', y.toFixed(1) + '%');
          lightFrame = 0;
        });
      }, { passive:true });
    }

    window.addEventListener('resize', layoutProjectDeck, { passive:true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopOrbitMotion();
      else startOrbitMotion();
    });
    orbitDesktop.addEventListener?.('change', () => {
      stopOrbitMotion();
      setupInfiniteMobileRail();
      layoutProjectDeck();
      startOrbitMotion();
    });
  }

  // Clear, single-focus process explainer: one stage and one concrete outcome at a time.
  const processData = [
    { overline:'СНАЧАЛА СЛУШАЕМ', title:'Расскажите, что вам нужно.', copy:'Обсудим ваш бизнес, клиентов и цель сайта. Можно прийти даже с одной идеей — поможем сформулировать остальное простыми словами.', result:'Понятная задача и список того, что нужно сделать.', example:'Например: сайт для студии, чтобы люди увидели услуги и оставили заявку.', foot:'ВАШЕ УЧАСТИЕ: РАССКАЗАТЬ О ЗАДАЧЕ И ОТВЕТИТЬ НА ВОПРОСЫ' },
    { overline:'СОБИРАЕМ ПЛАН', title:'Решаем, каким должен быть сайт.', copy:'Определяем нужные страницы, разделы и функции. Продумываем путь посетителя: что он увидит, куда нажмёт и как свяжется с вами.', result:'Структура сайта и согласованный план работ.', example:'Например: главная, услуги, примеры работ, ответы на вопросы и кнопка заявки.', foot:'ВАШЕ УЧАСТИЕ: ПОДТВЕРДИТЬ СТРУКТУРУ И ПРИОРИТЕТЫ' },
    { overline:'ПОКАЗЫВАЕМ ВНЕШНИЙ ВИД', title:'Вы заранее видите будущий сайт.', copy:'Подбираем цвета, шрифты, изображения и расположение блоков. Создаём макет страниц — ещё до программирования. Вы смотрите и говорите, что изменить.', result:'Согласованный дизайн-макет страниц сайта.', example:'Это как точный эскиз квартиры до ремонта: видно, где и что будет находиться.', foot:'ВАШЕ УЧАСТИЕ: ПОСМОТРЕТЬ МАКЕТ И СОГЛАСОВАТЬ ДИЗАЙН' },
    { overline:'ПРЕВРАЩАЕМ МАКЕТ В САЙТ', title:'Делаем так, чтобы всё работало.', copy:'Собираем страницы, настраиваем кнопки, формы и переходы. Адаптируем сайт под телефон, планшет и компьютер. Проверяем скорость и удобство.', result:'Рабочий сайт, который можно открыть на любом устройстве.', example:'Кнопка отправляет заявку, меню открывается, изображения загружаются, текст не съезжает на телефоне.', foot:'ВАШЕ УЧАСТИЕ: ПРОВЕРИТЬ ГОТОВЫЙ САЙТ И ДАТЬ ЗАМЕЧАНИЯ' },
    { overline:'ВЫПУСКАЕМ В ИНТЕРНЕТ', title:'Запускаем сайт для ваших клиентов.', copy:'Подключаем домен, размещаем сайт в интернете и проверяем его ещё раз. Передаём доступы и объясняем, как пользоваться результатом.', result:'Опубликованный сайт и доступы к нему.', example:'Вместо черновика появляется адрес, который можно отправлять клиентам и размещать в соцсетях.', foot:'ВАШЕ УЧАСТИЕ: ПРИНЯТЬ РЕЗУЛЬТАТ И ПОЛУЧИТЬ ДОСТУПЫ' }
  ];
  const processButtons = $$('.process-step');
  const processFields = { count:$('#process-count'), overline:$('#process-overline'), title:$('#process-title'), copy:$('#process-copy'), result:$('#process-result'), example:$('#process-example'), foot:$('#process-foot') };
  let currentProcessStep = 0;
  function selectProcessStep(index) {
    currentProcessStep = (index + processData.length) % processData.length;
    const item = processData[currentProcessStep];
    processButtons.forEach((button, i) => {
      const active = i === currentProcessStep;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    processFields.count.textContent = `ЭТАП ${String(currentProcessStep + 1).padStart(2,'0')} / 05`;
    for (const key of ['overline','title','copy','result','example','foot']) processFields[key].textContent = item[key];
  }
  processButtons.forEach((button, i) => button.addEventListener('click', () => selectProcessStep(i)));
  selectProcessStep(0);
  const processNext = $('#process-next');
  processNext?.addEventListener('click', () => selectProcessStep(currentProcessStep + 1));
  const processTabs = $('.process-tabs');
  processTabs?.addEventListener('keydown', event => {
    if (!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? processButtons.length - 1 : currentProcessStep + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1);
    selectProcessStep(next);
    processButtons[currentProcessStep]?.focus();
  });

  // Magnetic hover on larger pointers.
  if (!coarsePointer && !reduceMotion && !lowPower) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .08}px, ${dy * .12}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // Creative Lab interactive field.
  const labCanvas = $('#lab-canvas'), labCtx = labCanvas?.getContext('2d'), labVisual = $('#lab-visual');
  const modeButton = $('#lab-mode'), resetButton = $('#lab-reset'), labState = $('#lab-state');
  let labW = 0, labH = 0, labPoints = [], labMode = 0, labPointer = { x: .5, y: .5, active: false }, labRaf = 0, labTimer = 0, labInView = false;
  const modes = ['ORBITAL', 'FIELD', 'WAVE'];
  function resizeLab() {
    if (!labCanvas || !labCtx || !labVisual) return;
    const r = labVisual.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    labW = r.width; labH = r.height; labCanvas.width = Math.round(labW * dpr); labCanvas.height = Math.round(labH * dpr); labCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(lowPower ? 48 : 105, Math.max(lowPower ? 36 : 58, Math.floor(labW * labH / (lowPower ? 5200 : 2900))));
    labPoints = Array.from({ length: n }, (_, i) => ({ a: Math.random() * Math.PI * 2, radius: .12 + Math.random() * .38, speed: (Math.random() * .002 + .0004) * (i % 2 ? 1 : -1), size: Math.random() * 1.6 + .4, phase: Math.random() * 8 }));
  }
  function scheduleLab() {
    if (!labInView || reduceMotion || coarsePointer || lowPower || document.hidden || labRaf || labTimer) return;
    labTimer = window.setTimeout(() => {
      labTimer = 0;
      if (labInView && !document.hidden) labRaf = requestAnimationFrame(drawLab);
    }, 42);
  }
  function drawLab(time = 0) {
    if (!labCtx) return;
    labRaf = 0;
    labCtx.clearRect(0, 0, labW, labH);
    const cx = labW * (.5 + (labPointer.x - .5) * .09), cy = labH * (.5 + (labPointer.y - .5) * .09);
    const pulse = Math.sin(time * .0005) * 4;
    labCtx.save(); labCtx.translate(cx, cy);
    labPoints.forEach((p, i) => {
      if (!reduceMotion) p.a += p.speed;
      let x, y;
      if (labMode === 0) { const rr = p.radius * Math.min(labW, labH) + pulse; x = Math.cos(p.a) * rr; y = Math.sin(p.a * 1.08) * rr * .72; }
      else if (labMode === 1) { const rr = p.radius * Math.min(labW, labH); x = Math.cos(p.a * 2 + p.phase) * rr; y = Math.sin(p.a * 3) * rr * .6; }
      else { const xx = (i / labPoints.length - .5) * labW; x = xx; y = Math.sin(xx * .025 + time * .001 + p.phase) * (labH * .22) + Math.cos(p.a) * 28; }
      const dx = x - (labPointer.x - .5) * labW * .45, dy = y - (labPointer.y - .5) * labH * .45, dist = Math.hypot(dx, dy);
      if (labPointer.active && dist < 90) { x += dx / (dist || 1) * (90 - dist) * .25; y += dy / (dist || 1) * (90 - dist) * .25; }
      labCtx.beginPath(); labCtx.arc(x, y, p.size, 0, Math.PI * 2); labCtx.fillStyle = `rgba(199,255,66,${.25 + .45 * (1 - p.radius)})`; labCtx.fill();
      if (i % 9 === 0) { labCtx.beginPath(); labCtx.moveTo(x, y); labCtx.lineTo(x * .72, y * .72); labCtx.strokeStyle = 'rgba(199,255,66,.09)'; labCtx.lineWidth = .6; labCtx.stroke(); }
    });
    labCtx.restore();
    scheduleLab();
  }
  if (labVisual) {
    labVisual.addEventListener('pointermove', e => {
      const r = labVisual.getBoundingClientRect();
      labPointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, active: true };
    }, { passive: true });
    labVisual.addEventListener('pointerleave', () => { labPointer.active = false; });
    modeButton?.addEventListener('click', () => {
      labMode = (labMode + 1) % modes.length;
      if (labState) labState.textContent = 'FIELD: ' + modes[labMode];
      if (reduceMotion || coarsePointer || lowPower || !labInView) drawLab(0);
    });
    resetButton?.addEventListener('click', () => {
      labMode = 0;
      labPointer = { x: .5, y: .5, active: false };
      if (labState) labState.textContent = 'FIELD: ORBITAL';
      resizeLab();
      drawLab(0);
    });

    resizeLab();
    // Paint one still frame immediately. Continuous frames only run while the scene is visible.
    drawLab(0);
    if ('IntersectionObserver' in window) {
      const labObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          labInView = entry.isIntersecting;
          if (labInView && !reduceMotion && !coarsePointer && !lowPower && !document.hidden) {
            if (!labRaf) labRaf = requestAnimationFrame(drawLab);
          } else {
            if (labTimer) window.clearTimeout(labTimer);
            labTimer = 0;
            cancelAnimationFrame(labRaf);
            labRaf = 0;
          }
        });
      }, { threshold: .08, rootMargin: '80px 0px' });
      labObserver.observe(labVisual);
    } else {
      labInView = true;
      if (!reduceMotion && !coarsePointer && !lowPower) labRaf = requestAnimationFrame(drawLab);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        resizeLab();
        if (!labRaf) drawLab(0);
      }).observe(labVisual);
    } else {
      window.addEventListener('resize', () => {
        resizeLab();
        if (!labRaf) drawLab(0);
      }, { passive: true });
    }
  }
  // Guided project planner: creates a client-controlled brief (no backend or auto-send).
  const planner = $('#project-planner');
  if (planner) {
    const plannerSteps = $$('.planner-step', planner);
    const stepLabel = $('#planner-step-label');
    const progressFill = $('#planner-progress-fill');
    const resultPanel = $('#planner-result');
    const briefOutput = $('#brief-output');
    let plannerIndex = 0;
    const stepNames = ['ЧТО НУЖНО СОЗДАТЬ?', 'НЕМНОГО О ЗАДАЧЕ', 'КОНТАКТЫ И БЮДЖЕТ'];
    const showPlannerStep = index => {
      plannerIndex = Math.max(0, Math.min(2, index));
      plannerSteps.forEach((step, i) => { step.hidden = i !== plannerIndex; step.classList.toggle('active', i === plannerIndex); });
      resultPanel.hidden = true;
      stepLabel.textContent = `ШАГ 0${plannerIndex + 1} / 03 — ${stepNames[plannerIndex]}`;
      progressFill.style.width = `${(plannerIndex + 1) / 3 * 100}%`;
    };
    const fieldValue = name => {
      const field = planner.elements.namedItem(name);
      if (!field) return 'Не указано';
      if (field instanceof RadioNodeList) return field.value || 'Не выбрано';
      return field.value.trim() || 'Не указано';
    };
    $$('[data-next]', planner).forEach(button => button.addEventListener('click', () => {
      if (plannerIndex === 0 && !planner.querySelector('input[name="service"]:checked')) {
        planner.querySelector('.choice-grid').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        planner.querySelector('.choice-grid').classList.add('needs-choice');
        setTimeout(() => planner.querySelector('.choice-grid')?.classList.remove('needs-choice'), 900);
        return;
      }
      showPlannerStep(plannerIndex + 1);
      $('#start').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }));
    $$('[data-back]', planner).forEach(button => button.addEventListener('click', () => showPlannerStep(plannerIndex - 1)));
    planner.addEventListener('submit', event => {
      event.preventDefault();
      if (!planner.reportValidity()) return;
      const lines = [
        'ЗАЯВКА В FRAME LAB',
        '────────────────────────',
        `Направление: ${fieldValue('service')}`,
        `Предварительный состав: ${{'Сайт под ключ':'структура, дизайн, адаптивная разработка и запуск — точный состав согласуем после обсуждения','Лендинг':'одна продающая страница, структура, дизайн и адаптивная разработка','Интернет-магазин':'каталог, карточки товаров, сценарий заказа и интерфейс магазина','Дизайн интерфейса':'структура экранов, пользовательские сценарии и дизайн-макеты','Фирменный стиль':'визуальное направление, логотип и базовые правила использования — состав уточним','Редизайн':'аудит текущего решения, обновление структуры и визуального языка','Пока не знаю':'поможем определить подходящий формат после разговора'}[fieldValue('service')] || 'Определим вместе после знакомства с задачей'}`,
        `Бизнес: ${fieldValue('business')}`,
        `Цель: ${fieldValue('goal')}`,
        `Желаемый срок: ${fieldValue('deadline')}`,
        `Материалы: ${fieldValue('materials')}`,
        `Ссылка / референс: ${fieldValue('reference')}`,
        `Дополнительно: ${fieldValue('details')}`,
        `Имя: ${fieldValue('client')}`,
        `Контакт: ${fieldValue('contact')}`,
        `Бюджет: ${fieldValue('budget')}`,
        '────────────────────────',
        'Собрано на сайте frame-lab.'
      ];
      briefOutput.textContent = lines.join('\n');
      plannerSteps.forEach(step => { step.hidden = true; });
      resultPanel.hidden = false;
      stepLabel.textContent = 'ГОТОВО / БРИФ СФОРМИРОВАН';
      progressFill.style.width = '100%';
      resultPanel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
    $('#copy-brief')?.addEventListener('click', async () => {
      const text = briefOutput.textContent;
      const status = $('#copy-status');
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else {
          const temp = document.createElement('textarea'); temp.value = text; temp.style.position = 'fixed'; temp.style.opacity = '0';
          document.body.appendChild(temp); temp.select();
          if (!document.execCommand('copy')) throw new Error('copy unavailable');
          temp.remove();
        }
        status.textContent = 'Бриф скопирован. Откройте Instagram и вставьте его в сообщение.';
      } catch (_) { status.textContent = 'Не удалось скопировать автоматически. Выделите текст выше и скопируйте его вручную.'; }
    });
    $('#restart-brief')?.addEventListener('click', () => {
      planner.reset(); showPlannerStep(0);
      $('#start').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    // Service rows become shortcuts into the brief, preselecting the closest service.
    const serviceMap = ['Фирменный стиль', 'Дизайн интерфейса', 'Сайт под ключ', 'Пока не знаю', 'Пока не знаю', 'Пока не знаю'];
    $$('.service-item').forEach((item, index) => {
      const link = document.createElement('a'); link.className = 'service-brief-link'; link.href = '#start';
      link.innerHTML = 'ОБСУДИТЬ ЭТУ УСЛУГУ <span aria-hidden="true">↗</span>';
      link.addEventListener('click', () => {
        const target = [...planner.querySelectorAll('input[name="service"]')].find(input => input.value === serviceMap[index]);
        if (target) target.checked = true;
        showPlannerStep(0);
      });
      const main = $('.service-main', item); if (main) main.appendChild(link);
    });
  }

  // Editorial interaction layer: header state, tilt cards and material switch.
  const header = $('.site-header');
  const updateHeaderState = () => header?.classList.toggle('is-scrolled', window.scrollY > 28);
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  updateHeaderState();

  // Pointer tilt pauses while the page is scrolling and resumes only after it settles.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    const tiltCards = Array.from(document.querySelectorAll('#work .project-card'));
    let pageIsScrolling = false;
    let scrollIdleTimer = 0;
    window.addEventListener('scroll', () => {
      pageIsScrolling = true;
      tiltCards.forEach(card => {
        card.dataset.scrollPaused = '1';
        const art = card.querySelector('.project-art');
        if (art) art.style.transform = '';
      });
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        pageIsScrolling = false;
        tiltCards.forEach(card => {
          delete card.dataset.scrollPaused;
          if (card.matches(':hover') && card.dataset.pointerInside === '1') {
            card.dispatchEvent(new Event('frame:tilt-resume'));
          }
        });
      }, 170);
    }, { passive: true });

    tiltCards.forEach(card => {
      // Keep the article itself stationary as the pointer hit-area. Only its
      // artwork plane tilts, preventing edge leave/enter feedback and jitter.
      const art = card.querySelector('.project-art');
      if (!art) return;
      let frame = 0, pointerX = 0, pointerY = 0, pointerInside = false;
      let currentX = 0, currentY = 0, targetX = 0, targetY = 0, lastFrameTime = 0;
      const applyTilt = now => {
        frame = 0;
        if (pageIsScrolling) { lastFrameTime = 0; return; }
        if (pointerInside) {
          const rect = card.getBoundingClientRect();
          const px = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width));
          const py = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));
          // Soft saturation prevents a sharp angular response in the last pixels.
          const soft = value => {
            const centered = (value - .5) * 2;
            return Math.sign(centered) * (1 - Math.exp(-Math.abs(centered) * .72)) / (1 - Math.exp(-.72));
          };
          targetY = soft(px) * 4.2;
          targetX = -soft(py) * 3.6;
          art.style.setProperty('--spot-x', (px * 100).toFixed(1) + '%');
          art.style.setProperty('--spot-y', (py * 100).toFixed(1) + '%');
        } else {
          targetX = 0;
          targetY = 0;
        }
        const dt = lastFrameTime ? Math.min(40, now - lastFrameTime) : 16.7;
        lastFrameTime = now;
        const ease = 1 - Math.exp(-dt / (pointerInside ? 210 : 290));
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        art.style.transition = 'none';
        art.style.transform = `perspective(1500px) rotateX(${currentX.toFixed(3)}deg) rotateY(${currentY.toFixed(3)}deg)`;
        if (Math.abs(targetX - currentX) > .008 || Math.abs(targetY - currentY) > .008) {
          frame = requestAnimationFrame(applyTilt);
        } else {
          lastFrameTime = 0;
        }
      };
      const scheduleTilt = () => {
        if (!frame && !pageIsScrolling) frame = requestAnimationFrame(applyTilt);
      };
      card.addEventListener('pointerenter', event => {
        pointerInside = true;
        card.dataset.pointerInside = '1';
        pointerX = event.clientX;
        pointerY = event.clientY;
        scheduleTilt();
      }, { passive: true });
      card.addEventListener('pointermove', event => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!pageIsScrolling) scheduleTilt();
      }, { passive: true });
      card.addEventListener('frame:tilt-resume', scheduleTilt);
      card.addEventListener('pointerleave', () => {
        pointerInside = false;
        delete card.dataset.pointerInside;
        targetX = 0;
        targetY = 0;
        if (!frame && !pageIsScrolling) frame = requestAnimationFrame(applyTilt);
        art.style.setProperty('--spot-x', '50%');
        art.style.setProperty('--spot-y', '50%');
      });
    });
  }

  // Print archive: one animation system owns the card transform.
  // CSS hover transitions must never compete with these frame-by-frame updates.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion && !lowPower) {
    $$('[data-print-card]').forEach(card => {
      let inside = false, x = 0, y = 0;
      let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
      let frame = 0, lastTime = 0;
      const animate = now => {
        frame = 0;
        const dt = lastTime ? Math.min(40, now - lastTime) : 16.7;
        lastTime = now;
        // Slow, critically damped response; no CSS transition is layered on top.
        const tau = inside ? 260 : 380;
        const ease = 1 - Math.exp(-dt / tau);
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        card.style.setProperty('--print-rotate-x', currentX.toFixed(3) + 'deg');
        card.style.setProperty('--print-rotate-y', currentY.toFixed(3) + 'deg');
        if (Math.abs(targetX-currentX)>.006 || Math.abs(targetY-currentY)>.006) {
          frame = requestAnimationFrame(animate);
        } else {
          currentX = targetX;
          currentY = targetY;
          card.style.setProperty('--print-rotate-x', currentX.toFixed(3) + 'deg');
          card.style.setProperty('--print-rotate-y', currentY.toFixed(3) + 'deg');
          lastTime = 0;
        }
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(animate); };
      const updateTarget = event => {
        const rect = card.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        // Smoothstep response reaches a gentle maximum without a hard edge snap.
        const soft = value => {
          const v = Math.max(-1, Math.min(1, value));
          return v * (1.5 - .5 * v * v);
        };
        targetY = soft((px - .5) * 2) * 2.8;
        targetX = -soft((py - .5) * 2) * 2.3;
        schedule();
      };
      card.addEventListener('pointerenter', event => {
        inside = true;
        updateTarget(event);
      }, { passive: true });
      card.addEventListener('pointermove', updateTarget, { passive: true });
      card.addEventListener('pointerleave', () => {
        inside = false;
        targetX = 0;
        targetY = 0;
        schedule();
      });
    });
  }

  // Micro-detail pointer lighting for UI surfaces. Values are coalesced into one frame.
  if (!coarsePointer && !reduceMotion && !lowPower) {
    const bindDetailLight = (selector, strength = 1) => {
      document.querySelectorAll(selector).forEach(element => {
        let frame = 0, x = 50, y = 50;
        element.addEventListener('pointermove', event => {
          const rect = element.getBoundingClientRect();
          x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
          y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
          if (frame) return;
          frame = requestAnimationFrame(() => {
            element.style.setProperty('--detail-x', x.toFixed(1) + '%');
            element.style.setProperty('--detail-y', y.toFixed(1) + '%');
            element.style.setProperty('--detail-strength', String(strength));
            frame = 0;
          });
        }, { passive: true });
        element.addEventListener('pointerleave', () => {
          cancelAnimationFrame(frame);
          frame = 0;
          element.style.setProperty('--detail-x', '50%');
          element.style.setProperty('--detail-y', '50%');
        });
      });
    };
    bindDetailLight('.object-card', 1);
    bindDetailLight('.service-item', .7);
    bindDetailLight('.choice-card', .65);
    bindDetailLight('.review-card', .85);
  }

  // Apply the reference liquid morph to every compact interactive button and CTA.
  // Structural controls (hamburger, modal close, orbit cards and index rows) keep their native geometry.
  // Every native button and button-like CTA uses one liquid surface system.
  // Liquid CTA class is applied by the contour engine after it snapshots native styles.

  // Activate the existing glass/chrome/lime material controls in Creative Lab.
  const materialButtons = Array.from(document.querySelectorAll('[data-material-mode]'));
  materialButtons.forEach(button => {
    button.addEventListener('click', () => {
      const material = button.dataset.materialMode;
      materialButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      if (labVisual) labVisual.dataset.material = material;
    });
  });


  // Chapter-aware navigation: the active section gets a live underline.
  const desktopNavLinks = $$('.desktop-nav a[href^="#"]');
  const navSectionTargets = desktopNavLinks.map(link => $(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && desktopNavLinks.length && !reduceMotion) {
    const sectionNavObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      desktopNavLinks.forEach(link => {
        const active = link.getAttribute('href') === '#' + visible.target.id;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin:'-34% 0px -54% 0px', threshold:[0,.12,.3,.55] });
    navSectionTargets.forEach(section => sectionNavObserver.observe(section));
  }

  // Motion direction: cursor ring, pointer-led hero light, section tracking and tactile feedback.
  document.documentElement.classList.add('motion-ready');

  // Subtle pointer parallax is restricted to the hero object and never runs on touch screens.
  const hero = $('.hero'), heroObject = $('.hero-visual');
  if (hero && heroObject && !coarsePointer && !reduceMotion && !lowPower) {
    let heroFrame = 0, heroX = 0, heroY = 0;
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      heroX = ((event.clientX - rect.left) / rect.width - .5) * 16;
      heroY = ((event.clientY - rect.top) / rect.height - .5) * 13;
      if (!heroFrame) heroFrame = requestAnimationFrame(() => {
        heroObject.style.setProperty('--hero-x', heroX.toFixed(1) + 'px');
        heroObject.style.setProperty('--hero-y', heroY.toFixed(1) + 'px');
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--hero-light-x', ((event.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
        hero.style.setProperty('--hero-light-y', ((event.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
        heroFrame = 0;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      heroObject.style.setProperty('--hero-x', '0px');
      heroObject.style.setProperty('--hero-y', '0px');
      hero.style.setProperty('--hero-light-x', '72%');
      hero.style.setProperty('--hero-light-y', '44%');
    });
  }

  // Stagger cards as they enter the viewport; reduced-motion and no-JS states remain visible.
  const motionItems = Array.from(document.querySelectorAll('.project-card,.service-item,.object-card,.process-step,.lab-visual,.planner-shell,.review-form-shell,.faq-list details'));
  motionItems.forEach((el, index) => {
    el.style.setProperty('--motion-order', String(index % 6));
    el.classList.add('motion-item');
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const motionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('motion-visible');
        motionObserver.unobserve(entry.target);
      }
    }), { threshold: .1, rootMargin: '0px 0px -5% 0px' });
    motionItems.forEach(el => motionObserver.observe(el));
  } else motionItems.forEach(el => el.classList.add('motion-visible'));

  // Keep the current section visible in the desktop navigation.
  const sectionLinks = $$('.desktop-nav a');
  const observedSections = sectionLinks.map(link => $(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && observedSections.length) {
    const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => {
        const active = link.getAttribute('href') === '#' + entry.target.id;
        link.classList.toggle('current', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }), { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    observedSections.forEach(section => sectionObserver.observe(section));
  }

  // Tactile feedback for controls, without changing their native click behavior.
  if (!coarsePointer && !reduceMotion) {
    $$('.planner-next,.planner-back,.filter-btn,.material-btn,.lab-button,.start-button,.round-link').forEach(control => {
      control.addEventListener('pointerdown', () => {
        control.classList.remove('is-pressed');
        void control.offsetWidth;
        control.classList.add('is-pressed');
      });
      control.addEventListener('animationend', () => control.classList.remove('is-pressed'));
    });
  }

  $('#year').textContent = new Date().getFullYear();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (labTimer) window.clearTimeout(labTimer);
      labTimer = 0;
      cancelAnimationFrame(labRaf);
      labRaf = 0;
      if (gravityTimer) window.clearTimeout(gravityTimer);
      gravityTimer = 0;
      cancelAnimationFrame(gravityRaf);
      gravityRaf = 0;
    } else {
      if (labInView && !reduceMotion && !coarsePointer && !lowPower && labCtx && !labRaf && !labTimer) {
        labRaf = requestAnimationFrame(drawLab);
      }
      if (gravityVisible && !reduceMotion && !coarsePointer && !lowPower && gravityCtx && !gravityRaf && !gravityTimer) {
        gravityRaf = requestAnimationFrame(drawGravity);
      }
    }
  });
}

)();



(() => {
'use strict';

/*
 * FRAME LAB — closed-contour liquid surface.
 * Every control owns its own pointer, contour, inertia and animation state.
 * No neighbouring-button blending and no fixed-size partial blob.
 */
const SELECTOR = 'button:not(.project-orbit-node),.header-contact,.start-button,#instagram-brief,.round-link,.service-brief-link';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = '#292729';
const states = new WeakMap();
const items = new Set();
let visualStateObserver = null;
let raf = 0;
let previousFrame = 0;
let resizeObserver = null;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;

function wrapDirectText(el) {
  Array.from(el.childNodes).forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) return;
    const span = document.createElement('span');
    span.className = 'liquid-label-fragment';
    span.textContent = node.nodeValue;
    el.replaceChild(span, node);
  });
}

function liftContent(el) {
  Array.from(el.children).forEach(child => {
    if (child.classList.contains('liquid-canvas-layer')) return;
    if (getComputedStyle(child).position === 'static') child.style.position = 'relative';
    child.style.zIndex = '2';
  });
}

function radiusOf(el, width, height) {
  const raw = getComputedStyle(el).borderTopLeftRadius || '0px';
  const minSide = Math.min(width, height);
  const radius = raw.includes('%')
    ? parseFloat(raw) / 100 * minSide
    : parseFloat(raw);
  return clamp(Number.isFinite(radius) ? radius : 0, 0, minSide * .5);
}

function isTransparent(color) {
  if (!color || color === 'transparent') return true;
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return false;
  const values = match[1].split(/[,\s/]+/).filter(Boolean);
  return values.length >= 4 && Number(values[3]) <= .01;
}

function refreshNativeStyle(state) {
  const el=state.el;
  if (visualStateObserver) visualStateObserver.disconnect();
  // Temporarily remove only the engine class so authored hover/active/selected
  // styles can be read without the engine's transparent-paint override.
  el.classList.remove('liquid-cta');
  const style=getComputedStyle(el);
  state.originalBackgroundColor=style.backgroundColor;
  state.originalBackgroundImage=style.backgroundImage;
  state.originalBorderColor=style.borderTopColor;
  state.originalBorderWidth=Math.max(1,parseFloat(style.borderTopWidth)||1);
  state.originalLiquidFill=style.getPropertyValue('--liquid-fill').trim();
  el.classList.add('liquid-cta');
  if (visualStateObserver) visualStateObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','aria-pressed','aria-selected','data-state']});
}
function fillOf(el,state) {
  const custom = state.originalLiquidFill;
  if (custom) return custom;
  // Keep authored gradients and image fills intact beneath the transparent
  // canvas; solid controls are repainted from their pre-engine color.
  if (state.originalBackgroundImage && state.originalBackgroundImage !== 'none') return 'transparent';
  return state.originalBackgroundColor && !isTransparent(state.originalBackgroundColor)
    ? state.originalBackgroundColor : BASE;
}

function isGreenSurface() { return false; }

function resize(state) {
  const width = Math.max(1, state.el.clientWidth || state.el.offsetWidth || 1);
  const height = Math.max(1, state.el.clientHeight || state.el.offsetHeight || 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  if (Math.abs(width - state.width) < .25 &&
      Math.abs(height - state.height) < .25 &&
      Math.abs(dpr - state.dpr) < .01) return;

  state.width = width;
  state.height = height;
  state.dpr = dpr;
  state.canvas.width = Math.max(1, Math.round(width * dpr));
  state.canvas.height = Math.max(1, Math.round(height * dpr));
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function roundedRectContour(width, height, radius, count) {
  const r = clamp(radius, 0, Math.min(width, height) * .5);
  const horizontal = Math.max(0, width - r * 2);
  const vertical = Math.max(0, height - r * 2);
  const quarter = Math.PI * r * .5;

  const segments = [
    {length:horizontal, point:t=>({x:r+t,y:0,nx:0,ny:-1})},
    {length:quarter, point:t=>{const a=-Math.PI*.5+t/Math.max(r,1e-4);return {x:width-r+r*Math.cos(a),y:r+r*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)}}},
    {length:vertical, point:t=>({x:width,y:r+t,nx:1,ny:0})},
    {length:quarter, point:t=>{const a=t/Math.max(r,1e-4);return {x:width-r+r*Math.cos(a),y:height-r+r*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)}}},
    {length:horizontal, point:t=>({x:width-r-t,y:height,nx:0,ny:1})},
    {length:quarter, point:t=>{const a=Math.PI*.5+t/Math.max(r,1e-4);return {x:r+r*Math.cos(a),y:height-r+r*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)}}},
    {length:vertical, point:t=>({x:0,y:height-r-t,nx:-1,ny:0})},
    {length:quarter, point:t=>{const a=Math.PI+t/Math.max(r,1e-4);return {x:r+r*Math.cos(a),y:r+r*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)}}}
  ].filter(segment => segment.length > .001);

  const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);
  const points = [];
  for (let i = 0; i < count; i++) {
    let distance = perimeter * i / count;
    let selected = segments[segments.length - 1];
    for (const segment of segments) {
      if (distance <= segment.length) { selected = segment; break; }
      distance -= segment.length;
    }
    points.push(selected.point(distance));
  }
  return points;
}

function smoothContour(points) {
  const first = points[0], last = points[points.length - 1];
  const path = new Path2D();
  path.moveTo((last.x + first.x) * .5, (last.y + first.y) * .5);
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    path.quadraticCurveTo(a.x, a.y, (a.x + b.x) * .5, (a.y + b.y) * .5);
  }
  path.closePath();
  return path;
}

function contourFor(state) {
  const {width,height,activity} = state;
  const radius = radiusOf(state.el,width,height);
  const minSide = Math.max(1,Math.min(width,height));
  // Higher point density prevents the long lower edge from resolving as a
  // straight, detached stroke on wide buttons.
  const count = clamp(Math.round((width+height)*.92),112,256);
  const base = roundedRectContour(width,height,radius,count);
  const reach = clamp(minSide*1.34,40,104);
  const amplitude = Math.min(12,minSide*.17);
  const speed = Math.min(1,Math.hypot(state.vx,state.vy)/15);
  const phase = state.phase;
  const result = [];

  base.forEach((point,index) => {
    const dx = point.x-state.x, dy = point.y-state.y;
    const distance = Math.hypot(dx,dy);
    const influence = Math.exp(-Math.pow(distance/reach,2));
    const tailDistance = Math.hypot(point.x-state.tailX,point.y-state.tailY);
    const tail = Math.exp(-Math.pow(tailDistance/(reach*.74),2));
    const angle = index/count*Math.PI*2;
    const wave =
      Math.sin(angle*7+phase)*.34 +
      Math.cos(angle*11-phase*.92)*.19 +
      Math.sin(angle*3-phase*1.3)*.12;
    const pull = activity * (
      influence*amplitude*(.78+speed*.26) +
      tail*amplitude*.23 +
      wave*influence*.82
    );
    const shear = activity*influence*Math.sin(angle*5+phase)*Math.min(1.45,amplitude*.18);
    const x = point.x-point.nx*pull-point.ny*shear;
    const y = point.y-point.ny*pull+point.nx*shear;
    result.push({
      x:clamp(x,.65,Math.max(.65,width-.65)),
      y:clamp(y,.65,Math.max(.65,height-.65))
    });
  });

  return {path:smoothContour(result),points:result};
}

function draw(state) {
  const {ctx,canvas,width,height,dpr,activity} = state;
  if (width < 2 || height < 2) return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const contour = contourFor(state);
  const path = contour.path;
  const fill = fillOf(state.el,state);
  ctx.fillStyle = fill;
  ctx.fill(path);

  const green = isGreenSurface(state.el);
  ctx.save();
  ctx.clip(path);

  // The liquid field and its delayed wake stay inside the real button shape.
  if (activity > .001) {
    const x=clamp(state.x,0,width), y=clamp(state.y,0,height);
    const reach=clamp(Math.min(width,height)*1.12,44,116);
    const field=ctx.createRadialGradient(x-11-state.vx*1.3,y-9-state.vy*1.3,1,x,y,reach);
    if (green) {
      field.addColorStop(0,'rgba(91,69,132,.58)');
      field.addColorStop(.18,'rgba(125,98,169,.48)');
      field.addColorStop(.4,'rgba(157,132,194,.32)');
      field.addColorStop(.68,'rgba(193,174,220,.17)');
      field.addColorStop(.88,'rgba(222,210,239,.07)');
      field.addColorStop(1,'rgba(222,210,239,0)');
    } else {
      field.addColorStop(0,'rgba(111,86,151,.56)');
      field.addColorStop(.18,'rgba(145,119,181,.46)');
      field.addColorStop(.42,'rgba(177,155,205,.3)');
      field.addColorStop(.7,'rgba(207,191,225,.15)');
      field.addColorStop(1,'rgba(207,191,225,0)');
    }
    ctx.globalAlpha=activity*(green?.88:.58);
    ctx.fillStyle=field;
    ctx.fillRect(0,0,width,height);

    const trailRadius=reach*.58;
    const trail=ctx.createRadialGradient(state.tailX,state.tailY,0,state.tailX,state.tailY,trailRadius);
    if (green) {
      trail.addColorStop(0,'rgba(237,222,255,.28)');
      trail.addColorStop(.32,'rgba(204,181,235,.2)');
      trail.addColorStop(.72,'rgba(153,126,190,.09)');
      trail.addColorStop(1,'rgba(153,126,190,0)');
    } else {
      trail.addColorStop(0,'rgba(239,224,255,.3)');
      trail.addColorStop(.34,'rgba(207,188,232,.2)');
      trail.addColorStop(.72,'rgba(153,133,184,.09)');
      trail.addColorStop(1,'rgba(153,133,184,0)');
    }
    ctx.globalAlpha=activity*(green?.78:.52);
    ctx.fillStyle=trail;
    ctx.fillRect(0,0,width,height);


  }

  ctx.restore();

}

function schedule() {
  if (!REDUCED && !raf) raf = requestAnimationFrame(render);
}

function render(time) {
  raf = 0;
  const dt = clamp((previousFrame ? (time-previousFrame)/16.67 : 1),.45,2.4);
  previousFrame = time;
  let active = false;

  items.forEach(state => {
    if (!state.el.isConnected) {
      items.delete(state);
      return;
    }
    resize(state);
    const engaged = state.hover || state.focused || state.pressed;
    const target = engaged ? 1 : 0;
    const oldX = state.x, oldY = state.y;
    state.x = lerp(state.x,state.targetX,(engaged?.32:.17)*dt);
    state.y = lerp(state.y,state.targetY,(engaged?.32:.17)*dt);
    state.tailX = lerp(state.tailX,state.x,.105*dt);
    state.tailY = lerp(state.tailY,state.y,.105*dt);
    state.vx = lerp(state.vx,(state.x-oldX)/Math.max(.45,dt),.25);
    state.vy = lerp(state.vy,(state.y-oldY)/Math.max(.45,dt),.25);
    state.activity = lerp(state.activity,target,(engaged?.29:.14)*dt);
    state.phase += (engaged?.055:.024)*dt;

    if (engaged || state.activity > .002 || state.needsDraw) {
      draw(state);
      state.needsDraw = false;
    }
    if (engaged || state.activity > .002) active = true;
  });

  if (active && !document.hidden) raf = requestAnimationFrame(render);
  else previousFrame = 0;
}

function init(el) {
  if (!(el instanceof Element) || states.has(el)) return;

  // Snapshot native appearance before .liquid-cta CSS changes its paint.
  const nativeStyle = getComputedStyle(el);
  const nativeBackgroundColor = nativeStyle.backgroundColor;
  const nativeBackgroundImage = nativeStyle.backgroundImage;
  const nativeBorderColor = nativeStyle.borderTopColor;
  const nativeBorderWidth = Math.max(1,parseFloat(nativeStyle.borderTopWidth)||1);
  const nativeLiquidFill = nativeStyle.getPropertyValue('--liquid-fill').trim();

  // Orbit clones can copy the old canvas. Remove only that copied layer.
  el.querySelectorAll(':scope > canvas.liquid-canvas-layer').forEach(node=>node.remove());
  wrapDirectText(el);
  liftContent(el);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  el.classList.add('liquid-cta');
  el.dataset.liquidReady = 'true';

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-canvas-layer';
  canvas.setAttribute('aria-hidden','true');
  el.prepend(canvas);

  const ctx = canvas.getContext('2d',{alpha:true,desynchronized:true});
  if (!ctx) {
    canvas.remove();
    el.classList.remove('liquid-cta');
    el.classList.add('liquid-fallback');
    return;
  }

  const state = {
    el,canvas,ctx,width:0,height:0,dpr:1,
    originalBackgroundColor:nativeBackgroundColor,
    originalBackgroundImage:nativeBackgroundImage,
    originalBorderColor:nativeBorderColor,
    originalBorderWidth:nativeBorderWidth,
    originalLiquidFill:nativeLiquidFill,
    x:0,y:0,targetX:0,targetY:0,tailX:0,tailY:0,
    vx:0,vy:0,activity:0,phase:0,
    hover:false,focused:false,pressed:false,needsDraw:true
  };
  states.set(el,state);
  items.add(state);
  resize(state);
  state.x=state.targetX=state.tailX=state.width*.5;
  state.y=state.targetY=state.tailY=state.height*.5;
  draw(state);
  if (resizeObserver) resizeObserver.observe(el);

  el.addEventListener('pointerenter',event=>{
    if (event.pointerType === 'touch') return;
    state.hover=true;
    updatePointer(state,event);
    schedule();
  },{passive:true});
  el.addEventListener('pointermove',event=>{
    if (event.pointerType === 'touch' && !state.pressed) return;
    updatePointer(state,event);
    if (event.pointerType !== 'touch') state.hover=true;
    schedule();
  },{passive:true});
  el.addEventListener('pointerleave',()=>{
    state.hover=false;
    state.pressed=false;
    schedule();
  },{passive:true});
  el.addEventListener('pointerdown',event=>{
    updatePointer(state,event);
    state.pressed=true;
    refreshNativeStyle(state);
    schedule();
  },{passive:true});
  el.addEventListener('focusin',()=>{
    state.focused=el.matches(':focus-visible');
    state.targetX=state.width*.5;
    state.targetY=state.height*.5;
    schedule();
  });
  el.addEventListener('focusout',event=>{
    if (event.relatedTarget && el.contains(event.relatedTarget)) return;
    state.focused=false;
    schedule();
  });
}

function updatePointer(state,event) {
  const rect=state.el.getBoundingClientRect();
  state.targetX=clamp((event.clientX-rect.left)/Math.max(1,rect.width)*state.width,0,state.width);
  state.targetY=clamp((event.clientY-rect.top)/Math.max(1,rect.height)*state.height,0,state.height);
}

document.querySelectorAll(SELECTOR).forEach(init);

if ('ResizeObserver' in window) {
  resizeObserver = new ResizeObserver(entries=>{
    entries.forEach(entry=>{
      const state=states.get(entry.target);
      if (!state) return;
      resize(state);
      state.needsDraw=true;
      if (state.hover || state.focused || state.pressed) schedule();
      else draw(state);
    });
  });
  items.forEach(state=>resizeObserver.observe(state.el));
}

const observer=new MutationObserver(records=>{
  records.forEach(record=>{
    record.addedNodes.forEach(node=>{
      if (!(node instanceof Element)) return;
      if (node.matches(SELECTOR)) init(node);
      node.querySelectorAll(SELECTOR).forEach(init);
    });
  });
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed','aria-selected','data-state']});
visualStateObserver=new MutationObserver(records=>{
  const touched=new Set();
  records.forEach(record=>{
    const state=states.get(record.target);
    if(state)touched.add(state);
  });
  touched.forEach(state=>{
    refreshNativeStyle(state);
    state.needsDraw=true;
    if(state.hover || state.pressed || state.focused) schedule();
    else draw(state);
  });
});
visualStateObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','aria-pressed','aria-selected','data-state']});

document.addEventListener('pointerup',()=>{
  items.forEach(state=>{
    if (state.pressed) {
      state.pressed=false;
      schedule();
    }
  });
},true);
document.addEventListener('pointercancel',()=>{
  items.forEach(state=>{
    if (state.pressed) {
      state.pressed=false;
      schedule();
    }
  });
},true);
document.addEventListener('visibilitychange',()=>{
  if (!document.hidden) return;
  if (raf) cancelAnimationFrame(raf);
  raf=0;
  previousFrame=0;
  items.forEach(state=>{
    state.hover=false;
    state.pressed=false;
    state.activity=0;
    draw(state);
  });
});
})();
