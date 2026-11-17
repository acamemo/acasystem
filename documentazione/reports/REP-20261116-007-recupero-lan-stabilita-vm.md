# Recupero LAN e stabilità della VM

| Campo | Valore |
|---|---|
| ID | REP-20261116-007 |
| Stato | Collaudi conclusi, correzione non ottenuta; kit diagnostico aggiornato |
| Data | 2026-11-16, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta | «Procedi a risolvere il recupero LAN e la stabilità della VM, senza toccare il banco. Poi ricollauda disconnessione e riconnessione e aggiorna il kit per il PC del capo.» |
| Autorizzazione | Diagnosi e correzioni pertinenti sulla sola VM REP092, regressione LAN/stabilità, aggiornamento locale del kit. |

## Obiettivo e perimetro

Riprendere il negativo di [REP006](REP-20261116-006-qualifica-core-lan-client-0761.md) e ISSUE-129. La VM autorizzata è `5c2409fa-1b8a-4522-bfe2-54daf258dc43`, HAOS18.4/Core2026.11.1/ACA .76.1, bridge Wi-Fi. Banco e VM storiche esclusi; nessuna modifica delle protezioni, dell'hypervisor o del piano energetico dell'host, nessuna sostituzione di stack o pubblicazione. Scelte reversibili limitate alla VM e al provisioning pertinente.928voci Git preesistenti, staging vuoto, preservate.

## Criteri di completamento

- Ipotesi motivata dalle evidenze e confronto con gli esperimenti già scartati; configurazione iniziale ripristinabile.
- Correzione confermata da avvio a freddo ripetuto, campioni idle senza sonde attive e clock/log guest/VBox coerenti; nessuna qualifica H24 dedotta da finestre brevi.
- Disconnessioni/ripristini ripetuti del solo link VM, recupero HTTP/SSH/Core/ACA e client senza pausa/ripresa o reinvio dei comandi.
- Dati e identità conservati, chiave temporanea revocata/rifiutata e VM chiusa; banco stesso ID/avvio/health.
- Kit distinto e reviewabile con correzione effettivamente provata, checksum e limiti residui; non sovrascrivere il candidato .76.1 congelato.

## Avanzamento e modifiche

Log REP006 verificato: `VirtualSync/GivenUp`464,329s e due abbandoni di catch-up. Gli esperimenti storici None, HPET, affinità P-core e solo aumento CPU non sono risultati ripetibili. Host i7-13700HX/16GiB, VirtualBox7.2.22 con NEM e provider guest effettivo KVM,2vCPU, HPET off. Una segnalazione upstream NEM/WHP simile non dimostra identità di causa né autorizza modifiche di sicurezza host.

Prima ipotesi da verificare: interazione fra idle/timer guest e percorso NEM. Parametri guest documentati verranno provati singolarmente e ritirati se negativi. Nessun keepalive, pausa/ripresa automatica o collector continuo potrà mascherare una prova idle.

### Prova nohz=off: negativa, ritirata

Kernel osservato6.18.58-haos, CONFIG_NO_HZ_IDLE=y/CONFIG_HZ=1000, clocksource tsc. Parametro applicato tramite `/mnt/boot/cmdline.txt`, percorso documentato da HAOS; copia originale e impronta5d969dc7 conservate. Reboot e `/proc/cmdline` confermano `nohz=off`. Dopo avvio main/executor,14tabelle selezionate identiche a REP006, SQLite integro.

`nohz-idle1/qualification.json`:300,349s host ai confini, VirtualSync+109,424s, GivenUp+200,336s, nuovi heartbeat/catch-up. Uptime e orologio del guest avanzano quasi correttamente: non compensano il timer virtuale perso. Soglie del precedente collaudo conservate (2s deriva,100ms nuovi GivenUp). Parametro **rifiutato**, cmdline originale ripristinata con hash esatto e shutdown richiesto. Nessuna integrazione nel kit.

Prova successiva: cap CPU99% della sola VM, ripartendo da cmdline originale, stesso provider/CPU/RAM/bridge. Opzione documentata Oracle; l'eventuale interazione col ciclo di esecuzione NEM è un'ipotesi, non un rimedio noto. Non applicarla al destinatario senza risultati ripetibili.

### Cap99: negativo, ritirato; confronto del provider guest

Avvio a freddo cap99/cmdline originale, main/executor autoavviati. `cap99-idle1/qualification.json`:300,653s host, VirtualSync+85,508s, GivenUp finale180,008s (iniziale non esposto, nessun delta inventato), nuovi heartbeat/catch-up. **Rifiutato**, cap ripristinato100 e arresto ordinario prima del confronto successivo.

Kernel con CONFIG_HYPERV=y/CONFIG_HYPERV_TIMER=y. Terzo confronto: interfaccia **guest** `hyperv` esposta da VirtualBox, al posto di default/KVM, lasciando VirtualBox/NEM e hypervisor Windows invariati. Oracle raccomanda KVM per Linux e HyperV per Windows: qui è una prova diagnostica, non una raccomandazione generale per HAOS. CPU/RAM/HPET/bridge e cmdline originali.

Preparato `Test-AcaVirtualBoxStability.ps1` per il kit: lettura della sola VM UUID/disco esplicitamente indicati, misura300–1800s senza sonde nel mezzo, rifiuto della deriva e di GivenUp/heartbeat anche precedenti alla finestra. Nessuna configurazione o recupero automatico.8casi di regressione (compresi clock rallentato/accelerato e statistiche incomplete) PASS su PowerShell5.1 e7; prova del programma completo ancora da eseguire. Evita che una health positiva venga presentata come stabilità della piattaforma.

### Provider guest HyperV: primo campione positivo, ancora da confermare

VirtualBox espone vendor `VBoxVBoxVBox`, non abilitato alcun debugger o servizio HyperV nuovo; nel guest clocksource osservato `acpi_pm`. Non si afferma che HAOS usi i timer sintetici Hyper-V: l'effetto osservato è quello dell'intero diverso profilo guest. Primo avvio a freddo con providerHyperV, cap100,2CPU/2048MiB/HPET off/cmdline originale.

`hyperv-idle1/qualification.json`:300,383s host, VirtualSync+300,383s, uptime+300,410s, nessun nuovo evento timer/heartbeat, GivenUp non esposto a entrambi i confini (non inventato valore zero). PASS delle soglie, **non ancora prova di ripetibilità/H24**. Avviata prova con il vero client0.1.1: primo ritorno LAN dopo10s di link off con HTTP7,535s/delta entità7,751s; dopo30s HTTP8,796s/delta14,757s. Nessuna pausa/ripresa o login manuale.60s, avvio client offline e secondo cold ancora in corso.

Test del packaging aggiornato con il nuovo controllo e guida:9/9Node,0skip; launcherVirtualBox13simulati suPS5.1 e7 PASS, distinti dalle prove reali. Impronta corrente delle2010fonti applicative identica al candidato .76.1 (`46674138…`): nessuna modifica frontend/backend, runtime o dipendenze.

### Controevidenza HyperV: negativo al taglio60s, ritirato

`hyperv-native-lan1/result.json`:10s e30s PASS, **60s FALLITO**: link tornato on, ma health non recuperata entro il limite delle richieste (nessun PASS inventato, nessuna pausa/ripresa nel test). Alla chiusura fixture di stato non cancellabile via rete, da ricontrollare al riavvio; nessun dispositivo reale.

Diagnosi successiva al test concluso, non nel suo intervallo: lettura clock/console ha risvegliato il guest, VirtSync fermo/ritardo e GivenUp134,047s, console ancora attiva ma nessun IPv4 suenp0s3. Non è dimostrato un guasto esclusivo del bridge. Primo idle positivo insufficiente: providerHyperV **rifiutato e ritirato**, nessun debugger attivato.

Quarto confronto: scheda paravirtuale VirtIO con driver del guest, conservando MAC080027D28071, bridge e disco; ripristinato providerdefault/KVM e cap100. Cambia soltanto l'emulazione NIC rispetto alla baseline. [Oracle7.2 networking](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html) documenta VirtIO per evitare l'emulazione hardware e migliorarne le prestazioni; nessuna promessa di correzione NEM ricavata dalla fonte.

### VirtIO e controllo completo PowerShell: negativo, ritirato

Driver effettivo `virtio_net`, CONFIG_VIRTIO_NET=y, stessoMAC/IP192.168.1.79. Eseguito realmente il nuovo controllo con PowerShell5.1, UUID e VDI della sola VM REP092; link già off prima delle letture iniziali, mantenuto off durante300s e poi ripristinato dal controller esterno al programma. Nessun traffico HTTP/SSH nella finestra.

`virtio-isolated-ps51.json`: host300,122s, Virtual+300,124s, **VirtSync+0,841s**, GivenUp finale330,725s (iniziale non esposto),5avvisi log, exit1. Il controllo rifiuta correttamente la piattaforma; non è un errore dell'harness. VirtIO **non risolve** ed è ritirata. Il negativo riguarda timer virtuali anche senza rete, non solo il client.

Ultimo confronto mirato:3vCPU con NICIntel82540EM ripristinata e providerdefault/KVM/cap100/cmdline originali, a partire da poweroff. Segnalazioni primarie VirtualBox643/799 descrivono blocchi con2CPU su NEM e confronti con3CPU, principalmente in avvio Windows/UEFI; non dimostrano questa causa Linux e non vengono presentate come rimedio acquisito. Nessun cambio a CPU fisiche, affinità o protezioni dell'host.

### Tre CPU: negativo, ritirato; conclusione tecnica

`cpu3-isolated-ps7.json`, programma completo suPowerShell7:300,128s host, Virtual+300,146s, VirtSync+43,787s, GivenUp finale256,360s e1avviso log. Link off per l'intera finestra, nessun HTTP/SSH o recupero manuale. Anche3CPU **rifiutate**, poi baseline2CPU/2048MiB/defaultKVM/Intel82540EM/cap100 ripristinata da poweroff; cmdline originale SHA5d969dc7.

**Obiettivo recupero LAN/stabilità non raggiunto su questo host.** Cinque confronti reversibili non forniscono una correzione affidabile; nessuno è promosso a configurazione per il capo. La perdita di tempo VirtualSync e gli stall indipendenti dalla NIC rendono insufficiente intervenire sul client. Il coordinatore del profilo già ritenta automaticamente l'uso dopo errori transitori: schermata Riprova osservata mentre la centrale restava irraggiungibile, non dimostrazione di una nuova regressione frontend. Nessun keepalive o pausa/ripresa automatica introdotti per mascherare il difetto.

Le evidenze indicano un limite del percorso di virtualizzazione di questo host; la causa esatta non è dimostrata. Windows11Home build26300/SKU101 osservato, i7-13700HX, VirtualBox7.2.22/NEM. Non si estende il risultato a tutti i PC VirtualBox o al Lenovo. Nessun cambiamento di stack, sicurezza o hypervisor Windows applicato.

### Kit revisionato, conservazione e accessi

[Kit .76.1-vm-r2](../../backup/rep095/pilot-vm-r2/acasystem-pilot-candidate-0.9.76.1-vm-r2.zip):26file/153779197byte, SHA256 `7cec8f950f1729c178ee9cc9ea1455762eda105910611e56ba56bc8548906c9c`. Modificati soltanto4file pilota (README, VIRTUALBOX, COLLAUDO, messaggio finale launcher), aggiunti controllo/guida e ricalcolati provenienza/checksum. `prepare-pilot.mjs` e relativo test includono i materiali nuovi.26file e8delta attesi contro lo ZIP originale, nessun rimosso; bootstrap, client ed executor conservano i byte. Nessuna immagine, app o client ricostruiti:2010fonti ACA SHA46674138 e120file runtime live esatti. Kit precedente05cd8037 preservato; nessuna pubblicazione o prova Lenovo dedotta.

Prima preparazione rifiutata dal controllo dei delta perché il nome interno del client era diverso (`Acasystem-0.1.1-win-x64.zip` contro il nome registrato nella provenienza originale), non perché fossero diversi i byte: SHAa0d1cba5 in entrambi. Tentativo conservato separatamente; lettura del nome dal manifest e nuova generazione verificata. La comunicazione intermedia sui byte è stata corretta. Nessun artefatto preesistente sovrascritto.

`final-functional.json`:13tabelle personali selezionate esatte; le2righe client preesistenti riconosciute con l'impronta dell'intero sottoinsieme esatto,1nuova riga del vero EXE revocata tramite API con revoca refresh completata. Nessun confronto falsamente dichiarato14tabelle intere uguali. SQLite integro, tutte5identità HA iniziali identiche per ID/ruoli/stato, sensore temporaneo assente dopo reboot. Servizio attivo con file0600 e flow Sonoff aperto/annullato **senza owner**; nessuna riparazione manuale o comando fisico. Storico del sensore e attività/client di QA sono modifiche intenzionali.

Chiave REP007 rimossa per valore pubblico esatto, nuovo SSH rifiutato255/publickey a Dropbear ancora attivo; poi servizio fermato/mascherato runtime e porta chiusa via console. Shutdown con ack riuscito, poweroff osservato separatamente; CONFIG scollegata/UARToff. Nessun arresto forzato o pausa/ripresa per ottenere esiti positivi. Evidenze finali in `backup/rep095/final-conservation.json`.

Fonti consultate2026-11-16: [kernel6.18 NO_HZ](https://docs.kernel.org/6.18/timers/no_hz.html), [configurazione HAOS](https://contributors.home-assistant.io/os/operating-system/configuration/), [VBoxManage7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), [segnalazione primaria NEM837](https://github.com/VirtualBox/virtualbox/issues/837). L'issue upstream è osservazione su altro guest/host, non diagnosi di questa VM. Nessuna indicazione di disattivare sicurezza Windows viene applicata.

## Verifiche ed evidenze

Materiali e misure in `backup/rep095/`, esclusi da Git.

| Controllo | Ambiente / evidenza | Esito |
|---|---|---|
| nohz=off |300s idle, `nohz-idle1/qualification.json` | FALLITO, ritirato |
| CPU99% |300s idle, `cap99-idle1/qualification.json` | FALLITO, ritirato |
| Provider guestHyperV |300s idle e vero EXE | Idle/10s/30s PASS,60s FALLITO; profilo ritirato |
| VirtIO |300s isolati, controllo completoPS5.1 | FALLITO, ritirato |
|3CPU |300s isolati, controllo completoPS7 | FALLITO, ritirato |
| Client offline a freddo / secondo cold di un rimedio | Stadi successivi al60s interrotti dopo il negativo | NON ESEGUITI in REP007; nessun profilo idoneo da promuovere |
| Controllo clock |8regressioni suPS5.1 e7 | PASS; comprende rilevamento dei negativi reali, non stabilità della VM |
| Packaging |9Node/0skip,13launcher simulati suPS5.1/7 | PASS; fixture locali, nessuna pubblicazione |
| Byte kit / runtime |26file/8delta,2010fonti immutate/120runtime live esatti | PASS |
| Conservazione / revoca |13tabelle,2client originali,5identità, chiave rifiutata e VM chiusa | PASS, limiti sopra |

## Controllo del diff e decisioni

Diff limitato ai materiali pilota/controlli pertinenti e documenti di avanzamento. Nessun sorgente applicativo o dipendenza cambiato, nessuna nuova architettura applicata. Modifiche preesistenti conservate, staging vuoto e HEAD invariato; nessun commit/push/deploy. Skill surgical-coding/source-driven-development applicate. La revisione locale non autorizza a dichiarare qualificata una piattaforma che ha fallito i controlli.

## Chiusura e punto di ripresa

Collaudi e revisione del kit conclusi; **correzione irrisolta**, ISSUE-129 rimane aperta. VM riportata alla baseline e chiusa, banco escluso. Il kit aggiorna diagnosi/procedura, non contiene un rimedio promosso né una consegna qualificata. Nessuna ulteriore mutazione è lasciata in esecuzione.

Punto di ripresa: confronto su host diverso/Lenovo oppure motore separato, prima di promettere continuità. Il requisito umano corrente conserva VirtualBox come scelta del kit e vieta di toccare il banco; cambiare stack o protezioni richiede una nuova decisione umana secondo AGENTS.md. Non disattivare Hyper-V/VBS per tentare VT-x diretto su questo PC: influirebbe sul suo ambiente Docker/banco e non è autorizzato da questa verifica.

**Proposta P-129-C, non approvata:** confrontare la stessa combinazione su nuova VM Hyper-V del Lenovo Windows11Pro già dichiarato, usando i materiali alternativi già presenti e identità nuove; nessuna conversione o installazione eseguita qui. L'edizione Pro e l'hardware del destinatario restano da osservare; il percorso alternativo non è qualificato dalla sola preparazione. In alternativa confrontare VirtualBox sul Lenovo prima di cambiare tecnologia. Non trasformare questa proposta in una migrazione automatica.
