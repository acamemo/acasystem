# REP-20261007-030 — Copertina con widget, scossa della card tenuta, cambio pagina al bordo (F0)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con due schermate del trascinamento sul tablet: «diamo anche un animazione alla singola card di shake mentre è in hold, poi se lo trascino verso un altra pagina mi scorre in automatico alla pagina al lato dove la scorro. Diamo anche la possibilità di spostare il calendario, l'orologio e il meteo dalla copertina». Domande in chat: «Anche su altre pagine» (diventano widget veri); trascinando oltre l'ultima pagina, «Niente». Poi la richiesta di un piano «come Android» (fasi F0–F9, approvato): questo report è la fase F0. |
| Perimetro | Launcher; nessuna nuova dipendenza. |

## Ricerca per il piano (fonti consultate il 2026-10-07)

- **Launcher3 (AOSP):**
  - [Workspace.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/src/com/android/launcher3/Workspace.java): riordino dopo 650 ms, creazione di cartelle e pagina vuota durante il trascinamento;
  - [SpringLoadedDragController.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/src/com/android/launcher3/dragndrop/SpringLoadedDragController.java): bordo dopo 500 ms;
  - [strings.xml](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/res/values/strings.xml): «Remove», «Item removed / Undo», «No room on this home screen»;
  - [LauncherAccessibilityDelegate.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/refs/heads/main/src/com/android/launcher3/accessibility/LauncherAccessibilityDelegate.java): azioni «Move item» e «Resize».
- **Android developers:** [app widgets layouts](https://developer.android.com/develop/ui/views/appwidgets/layouts) e [advanced](https://developer.android.com/develop/ui/views/appwidgets/advanced) (`targetCellWidth`, `minResizeWidth`, `resizeMode`).
- **Google:** [Pixel Tablet](https://support.google.com/googlepixeltablet/answer/13590881) (cornice di ridimensionamento).
- **Samsung:** [ANS10000945](https://www.samsung.com/us/support/answer/ANS10000945/) (pile, blocco del layout, impostazioni del widget) e [personalizzazione del tablet](https://www.samsung.com/ca/support/mobile-devices/galaxy-tablet-customize-the-home-screens/) (pagine, pagina principale).

Il confronto con quanto implementato e le fasi successive sono nel piano approvato in chat. La rimozione con «Annulla», il riordino con attesa, il blocco e la pagina principale sono le fasi F1–F4.

## Modifiche

- **Scossa della card tenuta** (`launcher.css`):
  - la copia sotto il dito oscilla leggermente (150 ms, ±0,9° attorno all'inclinazione);
  - lo stesso fa il widget premuto prima che parta il trascinamento;
  - con il movimento ridotto non oscilla.
- **Cambio pagina al bordo** (`useWidgetDrag.ts`, `LauncherScreen.tsx`):
  - il cambio parte se il dito è entro 72 px dal lato, oppure se la copia del widget sporge oltre il lato per un terzo della sua larghezza;
  - nelle schermate dell'utente il widget era tenuto per un'estremità, quindi la copia usciva ma il dito no;
  - l'attesa passa da 650 a 450 ms, vicina ai 500 ms di Launcher3;
  - una freccia luminosa sul bordo annuncia la pagina che arriva, solo se da quel lato c'è una pagina di widget (`hasPage`).
- **Copertina con widget veri:**
  - **Modello:** la copertina è una pagina di tipo `cover`. Finché non la si cambia è virtuale (`defaultCoverPage`: orologio, data e meteo 2×2 in riga, o su due righe sul telefono) e la prima modifica la registra nel layout (`withCoverPage` nel controller).
    - `pagerEntries` con le griglie dà alla voce della copertina la sua pagina.
    - Una copertina piena manda un nuovo widget nella prima pagina di widget.
    - La migrazione dal vecchio formato salta la copertina, che torna quella predefinita.
  - **Widget:** `cover_clock` (Orologio), `cover_calendar` (Data) e `cover_weather` (Meteo di casa).
    - Usano le card della copertina, che riempiono la cella e si dimensionano sul lato corto (`components/widgets/home/cover/`, gruppo `coverWidgets` nel registro).
    - Sono `frameless`, con misure da 1×1 a 3×3 (il meteo fino a 4×3).
    - Si aggiungono anche dal vassoio e dal pannello (tipi `simple`, icone `clock`, `text` e `sun`).
  - **Schermata:** la copertina mostra la sua griglia (`WidgetGrid quiet`: senza «+» fuori dalla modifica).
    - Accetta widget: con il trascinamento, il bordo, le frecce e il vassoio.
    - `widgetPageOf(entry)` unisce le pagine di widget e la copertina.
  - **Bug trovato dai test:** la vecchia logica di visibilità (`isCardHiddenByLogic`) nascondeva i widget della copertina perché non hanno un'entità. Ora sono tra le card speciali.
  - `CoverWeather.tsx` è passato da `pages/cover/` a `components/widgets/home/cover/`.

## Verifiche

- **Controlli:** typecheck, eslint, prettier, lint dei colori e tipografico (0 violazioni), build e dimensioni dei chunk: tutti verdi.
- **Test:** vitest 1380/1380.
  - Nuovi in `LauncherCover.test.ts`: copertina predefinita per ogni classe, dentro la griglia e senza sovrapposizioni; copertina virtuale e voce del pager; card della copertina mai nascoste; orologio dalla copertina a «Principale» e ritorno; copertina piena.
  - Nuovi in `LauncherDragDrop.test.tsx`: bordo con la copia che sporge e freccia; nessun cambio verso la copertina senza widget.
  - Aggiornati: `LauncherScreen` (fallback limitati a «Casa»; copertina spenta nel caso «nessuna pagina a sinistra»), `FixLauncherUiShell` (l'orologio della copertina riporta la visibilità della pagina).
- **Prova a video** su `launcher.html`: la copertina mostra orologio e data come widget nelle celle. Il meteo non compare perché le entità finte non hanno un `weather.*`.
- **Banco:** `sha256:f960e499ae842f1512456c7112f0ff5fe6e77b16ed7859e20904e11a0f44c65c`, `healthy`; `/api/health` ok su `172.20.10.6:3002`.

## Limiti

- **Tablet:** da provare; la scossa e la freccia del bordo non le ho viste animate a video.
- **Misure delle card:** sulla griglia del tablet le card della copertina sono più piccole di prima (2×2). Si allargano con i bordi.

## Ripresa

Fase F1 del piano: rimozione come Android, con la zona «Rimuovi» e «Annulla».
