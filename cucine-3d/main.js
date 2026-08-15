import * as THREE from 'three';
import { MODELS, FINISHES, MODULE_TYPES, WALL_LABELS, modulePrice, formatEuro } from './catalog.js';
import { createScene } from './scene.js';
import { buildModule } from './modules3d.js';
import * as planner from './planner.js';
import { computeTips } from './tips.js';

const STORAGE_KEY = 'cucina3d-progetto';
const $ = (sel) => document.querySelector(sel);

// localStorage può essere bloccato (iframe sandbox, navigazione privata):
// in quel caso si degrada a un salvataggio in memoria per la sessione.
const storage = (() => {
  try {
    localStorage.setItem('__cucina3d_test', '1');
    localStorage.removeItem('__cucina3d_test');
    return localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
  }
})();

// ---------- Stato ----------
let state = planner.deserialize(storage.getItem(STORAGE_KEY) ?? 'null');
let selectedId = null;

// ---------- Scena ----------
const sceneApi = createScene($('#scene-canvas'));
sceneApi.setRoom(state.room);
sceneApi.setActiveWall(state.activeWall);
sceneApi.focusWall(state.activeWall);

// ---------- Toast ----------
let toastTimer = null;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

// ---------- Salvataggio ----------
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.setItem(STORAGE_KEY, planner.serialize(state)), 300);
}

// ---------- Ricostruzione cucina 3D ----------
function rebuildKitchen() {
  sceneApi.disposeGroup(sceneApi.kitchenGroup);
  for (const p of state.placements) {
    const g = buildModule(p.type, state.model, state.finish);
    const t = planner.placementTransform(state, p);
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.rotY;
    g.userData.placementId = p.id;
    if (p.id === selectedId) {
      g.traverse((o) => { if (o.isMesh) o.material.emissive?.setHex(0x4338ca); });
    }
    sceneApi.kitchenGroup.add(g);
  }
}

// ---------- Render UI ----------
function renderModels() {
  const box = $('#model-list');
  box.innerHTML = '';
  for (const [key, m] of Object.entries(MODELS)) {
    const btn = document.createElement('button');
    btn.className = 'model-card' + (key === state.model ? ' active' : '');
    btn.innerHTML = `<span class="m-name">${m.label}</span><span class="m-tag">${m.handle === 'gola' ? 'maniglia a gola' : 'maniglia a barra'} · ×${m.priceFactor}</span>`;
    btn.onclick = () => {
      state.model = key;
      if (!m.finishes.includes(state.finish)) state.finish = m.finishes[0];
      update();
    };
    box.appendChild(btn);
  }
  $('#model-desc').textContent = MODELS[state.model].desc;
}

function renderFinishes() {
  const box = $('#finish-list');
  box.innerHTML = '';
  for (const key of MODELS[state.model].finishes) {
    const f = FINISHES[key];
    const sw = document.createElement('button');
    sw.className = 'finish-swatch' + (key === state.finish ? ' active' : '') + (f.type === 'legno' ? ' wood' : '');
    sw.style.background = '#' + f.color.toString(16).padStart(6, '0');
    sw.title = f.label;
    sw.onclick = () => { state.finish = key; update(); };
    box.appendChild(sw);
  }
  $('#finish-label').textContent = `Finitura: ${FINISHES[state.finish].label} (${FINISHES[state.finish].type})`;
}

function renderWalls() {
  document.querySelectorAll('.wall-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.wall === state.activeWall);
  });
  const u = planner.wallUsage(state, state.activeWall);
  $('#wall-usage').textContent =
    `Parete ${WALL_LABELS[state.activeWall]}: ${(u.length * 100).toFixed(0)} cm — occupati ${(u.used * 100).toFixed(0)} cm, liberi ${((u.length - u.used) * 100).toFixed(0)} cm.`;
}

function renderModuleButtons() {
  const box = $('#module-buttons');
  box.innerHTML = '';
  for (const [key, t] of Object.entries(MODULE_TYPES)) {
    const btn = document.createElement('button');
    btn.className = 'mod-btn';
    btn.title = t.desc;
    btn.innerHTML = `<span class="mb-ico">${t.ico}</span><span class="mb-name">${t.label}</span><span class="mb-price">${(t.w * 100).toFixed(0)} cm · ${formatEuro(modulePrice(key, state.model))}</span>`;
    btn.onclick = () => {
      const res = planner.addModule(state, key);
      if (res.ok) {
        toast(`${t.label} aggiunto sulla parete ${WALL_LABELS[state.activeWall]}.`);
        update();
      } else {
        toast(res.reason, true);
      }
    };
    box.appendChild(btn);
  }
}

function renderSummary() {
  const box = $('#summary-list');
  box.innerHTML = '';
  if (!state.placements.length) {
    box.innerHTML = '<p class="empty-note">Nessun modulo ancora. Aggiungi i moduli dal pannello a sinistra.</p>';
  }
  for (const p of state.placements) {
    const t = MODULE_TYPES[p.type];
    const row = document.createElement('div');
    row.className = 'sum-row' + (p.id === selectedId ? ' selected' : '');
    row.innerHTML = `
      <span class="s-name">${t.ico} ${t.label}<span class="s-wall">Parete ${WALL_LABELS[p.wall]} · a ${(p.offset * 100).toFixed(0)} cm dall'angolo</span></span>
      <span class="s-price">${formatEuro(modulePrice(p.type, state.model))}</span>
      <button class="s-del" title="Rimuovi">✕</button>`;
    row.querySelector('.s-del').onclick = () => {
      planner.removeModule(state, p.id);
      if (selectedId === p.id) selectedId = null;
      update();
    };
    row.onclick = (e) => {
      if (e.target.classList.contains('s-del')) return;
      selectedId = selectedId === p.id ? null : p.id;
      update();
    };
    box.appendChild(row);
  }
  const total = formatEuro(planner.totalPrice(state));
  $('#price-total').textContent = total;
  $('#price-total-2').textContent = total;
}

function renderTips() {
  const { warnings, advice } = computeTips(state);
  const wbox = $('#warnings-box');
  const abox = $('#advice-box');
  wbox.innerHTML = '';
  abox.innerHTML = '';

  const problems = warnings.filter((w) => w.level !== 'ok');
  const badge = $('#warn-badge');
  badge.hidden = problems.length === 0;
  badge.textContent = problems.length;

  if (warnings.length) {
    wbox.innerHTML = '<p class="tip-section-label">Verifiche sulla composizione</p>';
    for (const w of warnings) {
      const icon = w.level === 'crit' ? '⛔' : w.level === 'warn' ? '⚠️' : '✅';
      const div = document.createElement('div');
      div.className = `tip-card ${w.level === 'ok' ? 'ok' : w.level}`;
      div.innerHTML = `<div class="tip-title">${icon} ${w.title}</div>${w.text}`;
      wbox.appendChild(div);
    }
  }
  abox.innerHTML = '<p class="tip-section-label">Consigli del progettista</p>';
  for (const a of advice) {
    const div = document.createElement('div');
    div.className = 'tip-card';
    div.innerHTML = `<div class="tip-title">💡 ${a.title}</div>${a.text}`;
    abox.appendChild(div);
  }
}

function update() {
  rebuildKitchen();
  renderModels();
  renderFinishes();
  renderWalls();
  renderModuleButtons();
  renderSummary();
  renderTips();
  $('#btn-remove').disabled = selectedId === null;
  scheduleSave();
}

// ---------- Selezione con click nella scena ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null;
const canvas = $('#scene-canvas');
canvas.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downPos || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, sceneApi.camera);
  const hits = raycaster.intersectObjects(sceneApi.kitchenGroup.children, true);
  let id = null;
  for (const hit of hits) {
    let obj = hit.object;
    while (obj && obj.userData.placementId === undefined) obj = obj.parent;
    if (obj) { id = obj.userData.placementId; break; }
  }
  selectedId = id === selectedId ? null : id;
  update();
});

// ---------- Controlli ----------
$('#btn-room').onclick = () => {
  const w = Math.min(8, Math.max(2, parseFloat($('#room-w').value) || 4));
  const d = Math.min(8, Math.max(2, parseFloat($('#room-d').value) || 3.5));
  const h = Math.min(4, Math.max(2.2, parseFloat($('#room-h').value) || 2.7));
  state.room = { w, d, h };
  // Scarta i moduli che non entrano più nelle nuove pareti
  const before = state.placements.length;
  state.placements = state.placements.filter((p) => p.offset + MODULE_TYPES[p.type].w <= planner.wallLength(state, p.wall) + 1e-6);
  if (state.placements.length < before) toast(`${before - state.placements.length} moduli rimossi: non entravano nelle nuove dimensioni.`, true);
  sceneApi.setRoom(state.room);
  sceneApi.focusWall(state.activeWall);
  update();
};

document.querySelectorAll('.wall-btn').forEach((btn) => {
  btn.onclick = () => {
    state.activeWall = btn.dataset.wall;
    sceneApi.setActiveWall(state.activeWall);
    sceneApi.focusWall(state.activeWall);
    update();
  };
});

$('#btn-compact').onclick = () => { planner.compactWall(state, state.activeWall); toast('Parete compattata.'); update(); };

$('#btn-remove').onclick = () => {
  if (selectedId === null) return;
  planner.removeModule(state, selectedId);
  selectedId = null;
  update();
};

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null && document.activeElement.tagName !== 'INPUT') {
    planner.removeModule(state, selectedId);
    selectedId = null;
    update();
  }
});

$('#btn-save').onclick = () => {
  storage.setItem(STORAGE_KEY, planner.serialize(state));
  toast('Progetto salvato nel browser. 💾');
};

// Conferma in due click (i dialog nativi possono essere bloccati negli iframe)
let confirmNewUntil = 0;
$('#btn-new').onclick = () => {
  if (state.placements.length && Date.now() > confirmNewUntil) {
    confirmNewUntil = Date.now() + 4000;
    toast('Clicca di nuovo "Nuovo progetto" per confermare: il progetto attuale verrà cancellato.', true);
    return;
  }
  state = planner.createState();
  selectedId = null;
  storage.removeItem(STORAGE_KEY);
  $('#room-w').value = state.room.w.toFixed(1);
  $('#room-d').value = state.room.d.toFixed(1);
  $('#room-h').value = state.room.h.toFixed(1);
  sceneApi.setRoom(state.room);
  sceneApi.setActiveWall(state.activeWall);
  sceneApi.focusWall(state.activeWall);
  update();
};

// ---------- Tab ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    $('#tab-tips').hidden = tab.dataset.tab !== 'tips';
    $('#tab-summary').hidden = tab.dataset.tab !== 'summary';
  };
});

// ---------- Avvio ----------
$('#room-w').value = state.room.w.toFixed(1);
$('#room-d').value = state.room.d.toFixed(1);
$('#room-h').value = state.room.h.toFixed(1);
update();
