# Cambio dispositivo senza attesa di tre minuti

| Campo | Valore |
|---|---|
| ID | REP-20261103-004 |
| Stato | Completato: hotfix locale0.9.38/r100 installato, passaggio iPhone→Edge confermato dall’utente in pochi secondi |
| Data | 2026-11-03, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «Ok, sistemiamo il cambio dispositivo: quando chiudo ACA sull’iPhone voglio poterlo usare subito da Edge sul PC, senza aspettare 3 minuti.» |
| Perimetro | Correggere il passaggio locale iPhone→Edge preservando uso esclusivo, configurazione, bozze e protezione dei vecchi permessi. Nessuna nuova pubblicazione, stack, VM, revoca di login o comando fisico. |

## Obiettivo e criteri di completamento

Preservare le488 voci Git preesistenti, banco iniziale ACA0.9.38/r99 e dati. Checkpoint prima delle modifiche in backup/rep027. Registrazione separata delle fonti: richiesta corrente assegna la correzione, non rende improvvisamente garantito un evento browser.

Criteri: chiusura del titolare con richiesta di rilascio persa permette il passaggio nell’ordine di pochi secondi; titolare con connessione viva, anche in background, resta protetto. Legame per account/client/login/istanza e specifica concessione: nessun rilascio dovuto a una connessione vecchia o a un’altra scheda. Riconnessione breve senza cessione al concorrente. Riserva invalidata rifiuta comandi e scritture del vecchio titolare; nessun retry di comandi fisici. Rilettura autorevole prima dell’uso nuovo, bozze preservate. Prove frontend/backend, QA con perdita deliberata di DELETE e fonte artefatti verificati. Installazione sul banco e riscontro iPhone reale distinti, nessuna pubblicazione implicita.

## Avanzamento

REP003: recupero reale riuscito solo dopo richiesta di attesa3min/Riprova; causa di mancato rilascio Safari non dimostrata. Lettura attuale: il flusso SSE è autenticato ma non collegato alla specifica concessione; la sua chiusura rimuove soltanto il listener. Si valuta legarlo alla concessione e liberare dopo breve grazia quando termina l’ultimo stream corrispondente, invece di dipendere esclusivamente da pagehide. Timer e callback devono verificare il fencing ID, con mantenimento in background se il collegamento è vivo.

Una sospensione o interruzione di rete che termina il collegamento può essere indistinguibile dalla chiusura: non promettere distinzione perfetta né tempi garantiti quando il server non riceve alcun segnale di disconnessione. Scelta tecnica esecutiva entro la richiesta, non autorizzazione a cedere un profilo con trasporto ancora vivo o ad aggiungere takeover manuale.

## Verifiche ed evidenze

Avviata baseline isolata sul bundle0.9.38/r99 senza modifica del banco: titolare telefono chiuso con DELETE intenzionalmente scartato, osservazione della chiusura SSE. Nessun risultato dichiarato prima dell’evidenza. Agenti separati per frontend, backend e QA; nessun accesso a credenziali personali o UI reale.

## Chiusura e punto di ripresa

Implementazione, verifiche e banco completati. L’utente ha poi confermato il passaggio reale iPhone→Edge in pochi secondi, come riportato nella sezione finale. Limiti di rete/sospensione e primo collegamento rimangono distinti; nessun incarico ulteriore avviato automaticamente.

## Implementazione congelata e review

Backend: presenza SSE in RAM per account/client/login HA/usageSessionId, nonce separato per ogni connessione. Ultimo EOF dopo una presenza osservata arma3000ms; solo nuovo stream della stessa istanza annulla la scadenza. Rinnovo REST, cleanup duplicati o stream di altre schede non la prolungano. Rotazione del fencing eredita l’eventuale termine; timer vecchi verificano ID/record correnti. Se arriva anche rilascio esplicito, resta un unico termine, minimo fra chiusura già osservata e now+3000ms. Router non aggancia risposte già chiuse durante autenticazione e registra cleanup prima di flush. Nessuna migrazione/schema o nuovo endpoint.

Frontend: watchLiveProfiles invia l’identità RAM stabile nell’header dedicato, anche quando il client attende. Nessun riavvio dello stream a ogni rotazione della lease. Risolto inoltre il rischio di ripresa durante un acquire in corso: la richiesta di ripresa rimane pendente e viene rieseguita dopo scarto del vecchio risultato, senza nuove acquisizioni per un grant valido. A riconnessione SSE il titolare rivalida subito la propria concessione; rifiuto blocca e conserva la bozza invece di attendere il heartbeat20s.

Review root: legame completo e contatori per stream, timer soft/hard coerenti senza prolungamento, late resync e bozze conservate. Nessun clientId-only, rilascio su semplice hidden, takeover, challenge, nuova UI o dipendenza. Prima del primo SSE riconosciuto/client legacy e perdita silenziosa senza EOF resta il fallback180s: ISSUE-139 non chiusa integralmente. Una sospensione che interrompe il trasporto può liberare il profilo; prima di riusarlo il vecchio client verifica il possesso, e il server rifiuta i vecchi fencing.

## Verifiche congelate

- Backend completo seriale: **744PASS,1skip,50filePASS**,43,03s;13regressioni nuove di presenza/fencing/router incluse. Focused40PASS non da sommare. Strict e lint mirati PASS. Evidenze backend-presence-full.log/backend-presence-handoff.md.
- Frontend coordinatore/eventi: **51PASS/2file** (49+2), strict/lint PASS; gruppo iniziale50 sovrapposto e superato dal finale. Altri **18PASS/3file** per comandi/proof/rollback, disgiunti dal51. Build finale PASS; la prima build è stata ripetuta soltanto dopo il fix resync. Avviso dimensione chunk preesistente, nessuna modifica di stack per rimuoverlo.
- QA app reale nuova: **6/6PASS**, due contesti Chromium con FakeHA/SQLite in memoria,2client/1profilo, zero erroriJS/comandi fisici. Con DELETE perso e EOF del telefono, ingresso PC automatico **3471ms**. Normali PC→telefono3395ms e telefono→PC3540ms. Titolare aperto22,5s con rinnovo e concorrente ancora423; reload in entrambe le direzioni mantiene il turno, vecchio proprietario riaperto bloccato. qa-presence-final-results.json e handoff. Dist/index.html SHA256ecf3af84ce22f359b445fa766571ad9e135d5d09cedd7bfc50c53857d71c1365.
- Baseline vecchia immutabile .38/r99:6DELETE scartati prima del router (retry browser), EOF osservato ma PC ancora bloccato oltre7091ms con Riprova423. Due fallimenti iniziali del solo harness preservati: intercettazione pagina chiusa non consegnata, poi aspettativa esattamente1retry troppo stretta. Il fault server-side finale richiede almeno1scarto e0rilasci passati al router.

Fixture fermate e porte verificate non raggiungibili. Chromium emulato non certifica Safari né minimizzazione fisica Windows: durante la prova l’altro contesto continua a riportarsi visibile/focalizzato. La presenza viva è protetta nel protocollo e testata oltre20s; sospensione reale resta distinta. Suite frontend/lint generali non dichiarati verdi, debito ISSUE-134 distinto. Nessun comando fisico.

## Artefatti e preparazione dell’aggiornamento locale

Hotfix della medesima ACA0.9.38, revisione100; pubblica0.9.34 e file base.env conservati. L’autorizzazione preesistente al banco locale0.9.38 di REP001 e l’incarico corrente di correggerne il cambio dispositivo costituiscono il perimetro operativo; non viene dedotta una nuova autorizzazione alla pubblicazione o all’installazione domestica.

Comandi eseguiti, con log base-build.log/wrapper-build.log:

~~~powershell
node progetto/ha-app/build-base.mjs --version 0.9.38 --tag aca-system:device-switch-local
node progetto/ha-app/prepare.mjs --version 0.9.38 --revision 100 --base-image aca-system:device-switch-local
~~~

 Wrapper ghcr.io/acamemo/acasystem:0.9.38.100, digest **sha256:6fd2b843232a8ce88c8b312ba49baa19a9ed65d79f277730f922c31eabea51e6**. Base **sha256:04b87544a3a3559e3080c0b0aec23f085ea8f9249408472eaddd42e03c7e7319**. Snapshot1746file SHA256 **6cd396bd06da30d55462d9421a7f91b64b7accb53c554e09fc31ab94074a2615**. Web3131273byte SHA256 **e51cb410eccd5e9d0134917a9762652d631d6178cc184a8cc4368cb15d1f4b23**, minServer0.9.38/minShell0.1.0. Lo startup delle shell confronta anche lo SHA del manifest, quindi non salta un nuovo bundle della stessa versione; nessuna nuova build nativa.

Backup a freddo dopo arresto del solo ACA: backup/rep027/cold-bank-pre-0.9.38-r100/aca-data-pre-0.9.38-r100.tgz, **260386byte**, SHA256 **0bac212ec03bf533fcb2a7ef983e11bcd94d121cea1b8af640c88e4f025ac9ee**. Estrazione tmpfs e integrity_checkok, volume segreto tecnico escluso. Snapshot metadati SQLite senza righe personali in backup/rep027/sqlite-before.json. Audit indipendente completato:7checksum,1746sorgenti ZIP/proof/working tree,22strumenti build+2QR generati,119asset web ZIP=immagine e116file runtime backend/contratti. Smoke networknone/tmpfs: health/HTML/manifest200, bootstrap anonimo401. Dati e avvio verificati nella sezione seguente.

## Banco e riscontro fisico conclusivi

Aggiornato soltanto ACA mediante l’override backup/rep027/compose-switch-local.yaml. Immagine corrente ghcr.io/acamemo/acasystem:0.9.38.100 con digest atteso; health0.9.38/setupready, manifest SHA del nuovo bundle verificato. Docker risulta healthy dopo l’avvio; nessun nuovo schema. Confronto SQLite: integrityok, **27/27tabelle con hash/conteggi dei dati precedenti identici, nessuna colonna aggiunta**. HA e D1 mantengono la stessa ora di avvio e stato. Evidenze data-comparison.json, bank-final.json, untouched-before/after.txt; fonte indipendente artifact-0.9.38-handoff.md e auditJSON.

Dalla radice, per mantenere il nuovo hotfix:

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep027/compose-switch-local.yaml up -d --no-deps --no-build --pull never tunet
~~~

Il solo compose principale ripristina la pubblica0.9.34; il precedente override rep024 conserva la r99. Indirizzo LAN invariato http://192.168.1.11:3002/. Backup e immagini precedenti conservati; nessun commit/push, pubblicazione o attività VM.

Prova chiesta all’utente: ricaricare ACA su PC e iPhone, chiudere tutte le istanze ACA del PC, usare ACA sul telefono, chiudere la scheda iPhone e riaprire ACA in Edge. Alla domanda se compaiono i widget entro pochi secondi senza attendere3min risponde **«Sì, entra in pochi secondi»**. Questo conferma il risultato richiesto sul proprio iPhone e PC. Non è una misura cronometrata, un test di tutte le sospensioni/reti o una certificazione Android.

ISSUE-140 risolta per questo flusso e riscontro; fallback senza segnale/iniziale rimane esplicito. Il latch di ripresa di ISSUE-139 è corretto e testato; la concessione iniziale persa prima del primo SSE rimane distinta e aperta. Il trascinamento Tavano non è stato ritestato in questo incarico. Intervento concluso, nessun ampliamento assegnato.

Controlli documentali finali: diff whitespace PASS con criterio CRLF;156 nuovi collegamenti locali senza destinazioni mancanti; nuovi file del lotto senza whitespace finale; byte/hash degli artefatti nativi revisione2 invariati. Guida aggiornata allo stato installato e al riscontro umano. Stato container finale running/healthy e digest atteso registrati in bank-final.json.
