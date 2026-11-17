# Collaudo reale del pilota su VM HAOS vergine

| Campo | Valore |
|---|---|
| ID | REP-20261116-002 |
| Stato | Collaudo concluso; esito funzionale positivo, piattaforma non qualificata |
| Data | 2026-11-16, Europe/Rome |
| Autore/modello | Codex; identificativo esatto non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «se vuoi collaudare fallo» |
| Autorizzazione | Collaudo reale del candidato con nuova VM VirtualBox isolata su questo PC, dopo scelta umana VirtualBox. Preparazione dei materiali e correzioni necessarie al collaudo incluse; nessuna pubblicazione o modifica delle VM storiche/banco dedotta. |

## Perimetro e criteri

Ripresa degli artefatti del [REP001](REP-20261116-001-consegna-pilota-con-subagenti.md).916voci Git preesistenti, preservate. Il coordinatore gestisce soltanto la nuova VM; tre subagenti verificano bootstrap/versioni, protocollo di staging e misure di stabilità. Stesso stack; skill surgical-coding già applicata se emergono correzioni.

- Nuova copia da ZIP ufficiale HAOS18.4/VDI verificato, disco64GiB e identità nuove; niente dati o dischi del banco.
- Boot/Core/Supervisor effettivi, rete bridge e accesso LAN; riscontro dei timer in idle, senza sonde che mascherino ISSUE-129.
- Predisposizione SonoffLAN originale e immagine ACA candidata esatta, via staging esplicitamente locale finché il catalogo pubblico non contiene .73.1. Distinguere il collaudo dei byte del prodotto dal download/installazione del catalogo di produzione.
- Prima configurazione pulita e verifiche di frontend/API/persistenza; nessun comando su dispositivi fisici né uso di credenziali eWeLink del banco.
- Arresto ordinato, revoca della chiave temporanea e stato finale della VM documentati; nessun cambio di protezioni host o disattivazione Hyper-V/VBS.

## Preparazione osservata

Inventario reale: VirtualBox7.2.22r175245, tutte le quattro VM storiche spente. Windows11Home,15,7GiB RAM con circa2,8GiB liberi al controllo;309GiB disco liberi. Il test userà inizialmente **2048MiB/2CPU**, minimo ufficiale HA, invece dei4GiB previsti sul destinatario32GiB: la pressione di memoria e la differenza dal target saranno riportate. Banco ACA .72 e HA Container rimangono accesi. Bridge sulla sola scheda Wi-Fi attiva, nessuna modifica dell'adattatore host.

Nome previsto `ACA-Pilot-REP090-20261116`, directory nuova sotto `%LOCALAPPDATA%/ACA-System/Collaudi/REP20261116-002`; niente sovrascrittura/adottazione di oggetti esistenti. CONFIG con sola chiave pubblica unica; chiave privata e output sensibili restano fuori Git e dalla chat.

Fonti primarie consultate il16novembre2026: [HAOS Windows](https://www.home-assistant.io/installation/windows/) per2GiB/2CPU/UEFI/bridge, [CONFIG HAOS18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/sbin/haos-config). Il VDI deve corrispondere al digest in `haos-virtualbox-image.json`.

## Verifiche ed evidenze

All'apertura boot e installazione erano ancora da eseguire. Le sezioni seguenti registrano le prove effettive; evidenze selezionate sotto `backup/rep090/`.

### Primo avvio reale

ZIP VDI560370635byte/SHAe46c3b9b… verificato; nuova copia VDI con UUID distinto, portata a64GiB. CONFIG FAT16 da32MiB contiene la sola chiave pubblica, filesystem controllato con dosfstools4.2/mtools in container temporaneo; nessun volume o chiave privata del banco montati. Chiave privata del collaudo generata in `.setup` con ACL dell'operatore, mai mostrata.

Primo tentativo `modifymedium` sulla copia in LocalAppData rifiutato da VirtualBox con `VERR_PATH_NOT_FOUND` nonostante lettura diretta/header validi. La copia collocata nella directory ignorata `backup/rep090/vm-owned/` è leggibile dal servizio VirtualBox; nessuna variazione di protezioni o ACL globali per aggirare l'errore. Il motivo preciso della differenza di visibilità non è accertato. I dischi e la configurazione effettivi del test sono quindi sotto quella directory, non LocalAppData.

Nuova VM UUID `b8b25020-fa83-432b-9e08-586929c88f06`, avviata headless alle14:58:30 Europe/Rome,2048MiB/2CPU/UEFI/bridge. Storiche non avviate. Boot arrivato a CLI/console; IP LAN192.168.1.76 letto dalla console. Accesso root di predisposizione verificato tramite console seriale host-only e chiave host pubblica, poi SSH22222 con `StrictHostKeyChecking=yes`; nessuna adozione automatica della chiave da rete. CONFIG importata con `ha os import`; creato l'hostkey ed25519 nel solo nuovo guest perché assente, prima del pinning.

Versioni lette realmente via SSH: **HAOS18.4, Core2026.11.1, Supervisor2026.11.0**, Supervisor healthy/supported true. Il Core usa **HTTP80**, osservato in `core info`:8123 reindirizza con307 verso80. `/api/onboarding` HTTP200 con quattro step `done:false`; `/auth/providers` HTTP400 `onboarding_required`. Non sono stati creati utenti in questa fase.

SMBIOS/DMI del guest `2050b2b8-83fa-2b43-9e08-586929c88f06`: i primi tre campi hanno ordine byte differente dall'UUID VBox. La guardia del test ha prima rifiutato il confronto grezzo (exit97); il valore DMI è stato letto e registrato separatamente e viene ora verificato esattamente, senza togliere il controllo d'identità.

Il vero `Invoke-AcaBootstrap.ps1` con i materiali originali .73.1/Core2026.9.4 rifiuta il Core2026.11.1 **prima del trasferimento/installazione**; risultato in `backup/rep090/stock-kit-core-mismatch.json`. Il primo harness di asserzione attendeva una formulazione diversa dell'errore ed è stato corretto; il rifiuto del prodotto era già corretto. Nessun downgrade effettuato. Lo staging successivo mantiene copie originali e dichiara esplicitamente Core osservato e registry OCI loopback nella sola VM.

### Stabilità: esito negativo prima di installare ACA/Sonoff

Harness `backup/rep090/qualify-vm.mjs`,7test locali/parser PASS, target UUID/DMI/chiave host espliciti. Primo snapshot e inizio idle già mostrano una deriva: in66,543s Real/66,550s uptime, VirtualSync avanza20,660s. Dato indipendente in `pre-idle-clock-comparison.json`.

**Misura idle reale300s,15:19–15:24 Europe/Rome, FALLITA.** VM headless, nessuna richiesta HTTP/SSH/console/debugger o tick di test nel periodo centrale; i progressi ogni30s sono soltanto host. Registry di fixture fermo quanto a richieste, Core/Supervisor normali; ACA e Sonoff non ancora installati. Due sonde ai soli confini, con finestre temporali registrate.

| Metrica | Delta osservato |
|---|---|
| Real |300,330s |
| Virtual |300,330118s |
| Uptime guest |300,370s |
| VirtualSync |**85,484937s (28,46%)** |
| GivenUp |+240,013s; contatore cumulativo, distinto dal deficit VirtualSync |
| Eventi nuovi |4timer-catchup-abandoned, prefisso VBox.log invariato |
| Identità/boot/config |Invariati; servizi monitorati active/running,0restart |

Risultato in `backup/rep090/cold1-idle-before-aca/qualification.json`, riletto indipendentemente dal subagente senza interrogare il guest. Conferma della regressione **ISSUE-129 nella nuova VM su questo PC**, non prova che ogni host VirtualBox sia guasto né identifica la causa. Minimo2GiB, Windows11Home/hypervisor e differenza dal destinatario32GiB sono limiti espliciti. La combinazione non è qualificata idle/H24; non si ripete un campione per nascondere il RED e non si disattivano protezioni host.

### Staging locale: tentativi iniziali

Materiali verificati in `backup/rep090/staging-local-v1/`, trasferiti soltanto nel nuovo guest `/mnt/data/aca-rep090`. Registro OCI2.8.3 vincolato al127.0.0.1:5000 interno alla VM; immagine ACA .73.1 byte-esatta,19RootFS diffID e sorgenti verificati. Catalogo locale `local_acasystem`, permessi del config di produzione preservati, sola riga image diversa. Nessun push pubblico o modifica al catalogo GitHub. Schema nativo Supervisor2026.11.0 passato prima delle mutazioni.

Il primo tentativo si è fermato prima di Sonoff/ACA perché la fixture controllava `.version`, mentre il catalogo reale non installato espone `.version_latest` e `.version:null`: corretta la sola fixture, non il bootstrap prodotto che già gestisce tale campo. Un secondo tentativo incontra timeout CLI su reload dello store; la rilettura mostra comunque la candidata esatta disponibile e Supervisor healthy/supported true. Nessuna attribuzione causale del timeout ai timer senza prova; niente ripetizioni cieche di operazioni incerte. Ripresa prevista con controllo catalogo già esatto prima di richiedere un nuovo reload globale.

### Difetto reale del bootstrap e correzione

Il trasferimento Sonoff con `docker cp` falliva nella directory temporanea di Core, mentre due `docker exec` consecutivi ne confermavano l'esistenza. `HostConfig.Tmpfs` mostra `/tmp`; Core non era stato riavviato. Docker documenta l'impossibilità di usare `cp` per questi mount: [corner cases ufficiali](https://docs.docker.com/reference/cli/docker/container/cp/#corner-cases), riscontro sul [Supervisor 2026.11.0](https://github.com/home-assistant/supervisor/blob/2026.11.0/supervisor/docker/homeassistant.py), consultati il 16 novembre 2026. Riproduzione in `docker-tmpfs-copy-regression.txt`; non attribuita ai timer.

Correzione circoscritta a `progetto/ha-app/bootstrap/bootstrap-haos.sh` e relativo test: stream binario con `docker exec -i`, ricevitore nel namespace Core, SHA-256 originale verificato prima della scrittura, limite 2 MiB, directory temporanea verificata e apertura esclusiva `xb`. Archivio Sonoff originale 124.522 byte, SHA `f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532`; installer e pin non modificati. Dieci test bootstrap PASS, compresi byte esatti dell'archivio originale, hash/percorso errati, quota e fallimento del trasferimento prima dell'installazione; quattro test Python installer PASS. La fixture contiene lo stesso ricevitore verificato byte per byte.

Separata correzione minima a `pilot/bank-update.mjs` e test: il processo Windows PowerShell 5.1 eredita `PSModulePath` di PowerShell 7 e non carica `Get-Acl`. Il figlio ora riceve il percorso dei soli moduli di sistema 5.1; controlli ACL/owner invariati. Dieci test dedicati PASS. Nessuna attivazione del controller o modifica al banco da questa correzione.

### Installazione locale e onboarding: PASS

`staging-install-r4.txt` e `local-qualification-result.json`: installazione Supervisor della candidata **ACA 0.9.73/app 0.9.73.1**, SonoffLAN originale **3.13.3**, 14 moduli importabili. Verificati 19 RootFS diffID, health, manifest e archivio bundle servito. Immagine nativa/manifest OCI `sha256:175af57657d9a9b30535ca225569eb2d9d0ecf7c406c55e8ac710c0c074e4c3a`; runtime da 2.010 fonti/SHA `9b470e0af4c644dd2f581187ed13240e63e301670f4e6956df08d1dd12a107f6`. Il subagente ha ricalcolato indipendentemente gli SHA degli archivi ACA, registry e Sonoff dai soli file host. Nessun pull dal catalogo pubblico o push dedotto: il repository pubblico è ancora distinto dalla fixture locale.

Pristine reale concluso alle **15:45:50 Europe/Rome**, prima dell'onboarding alle 15:45:51: Core senza owner, ACA `owner-required`, SQLite integro e 14 conteggi personali a zero. Il primo probe RED è conservato: cercava il container del repository pubblico, non `app_local_acasystem`. Corretto il solo harness con target esplicito e schema atteso; 8 test locali PASS, rilettura reale PASS in `cold1-aca-pristine-retry/qualification.json`. Dopo l'onboarding la VM **non è più vergine**.

`onboarding-aca-observed-r3.json`: creazione e accesso del solo owner sintetico, setup `ready`, servizio locale amministratore attivo, un owner e un servizio fra gli utenti non di sistema. Catalogo Sonoff e form con password mascherata verificati; flusso annullato, nessuna entry Sonoff prima/dopo. Nessuna credenziale eWeLink inviata. Core reale **2026.11.1**, `coreMarkedVerified=false`: il PASS funzionale non certifica questa versione né rende valido il kit produzione fissato a 2026.9.4.

Due problemi del solo QA sono stati risolti senza indebolire le guardie: il percorso AppData è rediretto dal pacchetto MSIX (usato il `realpath` canonico con ACL owner-only) e il figlio PowerShell 5.1 richiede il proprio percorso moduli. La redirezione spiega la differenza fra alias e percorso canonico; non è una misura indipendente della visibilità del servizio COM VirtualBox.

### App desktop e persistenza: PASS circoscritto

Eseguito il vero `progetto/client/windows/release/win-unpacked/Acasystem.exe` **0.1.1**, con `--user-data-dir` nuovo sotto `backup/rep090/ui-native/.setup`, ACL owner-only e verifica reale di `app.getPath(userData/sessionData)` prima del login. Collegamento IP alla sola nuova VM, download bundle .73, accesso con account sintetico e creazione di un solo profilo `PrincipaleTest`. Nessun comando HA o attuatore; zero errori pagina e richieste di comando bloccate.

Il primo screenshot aveva Trova dispositivi aperto sopra la Home: la prima asserzione dimostrava soltanto il launcher montato, non la Home in primo piano. Corretto il solo probe per chiudere il pannello con il relativo Indietro e verificare il contenuto effettivamente in primo piano. Due test QA PASS, anche con modale sovrapposto/profili duplicati simulati. Rilettura reale `ui-native-observed-r2/ui-native-observed.json` **PASS** e PNG ispezionato: Home pronta, 9 pagine e 32 contenitori/preset, **non 32 dispositivi configurati**. Le evidenze R1 non sono riscritte.

Riavvio del solo add-on, poi riavvio completo del guest tramite `ha host reboot`: boot ID distinto e ACA avviata automaticamente con `boot:auto`, senza start manuale. Il primo controllo a 45 secondi era ancora negativo; Core e poi ACA risultano avviati rispettivamente alle 15:57:19 e 15:57:34 Europe/Rome. Nessuna promessa di avvio istantaneo. Confronti SQLite read-only prima/dopo **ciascun riavvio**: 13 tabelle personali selezionate, conteggi e SHA delle righe esatti, integrità `ok`, un profilo conservato. Evidenze `persistence-*-aca-restart.json`, `persistence-*-vm-reboot.json`, `before/after-vm-reboot-state.txt`. Non è un confronto di tutte le tabelle tecniche del database.

API ripetuta dopo entrambi i riavvii PASS: stesso owner, servizio attivo, zero flussi/entry Sonoff. App desktop R2 dopo il reboot PASS con profilo conservato; nessuna copia di account/profili dal banco. Test di dispositivi fisici, eWeLink personale, iPhone/Android, aggiornamento reale/rollback e qualifica prolungata non eseguiti.

### Chiusura effettiva e punto di ripresa

- Chiave temporanea rimossa da `authorized_keys` per corpo base64, indipendentemente dal commento. Nuova connessione SSH rifiutata con exit 255/`Permission denied (publickey)` mentre Dropbear era ancora attivo (`ssh-key-denial.json`).
- `systemctl disable --now` rifiutato dal filesystem HAOS read-only: nessuna rimonta o modifica delle protezioni. Stop e maschera **runtime** riusciti, `inactive/masked-runtime`, zero listener 22222 prima dell'arresto. Non è una disabilitazione permanente del servizio.
- Registry di fixture già fermo dopo il reboot, policy `no` e `Running=false` osservati; nessun container o immagine del banco gestito.
- Arresto ordinato del solo guest; console seriale termina con `EPIPE` perché la VM si spegne, stato VBox `poweroff` e log `POWERING_OFF → OFF` verificati alle **16:01:36 Europe/Rome**. CONFIG scollegata dalla sola porta SATA1 della nuova VM e seriale disabilitata. VM/dischi preservati, tutte le VM VBox spente.
- Revisione automatica ha bloccato il comando combinato finale comprendente cancellazione della chiave privata: non eseguito. Chiusura completata con operazioni reversibili separate, senza cancellazioni. Chiave privata ormai revocata e credenziali/sessioni sintetiche restano nelle directory QA protette, escluse da Git e dal kit; non usare questa VM come immagine da consegnare.
- `final-cleanup.json`: banco originale **.72/ok**, stesso ID `5880dabad9da…` e stesso avvio `2026-11-13T11:05:27.675591456Z`; nessun aggiornamento o trasferimento dati al destinatario. Nessun commit o pubblicazione.

La chat dedicata installer/update lavora parallelamente a un candidato **.73.2** e a un companion separato: file preservati, non installati o qualificati da questo collaudo. Comunicati difetto tmpfs, correzione ed esito timer; i risultati qui valgono esclusivamente per l'immagine .73.1 identificata sopra. Il vecchio kit r2 .73.1 non viene dichiarato corretto o pronto dopo la sola modifica degli script nel repository.

**Esito:** collaudo richiesto concluso con successo funzionale ACA/Sonoff/bootstrap corretto, ma **qualifica piattaforma negativa** per ISSUE-129 già prima dell'installazione. Nessuna consegna al capo come centrale affidabile. Riprendere da una qualifica del suo host effettivo o da un rimedio ripetibile, poi prova reale con dispositivi e rete del destinatario e pubblicazione dei byte qualificati. Non cambiare hypervisor, protezioni o pin per iniziativa propria.
