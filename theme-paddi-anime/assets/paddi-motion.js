/* ==========================================================================
   Paddi Motion : moteur d'animation unique du thème (sans dépendance).
   API par attributs, voir DESIGN.md :
     data-pf-reveal[=up|fade|scale|left|right]  data-pf-delay  data-pf-stagger
     data-pf-split  data-pf-parallax  data-pf-marquee (+ data-pf-speed,
     data-pf-direction, data-pf-marquee-pause)  data-pf-magnetic
     data-pf-count (+ data-pf-decimals, data-pf-suffix)  data-pf-arc[=scroll]
     data-pf-hscroll  data-pf-progress[=enter]
   Classes d'état : .is-inview, .pf-header--scrolled, html.pf-js (posée dans
   snippets/paddi-head.liquid), html.pf-motion (moteur démarré), html.pf-ready.
   prefers-reduced-motion : aucune animation, tout est visible immédiatement.
   Exposé : window.PaddiMotion.init(root) / .destroy(root) / .refresh()
   ========================================================================== */
(() => {
  'use strict';

  if (window.PaddiMotion && window.PaddiMotion.version) return;

  const doc = document;
  const html = doc.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const mm = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const mqReduce = mm('(prefers-reduced-motion: reduce)');
  const mqDesktop = mm('(min-width: 990px)');
  const mqFine = mm('(hover: hover) and (pointer: fine)');
  const hasIO = 'IntersectionObserver' in window;

  let reduced = mqReduce.matches;
  let uid = 0;

  html.classList.add('pf-motion');
  if (reduced) html.classList.remove('pf-js');

  /* ---------- Outils ---------- */
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const num = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const collect = (scope, selector) => {
    const list = [];
    if (!scope) return list;
    try {
      if (scope.nodeType === 1 && scope.matches(selector)) list.push(scope);
      if (scope.querySelectorAll) list.push(...scope.querySelectorAll(selector));
    } catch (e) {
      /* sélecteur non pris en charge par un ancien navigateur : on ignore */
    }
    return list;
  };
  const tween = (duration, ease, onUpdate, onDone) => {
    const start = performance.now();
    let raf = 0;
    const frame = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      onUpdate(ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (onDone) onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  };

  /* ---------- Registre (idempotence + nettoyage) ---------- */
  // clé : élément + type de comportement → fonction de nettoyage
  const registry = new Map();
  const isSetup = (el, type) => registry.has(el) && registry.get(el).has(type);
  const register = (el, type, cleanup) => {
    if (!registry.has(el)) registry.set(el, new Map());
    registry.get(el).set(type, cleanup || (() => {}));
  };

  /* ---------- Boucle de défilement unique (rAF, écouteurs passifs) ---------- */
  const scrollSubs = new Set();
  const resizeSubs = new Set();
  let ticking = false;
  let viewportH = window.innerHeight;

  const runScroll = () => {
    ticking = false;
    viewportH = window.innerHeight;
    scrollSubs.forEach((fn) => fn(viewportH));
  };
  const requestScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(runScroll);
  };
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      viewportH = window.innerHeight;
      resizeSubs.forEach((fn) => fn());
      requestScroll();
    }, 150);
  };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  // Observe si un élément est proche de l'écran (pour n'animer que le visible)
  const nearObserver = (callback, margin = '15% 0px 15% 0px') => {
    if (!hasIO) return { observe: (el) => callback(el, true), unobserve() {}, disconnect() {} };
    return new IntersectionObserver(
      (entries) => entries.forEach((e) => callback(e.target, e.isIntersecting)),
      { rootMargin: margin }
    );
  };

  /* ---------- Révélations ---------- */
  const revealHandlers = new WeakMap(); // élément → fonction(s) à appeler à l'apparition

  const show = (el) => {
    if (el.classList.contains('is-inview')) return;
    el.classList.add('is-inview');
    const fns = revealHandlers.get(el);
    if (fns) {
      fns.forEach((fn) => fn());
      revealHandlers.delete(el);
    }
  };

  const revealIO = hasIO
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Visible, ou déjà dépassé (ancre, retour arrière) : on révèle.
            if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
              revealIO.unobserve(entry.target);
              show(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0 }
      )
    : null;

  const pending = new Set();
  const watchReveal = (el, onShow) => {
    if (onShow) {
      const list = revealHandlers.get(el) || [];
      list.push(onShow);
      revealHandlers.set(el, list);
    }
    if (el.classList.contains('is-inview')) {
      show(el);
      return;
    }
    if (reduced || !revealIO) {
      show(el);
      return;
    }
    pending.add(el);
    revealIO.observe(el);
  };
  const unwatchReveal = (el) => {
    pending.delete(el);
    if (revealIO) revealIO.unobserve(el);
  };

  // Bas de page atteint : les derniers éléments ne peuvent plus entrer dans la marge, on les révèle.
  scrollSubs.add((vh) => {
    if (!pending.size) return;
    const bottom = window.scrollY + vh;
    if (bottom >= doc.documentElement.scrollHeight - 4) {
      pending.forEach((el) => {
        if (el.getBoundingClientRect().top < vh) {
          unwatchReveal(el);
          show(el);
        }
      });
    }
  });

  const applyDelay = (el) => {
    const d = el.getAttribute('data-pf-delay');
    if (d !== null && d !== '') el.style.setProperty('--pf-delay', `${num(d, 0)}ms`);
  };

  const setupReveal = (el) => {
    if (isSetup(el, 'reveal')) return;
    applyDelay(el);
    watchReveal(el);
    register(el, 'reveal', () => unwatchReveal(el));
  };

  const setupStagger = (el) => {
    if (isSetup(el, 'stagger')) return;
    applyDelay(el);
    Array.from(el.children).forEach((child, i) => child.style.setProperty('--pf-i', String(Math.min(i, 7))));
    watchReveal(el);
    register(el, 'stagger', () => unwatchReveal(el));
  };

  const MARK_SELECTOR = '.pf-mark, :is(h1, h2, .h0, .h1, .h2, .pf-display-2xl, .pf-display-xl, .pf-display-lg, .pf-display) em';
  const setupMark = (el) => {
    if (isSetup(el, 'mark')) return;
    watchReveal(el);
    register(el, 'mark', () => unwatchReveal(el));
  };

  /* ---------- Découpage des titres en mots ---------- */
  const SPACE_RE = /([ \t\n\r\f]+)/; // l'espace insécable reste dans le mot (typographie française)
  const setupSplit = (el) => {
    if (isSetup(el, 'split')) return;
    applyDelay(el);
    // Pas de découpage si le titre contient un élément interactif (son nom accessible serait perdu)
    const interactive = el.querySelector('a, button, input, select, textarea');
    if (!reduced && !interactive && !el.hasAttribute('data-pf-split-done')) {
      const probe = el.cloneNode(true);
      probe.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      const fullText = probe.textContent.replace(/\s+/g, ' ').trim();
      if (fullText && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', fullText);
      let index = 0;
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const parts = child.textContent.split(SPACE_RE);
            if (parts.length === 1 && !parts[0]) return;
            const frag = doc.createDocumentFragment();
            parts.forEach((part) => {
              if (!part) return;
              if (SPACE_RE.test(part) && !part.trim()) {
                frag.appendChild(doc.createTextNode(' '));
                return;
              }
              const word = doc.createElement('span');
              word.className = 'pf-word';
              word.setAttribute('aria-hidden', 'true');
              const inner = doc.createElement('span');
              inner.className = 'pf-word__inner';
              inner.style.setProperty('--pf-i', String(index));
              inner.textContent = part;
              index += 1;
              word.appendChild(inner);
              frag.appendChild(word);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'br' || tag === 'svg' || tag === 'img' || child.classList.contains('pf-word')) {
              if (tag === 'svg' || tag === 'img') child.setAttribute('aria-hidden', 'true');
              return;
            }
            walk(child);
          }
        });
      };
      walk(el);
      el.setAttribute('data-pf-split-done', '');
      el.style.setProperty('--pf-words', String(index));
    }
    watchReveal(el);
    register(el, 'split', () => unwatchReveal(el));
  };

  /* ---------- Compteurs ---------- */
  const setupCount = (el) => {
    if (isSetup(el, 'count')) return;
    const target = num(el.getAttribute('data-pf-count'), 0);
    const decimals = clamp(Math.round(num(el.getAttribute('data-pf-decimals'), 0)), 0, 6);
    const suffix = el.getAttribute('data-pf-suffix') || '';
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const render = (v) => {
      el.textContent = `${fmt.format(v)}${suffix}`;
    };
    const empty = !el.textContent.trim();
    if (reduced || !hasIO) {
      if (empty) render(target);
      register(el, 'count');
      return;
    }
    let cancel = null;
    const finalText = empty ? null : el.textContent;
    if (!el.hasAttribute('aria-label') && !el.closest('[aria-hidden="true"]')) {
      el.setAttribute('aria-label', finalText ? finalText.trim() : `${fmt.format(target)}${suffix}`);
    }
    const run = () => {
      cancel = tween(
        1400,
        easeOutExpo,
        (p) => render(target * p),
        () => render(target)
      );
    };
    if (el.getBoundingClientRect().top > window.innerHeight || el.getBoundingClientRect().bottom < 0) render(0);
    watchReveal(el, () => {
      const delay = num(el.getAttribute('data-pf-delay'), 0);
      if (delay > 0) window.setTimeout(run, delay);
      else run();
    });
    register(el, 'count', () => {
      unwatchReveal(el);
      if (cancel) cancel();
    });
  };

  /* ---------- Bande défilante ---------- */
  const stripClone = (node) => {
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('inert', '');
    const all = [node, ...node.querySelectorAll('*')];
    all.forEach((n) => {
      n.removeAttribute('id');
      n.removeAttribute('data-shopify-editor-block');
      n.removeAttribute('data-pf-marquee');
      if (n.matches('a, button, input, select, textarea, [tabindex]')) n.setAttribute('tabindex', '-1');
      if (n.matches('[data-pf-reveal], [data-pf-split], [data-pf-stagger], .pf-mark')) n.classList.add('is-inview');
    });
    return node;
  };

  const setupMarquee = (el) => {
    if (isSetup(el, 'marquee') || reduced) return;
    let track = el.querySelector(':scope > .pf-marquee__track');
    if (!track) {
      track = doc.createElement('div');
      track.className = 'pf-marquee__track';
      while (el.firstChild) track.appendChild(el.firstChild);
      el.appendChild(track);
    }
    let group = track.querySelector(':scope > .pf-marquee__group');
    if (!group) {
      group = doc.createElement('div');
      group.className = 'pf-marquee__group';
      Array.from(track.childNodes).forEach((n) => group.appendChild(n));
      track.appendChild(group);
    }
    const speed = Math.max(5, num(el.getAttribute('data-pf-speed'), 40));
    if ((el.getAttribute('data-pf-direction') || '').toLowerCase() === 'right') el.classList.add('pf-marquee--reverse');

    const build = () => {
      track.querySelectorAll(':scope > .pf-marquee__group--clone').forEach((c) => c.remove());
      const groupWidth = group.getBoundingClientRect().width;
      if (groupWidth < 1) return;
      const needed = Math.max(1, Math.ceil(el.getBoundingClientRect().width / groupWidth) + 1);
      for (let i = 0; i < needed; i += 1) {
        const clone = stripClone(group.cloneNode(true));
        clone.classList.add('pf-marquee__group--clone');
        track.appendChild(clone);
      }
      track.style.setProperty('--pf-marquee-shift', `${-groupWidth}px`);
      track.style.setProperty('--pf-marquee-duration', `${(groupWidth / speed).toFixed(2)}s`);
      el.classList.add('pf-marquee--ready');
    };

    // Bouton pause accessible (WCAG 2.2.2)
    let toggle = null;
    if (el.hasAttribute('data-pf-marquee-pause')) {
      toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'pf-marquee__toggle';
      const sync = () => {
        const paused = el.classList.contains('is-user-paused');
        toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
        toggle.setAttribute('aria-label', paused ? 'Reprendre le défilement' : 'Mettre en pause le défilement');
      };
      toggle.addEventListener('click', () => {
        el.classList.toggle('is-user-paused');
        sync();
      });
      sync();
      el.appendChild(toggle);
    }

    const io = nearObserver((target, near) => target.classList.toggle('is-offscreen', !near), '0px');
    io.observe(el);

    const onFontsOrResize = () => build();
    build();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => isSetup(el, 'marquee') && build());
    resizeSubs.add(onFontsOrResize);

    register(el, 'marquee', () => {
      resizeSubs.delete(onFontsOrResize);
      io.disconnect();
      if (toggle) toggle.remove();
    });
  };

  /* ---------- Parallaxe ---------- */
  const setupParallax = (el) => {
    if (isSetup(el, 'parallax') || reduced) return;
    const factor = clamp(num(el.getAttribute('data-pf-parallax'), 0.12), -1, 1);
    let near = false;
    let current = 0;
    const io = nearObserver((t, isNear) => {
      near = isNear;
      if (near) requestScroll();
    });
    io.observe(el);
    const update = (vh) => {
      if (!near) return;
      if (!mqDesktop.matches) {
        if (current !== 0) {
          current = 0;
          el.style.translate = '';
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      const center = rect.top - current + rect.height / 2;
      current = clamp((center - vh / 2) * -factor, -80, 80);
      el.style.translate = `0 ${current.toFixed(1)}px`;
    };
    scrollSubs.add(update);
    requestScroll();
    register(el, 'parallax', () => {
      scrollSubs.delete(update);
      io.disconnect();
      el.style.translate = '';
    });
  };

  /* ---------- Bouton magnétique ---------- */
  const setupMagnetic = (el) => {
    if (isSetup(el, 'magnetic') || reduced) return;
    const move = (e) => {
      if (!mqFine.matches || e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) * 0.25, -8, 8);
      const dy = clamp((e.clientY - (r.top + r.height / 2)) * 0.25, -8, 8);
      el.classList.add('is-magnetic');
      el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    };
    const leave = () => {
      el.classList.remove('is-magnetic');
      el.style.translate = '';
    };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave, { passive: true });
    el.addEventListener('blur', leave, { passive: true });
    register(el, 'magnetic', () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('blur', leave);
      leave();
    });
  };

  /* ---------- Arcs : le chemin se dessine, la balle le parcourt ---------- */
  const setupArc = (el) => {
    if (isSetup(el, 'arc')) return;
    const paths = collect(el, '.pf-arc__path').filter((p) => typeof p.getTotalLength === 'function');
    if (!paths.length || reduced) {
      el.classList.add('is-inview', 'is-landed');
      register(el, 'arc');
      return;
    }
    const ball = el.querySelector('.pf-arc__ball');
    const ballIsSvg = !!(ball && ball.ownerSVGElement);
    let ballOrigin = { x: 0, y: 0 };
    if (ballIsSvg && ball.tagName.toLowerCase() === 'circle') {
      ballOrigin = { x: num(ball.getAttribute('cx'), 0), y: num(ball.getAttribute('cy'), 0) };
    }
    const created = [];

    // Pour un tracé en pointillés, on dessine à travers un masque (le motif est conservé).
    const drawables = paths.map((path) => {
      const len = path.getTotalLength();
      const dash = window.getComputedStyle(path).strokeDasharray;
      let target = path;
      if (dash && dash !== 'none') {
        const svg = path.ownerSVGElement;
        let defs = svg.querySelector(':scope > defs');
        if (!defs) {
          defs = doc.createElementNS(SVG_NS, 'defs');
          svg.insertBefore(defs, svg.firstChild);
          created.push(defs);
        }
        const mask = doc.createElementNS(SVG_NS, 'mask');
        const id = `pf-arc-mask-${(uid += 1)}`;
        mask.setAttribute('id', id);
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        let box = { x: 0, y: 0, width: 0, height: 0 };
        try {
          box = path.getBBox();
        } catch (e) {}
        const sw = num(window.getComputedStyle(path).strokeWidth, 2);
        const pad = sw * 4 + 24;
        mask.setAttribute('x', box.x - pad);
        mask.setAttribute('y', box.y - pad);
        mask.setAttribute('width', box.width + pad * 2);
        mask.setAttribute('height', box.height + pad * 2);
        const mp = doc.createElementNS(SVG_NS, 'path');
        mp.setAttribute('d', path.getAttribute('d') || '');
        mp.setAttribute('fill', 'none');
        mp.setAttribute('stroke', '#fff');
        mp.setAttribute('stroke-width', String(sw * 3 + 6));
        mp.setAttribute('stroke-linecap', 'round');
        mask.appendChild(mp);
        defs.appendChild(mask);
        created.push(mask);
        path.setAttribute('mask', `url(#${id})`);
        target = mp;
      }
      target.style.strokeDasharray = `${len} ${len}`;
      return { path, target, len };
    });

    const main = drawables[0];
    const placeBall = (p) => {
      if (!ball) return;
      const pt = main.path.getPointAtLength(main.len * p);
      if (ballIsSvg) {
        ball.setAttribute('transform', `translate(${(pt.x - ballOrigin.x).toFixed(2)} ${(pt.y - ballOrigin.y).toFixed(2)})`);
      } else {
        const ctm = main.path.getScreenCTM();
        if (!ctm) return;
        const svgPt = main.path.ownerSVGElement.createSVGPoint();
        svgPt.x = pt.x;
        svgPt.y = pt.y;
        const screen = svgPt.matrixTransform(ctm);
        const box = el.getBoundingClientRect();
        const bw = ball.offsetWidth;
        const bh = ball.offsetHeight;
        ball.style.transform = `translate3d(${(screen.x - box.left - bw / 2).toFixed(1)}px, ${(screen.y - box.top - bh / 2).toFixed(1)}px, 0)`;
      }
    };
    const draw = (p) => {
      drawables.forEach((d) => {
        d.target.style.strokeDashoffset = `${(d.len * (1 - p)).toFixed(2)}`;
      });
      placeBall(p);
      el.style.setProperty('--pf-arc-progress', p.toFixed(3));
      el.classList.toggle('is-landed', p >= 0.999);
    };

    const mode = (el.getAttribute('data-pf-arc') || '').toLowerCase();
    let cleanupMode = () => {};
    if (mode === 'scroll') {
      let near = false;
      const io = nearObserver((t, isNear) => {
        near = isNear;
        if (near) requestScroll();
      });
      io.observe(el);
      const update = (vh) => {
        if (!near) return;
        const r = el.getBoundingClientRect();
        const end = vh * 0.45;
        const p = clamp((vh - r.top) / Math.max(1, vh - end + r.height / 2), 0, 1);
        draw(p);
      };
      scrollSubs.add(update);
      draw(0);
      requestScroll();
      const onResizeArc = () => requestScroll();
      resizeSubs.add(onResizeArc);
      cleanupMode = () => {
        scrollSubs.delete(update);
        resizeSubs.delete(onResizeArc);
        io.disconnect();
      };
    } else {
      let cancel = null;
      draw(0);
      const duration = clamp(num(el.getAttribute('data-pf-duration'), 1600), 300, 6000);
      watchReveal(el, () => {
        const start = () => {
          cancel = tween(duration, easeInOutCubic, draw, () => draw(1));
        };
        const delay = num(el.getAttribute('data-pf-delay'), 0);
        if (delay > 0) window.setTimeout(start, delay);
        else start();
      });
      const onResizeArc = () => placeBall(el.classList.contains('is-landed') ? 1 : num(el.style.getPropertyValue('--pf-arc-progress'), 0));
      resizeSubs.add(onResizeArc);
      cleanupMode = () => {
        unwatchReveal(el);
        resizeSubs.delete(onResizeArc);
        if (cancel) cancel();
      };
    }

    register(el, 'arc', () => {
      cleanupMode();
      created.forEach((n) => n.remove());
      drawables.forEach((d) => {
        d.path.removeAttribute('mask');
        d.target.style.strokeDasharray = '';
        d.target.style.strokeDashoffset = '';
      });
    });
  };

  /* ---------- Défilement horizontal piloté par le défilement vertical ---------- */
  const setupHscroll = (el) => {
    if (isSetup(el, 'hscroll')) return;
    let track = el.querySelector(':scope .pf-hscroll__track, :scope [data-pf-hscroll-track]') || el.firstElementChild;
    if (!track) return;
    track.classList.add('pf-hscroll__track');
    if (reduced) {
      register(el, 'hscroll');
      return;
    }
    let sticky = null;
    let active = false;
    let near = false;
    let range = 0;
    let shift = 0;

    const activate = () => {
      if (active) return;
      sticky = doc.createElement('div');
      sticky.className = 'pf-hscroll__sticky';
      track.parentNode.insertBefore(sticky, track);
      sticky.appendChild(track);
      el.classList.add('pf-hscroll--active');
      active = true;
    };
    const deactivate = () => {
      if (!active) return;
      sticky.parentNode.insertBefore(track, sticky);
      sticky.remove();
      sticky = null;
      el.classList.remove('pf-hscroll--active');
      el.style.height = '';
      track.style.transform = '';
      active = false;
    };
    const measure = () => {
      if (!mqDesktop.matches) {
        deactivate();
        return;
      }
      activate();
      track.style.transform = '';
      shift = Math.max(0, track.scrollWidth - sticky.clientWidth);
      if (shift < 8) {
        deactivate();
        return;
      }
      range = shift;
      el.style.height = `${sticky.offsetHeight + range}px`;
      requestScroll();
    };
    const update = () => {
      if (!active || !near) return;
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, range), 0, 1);
      track.style.transform = `translate3d(${(-shift * p).toFixed(1)}px, 0, 0)`;
      el.style.setProperty('--pf-progress', p.toFixed(3));
    };
    // Clavier : amener l'élément focalisé dans la fenêtre
    const onFocus = (e) => {
      if (!active) return;
      const item = e.target.closest('.pf-hscroll__track > *') || e.target;
      const p = clamp(item.offsetLeft / Math.max(1, shift), 0, 1);
      const top = window.scrollY + el.getBoundingClientRect().top + p * range;
      window.scrollTo({ top, behavior: 'auto' });
    };
    const io = nearObserver((t, isNear) => {
      near = isNear;
      if (near) requestScroll();
    }, '20% 0px 20% 0px');
    io.observe(el);
    el.addEventListener('focusin', onFocus);
    scrollSubs.add(update);
    resizeSubs.add(measure);
    const onDesktopChange = () => measure();
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onDesktopChange);
    measure();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => isSetup(el, 'hscroll') && measure());
    window.addEventListener('load', measure, { once: true });

    register(el, 'hscroll', () => {
      scrollSubs.delete(update);
      resizeSubs.delete(measure);
      if (mqDesktop.removeEventListener) mqDesktop.removeEventListener('change', onDesktopChange);
      el.removeEventListener('focusin', onFocus);
      io.disconnect();
      deactivate();
    });
  };

  /* ---------- Progression (--pf-progress 0 → 1) ---------- */
  const setupProgress = (el) => {
    if (isSetup(el, 'progress')) return;
    if (reduced) {
      el.style.setProperty('--pf-progress', '1');
      register(el, 'progress');
      return;
    }
    const mode = (el.getAttribute('data-pf-progress') || '').toLowerCase();
    let near = false;
    const io = nearObserver((t, isNear) => {
      near = isNear;
      if (near) requestScroll();
    });
    io.observe(el);
    const update = (vh) => {
      if (!near) return;
      const r = el.getBoundingClientRect();
      let p;
      if (mode === 'enter') {
        // 0 quand le haut entre par le bas de l'écran, 1 quand l'élément est entièrement visible
        p = (vh - r.top) / Math.max(1, Math.min(r.height, vh) * 0.95);
      } else {
        // traversée complète : entre par le bas (0), sort par le haut (1)
        p = (vh - r.top) / Math.max(1, vh + r.height);
      }
      el.style.setProperty('--pf-progress', clamp(p, 0, 1).toFixed(4));
    };
    scrollSubs.add(update);
    requestScroll();
    register(el, 'progress', () => {
      scrollSubs.delete(update);
      io.disconnect();
    });
  };

  /* ---------- En-tête : compactage au défilement ---------- */
  let headerTargets = [];
  const findHeader = () => {
    const section = doc.querySelector('.section-header');
    headerTargets = section ? [section, ...section.querySelectorAll('sticky-header, .header-wrapper')] : [];
  };
  const headerTick = () => {
    if (!headerTargets.length) return;
    const scrolled = window.scrollY > 24;
    headerTargets.forEach((t) => t.classList.toggle('pf-header--scrolled', scrolled));
  };
  scrollSubs.add(headerTick);

  /* ---------- Initialisation / nettoyage ---------- */
  const init = (root = doc) => {
    const scope = root || doc;
    collect(scope, '[data-pf-split]').forEach(setupSplit);
    collect(scope, '[data-pf-reveal]').forEach(setupReveal);
    collect(scope, '[data-pf-stagger]').forEach(setupStagger);
    collect(scope, MARK_SELECTOR).forEach(setupMark);
    collect(scope, '[data-pf-count]').forEach(setupCount);
    collect(scope, '[data-pf-arc]').forEach(setupArc);
    collect(scope, '[data-pf-marquee]').forEach(setupMarquee);
    collect(scope, '[data-pf-parallax]').forEach(setupParallax);
    collect(scope, '[data-pf-magnetic]').forEach(setupMagnetic);
    collect(scope, '[data-pf-hscroll]').forEach(setupHscroll);
    collect(scope, '[data-pf-progress]').forEach(setupProgress);
    findHeader();
    requestScroll();
  };

  const destroy = (root = doc) => {
    registry.forEach((types, el) => {
      if (root === doc || root === el || (root.contains && root.contains(el))) {
        types.forEach((cleanup) => {
          try {
            cleanup();
          } catch (e) {}
        });
        registry.delete(el);
      }
    });
  };

  const revealAll = (root) => {
    collect(root, '[data-pf-reveal], [data-pf-split], [data-pf-stagger], [data-pf-count], [data-pf-arc], .pf-mark').forEach((el) => {
      unwatchReveal(el);
      show(el);
    });
  };

  const refresh = () => {
    resizeSubs.forEach((fn) => fn());
    requestScroll();
  };

  /* ---------- Éditeur de thème ---------- */
  doc.addEventListener('shopify:section:load', (e) => init(e.target));
  doc.addEventListener('shopify:section:unload', (e) => destroy(e.target));
  doc.addEventListener('shopify:section:select', (e) => revealAll(e.target));
  doc.addEventListener('shopify:block:select', (e) => {
    const section = e.target.closest('.shopify-section') || e.target;
    revealAll(section);
  });

  /* ---------- Changement de préférence de mouvement ---------- */
  const onReduceChange = () => {
    reduced = mqReduce.matches;
    destroy(doc);
    if (reduced) {
      html.classList.remove('pf-js');
      revealAll(doc);
    }
    init(doc);
  };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);

  /* ---------- Démarrage ---------- */
  const boot = () => {
    init(doc);
    const ready = () => requestAnimationFrame(() => html.classList.add('pf-ready'));
    if (doc.readyState === 'complete') ready();
    else window.addEventListener('load', ready, { once: true });
  };

  window.PaddiMotion = { version: '1.0.0', init, destroy, refresh, reveal: revealAll };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
