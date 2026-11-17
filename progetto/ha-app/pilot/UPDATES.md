# Pubblicare una candidata e aggiornare il banco

**REP005, recupero HAOS:** ACA0.9.76/app0.9.76.1 completa la rigenerazione automatica con il Supervisor già autorizzato. Core2026.11.1 riserva al proprietario il cambio password esistente; se il file del segreto è realmente mancante, ACA può rimuovere e ricreare esclusivamente l'identità locale di servizio riconosciuta per nome/login/ruoli e senza duplicati. L'ID di quell'utente cambia e i suoi vecchi token sono revocati. Nessuna rimozione per file illeggibile/presente, identità ambigua, account personale o richiesta senza la sessione Supervisor; l'operazione è registrata. Non vengono aggiunti privilegi o copie del segreto. Verificare servizio e funzioni dispositivi dopo restore senza usare la sessione del proprietario. «Ripara il servizio» con il primo account resta una riserva esplicita, con sessione utilizzata solo per quel tentativo e mai conservata dal prodotto. Prove e stato nel REP-20261116-005.

La rotazione con un'identità ancora utilizzabile usa un nome univoco per il nuovo token HA: quello precedente rimane valido finché il sostituto non è verificato e salvato, poi viene revocato. Non cancellare in anticipo i token per aggirare una collisione di nome. La ricreazione HAOS è invece circoscritta al segreto perso e revoca l'identità di servizio precedente. .74.1 correggeva soltanto la sessione proprietario, .75.1 ha verificato quel recupero manuale; il kit corrente .76.1 comprende anche il recupero autonomo.

Secondo avvio REP004: anche .73.5 ha esito negativo se ACA arriva dopo il companion e il journal storico è già complete. La revisione corretta .73.6 classifica come preflight soltanto i prerequisiti assenti prima di un nuovo tentativo, con backoff; un errore nel tentativo appena iniziato o in un recupero non terminale mantiene l'arresto esplicito. Nessun ciclo di restore aggiunto e nessuna modifica del backend/ADR-0022 da quel lotto. Il REP004 distingue prova di update, riavvio e stato della qualifica.

**Collaudo REP-20261116-004:** la .73.2 originale fallisce sullo stop nativo Supervisor2026.11.0, che rimuove il container ma riporta `error`. Il codice corretto richiede anche `running` booleano dall'Engine: nessun backup o riavvio basato sul solo stato Supervisor. Il formato tar reale usa PAX per i timestamp; sono accettati e conservati soltanto `mtime`/`atime`/`ctime`, con rifiuto di override di percorso/dimensione. I byte .73.2 rimangono storici, senza sostituzioni. Aggiornamento e ripristino SQLite reali con le correzioni sono distinti dalla successiva immagine candidata.

Il restore Supervisor ricrea i dati dell'app: il segreto HA escluso per ADR-0022 viene perso. La prova reale ripristina il profilo sintetico e14tabelle esatte, ma il servizio HA non torna attivo da solo. Health/bundle e il solo esito `rolled-back` non certificano il recupero funzionale completo. Serve la riattivazione del proprietario prevista dall'ADR o una decisione esplicita su una conservazione locale riservata alla stessa installazione; la regola delle copie non viene cambiata da questo collaudo. Dettagli e stato corrente nel REP004.

**Aggiornamento locale REP-20261116-003:** il nuovo worker [haos-update.mjs](haos-update.mjs) collega richieste client, selettore stable, journal e adapter Supervisor. Hosting candidato separato in `executor-candidate/`, boot manuale, manager/Docker API solo nel companion; nessuna attivazione da questo incarico. [COLLAUDO.md](COLLAUDO.md) indica la sequenza sul target. Il `prepare` produce anche `acasystem-executor-candidate-<appVersion>.zip` e lega l'hash del runtime all'immagine; kit e publisher verificano lo stesso candidato. Il workflow esegue inoltre uno smoke dell'immagine senza rete, socket o dati host prima del push. Il canale bank e il catalogo stable mantengono la separazione descritta sotto.

L'adapter Supervisor ora esige il fingerprint dei dati prima del commit e un backup contenente identità/credenziale di manutenzione della **stessa installazione**, con file privati. Questo evita di riavviare un restore senza autenticazione/gate; il tar rimane materiale privato locale e non entra negli asset pubblici. Il token HA di servizio continua a essere escluso dal backup ACA. Dopo un commit durevole nuove scritture personali restano ammesse e non vengono confrontate con il vecchio fingerprint per forzare rollback. Se l'immagine/catalogo non sono pronti lo stage rinvia l'update, senza trattarlo come installazione iniziata; prerequisiti indisponibili applicano backoff.

Questa guida riguarda il controllore esterno del **banco Docker di questo PC**. Codice e prove locali non attivano una pipeline remota, un servizio Windows o un aggiornamento del banco. Il setup della nuova centrale del destinatario usa invece il [launcher VirtualBox](VIRTUALBOX.md); il percorso Hyper-V è conservato come alternativa.

La baseline attuale `.72` non espone ancora la manutenzione richiesta dal controllore: non basta avviare `--watch` o aggiungere variabili d'ambiente. Prima dell'attivazione occorre qualificare e installare separatamente una baseline con le nuove API, backup e accesso di manutenzione. **Stable HAOS e companion privilegiato non sono attivi.** HAOS 18.4/Core 2026.9.4 sono candidati dei materiali, non il risultato di una VM vergine collaudata; prima della consegna al capo osservare il Core effettivo, qualificare la combinazione e pubblicare un catalogo stable coerente.

## Predisporre i repository

| Risorsa | Prerequisito verificabile |
|---|---|
| `acamemo/acasystem` | Checkout pubblico revisionato; il workflow è [`.github/workflows/pilot-bank.yml`](../../../.github/workflows/pilot-bank.yml). Pubblicazione solo su `main`. |
| `ghcr.io/acamemo/acasystem` | Package leggibile anonimamente. Concedere al repository sorgente l'accesso Actions in scrittura al package esistente; `GITHUB_TOKEN` nel job ha `packages: write`. Non si presume che il token del repository sorgente abbia già accesso a un package creato da un altro repository. |
| `acamemo/acasystem-releases` | Repository pubblico. Secret Actions **`ACA_RELEASES_TOKEN` nel repository sorgente**, limitato al repository releases con **Contents: write** (Metadata read implicito), oppure token d'installazione GitHub App equivalente. Serve perché `GITHUB_TOKEN` resta limitato al repository del workflow. |

Configurare il secret dall'interfaccia sicura GitHub. Non inserirlo in chat, file versionati, argomenti dei comandi o report. Il codice non crea repository, non assegna permessi e non rende pubblico un package privato. Autorizzazione mancante, collisione o download anonimo impossibile fermano la pubblicazione.

## Capire quale push produce una release

Un commit locale non produce effetti online. Il workflow parte da un **push su `main`** o da `workflow_dispatch` sullo stesso ramo; nessun `pull_request_target`, runner self-hosted o accesso al PC del banco.

La versione ACA base e i limiti candidati sono in [release-target.json](release-target.json). Localmente la candidata è `0.9.73.1`. In CI, `appVersion` diventa **`<versione ACA>.<github.run_number>`**: per esempio `0.9.73.2` per il run 2. La revisione ammessa è 1–999; oltre 999 il workflow fallisce e richiede una nuova sequenza/versione, senza riusare tag. Un nuovo push crea un nuovo run. Un rerun dello stesso run conserva la revisione e si ferma se il tag immagine o la release esistono già; usare un nuovo run per una nuova candidata.

Ogni run esegue queste fasi:

1. Test pertinenti bootstrap/updater/provenienza, backend, strict frontend e guardie Windows; client compilato dalla stessa revisione Git sui runner GitHub.
2. Controllo collisione del tag GitHub e del tag GHCR: si accetta soltanto un 404 `MANIFEST_UNKNOWN` dal registry ufficiale. Il controllo registry viene ripetuto prima del push; 200, 401, errori di rete o 404 ambiguo non autorizzano una sovrascrittura.
3. Un'unica sorgente ACA congelata per immagine base, wrapper, bundle web e sorgenti. Bootstrap Sonoff originale verificato e un unico ZIP candidato con launcher e client Windows.
4. Push immagine e verifica **anonima** dei byte del manifest/config GHCR per digest. Etichette sorgente/versione/architettura devono coincidere; manifest e ZIP del bundle sono confrontati con quelli estratti dall'immagine finale senza avviarla.
5. `distribution.json`, sorgenti completi dal commit pulito, `RELEASE-PROVENANCE.json` e checksum. Il manifest pubblicabile non viene generato usando un imageID locale o digest inventato.
6. Release in bozza con tutti gli asset; verifica dei download autenticati della bozza, pubblicazione come **prerelease bank**, seconda verifica anonima. Se quest'ultima fallisce, il publisher tenta e verifica la richiesta di ritorno in bozza; un errore API resta esplicito e richiede controllo remoto.

Gli asset di una bozza non sono scaricabili anonimamente: per questo i controlli sono distinti prima e dopo la pubblicazione. La pipeline bank conserva il catalogo generato in `acasystem-haos-catalog-candidate-<appVersion>.zip`, senza modificare il catalogo HAOS stable. Il banco sceglie la revisione numericamente più recente compatibile, anche se più run terminano fuori ordine; non retrocede a una vecchia release o alla pubblica legacy.

## Predisporre il controllore sul banco

Il controllore è [bank-update.mjs](bank-update.mjs), eseguito fuori dal processo ACA. Richiede Docker/Compose disponibili e un checkout degli strumenti revisionato. Non attiva Docker, non crea un'attività pianificata e non registra un servizio da sé.

Prima dell'attivazione verificare la baseline con `/api/internal/update/state`, health e bundle coerenti. Servono una credenziale casuale diversa per ogni installazione, 64 cifre esadecimali, e un file protetto accessibile solo all'account del controllore e SYSTEM su Windows. Il file non viene creato da `--capture-target`; il controllore controlla l'ACL prima di leggerlo. La baseline deve avere:

- `ACA_UPDATE_TARGET_ID=aca-pc-bank` e `ACA_UPDATE_TOKEN_FILE=/run/aca-update/token`;
- bind **read-only** del solo file privato host in `/run/aca-update/token`;
- i volumi ACA dati e segreto di servizio distinti, senza copiare il segreto nei backup dati;
- la versione shell minima osservata nella configurazione del controllore. Il campo shell di una richiesta anonima non decide la compatibilità.

Questa predisposizione iniziale e la sua installazione sono separate dai comandi sotto. Non è stata applicata al banco da questo intervento.

### Catturare la configurazione senza aggiornare

Nel workspace locale, dopo aver qualificato baseline e shell 0.1.1, il seguente comando legge soltanto i campi Docker necessari e gli hash dei file Compose. Non legge Env o token, non ferma container e non crea la directory runtime indicata:

```powershell
node progetto/ha-app/pilot/bank-update.mjs --capture-target backup/rep088/bank-target-after-baseline.json --directory C:/ProgramData/ACA/System/Updater/bank --token-file C:/ProgramData/ACA/System/Updater/token --shell-version 0.1.1
```

L'output richiede un nome nuovo. Prima dell'attivazione rivedere il JSON: nome container, progetto/servizio Compose, catena completa e hash dei file, dati/segreto montati, comando/entrypoint/workdir/restart identici, identità e immagine del Core. L'inventario candidato del 2026-11-16 è `backup/rep088/bank-target-candidate-20261116.json`: fotografa la `.72` e propone shell 0.1.0; **non qualifica la baseline nuova né attiva il controllore**.

Il Core viene letto dal container HA configurato e dalla sua etichetta `io.hass.version`, controllando anche imageID/progetto/servizio/stato. Un'immagine Core diversa richiede una nuova qualifica della configurazione. HAOS/Supervisor non sono inventati per questo runtime Container; il contratto stable HAOS continua a richiederli.

### Eseguire un controllo o mantenere il watch

I comandi seguenti possono installare una pubblicazione compatibile: usarli soltanto dopo le verifiche della baseline e del JSON locale. Non sono stati eseguiti sul banco da questo lotto.

```powershell
node progetto/ha-app/pilot/bank-update.mjs --target backup/rep088/bank-target-after-baseline.json
node progetto/ha-app/pilot/bank-update.mjs --target backup/rep088/bank-target-after-baseline.json --watch
```

Il primo comando esegue un ciclo. `--watch` legge le richieste tecniche di controllo ogni 2 secondi e ricontrolla GitHub all'avvio, su nuova richiesta o ogni 10 minuti. Le richieste arrivano da `/api/updates/check`; il backend mantiene il solo metadato della richiesta. Il controllore pubblica stati tecnici attraverso `/api/internal/update/status`, con la credenziale separata. Nessuna credenziale passa dal browser o viene stampata.

Un push non raggiunge direttamente il PC spento: quando il controllore riparte recupera prima il journal, anche con ACA fermo, poi cerca la pubblicazione più recente. Per mantenerlo in esecuzione serve una successiva attivazione locale verificata del processo; la presenza del file workflow non equivale a un servizio installato sul PC.

## Verificare backup, aggiornamento e recupero

Il lock TCP locale viene rilasciato dall'OS alla morte del controllore. Prima delle mutazioni si verificano identità, mount, Core e hash della catena Compose. Lo stage conserva l'immagine precedente in un tar con checksum e scarica il nuovo digest. Il drain persistente deve appartenere alla stessa transazione e riportare zero scritture, comandi, editor e connessioni attivi; in caso contrario l'update è rinviato.

Il backup ferma soltanto ACA, controlla SQLite e fingerprint, archivia **solo il volume dati ACA** usando un helper senza rete e verifica hash e struttura tar. Sono rifiutati traversal, link, file speciali, troncamento o DB assente. Il segreto di servizio non viene montato nell'helper. Il file Compose attivo del controllore modifica il solo servizio ACA; `up --no-deps --no-build --pull never` conserva il comando/entrypoint osservato e non aggiorna HA o D1.

Prima di riaprire le scritture occorrono immagine esatta, health/versione/appVersion, bundle con hash verificato e fingerprint dei dati conservato. Su errore dopo installazione il recupero carica l'immagine precedente salvata e ripristina il solo volume dati, poi verifica la precedente versione prima del resume. Un commit già durevole non ripristina dati precedenti alle nuove scritture.

`recovery-required` mantiene esplicito il recupero incompleto. Il watch si arresta su un recupero transazionale fallito; non ripete ogni 2 secondi un restore dall'esito incerto. Conservare journal, tar e credenziale e correggere la causa con il target identificato. Se Docker/Compose lascia il container assente, se cambia il Core o se la precedente immagine/dati non sono verificabili, può essere necessario un intervento operativo: non è stata dimostrata una ripartenza automatica da ogni guasto del daemon o del PC.

La directory runtime deve essere nuova o marcata per quel target. L'adapter imposta e verifica ACL Windows owner+SYSTEM (0700 su POSIX) prima di salvare backup; una directory altrui non vuota viene rifiutata. I backup contengono dati personali e rimangono locali. Non c'è cancellazione automatica di backup, immagini o journal. Dopo esito completo, verifiche e finestra di recupero concordata, la pulizia è un'operazione locale separata sul target esatto; non cancellare la sola copia di rollback né copiare quei file nel kit del destinatario.

## Ripetere le verifiche locali

In questo workspace è disponibile l'archivio Sonoff originale già verificato, fuori da Git. Per abilitare anche i casi packaging che lo richiedono:

```powershell
$env:ACA_TEST_SONOFF_ARCHIVE=(Resolve-Path -LiteralPath backup/rep088/bootstrap-final/SonoffLAN-v3.13.3.zip).Path
node --test progetto/ha-app/pilot/*.test.mjs progetto/ha-app/source-provenance.test.mjs progetto/ha-app/client-bundle.test.mjs
```

Senza la variabile i casi che richiedono l'originale sono dichiarati skipped, non promossi a test del pacchetto. CI scarica la sorgente pubblica e il generatore ne verifica il checksum fissato. Test Engine/Supervisor/Compose e ACL sono isolati o simulati; il parser PowerShell è reale, ma non sono prove di backup/restore del banco, VM vergine o ACL operative sul target.

Fonti primarie consultate il **2026-11-16**: [token del workflow e limite al repository](https://docs.github.com/en/actions/concepts/security/github_token), [Container registry e Actions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [API release](https://docs.github.com/en/rest/releases/releases), [download asset 200/302 e digest](https://docs.github.com/en/rest/releases/assets), [sintassi workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax). Versione REST usata: `2026-03-10`. Le Actions sono fissate a commit risolti dai tag ufficiali v6 nella stessa data.
