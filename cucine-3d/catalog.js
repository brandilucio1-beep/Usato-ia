// Catalogo cucine — dati ricostruiti dal catalogo Mondo Convenienza 2026
// (modelli, finiture e prezzi indicativi delle composizioni tipo).

export const FINISHES = {
  bianco_lucido: { label: 'Bianco Lucido',       color: 0xf4f4f1, roughness: 0.12, metalness: 0.05, type: 'lucido' },
  bordeaux:      { label: 'Bordeaux Lucido',     color: 0x6b1f30, roughness: 0.12, metalness: 0.05, type: 'lucido' },
  grafite:       { label: 'Grafite Lucido',      color: 0x3a3d42, roughness: 0.15, metalness: 0.08, type: 'lucido' },
  visone:        { label: 'Visone Lucido',       color: 0x8a7566, roughness: 0.15, metalness: 0.05, type: 'lucido' },
  petrolio:      { label: 'Petrolio Lucido',     color: 0x14555e, roughness: 0.12, metalness: 0.05, type: 'lucido' },
  ardesia:       { label: 'Ardesia Lucido',      color: 0x4b5158, roughness: 0.12, metalness: 0.08, type: 'lucido' },
  verde_salvia:  { label: 'Verde Salvia Lucido', color: 0xa8b5a0, roughness: 0.15, metalness: 0.05, type: 'lucido' },
  bronzo_shine:  { label: 'Bronzo Shine',        color: 0x8c6a4f, roughness: 0.3,  metalness: 0.45, type: 'lucido' },
  zinco_shine:   { label: 'Zinco Shine',         color: 0x9aa0a6, roughness: 0.3,  metalness: 0.5,  type: 'lucido' },
  bianco_opaco:  { label: 'Bianco Opaco',        color: 0xf2f1ec, roughness: 0.6,  metalness: 0,    type: 'opaco' },
  panna:         { label: 'Panna Opaco',         color: 0xefe7d4, roughness: 0.55, metalness: 0,    type: 'opaco' },
  rovere:        { label: 'Effetto Rovere',      color: 0xa07c50, roughness: 0.75, metalness: 0,    type: 'legno' },
  rovere_grigio: { label: 'Rovere Grigio',       color: 0x857a6a, roughness: 0.75, metalness: 0,    type: 'legno' },
  bianco_larice: { label: 'Bianco Larice',       color: 0xe9e4da, roughness: 0.7,  metalness: 0,    type: 'legno' },
  grigio_larice: { label: 'Grigio Larice',       color: 0x8d8a82, roughness: 0.7,  metalness: 0,    type: 'legno' },
};

// handle: 'gola' = maniglia a gola integrata nell'anta; 'barra' = maniglia a barra in acciaio.
// priceFactor moltiplica il prezzo base dei moduli (Katy 255 cm ≈ €1.320 = riferimento 1.0).
export const MODELS = {
  alice: {
    label: 'Alice', handle: 'gola', priceFactor: 1.15,
    finishes: ['bianco_lucido', 'bordeaux', 'grafite', 'visone', 'bronzo_shine', 'zinco_shine', 'verde_salvia'],
    desc: 'Raffinata, con ante lucide a gola, cestoni ammortizzati e colonne frigo/forno.',
    tip: 'Le superfici lucide di Alice riflettono la luce: valorizzala con faretti o luci LED sottopensile.',
  },
  katy: {
    label: 'Katy', handle: 'barra', priceFactor: 1.0, carcass: 'bianco_opaco',
    finishes: ['bianco_lucido', 'bordeaux', 'ardesia', 'visone', 'petrolio'],
    desc: 'Linee essenziali e moderne, struttura bianco opaco, ante laccate lucide e maniglie in acciaio satinato.',
    tip: 'Katy in tinte scure (ardesia, petrolio) rende al meglio in stanze luminose con pareti chiare.',
  },
  stella: {
    label: 'Stella', handle: 'barra', priceFactor: 0.85,
    finishes: ['bianco_opaco', 'panna', 'rovere_grigio'],
    desc: 'Essenziale e pratica, la più conveniente: perfetta anche in configurazione angolare.',
    tip: 'Stella è ideale per le prime case: componila in L per sfruttare al meglio gli angoli.',
  },
  oasi: {
    label: 'Oasi', handle: 'gola', priceFactor: 1.25,
    finishes: ['rovere', 'grigio_larice', 'bianco_larice', 'grafite'],
    desc: 'Ante effetto legno spazzolato e maniglie a gola in metallo. Disponibile con isola o penisola.',
    tip: 'L\'effetto legno di Oasi si abbina bene a un top effetto pietra chiara e pareti neutre.',
  },
  seventy: {
    label: 'Seventy', handle: 'barra', priceFactor: 1.05,
    finishes: ['bianco_larice', 'grigio_larice'],
    desc: 'Composizione effetto bianco larice / grigio larice lucido, dal sapore contemporaneo.',
    tip: 'Alterna bianco e grigio larice tra basi e pensili per un effetto bicolore di tendenza.',
  },
  veronica: {
    label: 'Veronica', handle: 'barra', priceFactor: 0.95,
    finishes: ['panna', 'bianco_lucido', 'rovere'],
    desc: 'Cucina componibile versatile, tra classico e moderno.',
    tip: 'La finitura panna di Veronica scalda l\'ambiente: abbinala a pavimenti in legno naturale.',
  },
  sofia: {
    label: 'Sofia', handle: 'gola', priceFactor: 1.1,
    finishes: ['bianco_lucido', 'grafite', 'visone'],
    desc: 'Moderna con ante a gola, dal design pulito e minimale.',
    tip: 'Sofia in grafite crea contrasti eleganti con top e pareti chiare.',
  },
  time: {
    label: 'Time', handle: 'barra', priceFactor: 0.9,
    finishes: ['bianco_opaco', 'ardesia', 'rovere'],
    desc: 'Pratica e componibile, pensata per chi cerca funzionalità al giusto prezzo.',
    tip: 'Time è perfetta per composizioni lineari compatte da 255–300 cm.',
  },
};

// Dimensioni in metri. zone: 'base' | 'colonna' (a terra) e 'pensile' | 'cappa' (a parete).
// elevation = quota da terra del fondo del modulo (solo fascia alta).
// basePrice in € (riferimento priceFactor 1.0), elettrodomestico incluso dove role presente.
export const MODULE_TYPES = {
  base60: {
    label: 'Base 60', ico: '🗄', w: 0.6, d: 0.6, h: 0.91, zone: 'base', basePrice: 120,
    desc: 'Base con anta e ripiano interno',
  },
  base_lavello: {
    label: 'Base lavello', ico: '🚰', w: 0.6, d: 0.6, h: 0.91, zone: 'base', basePrice: 185, role: 'lavello',
    desc: 'Base con lavello inox e miscelatore',
  },
  base_cottura: {
    label: 'Base piano cottura', ico: '🔥', w: 0.6, d: 0.6, h: 0.91, zone: 'base', basePrice: 215, role: 'cottura',
    desc: 'Base con piano cottura 4 fuochi',
  },
  base_forno: {
    label: 'Base forno', ico: '♨️', w: 0.6, d: 0.6, h: 0.91, zone: 'base', basePrice: 245, role: 'forno',
    desc: 'Base con forno elettrico da incasso',
  },
  base_lavastoviglie: {
    label: 'Lavastoviglie', ico: '💧', w: 0.6, d: 0.6, h: 0.91, zone: 'base', basePrice: 330, role: 'lavastoviglie',
    desc: 'Lavastoviglie da incasso 60 cm',
  },
  angolo_base: {
    label: 'Base angolare', ico: '📐', w: 1.05, d: 0.65, h: 0.91, zone: 'base', basePrice: 260, corner: true,
    desc: 'Base angolare 105 cm: unisce due pareti (si aggancia solo agli angoli)',
  },
  colonna_frigo: {
    label: 'Colonna frigo', ico: '🧊', w: 0.6, d: 0.6, h: 2.16, zone: 'colonna', basePrice: 520, role: 'frigo',
    desc: 'Colonna con frigorifero combinato',
  },
  colonna_forno: {
    label: 'Colonna forno', ico: '🍞', w: 0.6, d: 0.6, h: 2.16, zone: 'colonna', basePrice: 480, role: 'forno',
    desc: 'Colonna con forno in posizione ergonomica',
  },
  colonna_dispensa: {
    label: 'Colonna dispensa', ico: '🥫', w: 0.6, d: 0.6, h: 2.16, zone: 'colonna', basePrice: 300,
    desc: 'Colonna dispensa con ripiani',
  },
  pensile60: {
    label: 'Pensile 60', ico: '🚪', w: 0.6, d: 0.35, h: 0.72, zone: 'pensile', elevation: 1.44, basePrice: 85,
    desc: 'Pensile con anta e ripiano',
  },
  cappa: {
    label: 'Cappa aspirante', ico: '🌀', w: 0.6, d: 0.35, h: 0.81, zone: 'pensile', elevation: 1.35, basePrice: 165, role: 'cappa',
    desc: 'Cappa con camino (da posizionare sopra il piano cottura)',
  },
};

export const WALL_ORDER = ['nord', 'est', 'sud', 'ovest'];
export const WALL_LABELS = { nord: 'Nord', est: 'Est', sud: 'Sud', ovest: 'Ovest' };

export function roundPrice(v) {
  return Math.round(v / 5) * 5;
}

export function modulePrice(typeKey, modelKey) {
  return roundPrice(MODULE_TYPES[typeKey].basePrice * MODELS[modelKey].priceFactor);
}

export function formatEuro(v) {
  return '€ ' + v.toLocaleString('it-IT');
}
