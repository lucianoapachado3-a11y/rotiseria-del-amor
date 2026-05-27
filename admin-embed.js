'use strict';

(function () {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'admin-overlay.css';
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

function openLogin() {
  loginModal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('al-email').focus();
}

function closeLogin() {
  loginModal.hidden = true;
  document.body.style.overflow = '';
}

function openPanel() {
  panelModal.hidden = false;
  document.body.style.overflow = 'hidden';
  loadAdminLista();
}

function closePanel() {
  panelModal.hidden = true;
  document.body.style.overflow = '';
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
  document.querySelectorAll('.admin-tab-panel').forEach(p => { p.hidden = true; });
  document.querySelector(`[data-atab="${name}"]`).classList.add('active');
  document.getElementById('atab-' + name).hidden = false;
}

// ── Form ──────────────────────────────────────────────────────────────────────

// Mostrar campo componentes solo para promos
document.getElementById('ap-categoria').addEventListener('change', function () {
  document.getElementById('afield-componentes').hidden = this.value !== 'promo';
});

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
      componentes:  categoria === 'promo' ? (document.getElementById('ap-componentes').value.trim() || null) : null,
      imagen_url,
    };

    if (adminEditingId) {
      const { error } = await sbA.from('platos').update(plato).eq('id', adminEditingId);
      if (error) throw error;
    } else {
      const { error } = await sbA.from('platos').insert(plato);
      if (error) throw error;
    }

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
  document.getElementById('afield-componentes').hidden    = true;
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

const ADMIN_CAT = { clasicas: 'Pizzas Clásicas', especiales: 'Pizzas Especiales', compartir: 'Para Compartir', salsas: 'Salsas', promo: 'Promos' };

function renderAdminLista(platos) {
  if (!platos.length) {
    listaDiv.innerHTML = '<p style="text-align:center;padding:20px;color:#9A7055;font-size:0.85rem">No hay platos. ¡Agregá el primero!</p>';
    return;
  }
  const bycat = { clasicas: [], especiales: [], compartir: [], salsas: [], promo: [] };
  platos.forEach(p => { if (bycat[p.categoria]) bycat[p.categoria].push(p); });

  listaDiv.innerHTML = Object.entries(bycat)
    .filter(([, items]) => items.length)
    .map(([cat, items]) => `
      <div class="admin-lista-cat">
        <h4>${ADMIN_CAT[cat]}</h4>
        <div class="admin-lista-items">${items.map(renderAdminItem).join('')}</div>
      </div>
    `).join('');

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
  document.getElementById('ap-componentes').value   = p.componentes || '';
  document.getElementById('afield-componentes').hidden = p.categoria !== 'promo';

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
