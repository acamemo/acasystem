# REP-20261110-003 — Tapparelle, tende e veneziane per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261110-003 |
| Stato | Completato localmente e verificato |
| Data | 2026-11-10, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta e autorizzazione | «procedi», dopo la proposta Tapparelle/tende/veneziane, famiglia cover: Home con stato e Apri/Stop/Chiudi quando supportati, dettagli con posizione/lamelle/canali e manutenzione; un widget per dispositivo e percorso Trova → anteprima → Conferma. Build locale, banco escluso. |

## Obiettivo e perimetro

Quarta famiglia di [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), dopo [Clima REP002](REP-20261110-002-clima-per-dispositivo.md). Riutilizzare il tipo `cover`, `coverId` e il contratto prodotto versione 1: esatto device_id, canali ordinari abilitati/visibili, secondarie e tecnica da registro. Non introdurre una scansione nuova o una migrazione globale della memoria. Tapparelle, tende e veneziane sono il lotto assegnato; altre tipologie cover non vengono dichiarate collaudate implicitamente.

Git iniziale 683 voci preesistenti. Checkpoint byte-esatto dei 1853 file .60: `backup/rep073/source-checkpoint.zip`, SHA fonte `dc64842e52727203905493caa6a78292a93403b83d2dc4a36684bb997a334a4b`; manifest e Git iniziali nello stesso percorso. Preservare tutti i dati e le modifiche preesistenti. Nessuna nuova dipendenza, API, autenticazione, modifica di tema/gesti, installazione o pubblicazione. Banco/account/profili reali non toccati.

Fonti progettuali: [prodotto](../funzionalita/product.md), [matrice](../riprogettazione/matrice-widget-ha.md), [design](../design/design.md). Controlli generali e gesto postnuova pagina restano distinti in ISSUE-134/152.

## Criteri di completamento

- Risolutore cover e guardia del contratto; nessuna aggregazione di hub/entry/stanza, entità configurative escluse dai canali principali e nessuna attivazione delle nascoste/disabilitate.
- Trova e associazione manuale sullo stesso risolutore. Destinazioni già presenti, duplicati storici, pile e pagine nascoste conservati; anteprima inerte e Conferma/Annulla con ID stabile e riscontro autorevole.
- Home singola con stato osservato, percentuale reale se disponibile e comandi essenziali; multicanale sintetica, senza comando collettivo. Dettagli con canali indipendenti, posizione e inclinazione solo secondo feature e servizi HA, misure e tecnica separate. Nessuno stato/percentuale inventati, indisponibilità distinta da chiusura.
- Stop supportato deve rimanere utilizzabile durante l'attesa di un comando di movimento; nessun reinvio automatico o comando all'apertura/anteprima. Percorso personale tracciato esistente.
- Primitive ACA Vetro Bianco, layout Console comune e controlli contenuti; desktop/telefono, nomi lunghi e valori testuali a capo, tastiera, movimento ridotto e transizioni senza variazioni di blur o sfondo. Legacy cover senza metadati coerenti conservato.
- Test pertinenti, regressioni su Clima/Luci/Prese/cover storico, strict/build e controlli comuni con confronto al debito preesistente. Build locale .61, ZIP con provenienza verificata e QA isolata; hardware e login reale distinti.

## Avanzamento e modifiche

Implementata la quarta famiglia nel tipo esistente `cover`, senza aggiungere dipendenze o endpoint.

- Contratto versione 1 e risolutore esatto device_id: canali cover ordinari, secondarie e tecnica dal registro, nessuna unione di hub/entry/stanza. Classificazione conservativa con priorità esistenti e tecnici esclusi dal prodotto principale.
- Trova e selezione manuale usano lo stesso risolutore; `coverId`, nome e metadati vengono salvati insieme. Destinazioni esistenti, duplicati storici, pile e pagine nascoste conservano il percorso comune. Anteprima inerte, Conferma con ID stabile e riscontro della centrale, Annulla senza scollegare HA.
- Nuovi Home/Details/Controls/Console solo con metadati coerenti con coverId. Home singola con stato e percentuale osservati; multicanale solo riepilogo. Comandi Apri/Ferma/Chiudi indipendenti e regolazioni apertura/lamelle entro0–100, dati e servizi effettivi; mancanti o indisponibili non diventano0/chiuso. Nuovo minimo2×2, legacy2×1 e memoria conservati.
- Debounce locale200ms per le regolazioni, cancellato su Stop, uscita o perdita del collegamento. Stop rimane invocabile durante l'attesa di movimento; nessun reinvio automatico. Target richiesto separato dalla lettura ricevuta. Misure e tecnica in sezioni distinte; stessi controlli/materiali/Console e transizioni.
- DEMO con tapparella essenziale senza percentuale/Stop e dispositivo a due canali con capacità differenti, misure e tecnica. Il simulatore conserva i vecchi movimenti istantanei e aggiunge solo Stop sullo stato osservato, senza inventare un viaggio fisico. Il caso Stop durante una promessa irrisolta è verificato nei componenti controllati, non attribuito al browser della DEMO.

I negativi del lotto sono conservati: taglio dei comandi nel formato320px corretto con riga stato/% compatta e spaziatura locale senza ridurre i target; confronto <=1 che annullava il primo passo30→31 corretto a <0,5 con regressioni posizione e inclinazione. Il testo dello stato anomalo non legge più proprietà ereditate dell'oggetto. L'asserzione iniziale sul contenuto tecnico chiuso è stata riallineata a invisibile, rispettando Disclosure che lo mantiene nel DOM; nessuna funzionalità rimossa per rendere verde il test.

L'attesa del test Trova è ora espressa in due fasi pubbliche: uscita effettiva dello strumento dal DOM, poi comparsa di Conferma. Il primo gruppo conserva una mancata attesa di Conferma per Clima; nessun timeout aumentato o assert eliminato. Il test verifica più precisamente il contratto di handoff già presente.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | ZIP e hash di 1853 file | Superato | Corrisponde alla fonte finale .60. |
| Software pertinente | 48 file del gruppo ampio e gruppi mirati successivi | 864 scenari frontend unici, ultimi esiti PASS | Non suite generale completa. Gruppo intermedio avviato prima delle correzioni:824/828, quattro negativi del nuovo renderer conservati; risolti, non attribuiti al debito storico. |
| UI Cover finale | CoverProduct dopo riga compatta e confronto a mezzo passo | 36/36 PASS | Include Stop con apertura ancora in attesa, debounce annullato,31 richiesto distinto da30 osservato e nessun invio duplicato. |
| Raccordi e simulazione finali | CoverProduct/Integration/DiscoveryLauncher/MockupHa/WidgetCatalogPreview, maxWorkers=1 | 120/120 PASS | Chiusura Trova attesa esplicitamente prima di Conferma, senza aumentare timeout o ridurre assert. |
| Binding e associazione | 5 suite binding/classificazione;3 suite manuali | 91/91 e27/27 PASS | Dispositivi esatti, esclusioni tecniche/nascoste, canali e aggiornamento atomico con fence; gruppi sovrapposti ai totali. |
| Backend profili | collaboration.test.ts e profileService.test.ts | 17/17 PASS | Non è un collaudo HA reale. |
| Strict e build | Frontend prebuild, backend, UI; Vite con ACASYSTEM_VERSION=0.9.61 | Superato | Avviso HLS>500kB già presente. |
| Contratti comuni | test:ui e test:design | 3/3 e6/6 PASS | Nessuna dipendenza aggiornata. |
| Lint e tipografia | JSON ESLint finale vs.60; colori; tipografia | 0 nuove diagnosi | 7 fingerprint ESLint identici;1connect.css:103 byte-identico. ISSUE-134 rimane aperta. |
| Browser del sigillo | Desktop1916×882, telefono390×844, ristretto320×760 | 6/6 flussi,6/6 cold,5/5 visuali PASS | Controlli contenuti, target40px a320, dettagli640px centrati, nomi lunghi, indisponibilità, tastiera, movimento ridotto e sfondo stabile. Simulazione soltanto. |
| Sorgenti e ZIP | Byte/EOL/diff,110file ZIP=dist e HTTP index/entry | Superato | 22modificati/9nuovi/0rimossi o estranei, fonte e sigillo sotto. |

Contatori completi in `backup/rep073/tests-summary.json`: deduplicazione per file/nome del caso con precedenza all'ultimo esito, non somma dei gruppi. Log/JSON intermedi conservati, incluse le quattro regressioni del lotto e il primo handoff non concluso in tempo. Evidenze finali in `final-affected-tests.json`, `ui-cover-corrections-tests.json`, `build-corrections.log`, `checks-results.json` e `lint-comparison-final.json`.

QA definitiva: `backup/rep073/qa-final/qa-final-summary.json`, `qa-cover.json` e **`visual-reviewed/qa-visual.json`**. Il report `qa-final/visual` resta rosso perché il primo assert del contenimento usava l'article interno anziché la card esterna; screenshot e controllo corretto confermano i target interi nella card, senza modificare l'app per superare quell'assert. I negativi preliminari reali di320 e del passo1 restano distinti dal difetto dell'harness. Il selettore manuale Chiudi è stato circoscritto al gruppo del canale, senza confonderlo con la chiusura della Console.

Sul sigillo: sei comandi DEMO espliciti, payload/canale esatti e nessun comando automatico o reale. Verificati Annulla, lookup esistente e negativo desktop di pagina piena senza nuovi widget o pagine. Cold con render dei contenuti pronti e confronto dopo600ms; la fixture preassociata è fuori dalla prima pagina visibile, nessuna pretesa di primo frame Cover visibile o persistenza della DEMO. Screenshot320/390/1916 e campioni RAF letti; nessun errore JS, richiesta esterna o WebSocket reale; browser QA chiusi. Non è una misura FPS o una garanzia di Stop fisico.

## Controllo del diff e decisioni

Confronto byte con checkpoint .60:1853→1862file,22modificati/9nuovi/0rimossi; EOL conservati e nessuno spazio finale aggiunto. Modifiche circoscritte alla famiglia, raccordi condivisi e fixture/test pertinenti, senza riscrivere i renderer storici. I tre dispatch conservano i corpi legacy. Nessun cambiamento a `widgetDeviceKey`, gateway, backend, dipendenze, tema o gesti.

[ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), [matrice versione4](../riprogettazione/matrice-widget-ha.md), [requisiti](../funzionalita/product.md) e [brief](../design/componenti/tapparelle-tende.md) aggiornati. SHA, diff e confronto completo in `backup/rep073/source-audit.json`, `source-after.json`, `source-delta.diff`; nessun commit, installazione o pubblicazione.

## Fonti primarie e limiti

Consultate il2026-11-10: [cover/const.py HA2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/cover/const.py), [services.yaml della stessa revisione](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/cover/services.yaml) e [CoverEntity](https://contributors.home-assistant.io/core/entities/cover/). Posizione/lamelle0–100; OPEN1/CLOSE2/SET_POSITION4/STOP8 e SET_TILT_POSITION128 distinti. SPEED256 e comandi tilt discreti non implementati nel nuovo lotto. Nessuna copertura dichiarata di tutti i parametri, modelli, cancelli o altre classi cover.

L'hook storico ha una discrepanza dei nomi/bit tilt, registrata come ISSUE-153/P-153-A; non viene corretto o migrato implicitamente. Il gateway preesistente prepara/esegue ogni richiesta indipendentemente: Stop utilizzabile nella UI non significa priorità end-to-end rispetto a un movimento già entrato nel gateway. Fonte commandApi byte-identica alla .60; limite e proposta separati in ISSUE-154/P-154-A. La richiesta assegnata non introduce un nuovo protocollo di ordinamento e non dichiara annullamento fisico.

La DEMO si ricrea al reload: cold su tapparella preassociata, non persistenza dei widget aggiunti nella visita precedente. Hardware HA/Lenovo M11/iPhone reale, autenticazione e FPS su GPU fisica sono prove distinte e non eseguite dal lotto locale.

## Build locale e prova

[Apri ACA .61](http://127.0.0.1:4191/?screen=app#/mockup), con soli dati simulati. Da Trova dispositivi selezionare Tapparella camera oppure Veneziane studio; verificare anteprima/Annulla/Conferma e aprire i dettagli. La tapparella semplice non espone percentuali o Stop; Veneziane studio raccoglie due canali, con inclinazione soltanto sul primo, misure e tecnica separate. È disponibile anche il percorso manuale del tipo Tapparella.

Pacchetto `backup/rep073/acasystem-web-0.9.61-local.zip`, 2719700byte/SHA `66ec520bfc2fd6176289c7e7573c4887a0f8e6fa5ad37ca0bd2c3d5aa17551b8`. Tutti i110file del dist corrispondono al ZIP. Entry `index-biEenZT0.js`, SHA `caa8f95cb8af9a35e74502e81989c98f9b50dcce421a1abe35644108954c7e6c`; HTTP index/entry esatti. Fonte1862file/SHA `6f0ac7f65cfa5bb9b16cd4b9eb2ae2c854f93f5daa0ecf42a2959a9773798dce`. Sigillo in `artifact-manifest.json`; versione impostata nel solo processo figlio con ACASYSTEM_VERSION=0.9.61. Banco/account/profili reali e HA non modificati.

## Chiusura e punto di ripresa

Consegna locale .61 completata, con criteri verificati entro i limiti dichiarati e pacchetto coerente con i sorgenti. Nessun incarico residuo della famiglia. Eventuali prove hardware, aggiornamento del banco, gateway ordinato e correzione del renderer storico sono incarichi separati; ISSUE-134/152/153/154 non vengono promossi automaticamente a lavoro autorizzato. Account, profili reali, HA e release pubblica invariati.
