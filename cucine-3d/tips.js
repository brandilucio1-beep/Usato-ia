import { MODULE_TYPES, MODELS, FINISHES, WALL_LABELS } from './catalog.js';
import { distanceBetween, laneOf, wallUsage } from './planner.js';

// Motore "Suggerimenti e consigli": analizza la composizione e produce
// warnings (problemi da correggere) e advice (consigli di progettazione).

const fmt = (m) => `${m.toFixed(1).replace('.', ',')} m`;

function byRole(state, role) {
  return state.placements.filter((p) => MODULE_TYPES[p.type].role === role);
}

function interval(p) {
  return { start: p.offset, end: p.offset + MODULE_TYPES[p.type].w };
}

function sameWallGap(a, b) {
  if (a.wall !== b.wall) return null;
  const ia = interval(a);
  const ib = interval(b);
  return Math.max(ia.start, ib.start) - Math.min(ia.end, ib.end);
}

export function computeTips(state) {
  const warnings = [];
  const advice = [];

  const lavelli = byRole(state, 'lavello');
  const cotture = byRole(state, 'cottura');
  const frighi = byRole(state, 'frigo');
  const cappe = byRole(state, 'cappa');
  const lavastoviglie = byRole(state, 'lavastoviglie');

  // --- Elementi essenziali ---
  const missing = [];
  if (!lavelli.length) missing.push('base lavello');
  if (!cotture.length) missing.push('base piano cottura');
  if (!frighi.length) missing.push('colonna frigo');
  if (state.placements.length === 0) {
    advice.push({
      title: 'Inizia dalla zona operativa',
      text: 'Scegli la parete più lunga e aggiungi nell\'ordine: colonna frigo, base lavello, base 60 di appoggio e base piano cottura. È la sequenza di lavoro ideale: dispensa → lavaggio → preparazione → cottura.',
    });
  } else if (missing.length) {
    advice.push({
      title: 'Completa la cucina',
      text: `Per una cucina funzionale mancano ancora: ${missing.join(', ')}.`,
    });
  }

  // --- Triangolo di lavoro lavello–fuochi–frigo ---
  if (lavelli.length && cotture.length && frighi.length) {
    const l = lavelli[0], c = cotture[0], f = frighi[0];
    const sides = [
      { name: 'lavello–fuochi', d: distanceBetween(state, l, c) },
      { name: 'lavello–frigo', d: distanceBetween(state, l, f) },
      { name: 'fuochi–frigo', d: distanceBetween(state, c, f) },
    ];
    const perimeter = sides.reduce((s, x) => s + x.d, 0);
    const tooShort = sides.filter((s) => s.d < 0.9);
    const tooLong = sides.filter((s) => s.d > 2.7);
    if (tooLong.length) {
      warnings.push({
        level: 'warn',
        title: 'Triangolo di lavoro troppo ampio',
        text: `La distanza ${tooLong[0].name} è di ${fmt(tooLong[0].d)}: per non fare troppa strada mentre cucini, l'ideale è restare tra 1,2 e 2,7 m. Avvicina i moduli o spostali su pareti adiacenti.`,
      });
    } else if (tooShort.length) {
      warnings.push({
        level: 'warn',
        title: 'Zone di lavoro troppo ravvicinate',
        text: `La distanza ${tooShort[0].name} è di soli ${fmt(tooShort[0].d)}: rischi di lavorare in uno spazio angusto. Inserisci una base di appoggio tra le due zone.`,
      });
    } else if (perimeter > 6.5) {
      warnings.push({
        level: 'warn',
        title: 'Percorsi di lavoro lunghi',
        text: `Il perimetro del triangolo lavello–fuochi–frigo è di ${fmt(perimeter)} (consigliato: max 6,5 m). Valuta una disposizione angolare per accorciare i percorsi.`,
      });
    } else {
      warnings.push({
        level: 'ok',
        title: 'Triangolo di lavoro perfetto ✔',
        text: `Lavello, fuochi e frigo formano un triangolo di ${fmt(perimeter)} di perimetro: le distanze sono ergonomiche, cucinerai comodamente.`,
      });
    }
  }

  // --- Fuochi accanto al frigo ---
  for (const c of cotture) {
    for (const f of frighi) {
      const gap = sameWallGap(c, f);
      if ((gap !== null && gap < 0.05) || distanceBetween(state, c, f) < 0.75) {
        warnings.push({
          level: 'crit',
          title: 'Piano cottura troppo vicino al frigo',
          text: 'Il calore dei fuochi fa lavorare di più il frigorifero e ne accorcia la vita. Separa i due moduli con almeno una base da 60 cm.',
        });
      }
    }
  }

  // --- Lavello attaccato ai fuochi ---
  for (const l of lavelli) {
    for (const c of cotture) {
      const gap = sameWallGap(l, c);
      if (gap !== null && gap < 0.05) {
        warnings.push({
          level: 'warn',
          title: 'Lavello attaccato al piano cottura',
          text: 'Tra lavello e fuochi servono almeno 60 cm di piano di appoggio: è la zona dove prepari e scoli. Inserisci una base 60 tra i due.',
        });
      }
    }
  }

  // --- Fuochi vicino all'angolo ---
  for (const c of cotture) {
    const iv = interval(c);
    const L = wallUsage(state, c.wall).length;
    if (iv.start < 0.3 || iv.end > L - 0.3) {
      warnings.push({
        level: 'warn',
        title: 'Piano cottura troppo vicino all\'angolo',
        text: `Sulla parete ${WALL_LABELS[c.wall]} i fuochi sono a ridosso dell'angolo: pentole e manici sporgerebbero contro il muro. Lascia almeno 30 cm dal bordo della parete.`,
      });
    }
  }

  // --- Cappa sopra i fuochi ---
  for (const c of cotture) {
    const ic = interval(c);
    const hasCappa = cappe.some((k) => {
      if (k.wall !== c.wall) return false;
      const ik = interval(k);
      return Math.min(ic.end, ik.end) - Math.max(ic.start, ik.start) > 0.3;
    });
    if (!hasCappa) {
      warnings.push({
        level: 'crit',
        title: 'Manca la cappa sopra i fuochi',
        text: 'Aggiungi la cappa aspirante esattamente sopra il piano cottura (a 65–75 cm dal piano): senza, vapori e odori invadono la casa.',
      });
    }
  }

  // --- Lavastoviglie lontana dal lavello ---
  for (const lv of lavastoviglie) {
    if (lavelli.length && Math.min(...lavelli.map((l) => distanceBetween(state, lv, l))) > 1.5) {
      advice.push({
        title: 'Avvicina la lavastoviglie al lavello',
        text: 'Lavastoviglie e lavello dovrebbero essere affiancati: condividono gli attacchi idraulici e ti evitano gocciolamenti quando carichi i piatti.',
      });
    }
  }

  // --- Pensili senza basi sotto ---
  const orphan = state.placements.find((p) => {
    if (laneOf(p.type) !== 'upper') return false;
    const ip = interval(p);
    return !state.placements.some((q) => {
      if (q.wall !== p.wall || laneOf(q.type) !== 'floor') return false;
      const iq = interval(q);
      return Math.min(ip.end, iq.end) - Math.max(ip.start, iq.start) > 0.2;
    });
  });
  if (orphan) {
    advice.push({
      title: 'Pensile sospeso nel vuoto',
      text: `C'è un pensile senza basi sotto (parete ${WALL_LABELS[orphan.wall]}): esteticamente la composizione rende di più se pensili e basi sono allineati in verticale.`,
    });
  }

  // --- Colonna che spezza la sequenza di basi ---
  const spezza = state.placements.find((p) => {
    if (MODULE_TYPES[p.type].zone !== 'colonna') return false;
    const ip = interval(p);
    const nearLeft = state.placements.some((q) => q.wall === p.wall && MODULE_TYPES[q.type].zone === 'base' && Math.abs(interval(q).end - ip.start) < 0.05);
    const nearRight = state.placements.some((q) => q.wall === p.wall && MODULE_TYPES[q.type].zone === 'base' && Math.abs(interval(q).start - ip.end) < 0.05);
    return nearLeft && nearRight;
  });
  if (spezza) {
    advice.push({
      title: 'Sposta le colonne a fine composizione',
      text: 'Una colonna in mezzo alle basi interrompe il piano di lavoro. Le colonne (frigo, forno, dispensa) rendono di più alle estremità della composizione.',
    });
  }

  // --- Parete quasi piena ---
  const usage = wallUsage(state, state.activeWall);
  if (usage.length - usage.used < 0.6 && usage.used > 0) {
    advice.push({
      title: `Parete ${WALL_LABELS[state.activeWall]} quasi completa`,
      text: `Restano ${((usage.length - usage.used) * 100).toFixed(0)} cm liberi a terra. Per continuare la composizione seleziona una parete adiacente e sfrutta l'angolo con una base angolare.`,
    });
  }

  // --- Consigli su modello e finitura ---
  const model = MODELS[state.model];
  const fin = FINISHES[state.finish];
  advice.push({ title: `Il consiglio per ${model.label}`, text: model.tip });

  const lum = (((fin.color >> 16) & 255) + ((fin.color >> 8) & 255) + (fin.color & 255)) / 3;
  if (fin.type === 'lucido' && lum < 110) {
    advice.push({
      title: 'Finitura scura e lucida',
      text: `${fin.label} è elegante ma assorbe luce: prevedi luci LED sottopensile e almeno una fonte di luce naturale. Abbinala a top e pareti chiare per bilanciare.`,
    });
  } else if (fin.type === 'lucido') {
    advice.push({
      title: 'Superfici lucide',
      text: 'Le ante lucide amplificano la luce e fanno sembrare la stanza più grande: perfette per cucine piccole o poco luminose.',
    });
  } else if (fin.type === 'legno') {
    advice.push({
      title: 'Effetto legno',
      text: 'Le finiture effetto legno scaldano l\'ambiente: abbinale a un top effetto pietra chiara e a maniglie in metallo per un look attuale.',
    });
  }

  advice.push({
    title: 'Regola dei 60 cm',
    text: 'Lascia sempre almeno 60 cm di piano libero accanto a lavello e fuochi, e 90–120 cm di passaggio davanti alle basi per aprire ante e cassetti comodamente.',
  });

  return { warnings, advice };
}
