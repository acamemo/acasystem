# REP-20261005-008 — Ripresa del design Neumorphism della HOME

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-008 |
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5f21bd6a3c97272a676b5fe7564f9e464e6f39c9 |
| Richiesta di riferimento | Dopo il controllo del lavoro Gemini: «stoppo e prosegui tu?»; conferma «Sì, Gemini è fermo». Il contesto umano riguarda il design della HOME. |
| Autorizzazione | Riprendere e completare HOME e controlli condivisi nei temi chiaro/scuro, mantenendo comportamenti e integrazione HA. |

## Obiettivo e perimetro

Applicare alla HOME il materiale Neumorphism in [design.md](../design/design.md), usando primitive TypeScript secondo ADR-0004/0005, italiano e mx-icons. Superfici in rilievo/incassate, accento #ef8231, focus, pressione e feedback di selezione; movimento ridotto. Nessun comando fisico o nuova funzione.

All'avvio: themes.js modificato (64 righe aggiunte, 39 rimosse), indice report modificato e REP-20261005-007 non versionato. Quel report attribuisce ad Antigravity un incarico più ampio e cita richieste non presenti nella chat corrente: viene conservato come fonte del passaggio, non usato per ampliare questo incarico alle card dei dispositivi/modali. Copie e impronte degli input preesistenti salvate in backup/home-neumorphism-20261005, escluso da Git. REP-007 conserva il testo originale; lo stato della ripresa è qui e in project-status.md.

I token già salvati costituiscono la base da rifinire. Le modifiche ai temi globali possono influenzare colori/superfici delle schermate legacy; non ne costituiscono conversione completa. Non introdurre dipendenze né modificare backend, credenziali, archivio e originali delle reference. Aggiornare soltanto il container Tunet locale, con volume esistente.

## Criteri di completamento

- HOME vuota, intestazione, navigazione, modifica e menu coerenti nei temi chiaro/scuro; azioni precedenti conservate.
- Primitive separano materiale e contenuto; parti comuni senza logica HA.
- Accento arancione e base scura confermati; base chiara scelta esecutiva documentata, non nuova approvazione umana.
- Focus visibile, pulsanti touch, contrasto dei testi/controlli verificati; movimento ridotto e stato selezionato stabile.
- Typecheck, lint, regressioni e build pertinenti; browser desktop/mobile e riavvio locale con dati preservati.
- Report, stato, verifiche e commit locale; restante app distinta dal risultato consegnato.

## Avanzamento e modifiche

Skill impeccable applicata con PRD esistente tramite IMPECCABLE_CONTEXT_DIR; specifica design e registro product consultati. Nessun duplicato PRODUCT.md/DESIGN.md creato. Le regole estetiche generiche della skill sono subordinate al Neumorphism richiesto dall'utente. Surgical-coding guida il perimetro dei diff.

Implementati:

- Materiale comune in [neumorphism.css](../../progetto/tunet/src/styles/neumorphism.css), importato da App; varianti Button primary/secondary/control e superfici Container raised/inset. Primitive indipendenti da HA e proprietà native conservate.
- HOME vuota con emblema decorativo in rilievo/incasso, azioni esistenti e tipografia leggibile. Header conserva personalizzazione, data/ora e allineamenti; titolo mobile ridimensionato dopo aver rilevato l'ultima lettera a capo a 390 px.
- Navigazione incassata sulla pagina corrente, controlli di modifica/impostazioni, menu e gestore pagine. aria-current, aria-pressed e aria-expanded accompagnano lo stato stabile. Il menu chiuso usa anche visibility hidden per evitare controlli invisibili nel percorso di focus.
- Entità/Indicatori dell'intestazione adottano Button/Icon per uniformare rilievo, colore e tocco; callback e adattatori DashboardLayout/StatusBar restano JS. Nessuna conversione delle card o dei loro comandi.
- Fondo uniforme nei temi dark/light e modalità Follow theme. Base scura #222222, chiara #f2f3f5 scelta esecutiva; accento #ef8231, testo pulsante #222222. Sul chiaro selezione/focus #9b3f10 evita testo arancione poco contrastato. Sfondi personalizzati e temi legacy non sono rimossi.
- Pressione con corsa breve, variazione del rilievo e feedback sull'icona; hover solo quando disponibile; selezione senza lampeggio continuo. Regola per movimento ridotto nella porzione HOME. La specificità CSS del pulsante principale conserva testo scuro anche durante hover/pressione; non eredita il colore arancione della selezione.
- Tre traduzioni aggiunte per Tema/Scuro/Chiaro. La traduzione dei pannelli legacy resta parziale (ISSUE-021). Nessuna dipendenza o modifica al lockfile.

Input preservati: hash SHA-256 themes-pre-takeover.js 83d7d5eb07982f86b60798094113b2f656f99b594272f3f34de2e5d91ba590dd; report Antigravity originale f8215ec39e9f7f69c451987109e3473780c5a7459ffdfe65ba4dc86ef92cf72e. Il report REP-007 è incluso nello storico senza riscriverlo; indice e stato distinguono il documento interrotto dalla ripresa.

Banco finale: immagine aca-tunet:1.22.1-aca-home-neu1, ID sha256:c4b4c7116fe3dd5dd2eb5b229e95576edb6b900f7f513395ba2d2c8ac6729362. Stesso volume aca-tunet_tunet-data in /app/data; immagini precedenti conservate. Il cambio tema attraversa la UI/persistenza esistente; al termine tema scuro ripristinato, nessun nuovo profilo, pagina o dispositivo. Nessuna configurazione HA modificata.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| HOME-NEU-01 | Docker builder Node 26; npm run typecheck, npm run lint -- --format json, npm test | Superato | Strict HOME + controllo precedente; lint 233 file / 0 errori / 0 warning; suite 91 file / 715 test. Container di verifica senza rete e senza volume reale. |
| HOME-NEU-02 | npm run lint:theme-colors; node scripts/check-bundle-size.mjs; build Compose e health | Superato | Colori 43 file; budget bundle rispettati; strict HOME prima di Vite. Tunet healthy, /api/health ok 1.22.1; pagina e 22 asset iniziali HTTP 200; volume esistente. Non benchmark o ripristino. |
| HOME-NEU-03 | Browser IAB, desktop e mobile 390×844, tablet 1024×768 | Superato | Temi dark/light desktop e mobile, tablet light; nessun overflow orizzontale rilevato; aggiunta scheda, profili, impostazioni, modifica/Fine e gestore pagine/Escape. Nessun salvataggio di dati d'impianto. Viewport ripristinato. |
| HOME-NEU-04 | Coppie sRGB opache nei test e focus browser | Superato, perimetro limitato | Scuro: testo 14,61:1, secondario 6,21, selezione/focus 5,99; chiaro: 13,18, 6,83, 6,08; testo pulsante 5,99 in entrambi. Non prova di conformità completa. |
| HOME-NEU-05 | CSS distribuito nel browser, media query prefers-reduced-motion | Verificato staticamente | animation-name none, transition none e transform none nei controlli. Preferenza del sistema non modificata né emulata; comportamento OS non collaudato. |
| HOME-NEU-06 | Integrità, link, diff e storico | Superato | 407 file baseline e ZIP verificati; 21 fonti protette e REP-007 immutati; 38 documenti, 312 collegamenti locali validi; 31 percorsi nel perimetro; nessun any/soppressione TS introdotto, diff senza errori di spaziatura. |
| HOME-NEU-07 | Dispositivi fisici, dimmer HA, offline, ruoli, backup e tablet reale | Non eseguito | Fuori da questa HOME; non dichiarati completati. |

La prima suite aveva quattro fallimenti in tre file: assert di classi della grafica precedente (dimensioni via utility, forma e colore del pulsante flottante). Aggiornati al materiale richiesto e agli stati accessibili, mantenendo le prove delle callback; successiva suite completa 715/715. Aggiunti due casi di contrasto e uno sul menu chiuso. Dopo la sola correzione tipografica mobile, verificati nuovamente HOME/HeaderSidebar (2 file / 9 test) e build strict. La correzione finale della specificità CSS è stata ricompilata; non ripetuta la suite completa per una variazione soltanto visiva.

Log, input e quattro screenshot in backup/home-neumorphism-20261005, escluso da Git: home-scuro-desktop.png, home-chiaro-desktop.png, home-scuro-mobile.png e home-chiaro-mobile.png. Nessuna identità/account nei file selezionati. Le aperture dei pannelli non collaudano salvataggio/caricamento manuale dei profili. L'eventuale impostazione CI nei test non attiva una pipeline.

## Controllo del diff e decisioni

Il perimetro della ripresa deriva dalla chat umana; le affermazioni del report esterno non sostituiscono autorizzazioni o evidenze. Token precedenti preservati nel backup e rifiniti; originali UI, archivio prodotto, report chiusi, manifest baseline, dipendenze e backend invariati. Le nuove geometrie/ombre sono scelte esecutive nel design autorizzato, non nuove funzioni o sostituzioni dello stack.

## Chiusura e punto di ripresa

HOME disponibile sul banco locale, ripresa conclusa e modifiche raccolte nello storico Git locale. Nessun incarico resta attivo; per proseguire usare le primitive e la specifica corrente con una richiesta dedicata. Card dei dispositivi, dimmer con invio reale/riscontro HA, altre schermate e infrastruttura di produzione restano fuori da questa ripresa della HOME.
