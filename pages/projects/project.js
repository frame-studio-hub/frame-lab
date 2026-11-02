(() => {
  const projects = {
    '01': { title:'AETHER®', word:'AETHER', category:'АЙДЕНТИКА / ФИРМЕННЫЙ СТИЛЬ', description:'Исследование визуальной идентичности на пересечении формы, материи и света. A restrained typographic system meets a tactile, reflective visual world.', theme:'aether' },
    '02': { title:'NØRD STUDIO', word:'NØRD', category:'WEB DESIGN / DIGITAL EXPERIENCE', description:'A concept website for a design-minded object studio. Quiet typography, editorial pacing and a warm minimal interface form the direction.', theme:'nord' },
    '03': { title:'VANTA OBJECTS', word:'VANTA', category:'DIGITAL / ART DIRECTION', description:'An imagined digital objects label expressed through orbital geometry, dark surfaces and a precise, modular identity.', theme:'vanta' },
    '04': { title:'FLUX CAMPAIGN', word:'FLUX', category:'VISUAL CONTENT / CAMPAIGN', description:'A visual campaign experiment built around fluid form, shifting materiality and high-contrast art direction.', theme:'flux' },
    '05': { title:'OBJECT / 05', word:'OBJECT', category:'ART DIRECTION / BRANDING', description:'A study of contrast: sculptural geometry, muted tonal surfaces and a flexible graphic language.', theme:'object' },
    '06': { title:'SØL RETREAT', word:'SØL', category:'WEB DESIGN / DIGITAL EXPERIENCE', description:'A digital retreat concept with a slower rhythm, softened palette and immersive editorial layout.', theme:'sol' }
  };
  const params = new URLSearchParams(location.search); const id = params.get('id') || '01'; const item = projects[id] || projects['01'];
  document.title = `${item.title} — FRAME LAB®`;
  document.querySelector('#detail-number').textContent = `КОНЦЕПТ / ${id}`;
  document.querySelector('#detail-category').textContent = item.category;
  document.querySelector('#detail-title').textContent = item.title;
  document.querySelector('#detail-description').textContent = item.description;
  document.querySelector('#detail-art-word').textContent = item.word;
  document.querySelector('#detail-art').classList.add(`theme-${item.theme}`);
  const next = String((Number(id) % 6) + 1).padStart(2, '0');
  document.querySelector('#next-project').href = `project.html?id=${next}`;
})();
