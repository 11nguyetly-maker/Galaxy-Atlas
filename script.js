(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const nav = document.getElementById('chapterNav');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  const sidebar = document.getElementById('sidebar');
  let current = 0;
  slides.forEach((slide, i) => {
    if (i === 0) return;
    const button = document.createElement('button');
    button.className = 'chapter-link';
    button.innerHTML = '<span>' + String(i).padStart(2,'0') + '</span>' + slide.dataset.title;
    button.addEventListener('click', () => go(i));
    nav.appendChild(button);
  });
  const links = [...nav.querySelectorAll('button')];
  function go(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((s,i) => s.classList.toggle('active', i === current));
    links.forEach((b,i) => b.classList.toggle('active', i + 1 === current));
    fill.style.width = ((current + 1) / slides.length * 100) + '%';
    text.textContent = String(current + 1).padStart(2,'0') + ' / ' + String(slides.length - 1).padStart(2,'0');
    prev.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    sidebar.classList.remove('open');
    history.replaceState(null, '', '#slide-' + current);
  }
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.go))));
  document.getElementById('tocToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('keydown', e => {
    if (['ArrowRight','PageDown',' '].includes(e.key)) { e.preventDefault(); go(current + 1); }
    if (['ArrowLeft','PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    if (e.key === 'Home') go(0);
    if (e.key === 'End') go(slides.length - 1);
    if (e.key === 'Escape') sidebar.classList.remove('open');
  });
  const initial = Number((location.hash.match(/slide-(\d+)/) || [])[1]);
  go(Number.isFinite(initial) ? initial : 0);
})();