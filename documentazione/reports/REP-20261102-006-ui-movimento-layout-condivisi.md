# Componenti UI, movimento e layout condivisi

| Campo | Valore |
|---|---|
| ID | REP-20261102-006 |
| Stato | Completato localmente; limiti di collaudo e pubblicazione distinti |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit locale di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | U44: «io condividerei tutto per snellire il progetto della webapp, ma lascio a te valutazione rischi e pericoli»; segue U43 sulla copertura di popup, animazioni e layout |

## Obiettivo e perimetro

Estendere il design CSS comune di U42 con un livello UI riusabile fuori dal frontend: primitive React, popup/finestre, movimento/presenza, toast, layout a slot e navigazione grafica generica. Riutilizzare dipendenze/contratti esistenti, preservando aspetto, interazioni e accessibilità. La valutazione umana delegata consente di conservare nella webapp composizioni e controller legati a dispositivi/configurazione/Home Assistant; trasferirli nel livello comune creerebbe dipendenze inverse.

Fonte prevista `progetto/acasystem/ui/`, nello stesso contesto Docker/sorgenti di design. Unica istanza di React/context/singleton di scroll e transizioni; vecchi percorsi come re-export, senza duplicare l'implementazione. CSS dei layout estratti nel design condiviso, importato in ordine compatibile. Interfacce HTML semplici continuano a usare il CSS senza ricevere React obbligatoriamente. Nessuna migrazione di piattaforma, aggiornamento dipendenze, nuova funzione/applicazione, installazione, avvio VM, pubblicazione o commit locale assegnati.

Molte modifiche precedenti tracked/untracked sono presenti e vanno preservate. Checkpoint mirato di src/design/configurazioni e build prima delle modifiche in backup/rep016, escluso da Git.

## Criteri di completamento

1. Moduli UI condivisi senza import di frontend, API/HA, account, storage della casa o widget business. Entrypoint chiari, React unico e nessuna nuova dipendenza.
2. Popup, focus/Escape/back, blocco scroll annidato, presenza/uscita, toast e layout mantengono comportamenti esistenti; singleton/context rimangono unici anche tramite import storici.
3. Layout generici e relativi CSS condivisi; composizioni di pagina/controller applicativi lasciati nel frontend. Uso autonomo delle primitive/layout senza Tailwind dove necessario.
4. Controllo strict della UI anche autonomo, build frontend/Docker e controlli pertinenti; regressioni e prova browser delle interazioni/movimento/layout. Valutare dimensione dei bundle senza promettere riduzioni automatiche.
5. Documentazione, fonte umana, rischi residui e uso aggiornati; artefatti di verifica locali distinti dalle release precedenti.

## Avanzamento e valutazione dei rischi

Audit readonly:45 moduli delle primitive, dipendenze solo React/ReactDOM/mx-icons, nessuna HA. Motion DOM, presence, scroll-lock e useLeaving sono generici ma vanno mossi come un'unica chiusura. ToastProvider è generico; i tipi oggi in dashboard sono da separare con re-export compatibile. AppShell e PageIndicator sono a slot/props; Pager richiede insieme hook gestuali/stage/context e CSS, con rischio maggiore su swipe/drag/viewport. PageShell/WidgetGrid/PageKindHost e useResponsiveGrid dipendono da modelli/config dell'app: restano adapter/composizioni applicative.

Rischi concreti: doppie copie di React o context, dipendenze circolari/di dominio, perdita dello scan Tailwind dopo il move, variazioni del cascade CSS, focus/scroll durante chiusura e tempi CSS/JS divergenti. Contromisure: moduli canonici e shim, strict/boundary check, CSS di layout autonomo, confronto prima/dopo e regressioni dedicate. Lo spostamento semplifica manutenzione/riuso; peso del download da misurare.

## Verifiche ed evidenze

### Modifiche effettive

- `ui/primitives`: 45 moduli canonici; i percorsi precedenti sono re-export. Materiali, controlli, tipografia, popup, focus, scroll e movimento conservano le API. Grid/Flex e Field/Skeleton aggiungono classi ACA autonome mantenendo quelle precedenti; CSS in `design/layout/primitives.css`.
- `ui/layout` e `ui/navigation`: AppShell/footerBand, Pager/PageIndicator e chiusura dei relativi hook/context/gesture/stage. Tredici moduli trasferiti con soli adattamenti degli import; tre CSS spostati byte-identici. `ui/pager.css` è un ingresso separato per lo stile del Pager.
- `ui/toast` e `ui/hooks/useLeaving`: provider/host, tipi separati da dashboard e presenza in uscita. Coda max3, permanenza4000ms e uscita160ms preservate; offset CSS parametrizzabile con fallback precedente5.5rem. Tipi dashboard e percorsi precedenti riesportano le fonti canoniche.
- Ingressi `ui/index.ts`, `ui/motion.ts`, `ui/styles.css`; strict autonomo, dichiarazione import CSS e controlli di confine. Vite deduplica React/ReactDOM, Tailwind include ui/, Docker copia ui/ prima della build. Copier design esteso a components/layout. Nessun nuovo workspace, dipendenza o lockfile aggiornato per U44.
- Lint e scanner CSS aggiornati alle fonti canoniche, mantenendo le restrizioni esistenti; letture filesystem dei test seguono i CSS trasferiti. Gli shim non duplicano le definizioni. PageShell/WidgetGrid/controller e composizioni della casa rimangono nel frontend.
- Documentazione d'uso e [ADR-0033](../decisions/ADR-0033-ui-movimento-layout-condivisi.md), stato e indici aggiornati. Checkpoint iniziale955file in backup/rep016/before-manifest.json. Manifest primitives-move/audit, layout-move e toast-extraction documentano equivalenza e differenze ammesse.

### Controlli e build

| Controllo / comando | Esito ed evidenza |
|---|---|
| `npm run typecheck:ui` da acasystem | PASS, UI strict senza estendere il frontend. La prima esecuzione rilevava le dichiarazioni CSS mancanti, poi aggiunte. |
| `npm run test:ui` | 3/3: import inclusi tipi senza dipendenze frontend, identica risoluzione React/ReactDOM, bundle autonomo degli entrypoint. Corretto un falso positivo del primo scanner sulle stringhe, poi PASS. |
| `node --test design/copy-assets.test.mjs` | 1/1, tutti gli import CSS/font distribuiti risolti anche in directory con spazi. |
| `npm run test -- src/__tests__/SharedUiBoundary.test.ts` dal frontend | 3/3, identità delle primitive, provider/context/stage, epoch di resize e coordinatori motion tramite import storici/canonici. |
| Vitest, gruppo primitive | 10file/118test PASS; primitives-tests.log. |
| Vitest, gruppi navigazione e CSS/layout | 10file/309test e14file/436test PASS; layout-navigation-tests.log e layout-css-tests.log. |
| Vitest, SheetSystemChoreography e MotionChoreographyBlock2 | 2file/50test PASS; toast-motion-tests.log. I gruppi hanno sovrapposizioni, non sono un totale deduplicato. |
| Vitest StyleInvalidation0928 dopo estensione a tutto design | 1file/7test PASS; style-invalidation-test.log. |
| ESLint frontend e UI; tipografia; colori | PASS:586file senza errori/avvisi,654file tipografia e576file colori senza violazioni. Import sentinella in memoria conferma no-restricted-imports. lint-verification.md e log. |
| `ACASYSTEM_VERSION=0.9.33 npm run build -w frontend` (variabile impostata con PowerShell) | Strict e build PASS; frontend-build.log. Resta l'avviso di chunk oltre500kB già presente, nessuna modifica del code splitting assegnata. |
| `npm run build -w casa3d` | Strict/marchio/build PASS, sei bundle nei budget; casa3d-build.log. |
| `npm run build -w windows`, `npm run build -w android` dal client | PASS: shell Windows e web Android con nuovi asset generati; windows-build.log/android-build.log. Non è packaging ZIP/APK. |
| `docker build --build-arg ACASYSTEM_VERSION=0.9.33 -t aca-system:ui-shared-local .` | PASS; docker-build.log. Digest sha256:d3772ac6c4b07749062e545115ce3eb199cbf0bf5bc2cb8008864c8787978053. Immagine non avviata/pubblicata. |

I log sono in backup/rep016, esclusi da Git. Non sono state eseguite suite backend o l'intera suite applicativa: nessuna modifica backend assegnata; regressioni mirate alla porzione estratta. ZIP/APK U42 conservati, non ricompilati per questa estrazione del frontend.

### Banco browser e confronto prima/dopo

`node backup/rep016/shared-ui-qa/run.mjs`: harness reale React/Electron, import solo ui/ e ui/styles.css, nessun frontend/Tailwind/API. Desktop1280x800 chiaro con movimento normale e telefono390x844 scuro con movimento ridotto. Verificati Grid/Flex/hidden, font Inter/overflow, Sheet con focus sul campo, conferma annidata e Tab, Escape solo sul popup superiore, ritorno focus e scroll lock fino all'ultima chiusura, conferma/annulla, Console con history.back/Escape e ripristino URL, toast max3/scadenza. PASS, otto screenshot e result.json in shared-ui-qa/evidence, zero pageerror/console.error/richieste API. Screenshot esaminati; non è una certificazione completa di accessibilità o prestazioni touch.

`node backup/rep016/web-visual.mjs baseline` e `current`: stato iniziale owner-required simulato in sola lettura, nessun account o connessione HA. Quattro viste (chiaro/scuro×desktop/telefono): stili e PNG prima/dopo byte-identici. Nel primo tentativo il resize Electron asincrono rendeva instabili le dimensioni; harness corretto con viewport attesa esplicitamente, confronto ripetuto riuscito. Risultati in web-baseline/web-current e bundle-and-visual.json.

| Tutti i chunk generati | Prima byte | Dopo byte | Prima gzip | Dopo gzip |
|---|---:|---:|---:|---:|
| JavaScript,50file | 2349225 | 2349315 | 721078 | 720962 |
| CSS,14file | 243483 | 244479 | 51079 | 51207 |
| Totale | 2592708 | 2593794 | 772157 | 772169 |

Gzip calcolato per ciascun file, poi sommato: +12byte complessivi, peso praticamente invariato. Non rappresenta il traffico di un solo avvio o una misura di velocità. La semplificazione è nella fonte e nel riuso: non è stata dichiarata una riduzione del download.

Confronto dei sorgenti frontend di produzione JS/TS/CSS, esclusi i test:104275→95974righe (−8301), stesso numero630file grazie agli shim. Codice trasferito in ui/design, non eliminato dal runtime. Revisione statica finale in final-static-review.json:1264collegamenti locali controllati, unico mancante il riferimento preesistente LEGGIMI→WidgetTray.tsx, nessun nuovo collegamento rotto rilevato. Diff mirato senza errori di whitespace. Il runner lint inoltra le opzioni CLI e normalizza i percorsi frontend; `--max-warnings=0` e percorsi aggiuntivi verificati senza usare `--fix` sull'albero sporco.

## Chiusura e punto di ripresa

I cinque criteri sono soddisfatti nel perimetro locale: UI indipendente, istanze compatibili, layout/CSS condivisi, controlli e build pertinenti, documentazione e rischi aggiornati. Revisione indipendente dell'integrazione senza problemi concreti rilevati. Nessun commit/deploy, nuova dipendenza, avvio VM o installazione host/dispositivo eseguiti. Sorgenti e modifiche precedenti preservati; HEAD rimane5c321b9.

Limiti: prove Android/iPhone fisici, prestazioni touch e collaudo di ogni schermata non eseguiti; contesti DOM/browser, non React Native o SSR universale. Una futura modifica comune va verificata sui consumatori interessati. Le release0.9.33/r2 e ZIP/APK U42 restano quelle precedenti; la nuova immagine è solo locale. La schermata grafica boot HAOS non è parte di U44. Prossimo incarico dalle istruzioni dell'utente, senza pubblicazione automatica.
