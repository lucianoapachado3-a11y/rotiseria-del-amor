'use strict';

const SUPABASE_URL = 'https://ccayjhomoesqckkgylcn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjYXlqaG9tb2VzcWNra2d5bGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjUzNjIsImV4cCI6MjA5MzcwMTM2Mn0.QZ_jkTzGoFrjgNYwAdQPH4IX3rl70KcKgp0iT74pnSE';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ARROW = `<svg class="pizza-toggle-arrow" viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPizzaCard(p) {
  const img   = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="400" height="280" loading="lazy">`
    : `<div class="pizza-placeholder" aria-hidden="true">🍕</div>`;
  const badge  = p.badge ? `<span class="pizza-badge">${escapeHtml(p.badge)}</span>` : '';
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  return `<article class="pizza-card">
      <div class="pizza-card-img">${img}${badge}</div>
      <div class="pizza-card-body">
        <button class="pizza-toggle" aria-expanded="false" aria-label="Ver ingredientes de ${escapeHtml(p.nombre)}">
          <span class="pizza-name">${escapeHtml(p.nombre)}</span>${ARROW}
        </button>
        <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
        <div class="pizza-footer">
          <div class="pizza-price"><span>$</span>${precio}</div>
          <button class="pizza-order-btn" data-add-cart data-nombre="${escapeHtml(p.nombre)}" data-precio="${p.precio ?? 0}" data-categoria="pizza">Agregar +</button>
        </div>
      </div>
    </article>`;
}

function renderPromoCard(p) {
  const img    = p.imagen_url
    ? `<div class="promo-card-img"><img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="500" height="300" loading="lazy"></div>`
    : '';
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  return `<div class="promo-card">
    ${img}
    <div class="promo-card-content">
      <div class="promo-title">${escapeHtml(p.nombre)}</div>
      <div class="promo-desc">${escapeHtml(p.descripcion)}</div>
      <div class="promo-price"><sup>$</sup>${precio}</div>
      <button class="promo-cta" data-add-cart data-nombre="${escapeHtml(p.nombre)}" data-precio="${p.precio ?? 0}">Agregar al pedido +</button>
    </div>
  </div>`;
}

function renderSalsaCard(p) {
  const img  = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="400" height="280" loading="lazy">`
    : `<div class="pizza-placeholder" aria-hidden="true">🧄</div>`;
  const badge = p.badge ? `<span class="pizza-badge">${escapeHtml(p.badge)}</span>` : '';
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  const priceBlock = p.precio
    ? `<div class="pizza-footer"><div class="pizza-price"><span>$</span>${precio}</div><span class="salsa-footer-note">Agregalo al pedido de tu pizza</span></div>`
    : `<div class="salsa-footer-note">Agregalo al pedido de tu pizza</div>`;
  return `<article class="pizza-card" data-salsa-nombre="${escapeHtml(p.nombre)}">
      <div class="pizza-card-img">${img}${badge}</div>
      <div class="pizza-card-body">
        <button class="pizza-toggle" aria-expanded="false" aria-label="Ver detalle de ${escapeHtml(p.nombre)}">
          <span class="pizza-name">${escapeHtml(p.nombre)}</span>${ARROW}
        </button>
        <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
        ${priceBlock}
      </div>
    </article>`;
}

function renderCompartirCard(p) {
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  if (p.imagen_url) {
    return `<div class="compartir-card has-img">
        <div class="compartir-img"><img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="400" height="200" loading="lazy"></div>
        <div class="compartir-body">
          <button class="pizza-toggle" aria-expanded="false" aria-label="Ver detalle de ${escapeHtml(p.nombre)}">
            <span class="compartir-title">${escapeHtml(p.nombre)}</span>${ARROW}
          </button>
          <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
          <p>Para compartir entre 4</p>
          <div class="price">$${precio}</div>
          <button class="pizza-order-btn" data-add-cart data-nombre="${escapeHtml(p.nombre)}" data-precio="${p.precio ?? 0}">Agregar +</button>
        </div>
      </div>`;
  }
  return `<div class="compartir-card">
      <div class="icon" aria-hidden="true">${p.icono || '🍽️'}</div>
      <button class="pizza-toggle" aria-expanded="false" aria-label="Ver detalle de ${escapeHtml(p.nombre)}">
        <span class="compartir-title">${escapeHtml(p.nombre)}</span>${ARROW}
      </button>
      <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
      <p>Para compartir entre 4</p>
      <div class="price">$${precio}</div>
      <button class="pizza-order-btn" data-add-cart data-nombre="${escapeHtml(p.nombre)}" data-precio="${p.precio ?? 0}">Agregar +</button>
    </div>`;
}

/* Empty state mejor estilizado por categoría */
function emptyState(categoria) {
  const icons = { clasicas: '🍕', especiales: '✨', compartir: '🍽️', salsas: '🧄' };
  return `<div class="menu-empty">
    <span class="menu-empty-icon" aria-hidden="true">${icons[categoria] || '🍕'}</span>
    <div class="menu-empty-title">Pronto en el horno</div>
    <div class="menu-empty-sub">Estamos preparando opciones nuevas para esta sección.</div>
  </div>`;
}

/* Post-render: oculta el arrow del toggle si la descripción no overflowea
   las 2 líneas (no hay nada para expandir, el arrow sería frustrante). */
function tagOverflowCards(container) {
  container.querySelectorAll('.pizza-card, .compartir-card').forEach(card => {
    const desc = card.querySelector('.pizza-desc');
    if (!desc) return;
    /* Forzamos un reflow tras los rAFs de revealCards. */
    requestAnimationFrame(() => {
      const overflows = desc.scrollHeight > desc.clientHeight + 1;
      if (!overflows) card.classList.add('no-overflow');
    });
  });
}

/* Actualiza los contadores de cada tab según la cantidad real de items */
function updateTabCounts(counts) {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const cat = btn.dataset.tab;
    const n = counts[cat] || 0;
    let span = btn.querySelector('.tab-count');
    if (n > 0) {
      if (!span) {
        span = document.createElement('span');
        span.className = 'tab-count';
        btn.appendChild(span);
      }
      span.textContent = '· ' + n;
    } else if (span) {
      span.remove();
    }
  });
}

function setContent(el, html) {
  el.style.opacity = '0';
  el.innerHTML = html;
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.35s ease';
    el.style.opacity = '1';
  });
}

async function loadMenu() {
  const { data, error } = await sb
    .from('platos')
    .select('*')
    .eq('activo', true)
    .order('orden')
    .order('created_at');

  const err = '<div class="menu-error">Error al cargar el menú. Intentá recargar la página.</div>';

  if (error) {
    setContent(document.querySelector('#tab-clasicas .pizza-grid'), err);
    setContent(document.querySelector('#tab-especiales .pizza-grid'), err);
    setContent(document.querySelector('#tab-compartir .compartir-grid'), err);
    setContent(document.querySelector('#tab-salsas .pizza-grid'), err);
    return;
  }

  const clasicas   = data.filter(p => p.categoria === 'clasicas');
  const especiales = data.filter(p => p.categoria === 'especiales');
  const compartir  = data.filter(p => p.categoria === 'compartir');
  const salsas     = data.filter(p => p.categoria === 'salsas');
  const promos     = data.filter(p => p.categoria === 'promo');

  setContent(document.querySelector('#tab-clasicas .pizza-grid'),      clasicas.length   ? clasicas.map(renderPizzaCard).join('')      : emptyState('clasicas'));
  setContent(document.querySelector('#tab-especiales .pizza-grid'),    especiales.length ? especiales.map(renderPizzaCard).join('')    : emptyState('especiales'));
  setContent(document.querySelector('#tab-compartir .compartir-grid'), compartir.length  ? compartir.map(renderCompartirCard).join('') : emptyState('compartir'));
  setContent(document.querySelector('#tab-salsas .pizza-grid'),        salsas.length     ? salsas.map(renderSalsaCard).join('')        : emptyState('salsas'));

  updateTabCounts({
    clasicas:   clasicas.length,
    especiales: especiales.length,
    compartir:  compartir.length,
    salsas:     salsas.length,
  });

  window.__menuPromos = promos; // expose for cart promo detection

  const gridClasicas   = document.getElementById('promos-grid-clasicas');
  const gridEspeciales = document.getElementById('promos-grid-especiales');
  if (gridClasicas && gridEspeciales) {
    const pClasicas   = promos.filter(p => !p.seccion || p.seccion === 'clasicas');
    const pEspeciales = promos.filter(p => p.seccion === 'especiales');
    const empty = '<p style="text-align:center;padding:40px;color:rgba(245,230,200,0.45)">No hay promos en esta sección.</p>';
    gridClasicas.innerHTML   = pClasicas.length   ? pClasicas.map(renderPromoCard).join('')   : empty;
    gridEspeciales.innerHTML = pEspeciales.length ? pEspeciales.map(renderPromoCard).join('') : empty;
    [gridClasicas, gridEspeciales].forEach(grid => {
      grid.querySelectorAll('.promo-card').forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
      });
    });
  }

  revealCards(document.getElementById('tab-clasicas'));
}

function revealCards(panel) {
  panel.querySelectorAll('.pizza-card, .compartir-card').forEach((el, i) => {
    el.style.transition = 'none';
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`;
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    }));
  });
  /* Detectar overflow de las descripciones y ocultar arrow donde no hay nada para expandir.
     Lo hacemos también con un delay para que se rechequee tras carga de fuentes web. */
  tagOverflowCards(panel);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => tagOverflowCards(panel));
  }
}

function showTab(name, btn) {
  document.querySelectorAll('.menu-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  const panel = document.getElementById('tab-' + name);
  panel.classList.add('active');
  panel.hidden = false;
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  revealCards(panel);
}

// Tab switching
document.querySelector('[role="tablist"]').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn[data-tab]');
  if (btn) showTab(btn.dataset.tab, btn);
});

// Mobile hamburger
const hamburger = document.querySelector('.nav-hamburger');
const navLinks  = document.querySelector('.nav-links');
hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Accordion — event delegation (funciona con cards dinámicas)
document.addEventListener('click', e => {
  const btn = e.target.closest('.pizza-toggle');
  if (!btn) return;
  const card = btn.closest('.pizza-card, .compartir-card');
  const isExpanded = card.classList.toggle('expanded');
  btn.setAttribute('aria-expanded', String(isExpanded));
});

// Scroll reveal para secciones estáticas
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity   = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.horario-card, .contact-card, .feature-item').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Section headings scroll reveal (menú, promos, horarios, contacto)
document.querySelectorAll(
  '.menu-header .section-tag, .menu-header .section-title,' +
  '.promos-header .section-tag, .promos-header .section-title,' +
  '.horarios-text .section-tag, .horarios-text .section-title,' +
  '.contacto-inner .section-tag, .contacto-inner .section-title'
).forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(16px)';
  el.style.transition = 'opacity 0.38s ease-out, transform 0.38s ease-out';
  observer.observe(el);
});

// Nosotros section scroll reveal
document.querySelectorAll('.nosotros-imgs').forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(32px)';
  el.style.transition = 'opacity 0.52s ease-out, transform 0.52s ease-out';
  observer.observe(el);
});
document.querySelectorAll('.nosotros-text').forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(32px)';
  el.style.transition = 'opacity 0.52s ease-out 0.14s, transform 0.52s ease-out 0.14s';
  observer.observe(el);
});

// Scroll progress bar
const scrollProgress = document.getElementById('scroll-progress');
if (scrollProgress) {
  window.addEventListener('scroll', () => {
    const total = document.body.scrollHeight - window.innerHeight;
    scrollProgress.style.transform = 'scaleX(' + (total > 0 ? window.scrollY / total : 0) + ')';
  }, { passive: true });
}

// Promo tab switching
document.querySelectorAll('.promo-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.promo-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.ptab;
    const gc = document.getElementById('promos-grid-clasicas');
    const ge = document.getElementById('promos-grid-especiales');
    if (gc) gc.hidden = tab !== 'clasicas';
    if (ge) ge.hidden = tab !== 'especiales';
  });
});

loadMenu();
