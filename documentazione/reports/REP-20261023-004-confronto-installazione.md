# REP-20261023-004 — Confronto: come installare HA e Acasystem sul mini-PC dei clienti (domanda D-C1)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-004: **confronto scritto con le fonti** per la domanda D-C1 di [REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md) («Installazione sul mini-PC»). Solo ricerca e scrittura di documenti. |
| Stato | **In attesa di input.** Il confronto è scritto. La scelta spetta all'utente e al titolare (sezione 9). Nessuna tappa di realizzazione è autorizzata. **Annotazione 2026-10-23:** aggiunta in fondo la sezione «Conclusione richiesta il 2026-10-23», con la raccomandazione distinta tra banco e clienti; la scelta resta dell'utente. |
| Data | 2026-10-23 (Europe/Rome) |
| Autore / modello | Report scritto da Claude Code (Opus 5.5, `claude-opus-5-5`). Ricerca preparatoria di tre subagenti dello stesso flusso, modello non indicato nei file: `backup/confronto-installazione/metodi.md`, `scoperta.md`, `affidabilita-addon-installer.md` (cartella esclusa da Git). |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`). L'albero di lavoro ha molte modifiche non committate di altri flussi: lasciate intatte. Nessun commit eseguito. |
| Richiesta di riferimento | Utente, 2026-10-23: l'installer automatico serve «per semplificare il sistema il più possibile»; «quale versione permetterebbe di avere il rilevamento automatico di tutti i dispositivi in tutte le manier possibili senza crash con riavvio automatico? Voglio pensarci bene»; poi «sì, prepara il confronto scritto con le fonti». |
| Autorizzazione | Solo ricerca e scrittura: questo report e una riga in `reports/README.md`. Esclusi: codice, HA, Docker, VirtualBox, rete, tablet; credenziali e token; download di software; commit. Nessun processo terminato. |

**Hardware di riferimento** (dati riportati nell'incarico del flusso del 2026-10-23; la preferenza per un mini-PC dedicato è già registrata in REP-20261023-003 §6.2):

- **Clienti, specifica minima:** mini-PC consigliato con Intel N100/N150, 8 GB di RAM, SSD da 256 GB ed Ethernet.
- **Azienda:** un Dell con i5-12500, 8 GB di RAM, NVMe da 512 GB, grafica UHD e Wi-Fi.
- **Prove:** una macchina virtuale VirtualBox sul PC dell'utente (Windows 11 Home).
- **Alternativa possibile per i clienti:** Raspberry Pi 5 con SSD.

**Come leggere le etichette**

- **[Fatto]**: verificato su una fonte primaria consultata il 2026-10-23. Può essere una pagina ufficiale o il codice sorgente al tag indicato. L'URL è nella sezione «Fonti».
- **[Valutazione]**: giudizio dell'agente ricavato dai fatti. Non è scritto così nelle fonti.
- **[Da verificare]**: non trovato nelle fonti o non provato. Va controllato prima di contarci.
- **[Proposta]**: lavoro futuro, non autorizzato.

Attenzione: nei file preparatori in `backup/` la lettera `[V]` significa «verificato». In REP-20261023-003 la stessa lettera significa «valutazione». Qui le etichette sono scritte per intero per evitare confusione.

**Limite di metodo.** Le pagine web sono state lette con uno strumento che le riassume, quindi non sono citazioni testuali. I valori decisivi sono stati riletti nel codice sorgente grezzo, ai tag di rilascio indicati: tempi del watchdog, tentativi di avvio, permessi dell'app e rotte dell'onboarding. I file di codice e i loro permalink sono nella sezione «Fonti», tabella «Valori presi dal codice», così si possono ricontrollare senza i file in `backup/`. **Niente è stato provato su un sistema acceso.** Nessun HA, Supervisor o macchina virtuale è stato avviato per questo report.

**Glossario minimo** (una riga per voce):

- **HAOS**: Home Assistant OS, il sistema operativo completo di HA che occupa tutta la macchina.
- **Supervisor**: il programma di HAOS che installa, sorveglia, riavvia e aggiorna HA e le app.
- **App (ex add-on)**: un programma aggiuntivo installato e sorvegliato dal Supervisor, per esempio Matter Server o Mosquitto.
- **Proxy del Supervisor**: il passaggio interno con cui un'app parla con HA usando un token dato dal Supervisor.
- **Token (a lunga durata)**: una chiave che sostituisce la password per parlare con HA; chi la possiede agisce con i permessi del suo utente.
- **Slot A/B**: due copie del sistema; l'aggiornamento si scrive sull'altra copia e, se non parte, si torna alla precedente.
- **Watchdog**: un controllore che riavvia un programma o la macchina quando smettono di rispondere.
- **Ingress**: il modo di mostrare un'app dentro l'interfaccia di HA, invece che su una porta propria.
- **Flusso di configurazione**: la procedura guidata di HA per aggiungere un dispositivo o un servizio.
- **Onboarding**: la prima configurazione di HA appena installato, in cui si crea l'utente proprietario.
- **Preseed**: il file di risposte che rende automatica l'installazione di Debian.
- **Rete host**: un container che usa direttamente la rete della macchina, senza isolamento.
- **Companion app**: l'app ufficiale di HA per telefoni iOS e Android.

---

## Risposta breve (per il titolare)

1. **Nessuna versione garantisce «zero crash».** [Fatto] Nessuna fonte lo promette. Si può confrontare solo quanti meccanismi di ripristino sono già pronti e mantenuti da Home Assistant, e quanti dovremmo costruire e mantenere noi.
2. **La versione che risponde meglio alla domanda è Home Assistant OS (HAOS) sul mini-PC, con Acasystem installato come «app» di HAOS** (le app si chiamavano «add-on»). [Valutazione] È l'opzione A di questo report e la (a) di D-C1. I motivi sono tre:
   - **Rilevamento.** [Fatto] Solo HAOS offre «pronti all'uso» Thread, Z-Wave e il server Matter. Per Matter l'app è l'unica opzione supportata da HA. Il Bluetooth si configura da solo. **Limite importante** [Fatto]: un nuovo dispositivo Matter si aggiunge solo dalla Companion app di HA sul telefono, non dal browser. Acasystem quindi non può aggiungere dispositivi Matter, né con A né con B (sezione 2).
   - **Riavvio automatico.** [Fatto, dal codice] HAOS ha già sei livelli:
     - un watchdog hardware che riavvia la macchina se il sistema si blocca;
     - il riavvio della macchina se Docker non parte;
     - il riavvio automatico del Supervisor;
     - un controllo di HA ogni 2 minuti, con riavvio se HA è bloccato;
     - lo stesso controllo per le app;
     - gli aggiornamenti a due copie, con ritorno indietro automatico se l'aggiornamento non parte.

     **Quando i tentativi finiscono, il sistema si ferma e serve un intervento.** [Fatto, dal codice] Dopo 5 tentativi falliti il Supervisor smette di riavviare HA o l'app (per HA l'ultimo tentativo è un avvio in modalità sicura); il servizio del Supervisor si arrende dopo 5 avvii falliti in 30 minuti; le due copie del sistema proteggono solo se il sistema non parte. Oggi nessuna opzione prevede come l'azienda verrebbe avvisata né come interverrebbe a distanza (domanda D-C15).
   - **Permessi.** [Fatto, documentazione] Un'app autorizzata agisce in HA **come amministratore**, con un proprio token dato dal sistema, senza nessuna password del cliente. [Da verificare, prova T1] Che con quel token si possano davvero aggiungere dispositivi e scrivere automazioni: lo indica il codice, ma non è provato. Se la prova riesce, si realizza la risposta «Anche il cliente» (D-D1) senza usare le credenziali del cliente.
3. **L'alternativa è Debian + Docker.** [Fatto] Dal dicembre 2025 (release 2025.12) l'installazione «Supervised» non è più supportata. Debian + Docker quindi significa **HA Container**, che non ha app. In Container:
   - Matter, Thread, Z-Wave, Zigbee2MQTT e il broker MQTT diventano container separati da installare e mantenere noi;
   - per il server Matter fuori da HAOS, HA dichiara che il supporto non c'è;
   - il riavvio di un programma bloccato e il ritorno indietro degli aggiornamenti vanno costruiti da noi.

   [Valutazione] È fattibile, ma è la strada più lunga e più fragile da mantenere su tanti clienti.
4. **Installer automatico.** [Fatto] Oggi HAOS su PC x86 non ha un installer ufficiale. Esiste un installer ufficiale in prova (beta), e la sua versione da chiavetta per PC è una prova di concetto ancora aperta. Debian invece si installa senza presenza con un file di risposte (preseed). [Valutazione] In entrambi i casi l'«installer» è un nostro lavoro in due parti:
   - **(1) Scrittura del sistema sul disco.** Si fa con una chiavetta.
   - **(2) Configurazione automatica.** Crea l'utente proprietario, installa Acasystem, attiva il riavvio automatico e fa il primo backup. Con HAOS si fa interamente con le API di HA.

   Restano sempre dei passi fisici: impostazioni del BIOS, avvio dalla chiavetta e cavo di rete.
5. **Cosa può renderla sbagliata.** La raccomandazione dipende da una prova da fare sulla macchina virtuale: confermare in esecuzione che l'app può aggiungere dispositivi e scrivere automazioni in HA. La lettura del codice lo indica, ma una prova non c'è (sezione 7). Inoltre [Fatto, dal codice] il Supervisor, da cui dipende l'opzione A, **si aggiorna da solo** di serie: un suo aggiornamento potrebbe rompere Acasystem senza che nessuno lo abbia deciso. Altre condizioni nella sezione 7.
6. **Licenza.** [Fatto] Acasystem è GPL-3.0 (derivato da Tunet). Se si consegna ai clienti, va fornito anche il codice sorgente: la scelta «codice privato» non è libera (sezione 4.4). Serve un parere umano o legale.

---

## Obiettivo e perimetro

**Obiettivo:** dare all'utente e al titolare un confronto leggibile e con fonti per scegliere come installare HA e Acasystem sul mini-PC dei clienti (D-C1). Il confronto deve rispondere alla domanda «rilevamento di tutti i dispositivi, senza crash, con riavvio automatico» e al desiderio di un installer automatico.

**Ammesso:** questo report e una riga nuova in `reports/README.md`, riletto subito prima. Letture in sola lettura del repository, dei file preparatori in `backup/confronto-installazione/` e di fonti pubbliche.

**Escluso:**

- `progetto/`, HA, Docker, VirtualBox, la rete e i tablet.
- `project-status.md`, `product.md`, `infrastructure.md`, ADR-0009 e ADR-0021, perché li modificano altri flussi. Le righe da aggiungere sono in fondo.
- La creazione di nuovi ADR.
- Download di software e prove in esecuzione.

**Collegamenti:**

- Requisiti: REQ-02, REQ-06.
- Decisioni: [ADR-0009](../decisions/ADR-0009-home-assistant-dietro-acasystem.md), [ADR-0021](../decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md) (accettata il 2026-10-23).
- Report: [REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md) §5.2, §6.1, §6.2, §9 (D-C1, D-C2, D-D1, D-D16); [REP-20261021-001](REP-20261021-001-hub-bridge-piano.md) (D-H3, D-H4).

**Modifiche preesistenti:** `git status` mostra file modificati in `documentazione/` (compreso `reports/README.md`) e in `progetto/`. Sono preservate. L'indice riceve una sola riga, aggiunta dopo la rilettura.

## Criteri di completamento

| Criterio | Esito |
|---|---|
| Risposta breve comprensibile da un titolare non tecnico | Fatto |
| Tabella comparativa con queste voci: rilevamento per meccanismo, riavvio dopo blocchi e blackout, aggiornamenti, backup, permessi per l'aggiunta da Acasystem, lavoro per noi, installer, supporto ufficiale, Raspberry/ARM | Fatto (sezioni 2 e 3) |
| Pro, contro e rischi di ogni opzione | Fatto (sezione 4) |
| Costo di lavoro in tappe, non in euro | Fatto (sezione 5) |
| Raccomandazione motivata, con le condizioni che la renderebbero sbagliata | Fatto (sezioni 6 e 7) |
| Impatto su REP-20261023-003, ADR-0009 e ADR-0021 | Fatto (sezione 8) |
| Domande per l'utente | Fatto (sezione 9) |
| Fonti con URL e data; fatti, valutazioni e punti da verificare distinti | Fatto (etichette e sezione «Fonti») |
| Indice dei report aggiornato dopo la rilettura | Fatto |

---

## 1. Le opzioni in gioco

| Opzione | In breve | Stato presso HA |
|---|---|---|
| **A. HAOS + Acasystem come app** | Il mini-PC esegue solo Home Assistant OS. Acasystem è un'app installata dal nostro repository e gestita dal Supervisor, come Matter Server o Mosquitto. Per il tablet si usa una porta propria (3002) e non l'«ingress» di HA (sezione 8.2). | HAOS supportato e raccomandato [Fatto]. L'app la supportiamo noi. |
| **B. Debian 13 + Docker + HA Container** | Debian installato da noi. Docker esegue HA Container, Acasystem e, se servono, Matter, Thread, Z-Wave, Zigbee2MQTT e MQTT come container separati, tutti in rete host. | Container supportato [Fatto]. I container aggiuntivi sono comunitari; Matter fuori da HAOS è «non supportato» [Fatto]. |
| C. Linux con macchina virtuale HAOS + Acasystem accanto | Il mini-PC esegue un sistema di virtualizzazione. HAOS gira in una macchina virtuale e Acasystem in un container dell'host. | HAOS in VM è citato dal blog ufficiale come via per chi vuole più controllo [Fatto]. Il sistema di virtualizzazione (per esempio Proxmox) non è stato studiato [Da verificare]. |
| ~~D. Supervised / Core~~ | Debian con Supervisor (Supervised) oppure HA in Python (Core). | **Esclusi.** Deprecati il 2025-05-22; supporto terminato con la release 2025.12 [Fatto]. |

Nota sulla D [Da verificare]: il blog del 2025-05-22 dice che dopo la 2025.12 i sistemi Supervised si possono ancora usare e aggiornare, solo senza supporto. Il riassunto delle note di release 2025.12 parla invece di nessun aggiornamento, nemmeno di sicurezza. La discordanza non è risolta. Non cambia la conclusione: un metodo senza supporto non è una base per i clienti [Valutazione].

---

## 2. Rilevamento automatico, meccanismo per meccanismo

[Valutazione] Su qualunque opzione, «tutti i dispositivi in tutte le maniere» ha limiti fisici e di rete:

- **Rete.** Serve una rete di casa piatta: stessa rete e multicast non filtrato. [Fatto] Per Matter e Thread anche IPv6 libero.
- **Radio.** Le radio vanno comprate e collegate: chiavette Zigbee, Thread e Z-Wave, oppure Bluetooth.
- **Integrazioni.** Un dispositivo è trovato da solo solo se la sua integrazione in HA dichiara come riconoscerlo.
- **Casi a mano.** I dispositivi cloud, quelli con login esterno e quelli che non si annunciano restano da aggiungere a mano o per indirizzo. Un esempio è il TV LG `.26`, che non risponde alla ricerca SSDP (REP-20261023-003 §5.2).

| Meccanismo | A. HAOS | B. Debian + Container | Fonte |
|---|---|---|---|
| mDNS / zeroconf | Attivo senza configurazione [Fatto] | Serve la rete host, che il comando ufficiale usa [Fatto]. Che la rete bridge lo rompa lo dicono solo post della comunità [Da verificare] | https://www.home-assistant.io/integrations/zeroconf/ ; https://www.home-assistant.io/installation/linux/ |
| SSDP / UPnP | Attivo senza configurazione [Fatto] | Rete host [Valutazione] | https://www.home-assistant.io/integrations/ssdp/ |
| DHCP | Attivo senza configurazione [Fatto] | La pagina non indica permessi. Il comando ufficiale usa comunque `--privileged` e la rete host [Fatto]. Se servano permessi speciali [Da verificare] | https://www.home-assistant.io/integrations/dhcp/ |
| Bluetooth del mini-PC | Configurato automaticamente da HAOS 9.0 [Fatto] | Vanno aggiunti a mano dei permessi Linux e un collegamento al servizio Bluetooth dell'host; al cambio va ricreato il container [Fatto] | https://www.home-assistant.io/integrations/bluetooth/ |
| Bluetooth via proxy di rete (ESPHome, Shelly) | Uguale | Uguale; evita il Bluetooth dell'host [Valutazione] | https://www.home-assistant.io/integrations/bluetooth/ |
| Improv via BLE (dispositivi Wi-Fi non ancora configurati) | Rilevati da soli finché non sono sulla rete Wi-Fi; HA invia loro nome e password del Wi-Fi via Bluetooth [Fatto]. Serve il Bluetooth del server, un proxy con connessioni attive (non Shelly né SMLIGHT) o la Companion app [Fatto] | Uguale, se il Bluetooth funziona nel container (riga sopra) [Valutazione] | https://www.home-assistant.io/integrations/improv_ble/ |
| USB (chiavette, rilevamento al collegamento) | Rilevamento al collegamento [Fatto/Valutazione] | Ogni chiavetta va passata al container a mano. Il rilevamento al collegamento non è garantito [Da verificare] | https://www.home-assistant.io/integrations/usb/ ; https://www.home-assistant.io/integrations/zha/ |
| MQTT discovery (dispositivi che si annunciano via MQTT) | Attiva di serie, prefisso `homeassistant` [Fatto]. Il broker Mosquitto si può impostare in automatico dall'integrazione MQTT [Fatto] | Attiva di serie [Fatto]; broker in un container nostro, con utenti e password creati da noi [Valutazione] | https://www.home-assistant.io/integrations/mqtt/ (elenca Tasmota, Zigbee2MQTT ed ESPHome tra i programmi con discovery MQTT; Shelly non è nominato) |
| Discovery delle app del Supervisor (un'app propone da sola la sua integrazione) | Esiste: Core riceve dal Supervisor gli annunci delle app e apre un flusso di configurazione con origine `hassio` [Fatto, codice Core 2026.10.2] | **Non esiste**: senza Supervisor non ci sono app né annunci [Valutazione] | https://contributors.home-assistant.io/apps/guides/communication/ (endpoint `/discovery` e `/services`); codice `components/hassio/discovery.py` (sezione «Fonti») |
| Matter: server | App Matter Server, **l'unica opzione supportata** [Fatto] | Container `matterjs-server`, «non supportato, a proprio rischio» per HA [Fatto]. Il vecchio server Python è archiviato dal 2026-06-23 [Fatto] | https://www.home-assistant.io/integrations/matter/ ; https://github.com/matter-js/matterjs-server |
| **Matter: aggiunta di un nuovo dispositivo** | **Solo dalla Companion app** su iOS o Android, con il Bluetooth del telefono; non dal browser; l'adattatore Bluetooth del server non viene usato [Fatto] | Uguale [Fatto] | https://www.home-assistant.io/integrations/matter/ |
| Thread (border router OTBR) | App OTBR con chiavetta Thread [Fatto]. Per aggiungere dispositivi Thread il telefono deve conoscere le credenziali della rete Thread di HA (su Android vanno sincronizzate) [Fatto] | «Nessun supporto pronto all'uso» [Fatto]. Container OTBR esterno con permessi di rete [Fatto]. Le guide di Matter e OTBR si contraddicono sull'inoltro IPv6 [Valutazione] | https://www.home-assistant.io/installation/ ; https://www.home-assistant.io/integrations/otbr/ ; https://www.home-assistant.io/integrations/matter/ ; https://openthread.io/guides/border-router/docker |
| Zigbee con ZHA | Chiavetta USB riconosciuta [Fatto] | Chiavetta da passare al container; su Debian va rimosso ModemManager [Fatto] | https://www.home-assistant.io/integrations/zha/ |
| Zigbee con Zigbee2MQTT | App, solo su HAOS; il broker Mosquitto ha credenziali create in automatico [Fatto] | Due container (Zigbee2MQTT e broker) con credenziali create da noi [Fatto] | https://www.zigbee2mqtt.io/guide/installation/02_docker.html ; https://www.zigbee2mqtt.io/guide/installation/03_ha_addon.html |
| Z-Wave | App Z-Wave JS, solo su HAOS, proposta da sola quando si collega la chiavetta [Fatto] | Container Z-Wave JS UI e indirizzo da inserire a mano [Fatto]. «Nessun supporto pronto all'uso» [Fatto] | https://www.home-assistant.io/integrations/zwave_js/ ; https://www.home-assistant.io/installation/ |
| HomeKit | Via mDNS, Bluetooth o Thread, come sopra | Come sopra, con rete host | https://www.home-assistant.io/integrations/homekit_controller/ |
| Integrazioni cloud o con login esterno (OAuth) | Nessuna scoperta locale: si aggiungono a mano con l'account del servizio [Valutazione] | Uguale [Valutazione] | — |

Nota sulle scansioni di rete (`nmap_tracker`, https://www.home-assistant.io/integrations/nmap_tracker/): come nmap sia fornito e con quali permessi non è stato verificato per nessuna opzione [Da verificare]. Non pesa sulla scelta.

**Conseguenza per Acasystem** [Valutazione]. Acasystem è un'app web sul tablet: anche con A non può aggiungere dispositivi Matter, e per Thread serve comunque un telefono con le credenziali della rete. Restano due strade, da decidere (D-C14): un telefono di servizio dell'installatore con la Companion app, oppure escludere Matter dall'aggiunta da Acasystem. La Companion app richiede un utente HA, cosa che tocca D-D1 e D-C5 (nessuna credenziale del cliente). Il server Matter di HAOS resta un vantaggio di A, ma solo per far funzionare i dispositivi già aggiunti.

**Sintesi [Valutazione]:**

- **HAOS** dà la copertura più ampia con meno parti a mano, anche grazie alla discovery delle app.
- **Matter** non si aggiunge dal browser con nessuna opzione: serve la Companion app.
- **Container** può avvicinarsi, ma con un container in più per ogni famiglia di radio. Per Matter perde il supporto ufficiale.
- **Opzione C:** il rilevamento di rete richiede che la VM sia a ponte sulla LAN. Le chiavette USB vanno passate dall'host alla VM, e nessuna guida HA consultata lo descrive per i sistemi di virtualizzazione diversi da KVM [Da verificare].

---

## 3. Tabella comparativa

| Voce | A. HAOS + Acasystem app | B. Debian 13 + Docker + HA Container | C. VM HAOS + Acasystem sull'host |
|---|---|---|---|
| **Rilevamento** (dettaglio nella sezione 2) | Massimo con meno lavoro; Matter, Thread e Z-Wave pronti [Fatto] | Quasi pari con molti container nostri; Matter non supportato [Fatto] | Come A per HA; chiavette USB da passare alla VM [Da verificare] |
| **Programma che esce (crash)** | HA: riavvio in circa 10 s, fino a 5 tentativi. App: riavvio con attese crescenti (10, 20, 40, 80 s), fino a 5 tentativi, **solo se il watchdog dell'app è attivo**, e di serie è spento [Fatto, codice Supervisor 2026.10.3]. **Dopo il quinto tentativo il Supervisor smette**: HA o l'app restano fermi finché qualcuno interviene [Fatto, codice] | Docker con `restart: unless-stopped` [Fatto] | A dentro la VM; Docker per Acasystem |
| **Programma bloccato ma vivo** | HA: controllo ogni 120 s e riavvio dopo 2 fallimenti, quindi circa 2-4 minuti [Fatto + Valutazione sul tempo]. App: stesso schema, con un indirizzo di controllo dichiarato e il watchdog attivo [Fatto] | **Nulla di serie.** [Fatto] Docker segna «unhealthy» ma non riavvia. Serve un riavviatore (autoheal o un timer nostro) [Fatto/Valutazione]. L'immagine di HA non ha un controllo di salute [Fatto] | Misto: A per HA, da costruire per Acasystem |
| **Sistema bloccato** | Watchdog hardware configurato: riavvio dopo 300 s; driver per Intel inclusi [Fatto]. Che il Dell e l'N100 lo espongano davvero [Da verificare] | Da configurare noi in systemd [Fatto]; driver [Da verificare] | Da configurare sull'host [Da verificare] |
| **Blackout** | Sistema in sola lettura; dati su ext4 con journal, perdita di circa 30 s [Fatto/Valutazione]; controllo del disco a ogni avvio [Fatto]. Database di HA corrotto: rinominato, HA riparte senza storico [Fatto]. Riaccensione da BIOS [Da verificare] | ext4 con journal; controllo del disco da verificare su Debian 13 [Da verificare]. Un blackout durante un aggiornamento apt può lasciare il sistema non avviabile (wiki Debian) [Fatto] | Due livelli esposti al blackout [Valutazione] |
| **Aggiornamenti del sistema** | Due copie A/B firmate; se la nuova non avvia, torna alla precedente dopo al massimo 3 tentativi (x86) [Fatto]. Non protegge se il sistema parte ma HA no [Fatto, codice] | `unattended-upgrades`: solo pacchetti Debian, riavvio spento di serie, non atomico, senza ritorno indietro [Fatto] | Host come B, HAOS come A |
| **Aggiornamenti di HA** | Ritorno indietro automatico se la nuova versione non porta su l'interfaccia [Fatto, codice]. HA (Core) e il sistema (OS) si aggiornano solo a comando [Fatto, codice]. **Il Supervisor invece si aggiorna da solo** (opzione `auto_update` vera di serie, controllo ogni 24 h), e così i plugin CLI, DNS, audio, multicast e observer (circa ogni 12 h) [Fatto, codice Supervisor 2026.10.3: `validate.py`, `updater.py`, `misc/tasks.py`]. Se e con quali effetti si possa spegnere l'aggiornamento automatico del Supervisor [Da verificare] | Manuali [Fatto]; ritorno indietro con l'immagine precedente, a mano [Valutazione] | Come A |
| **Aggiornamenti di Acasystem** | Da nostro repository di app; automatici se si attiva `auto_update`, con un giorno di attesa e backup prima [Fatto, codice]. Ritorno indietro dell'app non documentato: si usa il backup [Da verificare] | Script nostro con tag fissi [Proposta] | Script nostro |
| **Backup** | Backup completi o parziali da interfaccia e CLI, pianificabili; includono le app e i loro dati [Fatto]. Per SQLite meglio il backup «a freddo» [Valutazione] | Il backup di HA copre solo HA [Valutazione]; il ripristino su Container è dichiarato dalla 2025.1, ma un thread della comunità lo contraddice [Fatto/Da verificare]. Dati di Acasystem e degli altri container a carico nostro | HA come A; Acasystem a carico nostro |
| **Permessi per aggiungere dispositivi da Acasystem** | L'app riceve dal Supervisor un token proprio. «Attraverso il proxy l'app agisce come amministratore di HA» [Fatto, doc]. Dal codice: avvio dei flussi di configurazione e scrittura di automazioni consentiti [Fatto, codice; **non provato**]. Nessuna credenziale del cliente | Serve un utente amministratore dedicato con un token a lunga durata (fino a 10 anni), creato dall'installer durante l'onboarding. Il token va custodito sul mini-PC [Fatto/Valutazione] | Come B (Acasystem è fuori da HAOS) |
| **Lavoro per noi** | Impacchettare Acasystem come app, multi-architettura; script di configurazione; installer [Valutazione] | Tutto lo strato di affidabilità, aggiornamenti e ritorno indietro, e un container per ogni radio. Manutenzione per ogni versione di ogni pezzo [Valutazione] | Somma di parti di A e di B, più il sistema di virtualizzazione [Valutazione] |
| **Installer automatico** | Nessun installer ufficiale per x86: un'app desktop ufficiale in beta e una chiavetta in prova di concetto (PR #256 aperta) [Fatto]. Configurazione interamente via API dell'onboarding e del Supervisor [Fatto, codice] | Preseed Debian ufficiale e documentato [Fatto] più i nostri script [Proposta] | Installer del sistema di virtualizzazione [Da verificare] più VM più script |
| **Avviso e assistenza a distanza** | Nessun meccanismo scelto. Quando i riavvii automatici finiscono, il sistema resta fermo e nessuno viene avvisato [Valutazione]. Possibili strade, non studiate: accesso remoto di Nabu Casa, una VPN, avvisi da HA o dall'app [Proposta, Da verificare] | Uguale, da costruire tutto [Proposta] | Uguale, su due livelli [Proposta] |
| **Supporto ufficiale** | HAOS supportato e raccomandato; Matter Server, Z-Wave JS e OTBR come app ufficiali [Fatto] | HA Container supportato; Matter fuori da HAOS non supportato; Zigbee2MQTT e Z-Wave JS UI comunitari [Fatto] | HAOS in VM documentato [Fatto]; host nostro |
| **Raspberry Pi 5 / ARM** | HAOS supporta Pi 5 (minimo 2 GB) [Fatto]. Guida ufficiale solo per scheda SD; avvio da SSD non descritto [Da verificare]. App da costruire anche per `aarch64`; `better-sqlite3` su Alpine ARM [Da verificare] | Debian o Raspberry Pi OS: non studiati [Da verificare] | Sconsigliato su Pi [Valutazione] |

---

## 4. Pro, contro e rischi

### 4.1 A. HAOS + Acasystem come app

**Pro**

- [Fatto] È il metodo raccomandato da HA e include tutto: Supervisor, app, backup, aggiornamenti A/B e ritorno indietro di HA.
- [Fatto] Rilevamento più ampio senza lavoro: server Matter, Thread, Z-Wave, Bluetooth e discovery delle app pronti. L'aggiunta di nuovi dispositivi Matter resta comunque nella Companion app.
- [Fatto] Più livelli di recupero già fatti e mantenuti da HA (tabella sopra).
- [Fatto, documentazione] Identità amministratore per Acasystem senza credenziali di nessuno; [Da verificare, prova T1] aggiunta di dispositivi e automazioni con quell'identità. Se la prova riesce, risolve il nodo di D-D1 «Anche il cliente».
- [Valutazione] Un solo sistema da installare e aggiornare. Acasystem entra nei backup di HA.
- [Valutazione] Coincide con il banco già preparato: la VM `acasystem-ha` con HAOS 18.3 (REP-20261023-003, I1-I2).

**Contro**

- [Fatto] La macchina è dedicata: niente altro software fuori dalle app. Con la protezione attiva di serie, un'app non può avere pieno accesso all'host né a Docker.
- [Fatto] Il watchdog e l'aggiornamento automatico dell'app sono **spenti di serie**: l'installer deve accenderli.
- [Fatto] Il token dell'app ha **pieni poteri** in HA, anche su utenti e credenziali. Il proxy blocca solo i comandi del Supervisor.
  - [Valutazione] La facciata `/api/dispositivi` di ADR-0021 diventa il vero confine di sicurezza.
  - [Valutazione] Il token non deve mai arrivare al browser.
  - [Valutazione] Il filtro del tunnel (D-D16) pesa di più.
- [Da verificare] Le azioni compiute da Acasystem risultano in HA come fatte dall'utente di sistema «Supervisor». Il registro di Acasystem resta la sola traccia per persona.
- [Fatto] Per distribuire l'app ai clienti serve un'immagine scaricabile. Un'immagine privata richiede credenziali di registro su ogni Supervisor [Da verificare]. Il repository Git privato non ha un meccanismo documentato per le credenziali [Fatto, codice].

**Rischi**

- [Valutazione] Dipendenza dalle scelte di HA: le ha già cambiate con Supervised. Rischio comune anche a B, che usa comunque HA.
- [Da verificare] Hardware del Dell: settori del NVMe (HAOS non avvia su dischi 4Kn), Wi-Fi, watchdog e riaccensione dopo blackout.
- [Fatto] Finché l'onboarding non è completato, chiunque raggiunga la porta 8123 può creare il proprietario. L'installer deve agire subito e su una rete controllata.
- [Da verificare] Funzionamento reale dei permessi dell'app, prova T1 (sezione 7).
- **Aggiunta Matter impossibile da Acasystem.** [Fatto] Un nuovo dispositivo Matter si aggiunge solo dalla Companion app sul telefono (https://www.home-assistant.io/integrations/matter/). Vale anche per B. La Companion app richiede un utente HA: tocca D-D1 e D-C5. [Da verificare] Il caso Thread, perché il telefono deve ricevere le credenziali della rete Thread.
- **Il Supervisor si aggiorna da solo.** [Fatto, codice] Opzione `auto_update` vera di serie per il Supervisor; i plugin si aggiornano da soli circa ogni 12 h. Proxy, token, API `/addons` e watchdog dell'app dipendono proprio da questo componente. [Valutazione] Un aggiornamento non deciso da noi può rompere Acasystem; per esempio il cambio di nome «add-on» → «app» potrebbe cambiare percorsi e chiavi dell'API. [Da verificare] Se si può spegnere l'aggiornamento automatico del Supervisor senza che il sistema venga segnato «unsupported» o «unhealthy»: nel codice l'aggiornamento parte solo se valgono condizioni come `AUTO_UPDATE` e `HEALTHY`, ma l'effetto dello spegnimento non è stato letto.
- **Esposizione di HA sulla rete del cliente.** [Valutazione] Su HAOS non risulta un firewall dell'host configurabile dall'utente: la documentazione OS consultata non ne descrive uno (non trovata una frase esplicita, quindi [Da verificare] in senso stretto). [Fatto] Il blocco YAML `http:` è segnalato come deprecato; la pagina ufficiale non documenta più `server_host` e offre l'impostazione «Listen addresses», cioè gli indirizzi su cui HA ascolta (vuoto = tutti) (https://www.home-assistant.io/integrations/http/). [Da verificare] Se limitare l'ascolto su HAOS rompa il Supervisor, le app (che raggiungono HA da `172.30.32.1`) o la Companion app. Fino a una decisione, chiunque sulla LAN del cliente raggiunge la pagina di accesso di HA.
- **La porta 3002 diventa l'ingresso a un'identità con pieni poteri.** [Valutazione] L'app Acasystem pubblica la 3002 sulla LAN con la propria autenticazione; dietro c'è il token dell'app, amministratore di HA. Una debolezza dell'accesso di Acasystem diventa un accesso amministratore a HA. Vale anche per B, con il token a lunga durata.

### 4.2 B. Debian 13 + Docker + HA Container

**Pro**

- [Valutazione] Controllo totale del sistema operativo. Acasystem resta un container come oggi, quasi senza cambiamenti.
- [Fatto] Installazione senza presenza documentata (preseed).
- [Fatto] Debian 13 è supportato fino al 2028-08-09 (LTS fino al 2030-06-30).

**Contro**

- [Fatto] Niente app né Supervisor. Ogni famiglia di radio è un container nostro; per Matter manca il supporto di HA.
- [Fatto] Docker non riavvia un programma bloccato. Il ritorno indietro di HA e del sistema non esiste.
- [Fatto] Gli aggiornamenti apt non sono atomici: un blackout durante l'aggiornamento è un rischio.
- [Valutazione] Con tutti i container in rete host, Docker non pubblica porte: ogni servizio in ascolto (HA, MQTT, Z-Wave JS UI, l'API REST di OTBR, Acasystem) è esposto direttamente sulla LAN. Serve un firewall dell'host configurato e mantenuto da noi.
- [Fatto] Il registro di Docker di serie non ha limite di dimensione: il disco può riempirsi.
- [Valutazione] L'utente amministratore e il token a lunga durata per Acasystem sono un segreto da creare e custodire su ogni mini-PC.

**Rischi**

- [Valutazione] Lo strato di affidabilità è tutto nostro: va progettato, provato e mantenuto su ogni versione di HA, Docker e Debian, per ogni cliente.
- [Fatto] Un riavviatore come autoheal richiede il socket di Docker, cioè pieni poteri sulla macchina. L'ultimo aggiornamento del suo codice è del 2025-09-09.

### 4.3 C. VM HAOS + Acasystem sull'host

**Pro.** [Valutazione] HA ha tutti i vantaggi di HAOS, e Acasystem resta fuori da HAOS con il sistema host sotto il nostro controllo.

**Contro e rischi.** [Valutazione]

- Due sistemi da installare, aggiornare e proteggere dal blackout.
- Le chiavette USB vanno passate alla VM.
- Il watchdog va configurato su due livelli.
- Acasystem, essendo fuori da HAOS, ha bisogno dell'utente amministratore con token come in B.
- Sul mini-PC N100 da 8 GB le risorse sono più strette.
- Il sistema di virtualizzazione non è stato studiato [Da verificare].

Non è raccomandata: somma lavoro di A e di B senza dare il token di sistema.

### 4.4 Licenze e marchio (tutte le opzioni)

- [Fatto, repository locale] Acasystem è sotto GPL-3.0: file `progetto/acasystem/LICENSE` (GNU GPL versione 3) e campo `"license": "GPL-3.0"` in `progetto/acasystem/package.json`, `backend/package.json`, `frontend/package.json` e `casa3d/package.json`. Il codice deriva da Tunet.
- [Valutazione, non parere legale] Consegnare ai clienti un'immagine GPL-3.0 installata sul mini-PC è una distribuzione: la GPL-3.0 chiede di offrire ai destinatari il sorgente corrispondente. La scelta «privato» di D-C6 non è quindi libera come sembrava. **Serve un parere umano o legale**; non è una conclusione dell'agente.
- [Fatto, dati di licenza dei repository GitHub consultati il 2026-10-23] Componenti dell'opzione B e di A: Zigbee2MQTT GPL-3.0; Z-Wave JS UI MIT; matterjs-server Apache-2.0; ot-br-posix (OTBR) BSD-3-Clause; home-assistant/core, operating-system e supervisor Apache-2.0; Mosquitto senza identificativo SPDX rilevato da GitHub. [Da verificare] Obblighi concreti quando si distribuiscono questi componenti preinstallati.
- [Da verificare] Uso commerciale del nome e del logo «Home Assistant» su prodotti preinstallati venduti ai clienti: politica del marchio di Nabu Casa / Open Home Foundation non letta.

---

## 5. Costo di lavoro stimato in tappe (non in euro) [Proposta]

Dimensioni indicative: **piccola** = una sessione, **media** = alcune sessioni con prove, **grande** = più giorni con prove ripetute. La colonna «Modello» segue la regola «piano con Opus, realizzazione con Sonnet/Haiku». Nessuna tappa è autorizzata.

### 5.1 Opzione A

| Tappa | Contenuto | Dimensione | Dipende da |
|---|---|---|---|
| A0 | Decisione D-C1 e nuovo ADR sull'installazione dei clienti | Utente | — |
| A1 | Prove sulla VM `acasystem-ha` con una piccola app locale di prova (snapshot prima di ogni prova): permessi dell'app (T1), watchdog dell'app e di HA (T2-T3), spegnimento brusco (T4), slot A/B (T5), watchdog nella VM (T6) | Media | A0, avvio della VM (tappa di migrazione di REP-20261023-003) |
| A2 | Impacchettare Acasystem come app: `config.yaml` (porta 3002, `homeassistant_api`, `watchdog` su `/api/health`, backup a freddo), dati in `/data`, collegamento a HA tramite il Supervisor | Media | A1 superata |
| A3 | Costruzione per `amd64` e, se serve il Pi, `aarch64`; repository e pubblicazione dell'immagine | Media | A2, D-C6 |
| A4 | Backend: la facciata `/api/dispositivi` usa l'identità dell'app al posto del token dell'utente; il token resta sul server | Media | A2; annotazione su ADR-0021 |
| A5 | Script di configurazione automatica: onboarding via API, repository, installazione, `boot: auto` e `watchdog: true`, primo backup, prove di fumo | Media | A2-A3, D-C5 |
| A6 | Chiavetta di installazione: scrittura dell'immagine HAOS e cartella `CONFIG` per rete e SSH. In alternativa si usa l'installer ufficiale quando sarà rilasciato | Grande, rischiosa (cancellazione del disco sbagliato) | D-C10 |
| A7 | Prove sul Dell reale: watchdog, riaccensione dopo blackout, NVMe, Wi-Fi o Ethernet | Piccola, con hardware | Autorizzazione e Dell disponibile |
| A8 | Piano di manutenzione: chi e quando aggiorna HA, il sistema e l'app; **monitoraggio delle note di rilascio del Supervisor**, che si aggiorna da solo, con una prova di regressione dell'app sulla VM a ogni nuova versione; avviso e assistenza a distanza (D-C15) | Piccola per il piano, poi continua | D-C7, D-C15 |

### 5.2 Opzione B

| Tappa | Contenuto | Dimensione | Dipende da |
|---|---|---|---|
| B0 | Decisione e nuovo ADR | Utente | — |
| B1 | Preseed Debian 13, firmware Wi-Fi, utenti, SSH, firewall | Media | B0 |
| B2 | `compose` con HA Container, Acasystem, broker MQTT e, secondo D-C2, Matter, OTBR, Z-Wave JS UI e Zigbee2MQTT, tutti in rete host con i permessi documentati | Media o grande | B1, D-C2 |
| B3 | Affidabilità: controlli di salute per ogni container, riavviatore, watchdog di systemd, rotazione dei registri, controllo del disco, `unattended-upgrades` | Grande | B2 |
| B4 | Aggiornamenti con ritorno indietro: versioni fissate, backup prima, script di ritorno | Grande | B2-B3 |
| B5 | Identità amministratore: onboarding via API, utente dedicato, token a lunga durata, custodia del segreto | Media | B2, D-C5 |
| B6 | Backup pianificati di HA e dei dati degli altri container | Media | B2 |
| B7 | Prove su VM e su Dell (equivalenti di T1-T9) | Media | B1-B6 |
| B8 | Manutenzione continua di ogni componente a ogni versione | Continua | — |

[Valutazione] Contando le tappe: A ha, oltre alla decisione, una tappa grande (A6) e cinque medie; B ha tre tappe grandi o «media o grande» (B2, B3, B4), quattro medie e una continua (B8). B3, B4 e B8 non finiscono mai davvero. Non è una stima in ore né in euro. A ha il punto più rischioso in A6, che è comune a qualunque installer da chiavetta.

---

## 6. Raccomandazione [Valutazione]

**Opzione A: HAOS sul mini-PC dei clienti e sul Dell aziendale, con Acasystem come app su porta propria (non ingress), watchdog dell'app attivo e Ethernet.**

Motivi, in ordine di peso per la domanda dell'utente:

1. **Riavvio automatico e «senza crash».** È l'unica opzione con tutti i livelli di recupero già scritti, provati e mantenuti dal progetto HA: macchina, Docker, Supervisor, HA, app, aggiornamenti.
2. **Rilevamento.** Ha la copertura più ampia con il supporto ufficiale, soprattutto Thread, Z-Wave e la discovery delle app. Per Matter HAOS fornisce il server supportato, ma l'aggiunta di nuovi dispositivi resta nella Companion app del telefono con qualunque opzione: su questo punto A non dà vantaggi ad Acasystem.
3. **Permessi.** Dà ad Acasystem un'identità amministratore senza credenziali del cliente e senza un token da custodire. Copre la risposta D-D1 «Anche il cliente».
4. **Semplicità e installer.** C'è un solo sistema. La configurazione dopo la scrittura del disco si automatizza tutta con le API ufficiali.
5. **Coerenza.** Il banco nella VM è già HAOS 18.3.

**Condizioni da rispettare comunque** (valgono per ogni opzione):

- gruppo di continuità e accensione automatica al ritorno della corrente nel BIOS, controllata prima della consegna;
- rete di casa piatta;
- Ethernet al primo avvio.

---

## 7. Quando questa raccomandazione sarebbe sbagliata

| Condizione | Come si scopre | Che cosa cambierebbe |
|---|---|---|
| L'app **non** riesce ad avviare flussi di configurazione o a scrivere automazioni tramite il proxy del Supervisor (oggi è dedotto dal codice, non provato) | Prova T1 sulla VM | A perde il vantaggio dei permessi; servirebbe un utente amministratore dedicato anche su HAOS, come in B |
| Acasystem ha bisogno di cose che un'app non può avere: accesso all'host o a Docker, altri servizi fuori da HA, scoperta di rete propria senza rete host | Analisi in A2 | Con la rete host e i ruoli alti la valutazione di sicurezza dell'app si abbassa; se non basta, si torna a B o C |
| Il codice deve restare privato e il Supervisor non scarica immagini private in modo gestibile | Lettura dell'API dei registri e prova in A3 | Distribuzione da riprogettare, oppure B |
| Il Dell o i mini-PC scelti hanno dischi 4Kn, nessuna Ethernet, un Wi-Fi non supportato o il watchdog disattivato dal BIOS | Prova A7 | Cambiare modello di mini-PC; il resto non cambia |
| Il titolare vuole il pieno controllo del sistema operativo, per esempio per altro software dell'azienda sulla stessa macchina | Domanda D-C1 | B o C |
| HA cambia di nuovo la politica sulle app o sui metodi di installazione | Note di release a ogni aggiornamento | Rischio comune; con B si perderebbe meno codice nostro legato al Supervisor |
| Un aggiornamento automatico del Supervisor cambia l'API usata dall'app (proxy, token, `/addons`, watchdog) e rompe Acasystem nei clienti | Note di rilascio del Supervisor e prova di regressione sulla VM (tappa A8) | Se succede spesso o non si può spegnere l'aggiornamento automatico, il vantaggio di A si riduce; B non ha questo rischio ma ha i suoi |
| Il titolare vuole aggiungere dispositivi Matter **solo** da Acasystem, senza telefono | Domanda D-C14 | Impossibile con qualunque opzione: un nuovo dispositivo Matter si aggiunge solo dalla Companion app. Serve un telefono di servizio, oppure Matter resta fuori dall'aggiunta da Acasystem |
| Licenza: si vuole consegnare Acasystem ai clienti senza fornire il sorgente | Parere umano o legale (sezione 4.4) | La GPL-3.0 lo impedisce per il codice derivato da Tunet; cambia D-C6, non la scelta A/B |
| Si sceglie il Raspberry Pi e `better-sqlite3` non funziona su ARM | Costruzione in A3 | Solo il Pi è escluso, oppure serve un'altra libreria per il database |
| Il tablet deve entrare tramite l'interfaccia di HA (ingress) | Domanda D-C9 | ADR-0009 e ADR-0021: dietro l'ingress oggi l'utente fidato non è amministratore; percorsi assoluti da cambiare |

---

## 8. Impatto su REP-20261023-003, ADR-0009 e ADR-0021

### 8.1 Sul piano REP-20261023-003 [Valutazione]

- **§6.2 e D-C1.** La (a) del piano parlava di «add-on con ingress». Questo confronto la precisa: **app con porta propria**. Così la nota «dietro l'ingress l'utente fidato non è admin» non si applica.
- **§5.2 (scoperta impossibile in bridge).** Sul mini-PC con HAOS il limite non c'è: HA è sulla LAN. Sul banco lo risolve la VM a ponte.
- **D1a (identità con permessi di amministratore).** La risposta «Anche il cliente» trova la sua forma naturale nel token dell'app. Il punto di ripresa del piano («riscrivere il piano per D-D1») deve partire dalla prova T1.
  - Sul **banco** però Acasystem gira ancora in Docker Desktop sul PC, fuori da HAOS, e non ha quel token.
  - Serve decidere se sul banco Acasystem diventa un'app nella VM, oppure se il banco usa provvisoriamente un utente dedicato (domanda D-C11).
- **Tappa di migrazione I3-I5.** Resta valida. La prova T1 si può fare nella stessa VM dopo la migrazione, con uno snapshot prima.
- **D-C2 (radio).** Con HAOS le radio si aggiungono come app quando servono, senza riprogettare l'installazione.
- **D-D16 (filtro del tunnel).** Pesa di più: con il token dell'app il backend di Acasystem ha pieni poteri su HA.
- **Nuove tappe da aggiungere al piano** se D-C1 = A: A1-A8 della sezione 5.1.

### 8.2 Su ADR-0009

- [Fatto] ADR-0009 ha scartato «Add-on di HA con ingress» con la motivazione «Richiede HAOS con il Supervisor, non presente nel banco. Non considerata ora».
  - [Valutazione] La motivazione non vale più: il banco ora è HAOS.
  - [Valutazione] La raccomandazione **non** usa l'ingress. Restano quindi validi il proxy `/ha`, la pagina di accesso di Acasystem e la porta unica.
  - [Valutazione] Cambia solo l'indirizzo interno di HA: dentro HAOS è la rete interna del Supervisor, `homeassistant` / `172.30.32.1` [Fatto], oppure il proxy `http://supervisor/core`.
- **Esposizione di HA in rete.** Su HAOS la porta 8123 è sulla LAN, come nella VM a ponte (D-I8). La decisione rimandata in ADR-0009 va presa anche per i clienti (domanda D-C12).
  - [Fatto] La pagina https://www.home-assistant.io/integrations/http/ (consultata il 2026-10-23) non documenta `server_host`, il metodo citato per il banco in `infrastructure.md` e in D-I8. Segnala il blocco YAML `http:` come deprecato e offre l'impostazione «Listen addresses».
  - [Valutazione] Su HAOS non risulta un firewall dell'host configurabile dall'utente (sezione 4.1).
  - [Da verificare] Effetto di un ascolto limitato su Supervisor, app (`172.30.32.1`) e Companion app. Vale anche per il metodo previsto per il banco.
- [Proposta] Annotazione su ADR-0009, da scrivere quando l'utente sceglie, nella tappa T0b del piano o nel nuovo ADR: «alternativa add-on riconsiderata in REP-20261023-004».

### 8.3 Su ADR-0021

- [Fatto] ADR-0021 dice: «Inoltra a HA con il token dell'utente: non esiste un token di servizio». Poi, nell'annotazione dopo D-D1: «la facciata dovrà usare un'identità con quei permessi».
  - [Valutazione] Con A quell'identità è il token dell'app.
  - [Valutazione] Con B è un utente dedicato con token a lunga durata.
  - In entrambi i casi la frase «non esiste un token di servizio» va annotata come superata.
- [Fatto] ADR-0021 prevede una revisione «se si sceglie l'add-on con ingress (D-C1)». [Valutazione] Con un'app su porta propria la revisione serve comunque, per l'identità, ma non per l'ingress.
- **Sicurezza** [Valutazione]. La facciata diventa l'unico filtro tra chi usa Acasystem e un'identità con pieni poteri. Quindi:
  - l'elenco dei gestori ammessi;
  - le ricette chiuse per le automazioni;
  - il controllo che il token non esca mai dal server;
  - il filtro del tunnel (D-D16).

  Non sono più dettagli: sono la sicurezza di HA stesso.
- **Registro** [Valutazione]. In HA le azioni risulteranno dell'utente di sistema [Da verificare]. Il registro di Acasystem diventa l'unica traccia di «chi ha fatto cosa».

---

## 9. Domande per l'utente e il titolare

Le opzioni non sono in ordine di preferenza. D-C1, D-C2 e D-C3 sono quelle di REP-20261023-003. Le nuove partono da D-C4 per non riusare numeri.

- **D-C1. Base del sistema dei clienti:**
  - (a) HAOS con Acasystem come app (raccomandata);
  - (b) Debian 13 + Docker + HA Container;
  - (c) sistema di virtualizzazione con HAOS in VM e Acasystem sull'host.
- **D-C4. Prova prima di decidere:** autorizzi le prove T1-T6 sulla VM `acasystem-ha`? Sono con snapshot prima di ognuna, un'app di prova locale e nessun dispositivo reale. Si possono fare solo dopo la migrazione del banco.
- **D-C5. Password del proprietario di HA** creata dall'installer: chi la tiene? (a) l'azienda; (b) il cliente; (c) entrambi, con due utenti. Dove si conserva?
- **D-C6. Codice e immagini di Acasystem** (Acasystem è GPL-3.0, sezione 4.4; serve un parere umano o legale prima di scegliere):
  - (a) repository e immagine pubblici, senza segreti dentro;
  - (b) immagine privata, con credenziali su ogni mini-PC (funzionamento da verificare), ma con il sorgente corrispondente fornito ai clienti come richiede la GPL-3.0.
- **D-C7. Aggiornamenti dai clienti:**
  - Acasystem: aggiornamento automatico (un giorno di attesa e backup prima, di serie) oppure solo a mano?
  - HA e il sistema: solo con intervento dell'installatore oppure con una finestra concordata?
- **D-C8. Alimentazione:** gruppo di continuità e accensione automatica al ritorno della corrente come **condizioni** per l'installazione, sì o no?
- **D-C9. Accesso dal tablet:**
  - (a) porta propria di Acasystem, come oggi (raccomandata);
  - (b) dentro l'interfaccia di HA (ingress).
- **D-C10. Installer:**
  - (a) chiavetta nostra che scrive HAOS e configura tutto;
  - (b) scrittura del disco con lo strumento ufficiale quando sarà rilasciato, più il nostro script di configurazione;
  - (c) scrittura a mano, come la guida ufficiale, più il nostro script.
- **D-C11. Banco:**
  - (a) Acasystem diventa un'app anche nella VM del banco;
  - (b) resta in Docker Desktop sul PC e usa provvisoriamente un utente amministratore dedicato.
- **D-C12. Porta 8123 di HA sulla rete del cliente** (fattibilità in sezione 4.1; nessuna opzione è ancora provata):
  - (a) ascolto di HA limitato con «Listen addresses», se la prova dimostra che Supervisor, app e Companion app continuano a funzionare;
  - (b) isolamento con il router del cliente: rete separata (VLAN) o regole del firewall del router;
  - (c) accettare l'esposizione sulla LAN, con password robuste e blocco degli indirizzi dopo troppi tentativi («Enable IP banning»).

  In tutti i casi va protetta anche la porta 3002 di Acasystem, che dà accesso a un'identità amministratore.
- **D-C13. Rete del Dell aziendale:** Ethernet (indicata dalla guida ufficiale) o Wi-Fi (driver da verificare)?
- **D-C14. Dispositivi Matter:** l'aggiunta è possibile solo dalla Companion app del telefono.
  - (a) l'installatore usa un telefono di servizio con la Companion app, collegato a un utente HA dell'azienda (tocca D-C5);
  - (b) Matter resta escluso dall'aggiunta da Acasystem: Acasystem mostra e comanda i dispositivi Matter già aggiunti.
- **D-C15. Avviso e intervento a distanza:** quando i riavvii automatici finiscono, il sistema resta fermo. Chi viene avvisato e come interviene? Per esempio accesso remoto di Nabu Casa, VPN, oppure solo intervento sul posto. Le strade non sono state studiate.
- **D-C2** (già aperta). Radio di base o aggiunte quando servono? Con A si aggiungono come app.

---

## 10. Punti non verificati (riepilogo)

- Nessuna prova in esecuzione: i permessi dell'app (T1) e i tempi di riavvio sono dedotti dal codice.
- Presenza del watchdog hardware su Dell i5-12500, mini-PC N100, Raspberry Pi 5 e VirtualBox. VirtualBox probabilmente non lo emula, ma non è confermato.
- Riaccensione dopo blackout nei BIOS. L'impostazione «AC Recovery» dei Dell è citata solo da forum.
- Settori logici del NVMe del Dell (512 o 4K) e copertura del suo Wi-Fi in HAOS.
- Avvio del Pi 5 da SSD con HAOS; `better-sqlite3` su Alpine ARM.
- Distribuzione di immagini private al Supervisor; ritorno indietro di un'app; attribuzione delle azioni dell'app nel registro di HA; disponibilità del comando `ha` via SSH.
- Controllo del disco all'avvio di Debian 13; firmware Wi-Fi non libero in Debian.
- Valore effettivo di `synchronous` nel database di Acasystem (WAL attivo, valore non impostato).
- Discordanza sugli aggiornamenti di Supervised dopo la 2025.12 e sul ripristino dei backup su Container.
- Note di release 2026.x di HA lette solo in parte.
- Sistemi di virtualizzazione per l'opzione C (Proxmox o altri): non studiati.
- Effetto dello spegnimento dell'aggiornamento automatico del Supervisor (stato «unsupported» o «unhealthy»).
- Effetto di «Listen addresses» su Supervisor, app e Companion app; assenza di un firewall configurabile su HAOS dichiarata esplicitamente.
- Aggiunta di dispositivi Thread con le credenziali sincronizzate sul telefono.
- Obblighi di licenza nella distribuzione ai clienti e politica del marchio «Home Assistant».
- Avviso e assistenza a distanza (Nabu Casa, VPN): non studiati.

---

## Fonti (consultate il 2026-10-23)

Revisioni rilevate: HAOS 18.3 (2026-09-17), Supervisor 2026.10.3 (2026-10-19), Core 2026.10.2 (2026-10-16), Debian 13.7 (2026-09-12). I tre file preparatori in `backup/confronto-installazione/` (esclusi da Git) hanno altri dettagli, ma i valori decisivi sono ricontrollabili dalla tabella seguente.

**Valori presi dal codice** (permalink ai tag di rilascio; i file indicati con «verificato» sono stati riaperti grezzi il 2026-10-23 durante la revisione, gli altri vengono dalla lettura dei file preparatori)

| Valore | File e permalink | Ricontrollo |
|---|---|---|
| Watchdog hardware: `RuntimeWatchdogSec=300`, `WatchdogDevice=/dev/watchdog` | https://github.com/home-assistant/operating-system/blob/18.3/buildroot-external/rootfs-overlay/usr/lib/systemd/system.conf.d/watchdog.conf | verificato |
| Docker non parte: `FailureAction=reboot` | https://github.com/home-assistant/operating-system/blob/18.3/buildroot-external/rootfs-overlay/usr/lib/systemd/system/docker.service.d/failure.conf | verificato |
| Supervisor: `Restart=always`, `RestartSec=5s`, `StartLimitBurst=5`, `StartLimitIntervalSec=30m` | https://github.com/home-assistant/operating-system/blob/18.3/buildroot-external/rootfs-overlay/usr/lib/systemd/system/haos-supervisor.service | verificato |
| Slot A/B: variabili `A_OK`, `A_TRY`, `B_OK`, `B_TRY` | https://github.com/home-assistant/operating-system/blob/18.3/buildroot-external/board/pc/grub.cfg | verificato (presenza); soglia `TRY<3` dai file preparatori |
| Watchdog di HA: `WATCHDOG_RETRY_SECONDS = 10`, `WATCHDOG_MAX_ATTEMPTS = 5` | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/homeassistant/const.py ; logica in https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/homeassistant/core.py | verificato (costanti) |
| Watchdog delle app: stesse costanti | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/apps/const.py ; https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/apps/app.py | verificato (costanti) |
| App: `auto_update` e `watchdog` falsi di serie | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/apps/validate.py (righe con `default=False`) | verificato |
| Controlli ogni 120 s, ricarica dell'updater ogni 24 h, aggiornamento dei plugin ogni circa 12 h, app ogni 16 h; nessuna attività aggiorna Core o OS | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/misc/tasks.py | verificato |
| Supervisor: `auto_update` vero di serie (`SCHEMA_UPDATER_CONFIG`) | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/validate.py | verificato |
| `reload()` chiama `auto_update_supervisor()` se serve un aggiornamento | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/updater.py ; condizioni del job in https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/supervisor.py | verificato |
| Proxy: blocca solo `hassio*` e i comandi WebSocket `supervisor/` e `hassio/` | https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/api/proxy.py | dai file preparatori |
| Rotte con `require_admin` per flussi e automazioni | https://github.com/home-assistant/core/blob/2026.10.2/homeassistant/components/config/config_entries.py ; https://github.com/home-assistant/core/blob/2026.10.2/homeassistant/components/config/automation.py | dai file preparatori |
| Onboarding: `UserOnboardingView` con `requires_auth = False` | https://github.com/home-assistant/core/blob/2026.10.2/homeassistant/components/onboarding/views.py | verificato |
| Discovery delle app: flusso con origine `hassio` | https://github.com/home-assistant/core/blob/2026.10.2/homeassistant/components/hassio/discovery.py | verificato |
| Database del recorder corrotto rinominato | https://github.com/home-assistant/core/blob/2026.10.2/homeassistant/components/recorder/util.py | dai file preparatori |

**Home Assistant: pagine utente e blog**

- Installazione e metodi: https://www.home-assistant.io/installation/ (riletta dall'agente principale; conferma «recommended», Container senza app, Thread e Z-Wave senza supporto pronto all'uso, aggiornamenti manuali).
- PC x86-64: https://www.home-assistant.io/installation/generic-x86-64/
- Linux, Container e VM: https://www.home-assistant.io/installation/linux/
- Windows e VirtualBox: https://www.home-assistant.io/installation/windows/
- Raspberry Pi: https://www.home-assistant.io/installation/raspberrypi/
- Deprecazioni, 2025-05-22: https://www.home-assistant.io/blog/2025/05/22/deprecating-core-and-supervised-installation-methods-and-32-bit-systems/ (riletta dall'agente principale)
- Note di release 2025.12: https://www.home-assistant.io/blog/2025/12/03/release-202512/
- Note di release 2025.1: https://www.home-assistant.io/blog/2025/01/03/release-20251/
- Operazioni su OS, A/B e backup: https://www.home-assistant.io/common-tasks/os/
- Onboarding: https://www.home-assistant.io/getting-started/onboarding/
- Integrazioni: https://www.home-assistant.io/integrations/backup/, `/hassio/`, `/zeroconf/`, `/ssdp/`, `/dhcp/`, `/bluetooth/`, `/usb/`, `/network/`, `/matter/`, `/thread/`, `/otbr/`, `/zha/`, `/zwave_js/`, `/homekit_controller/`, `/mqtt/`, `/esphome/`, `/nmap_tracker/`, `/upnp/`
- Autenticazione: https://www.home-assistant.io/docs/authentication/
- Aggiunte nella revisione dopo la critica: https://www.home-assistant.io/integrations/matter/ (aggiunta solo dalla Companion app, Bluetooth del server non usato, credenziali Thread da sincronizzare su Android); https://www.home-assistant.io/integrations/http/ («Listen addresses», YAML deprecato, `server_host` non documentato, «Enable IP banning»); https://www.home-assistant.io/integrations/mqtt/ (discovery attiva di serie); https://www.home-assistant.io/integrations/improv_ble/; https://contributors.home-assistant.io/apps/guides/communication/ (endpoint `/discovery` e `/services`).
- Licenze dei repository (campo `license` dell'API GitHub): https://api.github.com/repos/Koenkk/zigbee2mqtt, `zwave-js/zwave-js-ui`, `matter-js/matterjs-server`, `openthread/ot-br-posix`, `eclipse-mosquitto/mosquitto`, `home-assistant/core`, `home-assistant/operating-system`, `home-assistant/supervisor`.

**Home Assistant: documentazione per sviluppatori** (ora `contributors.home-assistant.io`; le vecchie URL di developers.home-assistant.io rispondono 301)

- App: https://contributors.home-assistant.io/apps/ e le pagine `reference/configuration/`, `guides/communication/` (riletta dall'agente principale: «Through the proxy, your app acts as an administrator»), `guides/security/`, `guides/ingress/`, `reference/environment/`, `guides/options/`, `guides/dockerfile/`, `guides/publishing/`, `guides/repository/`, `supervisor-api/`
- Supervisor: https://contributors.home-assistant.io/os/supervisor/
- Sistema operativo: https://contributors.home-assistant.io/os/ e le pagine `operating-system/update-system/`, `partitions/`, `configuration/`, `networking/`, `debugging/`
- API di autenticazione: https://contributors.home-assistant.io/core/internals/auth-api/
- Manifest delle integrazioni: https://contributors.home-assistant.io/core/integrations/manifest/

**Repository GitHub di Home Assistant** (codice letto grezzo)

- ADR 0012 sui metodi supportati (2020-06-03, Accepted): https://github.com/home-assistant/architecture/blob/master/adr/0012-define-supported-installation-method.md
- https://github.com/home-assistant/operating-system, tag 18.3: watchdog, `docker.service`, servizio del Supervisor, montaggio dei dati, `grub.cfg`, configurazioni del kernel x86/OVA/Pi 5.
- https://github.com/home-assistant/supervisor, tag 2026.10.3: `misc/tasks.py`, `homeassistant/*`, `apps/*`, `api/proxy.py`, `core.py`, `store/git.py`.
- https://github.com/home-assistant/core, tag 2026.10.2: `components/hassio`, `components/config`, `components/onboarding/views.py`, `components/recorder/util.py`, `Dockerfile`.
- https://github.com/home-assistant/cli, ramo `master`: comandi `store repositories add` e `apps install`.
- https://github.com/home-assistant/supervised-installer (README: non supportato dalla 2025.12.0).
- Installer ufficiale, beta: https://github.com/home-assistant/installer
- https://github.com/home-assistant/installer/pull/256: aperta dal 2026-10-10, revisioni con modifiche richieste fino al 2026-10-17, ricontrollata dall'agente principale. Limiti dichiarati: solo UEFI, solo SATA provato, niente Wi-Fi.
- https://github.com/home-assistant/installer/pull/254: chiusa.

**Altre fonti primarie**

- Docker:
  - https://docs.docker.com/engine/containers/start-containers-automatically/
  - https://docs.docker.com/reference/dockerfile/#healthcheck
  - https://docs.docker.com/engine/daemon/live-restore/
  - https://docs.docker.com/engine/install/linux-postinstall/
  - https://docs.docker.com/engine/logging/drivers/json-file/
  - https://docs.docker.com/engine/install/debian/
- Debian:
  - https://www.debian.org/releases/
  - https://wiki.debian.org/UnattendedUpgrades
  - https://www.debian.org/releases/trixie/amd64/apbs02.en.html (preseed)
  - https://www.debian.org/releases/trixie/example-preseed.txt
- systemd: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html, `systemd-system.conf.html`, `machine-id.html`
- Kernel Linux: https://www.kernel.org/doc/html/latest/watchdog/watchdog-api.html, https://www.kernel.org/doc/html/latest/admin-guide/ext4.html
- RAUC: https://rauc.readthedocs.io/en/latest/integration.html
- SQLite: https://sqlite.org/wal.html
- VirtualBox: https://www.virtualbox.org/manual/ch01.html
- Matter: https://github.com/matter-js/python-matter-server (archiviato 2026-06-23), https://github.com/matter-js/matterjs-server
- Thread: https://openthread.io/guides/border-router/docker
- Zigbee2MQTT: https://www.zigbee2mqtt.io/guide/installation/02_docker.html, `03_ha_addon.html`
- docker-autoheal: https://github.com/willfarrell/docker-autoheal, https://github.com/moby/moby/issues/22719

**Fonti non ufficiali, usate solo come segnali [Da verificare]**

- Forum della comunità HA (rete bridge e mDNS; ripristino su Container).
- Forum Dell («AC Recovery»).
- Strumento di terzi «HAOS USB Creator»: https://community.home-assistant.io/t/haos-usb-creator-an-aio-installer-for-ha-for-generic-x86-64-pcs/1010287

**Fonti interne, sola lettura:** REP-20261023-003, ADR-0009, ADR-0021, `progetto/acasystem/Dockerfile`, `backend/src/controllers/healthController.ts`, `backend/src/models/database.ts`. Le letture del codice sono riportate da `affidabilita-addon-installer.md`.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Ricerca preparatoria | Tre file in `backup/confronto-installazione/`, letti per intero dall'agente principale | Eseguito | Fonti e revisioni elencate nei file. Pagine lette tramite riassunto automatico; valori decisivi riletti nel codice ai tag |
| Ricontrollo a campione delle fonti | WebFetch dell'agente principale su quattro pagine: installation, blog delle deprecazioni, guida alla comunicazione delle app, PR #256 dell'installer | Eseguito | Coerente con i file preparatori. Il blog fa emergere una discordanza sugli aggiornamenti di Supervised dopo la 2025.12 (sezione 1) |
| Fonti interne | REP-20261023-003 (risposta breve, §4, §5.2, §6, §9, risposte e rettifiche), ADR-0009, ADR-0021, indice dei report | Eseguito | Sola lettura |
| Revisione dopo la critica | WebFetch su pagine matter, http, mqtt, improv_ble, hassio, guida alla comunicazione delle app; `curl` grezzo dei file di codice elencati in «Valori presi dal codice» (codice HTTP 200 a ogni tag); API GitHub per le licenze; lettura di `progetto/acasystem/LICENSE` e dei `package.json` | Eseguito | Pagine lette con riassunto automatico; la pagina `hassio` non parla di discovery delle app, ricavata dal codice di Core. Nessuna esecuzione |
| Prove su HA, Supervisor, VM, Dell | — | **Non eseguito** (escluso dall'incarico) | Piano di prove nella sezione 5.1 (A1, A7) |
| Download, modifiche a codice, Docker, rete, tablet | — | Non eseguito | Escluso |

## Controllo del diff e decisioni

File aggiunti o modificati da questo incarico:

- questo report, nuovo;
- una riga in `reports/README.md`, aggiunta dopo la rilettura.

Nessuna modifica a `progetto/`, HA, Docker, VirtualBox, rete o tablet. Nessun processo terminato. Nessun commit.

L'agente **non** ha scelto l'opzione: la raccomandazione è una valutazione. D-C1 resta aperta, e così ogni tappa A/B.

**Righe da aggiungere a `project-status.md`** (non modificato qui, perché altri flussi lo modificano):

1. Confronto D-C1 consegnato in REP-20261023-004. Raccomandazione dell'agente: HAOS con Acasystem come app su porta propria. Decisione dell'utente attesa.
2. Nuove domande D-C4…D-C15.
3. Proposta, non autorizzata: prove T1-T6 sulla VM prima della decisione.
4. Annotazioni previste, da scrivere dopo la scelta: ADR-0009 (alternativa add-on riconsiderata; esposizione di HA sulla rete del cliente) e ADR-0021 (identità di servizio al posto di «non esiste un token di servizio»).

## Chiusura e punto di ripresa

- **Nessuna tappa di realizzazione è attiva.**
- **Prossimo passo:** le risposte a D-C1 e a D-C4…D-C15. Se l'utente vuole decidere dopo una prova, autorizza D-C4: prove T1-T6 nella VM dopo la migrazione del banco di REP-20261023-003.
- **Dipendenze:**
  - migrazione del banco (I3-I5 di REP-20261023-003);
  - D-D16 (filtro del tunnel);
  - D-C2 (radio);
  - la disponibilità del Dell per A7.

## Rettifiche dopo la critica

2026-10-23, stessa giornata, prima della consegna. Una revisione critica ha prodotto nove rilievi. I punti decisivi sono stati ricontrollati sulle fonti primarie prima di applicarli. Tutti i rilievi sono risultati fondati e sono stati applicati, con le precisazioni seguenti.

| Rilievo | Esito | Dove |
|---|---|---|
| Aggiunta Matter solo dalla Companion app (alta) | Applicato; confermato sulla pagina ufficiale | Risposta breve 2; sez. 2 (riga e conseguenza); 4.1; 6 motivo 2; 7; D-C14 |
| Il Supervisor si aggiorna da solo (alta) | Applicato; confermato su `validate.py`, `updater.py`, `supervisor.py` e `misc/tasks.py` al tag 2026.10.3. Precisazione: in `updater.py` non c'è la costante `RUN_RELOAD_UPDATER`, che è in `misc/tasks.py`, dove registra `updater.reload` ogni 24 h | Risposta breve 5; sez. 3; 4.1; 5.1 A8; 7 |
| Porta 8123, `server_host`, 3002 (alta) | Applicato. Precisazione: «niente firewall utente su HAOS» non l'ho trovato scritto in una fonte, quindi è etichettato [Valutazione] e non [Fatto] | 4.1; 8.2; D-C12 |
| Licenza GPL-3.0 (media) | Applicato; licenze dei componenti ricavate dall'API GitHub; marchio [Da verificare]. Nessuna conclusione legale | Risposta breve 6; nuova 4.4; 7; D-C6 |
| Meccanismi di rilevamento mancanti (media) | Applicato. Precisazioni: la pagina MQTT non nomina Shelly; la pagina `hassio` non descrive la discovery delle app, ricavata dal codice di Core | Sez. 2; nmap spostato in nota |
| Cosa succede dopo i 5 tentativi; assistenza a distanza (media) | Applicato | Risposta breve 2; sez. 3; D-C15 |
| Tracciabilità delle fonti (media) | Applicato: URL nella colonna «Fonte» e tabella dei permalink; ogni riga dice se il file è stato riaperto in questa revisione | Sez. 2; «Fonti» |
| Due imprecisioni dell'opzione B (bassa) | Applicato: rete host al posto delle porte pubblicate; «circa il doppio» sostituito dal conteggio delle tappe | 4.2; 5.2 |
| Gergo ed etichetta della risposta breve 2 (bassa) | Applicato con un glossario di 13 voci dopo le etichette, invece delle spiegazioni tra parentesi, per non appesantire la risposta breve | Inizio del report; risposta breve 2 |

La raccomandazione (opzione A) resta invariata come valutazione, ma con due nuovi rischi espliciti (aggiornamento automatico del Supervisor, esposizione delle porte) e senza il vantaggio di A sull'aggiunta Matter.

## Rettifiche successive

Nessuna. *(Vale fino al 2026-10-23; vedi l'annotazione qui sotto.)*

**Annotazione del 2026-10-23, dopo la consegna** (Claude Code, Opus 5.5, `claude-opus-5-5`): aggiunta la sezione «Conclusione richiesta il 2026-10-23», qui sotto. Il testo sopra resta com'era. La conclusione rivaluta il motivo 3 della sezione 6 (permessi) e aggiunge un fatto sulla porta di HA con il Supervisor; la raccomandazione per i clienti resta l'opzione A, con motivazioni diverse.

## Conclusione richiesta il 2026-10-23

| Campo | Valore |
|---|---|
| Richiesta | Utente, 2026-10-23: «Concludi il confronto HA OS + Acasystem come add-on rispetto a Linux + Docker, riprendendo REP-20261023-004 se disponibile. Dammi una raccomandazione motivata rispetto all'esperienza richiesta, considerando installazione, aggiornamenti, rete, radio, servizi aggiuntivi e autenticazione. Distingui la soluzione del banco da quella destinata ai clienti. La scelta finale ancora aperta resta mia.» Esperienza richiesta, con le parole dell'utente dello stesso giorno: «installare Acasystem e usare la nostra interfaccia per il primo avvio, trovare i dispositivi compatibili, aggiungerli, configurarli e utilizzarli»; criteri di accettazione: installazione pulita e ripetibile, scoperta automatica reale, configurazione e utilizzo da Acasystem, persistenza dopo il riavvio. |
| Autore | Claude Code (Opus 5.5, `claude-opus-5-5`), flusso di allineamento D1. Appunti preparatori dello stesso flusso (Sonnet 5.5) in `backup/allineamento-d1/` (`installazione-pulita.md`, `permessi-cliente.md`, `api-pubbliche-interne.md`, `prerequisiti-d1.md`), cartella esclusa da Git. |
| Perimetro | Solo documenti e letture. Nessuna modifica a `progetto/`, VM, rete, Docker, HA o dispositivi; nessuna credenziale; nessun commit. |
| Etichette di questa sezione | [approvato] fonte umana; [realizzato] esiste; [verificato] con il mezzo indicato («codice» = letto nella fonte al tag, «prova» = eseguito); [proposto] non autorizzato; [non verificato]; [valutazione] giudizio dell'agente. |

### Raccomandazione in breve [valutazione]

1. **Clienti: opzione A**, cioè HAOS sul mini-PC con Acasystem come app su porta propria, watchdog dell'app acceso, Ethernet. La raccomandazione della sezione 6 resta, ma **non** conta più il motivo 3: con il divieto dell'utente di introdurre implicitamente un'identità privilegiata, il token del Supervisor non va usato come identità predefinita di Acasystem. Su A e su B Acasystem userebbe la stessa identità di servizio dichiarata, proposta in [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md). Il vantaggio di A resta su tre punti:
   - riavvio e ritorno indietro già pronti;
   - radio e servizi aggiuntivi come app ufficiali;
   - un solo sistema da installare e aggiornare.
2. **Banco sul PC dell'utente** (Windows 11 Home): per D1, HAOS 18.3 nella VM `acasystem-ha`, già preparata, con Acasystem che resta in Docker Desktop sul PC e usa l'identità di servizio dichiarata. Corrisponde a D-C11 (b) di questo report. L'utente ha risposto «Sì, VM temporanea» per D1 dopo la 0.9.27 [approvato; risposta riportata nell'incarico di questo allineamento, testo non ritrovato prima di oggi nei documenti del repository]. Impacchettare Acasystem come app non serve a D1 e lo allungherebbe.
3. **Banco Dell aziendale** (i5-12500, 8 GB, NVMe 512 GB, Wi-Fi): se si può dedicare, diventa l'installazione di riferimento dei clienti, cioè opzione A su macchina reale con Ethernet. Lì si provano per davvero la scoperta automatica (criterio 2), l'installazione pulita ripetibile (criterio 1) e la persistenza dopo riavvio e blackout (criterio 4). La VM su Wi-Fi resta un banco di sviluppo: le sue prove di scoperta e di Wake on LAN sono indicative, non conclusive (ponte su Wi-Fi con sostituzione del MAC, REP-20261023-003 §6.1). Se il Dell deve conservare Windows o altro software, l'opzione A non è applicabile, perché HAOS occupa tutto il disco. In quel caso conviene un mini-PC dedicato come riferimento.
4. **La scelta finale resta dell'utente** (D-C1, D-C11, D-C13 della sezione 9). Nessuna di queste blocca D1.

### Esperienza richiesta, punto per punto

| Aspetto | A. HAOS + Acasystem come app | B. Linux (Debian 13) + Docker + HA Container | Banco (VM sul PC; Dell) | Clienti |
|---|---|---|---|---|
| **Installazione** | Nessun installer x86 ufficiale; scrittura del disco con chiavetta e poi configurazione via API [verificato: documentazione e codice, sezioni 3 e 5]. Al primo avvio il Supervisor scarica il Core: servono Internet e un orologio corretto; la preparazione può durare 20 minuti o più [verificato: documentazione di onboarding, letta il 2026-10-23 nel flusso]. Onboarding (proprietario, posizione, analisi) via endpoint interni non autenticati finché non è fatto [verificato: codice 2026.9.4 e 2026.10.2] | Preseed Debian documentato; immagini dei container caricabili in anticipo, quindi installazione possibile **senza Internet** [valutazione]; onboarding di HA con le stesse API | VM: immagine 18.3 verificata, VM pronta ma senza Internet [realizzato]; il primo avvio richiede una scheda NAT temporanea [proposto]. Dell: scrittura di HAOS sul disco interno, con verifica dei settori del NVMe (niente 4Kn) [non verificato] | A, con il nostro script di primo avvio; ogni passo fisico (BIOS, chiavetta, cavo) resta in presenza |
| **Aggiornamenti** | Core e OS solo a comando; ritorno indietro automatico di Core e OS; **il Supervisor si aggiorna da solo** [verificato: codice Supervisor 2026.10.3, sezione 3] | Tutto manuale e a nostro carico, ritorno indietro da costruire | Core fissato a 2026.9.4 (D-I5 [approvato]); su HAOS nuovo il Supervisor installa invece la stabile corrente, quindi serve un aggiornamento esplicito alla versione fissata [verificato: schema `core/update` nel codice del Supervisor; esecuzione non verificata] | A, con versione del Core fissata, test di contratto prima di ogni aggiornamento (REP-20261023-003, «Piano operativo aggiornato») e sorveglianza del Supervisor (A8) |
| **Rete** | HA direttamente sulla LAN: mDNS, SSDP e DHCP funzionano di serie. **Fatto nuovo:** con il Supervisor HA ascolta di serie sulla **porta 80**; la 8123 resta solo come reindirizzamento finché l'onboarding non è chiuso [verificato: codice 2026.9.4, `components/http/config.py` (`default_server_port`, `SUPERVISOR_DEFAULT_PORT = 80`) e `server.py` (reindirizzamento della porta precedente fino alla fine dell'onboarding), letti il 2026-10-23]. Indirizzi di ascolto cambiabili con i comandi WebSocket interni `http/config`, `http/config/configure` e `http/config/promote`, riservati agli amministratori [verificato: codice 2026.9.4, `components/http/websocket_api.py`] | Tutti i container in rete host; firewall dell'host a nostro carico | VM: ponte sul Wi-Fi per la LAN, Host-Only fissa per Acasystem (D-I3 [approvato]). La porta che Acasystem usa va **letta** da HA, non presunta: 80 su HA nuovo. D-I8 «solo Acasystem» [approvato] si applica con gli indirizzi di ascolto, effetto sul Supervisor [non verificato] | A, con D-C12 (esposizione di HA e della 3002 sulla LAN del cliente) ancora aperta |
| **Radio** | Matter Server, Z-Wave JS, OTBR, Zigbee2MQTT e Mosquitto come app ufficiali; chiavette USB riconosciute [verificato: documentazione, sezione 2]. Un nuovo dispositivo Matter si aggiunge solo dalla Companion app, con qualunque opzione | Un container per ogni famiglia; Matter fuori da HAOS non supportato | VM: niente radio (passaggio USB in VirtualBox non studiato) [non verificato]. Dell: prove radio solo con D-C2 | A |
| **Servizi aggiuntivi** | App gestite dal Supervisor, con watchdog, backup e discovery delle app [verificato: codice, sezione 2] | Container nostri, con salute e riavvio da costruire | Non servono a D1 | A |
| **Autenticazione** | Login di HA invariato. L'app potrebbe usare il token del Supervisor, ma è un'identità amministratore piena e non riducibile [verificato: documentazione delle app]: per il divieto dell'utente non va usata come predefinita. Proposta: utente di servizio dichiarato «Acasystem (servizio)», creato da una persona, credenziale solo nel server, lista chiusa di operazioni (ADR-0022, [proposto]). Che un'app raggiunga il Core con un token utente normale, senza `homeassistant_api`, è [non verificato] | Stessa identità di servizio dichiarata; nessun token di sistema | Identità di servizio dichiarata, creata con le credenziali del proprietario digitate dall'utente; tablet con utente non amministratore | Stessa soluzione del banco; custodia della password del proprietario (D-C5) |

### Perché il giudizio sui permessi cambia [valutazione]

La sezione 6 indicava come vantaggio di A che l'app riceve dal Supervisor un'identità amministratore senza credenziali di nessuno. Il 2026-10-23 l'utente ha chiesto di **non introdurre implicitamente un'identità privilegiata**. Il token del Supervisor non è creato da una persona, non compare come utente nell'elenco di HA e ha poteri pieni anche su utenti e credenziali. È quindi la forma più vicina a un privilegio implicito. Per questo la raccomandazione usa su ogni opzione la stessa identità dichiarata. Così:

- il percorso di prova è uno solo, sul banco come sui clienti;
- la prova T1 (permessi dell'app tramite il proxy del Supervisor) **non condiziona più** la scelta tra A e B;
- serve invece una prova nuova sulla VM o sul Dell: l'app su HAOS raggiunge il Core dalla rete interna con il token dell'utente di servizio, senza `homeassistant_api` [non verificato].

### Quando questa conclusione sarebbe sbagliata

Valgono le condizioni della sezione 7, con queste aggiunte e modifiche:

| Condizione | Come si scopre | Che cosa cambierebbe |
|---|---|---|
| Su HAOS un'app non raggiunge il Core con un token utente senza `homeassistant_api` | Prova sulla VM o sul Dell, con un'app di prova locale e snapshot | Per i clienti con A servirebbe il token del Supervisor: decisione esplicita dell'utente, non un'impostazione predefinita |
| Le installazioni avvengono spesso dove non c'è Internet al primo avvio | Domanda all'utente quando si progetta l'installer | HAOS non completa la preparazione senza Internet; con B le immagini si caricano prima. Peserebbe a favore di B, oppure di un'installazione preparata in sede prima della consegna |
| Il Dell (o il mini-PC scelto) non si può dedicare a HAOS | Decisione del titolare | Il Dell non può essere il riferimento di A; serve un mini-PC dedicato, oppure B o C sul Dell |
| La limitazione degli indirizzi di ascolto rompe il Supervisor o le app | Prova nella VM (tappa V1 del piano D1) | D-I8 e D-C12 si risolvono con il router (rete separata) o accettando l'esposizione; non cambia A contro B |
| La scoperta automatica non funziona nemmeno sul Dell in Ethernet con un dispositivo che si annuncia | Prova del criterio 2 (tappa D4) | Il problema non dipende dal metodo di installazione: si studiano rete e integrazione |
| Il Supervisor, aggiornandosi da solo, cambia le rotte usate dall'app | Sorveglianza A8 e prova di regressione | Vantaggio di A ridotto; B non ha questo rischio |

### Effetto sul piano e sulle decisioni

- **D1** (REP-20261023-003, «Incarico D1 pronto da autorizzare») non dipende da D-C1: usa la VM HAOS e Acasystem in Docker Desktop.
- **Le prove dei criteri 1, 2 e 4 su macchina reale** sono tappe successive, esplicite nel piano aggiornato. Sono più significative sul Dell (o su un mini-PC) con Ethernet che sulla VM.
- **Restano dell'utente:**
  - D-C1 (base dei clienti);
  - D-C11 (banco dopo D1);
  - D-C13 (Ethernet o Wi-Fi del Dell);
  - D-C5 (password del proprietario);
  - D-C6 (codice e immagini, con parere sulla GPL-3.0);
  - D-C7, D-C8, D-C10, D-C12, D-C14 e D-C15, come nella sezione 9.

  Questa conclusione non le ripropone e non ne aggiunge.

**Fonti aggiunte (consultate il 2026-10-23):**

- `https://raw.githubusercontent.com/home-assistant/core/2026.9.4/homeassistant/components/http/config.py`, `…/http/server.py`, `…/http/websocket_api.py`, `…/http/const.py`, al tag 2026.9.4 (commit `9212531f40a0b7b23229a90d688dd79d9dfccff4`). Lette con `curl`, risposta HTTP 200, e cercate le righe citate.
- Per il resto valgono gli appunti di `backup/allineamento-d1/`, con le fonti elencate in ciascun file.

**Annotazione 2026-10-23, revisione (Claude Code, Opus 5.5):** la conclusione sopra è invariata. Il passo «installare e configurare Acasystem come app» dell'opzione A, che richiede oggi l'interfaccia di HA o la CLI `ha` con un amministratore, è ora elencato tra i passaggi ancora manuali in REP-20261023-003 («Piano operativo aggiornato», sezione 5, riga 15) e nel percorso del criterio 1 (tappa I-P).


## Decisione dell'utente su D-C1 (2026-10-23)

**Fonte umana:** «ok, confermo Home Assistant OS che per i clienti girerà su un mini pc» (chat del 2026-10-23, dopo il confronto e la spiegazione che il tablet resta lo schermo e apre Acasystem all'indirizzo del mini-PC).

- **D-C1 decisa:** opzione A, Home Assistant OS sul mini-PC dei clienti con Acasystem come app di HAOS. Le specifiche minime restano quelle consigliate (N100/N150, 8 GB, SSD 256 GB, Ethernet).
- Restano aperte le altre domande del report (D-C2 e D-C4…D-C15), tra cui la prova T1 sull'accesso dell'app a HA, il parere sulla licenza GPL-3.0 e l'assistenza a distanza.
- Il banco di D1 resta quello approvato: HAOS 18.3 nella VM `acasystem-ha` con Acasystem in Docker sul PC (REP-20261023-003). L'installer su chiavetta è la tappa I-P, non ancora pianificata in dettaglio.
