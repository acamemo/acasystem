# Prova del bootstrap pubblico su VM HAOS isolata

| Campo | Valore |
|---|---|
| ID | REP-20261102-004 |
| Stato | Prova completata: difetto trovato e corretto, bootstrap r2 verificato in VM e pubblicato; limiti fisici/H24 e arresto ACPI aperti |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit locale di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | U39: «possiamo provare il bootstrap su una vm?». U38 già autorizza la pubblicazione ACA0.9.33, inclusi script e sorgenti, nel repository pubblico esistente |

## Obiettivo e perimetro

Provare lo script pubblico ACA 0.9.33 su una nuova VM VirtualBox HAOS 18.4, creata da una copia indipendente dell'immagine ufficiale pulita. Verificare download/integrità, preflight, installazione dal catalogo/GHCR, avvio, URL/QR e idempotenza. Esaminare l'accesso alla prima configurazione web senza creare account personali. Il test non riattiva il desktop come centrale e non modifica le tre VM precedenti, il checkpoint accantonato o le protezioni Windows.

Nessun nuovo hypervisor, aggiornamento dipendenze o modifica delle funzioni applicative. Il difetto emerso richiede una correzione chirurgica dello script e relativa regressione. Per distribuirla si riutilizza il consenso U38 alla pubblicazione della stessa ACA0.9.33: scelta esecutiva di aggiungere quattro asset bootstrap r2 alla release esistente, preservando gli originali, senza nuova immagine/versione server o modifiche al catalogo. Non è registrata una distinta accettazione umana del dettaglio r2. Materiali/helper/evidenze locali in backup/rep014, esclusi da Git. Le modifiche preesistenti del workspace sono preservate; nessun commit locale richiesto.

## Criteri di completamento

1. VM nuova, disco indipendente, identità/percorsi registrati; sorgente pulita e VM precedenti preservate.
2. Script e checksum scaricati dalla release pubblica e verificati; esecuzione sul vero host HAOS, senza sostituire CLI/OS con stub.
3. ACA 0.9.33 installata/avviata dal repository pubblico; health e prima configurazione web verificabili. Versioni effettive Core/Supervisor/HAOS registrate.
4. URL/QR e ripetizione idempotente verificati oppure ostacolo concreto documentato. Non attribuire a questo test affidabilità H24 o collaudo mobile fisico.
5. Arresto normale al termine, stato finale/evidenze e documentazione aggiornati; nessuna VM precedente avviata o ripristinata.

## Avanzamento e modifiche

Preflight readonly: tre VM precedenti spente; snapshot storici su HAOS 18.3 inadatti. Sorgente pulita `backup/dispositivi/haos/haos_ova-18.4.vdi`, 973.210.112 byte, SHA256 **8f42700dd2ffd5429dabde8cf70655301886ff9f3ea2010be21a989e11cda66c**, ricontrollato e corrispondente al materiale ufficiale acquisito in REP-20261030-009. VirtualBox 7.2.22 già installato; noti rallentamenti timer del banco, non risolti né oggetto di questa prova.

Fonti primarie consultate il 2026-11-02: [HAOS su Windows/VirtualBox](https://www.home-assistant.io/installation/windows/), [console host HAOS](https://contributors.home-assistant.io/os/operating-system/debugging/) (`login` dalla console CLI). La prova userà rete NAT con inoltri solo su loopback, senza cambiare rete/router o pubblicare porte Internet.

## Verifiche ed evidenze

Prima prova reale eseguita su nuova VM **915e6be2-39ee-4aee-96b1-552da67f85f9**, marcatore di proprietà e dischi indipendenti sotto backup/rep014. Inoltri solo loopback: ACA49302→3002, HA49323→80 (porta effettiva Core rilevata). Memoria2048MB: avvio2CPU con timer instabili, poi clone pulito1CPU/defaultKVM. Il primo clone è stato conservato; ACPI senza risposta e arresto forzato soltanto di questa nuova VM priva di account/dati umani. Tre VM precedenti non avviate né ripristinate.

Per RAM, Docker Desktop e soltanto i tre container del banco ACA già noto sono stati sospesi dopo registrazione ID/stato/policy in `docker-before.json`; da ripristinare al termine. Nessuna modifica a rete/router o protezioni Windows.

Al secondo boot: HAOS18.4, Core**2026.10.4**, Supervisor**2026.10.5** healthy/supportedtrue, nessuna app prima del bootstrap. Download reale dello script e dei checksum dalla releasev0.9.33 dentro il guest, SHA753e3500…426ac confermato; dry-run superato. Esecuzione pubblica: repository aggiunto, ACA0.9.33 installata e avviata, healthok; **exit1 prima del QR**, `No such container: addon_9960cdb4_acasystem`. Nessuna seconda esecuzione del materiale pubblico.

Il runtime reale usa `app_9960cdb4_acasystem`, coerente con [Supervisor2026.10.5/docker/app.py](https://raw.githubusercontent.com/home-assistant/supervisor/2026.10.5/supervisor/docker/app.py), che migra i vecchi nomi addon_. Rilevata regressione dello script: correzione locale limitata alla selezione del contenitore attivo attuale/legacy, con test che rifiuta nomi inesistenti o fermi. Non cambia installazione/account/API o architettura; materiali pubblici restano invariati durante la verifica. Evidenze originali preservate in `backup/rep014/first-public-bootstrap-failure/` e relativo audit; helper QA distinti dal codice distribuito.

HTTP reale dal PC: `/api/health`0.9.33 e `/api/setup/status`owner-required confermati. Nessun proprietario creato. La correzione è stata poi verificata come segue.

## Correzione e risultato finale

Soltanto `progetto/ha-app/bootstrap/bootstrap-haos.sh` e il suo test modificati: selezione esatta del contenitore `app_<slug>` attivo, ripiego sul `addon_<slug>` attivo precedente, errore se nessuno è in esecuzione. Nessuna scansione generica, cambio permessi o alterazione di HA/ACA. SHA dello script corretto: **814288f618a6148a6bc6f49cf547acce11c12790eda2a8ae00505a51d6e3ae5b**.

Disinstallata soltanto ACA di prova dalla nuova VM, senza account/dati personali. Il candidato, trasferito dal bridge QA e verificato per SHA prima dell'esecuzione, reinstalla ACA dal catalogo/GHCR e produce il QR; secondo avvio completato senza reinstallare o riavviare il contenitore. Il repository era già stato aggiunto dalla prima prova; prima della correzione erano presenti soltanto Matter Server e HA, **ACA era assente**. Non presentare questo secondo ciclo come HAOS/catalogo totalmente vergini.

| Verifica effettiva | Esito | Evidenza e limiti |
|---|---|---|
| Script/test di regressione | Prima **4/7**, dopo **7/7**; sintassi shell/Node e whitespace superati | `node --test progetto/ha-app/bootstrap/bootstrap.test.mjs`; output dei tool dell'agente, non salvato in un file log. Nessun test ripetuto solo per produrre log |
| Installazione corretta + ripetizione | **exit0, phase complete** | `guest-first.log`, `guest-second.log`, `guest-finished.log`; fonte indicata come candidato locale, poi pubblicato con identici byte |
| Idempotenza | Stessi ID e StartedAt del contenitore | ID880a2e4e…20b79, StartedAt2026-11-02T10:30:49.445880859Z; nessuna installazione nel secondo log |
| QR reale | Entrambi decodificati con ZXing locale, URL uguali | Pixel ricostruiti dai log ANSI, 25moduli + quietzone4; `qr-audit.json`, PNG e hash. Self-test sintetico separato e non usato come prova guest |
| API reali | Healthok0.9.33, bundle0.9.33, setupowner-required | `final-http.json`, `guest-final.log`; nessun proprietario, login o dispositivo creato |
| Webapp in sola lettura | Schermata ACA «Configura la tua casa», quattro campi vuoti, zero errori/mutazioni/richieste protette | `readonly-web-2026-11-02T10-29-43-713Z/result.json` e screenshot desktop/mobile; browser senza bridge nativo e poi chiuso, nessun collaudo Safari fisico |
| Timer del campione1CPU | Nessun GivenUp rilevato, offset finale235ns | `attempt2-final-timers.xml` e VBox.log; campione breve, Docker Desktop sospeso, non prova H24 o soluzione del problema storico |
| Originali e ambiente | Tre configurazioni VM precedenti e VDI pulito immutati, banco Docker ripristinato | `preservation-final.json`, `docker-before.json`, `docker-restored.json`; nessuna VM precedente avviata |

## Pubblicazione della revisione bootstrap

Quattro nuovi asset nella [stessa release v0.9.33](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.33), ID431297617; note aggiornate per usare r2. Originali sette asset e digest preservati; immagine, frontend, server e catalogo invariati. ZIP r2 contiene cinque file sorgenti/documenti/licenza GPL, verificati dopo decompressione. Il solo script corretto è stato provato in VM prima dell'upload; il download pubblico successivo ha identico SHA.

| Asset r2 pubblico | Byte | SHA-256 |
|---|---:|---|
| [bootstrap-haos-r2.sh](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/bootstrap-haos-r2.sh) | 5.794 | 814288f618a6148a6bc6f49cf547acce11c12790eda2a8ae00505a51d6e3ae5b |
| [BOOTSTRAP-r2.md](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md) | 8.360 | 050aafd3928d97f67c9ea5c86b97b449408f3de0c857ad0944d3d4d2f9296616 |
| acasystem-bootstrap-src-0.9.33-r2.zip | 22.838 | d69c2ca6af7073c973db98aa897f916fbbd13054ee5a868659bfb33792a6dc9f |
| SHA256SUMS-r2 | 273 | 268e77b2b5634c201be9f0f75f74e14e8369d3bf0bd610e0fff2bf933b77a1d1 |

Upload/API e quattro download anonimi con SHA riusciti; release latest invariata, ora undici asset. Evidenze `bootstrap-r2-materials.json`, `bootstrap-r2-published.json`, `bootstrap-r2-download-verified.json`, directory materiali/download r2. Nessuna credenziale salvata. Per il bootstrap operativo usare r2; il precedente asset termina prima del QR sul Supervisor2026.10.5 e rimane storico.

## Chiusura e punto di ripresa

Prova U39 conclusa e correzione distribuita. La VM di test è conservata in stato **saved**, senza esecuzione o consumo RAM guest, dopo che ACPI non ha completato l'arresto: non dichiararla poweroff o arrestata normalmente. Il comando console alternativo previsto non è stato eseguito per rifiuto della revisione automatica; usata invece la funzione nativa VirtualBox di salvataggio stato. Browser e bridge QA chiusi. Docker Desktop e gli stessi tre container iniziali sono tornati in esecuzione con identici ID/immagini/policy.

Per riprendere soltanto questo banco: avviare `ACA Bootstrap 0.9.33 - REP014` (UUID915e6be2-39ee-4aee-96b1-552da67f85f9); interfaccia di prova su `http://127.0.0.1:49302/`. Il QR contiene `http://10.0.2.15:3002/`, **indirizzo interno NAT non raggiungibile dal telefono**. Il test certifica contenuto/decodifica del QR, non connettività LAN/mobile. Una futura prova LAN richiede una configurazione di rete distinta, non applicata qui.

Restano mini PC/telefoni fisici, login/automazioni su quel dispositivo e H24. Il nuovo banco non riattiva la VM come architettura desktop; l'esperimento accantonato resta intatto. Nessun aggiornamento protezioni Windows, dipendenze o commit locale. Nessun altro lavoro avviato automaticamente dopo la chiusura.

Controllo conclusivo: undici documenti, 1.018 destinazioni locali, nessun nuovo rimando mancante/conflitto/whitespace nei file pertinenti; resta LEGGIMI → WidgetTray preesistente. Diff tracciato pertinente superato con solo avviso CRLF. ZIP checkpoint ricalcolato identico a09a8e147…eded18, HEAD locale invariato, nessuna VM VirtualBox running. Evidenza `backup/rep014/doc-final-check.json`. Il bridge loopback49400 non è più in ascolto; browser QA chiuso.
