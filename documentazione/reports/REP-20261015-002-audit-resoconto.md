# REP-20261015-002 — Verifica indipendente del resoconto del 15 ottobre

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261015-002 |
| Stato | Completato: audit con regressioni confermate; correzioni non assegnate. |
| Data | 2026-10-15, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` |
| Richiesta di riferimento | «Leggi la documentazione acasystem e il resoconto di oggi e verifica il lavoro», con resoconto allegato alla richiesta. |
| Autorizzazione | Lettura, audit del codice e delle evidenze, controlli pertinenti e registrazione degli esiti. Nessuna correzione applicativa, distribuzione, aggiornamento dipendenze o commit. |

## Obiettivo e perimetro

Confrontare il resoconto allegato e REP-20261015-001 con documentazione, codice effettivo, verifiche ripetibili e banco locale osservabile. Approfondire celle libere e animazioni, pressione prolungata, accesso e integrazione adattiva HA presente nei sorgenti. Distinguere risultati confermati, regressioni, dichiarazioni non dimostrate e proposte ancora da approvare.

Working tree iniziale: 205 file tracciati modificati, 4 eliminati e 137 voci non tracciate. Tutto preesistente; nessuna attribuzione automatica alla giornata corrente. Impronte SHA-256 dei file modificati/non tracciati esistenti salvate in una fotografia temporanea fuori repository per controllare la preservazione. Nessun grafo graphify preesistente: lettura diretta, senza installare strumenti o generare un grafo estraneo all'incarico.

## Criteri di completamento

- Confronto esplicito tra dichiarazioni e file effettivi, con riferimenti riproducibili.
- Esecuzione delle suite e dei controlli appropriati con massimo quattro worker, senza browser simultanei.
- Ispezione del banco senza modificare container, dati, sessioni o dispositivi.
- Registrazione di rilievi, esiti, limiti e punto di ripresa; aggiornamento di indice, stato e verifiche senza cancellare lo storico.
- Preservazione dei file applicativi e delle modifiche precedenti.

## Avanzamento e modifiche

Letti AGENTS, indice documentale, passaggio di consegne, stato, PRD e pilota nelle parti pertinenti, design, architettura, ADR-0004/0005, infrastruttura, confini di conformità, verifiche, report odierno e strumenti locali citati. Esaminati i sorgenti effettivamente usati, comprese le nuove copie sotto `components/widgets/adaptive/`, distinte dai componenti della galleria.

**Esito:** pressione prolungata e pulsante password confermati; suite esistente e controlli principali superati. L'integrazione adattiva HA contiene regressioni riproducibili e non può essere dichiarata verificata nel suo complesso. La soluzione definitiva di ISSUE-062 non è dimostrata dalle evidenze disponibili.

### Riscontri sul resoconto

| Affermazione | Riscontro indipendente |
|---|---|
| Pressione a 500 ms, tolleranza 14 px, feedback dopo 60 ms | Confermata in `gestures.ts` e `launcher.css`; i test gesti/drag/schermata sono inclusi nella suite completa superata. Non ripetuta la prova percettiva col dito. La conversione in millimetri e l'attribuzione dei ritardi al tremore restano ipotesi, senza tracce del tocco a sostegno. |
| Mostra/nascondi password | Confermato in LoginForm/Field e nel test dedicato di `HaAccessPage.test.tsx:239`. Gli export reali sono `EyeLinear`/`EyeSlashLinear`, anziché i nomi riportati nel testo incollato. Autofill presente nel CSS; non ripetuta una sessione reale con gestore password. |
| Fade celle e materiale morbido a riposo | Confermati: opacity 180/240 ms, visibility differita, will-change; settling tramite requestIdleCallback con timeout 100 ms e fallback 60 ms. Il report 001 descrive anche varianti precedenti con bordo tratteggiato e display:none, assenti nella soluzione finale. |
| «Nessun frame drop» / ISSUE-062 risolto | Non dimostrato. La tabella della variante `applied` nel report 001 riporta ancora 4–5 frame oltre 50 ms e picchi fino a 222 ms. `measure-ov.cjs` definisce `applied` con bordo tratteggiato e display:none: misura una variante diversa dal fade finale. `verify-fade-tablet.cjs` legge gli stili, senza misurare i frame. `LagLayers` verifica testo CSS, non prestazioni GPU. Non effettuata una nuova misura sul M11. |
| ISSUE-064 e Multimedia/Sonos ancora proposti | Contraddetto dai sorgenti e dal report 001: il percorso adattivo HA è attivo per 15 tipi associati; PlayerView differenzia music/speaker. Le approvazioni successive sono affermate nel report, ma il materiale fornito non permette di ricostruire autonomamente tutte le conferme umane. Nessuna conclusione automatica di lavoro non autorizzato. |
| Tutte le fasi del piano kit-HA completate e verificate | Non confermabile come copertura operativa: regressioni sotto, dettagli/configurazione non collegati nel nuovo componente, storici incompleti e controlli non supportati. I test esistenti non coprono questi percorsi; un test del resolver si aspetta persino il servizio volume errato. |
| TalkBack, font 150%, PWA | Disponibili script e screenshot storici. Lo script legge AXTree e conta etichette con una propria euristica DOM: non attiva né percorre TalkBack; ignora inoltre i label HTML nel conteggio, mentre Field possiede un label associato. Cambiare font_scale senza confronto e asserzione delle dimensioni effettive non dimostra l'ingrandimento del testo web. La rotazione non verifica display-mode standalone. Prove umane e PWA effettiva restano non eseguite in questo audit. |
| Bundle distribuiti | Confermati via HTTP e SHA-256 nel container; dettagli sotto. La versione resta 0.9.9, con filesystem del container modificato rispetto all'immagine. |

### Rilievi applicativi

Le otto sonde usano fixture locali e mock di callService: nessun comando è stato inviato a dispositivi fisici. Sono conservate sotto `backup/audit-20261015/`, escluse da Git, con configurazione separata dalla suite del prodotto.

1. **[P1] Serrature: perse conferma e gestione codice — ISSUE-065.** `components/widgets/adaptive/AdaptiveCategoryWidget.tsx:90` invia direttamente il toggle a `resolveHaService`; non riusa `useLockControl.ts:73`, che richiede secondo tocco e codice quando previsto. Riprodotto con connessione fittizia presente e serratura che richiede codice: al primo tocco parte `lock.unlock` senza codice. Non implica che HA aggiri i propri controlli: cambia il flusso ACA, e il comando può essere rifiutato oppure sbloccare subito una serratura senza codice.
2. **[P1] Invii gestuali senza limite e duplicati — ISSUE-066.** `AdaptiveCategoryWidget.tsx:44` collega sia onChange sia onCommit alla funzione che invia il servizio (`:184`), ignorando phase. Il throttle di GestureControl riguarda solo onCommit. Riprodotti **11 invii per 10 movimenti nella stessa finestra** e **2 invii per una freccia da tastiera**. Anche annullamento/semplice rilascio possono inviare tramite onChange.
3. **[P1] Valori ottimistici permanenti — ISSUE-067.** `AdaptiveCategoryWidget.tsx:166` conserva optimisticValues senza conferma, scadenza, rollback o reset al cambio entità; `:170` li applica sempre dopo i valori HA. Riprodotto on → richiesta off → HA off → HA on: il pulsante resta off. Un aggiornamento reale successivo o una richiesta rifiutata possono lasciare un valore falso fino allo smontaggio.
4. **[P1] Crash del widget quando manca l'entità — ISSUE-068.** Il componente produce capacità vuote per un'entità associata assente, ma `WidgetDesignChart.tsx:77` legge fallback.label senza guardia. Riprodotto TypeError su una luce 2×2 assente. L'ErrorBoundary del WidgetHost limita l'errore alla tessera; manca comunque lo stato indisponibile previsto.
5. **[P1/P2] Risoluzione servizi incompleta — ISSUE-069.** `utils/haEntityToCapabilities.ts:1338` genera `media_player.set_volume_level`, mentre HA espone `volume_set`; il controllo precedente usa già il nome corretto. La capacità humidity è esposta ma il ramo climate non risolve set_humidity, e inizializza da target_humidity invece dell'attributo HA humidity. Entrambi riprodotti. Inoltre il profilo Auto riceve il sensore batteryId, mentre il resolver charging tratta solo il dominio car e non usa i distinti chargeControlId/chargeControlIds: la semplice presenza del pulsante non prova un comando funzionante.
6. **[P2] Capacità di scrittura dedotte dalla sola lettura — ISSUE-070.** `haEntityToCapabilities.ts:383` abilita SET_POSITION se esiste current_position anche senza il bit corrispondente. Riprodotta una cover con feature 3 (solo open/close) che espone lo slider e può inviare un servizio non supportato. La stessa impostazione per altri attributi va verificata sulle entità selezionate, senza assumere supporto dal solo valore letto.
7. **[P2] Storici non corrispondenti alla capacità — ISSUE-071.** `useEntityHistory.ts:45` estrae solo lo stato numerico e `:146` richiede no_attributes. Non estrae brightness, temperature desiderata, volume o eventi locked/unlocked dai relativi attributi/stati. Il grafico operativo può quindi ricadere nelle serie simulate; per sensori senza cronologia il segmento ricavato dal solo valore attuale viene invece classificato come «ultime 24 ore» perché ha due punti. Rilievo da lettura del percorso, senza nuova acquisizione HA.
8. **[P2] Stili operativi dipendenti dalla galleria — ISSUE-072.** I selettori generali di grafici/gesti sono in `pages/ui-kit/widgetDesigns.css`, importato solo dalla galleria caricata lazy. Il nuovo componente importa solo adaptiveWidget.css, che non definisce quei tratti, fill/stroke e gesti. Confermato anche nella build isolata: il CSS principale contiene soltanto il riferimento al wrapper uikwa-chart, mentre gli stili completi restano nel CSS della galleria. L'aspetto al primo accesso può differire da quello successivo alla visita del kit. Non eseguita una nuova prova visiva.
9. **[P2] Accesso ai dettagli perso nelle tessere adattive — ISSUE-073.** `AdaptiveCategoryWidget.tsx:144` dichiara onConfigure/openDetails ma non li usa, non rende un data-widget-open e non prevede un altro comando per aprire i dettagli. Il wrapper passa le callback senza che vengano consumate; si perdono comandi avanzati prima accessibili dalla card. Inoltre Pagina non implementa lo scorrimento interno previsto dal concept (contenitore overflow:hidden). Rilievo statico, da verificare insieme alla selezione/ordine dei controlli nella correzione assegnata.

Fonti primarie esterne consultate il **2026-10-15**, revisione **HA Core 2026.9.4**: [servizi media_player](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/media_player/services.yaml#L49), [attributi/servizio umidità climate](https://github.com/home-assistant/core/blob/2026.9.4/homeassistant/components/climate/const.py), [contratto Cover](https://developers.home-assistant.io/docs/core/entity/cover/). I primi due sono versionati; la pagina Cover è documentazione corrente. I rilievi sul comportamento ACA sono basati sui sorgenti e sulle sonde locali.

### Banco osservato e limiti di riproducibilità

Osservazione in sola lettura alle **15:00 circa Europe/Rome**: health ok/versione 0.9.9, container healthy, immagine `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, avvio `2026-10-15T12:49:37Z`. HTTP e filesystem servono `index-Df7kljmP.js` e `index-HD4WDER4.css`, uguali al dist locale preesistente.

- JS SHA-256: `4eb1bbdc67715750c919874ba961ff707280865d7755f87e490f57f39dfe6e70`.
- CSS SHA-256: `fb067d1ff6380551ad53249d79bedc271fad187eb24123a9304b955b298298e8`.
- `docker diff` conferma modifiche sotto `/app/frontend/dist`, rispetto all'immagine 0.9.9 documentata. La descrizione «banco invariato» del report/stato non vale per gli asset correnti. Non riavviato/ricreato il container; riproducibilità tramite sola immagine e ripristino non provati.
- Esiste `backup/banco/tunet-data-20261015-pre-0.9.10-freddo.tgz`, 406797 byte, SHA-256 `abb3c440c6157078c817a2fd4e26d28dc856d2cb94cc66754fa49b2f9ace567e`; tar leggibile con db/wal/shm. La sola ispezione non prova né modalità a freddo né ripristino.
- Build indipendente con ACASYSTEM_VERSION=0.9.9 sotto `backup/audit-20261015/dist/`: JS `index-YZmyFge5.js`, CSS `index-HD4WDER4.css`. Il JS differisce da quello distribuito: non si certifica identità binaria tra sorgenti attuali e banco. Il dist applicativo originale non è stato sovrascritto.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Inventario iniziale | `git status --porcelain`, `git rev-parse HEAD`, lettura AGENTS e documentazione | Eseguito | Working tree preesistente preservato; HEAD del 2026-10-07. |
| Frontend completo | `npm exec -- vitest run --maxWorkers=4`, workspace frontend | Superato | **153 file, 1913 test**, 398,66 s; nessun browser lanciato dall'audit. |
| Backend completo | Stesso comando nel workspace backend | Superato | **17 file, 141 test**, 4,47 s. |
| Sonde indipendenti | `npm exec -- vitest run --maxWorkers=4 --config ../../../backup/audit-20261015/vitest.audit.config.mjs`, dal frontend | Fallito, regressioni riprodotte | **8/8 test falliti**, 14,91 s; primo tentativo fuori root non risolveva testing-library, risolto nella configurazione locale con dedupe; nessun file applicativo cambiato. |
| Typecheck / lint | `npm run typecheck`, `npm run lint` dalla radice acasystem | Superato | Frontend/backend senza errori. |
| Tipografia / colori | `npm run lint:typography`, `npm run lint:theme-colors` nel frontend | Superato | Zero violazioni su 448/321 file. |
| Build isolata | `ACASYSTEM_VERSION=0.9.9; npm run build -- --outDir <radice>/backup/audit-20261015/dist` nel frontend | Superato | Typecheck incluso; build 2,46 s; avviso chunk hls >500 kB. Nessuna distribuzione. |
| Formattazione mirata | `npm exec -- prettier --check` sui nove sorgenti indicati nel log | Fallito | LoginForm, AdaptiveCategoryWidget, GestureControl operativo, haEntityToCapabilities. Nessuna formattazione applicata. |
| Banco e copia locale | HTTP health/index, docker inspect/diff/sha256sum, Get-FileHash, tar -tf | Parziale | Bundle confermati; immagine/tag non descrivono da soli i file modificati. Copia leggibile, ripristino non eseguito. |
| M11 prestazioni, TalkBack, font effettivo, PWA | Nuova prova dispositivo | Non eseguito | Esaminate soltanto evidenze e procedure precedenti; nessuna nuova certificazione di fluidità/accessibilità. |

Log selezionati conservati in `backup/audit-20261015/acasystem-audit-20261015-*.log`, esclusi da Git. Otto sonde indipendenti fallite non contraddicono i 1913 test esistenti superati: verificano comportamenti prima non coperti.

## Controllo del diff e decisioni

L'audit modifica solo documentazione corrente e questo report: indice, stati/issues, verifiche, annotazione datata del report 001 e dell'infrastruttura. Applicazione, dipendenze, originali, archivio, configurazione e dati del banco non modificati. Al termine delle verifiche, prima degli aggiornamenti documentali, **tutti i 350 file preesistenti fotografati avevano ancora le stesse impronte**. Controllo iniziale git diff --check segnalava già una riga vuota finale in project-status.md; nessuna pulizia applicativa effettuata.

L'audit non assegna correzioni o nuove funzionalità e non convalida retroattivamente autorizzazioni riferite da un agente precedente. ISSUE-062 torna aperto per verifica della variante finale; ISSUE-064 resta implementato con regressioni aperte e non verificato come completamento dell'integrazione.

Controllo conclusivo: cinque documenti preesistenti aggiornati più il nuovo report; **zero modifiche inattese** rispetto alle impronte iniziali. Collegamenti relativi Markdown dei sei documenti controllati senza destinazioni assenti. git diff --check conserva la sola segnalazione della riga vuota finale preesistente in project-status.md (ora alla riga 844); avvisi CRLF/LF già presenti. Le sonde e la build di audit restano esclusi da Git sotto backup/.

## Chiusura e punto di ripresa

Audit completato. Nessun intervento applicativo attivo in questa richiesta. I rilievi ISSUE-065…073 sono registrati come problemi aperti e proposte di correzione, senza applicazione. Il prossimo incarico dovrà delimitare le correzioni, iniziando da serratura, invii/stato HA, crash e resolver, quindi ripetere sonde e controlli pertinenti. Per chiudere ISSUE-062 servono misure della variante finale sul M11 con criterio dichiarato; TalkBack, testo realmente ingrandito e standalone richiedono prove effettive dedicate. Nessun commit o deploy.


### Annotazione successiva — 2026-10-15, REP-20261015-003

Il successivo piano umano ha assegnato esplicitamente le correzioni e il completamento dei venti tipi. [REP-20261015-003](REP-20261015-003-widget-operativi.md) consegna il software e il banco 0.9.10, con sonde permanenti, collaudo isolato e backup/ripristino verificati. La presente annotazione non riscrive gli esiti storici sopra. Il tablet è stato scollegato: ISSUE-062, collaudo M11, TalkBack, testo effettivamente ingrandito e standalone restano aperti. Nessun collaudo degli impianti fisici.
