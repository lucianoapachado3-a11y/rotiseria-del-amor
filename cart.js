/* cart.js — Carrito de pedidos D'amoor
 * IIFE, no ES modules. Depende del DOM listo.
 */
(function () {
  'use strict';

  /* ── Estado ─────────────────────────────────────────── */
  var items = [];   // [{ id, nombre, precio, cantidad, categoria, mitad, salsa, selectingMitad }]
  var nextId = 1;

  /* ── Helpers ─────────────────────────────────────────── */
  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt(n) { return (n ?? 0).toLocaleString('es-AR'); }

  function getEffectivePrice(item) {
    var base = item.mitad ? Math.max(item.precio, item.mitad.precio) : item.precio;
    return base + (item.salsa ? item.salsa.precio : 0);
  }

  function getDisplayName(item) {
    return item.mitad ? (item.nombre + ' / ' + item.mitad.nombre) : item.nombre;
  }

  /* ── DOM refs ────────────────────────────────────────── */
  var sidebar, overlay, itemsEl, emptyEl, footerEl, badgeEl, totalEl, confirmBtn;
  var orderModal, ticketEl, waBtn;

  /* ── Sidebar open/close ──────────────────────────────── */
  function openCart() {
    if (!sidebar) return;
    sidebar.hidden = false;
    if (overlay) overlay.hidden = false;
    requestAnimationFrame(function () {
      sidebar.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
    var toggle = document.getElementById('cart-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeCart() {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    var toggle = document.getElementById('cart-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      sidebar.hidden = true;
      if (overlay) overlay.hidden = true;
    }, 350);
  }

  /* ── Lógica del carrito ──────────────────────────────── */
  function addItem(nombre, precio, categoria) {
    var existing = items.find(function (i) { return i.nombre === nombre && !i.mitad; });
    if (existing) { existing.cantidad++; }
    else {
      items.push({
        id: nextId++,
        nombre: nombre,
        precio: precio,
        cantidad: 1,
        categoria: categoria || '',
        mitad: null,
        salsa: null,
        selectingMitad: false
      });
    }
    render();
    openCart();
  }

  function removeItem(id) {
    items = items.filter(function (i) { return i.id !== id; });
    render();
  }

  function changeQty(id, delta) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) items = items.filter(function (i) { return i.id !== id; });
    render();
  }

  function getTotal() {
    return items.reduce(function (s, i) { return s + getEffectivePrice(i) * i.cantidad; }, 0);
  }

  function getTotalQty() {
    return items.reduce(function (s, i) { return s + i.cantidad; }, 0);
  }

  function getPayment() {
    var el = document.querySelector('input[name="cart-payment"]:checked');
    return el ? el.value : 'efectivo';
  }

  /* ── Mitad y mitad ───────────────────────────────────── */
  function startMitad(id) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.selectingMitad = true;
    render();
  }

  function cancelMitad(id) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.selectingMitad = false;
    render();
  }

  function setMitad(id, nombre, precio) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.mitad = { nombre: nombre, precio: precio };
    item.selectingMitad = false;
    render();
  }

  function clearMitad(id) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.mitad = null;
    item.selectingMitad = false;
    render();
  }

  /* ── Salsa por pizza ─────────────────────────────────── */
  function setSalsa(id, nombre, precio) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.salsa = { nombre: nombre, precio: precio };
    render();
  }

  function clearSalsa(id) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.salsa = null;
    render();
  }

  /* ── Helpers DOM para opciones ───────────────────────── */
  function getPizzaOptions(excludeNombre) {
    var opts = [];
    var seen = {};
    document.querySelectorAll('#tab-clasicas [data-add-cart], #tab-especiales [data-add-cart]').forEach(function (btn) {
      var n = btn.dataset.nombre;
      var p = parseFloat(btn.dataset.precio) || 0;
      if (n && !seen[n] && n !== excludeNombre) {
        seen[n] = true;
        opts.push({ nombre: n, precio: p });
      }
    });
    return opts;
  }

  function getPizzaSalsas() {
    var opts = [];
    var seen = {};
    document.querySelectorAll('#tab-salsas [data-salsa-nombre]').forEach(function (el) {
      var n = el.dataset.salsaNombre;
      if (n && !seen[n]) {
        seen[n] = true;
        opts.push({ nombre: n, precio: 500 });
      }
    });
    return opts;
  }

  /* ── Render carrito ──────────────────────────────────── */
  function render() {
    if (!itemsEl) return;
    var empty = items.length === 0;
    emptyEl.hidden = !empty;
    footerEl.hidden = empty;

    if (empty) { itemsEl.innerHTML = ''; updateBadge(); return; }

    itemsEl.innerHTML = items.map(function (it) {
      var nombre   = getDisplayName(it);
      var efectivo = getEffectivePrice(it);
      var isPizza  = it.categoria === 'pizza';

      /* — Sección mitad y mitad — */
      var mitadSection = '';
      if (isPizza) {
        if (it.selectingMitad) {
          var opts = getPizzaOptions(it.nombre);
          var optsHtml = opts.length
            ? opts.map(function (p) {
                return '<option value="' + esc(p.nombre) + '">' + esc(p.nombre) + '</option>';
              }).join('')
            : '<option value="" disabled>Sin pizzas disponibles</option>';
          mitadSection =
            '<div class="cart-mitad-wrap">' +
              '<select class="cart-mitad-dropdown" data-cart-action="mitad-pick" data-cart-id="' + it.id + '">' +
                '<option value="">— Elegir sabor —</option>' +
                optsHtml +
              '</select>' +
              '<button class="cart-mitad-cancel" data-cart-action="mitad-cancel" data-cart-id="' + it.id + '">Cancelar</button>' +
            '</div>';
        } else if (it.mitad) {
          mitadSection =
            '<button class="cart-mitad-btn cart-mitad-set" data-cart-action="mitad-clear" data-cart-id="' + it.id + '">× Quitar mitad y mitad</button>';
        } else {
          mitadSection =
            '<button class="cart-mitad-btn" data-cart-action="mitad-start" data-cart-id="' + it.id + '">½&nbsp;Mitad y mitad</button>';
        }
      }

      /* — Sección salsa — */
      var salsaSection = '';
      if (isPizza) {
        var salsas = getPizzaSalsas();
        if (salsas.length) {
          var salsaOpts = salsas.map(function (s) {
            var sel = it.salsa && it.salsa.nombre === s.nombre ? ' selected' : '';
            return '<option value="' + esc(s.nombre) + '"' + sel + '>' + esc(s.nombre) + '</option>';
          }).join('');
          salsaSection =
            '<div class="cart-salsa-wrap">' +
              '<span class="cart-salsa-label">🥣</span>' +
              '<select class="cart-salsa-dropdown" data-cart-action="salsa-pick" data-cart-id="' + it.id + '">' +
                '<option value="">Sin salsa</option>' +
                salsaOpts +
              '</select>' +
            '</div>';
        }
      }

      return '<div class="cart-item" data-cart-id="' + it.id + '">' +
        '<div class="cart-item-top">' +
          '<span class="cart-item-name">' + esc(nombre) + '</span>' +
          '<button class="cart-remove-btn" data-cart-action="remove" data-cart-id="' + it.id + '" aria-label="Quitar ' + esc(it.nombre) + '">×</button>' +
        '</div>' +
        '<div class="cart-item-bottom">' +
          '<div class="cart-item-controls">' +
            '<button class="cart-qty-btn" data-cart-action="dec" data-cart-id="' + it.id + '" aria-label="Menos">−</button>' +
            '<span class="cart-qty">' + it.cantidad + '</span>' +
            '<button class="cart-qty-btn" data-cart-action="inc" data-cart-id="' + it.id + '" aria-label="Más">+</button>' +
          '</div>' +
          '<span class="cart-item-subtotal">$' + fmt(efectivo * it.cantidad) + '</span>' +
        '</div>' +
        mitadSection +
        salsaSection +
      '</div>';
    }).join('');

    if (totalEl) totalEl.textContent = '$' + fmt(getTotal());
    updateBadge();
  }

  function updateBadge() {
    if (!badgeEl) return;
    var qty = getTotalQty();
    badgeEl.textContent = qty;
    badgeEl.hidden = qty === 0;
    var btn = document.getElementById('cart-toggle');
    if (btn) btn.setAttribute('aria-label', 'Ver pedido (' + qty + ' items)');
  }

  /* ── Modal del ticket ────────────────────────────────── */
  function buildTicketHTML() {
    var methodLabel = getPayment() === 'transferencia' ? 'Transferencia' : 'Efectivo';
    var rows = items.map(function (it) {
      var nombre   = getDisplayName(it);
      var efectivo = getEffectivePrice(it);
      var salsaNote = it.salsa
        ? '<div class="ticket-salsa-note">+ ' + esc(it.salsa.nombre) + '</div>'
        : '';
      return '<div class="ticket-row">' +
        '<span class="ticket-item-name">' + esc(nombre) +
          (it.cantidad > 1 ? ' <em>×' + it.cantidad + '</em>' : '') +
        '</span>' +
        '<span class="ticket-item-price">$' + fmt(efectivo * it.cantidad) + '</span>' +
      '</div>' + salsaNote;
    }).join('');
    return rows +
      '<div class="ticket-sep"></div>' +
      '<div class="ticket-row ticket-total">' +
        '<span>Total estimado</span>' +
        '<span>$' + fmt(getTotal()) + '</span>' +
      '</div>' +
      '<div class="ticket-payment-row">' +
        '<span>Forma de pago:</span> <strong>' + methodLabel + '</strong>' +
      '</div>';
  }

  function buildWAText() {
    var methodLabel = getPayment() === 'transferencia' ? 'Transferencia' : 'Efectivo';
    var lines = items.map(function (i) {
      var nombre = getDisplayName(i);
      var line = '• ' + nombre + (i.cantidad > 1 ? ' x' + i.cantidad : '');
      if (i.salsa) line += '\n  + ' + i.salsa.nombre;
      return line;
    }).join('\n');
    return 'Hola! Quiero hacer un pedido:\n\n' + lines + '\n\nForma de pago: ' + methodLabel + '\n\n¡Gracias!';
  }

  function openModal() {
    if (!items.length || !orderModal) return;
    var dateEl = document.getElementById('ticket-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    if (ticketEl) ticketEl.innerHTML = buildTicketHTML();
    if (waBtn) waBtn.href = 'https://wa.me/5491171404663?text=' + encodeURIComponent(buildWAText());
    orderModal.hidden = false;
    requestAnimationFrame(function () { orderModal.classList.add('is-open'); });
  }

  function closeModal() {
    if (!orderModal) return;
    orderModal.classList.remove('is-open');
    setTimeout(function () { orderModal.hidden = true; }, 300);
  }

  /* ── Event listeners ─────────────────────────────────── */
  function initEvents() {
    // Abrir carrito (botones con data-cart-open)
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-open]')) { openCart(); return; }
    });

    // Toggle del nav
    var toggle = document.getElementById('cart-toggle');
    if (toggle) toggle.addEventListener('click', openCart);

    // Cerrar sidebar
    var closeBtn = document.getElementById('cart-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    // Controles del carrito (delegación sobre sidebar)
    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cart-action]');
        if (!btn) return;
        var id     = parseInt(btn.dataset.cartId, 10);
        var action = btn.dataset.cartAction;
        if      (action === 'remove')       removeItem(id);
        else if (action === 'inc')          changeQty(id, 1);
        else if (action === 'dec')          changeQty(id, -1);
        else if (action === 'mitad-start')  startMitad(id);
        else if (action === 'mitad-cancel') cancelMitad(id);
        else if (action === 'mitad-clear')  clearMitad(id);
      });

      // Selects: mitad y salsa
      sidebar.addEventListener('change', function (e) {
        var sel = e.target.closest('[data-cart-action]');
        if (!sel) return;
        var id     = parseInt(sel.dataset.cartId, 10);
        var action = sel.dataset.cartAction;

        if (action === 'mitad-pick') {
          if (!sel.value) return;
          var nombre = sel.value;
          var precio = 0;
          document.querySelectorAll('[data-add-cart]').forEach(function (b) {
            if (b.dataset.nombre === nombre) precio = parseFloat(b.dataset.precio) || 0;
          });
          setMitad(id, nombre, precio);

        } else if (action === 'salsa-pick') {
          if (!sel.value) {
            clearSalsa(id);
          } else {
            var sNombre = sel.value;
            var sPrecio = 0;
            getPizzaSalsas().forEach(function (s) {
              if (s.nombre === sNombre) sPrecio = s.precio;
            });
            setSalsa(id, sNombre, sPrecio);
          }
        }
      });
    }

    // Confirmar pedido → modal
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        closeCart();
        setTimeout(openModal, 360);
      });
    }

    // Modal: cerrar
    var mClose = document.getElementById('order-modal-close');
    if (mClose) mClose.addEventListener('click', closeModal);
    if (orderModal) {
      orderModal.addEventListener('click', function (e) {
        if (e.target === orderModal) closeModal();
      });
    }

    // Modal: editar (volver al carrito)
    var editBtn = document.getElementById('order-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        closeModal();
        setTimeout(openCart, 320);
      });
    }

    // Agregar al carrito (delegación global)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-cart]');
      if (!btn) return;
      addItem(
        btn.dataset.nombre,
        parseFloat(btn.dataset.precio) || 0,
        btn.dataset.categoria || ''
      );
      var orig = btn.textContent;
      btn.textContent = '✓ Agregado';
      btn.disabled = true;
      btn.classList.add('btn-added');
      setTimeout(function () {
        btn.textContent = orig;
        btn.disabled = false;
        btn.classList.remove('btn-added');
      }, 1200);
    });

    // Escape
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (orderModal && !orderModal.hidden) closeModal();
      else if (sidebar && !sidebar.hidden) closeCart();
    });
  }

  /* ── Init ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    sidebar    = document.getElementById('cart-sidebar');
    overlay    = document.getElementById('cart-overlay');
    itemsEl    = document.getElementById('cart-items');
    emptyEl    = document.getElementById('cart-empty');
    footerEl   = document.getElementById('cart-footer');
    badgeEl    = document.getElementById('cart-badge');
    totalEl    = document.getElementById('cart-total');
    confirmBtn = document.getElementById('cart-confirm-btn');
    orderModal = document.getElementById('order-modal');
    ticketEl   = document.getElementById('order-ticket');
    waBtn      = document.getElementById('order-wa-btn');

    initEvents();
    render();
  });

}());
