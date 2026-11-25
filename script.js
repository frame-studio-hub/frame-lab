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
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    projectCards.forEach(card => card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter));
  }));

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
  $$('[data-close-modal]').forEach(el => el.addEventListener('click', closeProjectModal));

  // Process step indicator.
  const steps = $$('.process-step'), lineFill = $('.process-line span');
  steps.forEach(step => step.addEventListener('click', () => {
    steps.forEach(s => s.classList.toggle('active', s === step));
    if (lineFill) lineFill.style.top = `${Number(step.dataset.step) * 20}%`;
  }));

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

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    projectCards.forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--tilt-x', (((px - .5) * 7).toFixed(2)) + 'deg');
        card.style.setProperty('--tilt-y', (((.5 - py) * 6).toFixed(2)) + 'deg');
        const art = $('.project-art', card);
        if (art) {
          art.style.setProperty('--spot-x', (px * 100).toFixed(1) + '%');
          art.style.setProperty('--spot-y', (py * 100).toFixed(1) + '%');
        }
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        const art = $('.project-art', card);
        if (art) { art.style.setProperty('--spot-x', '50%'); art.style.setProperty('--spot-y', '50%'); }
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


  // Motion direction: cursor ring, pointer-led hero light, section tracking and tactile feedback.
  document.documentElement.classList.add('motion-ready');

  // Subtle pointer parallax is restricted to the hero object and never runs on touch screens.
  const hero = $('.hero'), heroObject = $('.hero-object');
  if (hero && heroObject && !coarsePointer && !reduceMotion && !lowPower) {
    let heroFrame = 0, heroX = 0, heroY = 0;
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      heroX = ((event.clientX - rect.left) / rect.width - .5) * 16;
      heroY = ((event.clientY - rect.top) / rect.height - .5) * 13;
      if (!heroFrame) heroFrame = requestAnimationFrame(() => {
        heroObject.style.setProperty('--hero-x', heroX.toFixed(1) + 'px');
        heroObject.style.setProperty('--hero-y', heroY.toFixed(1) + 'px');
        heroFrame = 0;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      heroObject.style.setProperty('--hero-x', '0px');
      heroObject.style.setProperty('--hero-y', '0px');
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
})();