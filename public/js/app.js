import { api, getToken, setToken, clearToken } from './api.js';

const state = {
  user: null,
  centros: [],
  talleres: [],
  tallerId: null,
  materiales: [],
  desplazamientos: [],
  horas: [],
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eur = (n) => eurFmt.format(Number(n) || 0);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function dateOnly(d) {
  return d ? String(d).slice(0, 10) : '—';
}

function showError(message) {
  const el = $('#global-error');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showError._t);
  showError._t = setTimeout(() => el.classList.add('hidden'), 6000);
}

function authError(message) {
  const el = $('#auth-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

// ============ Arranque ============
async function init() {
  bindAuth();
  bindNav();
  bindCentros();
  bindTalleres();
  bindDetalle();

  if (getToken()) {
    try {
      const { user } = await api.get('/auth/me');
      await startApp(user);
      return;
    } catch {
      clearToken();
    }
  }
  showAuth();
}

function showAuth() {
  $('#auth-view').classList.remove('hidden');
  $('#app-view').classList.add('hidden');
}

async function startApp(user) {
  state.user = user;
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = user.nombre;
  await Promise.all([loadCentros(), loadTalleres()]);
  showView('centros');
}

function showView(name) {
  $('#centros-view').classList.toggle('hidden', name !== 'centros');
  $('#talleres-view').classList.toggle('hidden', name !== 'talleres');
  $('#detalle-view').classList.toggle('hidden', name !== 'detalle');
  $$('.nav-btn').forEach((b) => {
    const active = name === 'detalle' ? b.dataset.view === 'talleres' : b.dataset.view === name;
    b.classList.toggle('active', active);
  });
}

// ============ Autenticación ============
function bindAuth() {
  $$('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-auth-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      const isLogin = btn.dataset.authTab === 'login';
      $('#login-form').classList.toggle('hidden', !isLogin);
      $('#register-form').classList.toggle('hidden', isLogin);
      $('#auth-error').classList.add('hidden');
    });
  });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    try {
      const { token, user } = await api.post('/auth/login', {
        email: f.email.value, password: f.password.value,
      });
      setToken(token);
      await startApp(user);
    } catch (err) {
      authError(err.message);
    }
  });

  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    try {
      const { token, user } = await api.post('/auth/register', {
        nombre: f.nombre.value, email: f.email.value,
        password: f.password.value, rol: f.rol.value,
      });
      setToken(token);
      await startApp(user);
    } catch (err) {
      authError(err.message);
    }
  });

  $('#logout-btn').addEventListener('click', () => {
    clearToken();
    location.reload();
  });
}

// ============ Navegación ============
function bindNav() {
  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      showView(btn.dataset.view);
      try {
        if (btn.dataset.view === 'centros') await loadCentros();
        if (btn.dataset.view === 'talleres') await loadTalleres();
      } catch (err) {
        showError(err.message);
      }
    });
  });
}

// ============ Centros ============
async function loadCentros() {
  state.centros = await api.get('/centros');
  renderCentros();
  renderCentroOptions();
}

function renderCentros() {
  const tbody = $('#centros-tbody');
  if (!state.centros.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin centros todavía</td></tr>';
    return;
  }
  tbody.innerHTML = state.centros.map((c) => `
    <tr>
      <td>${esc(c.nombre)}</td>
      <td>${esc(c.contacto || '')}</td>
      <td>${esc(c.email || '')}</td>
      <td>${esc(c.telefono || '')}</td>
      <td class="actions">
        <button class="btn ghost small" data-edit-centro="${c.id}">Editar</button>
        <button class="btn danger small" data-del-centro="${c.id}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function renderCentroOptions() {
  const sel = $('#taller-centro');
  const previous = sel.value;
  sel.innerHTML = '<option value="">— Sin centro —</option>' +
    state.centros.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  if (previous) sel.value = previous;
}

function resetCentroForm() {
  const form = $('#centro-form');
  form.reset();
  form.elements.id.value = '';
  $('#centro-cancel').classList.add('hidden');
}

function bindCentros() {
  const form = $('#centro-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      nombre: f.nombre.value,
      contacto: f.contacto.value,
      email: f.email.value,
      telefono: f.telefono.value,
    };
    try {
      if (f.id.value) await api.put(`/centros/${f.id.value}`, body);
      else await api.post('/centros', body);
      resetCentroForm();
      await loadCentros();
      await loadTalleres();
    } catch (err) {
      showError(err.message);
    }
  });

  $('#centro-cancel').addEventListener('click', resetCentroForm);

  $('#centros-tbody').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-centro]');
    const del = e.target.closest('[data-del-centro]');

    if (edit) {
      const c = state.centros.find((x) => x.id === Number(edit.dataset.editCentro));
      if (!c) return;
      form.elements.id.value = c.id;
      form.elements.nombre.value = c.nombre || '';
      form.elements.contacto.value = c.contacto || '';
      form.elements.email.value = c.email || '';
      form.elements.telefono.value = c.telefono || '';
      $('#centro-cancel').classList.remove('hidden');
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (del) {
      if (!confirm('¿Eliminar este centro?')) return;
      try {
        await api.del(`/centros/${del.dataset.delCentro}`);
        await loadCentros();
        await loadTalleres();
      } catch (err) {
        showError(err.message);
      }
    }
  });
}

// ============ Talleres ============
async function loadTalleres() {
  state.talleres = await api.get('/talleres');
  renderTalleres();
}

function renderTalleres() {
  const tbody = $('#talleres-tbody');
  if (!state.talleres.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin talleres todavía</td></tr>';
    return;
  }
  tbody.innerHTML = state.talleres.map((t) => `
    <tr>
      <td>${esc(t.nombre)}</td>
      <td>${esc(t.centro_nombre || '—')}</td>
      <td><span class="badge ${t.tipo}">${t.tipo}</span></td>
      <td>${dateOnly(t.fecha)}</td>
      <td class="num">${Number(t.duracion_horas)} h</td>
      <td class="actions">
        <button class="btn primary small" data-open-taller="${t.id}">Abrir</button>
        <button class="btn ghost small" data-edit-taller="${t.id}">Editar</button>
        <button class="btn danger small" data-del-taller="${t.id}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function resetTallerForm() {
  const form = $('#taller-form');
  form.reset();
  form.elements.id.value = '';
  $('#taller-cancel').classList.add('hidden');
}

function bindTalleres() {
  const form = $('#taller-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      centro_id: f.centro_id.value ? Number(f.centro_id.value) : null,
      nombre: f.nombre.value,
      tipo: f.tipo.value,
      fecha: f.fecha.value || null,
      duracion_horas: Number(f.duracion_horas.value) || 0,
      ubicacion: f.ubicacion.value,
    };
    try {
      if (f.id.value) await api.put(`/talleres/${f.id.value}`, body);
      else await api.post('/talleres', body);
      resetTallerForm();
      await loadTalleres();
    } catch (err) {
      showError(err.message);
    }
  });

  $('#taller-cancel').addEventListener('click', resetTallerForm);

  $('#talleres-tbody').addEventListener('click', async (e) => {
    const open = e.target.closest('[data-open-taller]');
    const edit = e.target.closest('[data-edit-taller]');
    const del = e.target.closest('[data-del-taller]');

    if (open) {
      try { await openTaller(Number(open.dataset.openTaller)); } catch (err) { showError(err.message); }
    }

    if (edit) {
      const t = state.talleres.find((x) => x.id === Number(edit.dataset.editTaller));
      if (!t) return;
      form.elements.id.value = t.id;
      form.elements.centro_id.value = t.centro_id || '';
      form.elements.nombre.value = t.nombre || '';
      form.elements.tipo.value = t.tipo || 'regular';
      form.elements.fecha.value = t.fecha ? String(t.fecha).slice(0, 10) : '';
      form.elements.duracion_horas.value = t.duracion_horas ?? 0;
      form.elements.ubicacion.value = t.ubicacion || '';
      $('#taller-cancel').classList.remove('hidden');
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (del) {
      if (!confirm('¿Eliminar este taller y todos sus datos asociados?')) return;
      try {
        await api.del(`/talleres/${del.dataset.delTaller}`);
        await loadTalleres();
      } catch (err) {
        showError(err.message);
      }
    }
  });
}

// ============ Detalle del taller ============
async function openTaller(id) {
  state.tallerId = id;
  const t = state.talleres.find((x) => x.id === id);
  $('#detalle-title').textContent = t ? t.nombre : 'Taller';
  $('#detalle-meta').textContent = t
    ? [t.centro_nombre, dateOnly(t.fecha), t.tipo, t.ubicacion].filter(Boolean).join(' · ')
    : '';
  resetMaterialForm();
  resetDesplazamientoForm();
  resetHorasForm();
  showView('detalle');
  await refreshDetalle();
}

async function refreshDetalle() {
  const id = state.tallerId;
  const [materiales, desplazamientos, horas, budget] = await Promise.all([
    api.get(`/materiales?taller_id=${id}`),
    api.get(`/desplazamientos?taller_id=${id}`),
    api.get(`/horas-trabajo?taller_id=${id}`),
    api.get(`/presupuestos?taller_id=${id}`),
  ]);
  renderMateriales(materiales);
  renderDesplazamientos(desplazamientos);
  renderHoras(horas);
  renderBudget(budget);
}

function renderBudget(b) {
  $('#total-materiales').textContent = eur(b.total_materiales);
  $('#total-desplazamientos').textContent = eur(b.total_desplazamientos);
  $('#total-horas').textContent = eur(b.total_horas);
  $('#total-general').textContent = eur(b.total_general);
  $('#estado-select').value = b.estado;
}

// --- Materiales ---
function renderMateriales(list) {
  state.materiales = list;
  const tbody = $('#materiales-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin materiales</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((m) => `
    <tr>
      <td>${esc(m.item)}</td>
      <td class="num">${Number(m.cantidad)}</td>
      <td class="num">${eur(m.precio_unitario)}</td>
      <td>${esc(m.proveedor || '')}</td>
      <td class="num">${eur(m.subtotal)}</td>
      <td class="actions">
        <button class="btn ghost small" data-edit-material="${m.id}">Editar</button>
        <button class="btn danger small" data-del-material="${m.id}">Quitar</button>
      </td>
    </tr>`).join('');
}

function resetMaterialForm() {
  const form = $('#material-form');
  form.reset();
  form.elements.id.value = '';
  form.elements.cantidad.value = 1;
  form.elements.precio_unitario.value = 0;
  $('[data-cancel="material"]').classList.add('hidden');
}

// --- Desplazamientos ---
function renderDesplazamientos(list) {
  state.desplazamientos = list;
  const tbody = $('#desplazamientos-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Sin desplazamientos</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((d) => `
    <tr>
      <td>${esc(d.origen || '')}</td>
      <td>${esc(d.destino || '')}</td>
      <td class="num">${Number(d.km)}</td>
      <td class="num">${eur(d.coste_por_km)}</td>
      <td>${esc(d.medio || '')}</td>
      <td class="num">${eur(d.subtotal)}</td>
      <td class="actions">
        <button class="btn ghost small" data-edit-desp="${d.id}">Editar</button>
        <button class="btn danger small" data-del-desp="${d.id}">Quitar</button>
      </td>
    </tr>`).join('');
}

function resetDesplazamientoForm() {
  const form = $('#desplazamiento-form');
  form.reset();
  form.elements.id.value = '';
  form.elements.km.value = 0;
  form.elements.coste_por_km.value = 0;
  $('[data-cancel="desplazamiento"]').classList.add('hidden');
}

// --- Horas ---
function renderHoras(list) {
  state.horas = list;
  const tbody = $('#horas-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin horas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((h) => `
    <tr>
      <td>${dateOnly(h.fecha)}</td>
      <td>${esc(h.monitor_nombre || '—')}</td>
      <td class="num">${Number(h.horas)}</td>
      <td class="num">${eur(h.tarifa_hora)}</td>
      <td class="num">${eur(h.subtotal)}</td>
      <td class="actions">
        <button class="btn ghost small" data-edit-horas="${h.id}">Editar</button>
        <button class="btn danger small" data-del-horas="${h.id}">Quitar</button>
      </td>
    </tr>`).join('');
}

function resetHorasForm() {
  const form = $('#horas-form');
  form.reset();
  form.elements.id.value = '';
  form.elements.horas.value = 0;
  form.elements.tarifa_hora.value = 0;
  $('[data-cancel="horas"]').classList.add('hidden');
}

// ============ Enlaces del detalle ============
function bindDetalle() {
  $('#volver-btn').addEventListener('click', async () => {
    showView('talleres');
    try { await loadTalleres(); } catch (err) { showError(err.message); }
  });

  $('#estado-select').addEventListener('change', async (e) => {
    try {
      await api.patch(`/presupuestos/${state.tallerId}`, { estado: e.target.value });
    } catch (err) {
      showError(err.message);
    }
  });

  $('#print-btn').addEventListener('click', () => window.print());

  // Materiales: alta/edición
  $('#material-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const body = {
      taller_id: state.tallerId,
      item: f.item.value,
      cantidad: Number(f.cantidad.value) || 0,
      precio_unitario: Number(f.precio_unitario.value) || 0,
      proveedor: f.proveedor.value,
    };
    try {
      if (f.id.value) await api.put(`/materiales/${f.id.value}`, body);
      else await api.post('/materiales', body);
      resetMaterialForm();
      await refreshDetalle();
    } catch (err) { showError(err.message); }
  });
  $('[data-cancel="material"]').addEventListener('click', resetMaterialForm);
  $('#materiales-tbody').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-material]');
    const del = e.target.closest('[data-del-material]');
    if (edit) {
      const m = state.materiales.find((x) => x.id === Number(edit.dataset.editMaterial));
      if (!m) return;
      const f = $('#material-form').elements;
      f.id.value = m.id; f.item.value = m.item || ''; f.cantidad.value = m.cantidad;
      f.precio_unitario.value = m.precio_unitario; f.proveedor.value = m.proveedor || '';
      $('[data-cancel="material"]').classList.remove('hidden');
      $('#material-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (del) {
      if (!confirm('¿Quitar este material?')) return;
      try { await api.del(`/materiales/${del.dataset.delMaterial}`); await refreshDetalle(); }
      catch (err) { showError(err.message); }
    }
  });

  // Desplazamientos
  $('#desplazamiento-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const body = {
      taller_id: state.tallerId,
      origen: f.origen.value, destino: f.destino.value,
      km: Number(f.km.value) || 0,
      coste_por_km: Number(f.coste_por_km.value) || 0,
      medio: f.medio.value,
    };
    try {
      if (f.id.value) await api.put(`/desplazamientos/${f.id.value}`, body);
      else await api.post('/desplazamientos', body);
      resetDesplazamientoForm();
      await refreshDetalle();
    } catch (err) { showError(err.message); }
  });
  $('[data-cancel="desplazamiento"]').addEventListener('click', resetDesplazamientoForm);
  $('#desplazamientos-tbody').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-desp]');
    const del = e.target.closest('[data-del-desp]');
    if (edit) {
      const d = state.desplazamientos.find((x) => x.id === Number(edit.dataset.editDesp));
      if (!d) return;
      const f = $('#desplazamiento-form').elements;
      f.id.value = d.id; f.origen.value = d.origen || ''; f.destino.value = d.destino || '';
      f.km.value = d.km; f.coste_por_km.value = d.coste_por_km; f.medio.value = d.medio || '';
      $('[data-cancel="desplazamiento"]').classList.remove('hidden');
      $('#desplazamiento-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (del) {
      if (!confirm('¿Quitar este desplazamiento?')) return;
      try { await api.del(`/desplazamientos/${del.dataset.delDesp}`); await refreshDetalle(); }
      catch (err) { showError(err.message); }
    }
  });

  // Horas
  $('#horas-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const body = {
      taller_id: state.tallerId,
      fecha: f.fecha.value || null,
      horas: Number(f.horas.value) || 0,
      tarifa_hora: Number(f.tarifa_hora.value) || 0,
    };
    try {
      if (f.id.value) await api.put(`/horas-trabajo/${f.id.value}`, body);
      else await api.post('/horas-trabajo', body);
      resetHorasForm();
      await refreshDetalle();
    } catch (err) { showError(err.message); }
  });
  $('[data-cancel="horas"]').addEventListener('click', resetHorasForm);
  $('#horas-tbody').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-horas]');
    const del = e.target.closest('[data-del-horas]');
    if (edit) {
      const h = state.horas.find((x) => x.id === Number(edit.dataset.editHoras));
      if (!h) return;
      const f = $('#horas-form').elements;
      f.id.value = h.id; f.fecha.value = h.fecha ? String(h.fecha).slice(0, 10) : '';
      f.horas.value = h.horas; f.tarifa_hora.value = h.tarifa_hora;
      $('[data-cancel="horas"]').classList.remove('hidden');
      $('#horas-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (del) {
      if (!confirm('¿Quitar este registro de horas?')) return;
      try { await api.del(`/horas-trabajo/${del.dataset.delHoras}`); await refreshDetalle(); }
      catch (err) { showError(err.message); }
    }
  });
}

init();
