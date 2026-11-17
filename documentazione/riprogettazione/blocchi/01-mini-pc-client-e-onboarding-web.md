# Mini PC centrale, client IP/QR e prima configurazione nella webapp

Aggiornato: 2026-11-02, richieste U37-U39. Implementazione e verifiche in [REP-20261102-002](../../reports/REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md); pubblicazione iniziale in [REP-20261102-003](../../reports/REP-20261102-003-pubblicazione-aca-0.9.33.md); prova VM e revisione bootstrap r2 in [REP-20261102-004](../../reports/REP-20261102-004-prova-bootstrap-su-vm-haos.md). Il [ritorno al mini PC](../../decisions/ADR-0031-ritorno-mini-pc-client.md) conserva il precedente esperimento VM come checkpoint separato.

**Stato corrente U39: bootstrap r2 pubblicato e provato in VM isolata.** Usare [bootstrap-haos-r2.sh](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/bootstrap-haos-r2.sh), [BOOTSTRAP-r2.md](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md) e [SHA256SUMS-r2](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/SHA256SUMS-r2). La revisione corregge la selezione del contenitore attivo `app_`/legacy `addon_`; immagine e versione ACA restano 0.9.33. I quattro nuovi asset r2, incluso l'[archivio sorgente bootstrap](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/acasystem-bootstrap-src-0.9.33-r2.zip), sono stati scaricati senza autenticazione e verificati per SHA. I sette asset originali U38 rimangono immutati e conservati. Nessun account creato nella prova; installazione fisica, mobile e H24 restano da collaudare. Il paragrafo U38 seguente conserva lo stato della pubblicazione iniziale.

**Stato U38: pubblicazione completata e download verificati.** Immagine GHCR e catalogo ACA **0.9.33** sono pubblici e verificati; la [release v0.9.33](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.33) è pubblica ed è la latest corretta. Tutti i sette asset sono stati scaricati senza autenticazione e confrontati per SHA-256. Client Windows e APK Android rimangono prodotti locali. Registrazione e accesso nella webapp sono implementati e provati sul banco isolato, ma **nessuna installazione HAOS/ACA o esecuzione del bootstrap su mini PC fisico è stata effettuata**. Il nuovo percorso richiede ACA 0.9.33 già disponibile sulla centrale; non attribuirlo a una vecchia installazione.

## Materiali locali e pubblicazione

| Materiale | Percorso | Uso e limite |
|---|---|---|
| Windows ZIP | [Acasystem-miniPC-0.9.33-win-x64.zip](../../../progetto/client/windows/release/mini-pc-client-0.9.33/Acasystem-miniPC-0.9.33-win-x64.zip) | Estrarre interamente, poi aprire Acasystem. Il nuovo pacchetto client non include il disco HAOS |
| Installatore Windows | [Acasystem-Setup-miniPC-0.9.33.exe](../../../progetto/client/windows/release/mini-pc-client-0.9.33/Acasystem-Setup-miniPC-0.9.33.exe) | Installatore locale. Runtime originale conservato; nessuna firma della distribuzione ACA o compatibilità con ogni altro PC dimostrate |
| Android | [app-debug.apk](../../../progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk) | APK debug compilato; installazione su telefono/tablet e fotocamera fisica non provate |
| Pacchetto web ACA | [acasystem-web-0.9.33.zip](../../../progetto/ha-app/out/0.9.33/acasystem-web-0.9.33.zip) | Materiale locale per la distribuzione della stessa interfaccia |
| Sorgenti ACA | [acasystem-src-0.9.33.zip](../../../progetto/ha-app/out/0.9.33/acasystem-src-0.9.33.zip) | Materiale locale per la preparazione della release/app HAOS |
| Bootstrap HAOS r2 | [bootstrap-haos-r2.sh](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/bootstrap-haos-r2.sh), [istruzioni r2](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md), [SHA256SUMS-r2](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/SHA256SUMS-r2) | Revisione operativa per HAOS 18.4, provata in VM; non eseguita su mini PC fisico |

Le versioni e gli hash conclusivi sono nel report. L'eseguibile PC/VM **0.9.31** resta nella [guida storica](01-pc-vm-prova-app.md): può ancora avviare il motore locale e non è il nuovo client del mini PC.

La [release GitHub v0.9.33](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.33) è il canale pubblico per sorgenti, bundle, manifest, script e istruzioni/checksum: conserva i sette asset originali verificati in U38 e i quattro nuovi asset bootstrap r2 verificati in U39 tramite download anonimo e SHA-256. Anche l'immagine `ghcr.io/acamemo/acasystem:0.9.33` e il [catalogo pubblico](https://github.com/acamemo/acasystem-releases/tree/main/acasystem) sono pubblici e verificati. Questo stato non equivale a un'installazione sul mini PC e non rende pubblici i pacchetti Windows/APK elencati sopra. Digest, revisione catalogo e hash conclusivi sono registrati nei report U38/U39.

## Percorso previsto sul mini PC predisposto

1. Il mini PC esegue HAOS e ACA. Il riferimento conservato è **HAOS 18.4 / Home Assistant Core 2026.10.4**, con ACA 0.9.33. L'installazione HAOS sull'hardware va completata prima del bootstrap ACA.
2. Il cliente apre ACA dal desktop, dal client Android o dal browser raggiungendo la centrale sulla stessa rete locale. Nelle distribuzioni può inserire l'IP; Android può anche acquisire il QR di collegamento.
3. Se la casa è nuova, la webapp ACA mostra **Configura la tua casa**: nome, utente, password e conferma per il proprietario. Dopo la creazione viene richiesto l'accesso personale, con doppio fattore se previsto dall'account.
4. Con la sessione amministratore si completa il nome della casa e l'onboarding. Le statistiche facoltative di HA rimangono disattivate. Solo a completamento riuscito si apre il launcher e viene accettata la sessione nell'app.
5. Un altro dispositivo raggiunge la stessa centrale e mostra l'accesso alla casa esistente. La prima registrazione non viene ripetuta e non crea una seconda centrale.

Account, verifica delle credenziali e permessi rimangono in Home Assistant. Le shell non creano proprietari e non installano l'app HAOS; mostrano la webapp condivisa dopo avere verificato il collegamento al mini PC. Un proprietario già creato, anche in seguito a una risposta persa, viene gestito tornando all'accesso anziché tentando di crearne un altro.

## Collegamento IP e QR

**Windows:** al primo avvio indicare l'IP del mini PC; la porta ACA predefinita è 3002. Una vecchia configurazione loopback viene riportata alla scelta dell'indirizzo. Il nuovo avvio non usa il flag del motore VM, non avvia VirtualBox e non installa HA. Il cambio indirizzo torna alla procedura del client.

**Android:** all'avvio senza configurazione indicare l'IP oppure scegliere la scansione QR. Anche un URL locale completo della centrale può essere acquisito come collegamento. Il client verifica la centrale prima di salvarla e aprire la webapp. Il funzionamento della fotocamera e i permessi sul dispositivo reale restano da collaudare.

In **Sistema → QR Code** sono distinti due usi:

- **Mostra QR di collegamento:** contiene soltanto `http://IP:3002/` o l'origine locale configurata. Apre ACA e richiede l'accesso sul nuovo dispositivo; non contiene password o token e non associa un account. Resta utile finché l'indirizzo della centrale rimane lo stesso.
- **Invito account o copia layout:** mantiene il percorso precedente. Il destinatario sceglie **Collega account** per la stessa casa/utente con modifiche condivise oppure **Importa layout** per una copia separata. L'invito dura cinque minuti ed è monouso. La copia tramite file nella propria ACA conserva account/casa del destinatario e richiede di ricollegare i widget ai suoi dispositivi.

Su iPhone o quando manca l'app, il QR di collegamento apre il browser. Questa possibilità è implementata, ma Safari, fotocamera e rete su un iPhone fisico non sono stati collaudati. Il collegamento attuale è LAN: il QR non attiva un accesso remoto da Internet.

## Installazione HAOS e bootstrap ACA

L'installazione del sistema HAOS e la successiva predisposizione ACA sono due fasi. Lo script operativo [bootstrap-haos-r2.sh](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/bootstrap-haos-r2.sh), corrispondente al [sorgente locale](../../../progetto/ha-app/bootstrap/bootstrap-haos.sh), è per **la console host root di HAOS 18.4 già avviato**; non scrive l'immagine HAOS su un disco e non sceglie il dispositivo o il suo indirizzo. Scaricare e verificare i materiali con `SHA256SUMS-r2` seguendo le [istruzioni r2](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md).

La procedura fa acquisire al Supervisor il repository GitHub `https://github.com/acamemo/acasystem-releases`, verifica lo slug `9960cdb4_acasystem` e richiede ACA 0.9.33 nel catalogo. Installa solo se assente, avvia solo se necessario, controlla health/versione e mostra URL/QR tramite l'helper incluso nell'immagine ACA. Il QR contiene il collegamento alla centrale; creazione proprietario e accesso restano nella webapp. Una vecchia versione pubblica o installata viene rifiutata, senza aggiornamenti o ripristini automatici.

La simulazione non chiama HA/Docker/rete e non modifica la centrale:

```sh
sh bootstrap-haos-r2.sh --ip 192.168.1.20 --version 0.9.33 --dry-run
```

L'IP è un esempio da sostituire con quello del mini PC. Procedura completa, requisiti e controlli sono in [BOOTSTRAP-r2.md](https://github.com/acamemo/acasystem-releases/releases/download/v0.9.33/BOOTSTRAP-r2.md). I test locali usano CLI/OS simulati; la prova reale successiva è limitata alla VM descritta sotto. **La pubblicazione U38 è completata e U39 aggiunge il bootstrap r2 alla stessa release**, senza sostituire i sette asset iniziali. Il passo successivo distinto è il collaudo sul mini PC identificato. Nessuna installazione fisica è implicita nel rilascio o nella prova VM.

## Verifiche e punto di ripresa

Windows: prove dai sorgenti in otto passaggi e avvio reale del nuovo pacchetto sulla procedura IP, anche con il vecchio flag VM presente. Webapp: sette passaggi con backend reale e HA Container ufficiale 2026.10.4 isolato, dalla creazione proprietario al launcher e al login da un secondo browser. MFA/login hanno verifiche software dedicate; non è stato attivato un secondo fattore su un account fisico durante questa prova. Il QR di collegamento è stato decodificato da un PNG reale usando un endpoint fixture del contratto Android; la raggiungibilità LAN fisica non è dimostrata da quella decodifica.

U39 ha provato il bootstrap su HAOS **18.4**, Core **2026.10.4**, Supervisor **2026.10.5**, nella nuova VM isolata con **1 CPU e 2 GB RAM**, dopo il blocco dei timer con 2 CPU. La prima esecuzione pubblica aveva installato ACA ma falliva prima del QR per il prefisso del contenitore. La revisione r2 ha installato ACA da assente e la seconda esecuzione ha conservato ID e istante di avvio del contenitore; entrambi i QR ANSI sono stati decodificati con ZXing. Il repository era già stato aggiunto dalla prima prova: non è una seconda prova dell'intero sistema pulito. La UI readonly mostrava **Configura la tua casa**, senza interfaccia HA o richieste protette; stato finale `owner-required`, nessun account creato. Il QR `http://10.0.2.15:3002/` appartiene alla rete NAT della prova: **non permette al telefono sulla LAN di raggiungere la VM**. Il PC usava un inoltro soltanto loopback.

La VM di prova `915e6be2-39ee-4aee-96b1-552da67f85f9` è conservata in stato **saved**, dopo ACPI senza risposta: non è uno spegnimento normale. Docker Desktop e i tre container del banco sono stati ripristinati; le VM precedenti non sono state toccate. Evidenze e limiti in [REP-20261102-004](../../reports/REP-20261102-004-prova-bootstrap-su-vm-haos.md).

Restano da verificare mini PC fisico, installazione HAOS/bootstrap su hardware, Android/iPhone e fotocamera, firma/consegna su altri PC e uso H24. L'identità di servizio/facciata dispositivi non è certificata dalla prova di registrazione/login: il backend QA isolato U37 non aveva la predisposizione dei segreti HAOS. Dettagli nel [report U37](../../reports/REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md). La prova VM U39 non riattiva il desktop come centrale e non certifica affidabilità continuativa.

L'esperimento VM resta nel checkpoint `backup/checkpoints/2026-11-02-pc-vm-accantonato/`, con [conservazione documentata](../../reports/REP-20261102-001-ritorno-mini-pc-e-accesso.md). Sorgenti, disco operativo, clone VMDK e vecchi pacchetti non vanno sovrascritti per usare questa consegna. Nessuna ripresa automatica del filone VM o richiesta Broadcom è necessaria.
