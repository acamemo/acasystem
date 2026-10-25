# REP-20261019-004 — Studio di fattibilità: integrazione di NeonPlan 3D in ACA SYSTEM 2.0

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261019-004, studio di fattibilità su Mastershort/neonplan3d |
| Stato | **Studio completato; nessuna implementazione** |
| Data | 2026-10-19 (Europe/Rome) |
| Autore / modello | Agente Claude Code in un flusso di lavoro con letture A, B e C, una sintesi e una critica di completezza con verifiche dirette. Nome esatto del modello per le singole letture non disponibile. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`), con modifiche preesistenti non committate (documentazione e `progetto/acasystem`, vedi `git status`), non toccate |
| Richiesta di riferimento | «https://github.com/Mastershort/neonplan3d si vorrebbe implementare una sezione di editing, ti ho linkato una repository che il mio capo mi ha mandato e vorremmo vedere di personalizzarla con l'applicativo ed integrarla, è possibile? Fammi sapere la situazione» (utente, 2026-10-19) |
| Autorizzazione | Solo studio e risposta. Non sono autorizzati: implementazione, nuove dipendenze, installazioni in HA, modifiche a proxy o CSP, uso del tablet o del banco (occupati da un altro lavoro). |

## Obiettivo e perimetro

Lo studio stabilisce se e come [Mastershort/neonplan3d](https://github.com/Mastershort/neonplan3d) può fornire ad ACA SYSTEM 2.0 una «sezione di editing» personalizzata e integrata, e indica opzioni, rischi, impegno in tappe e decisioni necessarie.

Incluso:
- lettura della repository esterna, solo tramite API GitHub e raw.githubusercontent.com: niente clone, niente esecuzione; copie dei singoli file solo in `%TEMP%`;
- lettura in sola lettura di documenti e codice di Acasystem.

Escluso:
- modifiche ad Acasystem, installazioni in HA, tablet, banco Docker, commit;
- esecuzione di script della repository (`tools/`, `scripts/`, `preview/`).

Requisiti e decisioni collegati:
- REQ-09: caricamento piantina; Proposto/Non iniziato; attore «Utente / Admin»; `product.md` riga 177, `project-status.md` riga 66.
- **REQ-10**: posizionamento e controllo da piantina; Proposto, AC-10, ISSUE-008; `product.md` riga 178, `project-status.md` riga 67.
- REQ-16: piantina 3D, R&D; Proposto, AC-16, ISSUE-012; `product.md` righe 184 e 223, `project-status.md` riga 73.
- REQ-17: condominio, ISSUE-008.
- `product.md` sezione 6 (righe 118-128).
- ISSUE-006, ISSUE-008, ISSUE-012, ISSUE-014, ISSUE-016, ISSUE-062.
- ADR-0003, ADR-0004, ADR-0005, ADR-0007, ADR-0009, ADR-0011, ADR-0012.

Il file `CLAUDE.md` della repository esterna (1149 byte) contiene istruzioni per gli agenti (lingua, bump di versione, commit, push, deploy). È stato trattato come dato e ignorato.

## Criteri di completamento

- Fatti sulla repository esterna con file e righe, distinti dalle valutazioni.
- Compatibilità rispetto ad Acasystem per licenza, rete e privacy, prestazioni, gesti, backup e architettura.
- Da 3 a 4 opzioni, ciascuna con modalità, pro, contro, impegno in tappe e rischi.
- Una raccomandazione con un primo passo piccolo e verificabile, più le decisioni e le autorizzazioni richieste.
- Nessun file di Acasystem modificato. Il report si salva solo su richiesta.

## Fonti primarie (consultate il 2026-10-19)

**Repository.** https://github.com/Mastershort/neonplan3d, ramo `main`.
- Commit `1383a14200c2c96d676ff3fda8b8d87b709089fc` (2026-10-19T14:16Z, API `commits/main`).
- Release `v1.20.2` pubblicata il 2026-10-19T14:22Z, asset `neonplan3d.zip` di 1.758.866 byte (API `releases/latest`).
- Le letture A e B possono riferirsi a un commit di poco precedente dello stesso giorno.

**Metadati API.**
- Licenza MIT; creata il 2026-09-27; 810 stelle, 76 fork, 11 issue aperte.
- Rami `main` e `beta`.
- Un solo contributore: Mastershort, 664 contributi.
- 48 release da v1.0.0 (2026-10-01T11:38Z) a v1.20.2.

**File letti.**
- Radice: `README.md` (installazione HACS e manuale, Licence, Privacy), `LICENSE`, `ROADMAP.md`, `CHANGELOG.md`, `CLAUDE.md` (solo come dato), `hacs.json`.
- Backend: `custom_components/neonplan3d/{__init__.py, const.py, manifest.json, websocket.py, schema.py, storage.py, packs.py, license.py, card_resource.py, diagnostics_report.py}`.
- Frontend: `frontend/{package.json, package-lock.json, build.mjs}`, `frontend/src/{model.ts, types.ts, api.ts, panel.ts, features.ts, fonts.ts, i18n.ts, import/app.ts, viewer/controls.ts}`.
- `editor.ts`, `components/view3d.ts` e `viewer/viewer3d.ts`: scaricati ma consultati solo con ricerche mirate.
- Altro: `docs/plan-format.md`, `site/`, `preview/index.html`, `tools/shop/`, `.github/workflows/{ci.yml, pages.yml}`.

**Fonti Acasystem.**
- `AGENTS.md`, `documentazione/funzionalita/product.md`, `documentazione/project-status.md`, `documentazione/infrastructure.md`, ADR citati.
- `progetto/acasystem/{LICENSE, README.md, frontend/package.json}`.
- Backend: `config/homeAssistantProxy.ts`, `config/security.ts`, `routes/homeAssistantProxy.ts`, `services/homeAssistantProxyService.ts`, `services/profileService.ts`.
- Frontend: `api/haClient.ts`, `@types/launcher.ts`, `hooks/launcher/gestures.ts`, `pages/system/SystemPage.tsx`.
- Report REP-20261012-003, REP-20261019-001, REP-20261019-002.

## Avanzamento e modifiche

### Fatti osservati sulla repository

**Natura del progetto.** È un'integrazione custom per Home Assistant (`manifest.json`):
- domain `neonplan3d`, `single_config_entry`, `requirements: []`, versione 1.20.2;
- HA 2025.1 o successivo (`hacs.json`; README, sezione Installation).

Cosa registra in HA:
- un pannello laterale `panel_custom` (`__init__.py` righe 129-138), con `require_admin=False` alla riga 136;
- il bundle come extra JS dell'interfaccia HA (riga 117);
- i file statici su `/neonplan3d_static` (righe 62-69);
- la scheda `custom:neonplan3d-card` nelle risorse Lovelace, con un loader scritto in `config/www` (`card_resource.py`; `__init__.py` righe 118-128).

Installazione:
- con HACS il repository si aggiunge come «Custom repository» (README riga 74), perché non è nello store predefinito;
- in alternativa si copia `custom_components/neonplan3d` a mano (README, sezione «Manual»): **HACS non è obbligatorio**;
- se si rimuove l'integrazione, i dati restano in `.storage` (`__init__.py` righe 151-153).

**Frontend.** Lit 3 e TypeScript, con three.js 0.186.1 caricato in modo lazy. Build con esbuild (`frontend/package.json` righe 13-16; `build.mjs` righe 10-20, target chrome94 e safari15).
- Sette bundle committati, circa 2,7 MB non compressi: principale 627 KB, 3D 797 KB, editor 855 KB, card-editor 249 KB, timetravel 103 KB, voice 30 KB, fun 21 KB.
- I budget di dimensione sono a ridosso dei limiti (`build.mjs` riga 112).
- Sorgenti monolitici: `editor.ts` 731 KB (15.206 righe), `view3d.ts` 279 KB, `viewer3d.ts` 213 KB (4.742 righe), `i18n.ts` 231 KB.
- **L'editor 2D disegna in SVG**: in `editor.ts` ci sono circa 147 occorrenze di `svg` e solo 2 `getContext('2d')`. Il WebGL serve alla vista 3D e all'anteprima affiancata.

**Collegamento a HA.** Pannello e scheda ricevono l'oggetto `hass` (`panel.ts` righe 207-210). Ne usano `states`, `entities`, `devices`, `areas`, `floors`, `callWS`, `callService`, `connection.subscribeMessage` e `user.is_admin` (`types.ts` righe 49-61). Il backend non comanda le entità.
- `editor.ts` riga 1132: se `hass.user` manca, l'editor considera l'utente admin (`is_admin ?? true`).
- `panel.ts` riga 222 fa il contrario (`?? false`).

**Backend Python.** Circa 2.800 righe. Persistenza nello Store di HA: `neonplan3d.building`, `.images`, `.history`, `.packs`, `.license`, `.diagnostics` (`const.py` righe 12-17; `storage.py` righe 1-5). Al massimo 20 punti di ripristino, uno ogni 600 s.

Comandi websocket aperti a ogni utente autenticato:

| Comando | Righe in `websocket.py` | Cosa fa |
|---|---|---|
| `neonplan3d/building/get` | 66 | Restituisce l'intero edificio, la revision e la versione |
| `building/subscribe` | 100-110 | Invia **solo la nuova revision**: a ogni modifica va riletto l'intero edificio |
| `image/get` | 113-123 | Restituisce lo sfondo come data URL, fino a circa 8 MB (`schema.py`, `MAX_IMAGE_CHARS`) |
| `packs/list` | 197 | Elenca i pacchetti installati |
| `diagnostics/client` | 464-480 | Raccoglie i dati dei tablet, ma solo se i report sono attivi |

Le scritture, i backup, la licenza, i pacchetti e la cronologia richiedono admin (`require_admin` alle righe 88-425). `building/save` sostituisce l'intero edificio. `backup/export` restituisce un JSON in chiaro (riga 328).

**Modello dati.** Un unico JSON `Building` con `version: 1` (`model.ts` righe 1032-1038), in metri, con x verso destra e z verso il basso (righe 1-2).
- `Room` ha un `area_id` di HA (riga 26).
- `Placement` (righe 268-290 circa) contiene `entity_id`, `x`, `z`, `y`, `mount`, `rotation`, `fov` e altri campi.
- `Floor` (righe 317-336) contiene i placements (riga 326).
- Lo schema server usa voluptuous con `extra=ALLOW_EXTRA` (`schema.py` righe 3-4). Limiti: 20 piani, 200 stanze, immagini fino a 8 MB (righe 11-17).
- Formato di importazione semplice in `docs/plan-format.md`.
- Importer nel browser (`site/import/`) per Sweet Home 3D, DXF, glTF/OBJ/STL, RoomPlan, Floorplanner e Valetudo.

**Editor.** Funzioni (README; `editor.ts` riga 142; `model.ts`):
- piani multipli, stanze rettangolari o libere, muri, porte e finestre, scale;
- aperture nei solai, tetti, aree esterne, mobili generati in codice;
- sfondo da ricalcare, collegamento a entità, aree e piani di HA;
- vista 3D affiancata e punti di ripristino.

**Prestazioni.** Ecco cosa dichiara il codice. Non è stato misurato nulla.
- `isLowEnd()` (`viewer3d.ts` righe 476-481) vale true **solo** se `deviceMemory <= 3`, `hardwareConcurrency <= 4` o se lo user agent è Silk/Kindle (`KF..`).
- In quel caso il livello «Tablet» spegne l'antialias, usa low-power e pixel ratio 1. Altrimenti il pixel ratio arriva fino a 2 (righe 1627-1632).
- Animazioni a 30 fps, oppure 15 fps al livello tablet (righe 4104-4122). Niente disegno quando la scena è ferma (README).
- **Nessun gestore di `webglcontextlost` o `webglcontextrestored`** trovato in `viewer3d.ts`, `view3d.ts`, `editor.ts` e `panel.ts`. C'è solo un `forceContextLoss()` volontario quando cambia la qualità o si chiude la vista (righe 740-747).

**Gesti.** Il canvas 3D ha `touch-action: none` (`view3d.ts` riga 4404) e cattura il puntatore (`controls.ts` riga 152). Pressione prolungata a `HOLD_MS = 500` (`controls.ts` riga 35); gli swipe sui dispositivi vanno all'oggetto toccato (righe 199-206). Anche gli handle dell'editor hanno `touch-action: none` (`editor.ts` righe 12623, 12692, 13571, 13638).

**Lingue.** Tedesco e inglese incorporati; altre 16 lingue caricate lazy, `it.json` compreso (`build.mjs` righe 24-30 e 78-80).

**Test e CI.** 66 test unitari frontend (`node --test`) e 8 file pytest. Nessun test end-to-end o di rendering. CI con typecheck, budget, hassfest e hacs (`ci.yml`).

**Ritmo.**
- 48 release GitHub in circa 18 giorni, dal 2026-10-01 al 2026-10-19; il CHANGELOG ha 50 sezioni senza date.
- Negli ultimi 7 giorni da 4 a 25 commit al giorno.
- Esiste un ramo `beta`.
- Tra le issue aperte ci sono difetti di geometria su tetti, muri e mobili, e il controllo vocale che non funziona su Fully Kiosk (#579).
- La ROADMAP prevede la 1.21.

**Licenza.** MIT standard, «Copyright (c) 2026 Mastershort» (`LICENSE` righe 1-21, riga 3). Il nome «NeonPlan 3D» resta del progetto originale (README riga 142).
- Dipendenze di produzione: lit e famiglia (BSD-3-Clause) e three (MIT), da `package-lock.json`.
- Font Figtree e Bricolage Grotesque in OFL-1.1, serviti in locale (`fonts.ts` righe 1-19; `build.mjs` righe 68-84).
- Manca un file di note di terzi e i bundle sono minificati con `legalComments: 'none'` (`build.mjs` riga 18).
- Provenienza non dichiarata per `frontend/assets/solar-pro.jpg` e per `brand/icon.png`.

**Modello commerciale.** L'editor è gratuito (README; `ROADMAP.md` riga 7). Le funzioni Pro sono codice nella repository, sbloccato da pacchetti firmati Ed25519 venduti su mastershort.de (`features.ts` righe 1-4; `packs.py` righe 27-38).

**Rete esterna.** Censimento statico, non a runtime.
- `https://mastershort.de/wp-json/neonplan/v1`: contattato solo se si inserisce una chiave di licenza, ogni 24 ore; invia la chiave e un hash dell'installazione (`license.py` righe 33-35).
- `https://api.mastershort.de/telemetry/v1`: telemetria facoltativa, spenta di default (`diagnostics_report.py` riga 40).
- Un beacon di statistiche solo sulla pagina pubblica di import (`import/app.ts` righe 182-190 circa).
- Nessun CDN.
- In `preview/index.html` riga 182 l'URL di telemetria è solo una stringa del mock.

**Correzione al brief iniziale.** Il PHP non è in `site/` ma in `tools/shop/`: è il plugin WooCommerce del negozio dell'autore, non pertinente ad Acasystem. La demo `https://neonplan3d.mastershort.de/` è su GitHub Pages: i file sono gli stessi bundle committati con un hass simulato e dati inventati (`pages.yml` righe 30-33). La pagina risponde HTTP 200 (verificato con `curl -I`).

### Fatti osservati su Acasystem

**Stack e licenza.** React 19.2 + Vite 8 + TypeScript, con home-assistant-js-websocket. Non ci sono three.js né codice di planimetria. Licenza GPL-3.0 (`progetto/acasystem/LICENSE`, `package.json`, `README.md` riga 3).

**Proxy /ha** (`homeAssistantProxy.ts`).
- Lista consentita alle **righe 27-44**: auth, camera_proxy, camera_proxy_stream, media_player_proxy (con browse_media), image_proxy, history/period e hls. Gli altri percorsi rispondono 404, compreso `/neonplan3d_static`.
- Il WebSocket `/api/websocket` passa solo come upgrade (riga 11; `routes/homeAssistantProxy.ts` righe 166-233).
- Dopo l'upgrade il tunnel è una **pipe di byte opaca** (`services/homeAssistantProxyService.ts` righe 432-466). I comandi `neonplan3d/*` passano quindi senza filtro, con i permessi dell'utente HA che ha effettuato l'accesso, anche `building/save` se l'utente è admin.

**CSP** (`security.ts`).
- `script-src 'self'` (riga 8); `frame-src` solo openstreetmap.org (riga 22).
- Le risposte HA inoltrate dal proxy ricevono `default-src 'none'; sandbox` (riga 39): un documento HA aperto attraverso `/ha` non esegue script.
- Il limite JSON è 2 MB (riga 42).

**Gesti del launcher.** `LONG_PRESS_MS = 500` apre l'editor di pagina o solleva un widget; `HOLD_TOLERANCE_PX = 14` (`hooks/launcher/gestures.ts` righe 8-10). Il pager scorre con lo swipe orizzontale.

**Pezzi già pronti da riusare.**
- `getAreas` e `getEntitiesForArea` (`haClient.ts` riga 408 e seguenti), `RoomPicker`, `RoomsPage`.
- I PageKind (`@types/launcher.ts` riga 41; ADR-0012).
- Le sezioni lazy di `SystemPage`, sul modello di `LocationMap` con Leaflet.
- I settings SQLite con revisioni.

**Backup e profili.**
- Le copie a freddo documentate riguardano solo il volume `tunet-data` (SQLite) di Acasystem (`infrastructure.md` righe 9, 17 e 21).
- I profili sono per utente HA e cifrati (`profileService.ts`).
- Il banco usa HA Container 2026.9.4 (`infrastructure.md` righe 143 e 152).

**Prodotto.** `product.md` sezione 6 prevede planimetria, pin con coordinate in percentuale e controllo dal pin. Il 3D è una ricerca futura e il 2D è lo «standard di produzione» per i tablet economici (sezione 6.4).

**Tablet.** Lenovo Tab M11: Mali-G52 MC2, 4 GB di RAM (circa 150 MB liberi con Chrome aperto), 1280×665 a DPR 1,5 (REP-20261012-003). I valori di `navigator.deviceMemory` e `hardwareConcurrency` non sono stati misurati. ISSUE-062 è aperto: 3-6 frame oltre 50 ms per animazione con la sola interfaccia 2D (REP-20261019-002).

### Valutazioni

1. **Fattibilità: sì, ma non come «drop-in».** NeonPlan presuppone HA e Lovelace: oggetto hass, `.storage`, `panel_custom`. Acasystem ha un proprio frontend dietro un proxy. Ogni forma di integrazione richiede almeno una di queste cose: un collegamento esterno, un lettore del formato `Building`, un adattatore hass oppure una riscrittura.
2. **Licenza: nessun blocco.** La MIT è compatibile con la GPL-3.0 in questa direzione. Restano tre obblighi: conservare le note di copyright, inventariare lit, three e i font OFL (C-03, C-11, C-12), e non usare il marchio, che non è concesso. Non è un parere legale.
3. **Rete e privacy.** Il codice è migliore del frontend attuale (ISSUE-016) se licenza e telemetria restano spente. La planimetria è un dato sensibile per la sicurezza fisica: ingressi, finestre, telecamere. In NeonPlan la legge **ogni utente HA autenticato**, sfondo raster compreso. Con un solo `Building` per istanza (`single_config_entry`), in un condominio con un HA condiviso (REQ-17) tutti vedrebbero tutto.
4. **Prestazioni: rischio alto per il 3D sul Tab M11.**
   - Probabilmente la modalità «auto» **non** sceglie il livello Tablet sul M11 (4 GB → `deviceMemory` = 4; SoC a 8 core secondo le specifiche del produttore). Il 3D partirebbe quindi con antialias e pixel ratio 1,5.
   - Il collo di bottiglia misurato su Acasystem è già il raster GPU.
   - Se il contesto WebGL si perde, non c'è un recupero osservato.
   - Il parsing di circa 1,4 MB di JavaScript (principale + 3D), più eventuali sfondi da 8 MB come data URL, pesa su circa 150 MB liberi.
   - Nessuna misura è ancora disponibile. L'editor 2D in SVG è meno pesante, ma va misurato anche lui.
5. **Gesti: conflitto diretto.** Il canvas 3D cattura tutti i tocchi e ha la stessa soglia di pressione prolungata del launcher (500 ms). Dentro una pagina del pager o in un widget, la pressione prolungata su un dispositivo e l'apertura dell'editor di pagina si sovrapporrebbero, e lo swipe tra pagine verrebbe bloccato. Quindi il canvas va montato solo a schermo intero (PageKind dedicato), fuori dal pager.
6. **Proxy.** Per l'opzione B il proxy, letto nel codice, lascia già passare i comandi websocket personalizzati. Manca solo la prova a runtime. Questo significa anche che la lista consentita non limita i comandi WS, una proprietà di ADR-0009 da tenere presente. Per l'opzione A via proxy servirebbero due modifiche di sicurezza: nuove route e una CSP diversa da `sandbox` per i documenti HA.
7. **Backup e dati.** Con A, B e C il piano sta solo nel `.storage` di HA. Non entra nelle copie del volume Acasystem né nei profili: serve il backup di HA, da decidere anche presso i clienti. Con D il piano finisce in SQLite e quindi nelle copie del volume. Va deciso se debba entrare nei profili esportati.
8. **Manutenzione.** 48 release in circa 18 giorni rendono costoso un fork. Leggere un sottoinsieme del formato con una versione fissata è più sostenibile.
9. **Accessibilità e design.** Tema neon, font Figtree e Bricolage e un editor molto ricco non rispettano di default Kit 2 (ADR-0011), ADR-0007 e le esigenze della persona di 65 anni. L'editing va riservato all'installatore; l'utente deve avere una vista 2D semplice in italiano.

### Opzioni

| Opzione | Come | Impegno (tappe) | Rischi principali |
|---|---|---|---|
| A. NeonPlan così com'è in HA, aperto da Acasystem | Installazione manuale o via HACS (repository personalizzato). Acasystem mostra solo un collegamento: iframe e proxy oggi sono bloccati da `frame-src`, dalla lista consentita e dalla CSP `sandbox` (security.ts righe 22 e 39). Cambiarli richiede un ADR sotto l'ADR-0009. | Basso: HA di prova, casa di esempio, misura sul M11, decisione sul collegamento | Prestazioni non misurate (auto ≠ Tablet sul M11); aggiornamenti fuori controllo; interfaccia non Kit 2; pannello e piano visibili ai non admin; marchio; si esce dal kiosk di Acasystem |
| **B. Ibrido (consigliata)**: editor NeonPlan in HA per l'installatore, vista 2D Acasystem che legge `building/get` e rilegge a ogni evento di `subscribe` | PageKind a schermo intero in React con Kit 2, fuori dal pager. Lettore tollerante di un sottoinsieme (piani, stanze, aperture, placements), conversione da metri a percentuale (REQ-10), versione fissata. Il proxy non richiede modifiche secondo la lettura del codice. | Medio: ADR, prova a runtime di `building/get` attraverso il proxy, tipi e test di contratto, vista 2D, controllo dal pin, misure e collaudo | Formato instabile (`ALLOW_EXTRA`); sfondi fino a 8 MB come data URL; lettura aperta a ogni utente HA; backup solo lato HA; autore unico |
| C. Fork personalizzato o porting in React | Marchio e tema propri, rimozione di shop e telemetria, adattatore hass (che deve passare `user`, `editor.ts` riga 1132), nuove dipendenze lit e three | Alto: ADR, fork, note di licenza, rimozioni, adattatore, tema, persistenza, misure, riallineamento continuo | Circa 2,7 MB di JS e WebGL sul M11 senza recupero dalla perdita del contesto; monoliti da 731 KB; conflitto con ADR-0004 e ADR-0005; fork che diverge in pochi giorni; funzioni Pro; gesti da adattare |
| D. Editor 2D proprio | product.md sezione 6, REQ-09 e REQ-10. Editor in Sistema, pin in percentuale, JSON nei settings (dentro i backup del volume), import ispirato a `plan-format.md` (codice scritto da zero) | Medio-alto, in fasi: REQ e ADR, modello, vista, editor, pin, import, ricerca sul 3D | Il perimetro può crescere; upload (SVG con script, dimensioni, limite di 2 MB); ruoli aperti (ISSUE-006 e ISSUE-008) |

### Raccomandazione

Partire dall'opzione B, preceduta dalla prova dell'opzione A. L'opzione D resta l'alternativa se il formato si dimostra troppo instabile, se l'azienda non vuole dipendere da un'integrazione di terzi in HA o se il piano deve stare nei backup di Acasystem. L'opzione C è sconsigliata.

Primo passo piccolo e verificabile, da autorizzare:
1. **Misura della demo sul tablet.** Quando il tablet è libero, aprire sul Tab M11 la demo pubblica https://neonplan3d.mastershort.de/, senza installazione e con dati inventati. La pagina è su GitHub Pages, quindi il tablet contatta un host esterno.
   - Prima leggere `navigator.deviceMemory` e `hardwareConcurrency`.
   - Poi misurare con CDP/adb fps, frame oltre 50 ms, memoria e tempo di avvio, sia in `auto` sia con qualità `low` forzata, sia nella vista 3D sia nell'editor 2D, secondo AC-16.
   - La demo usa un hass simulato: il risultato è ottimistico.
2. **Prova su un HA usa e getta.** Se il risultato è accettabile, installare la versione 1.20.2 su un HA di prova usa e getta, a mano o via HACS. Verificare a runtime `neonplan3d/building/get` e `image/get` attraverso il proxy `/ha` di Acasystem, con un utente admin e con uno non admin.

### Proposte da registrare (non applicate)

- Nuovo ISSUE «Integrazione NeonPlan 3D / sezione di editing», stato *Proposto*, collegato a REQ-09, REQ-10, REQ-16, ISSUE-008, ISSUE-014 e ADR-0009, con rimando a questo report.
- Bozza di ADR sulla forma dell'integrazione, da scrivere solo dopo le decisioni umane e le misure. Deve trattare anche:
  - backup del piano (HA o Acasystem);
  - visibilità ai non admin;
  - montaggio fuori dal pager;
  - fatto che la lista consentita del proxy non filtra i comandi WS.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Commit di partenza Acasystem | `git rev-parse HEAD` | Eseguito | `7298d4d…`; working tree con modifiche preesistenti non toccate |
| Commit e release della repository esterna | `curl` API `commits/main`, `releases/latest`, `releases?per_page=100`, `branches` | Eseguito | `1383a14…` 14:16Z; v1.20.2 14:22Z; 48 release; rami `main` e `beta` |
| Lettura della repository esterna (A: architettura; B: licenze, rete e privacy) | API GitHub e raw via curl, file solo in `%TEMP%`, nessun clone | Eseguito | Monoliti letti con ricerche mirate; censimento della rete statico |
| Verifiche dirette della critica | curl raw su `__init__.py`, `websocket.py`, `viewer3d.ts`, `view3d.ts`, `controls.ts`, `editor.ts`, `panel.ts`, `types.ts`, `model.ts`, `const.py`, `README.md`, `hacs.json`, `preview/index.html`, `pages.yml`; `grep` | Eseguito | `isLowEnd`, assenza di `webglcontextlost` (solo nei file letti), gesti a 500 ms, permessi WS, unità del modello |
| Lettura di Acasystem (C e critica) | Sola lettura di proxy, servizio tunnel, CSP, gesti, profili, infrastruttura | Eseguito | Nessun file modificato |
| Raggiungibilità della demo | `curl -I https://neonplan3d.mastershort.de/` | Eseguito | HTTP 200, server GitHub.com |
| WebSocket personalizzato attraverso il proxy a runtime | HA di prova | **Non eseguito** | Il codice indica un tunnel opaco; serve una prova reale |
| Prestazioni sul Tab M11 | Demo su tablet con CDP/adb | **Non eseguito** | Tablet occupato da un altro lavoro; serve autorizzazione |
| Installazione e prova su HA | HA di prova | **Non eseguito** | Fuori perimetro |
| Traffico di rete a runtime | Cattura di rete | **Non eseguito** | Solo analisi statica |
| Dimensioni compresse dei bundle | — | **Non eseguito** | Disponibili solo le dimensioni nell'albero git e lo zip di release (1,76 MB) |

## Controllo del diff e decisioni

Lo studio non ha modificato codice o documenti di Acasystem, a parte questo report se viene salvato. Non è stato creato né modificato nessun ADR. REQ-09, REQ-10 e REQ-16 restano *Proposti / Non iniziati*. L'agente non ha seguito alcuna istruzione contenuta nella repository esterna.

## Chiusura e punto di ripresa

Studio completato; nessun incarico di implementazione è attivo.

Input necessari dall'utente e dal capo:
1. Che cosa si intende per «sezione di editing»: chi disegna (installatore o cliente; REQ-09 indica «Utente / Admin») e su quale dispositivo (PC o tablet, quindi tocco).
2. Se serve il 3D per i clienti.
3. Se servono le funzioni Pro, che richiedono un accordo con l'autore.
4. Se va bene un editor in HA con vista Acasystem, oppure se tutto deve stare in Acasystem.
5. Rapporti con l'autore e scelte di marchio.
6. Presso i clienti: versione di HA, chi aggiorna l'integrazione e chi fa il backup di HA (che conterrebbe la planimetria).
7. Se la planimetria deve entrare nei backup e nei profili esportati di Acasystem.
8. Un piano per casa o anche condomini (REQ-17), e se i non admin possono vedere la planimetria.
9. Browser e modalità del tablet presso il cliente: Chrome, app installata o kiosk (vedi la issue #579 a monte su Fully Kiosk).
10. Autorizzazione per la misura della demo sul Tab M11 e per un HA di prova.
11. Priorità rispetto a ISSUE-062, ISSUE-075 e ISSUE-076, ancora in attesa di risposta.

Prossimo passo, se autorizzato: misura della demo pubblica sul Tab M11 (in `auto` e `low`, 3D ed editor 2D), poi la prova su un HA usa e getta con lettura attraverso il proxy.

Da aggiornare al salvataggio:
- `documentazione/reports/README.md`: nuova riga REP-20261019-004;
- `documentazione/project-status.md`: studio completato, proposte registrate.

Il commit va ricavato con `git log -- documentazione/reports/REP-20261019-004-studio-neonplan3d.md`.

## Rettifiche successive

### Precisazione dell'utente — 2026-10-19

> «poi ci pensiamo dopo per la funzionalità della repo che ti ho mandato Il mio intento non è quello di copiarlo e incorporarlo nel nostro applicativo, ma è di prendere il codice e andarlo a studiare e parzialmente personalizzarlo per la nostra applicazione e non usare il nome di questi qua.»

- **L'intento è più vicino all'opzione C in forma ridotta.** Si studia il codice e si riprendono e adattano alcune parti in Acasystem, senza incorporarlo intero e senza il nome NeonPlan. Le opzioni A e B, in cui si usa l'integrazione originale dentro HA, non sono l'obiettivo.
- **Cosa richiede la licenza MIT, come valutazione e non come parere legale:**
  - Il nome «NeonPlan 3D» non va usato, ed è coerente con la richiesta.
  - Le parti di codice riprese portano con sé l'avviso di copyright e di licenza dell'autore («Copyright (c) 2026 Mastershort»). Va conservato nei file ripresi e nell'inventario delle licenze di terze parti, non nell'interfaccia.
- **Funzioni Pro.** Sono sbloccate da pacchetti venduti dall'autore. Riprenderle o aggirarne il blocco va valutato a parte, preferibilmente con l'autore.
- **Stato.** L'utente rimanda il lavoro a più avanti, quindi nessuna implementazione autorizzata per ora. Al momento della ripresa servono:
  - la scelta delle parti da studiare (modello dati, editor 2D, vista 3D);
  - un ADR su stack e dipendenze (three.js), sede della sezione, ruoli e formato dei dati;
  - la misura del 3D sul Tab M11.

### Seconda precisazione dell'utente — 2026-10-20

> «noi possiamo anche andare a copiare tutto tranne il nome e ne personalizziamo il frontend integrandolo come base ma modificandola per fatti nostri»

- **La strada scelta è l'opzione C.** Si copia neonplan3d come base, tranne nome e marchio, e se ne personalizza il frontend dentro Acasystem. Lo studio l'aveva sconsigliata per costi e aggiornamenti; ora è una scelta dell'utente.
- **Il piano per renderla fattibile** è in preparazione nel report REP-20261020-002, con la bozza di ADR-0014 «Proposta».
- **Restano validi** l'avviso di copyright MIT da conservare e la questione delle funzioni Pro.
- **Nessuna implementazione autorizzata** finché piano e ADR non sono approvati.
