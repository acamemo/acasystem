# Catalogo widget con più spazio per le anteprime

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-009 |
| Stato | Completato e installato sul banco .54/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «gli elementi in rosso vorrei andarli ad eliminare per avere più spazio», screenshot: maniglia/titolo Aggiungi un widget, intestazione Dispositivi e contatore Pagina1di6. |
| Autorizzazione | Semplificare visivamente il catalogo nella stessa app/banco PC in lavorazione, recuperando spazio per le anteprime. Account/profili conservati; nessuna pubblicazione. |

## Obiettivo e perimetro

Eliminare le tre aree visive indicate e il relativo ingombro: header/grip del catalogo, titolo del gruppo e contatore inferiore. Conservare i nomi semantici per dialogo/gruppi e annuncio della pagina, focus e alternative da tastiera. Non modificare le didascalie dei singoli widget o i moduli successivi di associazione; gesti/animazioni/history e recupero del rilascio perso rimangono invariati. Conservare il margine safe-area anche senza header. [REQ-32](../funzionalita/product.md), [brief](../design/componenti/catalogo-widget.md) e [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md).

**Steering successivo, stessa chat:** «recuperiamo spazio eliminando anche l'elemento nel quadrato rosso», pillola Home «Sincronizzato». Esteso il perimetro a rimuovere il normale indicatore di successo e il suo ingombro; offline, salvataggio, bozze/errori/conflitti e azioni di recupero restano visibili quando pertinenti. Nessuna modifica alle API o al coordinatore. Il chrome vuoto deve occupare zero altezza, mantenendo la catena autenticata e gli avvisi nel flusso.

**Ulteriore steering, stessa chat:** «evitiamo anche errori grafici che tagliano le card dei widget», screenshot con due pagine orizzontali parziali ai bordi. Prima della consegna verificare lo scatto e l'allineamento a riposo dopo scorrimenti parziali, rapidi e ridimensionamento; distinguere un fotogramma durante lo scorrimento da un arresto disallineato. Il banco rimane alla .53 fino all'esito del controllo.

**Chiarimento umano:** «Voglio evitarle anche durante il gesto». La baseline 5d82 si riallinea a riposo ma riproduce card parziali in8frame durante lo scroll continuo: è insufficiente per il criterio chiarito. Autorizzato il passaggio fra pagine intere con dissolvenza, mantenendo il gesto orizzontale e il ritorno verticale. Il primo pacchetto .54, non installato, è conservato in `backup/rep066/intermediate-before-whole-cards/`; non è una consegna approvata. Il piano visivo sticky rimane fermo rispetto al viewport mentre scorre il binario nativo, senza compensazioni JavaScript per frame. Controllare anche la continuità del vetro durante la dissolvenza; checkpoint aggiuntivo del solo CSS tema pertinente prima delle modifiche.

Baseline .53/r99,1816file/SHA0f7a0c0b e622voci Git preesistenti da conservare. Checkpoint `backup/rep066/`; nessun rifacimento dei widget o del sistema di temi.

## Criteri di completamento

- Header/grip, titolo di gruppo e contatore non visibili e senza righe/spazi riservati.
- Anteprime più alte nei formati confrontabili; schede/didascalie intere, niente tagli o overflow nuovo.
- Dialogo/gruppi/status nominati, autofocus e navigazione da tastiera validi; intestazione dei moduli successivi conservata.
- Apertura/chiusura wheel e sfoglio orizzontale funzionanti, recupero lost-release preservato.
- Home sincronizzata senza pillola/spazio riservato; avvisi importanti e relativi controlli ancora raggiungibili e senza sovrapposizioni.
- Catalogo orizzontale allineato a riposo, con card intere anche dopo gesti parziali/rapidi e ridimensionamento; registrare separatamente i fotogrammi di transizione.
- Card intere anche durante il gesto: passaggio per dissolvenza fra pagine complete, senza deriva del blur o perdita dei gesti/focus.
- Diff minimo, controlli pertinenti e browser desktop/telefono emulato; eventuale aggiornamento banco con backup/dati/identità/HA/D1 conservati.

## Avanzamento e modifiche

Diagnosi: header della primitiva occupa altezza; il pager sottrae titolo28px+gap e riserva44px al contatore. Nascondere soltanto i testi lascerebbe spazio fantasma: vanno aggiornate misura e tracce della griglia. La variante senza header è solo per il catalogo dei tipi, non per i form.

Implementata la variante `headerHidden` di BottomDrawer per il solo catalogo: titolo focalizzabile ma visivamente nascosto, intestazioni dei gruppi diventate nomi accessibili e contatore mantenuto come annuncio senza ingombro. Misura a tutta altezza e safe-area superiore conservata. Il chrome del profilo non monta il normale stato salvato; rimangono avvisi e azioni di recupero pertinenti. Nel confronto1916/390 le anteprime guadagnano circa70px per card e la Home sana recupera46,66px; la prova usa anche il provider reale con sessione e dati sintetici, non soltanto il mockup.

Per il criterio successivo sul movimento: binario di scroll nativo e punti di snap conservati, unica scena sticky e pagine sovrapposte a dimensione intera. Cambia solo la dissolvenza di180ms, esclusa con movimento ridotto. Foto/velo del tema presenti dentro il gruppo che sfuma per evitare il cambio di backdrop root; fallback opachi conservati. Le anteprime della pagina corrente, delle immediate vicine e di quelle già viste vengono montate senza trasformare tutte le anteprime sovrapposte in caricamenti simultanei; didascalie e controlli rimangono misurabili. Questa fase intermedia è distinta dai controlli finali e dalla consegna riportati nella chiusura.

Il candidato successivo1bf7 supera i frame orizzontali senza tagli, ma la prova verticale tenuta a150px riproduce un difetto della copia fotografica: `background-attachment: fixed` sotto il drawer trasformato segue il suo containing block. Questo candidato non viene installato ed è conservato in `backup/rep066/intermediate-moving-photo-1bf7/`. La comparazione statica .999/1 del vetro è distinta e stabile (massimo1RGB nel campione); il negativo riguarda l'ancoraggio Y. Correzione successivamente implementata: segnale della sola fase visiva verticale, che sospende la dissolvenza X e rimuove la copia in movimento, conservando scena fissa, gesti e history.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | `checkpoint.mjs`, `checkpoint-status.mjs`, `checkpoint-horizontal.mjs` | Superato,13copie con hash baseline |1816/SHA0f7a0c0b; primo pacchetto .54 conservato e non installato |
| Confronto grafico | Baseline immutabile .53:1916×882 e390 | Baseline rilevata | Header47,80px, prima cardy100,59; desktop anteprima270,59px, telefono238,28px |
| UI e interazioni | Geometria, accessibilità, gesti, frame X e ancoraggio Y sul candidato e pacchetto finale | Superato | Browser privati, account sintetico; vista banco anonima distinta |

## Controllo del diff e decisioni

Usare primitive e stile esistenti, nessuna dipendenza o nuova funzione. Le etichette non visibili rimangono accessibili; il recupero di spazio non autorizza nuovi controlli o modifiche dei gesti.

## Chiusura e punto di ripresa

Completato: ACA0.9.54/r99 sul banco, fonte1816/SHAdad2ffde900187cdc27a921aa97172c375cf375cb3e19f5129b22fbeb303d25a,10delta attesi e nessun file aggiunto/rimosso/estraneo. Rimosse le quattro aree indicate; card intere anche durante il gesto X con dissolvenza180ms e movimento ridotto rispettato. La fase visiva Y interrompe il fade e usa la scena fissa: ingresso, hold150px, annullamento, ritorno a0 e rilascio multipointer non lasciano il flag bloccato. Gesti e history non riscritti.

**Verifiche finali:**62/62 test mirati in6suite,3contratti UI, strict frontend/UI e build frontend/Casa3D PASS. QA:261campioni RAF e97JPEG compositor X senza card tagliate nei formati1916/390, a fronte degli8frame tagliati del candidato iniziale. Hold Y e cancel/nuova apertura normali e ridotti PASS; materiale .999/1 stabile nel campione, fallback opaco e forced-colors verificati. Tastiera, focus non inerte, form/ritorno e recupero lost-release conservati. Chrome sano0px nel provider reale sintetico, avviso importante nel flusso senza sovrapposizioni. I due errori dei soli harness sono conservati come tali; non promossi a bug del prodotto. Il pacchetto finale copre anche le ultime guardie; la QA delle fasi precedenti rimane tracciata separatamente.

**Artefatti:**ZIP3373258byte/SHAb8ae2bf5f882be0a144fbaf04f243488a0bcf0ab65af475a6f7921c3d73fc423; wrapper `sha256:67c3af5d61313d83192d1ebcd77d45699a28dccdba87cd40f94aaa1e85966026`. Ricetta derivata congelata con180fonti backend/contratti/manifeste identiche, runtime/APK invariati e nessuna installazione runtime. Audit indipendente9marker/4hash gesti/6presentazione e corrispondenza immagine/ZIP PASS; Compose18file `config --quiet` PASS senza stampare segreti. Evidenze: `backup/rep066/source-delta.json`, `vertical-phase-final-tests.json`, `qa-functional-summary.json`, `artifact-audit-status.json`, `packaged54-smoke.json`.

**Banco:**backup freddo202041byte/SHA1d2ed5d908b122b06406ca039010a4f509120b934887311214adb5d15b67231a, estrazione e SQLite integri. audit operativo 6/6, verifica cold→live: 27 tabelle esatte e 0 aggiornamenti seen_at monotoni. Account/profili/identità/mount conservati; HA/D1 stessi container e avvii, solo ACA ricreato. Health .54 e casa ready su PC3002 e LAN192.168.1.37; vista anonima e asset esatti verificati senza login o comandi. Browser/helper privati chiusi, anteprima4185 conservata. Pubblica .34 invariata, nessun commit/push o installazione nativa.

**Limiti e ripresa:**prove mirate locali e telefono emulato, non collaudo hardware o nuova autenticazione umana. Suite generale e debito ISSUE-134 non dichiarati risolti; gli avvisi di dimensione chunk già noti sono distinti. Nessuna attività software residua implicita; riprendere sul riscontro dell'utente o su nuova richiesta.
