# Sistema verificato e personalizzazione account unica

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-017 — Completato e installato sul banco locale |
| Data / autore | Avvio2026-11-04, conclusione2026-11-05 Europe/Rome; Codex, nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Fonte umana | «stesso lavoro per sistema», verificare funzionalità obsolete una a una; personalizzazione da Sistema e creazione account deve chiamare lo stesso componente completo e le stesse API. Screenshot e richiesta nella chat corrente. |
| Autorizzazione | Audit funzionale di tutte le sezioni di Sistema, aggiornamento delle parti confermate obsolete e layout; unificazione reale della personalizzazione account/registrazione. Prosecuzione delle prove locali sul banco, nessuna pubblicazione o modifica delle installazioni HAOS/native. |

## Obiettivo e perimetro

Produrre una matrice sezione/controllo → comportamento/API → decisione attuale → mantenere/aggiornare/ritirare. La sola età del codice non dimostra che una funzione sia obsoleta. Conservare configurazioni, profili, permessi, identità e compatibilità necessaria; gli ampliamenti senza fonte umana restano proposte.

Unificare la personalizzazione dell'identità personale (colore, avatar, copertina e ritaglio esistenti), distinta dai profili della dashboard e dalla copertina Home. Riutilizzare le primitive ACA e il tema Vetro Bianco; nessun nuovo selettore globale o dipendenza. Prima di autenticarsi si possono predisporre preferenze locali; le API dell'account restano protette da identità/sessione HA verificata. Password, token e immagini non entrano nei log, nei tentativi di registrazione o in nuovi endpoint pubblici.

Riferimenti: [requisiti](../funzionalita/product.md), [design](../design/design.md), [architettura](../architecture.md), [ADR-0035](../decisions/ADR-0035-profili-live-client-e-tavano.md), decisioni successive su account/uso esclusivo/palette/tema. Banco iniziale0.9.45/r99. Stato Git iniziale544voci preesistenti, da preservare; checkpoint in `backup/rep044/`. Nessuna modifica all'archivio documentale o commit/push.

## Criteri di completamento

- Matrice completa di tutte le sezioni e dei comandi principali, con evidenze di sorgenti/test e decisioni pertinenti; nessuna rimozione arbitraria.
- Sistema senza descrizioni o azioni incompatibili con tema/account/centrale attuali; layout e navigazione usabili su desktop e telefono, testi essenziali.
- Un solo componente di personalizzazione riusato nei due ingressi, colore libero e strumenti foto/sfondo/ritaglio coerenti; nessuna seconda implementazione delle API account.
- Registrazione normale e primo proprietario mantengono flussi e privilegi separati; applicazione dopo accesso verificato, difesa da risposta obsoleta/cambio account e contesti errati.
- Conservazione dei dati storici e comportamento delle funzioni mantenute verificati; test mirati, strict/build e controlli condivisi, QA visiva e funzionale con dati sintetici. Debito preesistente distinto.
- Materiali locali verificati e istruzioni di prova; per l'eventuale aggiornamento del banco, backup freddo e controllo di conservazione. Nessuna pubblicazione.

## Avanzamento

Analisi funzionale, unificazione account e baseline/assessment layout delegate separatamente. Uso dei principi impeccable già applicati nella sessione: contesto non rieseguito, modalità Operate, playbook layout e craft-floor prima degli edit UI. Scansione meccanica distinta dalla valutazione della superficie.

### Inventario verificato sui sorgenti (2026-11-05)

Inventario completo di11sezioni, più account e informativa AI; la prima conta12è stata rettificata prima dell'implementazione. Matrice dettagliata controllo/API/decisione/test in `backup/rep044/system-functional-audit.md`, baseline e valutazione layout indipendenti in `system-baseline-handoff.md` e `layout-assessment.md`. Una funzione mantenuta non è dichiarata collaudata su hardware soltanto perché il suo codice è stato letto.

| Sezione | Funzioni e confini attuali | Esito dell'analisi / intervento |
|---|---|---|
| Collegamento | Stato centrale/sessione HA, utente, ricollega, logout; cambio indirizzo solo nei client nativi | Mantieni API e revoca personale. Nessuna opzione token manuale nell'app: la label legacy è un fallback intercettato prima dell'ingresso normale |
| I miei dispositivi | Elenco client propri, rinomina, revoca di uno solo e stato pendente | Mantieni. L'eliminazione del nome dispositivo obbligatorio all'ingresso non elimina sessioni indipendenti o questi comandi |
| QR Code | URL pubblico della centrale/copia indirizzo; invito monouso per account o copia indipendente del layout | Mantieni entrambi, senza confondere QR pubblico con credenziali o trasferimento layout; nessun remoto o renderer HAOS implicito |
| Profili | Libreria dell'account, selezione/copia/rinomina/elimina/import/export e bozze nel percorso live | Mantieni. Snapshot/per-device sono fallback condizionali non mostrati nel flusso live; dati e API storici non cancellati arbitrariamente |
| Barra di stato | Titolo, ora, persone fissate, indicatori, ordine/visibilità e sensori | Mantieni. Riprodotto titolo vecchio tra profili: correggere base/scope e conservare bozza con scelta esplicita se cambia la base |
| Copertina (Home) | Ora/calendario all'ingresso del launcher, toggle layout | Mantieni nome e significato già presenti, distinti dallo sfondo personale dell'account; la voce continua a chiamarsi Copertina |
| Schermata Home | Modifica, densità griglia; aggiornamenti live | Mantieni, lock tradizionale soltanto nel fallback già condizionale. Nessun ritorno al Salva globale o ricalcolo persistente per formato |
| Posizione | Posizione HA per meteo, mappa/coordinate; comando personale tracciato e permesso HA admin | Mantieni permessi e intento; nessuna estensione di privilegi o comando anonimo |
| Aspetto | Descrizione del tema fisso, senza selettore | Aggiorna da Liquid Glass/Bianco e viola al Vetro Bianco effettivo. Non riattivare colori o wallpaper globali |
| Casa3D | Apertura vista e qualità locale del dispositivo | Mantieni, non confondere qualità locale con configurazione condivisa o personalizzazione dell'account |
| Informazioni | Versione runtime, licenza e origine Tunet | Mantieni fatti storici/attribuzione; la versione upstream nell'origine non è la versione corrente dell'app |
| Account (testata) | Identità personale, colore/foto/copertina/crop protetti | Sostituire vecchi6preset con editor comune di registrazione e account, stessi writer/API protetti |
| AI (testata) | Informativa sullo sviluppo, richiesta esplicitamente in REP-20261023-005; non assistente AI runtime | Mantieni ingresso e contenuti approvati; nessun servizio AI aggiunto o caricamento dati |

Navigazione: una sezione visibile per volta, pannelli mantenuti montati, tab accessibili/tastiera, indice limitato in altezza e target almeno44px. La baseline su6viewport/73catture rileva heading nascosti sotto la nav, target account21/34px, sidebar620px in viewport568 e editor oltre la prima vista; la nuova composizione e l'editor devono essere ricontrollati su questi casi.

Distinguere identità personale (colore/foto/sfondo), profilo dashboard (layout) e copertina Home (ora/calendario) evita di cancellare funzioni valide come se fossero duplicati.

### Implementazione e controlli software

Sistema usa11tab accessibili, un pannello visibile e gli altri montati/nascosti. La selezione diversa riporta lo scroller della scena all'inizio; aprire Account conserva invece DOM, scheda, scroll e bozze. La sidebar corta resta scorrevole, header/toggle hanno target reali44px e testi lunghi possono andare a capo. L'errore del titolo fra profili è stato prima riprodotto con2FAIL attesi e poi corretto con base/scope distinti. La chiave dell'account preferisce l'identità del client verificato per non azzerare una bozza durante una temporanea assenza dei metadati HA. Le bozze conflittuali di quel campo restano RAM: messaggio esplicito della perdita uscendo davvero da Sistema; nessun nuovo journal o IndexedDB.

`AccountAppearanceEditor` contiene l'unica UI di pill libera, avatar/copertina, scelta/rimozione e crop. `AccountCreationFields` conserva soltanto credenziali/adattatore, AccountView usa l'editor pieno. `accountAppearanceController` è il writer comune, con gli stessi accountApi protetti; il controller della vista e il gate di handoff non duplicano le operazioni REST. Nuove iscrizioni non usano più il campo colore come writer parallelo della registrazione; i tentativi legacy rimangono recuperabili con ID e valori originari.

Prima del login, ritagli soltanto in RAM legati a un nonce corrente: avatar≤256KiB/copertina≤768KiB, payload complessivo≤1MiB, non un limite all'heap complessivo. Reload perde questi ritagli, come comunicato nell'editor; immagini mai in attempt, log, sessionStorage o IndexedDB. Colore/claims non segreti mantengono il recupero esistente. Membri verificati per userId/attempt; owner e member non possono confondere i rispettivi intenti. Il primo login resta esplicito e il gate già presente si applica dopo ClientAccessGate; nessun nuovo endpoint pubblico o privilegio.

Header e sessione attesi sono catturati anche per immagini; risposte obsolete non aggiornano l'altro account. Handoff serializzato per revisioni e rilettura delle immagini già accettate dopo risposta persa: il retry invia solo il ritaglio mancante.409 resta esplicito. RegistrationForm gestisce epoch/unmount e revoca soltanto il grant transitorio che possiede, una volta. Lo stesso contrasto dell'iniziale è usato in pill e avatar; Riprova cancella l'errore dopo la rilettura riuscita.

Crop comune: etichette/valori visibili, un pointerId proprietario del drag e secondo puntatore ignorato, nessuna pinch nuova. La nuova collocazione iniziale sotto Surface aveva escluso il blur del materiale annidato: QA e root hanno confermato i testi sottostanti leggibili anche dopo1,2s. Il crop viene ora montato sul body tramite portal, stesso Sheet e stessi contesti, senza un altro filtro/materiale. Corretto inoltre l'input colore reale da36px a44px; non sufficiente misurare la pill esterna.

Test finali degli implementatori: Sistema85/85 (8file), account74/74 (13file, inclusi2test portal). Root ha eseguito ulteriori39test sulle funzioni mantenute (client, posizione, collegamento, profili, QR e rollback) e38regressioni Tavano/mockup/matcher dopo il cambio dell'avatar/API. I gruppi non sono sommati come suite unica. Strict frontend/shared,3test confiniUI e6assetPASS; colori0violazioni, typography1baselineConnect ora103 dopo lo spostamento degli stili della pill, peso600 preesistente invariato. HLS warning/debito ISSUE-134 distinti. QA finale visiva conclusa dopo i ricontrolli affetti; dettagli sotto.

## Verifiche

| Controllo | Stato | Evidenza / limiti |
|---|---|---|
| Inventario Sistema / account | Superato | Tutte11sezioni, account/AI, azioni/API/permessi e compatibilità classificati; nessuna eliminazione di dati/azioni valide |
| Test / strict / build | Superato |85Sistema,74account,39funzioni mantenute,38Tavano; strict/frontend/shared e build frontend/Casa3D/DockerPASS.3UI/6assetPASS. Color0; typography1baseline non risolta implicitamente |
| Sistema renderizzato | Superato nel campione |84viste/6viewport,11pannelli uno visibile, tastiera, scroll profondo corretto3/3, bozze/Account/focus e nome64caratteri. Nessun cambiamento di controlli/disabled nel confronto inventario campione |
| Account renderizzato | Superato nel campione |43viste/6viewport,30mutazioni solo mock;8ricontrolli affetti postportal/5mutazioni memoria. Immagini/cancel/rimozioni/ripristino/reloadRAM/limiti/SVG, nessun signup/login o dato umano |
| Crop / target / detector | Superato con residui espliciti |7ricatture crop normale/ridotto/fallback: body portal senza antenato materiale, blur16 ripristinato, testi sotto sfocati.6viewport colore60px/range44, hit sui bordi e due tocchi. Statico[];15scansioni rendering, solo residui Leaflet preesistenti interpretati |
| Fonte / immagine / runtime | Superato |1791file,37delta solofrontend/test. Backend165/contratti9/runtime117, dependency/Docker8, buildtools22, IndexedDB e coordinator immutati.7checksum,120asset,117runtime, versioneUI .46/editor unico/portal/tema/icona verificati. Runtime/19APK uguali, smoke isolato senza retePASS |
| Backup / banco / dati | Superato | Backup247058byte verificato, auditpost6/6 più identità livePASS.27/27tabelle identiche, schema/indici/colonne invariati; account/profili/identità/mount e HA/D1 conservati. .46healthy/setupready su loopback/LAN e5UIanonime realiPASS |

## Materiali e operazioni

Locale0.9.46/r99, nessun push: source1791 SHA256 `344d02d69ccec6e953cc0c46c9acfa66af2d03eab3e6e39a50593707791e06b1`; base `sha256:73e1e65d36064d8963ef3b0bcdec1fa6aaa074be21f6628e5e9be171eb2cd890`; wrapper `sha256:1464e2d3085af6b93a874e698885c056227476bae60dd8b1afab52b10f7320d7`. Bundle3348298byte SHA256 `b4414b18a66231dde542c19162db291fe6371fdfc8a9d77b013887513a29d060`, minServer0.9.46/minShell0.1.0. Build `ha-app/build-base.mjs --version 0.9.46 --tag aca-system:system-account-local`, quindi `prepare.mjs --version 0.9.46 --revision 99 --base-image aca-system:system-account-local`; controllo di provenienza e audit indipendente completati prima del gate.

Eseguito updater del solo `tunet` con backup freddo e `--no-deps --no-build --pull never`. Backup `backup/rep044/cold-bank-pre-0.9.46/aca-data-pre-0.9.46.tgz`,247058byte SHA256 `65858e56ced20a57d9c4a3ae644f84008b1044dbcb2a477c839b6aa53ae94f2f`, estratto in tmpfs e integrità/confronto cold snapshot verificati. Rollback preciso .45 conservato, nessuna restaurazione di vecchi dati eseguita.

Post:27tabelle con righe identiche, nessuna colonna/indice aggiunto o migrazione. Identità HA3utenti/2credenziali e chiave tecnica stessi fingerprint; HA/D1 stessi container/immagini/orari, mount invariati. Dimensioni fisiche nei due campioni: DB1576960/WAL4120032/SHM32768/journal0byte, totale5729760;388pagine/freelist0. I4indici già presenti occupano16384byte (`dbstat`), nessuno introdotto dalla .46. Registro logico13340byte/diagnostica0, quote distinte e invariate.

Health/manifest0.9.46 e setupready; URLPC http://127.0.0.1:3002/, LAN http://192.168.1.11:3002/. UI anonima reale5vistePASS senza credenziali/form/azioni. Nessuna scheda o IndexedDB/bozza umana toccata; il backup centrale non certifica le bozze dei browser.

Evidenze riproducibili in `backup/rep044/`: analisi/matrici, copie prima, manifestiaccount/System e QA39/39hash, JSON test e log; `system-account-final-handoff.md`, script/JSON/catture QA e detector separati; audit source/artifact/image/runtime, `artifacts-expected.json`, review/parsehelper; cold backup, services/identity/physical-before-after, `ops-preservation-audit.json`, `ops-live-identity-audit.json`, `physical-index-audit.json`, UIbanco e `runtime-final.json`. Browser QA posseduti chiusi; preview4184/4185 e finestre umane intatte.

## Controllo del diff e limiti

Delta37file (11nuovi/26modificati), tuttofrontend Sistema/account/connect/API/test. Eliminata duplicazione attiva di editor e writer della personalizzazione, non compatibilità/dati/API server. Primitive/stack/dipendenze invariati, nessun selettore temi o rendererHAOS. Le fonti umane sono la richiesta corrente e le decisioni preservate; nessun ADR aggiuntivo per queste scelte esecutive interne al perimetro.

I rossi del titolo e dello scroll e le prove visuali negative (target36px, crop senza blur, primi tentativi incompleti del harness) sono preservati. Dopo correzione si rieseguono i casi affetti, non si spacciano le43/84catture iniziali per nuove ricatture complete. L'errore CDP sul rilascio del secondo dito e un ERR_NO_BUFFER_SPACE del browser sono distinti dai bug del prodotto; la prova isolata successiva è passata.

QA su Chromium e dati sintetici; Safari/iPhone, Android/M11 fisici e GPU/FPS non collaudati. Gli84render Sistema usano anche il fallback demo; il percorso live/assenza writer legacy è coperto dai test della composizione reale, non da un login sul banco. Detector[] non certifica accessibilità/contrasto universali: residui preesistenti della mappa Leaflet (canvas in pannello/attribution) dichiarati. Coreografia generale/chiusura durante upload e altre parti ISSUE-145 non chiuse implicitamente; correzioni specifiche annotate nello stato.

Proposte residue, non implementate: validità del testo coordinate rispetto al punto precedente, limite file di importazione prima della lettura, montaggio della mappa alla consultazione; registrate in ISSUE-147. Nessuna nuova funzione, permesso, account umano o comando fisico creati per questa verifica. Nessuna pubblicazione o installazione nativa/domestica.

## Punto di ripresa

**Verifica finale documentale, 2026-11-05:** aggiornati requisiti, architettura, design/brief, stato/indici, verifiche, infrastruttura, guida e diario. Controllo documenti: 461 nuovi collegamenti, nessuno interrotto; hash dei materiali nativi conservati. `prepare.mjs --check` conferma immagine base, 1791 sorgenti e SHA della consegna. Il controllo whitespace dei 37 file rispetto al pacchetto .45 non trova nuovi errori; `git diff --check` rispetto alla radice storica segnala cinque righe CRLF e una riga vuota finale già identiche nella .45, preservate. Evidenza `backup/rep044/final-whitespace-audit.json`. Diff documentale senza errori, backup escluso da Git e health .46 riconfermato su loopback/LAN.

Incarico completato sul banco locale. Ricaricare [ACA sul PC](http://127.0.0.1:3002/) o [sulla LAN](http://192.168.1.11:3002/), aprire Sistema e il proprio account; account/profili esistenti conservati. Provare la stessa personalizzazione da Crea account senza inviare credenziali in chat. [Guida](../riprogettazione/blocchi/03-profili-client-tavano-prova.md) e [avvio/rollback](../infrastructure.md) aggiornati. Il riscontro umano su propri dati/iPhone resta distinto dalla QA. Nessun ulteriore lavoro attivo o commit; proposte future non autorizzano interventi automatici.
