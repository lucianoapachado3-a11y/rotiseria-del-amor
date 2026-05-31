'use strict';

(function () {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'admin-overlay.css?v=20260545';
  document.head.appendChild(link);
})();

const ADMIN_URL = 'https://ccayjhomoesqckkgylcn.supabase.co';
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjYXlqaG9tb2VzcWNra2d5bGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjUzNjIsImV4cCI6MjA5MzcwMTM2Mn0.QZ_jkTzGoFrjgNYwAdQPH4IX3rl70KcKgp0iT74pnSE';
const sbA = supabase.createClient(ADMIN_URL, ADMIN_KEY);

// Elements
const loginModal  = document.getElementById('admin-login-modal');
const panelModal  = document.getElementById('admin-panel-modal');
const adminFab    = document.getElementById('admin-fab');
const loginForm   = document.getElementById('admin-login-form');
const loginError  = document.getElementById('al-error');
const platoForm   = document.getElementById('admin-plato-form');
const listaDiv    = document.getElementById('admin-lista-platos');
const imgPreview  = document.getElementById('admin-img-preview');

let adminEditingId     = null;
let adminCurrentImgUrl = '';

// Check session on load
(async () => {
  const { data: { session } } = await sbA.auth.getSession();
  if (session) adminFab.hidden = false;
})();

// Footer trigger → login or panel
document.getElementById('admin-footer-trigger').addEventListener('click', async () => {
  const { data: { session } } = await sbA.auth.getSession();
  session ? openPanel() : openLogin();
});

// FAB → panel
adminFab.addEventListener('click', openPanel);

// ── Open / Close ──────────────────────────────────────────────────────────────

function lockBodyScroll() {
  if (window.__lenis) window.__lenis.stop();
  const scrollY = window.scrollY;
  document.body.dataset.lockY = scrollY;
  document.body.style.position  = 'fixed';
  document.body.style.top       = '-' + scrollY + 'px';
  document.body.style.width     = '100%';
  document.body.style.overflow  = 'hidden';
}

function unlockBodyScroll() {
  const scrollY = parseInt(document.body.dataset.lockY || '0', 10);
  document.body.style.position  = '';
  document.body.style.top       = '';
  document.body.style.width     = '';
  document.body.style.overflow  = '';
  if (window.__lenis) {
    window.__lenis.start();
    window.__lenis.scrollTo(scrollY, { duration: 0 });
  } else {
    window.scrollTo(0, scrollY);
  }
}

function openLogin() {
  loginModal.hidden = false;
  lockBodyScroll();
  document.getElementById('al-email').focus();
}

function closeLogin() {
  loginModal.hidden = true;
  unlockBodyScroll();
}

function openPanel() {
  panelModal.hidden = false;
  lockBodyScroll();
  // Forzar estilos inline en el scroll container como respaldo al CSS
  var body = document.getElementById('apanel-body');
  if (body) {
    body.style.overflowY = 'scroll';
    body.style.webkitOverflowScrolling = 'touch';
    body.style.touchAction = 'pan-y';
  }
  loadAdminLista();
}

function closePanel() {
  panelModal.hidden = true;
  unlockBodyScroll();
  resetAdminForm();
}

document.getElementById('admin-login-close').addEventListener('click', closeLogin);
document.getElementById('admin-panel-close').addEventListener('click', closePanel);

loginModal.addEventListener('click', e => { if (e.target === loginModal) closeLogin(); });
panelModal.addEventListener('click', e => { if (e.target === panelModal) closePanel(); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!loginModal.hidden) closeLogin();
  if (!panelModal.hidden) closePanel();
});

// ── Auth ──────────────────────────────────────────────────────────────────────

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const btn = document.getElementById('al-submit');
  btn.disabled    = true;
  btn.textContent = 'Entrando...';

  const { error } = await sbA.auth.signInWithPassword({
    email:    document.getElementById('al-email').value,
    password: document.getElementById('al-password').value,
  });

  if (error) {
    loginError.textContent = 'Email o contraseña incorrectos';
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  } else {
    adminFab.hidden = false;
    closeLogin();
    openPanel();
  }
});

document.getElementById('admin-logout-btn').addEventListener('click', async () => {
  await sbA.auth.signOut();
  adminFab.hidden = true;
  closePanel();
});

// ── Inner tabs ────────────────────────────────────────────────────────────────

document.querySelectorAll('.admin-inner-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    showInnerTab(btn.dataset.atab);
    if (btn.dataset.atab === 'lista')   loadAdminLista();
    if (btn.dataset.atab === 'agregar') resetAdminForm();
  });
});

function showInnerTab(name) {
  document.querySelectorAll('.admin-inner-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-panel').forEach(p => {
    p.hidden = true;
    p.classList.remove('admin-tab-panel-active');
  });
  document.querySelector(`[data-atab="${name}"]`).classList.add('active');
  const panel = document.getElementById('atab-' + name);
  panel.hidden = false;
  // Force reflow so animation restarts each switch
  void panel.offsetWidth;
  panel.classList.add('admin-tab-panel-active');
}

// ── Form ──────────────────────────────────────────────────────────────────────

// Mostrar/ocultar campos según categoría
document.getElementById('ap-categoria').addEventListener('change', function () {
  const isPromo = this.value === 'promo';
  document.getElementById('afield-descripcion').hidden = isPromo;
  if (isPromo) {
    document.getElementById('afield-componentes').hidden = false;
    loadComponentesItems('');
  } else {
    document.getElementById('afield-componentes').hidden = true;
  }
});

async function loadComponentesItems(currentComponentes) {
  const list = document.getElementById('ap-componentes-list');
  list.innerHTML = '<p class="acomp-loading">Cargando ítems...</p>';

  const { data, error } = await sbA.from('platos')
    .select('nombre, categoria')
    .eq('activo', true)
    .not('categoria', 'eq', 'promo')
    .order('categoria').order('nombre');

  if (error || !data) {
    list.innerHTML = '<p style="color:#C4364A;font-size:0.8rem">Error al cargar ítems</p>';
    return;
  }

  const catNames = { clasicas: 'Clásicas', especiales: 'Especiales', compartir: 'Bandejas', salsas: 'Salsas' };
  const groups = {};
  data.forEach(p => {
    if (!groups[p.categoria]) groups[p.categoria] = [];
    groups[p.categoria].push(p.nombre);
  });

  const selected = currentComponentes
    ? currentComponentes.split(',').map(s => s.trim().toLowerCase())
    : [];

  list.innerHTML = Object.entries(groups).filter(([, names]) => names.length).map(([cat, names]) => `
    <div class="acomp-group">
      <span class="acomp-group-label">${catNames[cat] || cat}</span>
      <div class="acomp-chips">
        ${names.map(nombre => {
          const checked = selected.includes(nombre.toLowerCase()) ? ' checked' : '';
          const safe = nombre.replace(/"/g, '&quot;');
          return `<label class="acomp-chip"><input type="checkbox" value="${safe}"${checked}><span>${safe}</span></label>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// Auto-completar nombre al seleccionar chips
document.getElementById('ap-componentes-list').addEventListener('change', function (e) {
  if (e.target.type !== 'checkbox') return;
  const checked = Array.from(
    document.querySelectorAll('#ap-componentes-list input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  if (checked.length) {
    document.getElementById('ap-nombre').value = 'Promo ' + checked.join(' + ');
  }
});

function getComponentesValue() {
  return Array.from(
    document.querySelectorAll('#ap-componentes-list input[type="checkbox"]:checked')
  ).map(cb => cb.value).join(', ');
}

document.getElementById('ap-imagen').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  imgPreview.src    = URL.createObjectURL(file);
  imgPreview.hidden = false;
});

document.getElementById('admin-cancel-btn').addEventListener('click', resetAdminForm);

platoForm.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('admin-save-btn');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const file = document.getElementById('ap-imagen').files[0];
    let imagen_url = adminCurrentImgUrl;
    if (file) imagen_url = await adminUploadImage(file);

    const categoria = document.getElementById('ap-categoria').value;
    const plato = {
      nombre:       document.getElementById('ap-nombre').value.trim(),
      categoria,
      descripcion:  document.getElementById('ap-descripcion').value.trim(),
      precio:       parseInt(document.getElementById('ap-precio').value, 10),
      badge:        document.getElementById('ap-badge').value.trim(),
      icono:        document.getElementById('ap-icono').value.trim(),
      componentes:  categoria === 'promo' ? (getComponentesValue() || null) : null,
      imagen_url,
    };

    if (adminEditingId) {
      const { error } = await sbA.from('platos').update(plato).eq('id', adminEditingId);
      if (error) throw error;
    } else {
      const { error } = await sbA.from('platos').insert(plato);
      if (error) throw error;
    }

    // Flash de éxito en el botón antes de resetear
    saveBtn.textContent = '✓ Guardado';
    saveBtn.classList.add('is-saved');
    await new Promise(r => setTimeout(r, 520));
    saveBtn.classList.remove('is-saved');

    resetAdminForm();
    showInnerTab('lista');
    loadAdminLista();
    // Refresh public menu
    if (typeof loadMenu === 'function') loadMenu();

  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = adminEditingId ? 'Actualizar plato' : 'Guardar plato';
  }
});

async function adminUploadImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}.${ext}`;
  const { error } = await sbA.storage.from('platos').upload(path, file);
  if (error) throw error;
  return sbA.storage.from('platos').getPublicUrl(path).data.publicUrl;
}

function resetAdminForm() {
  adminEditingId     = null;
  adminCurrentImgUrl = '';
  platoForm.reset();
  imgPreview.hidden = true;
  imgPreview.src    = '';
  document.getElementById('afield-descripcion').hidden    = false;
  document.getElementById('afield-componentes').hidden    = true;
  document.getElementById('ap-componentes-list').innerHTML = '';
  document.getElementById('admin-form-title').textContent = 'Nuevo plato';
  document.getElementById('admin-save-btn').textContent   = 'Guardar plato';
  document.getElementById('admin-cancel-btn').hidden      = true;
}

// ── Lista ─────────────────────────────────────────────────────────────────────

async function loadAdminLista() {
  listaDiv.innerHTML = '<p style="text-align:center;padding:20px;color:#9A7055;font-size:0.85rem">Cargando...</p>';
  const { data, error } = await sbA
    .from('platos').select('*')
    .order('categoria').order('orden').order('created_at');

  if (error) {
    listaDiv.innerHTML = '<p style="color:#D32F2F;font-size:0.85rem;padding:12px">Error al cargar</p>';
    return;
  }
  renderAdminLista(data || []);
}

const ADMIN_CAT = { clasicas: 'Pizzas Clásicas', especiales: 'Pizzas Especiales', compartir: 'Para Compartir', salsas: 'Salsas' };

function renderAdminPromoItem(p) {
  const thumb = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="admin-item-thumb">`
    : `<div class="admin-item-placeholder">🎉</div>`;
  return `<div class="admin-lista-item ${p.activo ? '' : 'inactivo'} admin-dnd-item" draggable="true" data-promo-drag="${p.id}">
    <span class="admin-dnd-handle" aria-hidden="true">⠿</span>
    ${thumb}
    <div class="admin-item-info">
      <strong>${p.nombre}</strong>
      <span>$${p.precio.toLocaleString('es-AR')}</span>
    </div>
    <div class="admin-item-actions">
      <button data-aedit="${p.id}" class="admin-btn-edit">Editar</button>
      <button data-atoggle="${p.id}" data-aactivo="${p.activo}" class="admin-btn-toggle">${p.activo ? 'Ocultar' : 'Mostrar'}</button>
      <button data-adelete="${p.id}" class="admin-btn-delete">✕</button>
    </div>
  </div>`;
}

let draggedPromoId = null;

async function movePromoToSeccion(promoId, newSeccion) {
  const { error } = await sbA.from('platos').update({ seccion: newSeccion }).eq('id', promoId);
  if (error) { alert('Error: ' + error.message); return; }
  loadAdminLista();
  if (typeof loadMenu === 'function') loadMenu();
}

function openPromoSectionPicker(handle, promoId, currentSeccion) {
  document.querySelectorAll('.admin-dnd-picker').forEach(el => el.remove());
  const picker = document.createElement('div');
  picker.className = 'admin-dnd-picker';
  picker.innerHTML = `
    <span class="admin-dnd-picker-label">Mover a sección</span>
    <button type="button" data-seccion="clasicas"${currentSeccion === 'clasicas' || !currentSeccion ? ' aria-current="true"' : ''}>Clásicas</button>
    <button type="button" data-seccion="especiales"${currentSeccion === 'especiales' ? ' aria-current="true"' : ''}>Especiales</button>
  `;
  document.body.appendChild(picker);

  const r = handle.getBoundingClientRect();
  const pw = picker.offsetWidth;
  let left = r.left;
  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (left < 12) left = 12;
  picker.style.top  = (r.bottom + 8) + 'px';
  picker.style.left = left + 'px';

  picker.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-seccion]');
    if (!btn) return;
    ev.stopPropagation();
    const newSeccion = btn.dataset.seccion;
    picker.remove();
    if (newSeccion !== (currentSeccion || 'clasicas')) {
      await movePromoToSeccion(promoId, newSeccion);
    }
  });

  setTimeout(() => {
    function closer(ev) {
      if (!picker.contains(ev.target) && !ev.target.closest('.admin-dnd-handle')) {
        picker.remove();
        document.removeEventListener('click', closer, true);
        document.removeEventListener('touchstart', closer, true);
      }
    }
    document.addEventListener('click', closer, true);
    document.addEventListener('touchstart', closer, true);
  }, 0);
}

function initPromoDnD() {
  // Tap en handle (mobile-friendly) — abre picker con secciones
  listaDiv.addEventListener('click', e => {
    const handle = e.target.closest('.admin-dnd-handle');
    if (!handle) return;
    e.stopPropagation();
    const item = handle.closest('[data-promo-drag]');
    if (!item) return;
    const col = handle.closest('.admin-dnd-col');
    openPromoSectionPicker(handle, item.dataset.promoDrag, col && col.dataset.seccion);
  });

  listaDiv.addEventListener('dragstart', e => {
    const item = e.target.closest('[data-promo-drag]');
    if (!item) return;
    draggedPromoId = item.dataset.promoDrag;
    item.classList.add('is-dragging');
  });
  listaDiv.addEventListener('dragend', e => {
    document.querySelectorAll('.admin-dnd-item').forEach(el => el.classList.remove('is-dragging'));
    document.querySelectorAll('.admin-dnd-col').forEach(col => col.classList.remove('drag-over'));
  });
  listaDiv.addEventListener('dragover', e => {
    const col = e.target.closest('.admin-dnd-col');
    if (!col) return;
    e.preventDefault();
    document.querySelectorAll('.admin-dnd-col').forEach(c => c.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });
  listaDiv.addEventListener('dragleave', e => {
    const col = e.target.closest('.admin-dnd-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  listaDiv.addEventListener('drop', async e => {
    const col = e.target.closest('.admin-dnd-col');
    if (!col || !draggedPromoId) return;
    e.preventDefault();
    col.classList.remove('drag-over');
    const newSeccion = col.dataset.seccion;
    const { error } = await sbA.from('platos').update({ seccion: newSeccion }).eq('id', draggedPromoId);
    draggedPromoId = null;
    if (error) { alert('Error: ' + error.message); return; }
    loadAdminLista();
    if (typeof loadMenu === 'function') loadMenu();
  });
}

function renderAdminLista(platos) {
  if (!platos.length) {
    listaDiv.innerHTML = '<p style="text-align:center;padding:20px;color:#9A7055;font-size:0.85rem">No hay platos. ¡Agregá el primero!</p>';
    return;
  }
  const bycat = { clasicas: [], especiales: [], compartir: [], salsas: [] };
  const promos = platos.filter(p => p.categoria === 'promo');
  platos.forEach(p => { if (bycat[p.categoria]) bycat[p.categoria].push(p); });

  const regularHTML = Object.entries(bycat)
    .filter(([, items]) => items.length)
    .map(([cat, items]) => `
      <div class="admin-lista-cat">
        <h4>${ADMIN_CAT[cat]}</h4>
        <div class="admin-lista-items">${items.map(renderAdminItem).join('')}</div>
      </div>
    `).join('');

  const pClasicas   = promos.filter(p => !p.seccion || p.seccion === 'clasicas');
  const pEspeciales = promos.filter(p => p.seccion === 'especiales');
  const dndEmpty    = '<p class="admin-dnd-empty">Arrastrá promos acá</p>';
  const promosHTML  = promos.length ? `
    <div class="admin-lista-cat">
      <h4>Promos</h4>
      <div class="admin-promo-dnd">
        <div class="admin-dnd-col" data-seccion="clasicas">
          <div class="admin-dnd-col-title">Clásicas</div>
          ${pClasicas.map(renderAdminPromoItem).join('') || dndEmpty}
        </div>
        <div class="admin-dnd-col" data-seccion="especiales">
          <div class="admin-dnd-col-title">Especiales</div>
          ${pEspeciales.map(renderAdminPromoItem).join('') || dndEmpty}
        </div>
      </div>
    </div>
  ` : '';

  listaDiv.innerHTML = regularHTML + promosHTML;
  initPromoDnD();

  listaDiv.querySelectorAll('[data-aedit]').forEach(btn =>
    btn.addEventListener('click', () => adminStartEdit(btn.dataset.aedit))
  );
  listaDiv.querySelectorAll('[data-adelete]').forEach(btn =>
    btn.addEventListener('click', () => adminDeletePlato(btn.dataset.adelete))
  );
  listaDiv.querySelectorAll('[data-atoggle]').forEach(btn =>
    btn.addEventListener('click', () => adminToggle(btn.dataset.atoggle, btn.dataset.aactivo === 'true'))
  );
}

function renderAdminItem(p) {
  const thumb = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="admin-item-thumb">`
    : `<div class="admin-item-placeholder">${p.icono || '🍽️'}</div>`;
  return `<div class="admin-lista-item ${p.activo ? '' : 'inactivo'}">
    ${thumb}
    <div class="admin-item-info">
      <strong>${p.nombre}</strong>
      <span>$${p.precio.toLocaleString('es-AR')}</span>
    </div>
    <div class="admin-item-actions">
      <button data-aedit="${p.id}" class="admin-btn-edit">Editar</button>
      <button data-atoggle="${p.id}" data-aactivo="${p.activo}" class="admin-btn-toggle">${p.activo ? 'Ocultar' : 'Mostrar'}</button>
      <button data-adelete="${p.id}" class="admin-btn-delete">✕</button>
    </div>
  </div>`;
}

async function adminStartEdit(id) {
  const { data: p, error } = await sbA.from('platos').select('*').eq('id', id).single();
  if (error || !p) return;

  adminEditingId     = id;
  adminCurrentImgUrl = p.imagen_url || '';

  document.getElementById('ap-nombre').value        = p.nombre;
  document.getElementById('ap-categoria').value     = p.categoria;
  document.getElementById('ap-descripcion').value   = p.descripcion || '';
  document.getElementById('ap-precio').value        = p.precio;
  document.getElementById('ap-badge').value         = p.badge || '';
  document.getElementById('ap-icono').value         = p.icono || '';
  document.getElementById('afield-descripcion').hidden  = p.categoria === 'promo';
  document.getElementById('afield-componentes').hidden  = p.categoria !== 'promo';
  if (p.categoria === 'promo') loadComponentesItems(p.componentes || '');

  if (p.imagen_url) {
    imgPreview.src    = p.imagen_url;
    imgPreview.hidden = false;
  }

  document.getElementById('admin-form-title').textContent = 'Editar plato';
  document.getElementById('admin-save-btn').textContent   = 'Actualizar plato';
  document.getElementById('admin-cancel-btn').hidden      = false;

  showInnerTab('agregar'); // cambiar tab sin resetear el formulario
}

async function adminDeletePlato(id) {
  if (!confirm('¿Eliminar este plato del menú?')) return;
  const { error } = await sbA.from('platos').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  loadAdminLista();
  if (typeof loadMenu === 'function') loadMenu();
}

async function adminToggle(id, activo) {
  const { error } = await sbA.from('platos').update({ activo: !activo }).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  loadAdminLista();
  if (typeof loadMenu === 'function') loadMenu();
}
