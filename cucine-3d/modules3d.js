import * as THREE from 'three';
import { FINISHES, MODELS, MODULE_TYPES } from './catalog.js';

// Costruzione procedurale dei moduli cucina: solo primitive three.js, nessun modello esterno.
// Frame locale del modulo: origine a terra al centro dell'ingombro, fronte verso +Z.
// Quote: zoccolo 0–0.12, carcassa basi 0.12–0.87, top 0.87–0.91, pensili da 1.44, colonne fino a 2.16.

const PLINTH_H = 0.12;
const BASE_CARCASS_H = 0.75;
const TOP_Y = PLINTH_H + BASE_CARCASS_H; // 0.87
const TOP_H = 0.04;

function std(opts) {
  return new THREE.MeshStandardMaterial(opts);
}

export function makeMaterials(modelKey, finishKey) {
  const model = MODELS[modelKey];
  const fin = FINISHES[finishKey] ?? FINISHES[model.finishes[0]];
  const carcassFin = FINISHES[model.carcass ?? 'bianco_opaco'];

  const door = std({ color: fin.color, roughness: fin.roughness, metalness: fin.metalness });
  // Variante leggermente più scura per alternare le ante (venatura/legno, profondità visiva)
  const door2 = door.clone();
  door2.color.offsetHSL(0, 0, fin.type === 'legno' ? -0.035 : -0.015);

  return {
    fin,
    door,
    door2,
    carcass: std({ color: carcassFin.color, roughness: carcassFin.roughness, metalness: 0 }),
    top: std({ color: fin.type === 'legno' ? 0xd8d2c6 : 0x55565a, roughness: 0.5, metalness: 0.05 }),
    plinth: std({ color: 0x2a2a2c, roughness: 0.8 }),
    steel: std({ color: 0xc8cccf, roughness: 0.3, metalness: 0.85 }),
    inox: std({ color: 0xb4b8bb, roughness: 0.35, metalness: 0.8 }),
    dark: std({ color: 0x17181a, roughness: 0.45, metalness: 0.2 }),
    glass: std({ color: 0x2a2f36, roughness: 0.15, metalness: 0.4 }),
  };
}

function mesh(geom, mat, x, y, z) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Anta con maniglia a gola (striscia scura incassata) o a barra in acciaio.
// yBottom/h = estensione verticale; front = quota Z del fronte; golaAt = 'top' | 'bottom' | 'left'.
function addDoor(group, mats, handleType, { w, yBottom, h, front, golaAt = 'top', alt = false, x = 0 }) {
  const doorMat = alt ? mats.door2 : mats.door;
  group.add(mesh(new THREE.BoxGeometry(w, h, 0.02), doorMat, x, yBottom + h / 2, front));
  if (handleType === 'gola') {
    const g = 0.032;
    if (golaAt === 'left') {
      group.add(mesh(new THREE.BoxGeometry(g, h - 0.01, 0.022), mats.dark, x - w / 2 + g / 2, yBottom + h / 2, front + 0.001));
    } else {
      const y = golaAt === 'top' ? yBottom + h - g / 2 : yBottom + g / 2;
      group.add(mesh(new THREE.BoxGeometry(w - 0.006, g, 0.022), mats.dark, x, y, front + 0.001));
    }
  } else {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, Math.min(w - 0.16, 0.4), 12), mats.steel);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(x, yBottom + h - 0.06, front + 0.028);
    bar.castShadow = true;
    group.add(bar);
  }
}

function addPlinth(group, mats, w, d) {
  group.add(mesh(new THREE.BoxGeometry(w - 0.02, PLINTH_H, d - 0.06), mats.plinth, 0, PLINTH_H / 2, -0.03));
}

function addCountertop(group, mats, w, d) {
  group.add(mesh(new THREE.BoxGeometry(w + 0.004, TOP_H, d + 0.03), mats.top, 0, TOP_Y + TOP_H / 2, 0.015));
}

function addBaseCarcass(group, mats, w, d) {
  addPlinth(group, mats, w, d);
  group.add(mesh(new THREE.BoxGeometry(w, BASE_CARCASS_H, d), mats.carcass, 0, PLINTH_H + BASE_CARCASS_H / 2, 0));
}

function addSink(group, mats, d) {
  group.add(mesh(new THREE.BoxGeometry(0.52, 0.006, 0.42), mats.inox, 0, TOP_Y + TOP_H + 0.003, 0.02));
  group.add(mesh(new THREE.BoxGeometry(0.4, 0.02, 0.32), mats.dark, 0, TOP_Y + TOP_H + 0.004, 0.02));
  // Miscelatore
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.26, 12), mats.steel);
  body.position.set(0, TOP_Y + TOP_H + 0.13, -d / 2 + 0.1);
  body.castShadow = true;
  group.add(body);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.17, 10), mats.steel);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, TOP_Y + TOP_H + 0.25, -d / 2 + 0.185);
  spout.castShadow = true;
  group.add(spout);
}

function addHob(group, mats) {
  group.add(mesh(new THREE.BoxGeometry(0.55, 0.01, 0.46), mats.dark, 0, TOP_Y + TOP_H + 0.005, 0.01));
  for (const [dx, dz] of [[-0.14, -0.11], [0.14, -0.11], [-0.14, 0.12], [0.14, 0.12]]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 20), mats.steel);
    burner.position.set(dx, TOP_Y + TOP_H + 0.014, 0.01 + dz);
    burner.castShadow = true;
    group.add(burner);
  }
}

function addOvenFront(group, mats, { w, yBottom, h, front }) {
  group.add(mesh(new THREE.BoxGeometry(w - 0.04, h, 0.02), mats.dark, 0, yBottom + h / 2, front));
  group.add(mesh(new THREE.BoxGeometry(w - 0.12, h * 0.5, 0.005), mats.glass, 0, yBottom + h * 0.42, front + 0.011));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, w - 0.14, 12), mats.steel);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, yBottom + h - 0.05, front + 0.03);
  bar.castShadow = true;
  group.add(bar);
}

export function buildModule(typeKey, modelKey, finishKey) {
  const type = MODULE_TYPES[typeKey];
  const model = MODELS[modelKey];
  const mats = makeMaterials(modelKey, finishKey);
  const { w, d, h } = type;
  const g = new THREE.Group();
  const front = d / 2 + 0.011;

  switch (typeKey) {
    case 'base60':
      addBaseCarcass(g, mats, w, d);
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.02, h: BASE_CARCASS_H - 0.04, front });
      addCountertop(g, mats, w, d);
      break;

    case 'base_lavello':
      addBaseCarcass(g, mats, w, d);
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.02, h: BASE_CARCASS_H - 0.04, front, alt: true });
      addCountertop(g, mats, w, d);
      addSink(g, mats, d);
      break;

    case 'base_cottura':
      addBaseCarcass(g, mats, w, d);
      // Cassettoni sotto il piano cottura
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.39, h: 0.34, front });
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.02, h: 0.35, front, alt: true });
      addCountertop(g, mats, w, d);
      addHob(g, mats);
      break;

    case 'base_forno':
      addBaseCarcass(g, mats, w, d);
      addOvenFront(g, mats, { w, yBottom: PLINTH_H + 0.1, h: 0.6, front });
      group_strip(g, mats, w, front); // striscia sopra il forno
      addCountertop(g, mats, w, d);
      break;

    case 'base_lavastoviglie':
      addBaseCarcass(g, mats, w, d);
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.02, h: BASE_CARCASS_H - 0.04, front });
      g.add(mesh(new THREE.BoxGeometry(w - 0.03, 0.05, 0.022), mats.inox, 0, TOP_Y - 0.045, front + 0.001));
      addCountertop(g, mats, w, d);
      break;

    case 'angolo_base':
      addBaseCarcass(g, mats, w, d);
      // Anta singola sul lato destro: la parte sinistra resta cieca (angolo morto)
      addDoor(g, mats, model.handle, { w: 0.48, yBottom: PLINTH_H + 0.02, h: BASE_CARCASS_H - 0.04, front, x: w / 2 - 0.26 });
      addCountertop(g, mats, w, d);
      break;

    case 'colonna_frigo': {
      addPlinth(g, mats, w, d);
      g.add(mesh(new THREE.BoxGeometry(w, h - PLINTH_H, d), mats.carcass, 0, PLINTH_H + (h - PLINTH_H) / 2, 0));
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: 1.34, h: h - 1.34 - 0.01, front, golaAt: 'bottom' });
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.01, h: 1.2, front, alt: true });
      break;
    }

    case 'colonna_forno': {
      addPlinth(g, mats, w, d);
      g.add(mesh(new THREE.BoxGeometry(w, h - PLINTH_H, d), mats.carcass, 0, PLINTH_H + (h - PLINTH_H) / 2, 0));
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: 1.72, h: h - 1.72 - 0.01, front, golaAt: 'bottom' });
      addOvenFront(g, mats, { w, yBottom: 1.05, h: 0.65, front });
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.01, h: 0.92, front, alt: true });
      break;
    }

    case 'colonna_dispensa': {
      addPlinth(g, mats, w, d);
      g.add(mesh(new THREE.BoxGeometry(w, h - PLINTH_H, d), mats.carcass, 0, PLINTH_H + (h - PLINTH_H) / 2, 0));
      addDoor(g, mats, model.handle, { w: w - 0.03, yBottom: PLINTH_H + 0.01, h: h - PLINTH_H - 0.02, front, golaAt: 'left' });
      break;
    }

    case 'pensile60': {
      const y0 = type.elevation;
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mats.carcass, 0, y0 + h / 2, 0));
      // Apertura vasistas: gola sul bordo inferiore
      addDoor(g, mats, model.handle, { w: w - 0.02, yBottom: y0 + 0.01, h: h - 0.02, front, golaAt: 'bottom' });
      break;
    }

    case 'cappa': {
      const y0 = type.elevation;
      g.add(mesh(new THREE.BoxGeometry(w, 0.06, d), mats.inox, 0, y0 + 0.03, 0));
      g.add(mesh(new THREE.BoxGeometry(w - 0.08, 0.18, d - 0.06), mats.steel, 0, y0 + 0.13, -0.02));
      // Camino fino al soffitto del modulo
      g.add(mesh(new THREE.BoxGeometry(0.24, h - 0.22, 0.24), mats.inox, 0, y0 + 0.22 + (h - 0.22) / 2, -d / 2 + 0.14));
      break;
    }
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Striscia di finitura sopra il fronte forno (riempie il vuoto fino al top)
function group_strip(g, mats, w, front) {
  g.add(mesh(new THREE.BoxGeometry(w - 0.03, 0.08, 0.02), mats.door, 0, TOP_Y - 0.05, front));
}
