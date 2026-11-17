# Recupero autorizzato dell’account del banco e copia dei profili

| Campo | Valore |
|---|---|
| ID | REP-20261104-005 |
| Stato | Completato: nuovo account funzionante, copie verificate e widget recuperati confermati dall’utente |
| Data / autore | 2026-11-04, Europe/Rome; Codex, nome esatto del modello non disponibile |
| Fonte umana | Alla scelta di recupero per ISSUE-144 l’utente risponde: «Autorizzo un nuovo account e la copia dei profili conservati». |
| Autorizzazione | Ripristinare la registrazione del banco HA storico, far creare un nuovo account con password soltanto nell’interfaccia locale, copiare verso di esso i due profili ACA conservati. Preservare gli originali, credenziali e vecchi dati; nessuna pubblicazione o nuova funzione di recupero pubblica. |
| Punto di partenza | [REP004](REP-20261104-004-ingresso-semplificato-banco.md), piano P-144-A e ISSUE-144; ACA 0.9.40/r99 healthy, codice richiesto già installato. |

## Perimetro e criteri

Il precedente account non si ritrova nella configurazione HA storica riagganciata dopo l’avvio Docker. ACA conserva un account, due profili e due client, con tutte le27tabelle identiche al backup verificato. Non attribuire al nuovo account la vecchia identità HA e non riscrivere gli originali: la copia produce profili indipendenti del destinatario.

Prima individuare un’identità tecnica già autorizzata sullo stesso HA oppure richiedere un accesso amministrativo locale. Nessun token o password in chat, log o documentazione. Predisporre checkpoint di ogni configurazione o dato toccato; non leggere valori di credenziali negli output. Il nuovo account viene individuato tramite tentativo di registrazione e identità HA verificati, mai per sola somiglianza del nome. Preparare/verificare il trasferimento in ambiente isolato prima di applicarlo al banco.

Criteri: registrazione pronta, account normale creato localmente dall’utente, copia dei due profili con proprietà corretta, originali invariati, selezione coerente, login e verifica visiva senza comandi fisici. Nessuna nuova API che permetta di leggere i profili altrui. Report e istruzioni devono distinguere software0.9.40, recupero operativo e prove umane.

## Avanzamento

Autorizzazione ricevuta mentre era pendente il recupero di REP004. Si prosegue senza ripetere l’autorizzazione al banco o al trasferimento, preservando tutte le copie già prodotte in `backup/rep031/`. Nuove evidenze in `backup/rep032/`.

Verificate per corrispondenza di identità le tre chiavi tecniche locali già esistenti (banco ACA, D1 e prova LG): nessuna appartiene agli utenti del HA storico. Nessun token inviato per tentare accessi su un’istanza non corrispondente, nessuna chiave copiata o modificata. La documentazione conferma che D1 e LG appartenevano a banchi/VM separati; nessun backup di chiave valido identificato. Il percorso ordinario già disponibile richiede un login locale del proprietario HA per l’attivazione automatica del servizio.

L’utente riferisce «La centrale sta preparando gli accessi. Riprova fra poco.»: è lo stato atteso della registrazione, non la conferma di un errore del login. Guidato alla schermata «Accedi» con l’identificativo dell’owner storico, ricavato dal solo metadato di collegamento della credenziale senza leggere password. Chiesto di inserire la password soltanto nell’app; in attesa del risultato. Nessuna credenziale viene richiesta in chat.

In parallelo predisposto un helper locale di copia offline con manifest/dry-run e transazione: destinatario verificato tramite nuova registrazione completata, due ID di profilo nuovi deterministici, dati originali conservati, nessun clone di sessioni/client/lease. Piano e applicazione ripetibile saranno provati su SQLite sintetico prima del banco; file solo in `backup/rep032/`, nessuna nuova API o variazione della build0.9.40.

## Nuova indicazione: ripetere il processo dalla creazione

L’utente precisa «voglio ripetere il processo partendo dalla creazione», rinunciando al percorso di accesso al vecchio owner. Preparato quindi un banco HA separato con la stessa immagine immutabile 2026.9.4 (`sha256:3e6710a7…d6b76`), servizio Compose `ha-bank`, container `aca-tunet-ha-bank-1`, volume persistente dedicato `aca-tunet_ha-bank-recovery-20261104`. Nessuna porta HA pubblicata; ACA raggiunge `http://ha-bank:8123` sulla rete Compose, senza fallback alla configurazione storica. Override operativo `backup/rep032/compose-recovery-local.yaml`; la precedente configurazione è conservata nei file/backup esistenti.

Il container HA storico rimane fermo con i propri file originali; D1 non riavviato. Il vecchio segreto tecnico è conservato opacamente nel suo volume dedicato come `service-identity.pre-recovery-20261104.json`, senza contenuti copiati in log/archivi ACA. Il nuovo banco risponde con ACA0.9.40 e `owner-required`, stato iniziale atteso; nessun nuovo utente ancora creato dall’agente. Atteso il percorso umano Crea proprietario → accesso → nome casa → scelta profilo, con password soltanto nell’app.

La copia locale viene estesa per verificare anche l’identità del primo owner tramite sessione/client v2 già autenticati da HA: questo percorso non produce un journal di registrazione libera e non va simulato come tale. Modalità esplicite `registration` oppure `session`; entrambe rifiutano destinatari non verificati, revocati o ambigui. Helper congelato SHA256 `44437a78e0ab5132e30a904ba37f16edee8434f53bf9fbd8c30c1606697ebd01`: 17/17 casi sintetici PASS, bootstrap/store2/2, preservazione selezione sorgente3/3 e smoke CLI con percorso Windows contenente spazi. Plan non scrive, manifest esclusivo, `--offline` obbligatorio per apply, secondo apply no-op, rollback del secondo INSERT provato. Nessun server/DB reale toccato e tutte le fixture chiuse. Handoff e JSON in `backup/rep032/qa-profile-copy-handoff.md`, `qa-copy-profiles-final-evidence.json` e `qa-profile-copy-bootstrap-results.json`; nessuna applicazione al banco.

Prima di creare il nuovo account l’utente segnala una critica all’interfaccia e invia l’immagine di «Configura la tua casa / Crea proprietario»: chiede di creare direttamente il primo account senza quella presentazione tecnica separata. Prosegue [REP-20261104-006](REP-20261104-006-primo-account-interfaccia-comune.md), che unifica UI/titoli/pill con la normale registrazione. Il nuovo HA e i due profili originali restano nello stato descritto; nessun nuovo account o copia ancora applicati. Riprendere la creazione umana dopo l’aggiornamento UI, poi usare l’helper già verificato con destinatario reale certo.

## Verifiche e chiusura

Da eseguire e documentare: disponibilità identità tecnica, test isolato della copia, checkpoint, registrazione locale e copia effettiva, verifica di proprietà e originali, riscontro utente. Nessun risultato anticipato.

## Ripresa dopo la creazione umana

L’utente descrive «crea account → accesso → nome casa → step di sincronizzazione → pagina vuota di ACA» e conferma di vedere l’interfaccia con comandi, senza widget nella Home. Nessuna modifica di flusso assegnata da questa domanda. Il banco0.9.41 è `ready`, registrazione `ready:true`: l’identità tecnica è stata riattivata dal percorso ordinario del nuovo owner. La verifica opaca conferma l’identità del nuovo proprietario HA e una sessione normale attiva corrispondente al client ACA, senza esporre identificativi o credenziali.

I due profili sorgente sono byte-identici al checkpoint pre-creazione di REP006. Il destinatario ha già creato un profilo:9pagine/28elementi ordinati, anche se la prima Home è vuota. Deve rimanere integralmente conservato. È una scelta esecutiva conservativa del trasferimento già autorizzato: aggiungere le due copie senza cancellare il profilo nuovo, quindi libreria destinataria di3profili e attivo mappato dal sorgente.

Helper locale esteso con allowlist esplicita di un singolo ID di profilo preesistente e fingerprint nel piano; default restrittivo e fingerprint globale rimangono. Originale SHA444… conservato come `copy_profiles.before-preserve-target.py`; nuovo helper SHA256 `ca9f68c5432695e884e759d6d112b1b53b7d01e485f14bec7fb1ec25b1a4bfd2`. QA aggiuntiva9/9PASS e bootstrapstore reale3profili PASS, con target popolato9/28 e revisioni/metadati non predefiniti conservati raw, rifiuti/rollback/idempotenza verificati. Nessuna nuova API o modifica della build0.9.41. Handoff `backup/rep032/qa-copy-existing-handoff.md`; nuovo piano reale obbligatorio, senza riuso dei vecchi manifest.

Prossima operazione già autorizzata: breve stop del solo ACA, backup freddo verificato, plan/offline apply sul database e controllo di originali/copie/selezione prima del riavvio. La password è stata inserita soltanto dall’utente nell’app e non serve per la copia.

## Copia reale eseguita

Backup a freddo del solo volume ACA prima della transazione: `backup/rep032/cold-bank-pre-profile-copy/aca-data-pre-profile-copy.tgz`,237504byte SHA256 `0f28781b353c3ff25de2e26a70255a2d3f5a147b59867c3e89ef6ff5df7c9fbe`; copia estratta/integrità confermate, segreto tecnico escluso. Sorgente identificato esattamente dal checkpoint pre-creazione di REP006; destinatario e client associati all’unico owner del nuovo HA e a un refresh normale attivo, senza usare il nome come prova. Due profili sorgente identici al checkpoint e profilo destinatario preesistente vincolato al proprio hash.

Plan readonly dopo stop ACA: status ready,2profili sorgente e1preesistente conservato, selezione richiesta false. Manifest SHA256 `e40505f4fda35bfa07743a7903dbbf5d2ee9d5b96fe6882ab1acb20e5ba872e6`, vincoli verificati prima dell’apply. Applicazione offline nell’immagine HA Python già disponibile, nessuna rete: **applied/copiedProfiles2**. Un’unica transazione con le due copie, gli eventi Tavano e la selezione del destinatario. Nessuna nuova API, assegnazione admin, copia di client/lease o cambio della build.

Verifica indipendente dei dati:2originali immutati rispetto al checkpoint,1profilo destinatario già creato integralmente immutato,2copie con nuovi ID/proprietario e contenuti/metadati byte-identici ai rispettivi sorgenti; libreria destinataria3profili. Attivo mappato dalla selezione sorgente,2eventi di recupero e integrità SQLite ok. La copia attiva contiene9pagine/30elementi ordinati,2nella prima pagina. Manifest e binding con identificativi necessari restano locali esclusi da Git; negli output selezionati soltanto conteggi e hash.

Il primo checker separato in volume readonly, eseguito immediatamente dopo il commit e prima del riavvio, restituisce `SQLITE_CANTOPEN`. Il commit era già riuscito: non ripetuto l’apply e non ripristinato il database. Il blocco finally riavvia ACA; lo stesso checker readonly ripetuto dopo l’avvio restituisce tutti gli esiti sopra e integrità ok. Limite del primo controllo preservato nel resoconto, senza attribuirgli una perdita di dati o una causa non verificata.

Banco0.9.41 healthy su loopback/LAN, setup ready e registrazione ready:true dopo il riavvio del solo ACA. File prova: `live-plan-summary.json`, `live-apply-summary.json`, `live-copy-verification.json`, `bank-after-copy.json` e manifest del backup. Chiesto all’utente di ricaricare e confermare i widget; nessuna verifica fisica iPhone anticipata.

## Conferma umana e checkpoint finale

Alla richiesta di ricaricare il profilo recuperato, l’utente risponde **«Sì, vedo i widget recuperati»**. Il percorso reale PC è quindi completato: creazione nell’interfaccia comune0.9.41, login, nome casa, scelta/caricamento del profilo, Home e recupero visibile. Nessun nuovo flusso di auto-login introdotto; nome casa/prima configurazione non sono richiesti a ogni apertura con sessione valida. La verifica da iPhone rimane distinta e non viene dichiarata eseguita.

Checkpoint finale senza interrompere HA o ACA: backup SQLite online coerente tramite API nativa, poi integrità e journal del solo file copia verificati; snapshot opaco della configurazione HA con file identità stabili prima/dopo e hash riscontrati nell’estrazione. **Non è un backup della storia HA:** database recorder/log/backups esclusi. Cartella locale ignorata `backup/rep032/recovered-bank-checkpoint/`:

- `aca-after-recovery.db`:1568768byte SHA256 `5d580634fd80f6d2d64c770915bf738937febad9d4390e370cc2c50cb2f8a269`, integritàok;
- `ha-config-after-owner.tgz`:8703byte SHA256 `522d1e2558d538096c9be9a75c3f03ea8c3558830553c2ce62f2ca6c98bd3e5f`, identità/configurazione confermate;
- `manifest.json`: soltanto conteggi/hash, nessun contenuto sensibile negli output.

La chiave tecnica attuale è preservata opacamente nello stesso volume server separato come `service-identity.after-recovery-20261104.json`, permessi0600; non inclusa nel database/archivio sopra e non mostrata in chat. Il vecchio segreto e la configurazione storica restano conservati separatamente.

Recupero concluso: nuovo account verificato,2copie indipendenti,originali e nuovo profilo mantenuti, selezione autorevole e riscontro visivo PC. Nessun commit, modifica di sorgenti della build0.9.41, pubblicazione, comando fisico o caricamento verso servizi esterni. Per eventuale prova iPhone usare il nuovo account sulla LAN e chiudere prima l’istanza PC, secondo l’uso esclusivo già richiesto; nessun nuovo incarico viene inferito da questa nota.

Chiusura documentale:239nuovi link locali controllati senza collegamenti mancanti e pacchetti nativi precedenti invariati per hash/dimensioni. Checkpoint, binding/manifest e archivi sensibili risultano esclusi da Git. Nessun ulteriore lavoro necessario al recupero PC resta aperto; proposte sul flusso e prove hardware future conservano un perimetro distinto.
