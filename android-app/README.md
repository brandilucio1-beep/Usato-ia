# AI Creator — App Android

App Android in italiano per generare **immagini e video da prompt testuali** usando solo risorse gratuite. Interfaccia user-friendly in Jetpack Compose + Material 3 (colori dinamici su Android 12+). Contenuti generali/SFW: arte, avatar, wallpaper, clip creative.

## Funzionalità

- **Immagini** — generazione da prompt tramite l'API gratuita di [Pollinations.ai](https://pollinations.ai) (nessuna chiave richiesta). Stili predefiniti (fotorealistico, arte digitale, acquerello, anime, cyberpunk, fantasy, minimal), tre formati (quadrato, orizzontale, verticale), modello Qualità/Veloce, rigenerazione con nuovo seed.
- **Video** — generazione da prompt tramite Hugging Face Inference API con un **token gratuito** inserito dall'utente nelle Impostazioni. Gestione della coda del modello con retry automatico e messaggi chiari. Modello ed endpoint configurabili.
- **Galleria** — tutte le creazioni salvate, con anteprima, condivisione ed eliminazione.
- **Salvataggio e condivisione** — salvataggio in `Pictures/AICreator` e `Movies/AICreator` tramite MediaStore, condivisione con qualunque app.

## Requisiti

- Android 8.0 (API 26) o superiore.
- Per i video: account gratuito su [huggingface.co](https://huggingface.co) e un token "Read" da [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens), da incollare nelle Impostazioni dell'app.

## Build

Servono JDK 17+ e l'Android SDK (platform 35). Da questa cartella:

```bash
./gradlew :app:assembleDebug
```

L'APK viene prodotto in `app/build/outputs/apk/debug/app-debug.apk`.

## Struttura

```
app/src/main/java/com/aicreator/app/
├── App.kt / AppContainer.kt      # Application + service locator minimale
├── MainActivity.kt
├── network/                      # PollinationsClient (immagini), HfVideoClient (video)
├── data/                         # SettingsRepository (DataStore), MediaRepository (MediaStore)
├── ui/                           # Schermate Compose: Immagini, Video, Galleria, Impostazioni
└── util/ShareUtil.kt             # Condivisione via FileProvider / MediaStore
```

## Note

- La generazione video con risorse gratuite può essere lenta o momentaneamente non disponibile: l'app lo segnala con messaggi espliciti e permette di cambiare modello/endpoint nelle Impostazioni.
- Le immagini vengono richieste con il filtro di sicurezza lato server (`safe=true`): l'app è pensata per contenuti generali.
