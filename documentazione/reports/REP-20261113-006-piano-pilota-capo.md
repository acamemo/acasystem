# Organizzazione del pilota ACA su una seconda casa

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-006 |
| Stato | Pianificazione completata; esecuzione non avviata |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «per produrre la parte app da condividere col capo e fargli testare l'app? Come ci organizziamo?»; chiarimenti: «potenzialmente un altra rete da cui troverà i suoi dispositivi» e «Dobbiamo predisporre anche la centrale». |
| Autorizzazione | Valutazione e organizzazione della consegna; nessuna nuova installazione, build, scrittura disco, pubblicazione o invio a terzi effettuati. |

## Obiettivo e perimetro

Definire il primo pilota operativo indipendente dal banco dello sviluppatore, coerente con [ADR-0031](../decisions/ADR-0031-ritorno-mini-pc-client.md): centrale HA/ACA sulla rete del destinatario, client Windows/Android e webapp per iPhone. Confermata la necessità di predisporre anche la centrale; hardware e data non identificati. Non introdurre VM desktop, accesso remoto o nuovo servizio cloud ACA per questo pilota.

897 voci Git preesistenti preservate. Questo intervento modifica soltanto report, indice e nota di stato; i problemi individuati restano proposte nel registro, senza implementazione implicita.

## Criteri di completamento della pianificazione

- Distinguere centrale e app; collegare il destinatario ai propri dispositivi senza usare account/configurazioni domestiche dello sviluppatore.
- Inventariare capacità di packaging e materiali storici, separandoli dalle nuove build da preparare.
- Elencare le dipendenze prima della consegna e i criteri della prima prova reale.

## Evidenze osservate

- Banco corrente ACA .72/r99 e HA Container2026.9.4: [REP005](REP-20261113-005-banco-sonofflan-trvzb.md). Non dimostra un'installazione HAOS fisica o il bootstrap della .72.
- `progetto/client/windows/package.json`: ZIP portabile e installer NSIS x64 disponibili come script; versioni shell0.1.0. Ultimo ZIP individuato `release/profili-tavano-20261102/revisione2/Acasystem-0.1.0-win-x64.zip`,153543383byte,2026-11-02. Non ricompilato ora e non presentato come consegna .72 verificata. Storico di problemi Smart App Control nell'installer: verificare l'avvio sul PC destinatario, senza disabilitare protezioni come requisito della prova.
- `progetto/client/android/package.json` e `android/app/build.gradle`: debug/release, firma release esterna a Git. APKdebug7686097byte del2026-11-02; release3199405byte del2026-10-26, precedente al ritorno mini PC/client. Nessun keystore letto o firma eseguita.
- Windows/Android preferiscono il bundle fornito dalla centrale (`windows/src/main.ts`, `android/web/main.ts`, `core/src/startup.ts`): il contenitore nativo non include HA o backend ACA e non aggiorna la centrale. I launcher usano IPv4 privato/HTTP; nessun percorso Internet assegnato da questa richiesta.
- `progetto/ha-app/bootstrap/bootstrap-haos.sh`: versione **0.9.34** e host **HAOS18.4** fissati, anche nei materiali copiati dal prepare. Non è utilizzabile per installare .72 semplicemente cambiando il parametro. Il bootstrap opera dopo HAOS, non installa l'OS sul disco. Rilievo registrato in ISSUE-162, non corretto qui.
- `#/mockup` consente una demo grafica con dati simulati; il ciclo di transizione ha il debito ISSUE-159. Non sostituisce il pilota con i dispositivi del destinatario.
- Fonti primarie consultate2026-11-13: [HAOS generic x86-64](https://www.home-assistant.io/installation/generic-x86-64/) richiede macchina dedicata64bit/UEFI e installazione del sistema sul supporto scelto; [onboarding HA](https://www.home-assistant.io/getting-started/onboarding/) distingue rilevamento compatibile da configurazioni ancora necessarie. Non è stata scelta una nuova versione HAOS/Core sulla sola base della documentazione corrente.

## Sequenza proposta, non implementata

1. **Definire il banco destinatario:** identificare mini PC disponibile e supporto da dedicare a HAOS, rete Ethernet e2–3modelli reali da provare. L'installazione sul disco richiederà identificazione del target e autorizzazione specifica; non assumere un PC Windows esistente sacrificabile. Proposta: centrale già predisposta prima della consegna, con combinazione HAOS/Core/ACA congelata dopo collaudo.
2. **Allineare distribuzione e installazione:** prendere .72 come candidata attuale, verificare il pacchetto HAOS su installazione pulita e risolvere il vincolo bootstrap .34/18.4 prima di proporre un'installazione automatica. Se necessario, preparare una release pilota verificata; pubblicazione distinta e non autorizzata dalla sola pianificazione.
3. **Confezionare i client:** rigenerare/verificare Windows e APK Android dal codice corrente, verificando firma/metodo di distribuzione interna, primo avvio e bundle della centrale. iPhone usa la webapp. Consegnare versioni/checksum e una breve guida senza credenziali dello sviluppatore. Preferenza da valutare per il primo test Windows: ZIP portabile verificato; l'installer resta un'opzione da validare.
4. **Collaudare da utente nuovo:** account/casa vuoti sulla seconda centrale, collegamento IP Windows e QR/permessi Android reali, chiusura/riapertura, cambio dispositivo secondo le regole attuali, inserimento2–3dispositivi e relativi widget, stato/comando con riscontro, persistenza dopo riavvio. Nessuna copia dell'archivio HA, profili personali, password o token del banco attuale. Un layout dimostrativo richiederebbe solo una copia depurata delle impostazioni grafiche.
5. **Consegnare il pilota:** centrale pronta, pacchetto Windows, APK per prova interna e guida/registro feedback. Feedback con versione, piattaforma, passaggi, atteso/ottenuto; Tavano esportato consapevolmente e depurato quando utile, nessun upload automatico o messaggio al capo dall'agente.

La ricerca dei dispositivi resta quella delle integrazioni HA: Wi-Fi/rete quando scoperti e supportati; Zigbee con coordinatore/bridge compatibile; prodotti cloud con account e consensi del destinatario. Le sole app non rendono universale la scansione e non trovano tutti gli apparecchi senza associazione.

## Verifiche e limiti

Inventario in sola lettura di package, sorgenti, documentazione e metadati dei materiali; revisione parallela dei client. Nessuna suite, build, installazione su hardware, firma, pubblicazione, apertura porte o invio eseguiti. Nessun nuovo risultato fisico oltre la precedente conferma TRVZB dell'utente.

## Chiusura e punto di ripresa

Piano consegnato e salvato; pianificazione completata. Per attuare il pilota servono identificazione del mini PC e dei primi dispositivi, poi assegnazione della preparazione. Il banco .72 esistente resta invariato. La proposta non equivale ad autorizzare pubblicazione, acquisti o scritture di dischi.

## Annotazione 2026-11-13 — alternativa centrale HAOS in VM

Richiesta successiva: «può funzionare anche tramite una virtual machine sul pc? senza usare il mini pc per ora», mantenendo entrambe le possibilità e valutando l'installazione automatica delle estensioni tramite terminale. Questa annotazione estende la valutazione del pilota: la precedente esclusione della VM descriveva il perimetro di quella proposta, non un'impossibilità tecnica. Nessuna nuova installazione o riattivazione del gestore desktop VM è stata richiesta o eseguita.

**Valutazione:** HAOS su mini PC e HAOS in VM possono ospitare lo stesso add-on ACA e servire gli stessi client via IP/QR. Il wrapper `progetto/ha-app/image/run.sh` configura l'ambiente Supervisor e avvia lo stesso backend; non occorrono due versioni dell'applicazione. Il PC che ospita la VM diventa la centrale e deve restare acceso, senza sospensione, per mantenere disponibili comandi e automazioni. La chiusura del client ACA è distinta dall'arresto della VM.

**Percorso proposto:** predisporre una VM HAOS pulita e separata; renderla raggiungibile sulla LAN; eseguire nella console host HAOS un bootstrap versionato per ACA e i soli componenti necessari al pilota; collaudare prima stabilità, riavvio, accesso PC/telefono e dispositivi, poi valutare l'automazione della predisposizione della VM. Il bootstrap può essere comune alle due destinazioni HAOS, mentre creazione della VM e installazione su disco fisico restano procedure diverse. Non distribuire una copia dei dati o delle credenziali del banco attuale.

Le estensioni hanno percorsi distinti: app/add-on gestite dal Supervisor, componenti personalizzati predisposti come file versionati e integrazioni configurate tramite i loro flussi HA. Account del produttore, PIN, pairing e consensi eventualmente richiesti rimangono passaggi dell'utente. Non è prevista l'installazione indiscriminata di tutte le integrazioni né una scoperta universale.

**Evidenze e limiti:**

- [Guida ufficiale HAOS Windows](https://www.home-assistant.io/installation/windows/), consultata2026-11-13: immagini VirtualBox/VMware/Hyper-V, minimo2GB RAM e2vCPU, UEFI e rete bridged per comunicare con i dispositivi della LAN. La scelta dipenderà dal PC destinatario; i requisiti minimi non dimostrano le prestazioni del carico ACA. L'eventuale coordinatore USB richiede verifica del passthrough del virtualizzatore; la guida segnala l'assenza del passthrough USB in Hyper-V.
- [API Supervisor](https://contributors.home-assistant.io/apps/guides/communication/), consultate2026-11-13: installazione/gestione delle app mediante interfacce autorizzate. Il bootstrap ACA già esistente aggiunge repository, installa/avvia ACA e verifica health/QR; opera dalla console root host dopo l'installazione di HAOS. Rimane il vincolo .34/HAOS18.4 registrato in ISSUE-162, da risolvere prima di un nuovo pilota.
- [REP-20261030-010](REP-20261030-010-rallentamenti-vm-windows.md): ritardi dei timer VirtualBox ancora presenti dopo aggiornamento e riavvio. [REP-20261030-011](REP-20261030-011-confronto-vmware-separato.md): clone VMDK verificato, nessuna prova runtime VMware. Non dichiarare risolto ISSUE-129 o collaudato un virtualizzatore alternativo.
- [REP-20261102-004](REP-20261102-004-prova-bootstrap-su-vm-haos.md): bootstrap .33/r2 realmente riuscito in VM, ma campione breve1CPU con Docker sospeso e arresto ACPI non completato. Il QR10.0.2.15 era interno NAT, non raggiungibile dal telefono. Non equivale a un pilota LAN/H24 riuscito.

Punto di ripresa aggiornato: identificare sistema operativo, CPU/RAM e rete del PC destinatario, scegliere e collaudare una VM separata e allineare il bootstrap. Mini PC resta una destinazione alternativa; ADR-0031 e checkpoint storici conservati. Solo documentazione aggiornata, banco .72/account/profili invariati; nessun test runtime, build, installazione o pubblicazione eseguiti in questa valutazione.

### Annotazione 2026-11-13 — caratteristiche dichiarate del PC

L'utente indica un Lenovo con **Core Ultra 7 e32GB RAM**. Sono dati dichiarati, non un inventario verificato del destinatario; variante esatta della CPU, sistema operativo/edizione, spazio SSD e rete rimangono da accertare. Il dimensionamento iniziale proposto per il pilota è **2vCPU,4GB RAM e64GB di disco virtuale su SSD**, da collaudare: non è una garanzia di prestazioni o una nuova misura minima ufficiale. La potenza dichiarata non risolve per deduzione i ritardi del precedente esperimento.

Chiesta l'edizione Windows tramite domanda dedicata. Secondo la [documentazione Microsoft Hyper-V](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v), consultata2026-11-13, il ruolo Hyper-V non è disponibile su Windows11Home; Pro/Enterprise e i requisiti di virtualizzazione vanno verificati prima di considerarlo. Nessun virtualizzatore scelto o installato, nessuna modifica a firmware, rete, protezioni, VM o banco corrente. Restano i controlli USB/rete e bootstrap della precedente annotazione.

### Annotazione 2026-11-13 — Windows 11 Pro confermato

L'utente conferma «il pc ha Windows 11 Pro». Il sistema operativo del destinatario è quindi noto per dichiarazione; non è ancora verificato sul computer. **Hyper-V diventa il primo candidato da valutare per il pilota**, senza assegnazione della sua attivazione o della creazione della VM. La documentazione Microsoft citata ne prevede la disponibilità su Pro; la [guida HAOS Windows](https://www.home-assistant.io/installation/windows/), ricontrollata2026-11-13, offre l'immagine VHDX e la procedura per VM Generation2 con collegamento alla LAN. La stessa guida segnala l'assenza del collegamento USB diretto in Hyper-V: un eventuale coordinatore Zigbee USB richiederebbe una scelta specifica, non risolta dalla sola conferma di Pro.

Il prossimo passo proposto è verificare sul PC destinatario disponibilità della virtualizzazione, stato di Hyper-V, spazio SSD e adattatore di rete, senza alterare le protezioni Windows; quindi definire una prova separata con2vCPU/4GB RAM/64GB. La scelta resta subordinata a rete e periferiche effettive, non dimostra risolto ISSUE-129 e non riprende automaticamente il gestore VM desktop storico. Il bootstrap ACA aggiornato e il collaudo di stabilità/rete restano necessari. Aggiornata soltanto la documentazione; banco, account, profili e VM invariati.

### Annotazione 2026-11-13 — consegna con PC del destinatario a casa sua

L'utente chiede cosa occorra per la versione app e se debba intervenire sul PC del capo, che si trova a casa del destinatario. Distinzione chiarita: il client ACA può essere costruito e confezionato qui; se il Lenovo ospita anche la centrale, la sua configurazione locale iniziale è necessaria. Non serve necessariamente accesso fisico: il destinatario può eseguire i materiali e le istruzioni preparati, oppure un'assistenza remota richiederebbe un incarico e accesso separati. Nessun accesso remoto o invio a terzi avviato.

Consegna proposta: pacchetto Windows ACA e materiali/procedura di predisposizione della centrale HAOS/ACA, verificati prima su un ambiente separato. Sul destinatario restano esecuzione iniziale, eventuale elevazione amministratore/attivazione Hyper-V e riavvio, selezione della rete, account nuovo e configurazione dei suoi dispositivi. La documentazione Microsoft citata richiede privilegi amministrativi per l'attivazione Hyper-V e indica il riavvio; firmware/virtualizzazione eventualmente non disponibili non vanno dichiarati correggibili automaticamente.

Il solo installer Electron attuale installa il client e non predispone la centrale (`progetto/client/windows/package.json` esclude il vecchio engine dal packaging). L'installer completo che crea/provisiona la VM non è una funzione già consegnata; preparazione e collaudo rimangono lavoro da assegnare. L'eventuale automazione del bootstrap deve risolvere ISSUE-162 e rispettare account/identità nuovi, non copiare i dati del banco dello sviluppatore. Questa risposta chiarisce il percorso, senza avviare build, scrivere script o modificare sistemi.

### Annotazione 2026-11-13 — immagine predisposta o completamento da ACA

Richiesta: «clonare os e creare installer os con predisposizione si può fare? oppure Installazione Haos, inserimento indirizzo IP, completamento automatico tramite comandi lanciati sul terminale da Acasystem in automatico? Possibile?». Valutate entrambe le ipotesi; nessuna implementazione o nuova decisione di distribuzione dedotta dalla domanda.

**Immagine e installer:** possibile preparare un pacchetto Windows che usa una copia verificata dell'immagine HAOS ufficiale vergine, crea una VM dedicata e applica la configurazione ACA a ogni installazione. Il sistema Windows del destinatario resta l'host della VM. La base da distribuire non deve essere il clone del banco già utilizzato: utenti, token, identità della casa/del sistema, reti e dati del mittente non devono essere ereditati dal destinatario. Un'immagine già avviata richiederebbe una procedura distinta di rigenerazione delle identità e pulizia verificata; l'approccio proposto evita questa dipendenza usando la base vergine. Il medesimo bootstrap applicativo può servire HAOS su mini PC, con installazione del sistema fisico distinta.

**IP e comandi automatici:** fattibile soltanto predisponendo un canale amministrativo iniziale autorizzato. L'indirizzo IP identifica l'host, non abilita una shell. Oggi `bootstrap-haos.sh --ip` costruisce URL health/QR e deve già essere eseguito nella console root host HAOS; non apre una sessione remota. Per una nuova installazione, il setup potrebbe predisporre un accesso autenticato specifico per quella installazione, eseguire il bootstrap e chiudere l'accesso di predisposizione al termine. Su HAOS già installato da terzi occorre invece una prima autorizzazione/predisposizione locale o amministrativa; inserire l'IP non è sufficiente. Non proposta una shell generica esposta ai client ACA o una password universale di distribuzione.

**Fonti primarie consultate2026-11-13:**

- [Configurazione host HAOS](https://contributors.home-assistant.io/os/operating-system/configuration/): cartella `CONFIG` sulla partizione di avvio utilizzabile prima del primo boot, anche per VM; importa le impostazioni riconosciute. Non è una funzione generica di esecuzione di script arbitrari al boot.
- [Console e SSH host HAOS](https://contributors.home-assistant.io/os/operating-system/debugging/): console locale/VM con `login`; SSH host22222 avviato soltanto con chiave autorizzata, distinto dall'app Terminal & SSH e documentato per sviluppo/debug. È un possibile meccanismo tecnico da valutare, non un canale prodotto già scelto o operativo. L'app terminale standard non equivale all'accesso root richiesto dallo script attuale: [attività comuni HAOS](https://www.home-assistant.io/common-tasks/os/).
- [PowerShell Direct](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/powershell-direct): richiede un guest Windows; non permette di presumere comandi dentro HAOS/Linux soltanto perché la VM usa Hyper-V. La gestione Windows della VM e la configurazione nel guest sono due livelli distinti.

**Codice osservato:** engine storico solo VirtualBox, escluso dal client corrente; nessun gestore Hyper-V individuato in client/ha-app. `localAppBootstrap.ts` digitava nella console VirtualBox con `VBoxManage`, non tramite il solo IP. Bootstrap idempotente sulla stessa versione (installazione/avvio solo se necessari), con rifiuto delle versioni differenti; vincolo .34/HAOS18.4 e ISSUE-162 confermati. Nessuna nuova funzione di predisposizione Hyper-V presente.

**Percorso consigliato, proposto:** installer Windows → immagine HAOS ufficiale vergine → VM e rete LAN → canale iniziale autorizzato → bootstrap ACA versionato e verifica health → apertura ACA per account nuovo. Account dei produttori e pairing dei dispositivi restano all'utente. Da validare prima l'automazione nel guest e la stabilità/rete del pilota; poi applicare lo stesso bootstrap alla destinazione mini PC. Registrato P-163-A come proposta non implementata; nessun accesso al PC destinatario, clone, immagine personalizzata, codice, build, installazione o pubblicazione eseguiti.

### Annotazione 2026-11-13 — base pulita ed esperienza completa, confronto prima del codice

Fonte umana: «Va bene, però poi dobbiamo anche installare in automatico l'integrazione sonoff + add on Acasystem seguendo questa strada», riferita alla proposta di immagine HAOS ufficiale vergine più procedura automatica. Precisazione immediatamente successiva: «il capo deve provare l'esperienza completa dell'app», i suoi Sonoff devono collegarsi «seguendo la procedura», serve «una base pulita su cui testare» e «prima di iniziare a scrivere codice [...] confrontati sulla mia idea». La richiesta corrente è quindi di confronto sul flusso e sul perimetro, prima di nuove modifiche al codice. Nessun codice scritto, build o installazione avviati in questa continuazione.

Direzione confermata: predisposizione automatica del componente **SonoffLAN** e dell'add-on **Acasystem** su HAOS vergine. Installare SonoffLAN non significa collegare l'account eWeLink o configurare i dispositivi del mittente. Il destinatario deve attraversare l'onboarding ACA reale, creare il proprio account/casa, accedere a Trova dispositivi, configurare Sonoff con il proprio account e scegliere/posizionare i widget con il normale flusso ACA. Per dispositivi non ancora predisposti su eWeLink rimangono l'associazione iniziale e gli eventuali consensi del produttore; non promettere che ACA li sostituisca.

Interpretazione proposta della base pulita: nessun utente, token, casa, profilo personale, widget associato, elenco dispositivi o attività personali del banco trasferiti. Solo sistema, componenti del prodotto e configurazione tecnica minima generata per la singola installazione. I valori iniziali di prodotto non devono essere confusi con dati simulati o profili del mittente. Tavano dovrà mostrare le attività della nuova centrale; nessun ripristino del registro personale del banco.

Verifica proposta della consegna: installazione iniziale → onboarding/account nuovo → login eWeLink dentro il percorso ACA → dispositivi effettivi → anteprima/Conferma widget → lettura/comando con riscontro → persistenza dopo chiusura/riapertura e riavvio → accesso da telefono sulla stessa LAN, con le regole correnti delle sessioni. Separare questa verifica dell'esperienza utente dal collaudo tecnico di VM, download, retry e bootstrap. Nessuna scorciatoia di configurazione usata come prova del flusso reale.

SonoffLAN3.13.3 è la candidata già osservata nel [REP005](REP-20261113-005-banco-sonofflan-trvzb.md), non una compatibilità provata con un nuovo Core/HAOS. [README upstream versionato](https://raw.githubusercontent.com/AlexxIT/SonoffLAN/v3.13.3/README.md) e [manifest](https://raw.githubusercontent.com/AlexxIT/SonoffLAN/v3.13.3/custom_components/sonoff/manifest.json), consultati2026-11-13: componente personalizzato installabile anche senza HACS, configurazione account distinta dall'installazione. Resta necessario allineare ACA/bootstrap e definire/collaudare il canale Hyper-V prima di consegnare il setup automatico. Pubblicazione, PC destinatario, banco e dati invariati.

### Annotazione 2026-11-13 — aggiornamenti all'avvio e pubblicazione del banco

Nuovi criteri umani: controllo automatico degli aggiornamenti per HAOS e ACA; «ogni commit aggiorni il banco online». Alla domanda sul target l'utente risponde **«Pubblicare su GitHub e aggiornare il banco di questo PC»**. Precisa poi: «l'app ad ogni avvio deve caricarsi e vedere se la versione online quale è e nel caso aggiornarsi in autonomia in base all'ultima pubblicazione rilevata su github». È richiesta la progettazione di pubblicazione/aggiornamento automatici; rimane attivo il confronto prima del codice. Nessun workflow o aggiornamento automatico è stato attivato ora.

**Criteri acquisiti:** controllo a ogni avvio di ACA e aggiornamento automatico a una pubblicazione più recente compatibile; pubblicazione GitHub e aggiornamento del banco di questo PC. Un commit soltanto locale non attiva GitHub Actions: il trigger online è il push sul ramo concordato. Download di artefatti, installazione sulla centrale e aggiornamento dei contenitori nativi sono passaggi distinti, non effetti impliciti della pubblicazione.

**Coordinamento proposto, da consolidare nel piano:** push al ramo di distribuzione → controlli/build → artefatti e immagine versionati completi → pubblicazione → aggiornamento locale del banco, recuperabile al suo successivo avvio se spento. Per i destinatari proporre l'ultima release stabile compatibile, distinguendola dalle pubblicazioni di prova del banco; la distinzione dei canali è una proposta esecutiva, non un canale già configurato. All'avvio il client avvia il controllo; la centrale resta responsabile dell'aggiornamento congiunto backend/bundle e dell'eventuale riavvio. Evitare aggiornamenti duplicati da più client, interruzioni di salvataggi/comandi e perdita delle bozze; controllo con timeout, versione installata utilizzabile se GitHub non è raggiungibile e centrale funzionante. Nessun downgrade soltanto perché la release pubblica è più vecchia. Backup dei dati prima dell'aggiornamento, verifica health/compatibilità e recupero coerente anche in presenza di migrazioni, da realizzare e collaudare.

**HAOS/Core/Supervisor e Sonoff:** HAOS rende disponibili notifiche/entità di aggiornamento separate per OS, Core, Supervisor e app; non dedurre l'installazione automatica di tutti i componenti dalla sola disponibilità. Richiesto controllo in ACA, ma la politica di applicazione delle nuove versioni HA e Sonoff deve essere distinta dall'aggiornamento ACA a ogni avvio. SonoffLAN è un componente personalizzato installato senza HACS: non ha oggi un aggiornamento automatico nel prodotto. I contenitori Windows/APK richiedono un percorso distinto quando cambia la versione minima shell; nessuna capacità di aggiornamento nativo silenzioso è stata dimostrata.

**Inventario verificato2026-11-13:**

- `origin` punta a `acamemo/acasystem`; distribuzione a `acamemo/acasystem-releases` e immagini `ghcr.io/acamemo/acasystem`. Entrambi i repository risultano pubblici, ramo predefinito `main`, dalla lettura autenticata GET delle API GitHub; nessuna modifica remota eseguita.
- Ultima release pubblica effettiva [v0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34), non prerelease/bozza; banco locale .72. `contents/.github/workflows` restituisce404 su entrambi i rami predefiniti; nessuna `.github` ACA trovata nella radice locale. Le automazioni della copia upstream conservata non dimostrano una pipeline ACA attiva. Il GET della raccolta workflow è stato rifiutato dal connettore, quindi non usato come evidenza dell'assenza di run storici.
- `progetto/client/core/src/startup.ts:104`, Windows/Android con `preferServerBundle:true`: il percorso attuale legge manifest/archivio dalla centrale, verifica SHA e compatibilità `minServer/minShell` e usa cache coerente. Il ramo GitHub latest esiste ma non è quello selezionato dai client correnti. `make-release.ts` e `ha-app/prepare.mjs` preparano materiali senza pubblicare/installare; bootstrap .34 rifiuta una versione installata diversa. Non trovato un updater completo nel prodotto corrente.

Fonti primarie consultate2026-11-13: [eventi GitHub Actions/push](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [aggiornamento HAOS](https://www.home-assistant.io/common-tasks/os/), [entità update Supervisor](https://www.home-assistant.io/integrations/hassio/). Registrato ISSUE-164 per la progettazione del ciclo; questo aggiornamento documentale non esegue commit, push, pubblicazione, installazione o modifiche al banco.
