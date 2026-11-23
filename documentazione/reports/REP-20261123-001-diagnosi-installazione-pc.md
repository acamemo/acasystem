# Diagnosi dei tempi di installazione su PC Windows

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261123-001 |
| Stato | Completato |
| Data | 2026-11-23, Europe/Rome |
| Autore / modello | Codex, modello esatto non documentato |
| Commit di partenza | `22eca26cce781caaebb51a420fe83bf940665e5a` |
| Richiesta di riferimento | Verificare il funzionamento dell'installazione semiautomatica su PC e diagnosticare la lentezza segnalata. |
| Autorizzazione | Analisi del codice, della release e delle evidenze. Misure isolate o in sola lettura. |

## Obiettivo e perimetro

Ricostruire il percorso dall'eseguibile alla centrale pronta e determinare quanto incidono download del disco, preparazione del disco, creazione della VM e primo avvio. Confrontare con [REP-20261120-001](REP-20261120-001-finestra-unica-installazione.md) e [REP-20261118-001](REP-20261118-001-installer-exe-chiavetta-schermata-avvio.md). La copia locale era pulita. Il lavoro riguarda diagnosi e documentazione, senza modifiche al prodotto o rilascio di una nuova versione.

## Criteri di completamento

- Identificare l'installatore pubblicato e i download richiesti su un'installazione nuova.
- Confrontare i tempi per fase disponibili, acquisire misure pertinenti e distinguere i risultati locali da quelli del PC con il problema.
- Registrare le cause sostenute dalle evidenze, le ipotesi residue e le proposte di intervento.

## Percorso verificato

1. `ACA-System-Setup-0.2.1.exe` (115.568.614 byte) installa client e script con NSIS. VirtualBox deve essere già presente. L'EXE e il disco separato appartengono alla stessa [pre-release `centrale-vm-18.4-2`](https://github.com/acamemo/acasystem-releases/releases/tag/centrale-vm-18.4-2).
2. «Prepara la centrale» scarica da GitHub `aca-centrale-vm-18.4-2.vdi.zip` (591.441.407 byte). `download.ts` conserva il file `.part`, segue il redirect, riprende con `Range` quando ci sono byte salvati e può tentare fino a 20 volte. Verifica dimensione e SHA-256, poi estrae il VDI con `tar.exe`.
3. `Installa-Centrale.ps1 -Disco … -NonInterattivo` sposta il VDI già estratto nel percorso della centrale, assegna un UUID al disco, registra la VM e la avvia tramite attività pianificata. La configurazione standard è 2 vCPU, 2 GiB di RAM, EFI, SATA e bridge sull'interfaccia della rotta predefinita. Le impostazioni principali sono coerenti con la [guida ufficiale Windows di Home Assistant](https://www.home-assistant.io/installation/windows/), consultata il 2026-11-23.
4. Al primo avvio HAOS scarica Home Assistant Core dentro la VM. Il servizio `aca-firstboot` aspetta il Supervisor, aggiunge il catalogo GitHub di ACA, installa/avvia l'app della schermata e Acasystem, infine attiva l'aggiornamento automatico di Acasystem. I retry dei singoli comandi sono a intervalli di 20 s. Windows segue la centrale dal MAC/IP e dichiara «Pronta» quando `:3002/api/health` restituisce `status: ok`. Verifica anche la risposta `401` di `:8123/api/` per segnare Core come avviato.

## Diagnosi

- **Primo avvio, evidenza sul PC lento.** Il report del 20 novembre conserva un log del Supervisor con il download di Core al 43% e un `connection reset by peer` da Docker Hub. Il job era al 44,2% dopo 44 minuti. A quel punto la VM era già avviata e stava scaricando Core. L'errore prova un'interruzione del trasferimento. I dati disponibili non localizzano la causa tra rete del PC, bridge/Wi-Fi, percorso verso il registro e servizio remoto.
- **Confronto storico.** Sul PC di sviluppo, con la 0.2.0 il disco è stato scaricato in circa 1 minuto, hash ed estrazione hanno richiesto 10 s, la creazione della VM 4 s e il primo avvio circa 4 minuti. La prova completa con la 0.2.1 era terminata in 5 minuti. Con il precedente 18.4-1 erano già emersi due rallentamenti separati: il download da GitHub era caduto al 51% dopo 55 minuti (circa 90 KB/s) e un primo avvio, in una prova con il disco servito in locale, aveva richiesto circa 67 minuti (ricezione della VM riportata intorno a 160 KB/s). Fonti nei due report collegati sopra.
- **Volume di rete.** Il primo avvio della 0.2.1 aveva ricevuto circa 1.366 MB in 242 s, misurati sulla scheda della VM. Insieme allo ZIP pubblicato sono circa 1,96 GB dopo il download dell'EXE. A 10 Mbit/s effettivi e costanti il solo trasferimento richiederebbe circa 26 minuti, a 5 Mbit/s circa 52. Sono stime di scenario. Registri, tentativi aggiuntivi e prestazioni di estrazione incidono sul totale.
- **Limite dei controlli iniziali.** «Internet» legge un byte dallo ZIP GitHub dal processo Windows. Misura la raggiungibilità di quell'asset, mentre il grosso dei dati viene richiesto dalla VM attraverso un bridge e da altri endpoint. Il verde iniziale quindi convive con una connessione lenta o instabile al registro durante il primo avvio.
- **Limite della stima.** La prima ETA usa velocità di GitHub e dimensioni ipotizzate come ripiego, poi si basa sul progresso recente del job Core. L'app conserva la percentuale massima anche se un download riparte, quindi i progressi che rimangono sotto quel massimo non spostano l'indicatore né l'orologio di inattività. In prova, Core era rimasto al 97% per circa 90 s durante l'estrazione, ancora sotto la scritta «Download». Nella fase Acasystem la percentuale è stimata dal tempo trascorso fino alla risposta di health. Questi limiti spiegano parte della percezione e possono ritardare una diagnosi. Il pulsante «Riprova» in preparazione riprende il monitoraggio della centrale esistente.
- **Risorse e virtualizzazione.** CPU, RAM e disco possono incidere sull'estrazione o sul boot. Sul PC lento manca una misura di questi parametri. I problemi storici NEM (ISSUE-129/167) restano un controllo da fare se il boot si ferma prima che la VM abbia un IP o se compare un reset del guest. L'evidenza al 44,2% e il reset della connessione a Docker Hub riguardano una fase successiva.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Pre-release pubblica ed EXE locale | `curl.exe` anonimo all'[API GitHub della pre-release](https://api.github.com/repos/acamemo/acasystem-releases/releases/tags/centrale-vm-18.4-2) e `Get-FileHash -Algorithm SHA256` sulla copia locale dell'EXE | Superato | L'EXE locale corrisponde all'asset 0.2.1. Dimensione e SHA-256 del disco nell'API coincidono con le costanti del client. |
| Download parziale da GitHub | `curl.exe --range 0-33554431`, Windows | Superato | HTTP 206, 32 MiB in 7,30 s, 4,59 MB/s. Campione distinto dal download completo. |
| Download reale, verifica ed estrazione del disco | Node 24.14.0, funzioni originali `downloadFile`, `verifyDisk` ed `extractDisk`, URL e parametri 0.2.1. Cartella temporanea sotto `backup/` | Superato | 591.441.407 byte in 58,89 s al primo tentativo (10,04 MB/s). SHA-256 in 0,44 s, estrazione in 1,90 s e VDI risultante da 1.040.318.976 byte. Il primo lancio della sonda aveva passato un nome di opzione errato ed è stato ripetuto con i valori originali. File e cartelle temporanee rimossi. |
| Accesso ai registri e campioni trasferiti | `curl.exe` a `/v2/` di GHCR e Docker Hub dal PC Windows, poi lettura dei manifest OCI pubblici e `Range` su un layer per immagine | Superato, entro il perimetro del campione | I due ingressi rispondono 401 alla richiesta anonima. Su GHCR, 8 MiB con HTTP 206 in 1,08 s per `home-assistant/amd64-homeassistant:2026.11.2` e 1,02 s per `acamemo/acasystem:0.9.76.1`. Manifest AMD64: circa 674 MB e 222 MB di layer compressi. Sono tag di riferimento e campioni dal PC host, distinti dal traffico al primo avvio e dal percorso Docker Hub del PC lento. |
| Suite del client Windows | `npm test -- setup`, `npm test`, `npm run typecheck` in `progetto/client/windows` | Superato | 66 test setup e 178 test complessivi, inclusi i 66; typecheck pulito. Coprono ripresa, integrità, transizioni e stallo simulato. |
| Creazione VM e primo avvio | Lettura di `Installa-Centrale.ps1`, tracker e servizio `aca-firstboot`. Confronto con i due report precedenti. `VBoxManage list runningvms` in sola lettura sul PC di sviluppo. | Verifica del flusso e dei risultati storici | Nessuna VM in esecuzione nel controllo locale. Nuovo avvio completo e misure dal PC che ha manifestato la lentezza non eseguiti. |

## Riscontri da raccogliere sul PC lento

Nella prossima prova, annotare gli orari all'inizio e alla fine del download del disco, al rilevamento dell'IP, al primo progresso Core, alla disponibilità di Core e a «Centrale pronta». Conservare le righe del Supervisor intorno al primo retry insieme a una breve serie di byte ricevuti dalla scheda della VM e alla modalità di rete del PC. Ripetere sullo stesso PC con una seconda connessione (Ethernet o hotspot) se il rallentamento persiste. Un cambiamento dei tempi con hardware e VM equivalenti aiuta a isolare il percorso di rete. Se i byte arrivano a velocità normale ma la fase resta ferma, misurare CPU, disco e tempo di estrazione nel guest.

## Proposte registrate

1. Misurare e mostrare separatamente download GitHub, IP della VM, trasferimento ed estrazione di Core, retry del registro e avvio di Acasystem. Ricavare la stima di Core dal percorso realmente in uso quando ci sono misure sufficienti.
2. Validare una variante con immagini container già precaricate nel VDI oppure in un pacchetto locale. Ridurrebbe il traffico richiesto alla VM al primo avvio e renderebbe possibile trasferire i file su una connessione diversa. La dimensione iniziale, il comportamento offline del Supervisor, le versioni precaricate e la ripetibilità richiedono una prova su VM pulite. Un unico download più grande sulla stessa rete lenta non garantisce una riduzione del tempo totale.

## Controllo del diff e chiusura

Il diff riguarda questo report e i puntatori in indice, stato e verifiche. La diagnosi individua il trasferimento di Core come fase lenta del caso documentato. Per attribuire il reset a un tratto preciso del percorso serve il confronto sul PC interessato. Le due proposte restano nel registro come ISSUE-169. Incarico diagnostico chiuso il 2026-11-23 senza commit, push, release o modifiche all'installatore.

## Evidenza successiva — PC lento, 2026-11-23

Fonte. Riepilogo trasmesso dall'utente, da una verifica in sola lettura sul PC interessato. Orari CET. I log completi del guest e campioni di traffico aggiornati non sono stati forniti.

- `ACA-Centrale` è rimasta in pausa dal 20 novembre alle 22:36:46 al 23 novembre alle 12:12:14, per 61 h 35 min 28 s. La lettura delle 12:22:15 è avvenuta 10 min 1 s dopo la ripresa. La pausa spiega il tempo di calendario trascorso in quell'intervallo. Il motivo della pausa e lo stato di Core dopo la ripresa restano da verificare. Il supervisore Windows attende quando la VM è in pausa.
- Il riepilogo Windows riporta `running`, `errori=0`, `reset=1`. Il reset osservato risale al 20 novembre verso le 16:16, prima della lunga pausa. I contatori misurano il supervisore Windows e il suo risveglio periodico. Nessuna misura del trasferimento di Core ne deriva.
- La sequenza `VERR_VM_THREAD_NOT_EMT (-1906)` riportata alle 12:24 è compatibile con gli avvisi già riprodotti tramite `Debugger.Info('clocks')` durante prove con la VM operativa. Il codice e il [report della prova](REP-20261118-001-installer-exe-chiavetta-schermata-avvio.md) documentano questa sequenza. Per attribuire gli avvisi del PC lento a quel comportamento è utile la riga immediatamente precedente del log (`tmCpuTickGetInternal`). `E_ACCESSDENIED` di `VBoxManage` ha impedito la misurazione del traffico. Sul PC di sviluppo lo stesso errore si era presentato nel sandbox e la lettura era riuscita fuori dal sandbox. Il solo codice di errore non localizza il problema del PC lento.
- `preparing` copre tutto l'intervallo tra creazione della VM e health positivo. Se la lettura proviene da `centrale-setup.json`, il file conserva `preparing` anche quando l'app segnala uno stallo a schermo. Inoltre il tracker conserva il primo IP trovato per tutta la propria sessione. Un IP cambiato tra pausa e ripresa potrebbe impedire il monitoraggio se il client stava ancora usando la sessione precedente. Questa è un'ipotesi da verificare confrontando l'IP corrente della VM e la risposta di health.
- Il **44,2% dopo 44 minuti** e il `connection reset by peer` si riferiscono alla prova precedente. Identificano il collo di bottiglia di quella prova. Dopo la ripresa del 23 novembre non c'è evidenza sufficiente per scegliere tra download, nuovo tentativo, estrazione, problema di raggiungibilità o passaggio successivo.

La prossima lettura va fatta partendo dall'IP corrente mostrato nella console di `ACA-Centrale` in VirtualBox. Dalla console, acquisire gli ultimi eventi del Supervisor e, da Windows, controllare `http://<IP>/supervisor-api/jobs/info`, `http://<IP>:8123/api/` e `http://<IP>:3002/api/health`. Due letture di progresso e, se accessibili, dei byte ricevuti a 1–2 minuti di distanza distinguono un trasferimento che avanza da un indicatore fermo. I log del Supervisor distinguono i retry dall'estrazione. Health `ok` a fronte del client ancora in preparazione sposta l'indagine sul monitoraggio del client. Prova sul PC lento da eseguire, preservando la VM e i dati.

Controllo locale `powershell.exe -NoProfile -ExecutionPolicy Bypass -File progetto/ha-app/pilot/central-supervisor.test.ps1`: 18 verifiche superate, incluse pausa, reset e richiesta di risveglio. Lo script senza l'opzione di processo è stato bloccato dalla policy di esecuzione di PowerShell. Nessuna misura aggiuntiva sulla VM remota.

## Conferma del trasferimento lento di Core — PC lento, 2026-11-23

Il secondo riepilogo dell'utente documenta un layer in download e consente di localizzare il ritardo dopo la ripresa. La VM rispondeva sulla rete locale. L'Observer era `Connected` e `Healthy`. La porta 8123 restituiva un `302` verso la pagina di preparazione sulla porta 80, dove `/api/` restituiva `401`. Il `401` dopo redirect non equivale alla risposta diretta che il tracker aspetta da Core sulla 8123. La porta 3002 di Acasystem non accettava la connessione. Docker mostrava `landingpage` in esecuzione.

| Misura riportata dal PC lento | Risultato |
|---|---|
| `home_assistant_core_install`, 12:32:57–12:34:57 CET | `progress=0`, `stage=null`, `done=false` in entrambi i campioni. La VM ha ricevuto 9.662.870 byte totali in 120 s, circa 80,5 kB/s, con traffico di qualunque tipo. |
| File temporaneo del layer di Core, 12:41:28–12:43:57 CET | Da 323.079.872 a 333.565.632 byte in 149 s. Media 70,4 kB/s (0,56 Mbit/s). Alle 12:43:57 era all'81,7% del layer da 408.202.642 byte. |
| Ultima fase osservata | File temporaneo in crescita e blob definitivo assente. Nessuna nuova riga di estrazione per quel layer nel journal consultato. |

Il layer appartiene a `ghcr.io/home-assistant/qemux86-64-homeassistant:2026.11.2`, digest `sha256:ac0f30dce981cdfba48a664b060096286efbcc617ca2cf098c4f5d5109d6b723`. Il 23 novembre, dal PC di sviluppo, lettura anonima del manifest GHCR e `curl.exe --range 333565632-341954239` sullo stesso blob hanno restituito HTTP 206 e 8 MiB in 1,02 s (8,24 MB/s). Il campione dimostra che lo stesso blob era servito rapidamente da un'altra postazione. Durata, rete e percorso differenti impediscono di attribuire la causa alla connessione della VM, al bridge o al percorso verso GHCR senza un confronto sul PC lento.

Il 20 novembre alle 17:24:46 il pull di Core aveva fallito con `connection reset by peer`. Un tentativo nuovo era partito alle 17:25:18 verso GHCR. Nello stesso minuto Docker aveva segnalato un errore nella pulizia di uno snapshot. L'errore precedente delle 15:47 su `docker:29.8.2-cli` riguarda la base Docker della schermata ACA, quindi va verificato a parte se l'installazione resta in attesa dopo Core. I timeout DNS del 23 novembre riguardavano il controllo di connettività di Home Assistant. La crescita del file mostra che il trasferimento era attivo nel momento misurato.

Alle 12:43:57 mancavano 74.637.010 byte. Con velocità costante sarebbero serviti circa 17 min 41 s per il solo layer, prima di eventuali altri trasferimenti, estrazione e avvio. Esito finale non osservato. Per finire l'installazione è preferibile lasciare PC e VM attivi durante il trasferimento. Dopo il completamento o un nuovo reset, confrontare lo stesso blob da Windows e dal guest sulla connessione in uso. Se entrambi sono lenti, ripetere il confronto da un'altra connessione. Se il rallentamento è circoscritto al guest, indagare il percorso VirtualBox, scheda e bridge. Il job a zero durante un trasferimento reale conferma che serve un indicatore dei byte o un messaggio che spieghi l'assenza di una percentuale affidabile.

## Confronto Windows e VM sul PC lento — 2026-11-23

Il riepilogo trasmesso dall'utente riporta che il layer ha raggiunto 408.202.642 byte alle 13:00:44 CET. Prima del confronto non risultavano download Docker in corso o connessioni HTTPS di Docker aperte. I test sono stati eseguiti in sequenza, sulla stessa connessione, con lo stesso digest e intervallo di 8 MiB (`333565632–341954239`), scartando il contenuto. La VM è rimasta accesa e la configurazione è stata preservata.

| Ambiente | Ora di inizio (CET) | Codice / byte | Primo byte | Tempo totale | Velocità media |
|---|---|---|---:|---:|---:|
| PC di sviluppo, Windows | Campione precedente del 23 novembre | 206 / 8.388.608 | 0,330 s | 1,019 s | 8.235.954 B/s |
| PC lento, Windows | 13:39:12 | 206 / 8.388.608 | 0,754 s | 1,565 s | 5.358.735 B/s |
| PC lento, `ACA-Centrale` | 13:39:47 | 206 / 8.388.608 | 0,532 s | 143,288 s | 58.543 B/s |

Il guest impiega 91,6 volte il tempo di Windows sullo stesso PC (circa 0,47 contro 42,9 Mbit/s). Il primo byte arriva entro un secondo in entrambe le prove. Il divario emerge durante il trasferimento del corpo e si riproduce con `curl` anche quando Docker è inattivo. L'accesso a Internet del PC come host sostiene il trasferimento e il rallentamento è circoscritto al percorso del guest nella prova. La causa specifica resta aperta. Il test non separa bridge, scheda virtuale e stack di rete del guest, né controlla l'indirizzo finale del CDN.

Lo script `Installa-Centrale.ps1` configura normalmente VirtualBox in bridge sull'adattatore della rotta predefinita di Windows, con Intel PRO/1000 `82540EM`. Il bridge usa il filtro sull'adattatore fisico, mentre NAT ritrasmette tramite lo stack di rete dell'host. [Guida Oracle VirtualBox 7.2, consultata il 23 novembre 2026](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html).

Come prova successiva, verificare la configurazione effettiva di `ACA-Centrale` in sola lettura e usare una VM di prova equivalente sul PC lento per ripetere il campione in bridge e NAT, mantenendo la stessa scheda virtuale, connessione e, se disponibile, lo stesso indirizzo finale del CDN. Ripetere la misura per confermare il rapporto e lasciare la centrale esistente in servizio. NAT veloce a fronte di bridge lento circoscrive il problema al percorso bridged e alla sua interazione con la rete fisica. Con entrambi i percorsi lenti, verificare i componenti comuni del guest. Il confronto in NAT è una proposta diagnostica. Il completamento del layer è osservato, mentre lo stato finale di Core e Acasystem resta da verificare.
