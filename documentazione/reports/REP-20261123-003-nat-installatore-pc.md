# NAT per i download della centrale installata su PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261123-003 |
| Stato | Completato localmente |
| Data | 2026-11-23, Europe/Rome |
| Autore / modello | Codex, modello esatto non documentato |
| Commit di partenza | `22eca26cce781caaebb51a420fe83bf940665e5a` |
| Richiesta di riferimento | «Riesci ad automatizzare il processo di nat?»; chiarimento «NAT nell’installatore». |
| Autorizzazione | Integrare il NAT nel percorso di installazione PC della nuova centrale, mantenendo l'accesso LAN proposto e verificando su ambiente isolato. |

## Obiettivo e perimetro

Instradare i download di prima installazione via NAT e passare automaticamente al bridge prima della consegna in LAN. L'immagine HAOS distribuita ricava l'indirizzo del QR dalla rotta predefinita. Il passaggio sullo stesso adattatore consente di riusare l'immagine e di far convergere entrambi i QR sull'IP LAN. La rete del funzionamento ordinario resta quella documentata. Centrali già installate, aggiornamenti all'avanzamento e documentazione preesistente da preservare. Nessuna pubblicazione richiesta. Sorgenti e prove del problema in [REP-20261123-001](REP-20261123-001-diagnosi-installazione-pc.md).

## Criteri di completamento

- Una nuova centrale creata dall'app Windows parte con VirtualBox NAT e inoltri solo su loopback. Dopo il primo avvio il client passa al bridge e mostra il QR solo dopo una risposta positiva dall'indirizzo LAN della VM.
- Download via NAT, raggiungibilità LAN tramite bridge e persistenza del cambio verificati con un'installazione isolata.
- Pacchettizzazione e regressioni pertinenti ripetibili. Esiti e limiti registrati separatamente dalla prova ancora da eseguire sul PC lento.

## Avanzamento e modifiche

- Un nuovo installatore Windows avvia la VM con la stessa scheda 82540EM in NAT. Tre porte assegnate da Windows inoltrano soltanto a `127.0.0.1` le richieste del client verso il job HAOS, l'API Core e l'health di Acasystem. Lo script registra porta e scheda fisica nel suo `installazione.json`.
- Il client aspetta Core e Acasystem, passa a caldo al bridge e richiede un nuovo indirizzo DHCP facendo ciclare il link. Dopo il cambio ricerca lo stesso MAC nella LAN e mostra il QR solo con health `ok` all'indirizzo LAN. Alla ripresa legge ancora i metadati e lo stato effettivo di VirtualBox. Le centrali già installate e il percorso da ZIP con installazione manuale conservano il loro flusso.
- Nel collaudo l'API Core su 8123 si è reindirizzata alla porta 80 anche dopo l'avvio. Il client gestisce questa situazione con `/api/onboarding` sull'inoltro locale, riconoscendo i passi JSON di Core. La pagina di preparazione del Supervisor risponde con assenza del servizio. Nessun redirect viene seguito verso la porta di Windows indicata dal guest. [Implementazione HA Core](https://github.com/home-assistant/core/blob/2026.11.2/homeassistant/components/onboarding/views.py), consultata il 2026-11-23.
- App e installatore locale hanno versione 0.2.2. Si usa lo stesso disco pubblicato `centrale-vm-18.4-2`. Il NAT riguarda la preparazione e il bridge resta la configurazione operativa, compresi gli aggiornamenti successivi. [Riferimento Oracle VirtualBox 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), consultato il 2026-11-23.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Tipo, regressioni, build | `npm run typecheck`, `npm test`, `npm run dist:zip` dal client Windows. Parser PowerShell per `Installa-Centrale.ps1`. | Superato | 187 test su 12 file. Verificati NAT in loopback, distinzione tra preparazione e risposta 307 di Core, health su LAN, cavo ripristinato se il cambio fallisce e ripresa dopo interruzione. Il primo build del pacchetto è stato ripetuto con accesso a GitHub perché il sandbox non risolveva l'host del runtime Electron già fissato. |
| Avvio reale in NAT e passaggio alla LAN | Disco pubblico verificato SHA-256, `Installa-Centrale.ps1 -Disco … -NonInterattivo` e ripresa tramite `createCentralSetup`, VirtualBox 7.2.22 su Wi-Fi | Superato | `nic1=nat`, tre inoltri su `127.0.0.1`, percentuale di Core letta durante il download. Il primo tracciamento ha evidenziato il redirect 307. Dopo la correzione è stato ripreso sulla stessa VM e ha visto health LAN `200/ok`, QR da 25×25 e stato `ready` in 35 s dalla ripresa. Non è una misura cronometrata da zero della versione finale. |
| Persistenza del bridge | Stato su VM spenta, avvio a freddo e controllo HTTP LAN | Superato | `nic1=bridged` e cavo attivo conservati. Health LAN `ok` e inoltro NAT inattivo. Il tentativo di spegnimento via ACPI è scaduto e il ciclo a freddo è stato effettuato arrestando la sola VM di prova. Rimossi VM, attività pianificata e cartella di laboratorio. |
| EXE 0.2.2 | `crea-installer.ps1` in PowerShell 5.1 con NSIS 3.0.4.1, poi lista ed estrazione con 7-Zip | Superato | `backup/rep20261123-nat-installer/ACA-System-Setup-0.2.2.exe`, 115.591.051 byte, SHA-256 `2705377c835bbfd52317327383a322f86e941210f895f8c38972a871638865c6`. Script e tre moduli del setup verificati byte per byte. In PowerShell 5.1 il default dello ZIP è stato spostato nel corpo dello script, dove `$PSScriptRoot` è disponibile. L'EXE completo è stato ispezionato su questo host; esecuzione su Windows pulito da fare. |
| PC lento e telefono fisico | Prova in ambiente di destinazione | Non eseguito | Il PC lento e il telefono non erano accessibili. I risultati locali dimostrano il percorso automatico, mentre il guadagno di velocità resta da misurare sul PC interessato. |

## Controllo del diff e chiusura

Il diff copre l'installazione iniziale della nuova VM, lettura dello stato e passaggio di rete del client Windows, test, versione e note di distribuzione. Le correzioni precedenti dell'avanzamento sono incluse nell'EXE locale. Incarico completato il 2026-11-23. Natura e canale del disco pubblico restano invariati. Nessun commit o pubblicazione. Il collaudo dell'EXE sul PC lento e la velocità effettiva della connessione restano verifiche di destinazione di ISSUE-169.

## Pubblicazione successiva — 2026-11-23

Su richiesta dell'utente per ripetere il collaudo sul PC ACA, aggiunti `ACA-System-Setup-0.2.2.exe` e `ACA-System-Setup-0.2.2.exe.sha256` alla [pre-release centrale-vm-18.4-2](https://github.com/acamemo/acasystem-releases/releases/tag/centrale-vm-18.4-2). Le note mettono in evidenza l'installer 0.2.2 e il punto di partenza e arrivo del cronometro. Gli allegati precedenti restano disponibili per lo storico. Verificata l'impronta del disco esistente nell'API GitHub.

Il download anonimo dell'intero EXE ha restituito HTTP 200 e 115.591.051 byte. L'impronta SHA-256 calcolata coincide con quella del pacchetto collaudato e con l'allegato pubblico `.sha256`. Per i sorgenti è stato scelto il ramo `codex/windows-setup-nat-0.2.2`. Il workflow che pubblica e aggiorna il banco parte dai push su `main`, operazione distinta dalla pubblicazione dell'installatore Windows. Il nuovo collaudo sul PC ACA è ancora da eseguire.

## Collaudo sul PC ACA — 2026-11-23

Fonte. Riepilogo diagnostico trasmesso dall'utente, con orari CET. Installazione pulita dell'EXE pubblico 0.2.2 e VirtualBox 7.2.22 su Wi-Fi Intel AX201. Download del disco completato circa 50 s dopo l'inizio stimato. Core disponibile 4 min 1 s dopo l'inizio del pull di Core. Il servizio Acasystem ha risposto `200/ok` via NAT circa 12 min 27 s dopo il clic stimato su «Prepara la centrale». Sono trascorsi 10 min 40 s tra l'avvio della VM e il passaggio a bridge.

Il passaggio a caldo ha prodotto `nic1=bridged`, cavo attivo e aggancio all'adattatore Wi-Fi nell'output e nel log VirtualBox. Il client ha mantenuto «Collegamento alla rete di casa» fino al timeout della preparazione. Windows non ha individuato un IPv4 LAN associato al MAC della VM e il QR mostrava ancora l'indirizzo NAT. L'health dalla LAN e il tempo totale fino a «La centrale è pronta» restano non misurati. La VM è stata lasciata accesa in bridge e preservata. Nel campione in NAT la VM riceveva circa 58,5 Mbit/s complessivi. Il precedente campione da 8 MiB in bridge sullo stesso PC era circa 0,47 Mbit/s. Le due misure usano metodi differenti e non costituiscono un confronto diretto di throughput sullo stesso oggetto.

**Controllo nel codice.** Il ramo `waitingForLan` presenta quell'etichetta mentre manca un IP utilizzabile nella scoperta. Il messaggio dopo 20 minuti è comune al resto del primo avvio e rinvia a Internet anche quando NAT e download sono già passati. `Riprova` legge di nuovo lo stato della VM. Con `nic1=bridged` ripete la scoperta, mentre il ciclo del cavo si applica al passaggio da NAT o a un cavo rilevato come scollegato. Gli avvisi `VERR_VM_THREAD_NOT_EMT` erano presenti prima del cambio, quindi la sola successione nel log non attribuisce loro il timeout.

**Punto di ripresa.** Sulla VM esistente leggere IPv4, rotta e log DHCP del guest attorno alle 16:02:31 CET, prima di cambiare stato. Se risulta un IPv4 LAN, controllare da Windows l'health a quell'indirizzo e la voce di vicinato per capire se la scoperta per MAC lo omette. In assenza di un IPv4 LAN, gli eventi DHCP separano un profilo rimasto sul lease NAT, una richiesta senza risposta e un eventuale problema di riattivazione del link. Il report non dimostra quale risultato si verifichi. La proposta di un messaggio specifico per il timeout LAN rimane in ISSUE-169.

### Verifica in sola lettura, ore 16:35 CET

Il secondo riepilogo del PC ACA conferma il QR sull'indirizzo NAT, il bridge attivo e l'assenza del MAC virtuale nelle voci IPv4 di `Get-NetNeighbor`. La console testuale non è stata raggiunta. IPv4 corrente, route, eventi DHCP e health LAN restano non verificati. Il bridge Wi-Fi può riscrivere il MAC nei frame Ethernet. Da solo, l'esito del confronto per MAC in Windows non distingue un lease mancante da una scoperta incompleta. [Guida Oracle VirtualBox 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html), consultata il 2026-11-23.

**Prova del QR riferita dall'utente.** Il codice mostrato dalla VM viene scansionato correttamente e apre un URL con indirizzo `10.0.2.15`. La pagina non si carica sia da telefono sia da PC. La lettura del QR è riuscita e la destinazione resta l'indirizzo privato usato durante il NAT. Questa prova non misura l'IPv4 assegnato al guest dopo il passaggio al bridge.

Prossimo controllo proposto dal lato host. Cercare il lease o gli eventi DHCP sul router se già accessibili. In alternativa, raccogliere una breve traccia della sola scheda virtuale 1 a VM accesa e riportare solo i metadati IPv4, ARP e DHCP pertinenti. Una cattura passiva può rivelare l'indirizzo attuale. Se manca un evento DHCP, un singolo ciclo del cavo virtuale sotto traccia richiede autorizzazione separata. La cattura attuale non ricostruisce pacchetti già transitati alle 16:02:31. [Comandi di traccia Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), consultati il 2026-11-23.

### Cattura passiva, dalle 16:38:54 alle 16:39:54 CET

Secondo il riepilogo trasmesso dall'utente, la sola scheda virtuale 1 ha emesso 12 richieste ARP con mittente `10.0.2.15` verso il vecchio gateway `10.0.2.2`, senza risposta. Tutti i 12 pacchetti IPv4 in uscita osservati avevano sorgente `10.0.2.15`. La VM usava ancora l'indirizzo NAT mentre l'adattatore era in bridge. Nessun pacchetto DHCP nella finestra di 60 s. Il PCAP rimane sul PC ACA e la cattura non include la commutazione delle 16:02:31, quindi resta indeterminato cosa sia successo al DHCP in quel momento. Health LAN non verificata. Prossimo test proposto, un singolo ciclo del cavo virtuale in bridge sotto nuova cattura, con verifica dell'indirizzo assegnato e di health LAN dopo il ripristino del link.

### Ripristino LAN con ciclo del cavo, ore 16:46 CET

Il riepilogo inviato dall'utente riferisce che, dopo un unico scollegamento di circa 10 s a bridge già attivo, il guest ha inviato un DHCP Request per un indirizzo LAN e ricevuto l'ACK del router circa 1,35 s dopo. La cattura non mostra Discover, Offer o NAK. Alle 16:48:10 il PC ha ricevuto `200/ok` da Acasystem sulla LAN, il MAC in `Get-NetNeighbor` corrisponde a VirtualBox e il QR della VM si è aggiornato. Il nuovo riscontro accerta il recupero sulla VM esistente, mentre la causa esatta del mancato rinnovo alle 16:02:31 resta indeterminata.

Correzione locale nel seguito del collaudo. Riprodurre nel codice l'ordine riuscito sul PC ACA, prima il cambio in bridge, poi un solo ciclo del cavo con 10 s di scollegamento. Il client deve ripristinare il cavo anche se il comando di scollegamento segnala un errore e continuare a dichiarare pronta la centrale dopo l'health LAN. Copia di lavoro iniziale sul commit `b2b86c0`, con aggiornamenti diagnostici preesistenti da preservare.

Verifica locale completata. `npm run typecheck`, `npm test` e `npm run build` superati nel client Windows. I 188 test coprono l'ordine dei comandi, i 10 s effettivi con bridge attivo e cavo scollegato nel modello, il ripristino del cavo dopo timeout e l'attesa di health LAN prima di `ready`. La sequenza manuale è stata verificata sul PC ACA con l'EXE già installato. Una nuova installazione con la correzione automatica resta da collaudare. Il sorgente è aggiornato localmente.

**Esito finale riferito dall'utente.** Dopo il ripristino manuale del collegamento, l'installazione 0.2.2 si è conclusa, il QR era funzionante e l'utente ha aperto Acasystem. L'ora di apertura non è stata riportata. Questo completa il collaudo con recupero manuale. Il percorso automatico aggiornato resta da provare con un nuovo EXE su una nuova installazione.

## Preparazione della 0.2.3 — 2026-11-23

Su richiesta dell'utente («bene allora lavoraci e pubblica su github il nuovo installer»), la revisione 0.2.3 porta nell'EXE la correzione del passaggio al bridge. Il rilascio comprende verifica su una VM nuova, confronto del contenuto del pacchetto con i sorgenti collaudati, pubblicazione e verifica anonima del download. La copia di lavoro partiva da `b2b86c0` con le modifiche della diagnosi e della correzione già presenti.

- `npm run typecheck` e `npm test` superati sul client 0.2.3, 188 test su 12 file.
- Flusso reale `createCentralSetup.start()` su VM nuova e profilo temporaneo sul PC di sviluppo, VirtualBox 7.2.22. Unica variazione del banco, nome univoco della VM. Download pubblico e integrità verificati dal setup, fase di verifica a 99,0 s, VM visibile in NAT a 118,1 s, Core pronto a 250,1 s. Passaggio al bridge a 402,4 s seguito da scollegamento e riconnessione dopo 10.000 ms misurati. Pronta a 422,7 s dal lancio del setup. Health LAN `200/ok` e matrice QR coincidente con l'URL LAN. Sequenza completata senza interventi manuali durante il setup.
- `npm run dist:zip` e `crea-installer.ps1` con NSIS 3.0.4.1 superati in una cartella separata. `ACA-System-Setup-0.2.3.exe`, 115.648.834 byte, SHA-256 `ddc5dee0b9c6434748aec53e35eba78720a47b966bbbbca1c85d4aa4b8f253ba`. Versione del pacchetto e confronto byte per byte dello script PowerShell e dei tre moduli del setup tramite estrazione 7-Zip superati. VM, attività pianificata e cartella temporanea di collaudo rimosse.
- EXE e impronta `.sha256` pubblicati nella [pre-release centrale-vm-18.4-2](https://github.com/acamemo/acasystem-releases/releases/tag/centrale-vm-18.4-2), con il nuovo installatore in evidenza nelle note. Verifica anonima con `curl.exe`, HTTP 200 e 115.648.834 byte in 11,66 s. SHA-256 del download completo uguale alla build locale e all'impronta pubblica. Controllata nell'API l'impronta del disco HAOS esistente. Il sorgente viene raccolto sul ramo `codex/windows-setup-nat-0.2.3` per tenere il rilascio Windows distinto dalla pubblicazione automatica del banco.

Rilascio completato il 2026-11-23. Resta la conferma del passaggio automatico sulla specifica scheda Wi-Fi del PC ACA con un'installazione nuova. Sul PC di sviluppo il collaudo ha eseguito il motore di setup con script e profilo isolati, poi il contenuto dell'EXE è stato confrontato con la build collaudata.
