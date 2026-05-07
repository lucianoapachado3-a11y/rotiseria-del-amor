'use strict';

const SUPABASE_URL = 'https://ccayjhomoesqckkgylcn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjYXlqaG9tb2VzcWNra2d5bGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjUzNjIsImV4cCI6MjA5MzcwMTM2Mn0.QZ_jkTzGoFrjgNYwAdQPH4IX3rl70KcKgp0iT74pnSE';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let editingId = null;
let currentImageUrl = '';

const loginScreen = document.getElementById('login-screen');
const adminPanel  = document.getElementById('admin-panel');
const loginForm   = document.getElementById('login-form');
const loginError  = document.getElementById('login-error');
const platoForm   = document.getElementById('plato-form');
const listaPlatos = document.getElementById('lista-platos');
const imgPreview  = document.getElementById('img-preview');
const cancelBtn   = document.getElementById('cancel-btn');
const formTitle   = document.getElementById('form-title');

// ── Auth ──────────────────────────────────────────────────────────────────────

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  session ? showPanel() : showLogin();
}

function showLogin() {
  loginScreen.hidden = false;
  adminPanel.hidden  = true;
}

function showPanel() {
  loginScreen.hidden = true;
  adminPanel.hidden  = false;
  loadPlatos();
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Entrando...';

  const { error } = await sb.auth.signInWithPassword({
    email:    document.getElementById('login-email').value,
    password: document.getElementById('login-password').value,
  });

  if (error) {
    loginError.textContent = 'Email o contraseña incorrectos';
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  } else {
    showPanel();
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ── Cargar platos ─────────────────────────────────────────────────────────────

async function loadPlatos() {
  listaPlatos.innerHTML = '<p class="empty-msg">Cargando...</p>';
  const { data, error } = await sb
    .from('platos')
    .select('*')
    .order('categoria')
    .order('orden')
    .order('created_at');

  if (error) {
    listaPlatos.innerHTML = '<p class="empty-msg" style="color:#C8242A">Error al cargar el menú</p>';
    return;
  }
  renderLista(data || []);
}

// ── Renderizar lista ──────────────────────────────────────────────────────────

const CAT_LABELS = {
  clasicas:   'Pizzas Clásicas',
  especiales: 'Pizzas Especiales',
  compartir:  'Bandejas para Compartir',
};

function renderLista(platos) {
  if (!platos.length) {
    listaPlatos.innerHTML = '<p class="empty-msg">No hay platos cargados todavía. ¡Agregá el primero!</p>';
    return;
  }

  const byCategory = { clasicas: [], especiales: [], compartir: [] };
  platos.forEach(p => { if (byCategory[p.categoria]) byCategory[p.categoria].push(p); });

  listaPlatos.innerHTML = Object.entries(byCategory)
    .filter(([, items]) => items.length)
    .map(([cat, items]) => `
      <div class="lista-categoria">
        <h3>${CAT_LABELS[cat]}</h3>
        <div class="lista-items">${items.map(renderItem).join('')}</div>
      </div>
    `).join('');

  listaPlatos.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => startEdit(btn.dataset.edit))
  );
  listaPlatos.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => deletePlato(btn.dataset.delete))
  );
  listaPlatos.querySelectorAll('[data-toggle]').forEach(btn =>
    btn.addEventListener('click', () => toggleActivo(btn.dataset.toggle, btn.dataset.activo === 'true'))
  );
}

function renderItem(p) {
  const thumb = p.imagen_url
    ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="item-thumb">`
    : `<div class="item-thumb-placeholder">${p.icono || '🍽️'}</div>`;

  return `<div class="lista-item ${p.activo ? '' : 'inactivo'}">
    ${thumb}
    <div class="item-info">
      <strong>${p.nombre}</strong>
      <span>${p.descripcion || '—'}</span>
      <span class="item-precio">$${p.precio.toLocaleString('es-AR')}</span>
      ${p.badge ? `<span class="item-badge">${p.badge}</span>` : ''}
    </div>
    <div class="item-actions">
      <button data-edit="${p.id}" class="btn-edit">Editar</button>
      <button data-toggle="${p.id}" data-activo="${p.activo}" class="btn-toggle">
        ${p.activo ? 'Ocultar' : 'Mostrar'}
      </button>
      <button data-delete="${p.id}" class="btn-delete">Eliminar</button>
    </div>
  </div>`;
}

// ── Guardar plato (insert o update) ──────────────────────────────────────────

platoForm.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const imageFile = document.getElementById('plato-imagen').files[0];
    let imagen_url  = currentImageUrl;
    if (imageFile) imagen_url = await uploadImage(imageFile);

    const plato = {
      nombre:      document.getElementById('plato-nombre').value.trim(),
      categoria:   document.getElementById('plato-categoria').value,
      descripcion: document.getElementById('plato-descripcion').value.trim(),
      precio:      parseInt(document.getElementById('plato-precio').value, 10),
      badge:       document.getElementById('plato-badge').value.trim(),
      icono:       document.getElementById('plato-icono').value.trim(),
      imagen_url,
    };

    if (editingId) {
      const { error } = await sb.from('platos').update(plato).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('platos').insert(plato);
      if (error) throw error;
    }

    resetForm();
    loadPlatos();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Guardar plato';
  }
});

async function startEdit(id) {
  const { data: p, error } = await sb.from('platos').select('*').eq('id', id).single();
  if (error || !p) return;

  editingId       = id;
  currentImageUrl = p.imagen_url || '';

  document.getElementById('plato-nombre').value      = p.nombre;
  document.getElementById('plato-categoria').value   = p.categoria;
  document.getElementById('plato-descripcion').value = p.descripcion || '';
  document.getElementById('plato-precio').value      = p.precio;
  document.getElementById('plato-badge').value       = p.badge || '';
  document.getElementById('plato-icono').value       = p.icono || '';

  if (p.imagen_url) {
    imgPreview.src    = p.imagen_url;
    imgPreview.hidden = false;
  }

  formTitle.textContent = 'Editar plato';
  cancelBtn.hidden = false;
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  editingId       = null;
  currentImageUrl = '';
  platoForm.reset();
  imgPreview.hidden = true;
  imgPreview.src    = '';
  formTitle.textContent = 'Agregar plato';
  cancelBtn.hidden = true;
}

cancelBtn.addEventListener('click', resetForm);

document.getElementById('plato-imagen').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  imgPreview.src    = URL.createObjectURL(file);
  imgPreview.hidden = false;
});

// ── Subir imagen a Supabase Storage ──────────────────────────────────────────

async function uploadImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('platos').upload(path, file);
  if (error) throw error;
  return sb.storage.from('platos').getPublicUrl(path).data.publicUrl;
}

// ── Eliminar plato ────────────────────────────────────────────────────────────

async function deletePlato(id) {
  if (!confirm('¿Eliminar este plato del menú?')) return;
  const { error } = await sb.from('platos').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); return; }
  loadPlatos();
}

// ── Mostrar / ocultar plato ───────────────────────────────────────────────────

async function toggleActivo(id, activo) {
  const { error } = await sb.from('platos').update({ activo: !activo }).eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  loadPlatos();
}

// ── Arrancar ──────────────────────────────────────────────────────────────────

init();
