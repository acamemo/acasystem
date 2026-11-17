# ACA: dispositivi riconoscibili, profili sincronizzati e Tavano

Piano discusso in U51 e implementazione esplicitamente richiesta in U52 il2026-11-02. Fonte umana: messaggio «PLEASE IMPLEMENT THIS PLAN» con il piano completo. [Report corrente](../../reports/REP-20261102-012-profili-client-editing-tavano.md). Questo documento registra il perimetro approvato; gli esiti appartengono al report e allo stato del progetto.

## Decisioni e risultato

- Centrale mini PC con HA/ACA; desktop Electron, Android Capacitor e browser iPhone via QR/IP, rete locale e sistema già predisposto.
- Registrazione libera di chi raggiunge la centrale, senza approvazione di un membro; primo proprietario distinto.
- Un account HA personale può avere più client, ciascuno con nome e sessione indipendente. Profili personali, selezione indipendente per schermo, libreria comune all'account.
- Stesso profilo: ordine dei widget comune; dimensioni/griglia adattive. La scelta umana supera l'ipotesi di disposizioni indipendenti per formato.
- Configurazione protetta da editing esclusivo; bozze offline e conflitti visibili.
- Tavano condiviso con tutti i membri, comprese attività dei profili, diagnostica e comandi ACA; nessun diritto implicito di modifica dei profili altrui.
- Cloud/relay, GUI boot HAOS e VM desktop restano fuori incarico. Build locali e istruzioni; pubblicazione/installazione domestica distinte.

## Consegna1 — Dati e migrazione

Conservare React, TypeScript, Express, SQLite, cifratura e dipendenze esistenti. Distinguere houseId, userId HA, clientId installazione/browser, sessionId accesso HA verificato, editSessionId per singolo editor anche fra schede, profileId.

Profilo autorevole sul server con revisione complessiva e revisioni delle risorse. Operazioni mirate sul JSON corrente, non sostituzione indiscriminata dello snapshot. Modifiche ed eventi di conferma nella medesima transazione.

Checkpoint prima della migrazione. Conservare ID/proprietari/contenuti originali/aspetto moderno/metadati storici. Configurazioni account, per-client e profili divergenti recuperabili e presentati per scelta al primo accesso. Migrazione idempotente; vecchi writer globali non possono aggiornare profili migrati, client incompatibile riceve richiesta di aggiornamento.

## Consegna2 — Ingresso, registrazione e client

Android non configurato: scanner automatico, consenso, fallback manuale dopo annullamento/diniego/errore. Desktop: IP/incolla. iPhone: QR apre URL web. Sessione valida rientra direttamente. Centrale pronta e nessuna sessione: «Crea un nuovo utente della casa» oppure «Accedi al mio account»; onboarding del primo proprietario distinto.

QR pubblico solo URL. In Sistema QR, indirizzo e «Copia indirizzo». Copia layout fra utenti/case rimane distinta: nuova configurazione indipendente del destinatario, senza identità/accessi sorgente.

Registrazione pubblica ACA usa identità tecnica già predisposta per creare normale utente HA, non owner/admin. Password soltanto in form/richiesta transitori, mai in database/log/bozze. Journal senza password per gestire doppio invio/risposta persa, nessuna modifica di utenti preesistenti. Servizio tecnico indisponibile: stato ritentabile, niente credenziali amministrative chieste al nuovo membro.

Dopo login chiedere «Nome di questo dispositivo». Creazione profilo: «Nome del profilo» e «Denominazione del dispositivo», precompilata/riutilizzata; secondo campo appartiene al client e sarà rinominabile in Sistema, presenza e Tavano. Nome leggibile non è una chiave di autorizzazione.

Login HA indipendente per client. Verifica con auth/current_user e auth/refresh_tokens is_current; revoca telefono dal PC con sessione personale del PC, senza revocare PC/account. Revoca non confermata indicata come pendente. Token manuali condivisi richiedono nuovo login per accedere alla gestione indipendente.

## Consegna3 — Profili live e ordine

Libreria dell'account, scelta profilo locale al client; altri client sullo stesso profilo seguono modifiche, non popup/pagina aperta. Configurazione condivisa distinta da preferenze hardware/locali.

Ordine logico e suggerimento dimensionale canonici. Drag cambia rango; resize suggerimento. Griglia/rotazione/colonne/densità proiettano localmente senza riscrivere ordine. Packing monotono, nessun backfill che trasformi A,B,C in A,C,B. Overflow come segmenti visuali locali della pagina logica, non nuove pagine persistite per formato.

Migrazione con una sola anteprima della fonte: classe attuale con chiave effettiva, fallback tablet→tabletPortrait→phoneLandscape→phone. Sort y/x/ID stabile, recupero mancanti senza nuove duplicazioni. Conservare pagine/continuazioni preesistenti e fonte scelta; gli altri client non la ricalcolano. Se manca geometria usare preset registro, conservando widget sconosciuti con fallback temporaneo.

SSE autenticato su revisioni accettate; rilettura autorevole alla riconnessione. Distinguere aggiornamenti remoti, calcoli locali e vere modifiche: niente cicli di invio o scritture automatiche fuori coordinamento.

## Consegna4 — Editing, undo e offline

Riserve server45secondi, rinnovo15secondi, editSessionId distinto. Overlay widget centrato «Mario sta modificando… / PC dello studio». Blocco configurazione, stati HA continuano.

Set atomico di risorse dedotto dalla centrale: widget, metadati condivisi e gruppi device-scoped esistenti; preservare associazione per tipo/chiave entità, senza migrare implicitamente a device_id HA. Pagine/ordine/pile/import/ripristini ampi richiedono riserva strutturale del profilo incompatibile con editor coinvolti. Scadenza/riavvio/riassegnazione invalidano vecchi permessi.

Editor su bozza con Salva/Annulla, Salva termina dopo conferma server. Annulla scarta quella bozza. Undo dopo salvataggio applica soltanto inverso interessato e controlla revisioni, mai intero layout.

Offline IndexedDB per casa/account/profilo/risorsa con base e revisione. Riconciliare automaticamente solo cambi compatibili; conflitto espone locale/corrente con scelta o copia. Nessuna ricreazione automatica di widget eliminati o applicazione a profili non più accessibili. Bozze limite10MiB; pieno impedisce nuove modifiche con spiegazione ed esportazione/scarto esplicito, senza cancellazione silenziosa. Nessuna coda di comandi fisici.

## Consegna5 — Tavano e comandi

Widget utilità senza entità HA, attività recenti e registro filtrabile per persona/client/profilo/widget/intervallo/esito, caricato a pagine. Attività globale autenticata nella casa; profili modificabili solo dal relativo account.

Registrare accessi, modifiche confermate, conflitti, configurazioni, diagnosi selezionata e comandi ACA. Salvataggio ACA+evento atomici. Presenza/attività/diagnosi/recupero e storia HA distinti; non registrare ogni rinnovo, movimento o sensore.

Comandi mutativi via backend con token UTENTE verificato, mai fallback serviceadmin/Supervisor/ingress. Coprire invii mutativi fuorihelper e distinguere letture periodiche. Permessi finali HA, normalizzazione target/clean_area preservata.

Intento generato server monouso60secondi, transizione atomica prepared→pending prima invioHA. Duplicati leggono stato, missing/scaduto non crea/esegue nulla. Timeout o restart dopo possibile invio→unknown, nessun retry fisico automatico; sola consultazione GET. StatoHA osservato separato dall'accettazione del comando, nessuna causalità presunta.

Registro fino a7giorni mobili, quota logica complessiva50MiB con diagnosi massimo10MiB. Pulizia avvio/ogniora/quota; intervallo effettivo esplicito. Dimensione fisica SQLite/indici/journal verificata separatamente. Bozze/versioni/HA non eliminate da questa politica.

ExportJSON intervallo/categorie/anteprima, pseudonimi coerenti per export. Esclusi password/token/PIN/inviti/payload sensibili/configurazioni complete/foto; nessun upload automatico alla chat. Esportazioni/backup hanno durata distinta.

## Contratti e verifiche

Famiglia /api/v2: registrazione e recupero tentativi; client/nome/preferenze/profilo/revoca; profiliCRUD/copia/operazioni; editing acquire/renew/release; comandi prepare/execute/status; Tavano attività/diagnosi/export; eventiSSE autenticati. IDoperazione e revisioni risorse su ogni modifica, revisione globale solo coordinamento stream; due risorse indipendenti non si bloccano per la sola revisione globale.

## Estensioni umane durante l'implementazione

U53 precisa Tavano fullscreen con iniziale/colori, client/azione/dettagli e Copia testo delle voci mostrate con prompt diagnostico AI, senza invio automatico.

U54 richiede personalizzazione dall'icona account: colore o file foto con ritaglio/posizionamento, foto prevalente sul colore; sfondo soltanto nella vista account. Reference UI-012 preservata integra, composizione adattata alle primitive ACA. Identità personale distinta dal profilo dashboard. Implementazione con revisioniCAS, immagini raster normalizzate dal cropper, sorgenti in memoria, immagini account escluse dal registro/esportazioni. Fonte nel diario U54 e report012.

Primitive e materiali ACA condivisi; niente dipendenze senza necessità dimostrata. Test: registrazione e risposte perse; sessioni indipendenti/revoca; ordine adattivo; concorrenti stesso/diversi widget; scadenza/stale editor; propagazioni/undo/struttura; bozze riapertura/account/eliminazione/quota; dedup/timeout/restartcomandi; permessi/Tavano/segreti; pulizia senza nuovi eventi; migrazione ripetuta. Strict/build/regressioni confrontati con ISSUE-134. PC+iPhoneLAN e cameraAndroid reali quando disponibili, distinguendo simulazioni da prove hardware.
