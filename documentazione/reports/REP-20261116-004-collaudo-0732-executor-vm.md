# Collaudo .73.2 ed executor su nuova VM

| Campo | Valore |
|---|---|
| ID | REP-20261116-004 |
| Stato | Collaudo concluso con esiti misti; consegna non qualificata |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «Procedi con il collaudo della .73.2 e dell’executor su una VM nuova, senza toccare il banco. Verifica Core, aggiornamento e ripristino e dimmi cosa manca per il PC del capo.» |
| Autorizzazione | Nuova VM HAOS separata, predisposizione e privilegi del solo executor di prova, installazione/aggiornamento/ripristino su dati sintetici, verifiche e correzioni pertinenti. Nessuna mutazione del banco, delle VM storiche, pubblicazione o cambio delle protezioni host. |

## Obiettivo e perimetro

Riprendere i byte .73.2 e kit di REP003 e le procedure di REP002, creando una nuova identità HAOS dal supporto ufficiale vergine. Non riutilizzare VM avviate o credenziali precedenti. Git iniziale921voci preesistenti, staging vuoto: modifiche conservate. Base/banco e fonti runtime invariati. Nessun subagente richiesto o avviato.

## Criteri di completamento

- Identificare nuova VM/dischi/chiavi, osservare versioni HAOS/Core/Supervisor reali e distinguere i vincoli storici del kit.
- Installare .73.2 byte-esatta e companion separato; verificare configurazione privata, stato, privilegi, avvio/riavvio senza account del banco.
- Eseguire un aggiornamento più recente e un recupero su errore con Supervisor e dati SQLite reali; distinguere fixture locali da pubblicazione/trasporto ufficiale.
- Conservare evidenze dei fallimenti, confrontare dati sintetici prima/dopo e qualificare i limiti di stabilità del PC corrente.
- Revocare il canale temporaneo e arrestare ordinatamente solo la nuova VM, preservando evidenze; indicare ciò che manca sul PC del capo.

## Avanzamento e modifiche

Letti stato, REP002/003, scope e istruzioni. Nuovo spazio operativo `backup/rep092`, escluso da Git. Il banco .72 è osservato soltanto da inspect/health: container `5880dabad9da4b79db95478ec797d7b9f9b6fa82688e8ddd9cb6b6b3d58cbd2b`, avvio `2026-11-13T11:05:27.675591456Z`. Le5VM esistenti sono spente e non vengono gestite.

### Nuova installazione e Core

Creata solo `ACA-Pilot-REP092-20261116`, UUID `5c2409fa-1b8a-4522-bfe2-54daf258dc43`, DMI `fa09245c-8a1b-2245-bfe2-54daf258dc43`, IP192.168.1.79.2CPU/2048MiB/UEFI/bridge e disco64GiB: limite del PC corrente, non la configurazione4GiB/32GB del destinatario. Disco da ZIP HAOS18.4 ufficiale vergine,560370635byte/SHA`e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be`; UUID disco nuovo. CONFIG usa soltanto una chiave pubblica nuova, sostituita nel filesystem FAT di un supporto di setup precedente; nessun disco HA già avviato o credenziale precedente copiati. Chiave privata e credenziali sintetiche in directory `.setup` owner-only, fuori da Git/kit; host key SSH letta dalla console e pin verificato, senza accept-new.

Osservati **HAOS18.4, Core2026.11.1, Supervisor2026.11.0** dopo i download iniziali. Bootstrap storico .73.2/Core9.4 rifiutato prima di installare ACA (`native-install.txt`); prima prova con materiali Sonoff fuori directory rifiutata per materiale assente, distinta dal successivo vero rifiuto Core. Generato bootstrap separato con pin esatto11.1, senza cambiare i byte storici o fare downgrade. Installazione reale SonoffLAN3.13.3 originale e ACA .73.2 PASS. Pristine prima degli account: integrità SQLite e14conteggi personali a zero (`aca0732-before-accounts/qualification.json`).

Onboarding nuovo owner sintetico, servizio e form Sonoff mascherato poi annullato PASS; zero entry/eWeLink e nessun attuatore. Core WS e facciata dichiarano11.1; `coreMarkedVerified=false`: risultato funzionale circoscritto, non supporto completo di tutti i contratti Core. Primo harness rifiuta correttamente alias AppData non canonico; rilancio con `realpath`, ACL mantenute, PASS in `onboarding-aca-observed-r2.json`. Creati solo1client QA e1profilo sintetico, senza dati del banco (`seed-data-result.json`).

### Trasporto di collaudo, senza pubblicazione

Per usare **immagini e codice non modificati**, registro OCI2.8.3 confinato al127.0.0.1:443 della sola nuova VM, certificato di fixture e trust Docker limitato a `ghcr.io`. Una riga `/etc/hosts` nel guest instrada quel nome al loopback; CA aggiunta in una copia della directory Docker montata temporaneamente, senza rimonta RW del sistema o disabilitazione TLS/AppArmor. L'iniziale mkdir sul filesystem RO è stato rifiutato; un controllo `getent` assente è stato sostituito con verifica della sola riga posseduta. Registry filesystem preparato dai blob OCI verificati, **nessun docker push/GHCR login**. Pull nativo della .73.2 restituisce lo stesso digest di REP003: `sha256:a8207b137931951e4b90a71f64f6360cb4934090d9a65022fea3df2aff3e254f`.

Catalogo di fixture via repository Git locale nel nuovo Supervisor, con riscrittura del solo URL `acamemo/acasystem-releases` verso `file:///data/rep092-catalog-source`. Slug9960cdb4 e config ACA/companion restano esatti. La scrittura `.gitconfig` dall'interno del container è rifiutata da AppArmor; predisposto il solo file tecnico tramite Docker cp, senza cambiare il profilo. Commit Git solo in quella fixture guest, nessun commit del repository comune o pubblicazione. Header/identità/digest registry sono reali, ma l'origine è la fixture; non è una verifica del package GHCR pubblico.

Le pubblicazioni3/4/5/6 sono distribuzioni di test fornite alla funzione esportata `checkHaos`, tramite il suo parametro `check`; policy, journal, adapter, Engine e Supervisor restano quelli reali. Non viene falsificato GitHub né affermata una promozione stable. Il processo standard autonomo elabora invece vere richieste client e cerca le release pubbliche esistenti. File/hash/trasporti in `materials/registry-proof*.json`, `registry-stage-r3.txt`, `catalog-stage-r2.txt`.

### Executor originale .73.2 e difetti riprodotti

Companion installato manuale; prima esecuzione dello script si ferma con exit2/Protection mode attivo. In forza della richiesta corrente, disabilitata protezione **soltanto sul companion della nuova VM**, manager/Docker API; ACA ordinaria rimane protected=true, roledefault, docker_api=false. Predisposizione prima degli account con credenziale unica/targetId privati, copia privata, restart main e stato current PASS. Più tardi il client richiede un nuovo controllo, elaborato dal vero worker (`executor-provision.txt`, `seed-data-result.json`). Nessun token stampato.

**.73.2 originale FALLITA nell'update reale2→3:** dopo `stop`200, Supervisor rimuove il container ma riporta `state:error`. L'adapter richiedeva solo`stopped`; si ferma in backing-up, non installa3 e non sa riavviare2. Journal e main conservati, companion termina sul recovery-required. Ripresa assistita: verificato digest2 e assenza di install chiamato, avviati manualmente main e companion; il journal viene cancellato/ripreso e ritorna current. Non è un PASS di recupero autonomo della .73.2. Evidenze `update3-result.json`, `stop-state-native.txt`, `manual-assisted-recovery.txt`.

Correzione mirata: osservazione Engine `running` booleana obbligatoria; `stopped` oppure `error` sono accettati solo con prova Enginefalse e immagine esatta. L'assenza di tale prova o un Engine ancora running impediscono backup/installazione. Nuova regressione RED→GREEN, compresa falsa segnalazione stopped (`stop-regression-*.log`). Skill api-and-interface-design applicata al contratto interno, oltre a surgical-coding.

Seconda prova con copie dei sorgenti corretti, separate dall'immagine originale: stop/riavvio risolti, ma tar nativo respinto prima dell'installazione. Il vero backup usa **PAX mtime nell'archivio esterno**, non rappresentato prima dalle fixture (`native-backup-format.json` seleziona solo nomi/tipi/permessi e metadati tecnici, mai segreti). Correzione: ammettere/conservare soltanto timestamp mtime/atime/ctime, massimo64KiB, con checksum, limiti e divieto di override path/size. Regressione positiva e negativi path/size RED→GREEN in `pax-regression-*.log`. I tar privati restano nel guest, non scaricati nel kit.

### Aggiornamento e ripristino reali con le correzioni

1. **2→3 PASS:** versione3 è una fixture dello stesso runtime ACA .73 con sola revisione/label/env diversa, digest `sha256:7f890ecc040df23679306b9dc02e188798085d28b4e57848dd935bd640b662a9`. Executor corretto eseguito da copia QA dei moduli nel companion; non viene sovrascritto il runtime originale2. Backup freddo, SQLite+WAL verificati, upload del sottoinsieme senza metadata Supervisor, update/start, digest/bundle/fingerprint, commit/resume PASS (`update3-source-r2-result.json`). **14tabelle selezionate identiche**, integritàok (`update3-data-comparison.json`).
2. **Guasto3→4, rollback dati PASS:** immagine di guasto solo QA, con guardia targetId/profilo unici, cancella esclusivamente quel profilo e termina42. Digest `sha256:2ff28c296589d0b160a4c2bde78aa5f2e7c97a4389d9effa284a37c54e649c92`. Marker journald conferma1riga eliminata. Health fallisce, restore Supervisor reale riporta immagine3, profilo e14tabelle esatti, credenziale manutenzione/gate conservati (`update4-source-r2-result.json`, `fault4-data-comparison.json`). Nessuna invocazione di attuatori o dati del banco.
3. **Recupero funzionale HA FALLITO:** `service-secret/service-identity.json` è assente dopo il restore, essendo escluso per ADR-0022. Il servizio registra not_admin; setup/health possono ancora essere ready/ok. Ripetizione del probe owner mantiene keeperActivefalse, tentativo esplicito Ripara restituisce409. Non dichiarare il recupero completo sulla sola risposta rolled-back. **ISSUE-166** distingue la riattivazione prevista dall'ADR da un eventuale deposito privato di rollback da decidere; `backup_exclude` e backend non modificati. La scelta approvata mantiene il segreto «fuori da tunet.db e dalle copie» e richiede un nuovo passo se perso.
4. **Immagine corretta .73.5 reale,3→5 PASS:** costruita nuova revisione senza sovrascrivere2, digest `sha256:d59b06147e5dc5a059ad97eb8b6ed69506c9ade78051ba16a80b430fe8c1d4ca`. Companion aggiornato esplicitamente da CLI esterna, poi normale main aggiornato dal suo executor incorporato; backup/PAX/Engine/verifica/commit PASS (`update5-final-result.json`). I moduli corretti QA usati nel restore sono gli stessi byte inclusi nella5; il limite funzionale HA sopra resta aperto. CLI reload catalogo ha avuto timeout, stato/job riletti prima della sola continuazione dell'update, senza ripetizioni cieche.

### Riavvio: terzo difetto e candidato .73.6

Il reboot completo della5 avvia ACA, ma **il companion termina**: ACA non è ancora pronta e il journal storico è già `complete`. L'errore viene classificato con quella fase, facendo uscire il worker anziché attendere il prerequisito. Correzione circoscritta in `update-transaction.mjs`: una dipendenza assente di un journal già terminale, validato e letto da disco resta `preflight`; dopo l'inizio di una nuova transazione gli errori mantengono la propria fase critica. Nessun nuovo restore automatico del DB. Regressione RED→GREEN in `startup-regression-*.log`, comprese ripresa/inspect temporaneamente indisponibili, journal invariato e nessuna installazione o restore duplicati.

Nuova immagine **.73.6**, senza sovrascrivere2/5. Prova reale dell'ordine di avvio: main fermo, companion6 resta attivo dopo8s, journal terminale immutato; main poi riavviato (`startup-order6-native.txt`). **Update reale5→6 PASS** con executor incorporato, backup nativo, PAX, verifica Engine, fingerprint prima del commit e resume (`update6-final-result.json`). Il fingerprint riletto dopo resume può cambiare per nuove scritture consentite: non è un confronto dell'intero DB immutabile.

**Reboot completo6 PASS:** bootId diverso, ACA e companion6 partiti automaticamente,14tabelle personali selezionate esatte e integritàok. Il worker standard elabora una nuova richiesta client: `checkedAt` passa da `2026-11-16T16:48:00.847Z` a `2026-11-16T16:49:11.809Z`, stato finale `current`. Evidenze `reboot6-final-native-state.txt`, `reboot6-comparison.json`, `worker-after-reboot-corrected-assertion.json`. Il primo harness considerava erroneamente sufficiente una variazione del timestamp anche in `checking`/undefined; corretto per richiedere un timestamp stringa nuovo e uno stato terminale current/offline, senza contare il primo risultato come PASS. ACA rimane protected=true/docker_api=false; solo companion manager/Docker API, senza porte e senza modalità privileged.

### Stabilità e chiusura della sola nuova VM

Campione finale **NEGATIVO**: `final6-idle/qualification.json`,300,002s senza sonde esterne durante l'intervallo centrale, normali servizi/worker interni attivi. Host tra letture clock300,575s, Virtual300,572s, VirtualSync303,041s: scarto circa **+2,47s**, oltre la soglia2s dell'harness. Uptime guest+300,480s, stesso boot,0nuovi GivenUp/abbandoni timer; resolved/journald/timesyncd attivi,0restart. L'assenza di nuovi stall gravi non supera il controllo negativo e non chiude **ISSUE-129**; nessuna qualifica H24 o attribuzione causale a tutti gli host VirtualBox.

Registry fermato, riga hosts e bind/CA di fixture rimossi prima del reboot6. A fine prova rimossi anche i redirect Git posseduti, revocata la sola chiave bootstrap per corpo pubblico esatto, poi nuova connessione SSH **rifiutata255/publickey mentre Dropbear era ancora attivo**. Da console seriale: Dropbear fermato e mascherato runtime, nessun listener22222; `ha host shutdown` accettato, infine VBox `poweroff`. Il tentativo di leggere la progressione dalla console ha ricevuto ENOENT perché il pipe era già chiuso; stato spento confermato separatamente. CONFIG scollegata da SATA1 e UART1 disabilitata solo dopo lo spegnimento. Nessun poweroff forzato, cancellazione del disco o gestione delle5VM precedenti.

Evidenze `close-access-result.txt`, `access-revoked-challenge.json`, `serial-access-closed.txt`, `serial-shutdown.txt`, `vm-closed.txt`, `final-conservation.json`. Chiavi private e copie con dati sintetici restano protette localmente/escluse da Git e kit. Controllo finale **banco .72/ok, stesso ID/immagine/StartedAt**,0VM in esecuzione; nessuna nuova ispezione del contenuto del DB del banco.

### Materiali finali

Base ACA0.9.73/2010fonti invariata, SHA`9b470e0af4c644dd2f581187ed13240e63e301670f4e6956df08d1dd12a107f6`. Immagine `ghcr.io/acamemo/acasystem:0.9.73.6`, descriptor `sha256:498544e3d7e9566395458b6fc84fcade89ca952deb51a875a66bcb08913f3501`. Runtime executor11file/SHA`6a842fc2f56f72ab021c9e4b7245e2395db065fc3739fe2d91bea427630da1aa`, etichetta/provenienza/byte rilette. Nessuna modifica backend/frontend, dipendenza o stack; correzioni limitate a3moduli executor e3file di regressione, oltre alle note operative pertinenti.

[Kit candidato .73.6](../../backup/rep092/pilot-candidate-0736/acasystem-pilot-candidate-0.9.73.6.zip),24file/153772224byte, SHA`646debf1a70a0d2e029ad9da116e8c791f13f78ce186f16c76d9f491fad502b4`; clientWindows0.1.1 invariato SHA`a0d1cba540832bf4fd83414163e825a08ed476a75bfef520a9a3154b8fea8ec6`, non riprovato nativamente in questo lotto. Executor ZIP SHA`fa8a31b621c530e9b5f86cd45d7fae63807bc5125573b5e731afc0dae49447e5`. Bootstrap candidato18.4/2026.11.1. Metadata del kit rimangono conservativi candidate-not-target-tested: non è un'approvazione del PC del capo o della distribuzione pubblica. Provenienza worktree dirty/HEAD storico esplicita, senza inventare un commit del lavoro. Conservati anche originali .73.2 e intermedio .73.5, quest'ultimo superato dal difetto di avvio; non consegnarli come esito finale.

## Verifiche ed evidenze

| Controllo | Esito | Limiti |
|---|---|---|
| Inventario Git/banco/VM | Eseguito | Host16GiB con circa2GiB liberi, diverso dal destinatario32GiB; spazio SSD circa298GiB liberi. |
| Core2026.11.1 / onboarding .73.2 | PASS circoscritto | Catalogo ACA ancora coreMarkedVerified=false; nessuna qualifica completa Core o attuatore. |
| .73.2 originale / reboot .73.5 | FALLITI | Stop nativo e poi race di avvio, corretti nel candidato6; originali conservati. |
| Update2→3 / guasto3→4 / update3→5→6 | Dati/immagine PASS | Restore eseguito con copie QA corrette, update5→6 con executor6 incorporato; trasporto/feed locali, non release pubblica. |
| Servizio HA dopo restore | FALLITO | Segreto escluso perso; owner probe non riattiva, Ripara409, ISSUE-166. |
| Reboot6 / nuove richieste worker | PASS |14tabelle selezionate esatte, non audit di tutto il DB o prove fisiche. |
| Idle300s / qualifica piattaforma | NEGATIVO | VirtualSync+303,041s vs host300,575s; ISSUE-129/H24 aperti. |
| Revoca / arresto / banco | PASS | Nuova chiave rifiutata, nuova VM spenta/CONFIG e UART rimosse; banco stesso ID/avvio .72/ok. |

Ultime verifiche locali: **80/80Node,0skip** (`final6-node-tests.log`, Node24.14 Windows con archivio Sonoff originale), **7/7check immagine6** (`corrected6-image-smoke.log`, Docker isolato networknone/rootfsRO/tmpfs, nessun socket/mount/porta host), audit CRC/checksum/provenienza/script/client PASS (`final6-image-audit.json`, `final6-kit-audit.json`). Actionlint1.7.12 PASS sul workflow esistente, shellcheck/pyflakes non eseguiti; nessuna CI remota. I79test e7check della5 sono intermedi e non si sommano a quelli finali. Bootstrap/Python/client Windows di REP002/003 restano attribuiti a quei lotti, non dichiarati rieseguiti qui.

Comandi principali dalla radice, con esiti nei log indicati:

```powershell
$env:ACA_TEST_SONOFF_ARCHIVE=(Resolve-Path -LiteralPath backup/rep088/bootstrap-final/SonoffLAN-v3.13.3.zip).Path
node --test progetto/ha-app/pilot/*.test.mjs progetto/ha-app/source-provenance.test.mjs progetto/ha-app/client-bundle.test.mjs
node progetto/ha-app/pilot/smoke-executor-image.mjs --image ghcr.io/acamemo/acasystem:0.9.73.6
node backup/rep092/audit-final6.mjs
python backup/rep092/audit-kit6.py
```

Qualificatore: `node backup/rep092/qualify-vm.mjs --target backup/rep092/target.json --phase idle --seconds 300 --label final6-idle --output backup/rep092/final6-idle` (eseguito prima della revoca; non rilanciare sulla VM ora spenta senza una nuova sessione autorizzata). Esecuzioni e trace native sopra conservate; `git diff --check` finale e controllo staging/HEAD nel lotto. Nessuna suite generale/frontend o prova fisica implicita.

Fonti primarie consultate2026-11-16: Supervisor **2026.11.0** [apps/app.py](https://raw.githubusercontent.com/home-assistant/supervisor/2026.11.0/supervisor/apps/app.py) e [docker/interface.py](https://raw.githubusercontent.com/home-assistant/supervisor/2026.11.0/supervisor/docker/interface.py), per stop/rimozione container e restore che ricrea i dati; [store/git.py](https://raw.githubusercontent.com/home-assistant/supervisor/2026.11.0/supervisor/store/git.py) per catalogo; [Docker certificates](https://docs.docker.com/engine/security/certificates/) per trust limitato al registry; [Git config](https://git-scm.com/docs/git-config) per insteadOf. Copie tecniche selezionate in `backup/rep092/sources`; gli esiti osservati restano distinti dalle aspettative derivate dalle fonti.

## Controllo del diff e decisioni

Applicati surgical-coding e api-and-interface-design per harness e sole correzioni riprodotte. Le credenziali sintetiche/private restano fuori da report e kit. Diff corrente esteso preesistente preservato; staging vuoto e HEAD invariato. Nessun commit, push, rilascio stable, aggiornamento dipendenze o compatibilità nuova dedotti dalle fixture. Proposte P-166-A/B registrate senza implementazione né promozione ad approvate.

`git diff --check` sull'intero worktree **exit2**:2348segnalazioni in10file backend/frontend esterni al lotto, in larga parte righe CRLF interpretate come trailing whitespace e una riga finale. Non corrette né usate per riscrivere le modifiche preesistenti. Controllo circoscritto ai documenti comuni del lotto **exit0**; dettagli `backup/rep092/diff-check-result.json`, log globale e scoped conservati. I moduli pilot non ancora tracciati sono stati confrontati con le copie iniziali e verificati nei test/audit dell'immagine; il diff Git comune non li rappresenta come modifiche tracciate.

## Chiusura e punto di ripresa

Incarico di collaudo concluso con risultati e difetti riproducibili. **Il pilota non è pronto per la consegna.** Per il PC del capo mancano:

1. Risolvere e ricollaudare la riattivazione del servizio HA dopo rollback (ISSUE-166); una diversa custodia del segreto richiede decisione umana coerente con ADR-0022.
2. Qualificare il suo Lenovo Windows11Pro/32GB con la VM manuale prevista2vCPU/4GiB/64GiB: virtualizzazione, bridge/LAN/IP, due avvii a freddo, idle e continuità/carico rappresentativi. Il PC attuale2GiB non costituisce quella prova; ISSUE-129 resta aperta.
3. Completare la matrice Core2026.11.1/SonoffLAN3.13.3 con dispositivi reali; i colloqui/onboarding qui riusciti non rendono Core globalmente verificato.
4. Congelare e pubblicare, se autorizzato, release/immagine/catalogo coerenti con il candidato finale e ricollaudare download, aggiornamento e rollback dal vero canale. Il workflow è solo verificato localmente; nessun remote/push/deploy eseguito.
5. Collaudare sul destinatario il client Windows, telefono/LAN, account nuovo, eWeLink e2–3suoi dispositivi, riavvio e procedura di recupero. EXE0.1.1 resta quello già provato in REP002, non riprovato qui; nessuna prova fisica/mobile dichiarata.

Punto di ripresa: report, kit6 e VM spenta/conservata in `backup/rep092`; nuova sessione di accesso necessaria per riusarla perché la chiave bootstrap è revocata e CONFIG scollegata. Nessun incarico di modifica del banco o adozione di altra tecnologia deriva da questa chiusura.

### Rettifica successiva — 2026-11-16, REP005

Il successivo [REP005](REP-20261116-005-recupero-servizio-ha-dopo-restore.md) riprende la stessa VM su richiesta umana esplicita. Diagnostico completo sulla .73.6: il precedente409 del tentativo manuale deriva da `PROFILE_USAGE_REQUIRED`, perché l'harness non apriva una sessione di utilizzo del profilo, e non prova un rifiuto HA. Con lease e sessione corretti la richiesta arriva al keeper, risponde200 ma `active:false`; il servizio è ancora missing e il Supervisor non può cambiare la password esistente su Core2026.11.1, operazione riservata al proprietario. Rimangono valide le osservazioni di perdita del segreto/servizio non recuperato, ma l'attribuzione del409 va letta con questa rettifica. Correzione e nuove evidenze nel REP005; risultati e byte storici sopra preservati.

Chiusura successiva REP005 nella stessa data: la nuova .76.1 supera il restore reale **con recupero autonomo del servizio senza proprietario** e il reboot, preservando14tabelle e le altre4identità HA osservate. Kit/hash correnti e condizioni di rigenerazione nel REP005; .73.2/.73.6 e i negativi di questo report non sono stati sostituiti o riclassificati. Stabilità/H24 e destinatario restano aperti.
