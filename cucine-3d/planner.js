import { MODULE_TYPES, MODELS, WALL_ORDER, modulePrice } from './catalog.js';

// Logica di composizione: puro calcolo, nessuna dipendenza da three.js.
// Ogni parete ha due "corsie": 'floor' (basi + colonne, condividono la linea a terra)
// e 'upper' (pensili + cappa). offset = distanza in metri dal bordo sinistro della
// parete, guardandola dall'interno della stanza.

const EPS = 1e-6;
const CORNER_DEPTH_FLOOR = 0.65; // ingombro in pianta dei mobili a terra vicino a un angolo
const CORNER_DEPTH_UPPER = 0.4;

export function createState() {
  return {
    room: { w: 4.0, d: 3.5, h: 2.7 },
    model: 'alice',
    finish: 'bianco_lucido',
    activeWall: 'nord',
    placements: [], // { id, type, wall, offset }
    nextId: 1,
  };
}

// Frame parete in coordinate pianta (x, z), origine = angolo sinistro visto dall'interno.
export function frame2D(wall, room) {
  const { w, d } = room;
  switch (wall) {
    case 'nord':  return { ox: -w / 2, oz: -d / 2, dx: 1, dz: 0,  nx: 0, nz: 1,  length: w, rotY: 0 };
    case 'est':   return { ox: w / 2,  oz: -d / 2, dx: 0, dz: 1,  nx: -1, nz: 0, length: d, rotY: -Math.PI / 2 };
    case 'sud':   return { ox: w / 2,  oz: d / 2,  dx: -1, dz: 0, nx: 0, nz: -1, length: w, rotY: Math.PI };
    case 'ovest': return { ox: -w / 2, oz: d / 2,  dx: 0, dz: -1, nx: 1, nz: 0,  length: d, rotY: Math.PI / 2 };
  }
}

export const nextWall = (w) => WALL_ORDER[(WALL_ORDER.indexOf(w) + 1) % 4];
export const prevWall = (w) => WALL_ORDER[(WALL_ORDER.indexOf(w) + 3) % 4];

export function laneOf(typeKey) {
  const zone = MODULE_TYPES[typeKey].zone;
  return zone === 'pensile' || zone === 'cappa' ? 'upper' : 'floor';
}

export function wallLength(state, wall) {
  return frame2D(wall, state.room).length;
}

function ownIntervals(state, wall, lane) {
  return state.placements
    .filter((p) => p.wall === wall && laneOf(p.type) === lane)
    .map((p) => ({ start: p.offset, end: p.offset + MODULE_TYPES[p.type].w, id: p.id }))
    .sort((a, b) => a.start - b.start);
}

// Intervalli occupati sulla parete, incluse le zone d'angolo bloccate dai mobili
// posti sulle pareti adiacenti (evita compenetrazioni negli angoli).
export function occupiedIntervals(state, wall, lane) {
  const L = wallLength(state, wall);
  const depth = lane === 'floor' ? CORNER_DEPTH_FLOOR : CORNER_DEPTH_UPPER;
  const intervals = ownIntervals(state, wall, lane);

  const prev = prevWall(wall);
  const prevL = wallLength(state, prev);
  if (ownIntervals(state, prev, lane).some((iv) => iv.end > prevL - depth + EPS)) {
    intervals.push({ start: 0, end: depth, ghost: true });
  }
  const next = nextWall(wall);
  if (ownIntervals(state, next, lane).some((iv) => iv.start < depth - EPS)) {
    intervals.push({ start: L - depth, end: L, ghost: true });
  }
  return intervals.sort((a, b) => a.start - b.start);
}

function firstFreeSlot(intervals, length, w) {
  let cursor = 0;
  for (const iv of intervals) {
    if (iv.start - cursor >= w - EPS) return cursor;
    cursor = Math.max(cursor, iv.end);
  }
  if (length - cursor >= w - EPS) return cursor;
  return null;
}

function intervalFree(intervals, start, end) {
  return !intervals.some((iv) => iv.start < end - EPS && iv.end > start + EPS);
}

// Aggiunge un modulo sulla parete attiva. Ritorna { ok, placement } o { ok:false, reason }.
export function addModule(state, typeKey) {
  const type = MODULE_TYPES[typeKey];
  const wall = state.activeWall;
  const lane = laneOf(typeKey);
  const L = wallLength(state, wall);
  const intervals = occupiedIntervals(state, wall, lane);

  let offset = null;
  if (type.corner) {
    // La base angolare si aggancia solo agli angoli della parete
    if (intervalFree(intervals, 0, type.w)) offset = 0;
    else if (intervalFree(intervals, L - type.w, L)) offset = L - type.w;
    if (offset === null) {
      return { ok: false, reason: 'Gli angoli di questa parete sono già occupati: libera un angolo o cambia parete.' };
    }
  } else {
    offset = firstFreeSlot(intervals, L, type.w);
    if (offset === null) {
      return {
        ok: false,
        reason: `Spazio esaurito sulla parete: serve ${(type.w * 100).toFixed(0)} cm liberi. Rimuovi un modulo, compatta o cambia parete.`,
      };
    }
  }

  const placement = { id: state.nextId++, type: typeKey, wall, offset };
  state.placements.push(placement);
  return { ok: true, placement };
}

export function removeModule(state, id) {
  state.placements = state.placements.filter((p) => p.id !== id);
}

// Richiude i buchi sulla parete: riassegna gli offset in sequenza per corsia,
// preservando l'ordine e le zone d'angolo bloccate.
export function compactWall(state, wall) {
  for (const lane of ['floor', 'upper']) {
    const blocked = occupiedIntervals(state, wall, lane).filter((iv) => iv.ghost);
    const startAt = blocked.some((iv) => iv.start < EPS) ? blocked.find((iv) => iv.start < EPS).end : 0;
    let cursor = startAt;
    const placed = state.placements
      .filter((p) => p.wall === wall && laneOf(p.type) === lane)
      .sort((a, b) => a.offset - b.offset);
    for (const p of placed) {
      if (MODULE_TYPES[p.type].corner && (p.offset < EPS || p.offset > wallLength(state, wall) - MODULE_TYPES[p.type].w - EPS)) {
        cursor = Math.max(cursor, p.offset + MODULE_TYPES[p.type].w);
        continue; // le basi angolari restano ancorate al loro angolo
      }
      p.offset = cursor;
      cursor += MODULE_TYPES[p.type].w;
    }
  }
}

// Posizione/rotazione del modulo nel mondo 3D (centro dell'ingombro a terra).
export function placementTransform(state, p) {
  const type = MODULE_TYPES[p.type];
  const f = frame2D(p.wall, state.room);
  const along = p.offset + type.w / 2;
  const out = type.d / 2 + 0.001;
  return {
    x: f.ox + f.dx * along + f.nx * out,
    z: f.oz + f.dz * along + f.nz * out,
    rotY: f.rotY,
  };
}

// Distanza in pianta tra i centri di due moduli (per il triangolo di lavoro).
export function distanceBetween(state, a, b) {
  const ta = placementTransform(state, a);
  const tb = placementTransform(state, b);
  return Math.hypot(ta.x - tb.x, ta.z - tb.z);
}

export function totalPrice(state) {
  return state.placements.reduce((sum, p) => sum + modulePrice(p.type, state.model), 0);
}

export function wallUsage(state, wall) {
  const used = ownIntervals(state, wall, 'floor').reduce((s, iv) => s + (iv.end - iv.start), 0);
  return { used, length: wallLength(state, wall) };
}

// Serializzazione con validazione (per localStorage)
export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  try {
    const raw = JSON.parse(json);
    const state = createState();
    if (raw.room && ['w', 'd', 'h'].every((k) => typeof raw.room[k] === 'number' && raw.room[k] > 1 && raw.room[k] < 10)) {
      state.room = raw.room;
    }
    if (MODELS[raw.model]) state.model = raw.model;
    if (MODELS[state.model].finishes.includes(raw.finish)) state.finish = raw.finish;
    else state.finish = MODELS[state.model].finishes[0];
    if (WALL_ORDER.includes(raw.activeWall)) state.activeWall = raw.activeWall;
    if (Array.isArray(raw.placements)) {
      state.placements = raw.placements.filter(
        (p) => MODULE_TYPES[p.type] && WALL_ORDER.includes(p.wall) && typeof p.offset === 'number' && p.offset >= 0
      );
      state.nextId = state.placements.reduce((m, p) => Math.max(m, p.id ?? 0), 0) + 1;
    }
    return state;
  } catch {
    return createState();
  }
}
