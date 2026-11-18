# Piano dell'installer automatico per la centrale in VM

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261117-002 |
| Stato | Piano proposto; implementazione non autorizzata né avviata |
| Data | 2026-11-17, Europe/Rome |
| Autore / modello | Claude Code, Claude Opus 5.5 |
| Commit di partenza | `c8b03a0` più le modifiche documentali non committate del REP-20261117-001 |
| Richiesta | «la strada più automatica senza che un utente debba toccare niente?», poi «Prima l'installer» |
| Autorizzazione | Pianificazione. Il kit attuale resta invariato. Cambiare il percorso «VirtualBox con VM creata dall'utente» (REP-20261116-001) richiede una decisione umana esplicita sulle scelte D1–D6. |

## Obiettivo

Su un PC Windows 11, un solo avvio dell'installer con una sola conferma di amministratore (UAC, che Windows non permette di saltare) porta a una centrale HAOS + SonoffLAN + ACA funzionante e stabile, che si riavvia da sola con il PC. Nessun passaggio in VirtualBox, nessun supporto USB, nessun comando in console.

Base tecnica: REP-20261117-001, cioè risveglio periodico via COM superato su due avvii a freddo, ed eccezione EcoQoS.

## Situazione attuale del kit

`Start.cmd` → `Start-AcaVirtualBoxSetup.ps1` prepara il VDI verificato e la chiave temporanea. L'utente deve poi:
1. installare VirtualBox;
2. creare la VM (EFI, CPU, RAM, disco, ridimensionamento a 64 GiB, bridge);
3. importare la chiave pubblica tramite un supporto `CONFIG` o la console;
4. leggere alla console l'IP e la chiave host SSH e incollarli nel launcher;
5. decidere da solo sospensione e avvio automatico.

Il bootstrap (`Invoke-AcaBootstrap.ps1`) poi installa da solo tramite SSH.

## Passi automatici proposti

| # | Passo | Come, con strumenti già presenti | Stato tecnico |
|---|---|---|---|
| 1 | Elevazione unica | Manifest/relaunch con `RunAs`; tutto il resto nella stessa sessione elevata | Standard |
| 2 | VirtualBox | Se assente: installazione silenziosa della versione congelata 7.2.22 (installer con impronta verificata). Se presente in un'altra versione: fermarsi e segnalare, senza aggiornare o declassare | Da provare: il prompt di fiducia del driver Oracle va pre-autorizzato o accettato dall'utente |
| 3 | EcoQoS | `powercfg /powerthrottling disable /path` per `VBoxHeadless.exe` e `VirtualBoxVM.exe` | Provato a mano oggi |
| 4 | Creazione VM | `VBoxManage createvm/modifyvm/storagectl/storageattach/modifymedium --resize 65536`: EFI, 2 vCPU, RAM D5, SATA, NIC 82540EM bridge sulla scheda della route predefinita, MAC fissato e registrato | Comandi standard, da scrivere e collaudare |
| 5 | Chiave di bootstrap senza USB né console | Disco virtuale `CONFIG` creato con `diskpart` (VHD, FAT, etichetta CONFIG) contenente solo `authorized_keys`, collegato alla VM come secondo disco SATA al primo avvio, poi `ha os import` | **Da verificare:** HAOS documenta il supporto USB; il riconoscimento di un disco virtuale con etichetta CONFIG va provato |
| 6 | IP della VM | MAC noto → ricerca nella tabella ARP dopo uno sweep della /24 locale; in alternativa `homeassistant.local` | Da scrivere |
| 7 | Chiave host SSH | Vedi D2 | Decisione |
| 8 | Bootstrap | `Invoke-AcaBootstrap.ps1` invariato, con IP e chiave host passati dal passo precedente; poi rimozione del disco CONFIG e revoca della chiave come oggi | Esistente |
| 9 | Supervisore della centrale | Script unico che avvia la VM headless se spenta, esegue il risveglio COM ogni 100 ms, si ricollega se VBoxSVC riparte, ruota i log e tiene sveglio il PC finché la centrale gira (D4) | Prototipo del risveglio provato; il resto da scrivere |
| 10 | Avvio con il PC | Vedi D3 | Decisione |
| 11 | Spegnimento di Windows | HAOS ignora il pulsante ACPI: alla chiusura il supervisore esegue `savestate`, oppure `ha host shutdown` tramite SSH, se una chiave di servizio resta (D6) | Da provare |
| 12 | Disinstallazione | Rimozione dell'attività pianificata, delle eccezioni powercfg e della VM (dati inclusi solo dopo conferma esplicita) | Da scrivere |

## Decisioni richieste all'utente

- **D1, VirtualBox:** l'installer lo installa da solo (nel pacchetto, circa 120 MB, oppure scaricato con impronta verificata), oppure resta un prerequisito? Cosa fare se è già installata un'altra versione?
- **D2, chiave host SSH:** oggi va letta alla console, che è sicuro ma manuale. In automatico la scelta è accettarla al primo collegamento sulla LAN privata (TOFU) nei minuti successivi al primo avvio. Il rischio residuo è un attaccante già presente sulla LAN in quel momento.
- **D3, avvio automatico:** all'accesso dell'utente Windows (semplice, ma serve il login) oppure all'avvio del PC senza login (servizio o attività con credenziali salvate, più fragile e più delicato da gestire).
- **D4, sospensione:** il supervisore impedisce la sospensione del PC finché la centrale gira (`SetThreadExecutionState`, senza cambiare il piano energetico), oppure si lascia decidere all'utente?
- **D5, RAM della VM:** il kit dice 4096 MiB; le prove di oggi sono a 2048 MiB.
- **D6, accesso di servizio:** mantenere una chiave SSH di servizio per lo spegnimento ordinato e la manutenzione, oppure revocarla come oggi e usare solo `savestate`?

### Risposte dell'utente, 2026-11-17

- **D1:** «Resta prerequisito». VirtualBox lo installa l'utente; l'installer verifica la versione e si ferma se manca. Il passo 2 diventa un controllo.
- **D2:** «Accetta al primo avvio». La chiave host viene accettata al primo collegamento dopo il primo avvio della VM nuova e poi fissata nel checkpoint.
- **D3:** «non saprei». Resta aperta. Proposta: all'accesso a Windows, perché non richiede credenziali salvate; da rivedere dopo la prova sul PC del capo.
- **D4:** «Decide l'utente». Il supervisore non impedisce la sospensione. Va provato che dopo la ripresa dalla sospensione la VM e il risveglio ripartano da soli; la guida deve dire che, con il PC in sospensione, la centrale non risponde.
- **D5, D6:** non ancora chieste. Valori provvisori: 4096 MiB come indicato dal kit (da riverificare con il risveglio); chiave di servizio revocata come oggi, con spegnimento tramite `savestate`.

## Prova di fattibilità del passo 5, 2026-11-17

Richiesta: «Sì, procedi». Le sessioni precedenti avevano già usato un disco CONFIG virtuale (REP-20261116-002 e seguenti: FAT16 creato con dosfstools/mtools in un container, poi `ha os import` e lettura della chiave host dalla console seriale). Su un PC cliente non ci sono né Docker né quegli strumenti, quindi è stata provata direttamente la console seriale pilotata da PowerShell, senza disco CONFIG.

Sulla VM REP092, con il risveglio attivo:
- `modifyvm --uart1 0x3F8 4 --uart-mode1 server \\.\pipe\aca-rep097`, cioè pipe locale non esposta in rete; client .NET `NamedPipeClientStream` (prototipo in `backup/rep096-ecoqos/serial-console-prototipo.ps1`);
- prompt `homeassistant login:`, accesso `root` senza password, comandi incorniciati da marcatori e codice di uscita;
- stato iniziale: `authorized_keys` vuoto (SHA `e3b0c442…`), dropbear inattivo ma abilitato, chiave host presente;
- chiave Ed25519 di prova scritta in `/mnt/boot/CONFIG/authorized_keys`, poi `ha os import`: «Command completed successfully»; HAOS ha rimosso la cartella da solo, la chiave è stata importata e dropbear è partito;
- chiave host letta con `dropbearkey -y` e IP letto con `ip -4 addr` sulla stessa seriale;
- `ssh -p 22222` con `StrictHostKeyChecking=yes` e chiave host fissata: riuscito (HAOS 18.4, Core 2026.11.1); con una chiave host diversa: rifiutato (exit 255);
- ripristino: `authorized_keys` di nuovo vuoto (stesso SHA), dropbear fermo, SSH rifiutato, VM spenta, UART `off`, risveglio fermato tramite il suo PID, chiave di prova cancellata.

Difetto del prototipo emerso e corretto: un secondo collegamento subito dopo il primo andava in timeout (VirtualBox libera la pipe con qualche secondo di ritardo) e gli errori non interrompevano lo script. Ora ci sono riconnessione con ritentativi e `ErrorActionPreference = 'Stop'`; il controllo sintattico passa, la riesecuzione non è stata fatta.

**Effetto sul piano:** il passo 5 non richiede un disco CONFIG né `diskpart`; i passi 6 e 7 (IP e chiave host) si leggono dalla stessa console. La chiave host risulta quindi **verificata**, non accettata al primo collegamento: la scelta D2 «accetta al primo avvio» non serve più, ma resta valida come ripiego. Resta da provare su una VM vergine al primo avvio (dove la chiave host va generata) e con la seriale collegata solo durante l'installazione.

## Supervisore della centrale, 2026-11-17

Richiesta: «Sì, supervisore». Nuovi file nel kit, non ancora collegati a `Start.cmd`, `prepare-pilot.mjs` o allo ZIP del kit:
- `progetto/ha-app/pilot/Start-AcaCentralSupervisor.ps1`: istanza unica per VM (mutex `Local\`); stato letto con `showvminfo` ogni 5 s; avvia la VM headless se `poweroff` al primo controllo oppure `saved`/`aborted`/`abortedsaved`; non la riavvia dopo uno spegnimento voluto dal guest; attesa tra i tentativi falliti da 10 a 300 s. Risveglio COM ogni 100 ms con riapertura della sessione se fallisce. Alla chiusura della sessione Windows una finestra nascosta (thread STA) riceve `WM_QUERYENDSESSION`/`WM_ENDSESSION`, chiede tempo con `ShutdownBlockReasonCreate` e il supervisore esegue `controlvm savestate` prima di uscire. Log con rotazione a 1 MiB. Non modifica configurazione, rete, protezioni o piano energetico.
- `progetto/ha-app/pilot/central-supervisor.test.ps1`: 11 controlli sulle funzioni pure (azioni per stato, attese, rotazione). **PASS su PowerShell 5.1**; PowerShell 7 non è installato su questo PC, quindi non eseguito.

Collaudo reale sulla VM REP092 (log in `backup/rep096-ecoqos/supervisore/`):

| Scenario | Esito |
|---|---|
| VM spenta, avvio del supervisore | VM avviata dopo 4 s, HTTP dopo 36 s |
| Crash simulato (terminato il processo VBoxHeadless avviato dal supervisore) | stato `aborted` rilevato, VM riavviata dopo 5 s, HTTP tornato dopo 37 s |
| Chiusura sessione simulata (messaggi Windows inviati alla finestra del supervisore) | `savestate` exit 0 in 6 s, stato `saved`, supervisore chiuso |
| Riavvio del supervisore con VM salvata | ripresa dallo stato salvato, HTTP dopo 11 s, ACA 3002 e Observer 200 |

Errore di lancio emerso: `Start-Process -ArgumentList @(...)` in PowerShell 5.1 non mette tra virgolette i percorsi con spazi. L'installer deve passare una stringa con i percorsi già tra virgolette.

Limiti: lo spegnimento reale di Windows non è stato provato, perché avrebbe spento il PC dell'utente. Va verificato che Windows non termini VBoxHeadless prima del salvataggio e che, con riavvii forzati come quelli di Windows Update, i 120 s richiesti siano concessi. Il ripristino dopo la sospensione del PC (D4) è stato osservato una sola volta, in modo non pianificato, durante la prova notturna (vedi sotto).

## Prova notturna con il supervisore, 2026-11-17/18

Configurazione: VM REP092 `5c2409fa-…`, VirtualBox 7.2.22 in NEM, eccezione EcoQoS per VBoxHeadless, supervisore `Start-AcaCentralSupervisor.ps1` (intervallo 100 ms) al posto del prototipo, nessun intervento manuale. Ogni ciclo (circa 49 min): idle 1800 s con `Test-AcaVirtualBoxStability.ps1` senza sonde, tagli del link di 60 e 120 s con attesa del ritorno HTTP, 15 min di disponibilità con una richiesta ogni 30 s a `/manifest.json`. Evidenze in `backup/rep096-ecoqos/notte/` (`riepilogo.txt`, `parte1/idle-01..04.json`, `idle-01..07.json`) e nel log del supervisore in `backup/rep096-ecoqos/supervisore/`.

La prova è stata interrotta alle 00:47 dopo 4 cicli completi e riavviata con fine alle 07:00, su richiesta dell'utente, che doveva uscire prima delle 08:00; il ciclo 5 appena avviato è stato scartato.

| Controllo | Esito, 11 cicli (21:31–06:37) |
|---|---|
| Idle 1800 s | 11/11 PASS; VirtualSync tra 1800,067 e 1800,111 s contro 1800,063–1800,115 s dell'host, nessun avviso |
| Taglio link 60 s | 11/11 recuperati in 8 s |
| Taglio link 120 s | 11/11 recuperati in 8 s |
| Disponibilità HTTP | 330/330 risposte |
| Supervisore | 289.676 risvegli all'ultimo rapporto, 0 errori fino allo spegnimento |

Evento non pianificato: alle 04:00:44 l'host è entrato in sospensione S3 (Kernel-Power 42, motivo 7), perché il timeout di sospensione su rete elettrica era già stato riportato a 3 ore. VirtualBox ha messo in pausa la VM (`running -> paused`). Alle 04:07:45 l'host si è riattivato (sorgente: controller USB) e la VM è tornata `running` da sola. Il ciclo 4 della seconda parte è durato circa 7 min in più, perché anche lo script di prova era sospeso. I cicli 5–7 successivi sono tutti PASS. Valutazione: la ripresa dopo una sospensione breve funziona senza azioni del supervisore, ma un singolo episodio di 7 minuti non copre sospensioni lunghe, l'ibernazione né il riallineamento dell'orologio del guest, che non è stato misurato.

Chiusura: alle 06:37 spegnimento ordinato con `ha host shutdown` digitato sulla console video; la VM è passata a `poweroff` in pochi secondi. Il supervisore ha registrato `running -> poweroff` e, come previsto, non l'ha riavviata. Poi è stato fermato con il suo PID 41368.

## Rischi noti

- Il risveglio sfrutta un comportamento interno di VirtualBox (le richieste al debugger eseguite sul thread EMT): per questo la versione 7.2.22 va congelata e ogni aggiornamento va riprovato.
- Due avvii brevi superati non sostituiscono la prova lunga né la prova sul PC del capo (Windows Pro, hardware diverso).
- VirtualBox con bridge sul Wi-Fi: va verificato il multicast/mDNS per la discovery dei dispositivi.
- Il primo avvio di HAOS 18.4 può scaricare un Core diverso dal pin: resta valido quanto scritto in VIRTUALBOX.md (nessun downgrade automatico).

## Ordine di lavoro proposto, dopo l'approvazione

1. Prova di fattibilità del passo 5 (disco CONFIG virtuale) su una VM nuova: è il punto più incerto.
2. Supervisore (passi 9–11) e prova lunga notturna con il supervisore al posto del prototipo.
3. Creazione della VM e installazione di VirtualBox (passi 2–4, 6), con test simulati come quelli esistenti per il launcher.
4. Integrazione con il bootstrap, nuovo `Start.cmd`, guida di una pagina, kit con checksum distinto dal .76.1-vm-r2.
5. Collaudo su una VM nuova da zero su questo PC, poi sul PC del capo.

## Punto di ripresa

D1, D2 e D4 decise; D3 aperta con la proposta «all'accesso». Il passo 5 è fattibile tramite la console seriale, con chiave host verificata. Supervisore scritto e collaudato in quattro scenari, poi in una prova notturna di 11 cicli tutti PASS, compresa una ripresa spontanea dopo 7 minuti di sospensione dell'host. VM spenta e supervisore fermato il 2026-11-18 alle 06:37. Prossimi passi, da approvare: integrazione di supervisore e bootstrap seriale nell'installer, D3, prove di spegnimento reale di Windows e di sospensione lunga, collaudo su una VM nuova e sul PC del capo. Aggiunti al kit solo due file nuovi, non ancora integrati nel launcher né nello ZIP.
