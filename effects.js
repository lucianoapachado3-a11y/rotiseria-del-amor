/* effects.js — D'amoor premium effects
 * IIFE, no ES modules, no import/export
 * Load order: gsap → ScrollTrigger → lenis → effects.js
 */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────── */
  function safe(fn, name) {
    try { fn(); }
    catch (e) { console.warn('[effects] ' + name + ' failed:', e); }
  }

  /* ── 1. PRELOADER ─────────────────────────────────────── */
  function initPreloader() {
    var pre = document.getElementById('preloader');
    if (!pre) return;

    var MIN_MS = 1800;
    var SAFETY_MS = 3500;
    var start = Date.now();
    var hidden = false;

    function hidePreloader() {
      if (hidden) return;
      hidden = true;

      var elapsed = Date.now() - start;
      var wait = Math.max(0, MIN_MS - elapsed);

      setTimeout(function () {
        pre.classList.add('is-leaving');

        // Reveal hero with GSAP if available
        if (window.gsap) {
          var heroLogo = document.querySelector('.hero-logo-mark');
          var heroTagline = document.querySelector('.hero-est');
          var heroTitle = document.querySelector('.hero-title');
          var heroSub = document.querySelector('.hero-sub');
          var heroCtas = document.querySelector('.hero-btns');

          // Cancel CSS fadeDown animations so GSAP takes over
          [heroLogo, heroTagline, heroTitle, heroSub, heroCtas].forEach(function (el) {
            if (!el) return;
            el.style.animation = 'none';
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
          });

          gsap.timeline({ delay: 0.15 })
            .to(heroLogo, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0)
            .to(heroTagline, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.12)
            .to(heroTitle, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.22)
            .to(heroSub, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.34)
            .to(heroCtas, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.44);
        }

        setTimeout(function () {
          pre.style.display = 'none';
        }, 600);
      }, wait);
    }

    // Hide when page is ready
    if (document.readyState === 'complete') {
      hidePreloader();
    } else {
      window.addEventListener('load', hidePreloader, { once: true });
    }

    // Safety net: always hide after SAFETY_MS
    setTimeout(hidePreloader, SAFETY_MS);
  }

  /* ── 2. LENIS SMOOTH SCROLL ───────────────────────────── */
  function initLenis() {
    if (!window.Lenis) return;

    var lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.5,
      // Sin esto Lenis intercepta touchmove en window y bloquea el scroll
      // nativo (pan-y) dentro de modales y paneles scrolleables en mobile.
      prevent: function (node) {
        return !!(node && node.closest && node.closest('.amodal-overlay, .cart-items, .order-modal-body'));
      }
    });

    // Integrate with GSAP ticker
    if (window.gsap) {
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback RAF loop
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }

    // Intercept anchor links for Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        var target = id && id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      });
    });

    window.__lenis = lenis;
  }

  /* ── 3. CUSTOM CURSOR ─────────────────────────────────── */
  function initCursor() {
    var root = document.querySelector('[data-cursor-root]');
    if (!root) return;
    // Only on true pointer devices
    if (!window.matchMedia('(pointer: fine)').matches) {
      root.style.display = 'none';
      return;
    }

    var dot = root.querySelector('.cursor-dot');
    var ring = root.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;
    var RING_LERP = 0.12;
    var ticking = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(' + (mx - 4) + 'px,' + (my - 4) + 'px)';
      if (!ticking) { ticking = true; requestAnimationFrame(ringLoop); }
    });

    function ringLoop() {
      rx += (mx - rx) * RING_LERP;
      ry += (my - ry) * RING_LERP;
      ring.style.transform = 'translate(' + (rx - 22) + 'px,' + (ry - 22) + 'px)';
      if (Math.abs(mx - rx) > 0.05 || Math.abs(my - ry) > 0.05) {
        requestAnimationFrame(ringLoop);
      } else {
        ticking = false;
      }
    }

    // Interactive state
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('a,button,[data-magnetic]');
      if (t) root.classList.add('is-interactive');
    });
    document.addEventListener('mouseout', function (e) {
      var t = e.target.closest('a,button,[data-magnetic]');
      if (t) root.classList.remove('is-interactive');
    });

    document.addEventListener('mouseenter', function () { root.style.opacity = '1'; });
    document.addEventListener('mouseleave', function () { root.style.opacity = '0'; });
  }

  /* ── 4. MAGNETIC BUTTONS ─────────────────────────────── */
  function initMagnetic() {
    var els = document.querySelectorAll('[data-magnetic]');
    if (!els.length) return;

    els.forEach(function (el) {
      var tx = 0, ty = 0, rafId = null;
      var STRENGTH = 0.38;
      var LERP = 0.14;
      var cx = 0, cy = 0;

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * STRENGTH;
        ty = (e.clientY - r.top - r.height / 2) * STRENGTH;
        if (!rafId) rafId = requestAnimationFrame(magnetLoop);
      });

      el.addEventListener('mouseleave', function () {
        tx = 0; ty = 0;
      });

      function magnetLoop() {
        cx += (tx - cx) * LERP;
        cy += (ty - cy) * LERP;
        el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
          rafId = requestAnimationFrame(magnetLoop);
        } else {
          cx = tx; cy = ty;
          el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
          rafId = null;
        }
      }
    });
  }

  /* ── 5. TICKER (hover pause) ─────────────────────────── */
  function initTicker() {
    var ticker = document.querySelector('.ticker-track');
    if (!ticker) return;
    var wrap = ticker.closest('.ticker') || ticker.parentElement;
    if (!wrap) return;
    wrap.addEventListener('mouseenter', function () { ticker.style.animationPlayState = 'paused'; });
    wrap.addEventListener('mouseleave', function () { ticker.style.animationPlayState = 'running'; });
  }

  /* ── 6. GSAP SCROLLTRIGGER REVEALS ───────────────────── */
  function initScrollTrigger() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Specialty cards stagger
    var cards = document.querySelectorAll('.pizza-card');
    if (cards.length) {
      gsap.from(cards, {
        scrollTrigger: { trigger: cards[0].closest('section') || cards[0].parentElement, start: 'top 82%' },
        opacity: 0, y: 30, stagger: 0.09, duration: 0.55, ease: 'power2.out',
        clearProps: 'all'
      });
    }

    // Testimonials stagger
    var testimonials = document.querySelectorAll('.compartir-card');
    if (testimonials.length) {
      gsap.from(testimonials, {
        scrollTrigger: { trigger: testimonials[0].closest('section') || testimonials[0].parentElement, start: 'top 82%' },
        opacity: 0, y: 24, stagger: 0.1, duration: 0.5, ease: 'power2.out',
        clearProps: 'all'
      });
    }
  }

  /* ── 7. SCROLL PROGRESS (already in script.js, no-op) ── */

  /* ── 8. SCROLL TRAPS — prevent Lenis eating wheel inside overlays ── */
  function initScrollTraps() {
    // Non-passive capture: fires before Lenis, prevents its preventDefault call.
    // We do NOT manually move scrollTop — the browser handles native scroll.
    // Lenis is already stopped when these panels open, so this is a safety net.
    document.addEventListener('wheel', function (e) {
      var el = e.target.closest('.amodal-card, .apanel-body, .cart-items, .order-modal-body');
      if (!el) return;

      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 32;
      if (e.deltaMode === 2) delta *= el.clientHeight;

      var canDown = el.scrollTop < el.scrollHeight - el.clientHeight;
      var canUp   = el.scrollTop > 0;

      if ((delta > 0 && canDown) || (delta < 0 && canUp)) {
        // Block Lenis from calling preventDefault so native scroll works
        e.stopPropagation();
      }
    }, { passive: true, capture: true });
  }

  /* ── INIT ALL ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    safe(initPreloader, 'preloader');
    safe(initLenis, 'lenis');
    safe(initCursor, 'cursor');
    safe(initMagnetic, 'magnetic');
    safe(initTicker, 'ticker');
    safe(initScrollTrigger, 'scrolltrigger');
    safe(initScrollTraps, 'scrolltraps');
  });

}());
