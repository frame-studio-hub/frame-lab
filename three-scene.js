// Lightweight visual fallback: the hero sculpture is rendered with CSS.
// WebGL was intentionally removed from the scrolling page to keep frame times stable.
(() => {
  const canvas = document.querySelector('#scene-3d');
  if (canvas) canvas.hidden = true;
  const label = document.querySelector('.scene-label');
  if (label) label.hidden = true;
})();
