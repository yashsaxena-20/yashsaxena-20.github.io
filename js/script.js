// ══════════════════════════════════════════════════════════
//  LINKOGRAPH SIMULATION  (hero signature element)
//  Animates the formation of a linkograph — the design-move
//  analysis diagram at the heart of the linkography-automation
//  project: bold dots land along the top as "design moves",
//  diagonal links emerge beneath them at true 45° (the
//  classic Goldschmidt linkograph construction), and a few
//  resulting intersections / high-degree moves are pulsed to
//  read as the "critical moves" that make a linkograph legible.
// ══════════════════════════════════════════════════════════
(function () {
  const svg = document.getElementById('linkographSvg');
  const caption = document.getElementById('linkographCaption');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const SIZE = 320;
  const MARGIN = 34;
  const Y0 = 34;
  const DOT_R = 5;
  const DOT_R_CRITICAL = 7;

  const DOT_ENTER_MS = 380;
  const DOT_STAGGER_MS = 110;
  const LINK_ENTER_MS = 420;
  const LINK_STAGGER_MS = 90;
  const HIGHLIGHT_STAGGER_MS = 160;
  const EXIT_MS = 300;
  const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sequence = [5, 6, 7, 8, 6, 7];
  let seqIndex = 0;
  let currentGroup = null;
  let cycleTimer = null;

  // amber (shallow/near links) → teal (deep/far-reaching links)
  function linkColor(t) {
    const from = [232, 163, 61];
    const to = [95, 203, 187];
    const mix = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  }

  // Random but legible link set: mostly short-range links (how a
  // real design process reads — moves build on recent moves), with
  // the occasional long-range callback.
  function generateLinks(n) {
    const links = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const span = j - i;
        const p = span <= 2 ? 0.55 : span <= 4 ? 0.22 : 0.08;
        if (Math.random() < p) links.push([i, j]);
      }
    }
    while (links.length < Math.max(3, n - 1)) {
      const i = Math.floor(Math.random() * (n - 1));
      const j = i + 1 + Math.floor(Math.random() * (n - i - 1));
      if (!links.some(([a, b]) => a === i && b === j)) links.push([i, j]);
    }
    return links;
  }

  // classic line-segment intersection (strict interior only)
  function segmentIntersect(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-6) return null;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    if (t <= 0.06 || t >= 0.94 || u <= 0.06 || u >= 0.94) return null;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

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

  function build(n) {
    const links = generateLinks(n);
    const spacing = (SIZE - 2 * MARGIN) / (n - 1);
    const positions = Array.from({ length: n }, (_, i) => MARGIN + i * spacing);
    const maxSpan = Math.max(...links.map(([a, b]) => b - a));

    const degree = new Array(n).fill(0);
    links.forEach(([a, b]) => { degree[a]++; degree[b]++; });
    const criticalMoves = degree
      .map((d, i) => ({ d, i }))
      .filter(m => m.d >= 3)
      .map(m => m.i);

    const group = document.createElementNS(NS, 'g');
    const dotsLayer = document.createElementNS(NS, 'g');
    const linksLayer = document.createElementNS(NS, 'g');
    const glowLayer = document.createElementNS(NS, 'g');
    group.appendChild(linksLayer);
    group.appendChild(dotsLayer);
    group.appendChild(glowLayer);

    // ── moves (dots + numbers) ──
    positions.forEach((x, i) => {
      const isCritical = criticalMoves.includes(i);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', Y0);
      dot.setAttribute('r', isCritical ? DOT_R_CRITICAL : DOT_R);
      dot.setAttribute('fill', isCritical ? 'var(--amber, #E8A33D)' : 'var(--teal, #5FCBBB)');
      if (isCritical) dot.classList.add('move-dot--critical');

      const title = document.createElementNS(NS, 'title');
      title.textContent = `move ${i + 1}${isCritical ? ' — critical move' : ''}`;
      dot.appendChild(title);

      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', Y0 - 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-family', 'var(--mono)');
      label.setAttribute('fill', 'rgba(234,227,211,0.45)');
      label.textContent = String(i + 1);

      if (!prefersReducedMotion) {
        [dot, label].forEach(el => {
          el.style.opacity = '0';
          el.style.transform = 'scale(0.2)';
          el.style.transition =
            `opacity ${DOT_ENTER_MS}ms ease ${i * DOT_STAGGER_MS}ms, ` +
            `transform ${DOT_ENTER_MS}ms ${BOUNCE} ${i * DOT_STAGGER_MS}ms`;
        });
      }
      dotsLayer.appendChild(label);
      dotsLayer.appendChild(dot);
    });

    // ── links (45° diagonal V, drawn like ink) ──
    const orderedLinks = [...links].sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]));
    const linkPaths = [];
    orderedLinks.forEach(([a, b], idx) => {
      const x1 = positions[a], x2 = positions[b];
      const apexX = (x1 + x2) / 2;
      const apexY = Y0 + (x2 - x1) / 2;
      const span = b - a;

      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M ${x1} ${Y0} L ${apexX} ${apexY} L ${x2} ${Y0}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', linkColor(maxSpan <= 1 ? 0 : (span - 1) / (maxSpan - 1)));
      path.setAttribute('stroke-width', '1.4');
      path.setAttribute('stroke-linecap', 'round');
      linksLayer.appendChild(path);
      linkPaths.push({ path, a1: { x: x1, y: Y0 }, apex: { x: apexX, y: apexY }, a2: { x: x2, y: Y0 } });

      if (!prefersReducedMotion) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        const delay = 400 + idx * LINK_STAGGER_MS;
        path.style.transition = `stroke-dashoffset ${LINK_ENTER_MS}ms ease ${delay}ms`;
      }
    });

    // ── highlighted intersections (a nod to emergent "chunks") ──
    const hits = [];
    for (let i = 0; i < linkPaths.length; i++) {
      for (let j = i + 1; j < linkPaths.length; j++) {
        const segs1 = [[linkPaths[i].a1, linkPaths[i].apex], [linkPaths[i].apex, linkPaths[i].a2]];
        const segs2 = [[linkPaths[j].a1, linkPaths[j].apex], [linkPaths[j].apex, linkPaths[j].a2]];
        segs1.forEach(s1 => segs2.forEach(s2 => {
          const pt = segmentIntersect(s1[0], s1[1], s2[0], s2[1]);
          if (pt) hits.push(pt);
        }));
      }
    }
    const highlightPoints = hits.sort(() => Math.random() - 0.5).slice(0, Math.min(3, hits.length));
    const glowDelayBase = 400 + orderedLinks.length * LINK_STAGGER_MS + LINK_ENTER_MS;
    highlightPoints.forEach((pt, i) => {
      const ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('cx', pt.x);
      ring.setAttribute('cy', pt.y);
      ring.setAttribute('r', 3.5);
      ring.setAttribute('fill', 'var(--amber, #E8A33D)');
      ring.classList.add('link-hit');
      if (!prefersReducedMotion) {
        ring.style.opacity = '0';
        ring.style.transform = 'scale(0)';
        ring.style.transition = `opacity 300ms ease ${glowDelayBase + i * HIGHLIGHT_STAGGER_MS}ms, transform 300ms ${BOUNCE} ${glowDelayBase + i * HIGHLIGHT_STAGGER_MS}ms`;
      }
      glowLayer.appendChild(ring);
    });

    const totalDuration = glowDelayBase + highlightPoints.length * HIGHLIGHT_STAGGER_MS + 500;
    return { group, n, links, criticalMoves, totalDuration };
  }

  function playEntrance(built) {
    if (prefersReducedMotion) return;
    requestAnimationFrame(() => {
      Array.from(built.group.querySelectorAll('circle, text')).forEach(el => {
        if (el.classList.contains('link-hit')) return;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
      Array.from(built.group.querySelectorAll('path')).forEach(p => {
        p.style.strokeDashoffset = '0';
      });
      Array.from(built.group.querySelectorAll('.link-hit')).forEach(ring => {
        ring.style.opacity = '1';
        ring.style.transform = 'scale(1)';
      });
    });
  }

  function render(n) {
    const built = build(n);

    const finish = () => {
      svg.appendChild(built.group);
      currentGroup = built.group;
      playEntrance(built);
    };

    if (currentGroup && !prefersReducedMotion) {
      const olds = Array.from(currentGroup.querySelectorAll('circle, path, text'));
      olds.forEach((el, i) => {
        const delay = i * (EXIT_MS / Math.max(olds.length, 1));
        el.style.transition = `opacity ${EXIT_MS}ms ease ${delay}ms, transform ${EXIT_MS}ms ease ${delay}ms`;
        el.style.opacity = '0';
        el.style.transform = 'scale(0.4)';
      });
      setTimeout(() => {
        if (currentGroup && currentGroup.parentNode) currentGroup.remove();
        finish();
      }, EXIT_MS + 60);
    } else {
      if (currentGroup && currentGroup.parentNode) currentGroup.remove();
      finish();
    }

    typeCaption(`${n} moves · ${built.links.length} links · ${built.criticalMoves.length} critical moves`);

    if (!prefersReducedMotion) {
      clearTimeout(cycleTimer);
      cycleTimer = setTimeout(() => {
        seqIndex = (seqIndex + 1) % sequence.length;
        render(sequence[seqIndex]);
      }, Math.max(built.totalDuration + 900, 3400));
    }
  }

  render(sequence[0]);

  if (prefersReducedMotion) {
    setInterval(() => {
      seqIndex = (seqIndex + 1) % sequence.length;
      render(sequence[seqIndex]);
    }, 3400);
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
