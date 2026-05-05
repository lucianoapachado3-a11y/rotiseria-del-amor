'use strict';

function revealCards(panel) {
  panel.querySelectorAll('.pizza-card, .compartir-card').forEach((el, i) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 10);
  });
}

function showTab(name, btn) {
  document.querySelectorAll('.menu-panel').forEach(p => {
    p.classList.remove('active');
    p.hidden = true;
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const panel = document.getElementById('tab-' + name);
  panel.classList.add('active');
  panel.hidden = false;
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  revealCards(panel);
}

// Tab switching via event delegation — sin onclick inline
document.querySelector('[role="tablist"]').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn[data-tab]');
  if (btn) showTab(btn.dataset.tab, btn);
});

// Mobile hamburger
const hamburger = document.querySelector('.nav-hamburger');
const navLinks = document.querySelector('.nav-links');
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

// Accordion: toggle ingredients
document.querySelectorAll('.pizza-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.pizza-card, .compartir-card');
    const isExpanded = card.classList.toggle('expanded');
    btn.setAttribute('aria-expanded', String(isExpanded));
  });
});

// Scroll reveal — solo elementos fuera de tab panels
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.promo-card, .horario-card, .contact-card, .feature-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Reveal inicial del tab activo al cargar
revealCards(document.getElementById('tab-clasicas'));
