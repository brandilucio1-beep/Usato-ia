# 🍳 Progetta la tua Cucina 3D

Configuratore 3D di cucine componibili ispirato al catalogo **Mondo Convenienza**:
componi la cucina modulo per modulo, posizionala su pareti diverse della stanza e
ricevi suggerimenti di progettazione e un preventivo indicativo in tempo reale.

## Come si usa

Non serve alcuna installazione: è un'app statica.

```bash
# dalla cartella del repo
python3 -m http.server 8090 --directory cucine-3d
# poi apri http://localhost:8090
```

In alternativa apri direttamente `cucine-3d/index.html` con un piccolo server statico
qualsiasi (`npx serve cucine-3d`, estensione Live Server di VS Code, ecc. — serve un
server perché la pagina usa moduli ES).

## Funzionalità

- **Stanza su misura** — imposta larghezza, profondità e altezza (2–8 m); pavimento con
  griglia da 1 m e pareti che si nascondono da sole mentre ruoti la visuale.
- **8 modelli dal catalogo** — Alice, Katy, Stella, Oasi, Seventy, Veronica, Sofia, Time,
  ciascuno con le proprie finiture reali (bianco lucido, bordeaux, grafite, visone,
  petrolio, bronzo/zinco shine, verde salvia, effetto rovere e larice…) e maniglie a gola
  o a barra.
- **12 tipi di modulo** — basi, base lavello, piano cottura, forno, lavastoviglie, base
  angolare, colonne frigo/forno/dispensa, pensili e cappa: tutti costruiti in 3D
  proceduralmente (nessun modello esterno da scaricare).
- **Composizione su 4 pareti** — scegli la parete attiva (Nord/Sud/Est/Ovest): i moduli si
  accostano da soli, la base angolare unisce due pareti e gli angoli occupati vengono
  protetti dalle collisioni.
- **Suggerimenti e consigli** — verifica del triangolo di lavoro lavello–fuochi–frigo,
  avvisi automatici (fuochi accanto al frigo, cappa mancante, fuochi in angolo, lavello
  attaccato ai fuochi…) e consigli su finiture, luce e ergonomia.
- **Preventivo indicativo** — prezzo live calcolato dai listini delle composizioni tipo
  (riferimento: Katy 255 cm con elettrodomestici ≈ €1.320); esclusi trasporto e montaggio.
- **Salvataggio automatico** — il progetto resta nel browser (localStorage) e ricompare
  alla riapertura.

## Struttura

| File | Contenuto |
|---|---|
| `index.html` | layout dell'interfaccia e import map |
| `style.css` | tema scuro dell'app |
| `catalog.js` | dataset di modelli, finiture, moduli e prezzi |
| `scene.js` | scena three.js: stanza, luci, camera, frame delle pareti |
| `modules3d.js` | costruzione procedurale dei mobili |
| `planner.js` | stato, snapping sulle pareti, angoli, preventivo |
| `tips.js` | motore dei suggerimenti e degli avvisi |
| `main.js` | interfaccia e interazioni |
| `vendor/` | three.js r160 + OrbitControls inclusi in locale (funziona offline) |

> Nota: i dati di modelli, finiture e prezzi sono **indicativi**, ricostruiti dal
> catalogo pubblico Mondo Convenienza 2026 a scopo dimostrativo. Per configurazioni e
> preventivi reali: [mondoconv.it](https://www.mondoconv.it).
