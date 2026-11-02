(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Scroll progress and soft cursor light.
  const progress = $('.scroll-progress span');
  const glow = $('.cursor-glow');
  let pointerX = innerWidth / 2, pointerY = innerHeight / 2, glowX = pointerX, glowY = pointerY;
  if (!coarsePointer && !reduceMotion) {
    window.addEventListener('pointermove', e => { pointerX = e.clientX; pointerY = e.clientY; }, { passive: true });
    const moveGlow = () => {
      glowX += (pointerX - glowX) * .12; glowY += (pointerY - glowY) * .12;
      if (glow) glow.style.left = `${glowX}px`, glow.style.top = `${glowY}px`;
      requestAnimationFrame(moveGlow);
    };
    requestAnimationFrame(moveGlow);
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
    menuButton?.setAttribute('aria-expanded', 'false'); menuButton?.setAttribute('aria-label', 'Open navigation');
    mobileMenu?.classList.remove('open'); mobileMenu?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('menu-open');
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
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
  if (!coarsePointer && !reduceMotion) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .08}px, ${dy * .12}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // Ambient canvas: subtle depth particles, low-cost and DPR-capped.
  const ambient = $('#ambient-canvas'), aCtx = ambient?.getContext('2d');
  let ambientW = 0, ambientH = 0, particles = [], ambientFrame = 0;
  function resizeAmbient() {
    if (!ambient || !aCtx) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5); ambientW = innerWidth; ambientH = innerHeight;
    ambient.width = Math.round(ambientW * dpr); ambient.height = Math.round(ambientH * dpr); aCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(65, Math.max(24, Math.floor(ambientW / 20)));
    particles = Array.from({ length: count }, () => ({ x: Math.random() * ambientW, y: Math.random() * ambientH, r: Math.random() * 1.3 + .25, vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .1, alpha: Math.random() * .25 + .05 }));
  }
  function drawAmbient() {
    if (!aCtx) return;
    aCtx.clearRect(0, 0, ambientW, ambientH);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = ambientW; if (p.x > ambientW) p.x = 0;
      if (p.y < 0) p.y = ambientH; if (p.y > ambientH) p.y = 0;
      aCtx.beginPath(); aCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); aCtx.fillStyle = `rgba(199,255,66,${p.alpha})`; aCtx.fill();
    });
    if (!reduceMotion) ambientFrame = requestAnimationFrame(drawAmbient);
  }
  resizeAmbient(); if (reduceMotion) drawAmbient(); else drawAmbient();
  window.addEventListener('resize', resizeAmbient, { passive: true });

  // Creative Lab interactive field.
  const labCanvas = $('#lab-canvas'), labCtx = labCanvas?.getContext('2d'), labVisual = $('#lab-visual');
  const modeButton = $('#lab-mode'), resetButton = $('#lab-reset'), labState = $('#lab-state');
  let labW = 0, labH = 0, labPoints = [], labMode = 0, labPointer = { x: .5, y: .5, active: false }, labRaf = 0;
  const modes = ['ORBITAL', 'FIELD', 'WAVE'];
  function resizeLab() {
    if (!labCanvas || !labCtx || !labVisual) return;
    const r = labVisual.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    labW = r.width; labH = r.height; labCanvas.width = Math.round(labW * dpr); labCanvas.height = Math.round(labH * dpr); labCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(180, Math.max(90, Math.floor(labW * labH / 1500)));
    labPoints = Array.from({ length: n }, (_, i) => ({ a: Math.random() * Math.PI * 2, radius: .12 + Math.random() * .38, speed: (Math.random() * .002 + .0004) * (i % 2 ? 1 : -1), size: Math.random() * 1.6 + .4, phase: Math.random() * 8 }));
  }
  function drawLab(time = 0) {
    if (!labCtx) return;
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
    if (!reduceMotion) labRaf = requestAnimationFrame(drawLab);
  }
  if (labVisual) {
    labVisual.addEventListener('pointermove', e => { const r = labVisual.getBoundingClientRect(); labPointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, active: true }; });
    labVisual.addEventListener('pointerleave', () => { labPointer.active = false; });
    modeButton?.addEventListener('click', () => { labMode = (labMode + 1) % modes.length; if (labState) labState.textContent = `FIELD: ${modes[labMode]}`; if (reduceMotion) drawLab(0); });
    resetButton?.addEventListener('click', () => { labMode = 0; labPointer = { x: .5, y: .5, active: false }; if (labState) labState.textContent = 'FIELD: ORBITAL'; resizeLab(); if (reduceMotion) drawLab(0); });
    resizeLab(); if (reduceMotion) drawLab(0); else drawLab();
    if ('ResizeObserver' in window) new ResizeObserver(resizeLab).observe(labVisual); else window.addEventListener('resize', resizeLab, { passive: true });
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

  $('#year').textContent = new Date().getFullYear();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(ambientFrame); cancelAnimationFrame(labRaf); }
    else if (!reduceMotion) { drawAmbient(); drawLab(); }
  });
})();
