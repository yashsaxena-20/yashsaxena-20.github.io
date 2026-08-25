// ══════════════════════════════════════════════════════════
//  INTEGER PARTITION GENERATOR  (hero signature element)
//  Draws a random partition of n as a Young diagram every
//  few seconds — a nod to the partition-theory research
//  mentioned in the About/Experience sections.
//
//  Cells cascade in with a staggered "back-ease" bounce,
//  the outgoing diagram dissolves row-by-row rather than
//  hard-cutting, colour sweeps from amber → teal by row,
//  and hovering a row highlights that "part" of the
//  partition with a live tooltip.
// ══════════════════════════════════════════════════════════
(function () {
  const svg = document.getElementById('partitionSvg');
  const caption = document.getElementById('partitionCaption');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const SIZE = 320;
  const CELL = 30;
  const GAP = 6;
  const ENTER_MS = 520;
  const EXIT_MS = 320;
  const STAGGER_MS = 32;
  const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  // Generate all partitions of n (small n only — this stays fast)
  function partitions(n, max) {
    max = max || n;
    if (n === 0) return [[]];
    const results = [];
    for (let k = Math.min(n, max); k >= 1; k--) {
      partitions(n - k, k).forEach(rest => results.push([k, ...rest]));
    }
    return results;
  }

  // amber → teal interpolation, by row depth
  function rowColor(r, rows) {
    const t = rows <= 1 ? 0 : r / (rows - 1);
    const from = [232, 163, 61];   // amber
    const to = [95, 203, 187];     // teal
    const mix = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  }

  const sequence = [4, 5, 6, 7, 8, 6, 5];
  let seqIndex = 0;
  let currentGroup = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function typeCaption(text) {
    if (!caption) return;
    caption.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'typed-cursor';
    cursor.textContent = '▌';
    caption.appendChild(cursor);

    let i = 0;
    const step = () => {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text[i]);
        i++;
        setTimeout(step, 14);
      }
    };
    step();
  }

  function buildDiagram(parts) {
    const rows = parts.length;
    const cols = parts[0];
    const gridW = cols * CELL + (cols - 1) * GAP;
    const gridH = rows * CELL + (rows - 1) * GAP;
    const offsetX = (SIZE - gridW) / 2;
    const offsetY = (SIZE - gridH) / 2;

    const group = document.createElementNS(NS, 'g');
    let cellIndex = 0;

    parts.forEach((rowLen, r) => {
      const rowGroup = document.createElementNS(NS, 'g');
      for (let c = 0; c < rowLen; c++) {
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('x', offsetX + c * (CELL + GAP));
        rect.setAttribute('y', offsetY + r * (CELL + GAP));
        rect.setAttribute('width', CELL);
        rect.setAttribute('height', CELL);
        rect.setAttribute('rx', 4);
        rect.setAttribute('fill', rowColor(r, rows));
        rect.setAttribute('stroke', 'rgba(234,227,211,0.25)');
        rect.setAttribute('stroke-width', '1');

        const title = document.createElementNS(NS, 'title');
        title.textContent = `part ${r + 1} = ${rowLen}`;
        rect.appendChild(title);

        if (!prefersReducedMotion) {
          rect.style.opacity = '0';
          rect.style.transform = 'scale(0.25) rotate(-10deg)';
          rect.style.transition =
            `opacity ${ENTER_MS}ms ease ${cellIndex * STAGGER_MS}ms, ` +
            `transform ${ENTER_MS}ms ${BOUNCE} ${cellIndex * STAGGER_MS}ms`;
        }

        rect.addEventListener('mouseenter', () => {
          rowGroup.style.transition = 'opacity 0.2s ease';
          Array.from(group.children).forEach(g => {
            g.style.opacity = g === rowGroup ? '1' : '0.35';
          });
        });
        rect.addEventListener('mouseleave', () => {
          Array.from(group.children).forEach(g => { g.style.opacity = '1'; });
        });

        rowGroup.appendChild(rect);
        cellIndex++;
      }
      group.appendChild(rowGroup);
    });

    return group;
  }

  function render(n) {
    const all = partitions(n);
    const parts = all[Math.floor(Math.random() * all.length)];
    const newGroup = buildDiagram(parts);

    const finishEntrance = () => {
      svg.appendChild(newGroup);
      currentGroup = newGroup;
      if (prefersReducedMotion) return;
      requestAnimationFrame(() => {
        Array.from(newGroup.querySelectorAll('rect')).forEach(rect => {
          rect.style.opacity = '1';
          rect.style.transform = 'scale(1) rotate(0deg)';
        });
      });
    };

    if (currentGroup && !prefersReducedMotion) {
      const oldRects = Array.from(currentGroup.querySelectorAll('rect'));
      oldRects.forEach((rect, i) => {
        const delay = i * (EXIT_MS / Math.max(oldRects.length, 1));
        rect.style.transition = `opacity ${EXIT_MS}ms ease ${delay}ms, transform ${EXIT_MS}ms ease ${delay}ms`;
        rect.style.opacity = '0';
        rect.style.transform = 'scale(0.5) translateY(6px)';
      });
      setTimeout(() => {
        if (currentGroup && currentGroup.parentNode) currentGroup.remove();
        finishEntrance();
      }, EXIT_MS + 60);
    } else {
      if (currentGroup && currentGroup.parentNode) currentGroup.remove();
      finishEntrance();
    }

    typeCaption(`p(${n}) = ${all.length} — ${n} = ${parts.join(' + ')}`);
  }

  render(sequence[0]);

  if (!prefersReducedMotion) {
    setInterval(() => {
      seqIndex = (seqIndex + 1) % sequence.length;
      render(sequence[seqIndex]);
    }, 2800);
  }
})();

// ══════════════════════════════════════════════════════════
//  SCROLL REVEAL
// ══════════════════════════════════════════════════════════
(function () {
  const els = document.querySelectorAll('.reveal, .reveal-up');
  if (!els.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    els.forEach(el => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in'), i * 40);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => observer.observe(el));
})();

// ══════════════════════════════════════════════════════════
//  NAV — active-section tracking
// ══════════════════════════════════════════════════════════
(function () {
  const links = document.querySelectorAll('.nav-links a[data-section]');
  if (!links.length) return;

  const sections = Array.from(links)
    .map(link => document.getElementById(link.dataset.section))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.dataset.section === entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
})();

// ══════════════════════════════════════════════════════════
//  BACK TO TOP
// ══════════════════════════════════════════════════════════
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
