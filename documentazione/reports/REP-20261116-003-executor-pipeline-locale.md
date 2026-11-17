# Executor HAOS e pipeline preparati localmente

| Campo | Valore |
|---|---|
| ID | REP-20261116-003 |
| Stato | Preparazione locale completata; attivazione e collaudo sul target non eseguiti |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «Continua con executor e pipeline in locale, senza modificare il banco. Prepariamo tutto il necessario per il collaudo sul PC del capo.» |
| Autorizzazione | Preparazione, codice e verifiche locali di executor, pipeline e materiali. Nessuna attivazione di privilegi/servizi sul banco o destinatario, pubblicazione o modifica VM da questo incarico. |

## Obiettivo e perimetro

Ripresa delle evidenze REP007 e [REP-20261116-001](REP-20261116-001-consegna-pilota-con-subagenti.md), successive allo storico di questa chat. REP002 sta trattando separatamente la VM vergine: conservarne file e risultati, senza gestire VM o hardware qui. Il percorso umano attuale è VirtualBox manuale, Hyper-V resta alternativa separata.

HEAD confermato,917voci Git preesistenti, staging vuoto. Preservare le modifiche di tutti gli incarichi, account e banco .72. Skill surgical-coding applicata. Nessun subagente avviato in questa ripresa.

## Criteri di completamento

- Executor HAOS esterno ad ACA con avvio, stato, recupero e richieste client collegati agli adapter esistenti; nessuna elevazione del normale add-on.
- Hosting/configurazione candidati con identità e credenziale specifiche dell'installazione, esclusione dei segreti dai materiali e dai backup trasferibili. Privilegi necessari dichiarati prima di qualsiasi attivazione.
- Pipeline locale coerente con immagine, strumenti executor e catalogo; controlli significativi e confezionamento per il collaudo, senza push o nuovi servizi attivati.
- Esiti distinti fra codice/test isolati e collaudo Supervisor/VM reale; diff pertinente, documenti e punto di ripresa aggiornati.

## Avanzamento e modifiche

### Hosting e predisposizione

`pilot/haos-update.mjs` collega selettore stable, richieste client, journal persistente e adapter Supervisor già presenti. Recupera prima il journal anche se ACA è ferma, controlla richieste ogni2s e disponibilità ogni10min, applica backoff30s ai prerequisiti assenti e si arresta sul recupero transazionale non verificato. Nessuna porta pubblica o terminale remoto.

Companion candidato `acasystem_updater`, stessa immagine/versione ACA e processo distinto: manager Supervisor/Docker API, Core API disabilitata, boot manuale. Configurazione `executor-candidate/config.yaml.in` fuori dal catalogo ordinario e ZIP separato; nessuna elevazione o modifica dei privilegi del normale ACA. L'accesso Docker resta un'autorità ampia sul daemon anche con bind read-only; il limite nel codice non è un filtro di piattaforma.

`haos-provision.mjs`, `update-environment.mjs` e `prepare-haos-executor.sh` predispongono targetId/credenziale casuali privati, prima degli account personali. Default solo piano; applicazione richiede HAOS root, versioni/slug esatti e `--apply --ack-manager-docker`. Lo script non disabilita Protection mode; prima installa il companion manuale, poi si ferma se la scelta locale non è avvenuta. Copia privata con directory700/file600 e pulizia, riavvia solo ACA, verifica health/bundle/identità e stato worker. Configurazione esistente incompatibile/parziale rifiutata; un companion attivo non viene interrotto.

### Transazione, backup e pipeline

Corretta una lacuna di verifica: l'adapter Supervisor ora confronta il fingerprint precedente prima del commit, oltre a versione/digest/health/bundle. Dopo commit durevole il recupero non confronta il vecchio fingerprint per annullare nuove scritture. Un backup deve contenere SQLite integro, eventuale WAL e identità/credenziale di manutenzione della stessa installazione; vengono rifiutati anche DB corrotto con magic SQLite valido, token assente e target diverso. SQLite è controllato in una copia privata con `PRAGMA integrity_check`, senza estrarre percorsi arbitrari del tar. La credenziale ACA deve restare nel rollback locale per ripartire con autenticazione/gate: non entra in kit o release. Il token HA di servizio rimane escluso; il companion esclude segreto/runtime dai propri backup.

Prima dello stage si rilegge il catalogo; pubblicazione non ancora disponibile rinvia senza attribuire una vecchia transazione conclusa al tentativo corrente. Il `prepare` congela gli11file del runtime executor, include i moduli nell'immagine e lega l'hash a etichetta/provenienza/ZIP. Il verificatore di release controlla stessa etichetta e stesso executor nel kit. Aggiunto smoke reale dell'immagine isolata prima del push nel workflow esistente: nessun trigger remoto o controller locale attivato; canale bank e promozione stable restano distinti.

### Materiali finali

- **ACA0.9.73/app0.9.73.2** locale, descriptor `sha256:a8207b137931951e4b90a71f64f6360cb4934090d9a65022fea3df2aff3e254f`. Base .73 preesistente verificata `sha256:278cee77ce83c5e5e62d22ad95ae89aca952bdd313d48810716b692a15ae54fb`; runtime backend/frontend invariato,2010fonti/SHA`9b470e0af4c644dd2f581187ed13240e63e301670f4e6956df08d1dd12a107f6`.
- Hash runtime executor11file `a715d117c261bea8b6ff7d5afbfae6abd51357e4bf1c7cddd03b0dba3857adc2`, riletto dai byte dell'immagine e confrontato con sorgenti/provenienza/etichetta. `.73.1` conservata; le prove REP002 su quella revisione non qualificano `.73.2`.
- [Kit finale candidato](../../backup/rep091/pilot-candidate-final-r2/acasystem-pilot-candidate-0.9.73.2.zip),24file/153770746byte, SHA`4ff5f05ee2029fc9ab89fcf1614b5622d9ad0d0b97afad31a1862ec8dc332510`; [checksum esterno](../../backup/rep091/pilot-candidate-final-r2/SHA256SUMS). Include [COLLAUDO.md](../../progetto/ha-app/pilot/COLLAUDO.md), bootstrap corretto e ZIP executor SHA`f65711aef18ad7d0229f3bb7526604684baa73ba5745ba9930117610c1aae9b3`.
- Client Windows0.1.1 preesistente byte-esatto SHA`a0d1cba540832bf4fd83414163e825a08ed476a75bfef520a9a3154b8fea8ec6`, non ricompilato/riprovato nativamente qui. Kit duplicato in `progetto/ha-app/out/0.9.73.2`; sorgenti2084file e bundle inclusi con checksum. Provenienza dichiara HEAD storico e worktree dirty, senza inventare un commit contenente il lavoro.

Conservata e incorporata la correzione concorrente REP002 al bootstrap Sonoff: trasferimento via `docker exec -i` nel tmpfs Core con limite2MiB/hash/percorso/creazione esclusiva. Conservata anche la correzione PSModulePath del controller Windows. Nessuna gestione della VM da REP003.

## Verifiche ed evidenze

| Controllo | Esito | Limiti |
|---|---|---|
| Git/istruzioni/report | Eseguito | Stato iniziale sopra; nessuna mutazione del banco. |
| Node updater/packaging/provenienza/bundle | **76/76 PASS,0skip** | Windows, Sonoff originale esplicito; Engine/Supervisor simulati e SQLite temporaneo. `backup/rep091/final-node-tests-r2.log`. |
| Bootstrap corretto REP002 | **10/10 PASS,0skip** | CLI/OS isolati; receiver Python reale sul filesystem temporaneo e ZIP originale. `final-bootstrap-tests.log`. |
| Installatore Sonoff Python | **4/4 PASS** | Directory temporanee, nessun HA interrogato. `final-python-tests.log`. |
| POSIX e protocollo Supervisor su Linux | **22/22 PASS,0skip** | Node26 locale, no network, rootfs e sorgenti read-only, tmpfs256MiB,384MiB/1CPU; permessi reali, HTTP Supervisor/immagini simulati. `final-linux-tests-r2.log`. |
| Smoke immagine finale | **7/7 PASS** | Docker reale no network/read-only/tmpfs, nessun mount/socket/porta host: init privata, idempotenza, main/manutenzione/bundle/status e worker chiuso senza Supervisor. Non prova un worker con privilegi. `final-image-smoke-r2.log`. |
| Provenienza e pacchetti finali | **PASS** |11file immagine esatti,2010fonti, CRC/checksum annidati, script/client byte-esatti e bootstrap corretto nello ZIP sorgenti. `final-image-audit.json`, `final-kit-audit.json`; harness `audit-final.mjs`, `audit-kit.py`. |
| Workflow | **actionlint1.7.12 PASS** | Sintassi/contesti/grafo locale; shellcheck/pyflakes disabilitati. Esecuzione GitHub, secret, permessi e push non provati. |
| HAOS/VM/destinatario | **Non eseguito da REP003** | Collaudo separato nel REP002, riportato sotto; nessuna equivalenza dedotta dai test locali. |
| Banco | **.72/ok invariato** | Sola lettura health/inspect: stesso ID, image/start sotto; nessun backup/stop/recreate/exec/install. |

Comandi ripetibili:

```powershell
$env:ACA_TEST_SONOFF_ARCHIVE=(Resolve-Path -LiteralPath backup/rep088/bootstrap-final/SonoffLAN-v3.13.3.zip).Path
node --test progetto/ha-app/pilot/*.test.mjs progetto/ha-app/source-provenance.test.mjs progetto/ha-app/client-bundle.test.mjs
node --test progetto/ha-app/bootstrap/bootstrap.test.mjs
python -B -m unittest discover -s progetto/ha-app/bootstrap -p 'test_*.py'
node progetto/ha-app/prepare.mjs --check --version 0.9.73 --revision 2
node progetto/ha-app/pilot/smoke-executor-image.mjs --image ghcr.io/acamemo/acasystem:0.9.73.2
backup/rep091/actionlint/actionlint.exe -shellcheck= -pyflakes= -oneline .github/workflows/pilot-bank.yml
node backup/rep091/audit-final.mjs
python -B backup/rep091/audit-kit.py
```

Build finale: `node progetto/ha-app/prepare.mjs --version 0.9.73 --revision 2 --haos-version 18.4 --core-version 2026.9.4 --sonoff-archive backup/rep088/bootstrap-final/SonoffLAN-v3.13.3.zip`; log `final-wrapper-build.log`. Kit: comando nel README con client `progetto/client/windows/release/Acasystem-0.1.1-win-x64.zip`, output nuovo `backup/rep091/pilot-candidate-final-r2`; log `final-kit-build-r2.log`. Non rieseguire build su output/revisioni condivisi.

Regressione fingerprint: copia isolata della sola vecchia decisione `verifyInstalled` in `backup/rep091/fingerprint-old-decision.mjs`; `node --test '--test-name-pattern=health, bundle' backup/rep091/fingerprint-regression.test.mjs` RED su dataLoss (`updated` invece di `rolled-back`). Non è una riesecuzione dell'intera baseline originale. La suite finale passa con la verifica corretta.

Primo harness Linux con tmpfs64MiB:6fallimenti di preflight backup; la guardia richiede2×limite backup+64MiB, quindi la capacità del sandbox era insufficiente. Corretto solo l'harness a256MiB, senza indebolire la guardia prodotto;22/22 finali PASS. Primo smoke aveva7assert passate ma cleanup con exit13: attesa doppia di un figlio già terminato, corretta e rieseguita sull'immagine finale con exit0. Durante l'audit Python corretti encoding UTF-8 e mapping dei percorsi del solo harness; nessun byte dei pacchetti cambiato per assecondarlo.

### Evidenza VM distinta e limiti concreti

Letti report/evidenza selezionata di [REP002](REP-20261116-002-collaudo-vm-vergine.md), non ripetute operazioni: HAOS18.4/Core2026.11.1/Supervisor2026.11.0 nella VM nuova del PC corrente. Il bootstrap storico rifiuta correttamente Core diverso; non si amplia automaticamente la compatibilità dei materiali locali18.4/2026.9.4. Il campione idle prima di ACA/Sonoff (`backup/rep090/cold1-idle-before-aca/qualification.json`) è **RED**: Real300,330s, VirtualSync85,485s,4nuovi timer-catchup-abandoned. ISSUE-129 resta aperta; non è un risultato sul diverso PC del capo. Alla successiva chiusura REP002 registra onboarding sintetico, EXE Windows e persistenza dopo reboot PASS su **.73.1**, senza dispositivi/eWeLink reali, VM spenta/conservata e chiave SSH revocata. Questi esiti restano attribuiti al report proprietario e non certificano il nuovo executor .73.2.

## Controllo del diff e decisioni

Solo scelte esecutive necessarie al perimetro richiesto; l'hosting privilegiato resta materiale candidato fino a specifica attivazione sul target identificato. Nessuna nuova dipendenza o modifica backend/frontend, catalogo pubblico, rete o VM. Nessun commit/staging/push; diff preesistente conservato, snapshot dei file iniziali in `backup/rep091/before` e artefatti intermedi separati. Diff pertinente controllato anche con `git diff --check`.

Banco finale: container `5880dabad9da4b79db95478ec797d7b9f9b6fa82688e8ddd9cb6b6b3d58cbd2b`, immagine `ghcr.io/acamemo/acasystem:0.9.72.99`, avvio `2026-11-13T11:05:27.675591456Z`, running e health0.9.72/ok. Non si deduce dal solo health un nuovo audit dei dati; nessuna loro mutazione richiesta/eseguita qui.

Fonti primarie rilette2026-11-16: [configurazione app/privilegi](https://contributors.home-assistant.io/apps/reference/configuration/), [API app Supervisor](https://contributors.home-assistant.io/apps/supervisor-api/apps/), [rete/token fra app](https://contributors.home-assistant.io/apps/guides/communication/). Contratti runtime da provare contro la versione Supervisor effettiva; i test locali non certificano la piattaforma.

## Chiusura e punto di ripresa

Preparazione locale richiesta completata: executor collegato, hosting manuale candidato, pipeline e kit .73.2 verificati. **Non è una consegna pronta al capo né un aggiornamento automatico operativo.** Nessuna nuova approvazione chiesta per terminare i materiali locali.

Punto di ripresa: usare il kit/hash finali sopra; qualificare sul target stabilità/LAN e la combinazione HA realmente scaricata, rigenerare i vincoli quando supportati dalle prove, rendere disponibile immagine/catalogo esatti solo nel percorso successivamente autorizzato, poi predisporre il companion prima degli account e collaudare update/backup/restore reali. Start on boot resta una scelta locale dopo la prova. Pubblicazione stable, installazione sul capo e attivazione del banco restano distinte; nessuna di queste azioni è stata eseguita da REP003.

### Annotazione successiva — 2026-11-16

Il successivo [REP004](REP-20261116-004-collaudo-0732-executor-vm.md), su richiesta umana esplicita, ha collaudato .73.2 ed executor su una nuova VM. L'originale fallisce lo stop nativo; correzioni Engine/PAX e avvio hanno prodotto il candidato distinto .73.6, con update/reboot6 e ripristino dati riusciti. Recupero funzionale servizio HA e stabilità restano negativi, consegna non qualificata. Il kit .73.2 e i risultati locali di questo report sono preservati come evidenza storica; materiali e punto di ripresa correnti sono nel REP004. Banco invariato.
