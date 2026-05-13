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
    ? `<img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="300" height="180" loading="lazy">`
    : `<div class="pizza-placeholder" aria-hidden="true">🍕</div>`;
  const badge  = p.badge ? `<span class="pizza-badge">${escapeHtml(p.badge)}</span>` : '';
  const waMsg  = encodeURIComponent(`Hola! Quiero pedir una ${p.nombre}`);
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  return `<article class="pizza-card">
      <div class="pizza-card-img">${img}${badge}</div>
      <div class="pizza-card-body">
        <button class="pizza-toggle" aria-expanded="false" aria-label="Ver ingredientes de ${escapeHtml(p.nombre)}">
          <span class="pizza-name">${escapeHtml(p.nombre)}</span>${ARROW}
        </button>
        <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
        <div class="pizza-footer">
          <div class="pizza-price">$${precio}</div>
          <a href="https://wa.me/5491171404663?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="pizza-order-btn">Pedir ↗</a>
        </div>
      </div>
    </article>`;
}

function renderPromoCard(p) {
  const img    = p.imagen_url
    ? `<div class="promo-card-img"><img src="${p.imagen_url}" alt="${escapeHtml(p.nombre)}" width="500" height="300" loading="lazy"></div>`
    : '';
  const waMsg  = encodeURIComponent(`Hola! Quiero la promo ${p.nombre}`);
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  return `<div class="promo-card">
    ${img}
    <div class="promo-card-content">
      <div class="promo-title">${escapeHtml(p.nombre)}</div>
      <div class="promo-desc">${escapeHtml(p.descripcion)}</div>
      <div class="promo-price"><sup>$</sup>${precio}</div>
      <a href="https://wa.me/5491171404663?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="promo-cta">Quiero esta promo</a>
    </div>
  </div>`;
}

function renderCompartirCard(p) {
  const waMsg  = encodeURIComponent(`Hola! Quiero pedir ${p.nombre}`);
  const precio = (p.precio ?? 0).toLocaleString('es-AR');
  return `<div class="compartir-card">
      <div class="icon" aria-hidden="true">${p.icono || '🍽️'}</div>
      <button class="pizza-toggle" aria-expanded="false" aria-label="Ver detalle de ${escapeHtml(p.nombre)}">
        <span class="compartir-title">${escapeHtml(p.nombre)}</span>${ARROW}
      </button>
      <div class="pizza-desc-wrap"><div class="pizza-desc">${escapeHtml(p.descripcion)}</div></div>
      <p>Para compartir entre 4</p>
      <div class="price">$${precio}</div>
      <a href="https://wa.me/5491171404663?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="pizza-order-btn">Pedir ↗</a>
    </div>`;
}

async function loadMenu() {
  const { data, error } = await sb
    .from('platos')
    .select('*')
    .eq('activo', true)
    .order('orden')
    .order('created_at');

  const empty = '<p style="text-align:center;padding:40px;color:#9A7055">No hay platos disponibles</p>';
  const err   = '<p style="text-align:center;padding:40px;color:#C8242A">Error al cargar el menú. Intentá recargar la página.</p>';

  if (error) {
    document.querySelector('#tab-clasicas .pizza-grid').innerHTML   = err;
    document.querySelector('#tab-especiales .pizza-grid').innerHTML = err;
    document.querySelector('#tab-compartir .compartir-grid').innerHTML = err;
    return;
  }

  const clasicas   = data.filter(p => p.categoria === 'clasicas');
  const especiales = data.filter(p => p.categoria === 'especiales');
  const compartir  = data.filter(p => p.categoria === 'compartir');
  const promos     = data.filter(p => p.categoria === 'promo');

  document.querySelector('#tab-clasicas .pizza-grid').innerHTML      = clasicas.length   ? clasicas.map(renderPizzaCard).join('')      : empty;
  document.querySelector('#tab-especiales .pizza-grid').innerHTML    = especiales.length ? especiales.map(renderPizzaCard).join('')    : empty;
  document.querySelector('#tab-compartir .compartir-grid').innerHTML = compartir.length  ? compartir.map(renderCompartirCard).join('') : empty;

  const promosGrid = document.getElementById('promos-grid');
  if (promosGrid) {
    promosGrid.innerHTML = promos.length
      ? promos.map(renderPromoCard).join('')
      : '<p style="text-align:center;padding:40px;color:rgba(245,230,200,0.45)">No hay promos activas por el momento.</p>';
    promosGrid.querySelectorAll('.promo-card').forEach(el => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  }

  revealCards(document.getElementById('tab-clasicas'));
}

function revealCards(panel) {
  panel.querySelectorAll('.pizza-card, .compartir-card').forEach((el, i) => {
    el.style.transition = 'none';
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`;
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    }, 10);
  });
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

loadMenu();
