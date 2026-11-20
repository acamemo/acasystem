# Installer .exe per PC, chiavetta per mini PC e schermata di avvio

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261118-001 |
| Stato | In corso: `.exe`, chiavetta e immagine del mini PC provati in VM su questo PC; da provare su un altro PC e su un mini PC fisico |
| Data | 2026-11-18, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Commit di partenza | `c79f8c5` |
| Richiesta di riferimento | «riusciamo a chiudere un file .exe per installare l'app e configurarla su un altro pc per testare l'installer? Ovviamente anche una build con l'OS. […] l'OS dovrebbe mostrarti qr code (per accedere coi mobile) e l'indirizzo IP per i pc, poi ho anche una reference di un programma che vorrei provare a emulare la schermata di avvio» |
| Autorizzazione | Richiesta dell'utente del 2026-11-18, che autorizza l'installer .exe (REP-20261117-002) e, dopo, la chiavetta per il mini PC e la schermata di avvio. Risposte dell'utente: il disco non è incluso, l'installer «fetch verso github per scaricare l'ultima versione di acasystem»; mini PC tramite «Chiavetta USB»; D3 «All'accesso»; ordine «Prima l'exe». La pubblicazione di release su GitHub è un'azione verso l'esterno e richiede una conferma a parte. |

## Obiettivo e perimetro

1. **Installer .exe per Windows (primo).** Un unico eseguibile da lanciare su un altro PC, che:
   - verifica VirtualBox, che resta un prerequisito (D1);
   - scarica l'immagine HAOS ufficiale con impronta verificata e l'ultima release di Acasystem da GitHub;
   - crea la VM e applica l'eccezione EcoQoS con una sola conferma UAC;
   - imposta la chiave dalla console seriale e legge IP e chiave host;
   - esegue il bootstrap e installa il supervisore con avvio all'accesso (D3);
   - alla fine mostra l'IP e il QR code;
   - include la disinstallazione.

   Base: piano REP-20261117-002 (passi 1–12), `Start-AcaCentralSupervisor.ps1`, prototipo della console seriale, `Invoke-AcaBootstrap.ps1`.
2. **Chiavetta USB per il mini PC (secondo).** Installa HAOS ufficiale sul disco del mini PC e al primo avvio configura Acasystem senza intervento. L'OS non viene ricompilato.
3. **Schermata di avvio con QR code e IP (terzo).** La reference fornita dall'utente il 2026-11-18 è la procedura guidata di un registratore video di rete (NVR) mostrata su un televisore tramite HDMI:
   - una scheda scura centrata, con le schede dei passi in alto e quello attivo sottolineato in blu;
   - un riquadro «App» con il QR code a destra e un riquadro «Client desktop» con le istruzioni;
   - i pulsanti «Precedente» e «Prossimo».

   Collegata a REQ-29, ISSUE-135 e all'anteprima `progetto/ha-app/connection-screen/`, in attesa dell'approvazione grafica. L'immagine non viene versionata: contiene un identificativo del dispositivo.

Escluso: firma commerciale del codice; VirtualBox incluso nell'installer (D1); immagine HAOS ricompilata; pubblicazione su GitHub senza conferma.

Modifiche preesistenti: nessuna; albero pulito a `c79f8c5`.

### Chiarimento dell'utente, 2026-11-18

«voglio predisporre come possibilità sia di usare un proprio pc con una vm che un mini pc dedicato con l'os installato con chiavetta, devono funzionare quasi allo stesso modo a livello OS sia su VM che su mini pc, perciò chiedo con insistenza una build con HAOS e l'interfaccia che si apre con le istruzioni, qr code, indirizzo ip della macchina su cui viene eseguito os».

Con questo chiarimento il perimetro cambia così:

- **Un'unica build della centrale**: HAOS con Acasystem e la schermata di avvio, prodotta in due formati.
  - `.img` per la chiavetta del mini PC;
  - disco per VirtualBox su PC.
- **I client restano separati.**
  - L'app per PC si collega alla VM o al mini PC.
  - Per Android c'è l'app Capacitor.
  - Per iOS, per ora, la webapp dal browser.
- **L'.exe per PC** si riduce a importare la stessa immagine in VirtualBox, con il supervisore, più il client.

Valutazione: questa impostazione richiede meno lavoro complessivo rispetto a due percorsi diversi per VM e mini PC. Il costo si sposta all'inizio, sulla costruzione dell'immagine HAOS.

Ambiente di build disponibile:
- WSL2 Ubuntu e Docker Desktop installati;
- 282 GB liberi su C: al 2026-11-18.

## Fatti rilevati prima delle modifiche

- **Nessun installer .exe completo per la centrale in VM.** Esistono soltanto:
  - lo ZIP Electron `Acasystem-PC-VM-0.9.31` del motore VM, accantonato con ADR-0031;
  - l'EXE NSIS del solo client `Acasystem-Setup-miniPC-0.9.33.exe`;
  - il kit ZIP `0.9.76.1-vm-r2` con passaggi manuali.
- **Nessuna release sul repository GitHub.** `https://api.github.com/repos/acamemo/acasystem/releases/latest` risponde 404. Il repository risponde 200 anche senza autenticazione, quindi oggi risulta **pubblico, documentazione compresa**. ADR-0023 indica invece che l'utente non vuole rendere pubblica la documentazione: va chiarito con l'utente.
- **La schermata QR/IP sull'uscita HDMI della centrale non esiste.** `show-connection.mjs` stampa URL e QR in testo solo alla fine del bootstrap (REQ-29: «integrazione avvio HAOS non iniziata»).
- **La firma del codice manca.** Su un altro PC Windows mostrerà l'avviso SmartScreen per un eseguibile sconosciuto.

## Decisioni da prendere

- **R1 — Release pubblica.** Per «scaricare l'ultima versione da GitHub» serve almeno una release pubblicata, con il pacchetto Acasystem e il manifest con le impronte. Bisogna decidere se pubblicarla su `acamemo/acasystem` o su un repository pubblico separato, come previsto da ADR-0023.
- **R2 — Visibilità del repository.** Va confermato se il repository `acamemo/acasystem` debba essere davvero pubblico, documentazione compresa.

## Criteri di completamento dell'installer

- Un solo file `.exe` che, su un PC Windows con VirtualBox 7.2.22, porta da zero a una centrale raggiungibile senza altri passaggi manuali oltre alla conferma UAC. Mostra IP e QR code e riparte da sola all'accesso.
- Download verificati con impronta: un'immagine o un pacchetto che non corrisponde blocca l'installazione.
- Test automatici dei controlli e delle funzioni pure.
- Collaudo su una VM nuova su questo PC, poi su un altro PC.
- Disinstallazione che rimuove VM, supervisore e avvio automatico.

## Avanzamento e modifiche

### Prova di build di HAOS ufficiale, 2026-11-18

L'utente ha detto «Sì, parti».

**Ambiente di build.** I sorgenti di `home-assistant/operating-system`, tag `18.4` (commit `4a7dab4`), sono stati clonati in WSL2 Ubuntu nella cartella `~/aca-build/haos`. La build è stata lanciata con `scripts/enter.sh make ova`, nel container di build ufficiale su Docker Desktop 29.8.2. Il repository del progetto non è stato modificato.

**Risultato della build.**
- La build è durata dalle 09:21 alle 10:41, circa 80 minuti, con uscita 0.
- File prodotti: `haos_ova-18.4.ova`, `.vdi.zip` (SHA256 `c1d87d6f…d3d6`), `.vhdx.zip`, `.vmdk.zip`, `.qcow2.xz` e il bundle RAUC `.raucb`.
- La partizione dati `data.ext4` contiene già Supervisor, i plug-in e la landing page.

**Prova di avvio.**
- È stata creata una VM nuova, `ACA-build-test-20261118` (`5eca7d26-…`), in `backup/rep20261118-build/vm`, con la stessa configurazione della VM REP092: EFI, 2 GiB, 2 vCPU, bridge Wi-Fi.
- La VM è stata avviata da `Start-AcaCentralSupervisor.ps1`.
- Circa 90 s dopo l'avvio la console mostrava «System is ready», con IPv4 `192.168.1.80`, OS 18.4 e Core `landingpage`.
- Risposte HTTP: `:8123` e `:80` 200 con la landing page; `:4357`, l'Observer, 200.
- Alla fine la VM è stata spenta con `host shutdown` dalla CLI e il supervisore è stato fermato.

**Fatti rilevati per il progetto dell'immagine.**
- **La partizione dati è il punto di aggancio.** `package/hassio` scarica le immagini dei container in base a `version.home-assistant.io/<canale>.json` e le carica nella partizione dati con docker-in-docker (`dind-import-containers.sh`). Lì si può caricare anche l'immagine `ghcr.io/acamemo/acasystem:<versione>`.
- **Gli aggiornamenti ufficiali sostituiscono il sistema di base.** Un aggiornamento OTA ufficiale di HAOS rimpiazza la rootfs, mentre la partizione dati resta. Per questo Acasystem e la schermata devono vivere come app del Supervisor nella partizione dati. Nella rootfs può stare solo un servizio da eseguire una volta al primo avvio, che installa le app: se un aggiornamento lo rimuove, non fa danni.
- **Il repository pubblico delle release esiste già.** È `acamemo/acasystem-releases` ed è quello usato da `bootstrap-haos.sh`. Ultima release: `v0.9.34` del 2026-11-02. La candidata 0.9.76.1 non è pubblicata. R1 si riduce quindi a pubblicare lì la versione da usare, con conferma dell'utente.
- **La console HAOS mostra già l'IPv4,** ma non il QR code né le istruzioni. Per una schermata come quella di riferimento, grafica, con scheda e pulsanti, serve un'app con accesso all'uscita video (`video: true` e i dispositivi DRM/framebuffer) che mostri a schermo intero la pagina `connection-screen`.

### Prova tecnica della schermata di avvio, 2026-11-18

L'utente ha detto «Sì, procedi».

**Nuova app locale `progetto/ha-app/schermata-avvio/`, versione 0.1.3.**
- **`config.yaml`:** `host_network`, `video`, `udev`. Per la prova sono attivi anche `full_access`, `apparmor: false` e `SYS_ADMIN`, con la protezione disattivata dall'API del Supervisor.
- **`Dockerfile`:** Alpine 3.22 con `cage` (kiosk Wayland, renderer pixman), Chromium, `seatd` e `qrencode`. Alpine non offre `cog`/WPE, quindi si usa Chromium.
- **`run.sh`:** legge l'IPv4 della rotta predefinita, genera la pagina e il QR del solo URL `http://<IP>:3002/` e avvia il kiosk a schermo intero. Se l'indirizzo cambia, rigenera la pagina e riavvia il kiosk.
- **`page/index.template.html`:** pagina in italiano, scheda scura in stile reference, con stato della rete e IP, riquadro «Telefono o tablet» con il QR, riquadro «Computer» con l'indirizzo.

**Problemi incontrati e corretti.**
- Il Supervisor 2026.11 legge le app locali da `/mnt/data/supervisor/apps/local`, non da `addons/local`.
- I permessi dell'app si aggiornano solo cambiando versione.
- Il profilo AppArmor predefinito e il cgroup dei dispositivi (solo video) impedivano a `seatd` di aprire `tty0`. Risolto con protezione disattivata, `full_access` e AppArmor disattivato.
- Il popup di traduzione di Chromium è stato rimosso con `translate="no"` e `--disable-features=Translate,TranslateUI`.

**Risultato.**
- Dopo un'accensione a freddo la schermata compare da sola. La rete risponde in 19 s e la schermata è a video entro 94 s; il primo controllo è stato fatto a 94 s.
- Il QR, decodificato con `zbarimg` dallo screenshot, contiene `http://192.168.1.80:3002/`.
- Consumo dell'app a riposo: CPU circa 0,03 %, memoria circa 340 MB.
- Dimensione dell'immagine: 1,17 GB, misurata nella build locale.

**Problemi aperti emersi.**
- **Riavvio dall'interno della VM in modalità NEM (ISSUE-167; mitigazione nella sezione successiva).** Dopo `ha host reboot` la VM resta per oltre 15 minuti sulla schermata «Booting Slot A». Nel log il kernel avanza di un passo ogni pochi minuti, anche con il supervisore e con un tasto premuto ogni secondo. Spegnimento e riaccensione a freddo riportano subito la VM al funzionamento normale. Ogni aggiornamento di HAOS o di Core che riavvia l'host richiede quindi una soluzione: per esempio, il supervisore riconosce il reset e lo trasforma in spegnimento più avvio.
- **Rumore nel log di VirtualBox.** Ogni risveglio con `Debugger.Info('clocks')` scrive in `VBox.log` un `AssertLogRel tmCpuTickGetInternal … VERR_VM_THREAD_NOT_EMT`. In circa 28 minuti sono state scritte oltre 26.000 righe; a fine prova il log pesava 724 KB. Va valutato prima dell'uso continuativo: rotazione, crescita del log, altra richiesta di risveglio.
- **Permessi ampi.** I permessi della prova (`full_access`, AppArmor disattivato, protezione disattivata) vanno ristretti ai soli dispositivi necessari, cioè `tty0`/`tty1` e DRM, prima di un rilascio.
- **Dimensione.** Con 1,17 GB l'immagine pesa sulla chiavetta e sull'.exe. Si può provare a togliere `mesa` (Chromium usa `--disable-gpu`) o a usare un renderer più leggero.
- **Grafica.** È un prototipo, non approvato. La grafica definitiva deve seguire `design.md` e Kit 2 (ADR-0011) e va approvata dall'utente; REQ-29 prevede la sola anteprima.

### Riavvio del guest gestito dal supervisore, 2026-11-18 pomeriggio

L'utente ha scelto «Prima il riavvio VM».

**Osservazione nel log.** In `VBox.log.1` della VM di prova, il riavvio chiesto da HAOS compare come `ACPI: Reset initiated by ACPI` seguito da `Changing the VM state from 'RUNNING' to 'RESETTING'`; dopo 0,65 s la VM torna `RUNNING` e il firmware riparte, poi l'avvio si blocca. Non è stata cercata la causa interna del blocco dopo il reset: si usa il fatto, già osservato, che l'avvio a freddo riesce.

**Modifica a `progetto/ha-app/pilot/Start-AcaCentralSupervisor.ps1`.**
- All'avvio legge da `showvminfo --machinereadable` la cartella dei log (`LogFldr`, con le barre rovesciate raddoppiate da riportare a singole).
- Con la VM accesa legge ogni secondo soltanto le righe nuove di `VBox.log`, aperto in condivisione senza bloccarlo. Alla prima lettura salta lo storico; dopo ogni accensione riparte dall'inizio del nuovo file.
- Se trova il passaggio `RUNNING` → `RESETTING`, chiude la sessione di risveglio, spegne la VM (`controlvm poweroff`) e la riavvia headless anche se è già stata avviata una volta (`RestartPending`). Uno spegnimento chiesto dal guest resta rispettato.
- Il riepilogo ogni 10 minuti riporta anche il numero di reset gestiti.
- Lo spegnimento avviene dopo che HAOS ha già chiuso i servizi e i filesystem per riavviarsi: in quel momento la VM è nel firmware o nel boot loader.

**Limite da conoscere.** Il boot loader di HAOS conta i tentativi di avvio di uno slot dopo un aggiornamento del sistema e torna allo slot precedente dopo tre tentativi falliti. Lo spegnimento durante il boot loader può consumare un tentativo in più. Non è stato provato con un vero aggiornamento di HAOS.

**Test unitari.** `central-supervisor.test.ps1` passa da 11 a 17 controlli: avvio dopo il reset, risveglio durante il riavvio, riconoscimento di righe reali di VBox 7.2.22 (reset, accensione, spegnimento, fine del reset) e ripresa della lettura su un file nuovo.

**Prova reale sulla VM `ACA-build-test-20261118`, con la schermata 0.1.3 installata.**
- Primo `ha host reboot` alle 13:29:57, con il supervisore avviato a VM già accesa: reset riconosciuto alle 13:30:19, spegnimento in 0,4 s, VM riaccesa alle 13:30:23, HA di nuovo raggiungibile alle 13:30:57. Dopo il riavvio: Core 2026.11.2, slot A, nessun errore ext4 in `dmesg`, schermata con il QR a video (`backup/rep20261118-build/reboot-supervisore.png`).
- Secondo `ha host reboot` alle 13:31:38, con la VM accesa dal supervisore stesso: reset riconosciuto alle 13:31:58, VM riaccesa alle 13:32:03, HA raggiungibile alle 13:32:37.
- `ha host shutdown` alle 13:32:53: VM spenta alle 13:33:16 e ancora spenta 40 s dopo, nessun riavvio.
- Log del supervisore in `backup/rep20261118-build/supervisore-reset/`. Il supervisore è stato fermato per PID, la VM è spenta.

**Ancora aperto.** Il rumore nel log di VirtualBox resta: dopo circa 1 minuto e 10 secondi di esecuzione l'ultimo `VBox.log` contiene 645 righe `VERR_VM_THREAD_NOT_EMT`. Cambiare la richiesta di risveglio richiede nuove prove idle di 30 minuti, perché il risveglio dipende da un comportamento interno non documentato.

### Rumore nel log di VirtualBox, 2026-11-18 pomeriggio

L'utente ha scelto «VirtualBox log noise». Evidenze in `backup/rep20261118-build/rumore/` (`riepilogo.txt`, `idle-*.json`, log del supervisore).

**Osservazioni.**
- Su 50 chiamate per ciascuna, solo `clocks` scrive in `VBox.log` (2 righe per chiamata: `AssertLogRel tmCpuTickGetInternal` e `VERR_VM_THREAD_NOT_EMT`). Le altre provate non scrivono nulla: `help`, `fflags`, `activetimers`, `timers`, `apictimer`, `pit`, `rtc`, `cpumguest`.
- **Il rumore si limita da solo.** Nella prova notturna di 9 ore sulla VM REP092 il log si ferma a 16.368 avvisi: dopo circa 30 minuti VirtualBox scrive *"32768 messages from group TM (#400), muting it"*. `VBox.log` arriva a 5,5 MB per l'intera sessione e VirtualBox conserva 3 log precedenti, quindi non c'è crescita illimitata.
- **Effetto collaterale.** Dopo il silenziamento VirtualBox non scrive più nemmeno i veri avvisi del gruppo TM, compreso `TM: Giving up catch-up attempt`. Nelle prove di stabilità più lunghe di 30 minuti, tra cui la prova notturna di REP-20261117-002, il criterio «nessun avviso nel log» è quindi cieco dopo la prima mezz'ora. Restano validi gli altri due criteri: deriva di VirtualSync rispetto all'host e statistica `/TM/VirtualSync/GivenUp`. Non riguarda gli avvisi del battito del guest (`VMMDev`).

**Prove in idle, 300 s se non indicato, con `Test-AcaVirtualBoxStability.ps1` sulla VM di prova.**

| Richiesta di risveglio | Condizione | VirtualSync / host | Esito |
|---|---|---|---|
| `activetimers` | prima prova dopo l'accensione | 80,4 / 300,1 s | Fallito |
| `fflags` | dopo un avvio a freddo | 96,1 / 300,1 s | Fallito |
| `help` (nessun effetto atteso) | dopo prove fallite | 90,5 / 300,1 s | Fallito |
| `clocks` | dopo quattro prove fallite | 132,7 / 300,2 s | Fallito, stato già compromesso |
| `clocks` | dopo un avvio a freddo | 300,137 / 300,124 s | Superato |
| `cpumguest` | dopo un avvio a freddo | 300,122 / 300,113 s | Superato, log pulito |
| `cpumguest`, 1800 s | dopo un avvio a freddo | 1800,418 / 1800,504 s | Superato; CPU VM 22,6 % di un core, log 128 KB in 33 min |
| `cpumguest` nel supervisore | dopo `ha host reboot` gestito | 154,0 / 300,1 s | **Fallito**: due recuperi abbandonati da 60 s |
| `clocks` nel supervisore | stessa sequenza | 300,100 / 300,099 s | Superato |

**Decisione esecutiva.** Il supervisore resta su `clocks`, l'unica richiesta che ha superato tutte le prove, inclusa la notte di 9 ore. `cpumguest` non sostituisce `clocks`: con il supervisore è fallita. La richiesta è ora isolata in `Get-AcaWakeInfoItem`, con un test che ne fissa il valore (18 controlli PASS); il commento del supervisore riporta le prove. Il rumore resta come limite noto, limitato a circa 5 MB per sessione.

**Osservazione aggiuntiva sul riavvio gestito.** Nella sequenza con `cpumguest` il guest era rallentato (battito assente da 4 s). `ha host shutdown` si è concluso con un reset ACPI invece che con uno spegnimento, e il supervisore ha riacceso la VM. Con `clocks` lo stesso spegnimento è stato rispettato. Il caso si presenta solo con un guest già in stallo; è registrato in ISSUE-167.

**Proposta, non applicata.** `Test-AcaVirtualBoxStability.ps1` potrebbe riconoscere la riga `muting it` del gruppo TM e segnalare che il criterio sugli avvisi non è più affidabile. Serve un'autorizzazione.

### Grafica della schermata in stile ACA, 2026-11-18 sera (approvata)

L'utente ha scelto «Screen design». Dopo lo screenshot del kiosk l'utente ha approvato la grafica («Approve», 2026-11-18); REQ-29, `product.md` e `design.md` sono aggiornati.

**Scelte.**
- Materiale e font dal design condiviso `progetto/acasystem/design`, oggi Vetro Bianco (ADR-0043): paesaggio con velo, card di vetro con blur solo sulla card, testo bianco, Inter locale. Il tema prevedeva già la classe `.connection-screen`.
- Composizione ripresa dalla reference Reolink, senza pulsanti né schede (il kiosk non ha input; REQ-29 esclude pulsanti):
  - titolo e sottotitolo;
  - riga di stato con «Rete» e «Indirizzo IP»;
  - riquadro «Telefono o tablet» con due passi e QR nero su bianco;
  - riquadro «Computer» con l'indirizzo in evidenza.
- Stato senza rete: titolo «Acasystem si sta collegando», niente QR né indirizzo, indicazione sul cavo di rete.
- Testi non sotto i 16 px. Sui TV Full HD la card è ingrandita in proporzione (1,35×; 2× oltre 2400 px), così si legge a distanza.
- Puntatore nascosto (`cursor: none`); aggiunto dopo lo screenshot della VM, non ancora ricostruito nell'immagine.

**File.**
- `page/index.template.html` e `page/screen.css`, riscritti.
- `prepare-page.mjs` (nuovo): copia il design condiviso in `page/design-aca/` (generata, esclusa da Git) prima della build e genera un'anteprima locale con `--preview <URL>` e `--offline`.
- `run.sh`: aggiunto il segnaposto `{{RETE}}` (`on`/`off`).
- `config.yaml`: versione 0.2.0.

**Verifiche.**
- Anteprima nel browser a 1024×768, 1920×1080 e nello stato senza rete: nessuno scorrimento, riquadri allineati.
- Nella VM di prova, kiosk cage + Chromium senza GPU: resa corretta di paesaggio, vetro e font (`backup/rep20261118-build/grafica-vm-1024.png`). QR letto da `zbarimg` come `http://192.168.1.80:3002/`.
- Immagine 1,18 GB (prima 1,17); memoria dell'app circa 460 MB (prima circa 340 MB), per il blur e la foto.

**Limiti.** Non provata su un vero TV/mini PC né su un'uscita a 1080p reale. Lo stato senza rete è stato provato solo nell'anteprima del browser.

### Pacchetto di prova per il PC di un collega, 2026-11-18 sera

Richiesta: «sì, parti con il pacchetto di prova». Scopo: far installare la centrale su un altro PC con VirtualBox, senza passaggi manuali, prima dell'`.exe` definitivo.

**Pubblicazione di Acasystem 0.9.76.1 (confermata dall'utente: «Sì, pubblica»).**
- Il Supervisor scarica sempre l'immagine dell'app dal registro, anche se è già sul disco (`DockerInterface.install` in Supervisor 2026.11.0). Le app locali si costruiscono con `buildx --pull`. Non è quindi possibile precaricare nell'immagine HAOS una versione non pubblicata.
- Immagine `ghcr.io/acamemo/acasystem:0.9.76.1` caricata dal login ghcr già salvato in Docker Desktop. Digest `sha256:64b0c1a4968d567faaa2185b13903f14a204731f3dcb1b7cb1cb3721fffcf870`, uguale al descriptor registrato in REP-20261116-005. Archivio sorgente `backup/rep093/materials/acasystem-0.9.76.1-image.tar`. Manifest scaricabile senza login (200) e con lo stesso SHA.
- Catalogo `acamemo/acasystem-releases`: commit locale `c97c67f` (versione 0.9.76.1, voce in CHANGELOG, due frasi di DOCS). **Push rifiutato (403)**: l'account `Mattiapentagallo` non ha permesso di scrittura. L'utente concede il permesso dall'account `acamemo`; finché non accade il catalogo offre ancora 0.9.34.
- Release v0.9.76.1 con i sorgenti (GPL, come dichiara DOCS) non ancora creata: richiede lo stesso permesso. `acasystem-src-0.9.76.1.zip` controllato: nessun percorso personale o email; tre IP privati di esempio nei test.
- Compatibilità dichiarata dalla candidata: Core `< 2026.11.2`, mentre HAOS 18.4 scarica oggi Core 2026.11.2. Da osservare nella prova con la 0.9.76.1.

**Immagine HAOS con primo avvio automatico (`progetto/haos-image/`).**
- `overlay/usr/libexec/aca-firstboot` e `aca-firstboot.service`, attivato da `71-aca.preset`. Al primo avvio:
  - attende il Supervisor;
  - copia i sorgenti della schermata in `/mnt/data/supervisor/apps/local`;
  - aggiunge il repository pubblico di Acasystem;
  - installa la schermata, toglie la protezione e la avvia;
  - installa e avvia Acasystem;
  - ripete ogni passo fino a 60 volte e alla fine scrive `/mnt/data/aca/firstboot-v1.done`.
- Nessun account, dato o rete viene toccato.
- `build.sh` applica overlay e schermata al clone HAOS 18.4 e lancia la build. Rifiuta un `run.sh` con fine riga CRLF. Seconda build in circa 2 minuti: `haos_ova-18.4.vdi.zip` da 591.433.473 byte, SHA-256 `403a7cb5…6110`; servizio e link `multi-user.target.wants` presenti nel rootfs.

**Script del pacchetto (`progetto/haos-image/pacchetto-prova/`).**
- `Installa.cmd`:
  - controlla checksum, VirtualBox e spazio;
  - sceglie la scheda di rete della rotta predefinita e crea la VM (EFI, 2 CPU, 2 GB, bridged, disco con UUID nuovo);
  - registra l'attività pianificata all'accesso dell'utente con il supervisore e la avvia.
  - Chiede «SI»; non installa VirtualBox e non cambia protezioni o firewall.
- `Mostra-Schermata.cmd`: la VM non ha finestra, quindi cattura la schermata con QR e indirizzo e la apre.
- `Disinstalla.cmd`: chiede «ELIMINA», poi rimuove attività, VM e cartella.
- `LEGGIMI.txt` per il collega; `assembla.ps1` crea lo ZIP (591 MB) con `SHA256SUMS`.
- Corretto durante la prova: in PowerShell 5.1 l'avanzamento che VBoxManage scrive su stderr interrompeva gli script con `ErrorActionPreference=Stop`.

**Prova sul PC di sviluppo, VM nuova `ACA-Prova-Pacchetto`.**
- ZIP estratto in una cartella pulita, `Installa-Centrale.ps1` eseguito come l'utente. VM creata e collegata in bridge al Wi-Fi, attività avviata, supervisore attivo, VM accesa in 4 s.
- Primo tentativo fallito per un limite dell'ambiente dell'agente: l'app Claude virtualizza `AppData\Local`, quindi VirtualBox non vedeva il disco copiato. Mezza VM rimossa; prova ripetuta con la cartella `C:\Users\matti\ACA-Test\Prova-Pacchetto`. Sul PC del collega `Installa.cmd` viene avviato da Esplora risorse e non ha questo limite.
- Schermata con QR e IP a video entro 5 minuti dall'accensione, puntatore assente. QR letto come `http://192.168.1.12:3002/`. `GET /api/health` → `{"status":"ok","version":"0.9.34"}`, HA risponde (307). Evidenze in `backup/rep20261118-pacchetto/`.
- La centrale di prova resta installata per provare l'aggiornamento 0.9.34 → 0.9.76.1 dopo il catalogo, poi verrà rimossa con `Disinstalla.cmd`.

**Catalogo e release dopo il permesso (utente: «Fatto»).**
- `Mattiapentagallo` ha ora il ruolo Write su `acasystem-releases`: push di `c97c67f` riuscito, il catalogo offre 0.9.76.1.
- Release [v0.9.76.1](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.76.1) (ID 450443349, pre-release, non «latest»). Allegati: sorgenti, bundle web, `manifest.json`, `SOURCE-PROVENANCE.json`, `PUBBLICAZIONE.md` e `SHA256SUMS`. Tutti scaricati senza login: `sha256sum -c` OK. Credenziale GitHub letta dal Git Credential Manager solo in memoria.

**Seconda prova del pacchetto, con la 0.9.76.1.**
- `Disinstalla-Centrale.ps1` con «ELIMINA»: VM, attività pianificata, supervisore e cartella rimossi.
- Reinstallazione da zero dallo stesso pacchetto: schermata in 303 s con IP `192.168.1.13`; `GET /api/health` → `{"status":"ok","version":"0.9.76"}` (app 0.9.76.1 sulla base 0.9.76); pagina 200.
- `Mostra-Schermata.ps1`: immagine della centrale catturata e aperta.
- Pacchetto finale `backup/rep20261118-pacchetto/finale/ACA-Centrale-0.9.76.1-prova.zip`, 591.491.863 byte, SHA-256 `b33b60da…94d3`; script identici a quelli provati.
- Su richiesta dell'utente la centrale di prova è stata rimossa con `Disinstalla-Centrale.ps1`: nessuna VM `ACA-Prova-Pacchetto`, nessuna attività pianificata né supervisore attivi, cartella `C:\Users\matti\ACA-Test` eliminata.

**Non ancora verificato.**
- Aggiornamento di una centrale 0.9.34 alla 0.9.76.1 dal Supervisor.
- Collegamento effettivo di Acasystem a Home Assistant: account e dispositivi oltre health e pagina, con Core 2026.11.2 fuori dall'intervallo dichiarato dalla candidata.
- PC del collega; avvio da Esplora risorse con l'avviso SmartScreen; stabilità su più ore.

### Chiavetta per il mini PC e aggiornamento dal Supervisor, 2026-11-18/19 notte

Richiesta: «Procedi in automatico, non mi chiedere le cose per le prossime 2 ore», poi «ok continua, poi committa e pusha tutto». Perimetro: punto 2 dell'incarico (chiavetta del mini PC) e verifiche rimaste aperte.

**Immagine `.img` per il mini PC (`generic_x86_64`).**
- `build.sh` usa ora una cartella di output distinta per formato (`output`, `output-generic_x86_64`): Buildroot non cambia destinazione nella stessa cartella senza `distclean`.
- Prima build (circa 60 min) fallita in `genimage`: `rootfs.erofs` 269.074.432 byte contro una partizione di sistema da 268.435.456. Spostata la schermata fuori dal sistema, il sistema supera ancora il limite di 49 KB **senza alcun file ACA**: la build ufficiale 18.4 compilata su questo PC non entrerebbe. Causa del divario con le immagini ufficiali non individuata.
- Correzioni in `build.sh`, solo per `generic_x86_64`:
  - `BR2_TARGET_ROOTFS_EROFS_DEDUPE=y`: mkfs.erofs comprime una sola volta i blocchi identici (firmware ripetuti). Contenuto invariato, nessun file tolto; sistema da 248.631.296 byte, circa 20 MB di margine.
  - `CONFIG_SYSFB_SIMPLEFB=y` e `CONFIG_DRM_SIMPLEDRM=y` nel kernel, come nel kernel `ova` di HAOS. Senza, la schermata registrava «Found 0 GPUs» in VirtualBox: il kernel generic ha solo i driver Intel/AMD. Con `simpledrm` lo schermo UEFI è un dispositivo DRM finché non subentra il driver della scheda.
- **Schermata nella partizione dati, per entrambi i formati.** I sorgenti vanno in `supervisor/apps/local/aca_schermata` della partizione dati tramite un aggancio a `create-data-partition.sh`; nel sistema resta solo `aca-firstboot`, che salta la copia quando trova i file.
- Artefatto: `haos_generic-x86-64-18.4.img.xz`, 556.661.980 byte, SHA-256 `772eb67f…196c`.

**Chiavetta d'installazione (`progetto/haos-image/chiavetta/`).** HAOS non ha un programma d'installazione, quindi la chiavetta avvia Alpine standard 3.24.4 (ISO ufficiale, SHA-256 `92e3e4e4…3582` verificato con il file `.sha256` del mirror ufficiale) con un overlay che esegue `aca-install.start`:
- trova l'immagine sulla chiavetta ed esclude la chiavetta stessa, le unità virtuali e i dischi sotto 28 GB;
- con un solo disco interno lo sceglie, con più dischi chiede il numero;
- disco vuoto: parte dopo 15 s (Invio annulla); disco con partizioni: chiede di scrivere SI;
- scrive con `xzcat | dd`, rilegge il disco e ne confronta l'impronta con quella calcolata in fase di build;
- quando la chiavetta viene tolta, riavvia.
- `build-chiavetta.sh` crea, in un container Alpine senza privilegi, un disco GPT con una partizione di sistema EFI FAT32. Artefatto `aca-chiavetta-18.4.img`, 1.043.439.616 byte, SHA-256 `287490d5…15bd`. Il caricatore GRUB della ISO cerca l'etichetta del CD e, non trovandola, usa il dispositivo da cui è partito.
- `LEGGIMI.txt` descrive preparazione con balenaEtcher o Rufus (modalità DD), requisiti (UEFI, Secure Boot disattivato, disco da 32 GB, cavo di rete) e installazione.

**Prove in VM (VirtualBox 7.2.22, EFI, 2 CPU, 2 GB).**
- Immagine fittizia da 200 MB su disco vuoto da 32 GB: avvio dalla chiavetta, partenza dopo 15 s, scrittura e verifica, riavvio 2 s dopo la rimozione della chiavetta (`VBox.log`: `RUNNING` → `RESETTING`).
- Immagine vera su disco vuoto da 64 GB: scritta e verificata in meno di 3 minuti; dopo la rimozione la VM parte dal disco interno con HAOS 18.4 (IP `192.168.1.16`). Primo avvio completato, Acasystem `{"status":"ok","version":"0.9.76"}`, ma senza schermata per l'assenza di DRM (vedi sopra).
- Dopo la correzione del kernel, chiavetta nuova sullo stesso disco con la centrale: richiesta «Scrivere SI», scrittura e verifica riuscite; tolta la chiavetta, health ok dopo 453 s e schermata a video con IP `192.168.1.16`; QR letto da `zbarimg` come `http://192.168.1.16:3002/`.
- Nuova immagine `ova` (schermata nella partizione dati, `haos_ova-18.4.vdi.zip` SHA-256 `631dd1ec…`): VM nuova con supervisore, schermata con IP `192.168.1.18` e health `0.9.76` entro 9 minuti; VM rimossa. Il pacchetto di prova `ACA-Centrale-0.9.76.1-prova.zip` contiene ancora il disco precedente, con la schermata nel sistema, provato il 2026-11-18.
- La console seriale non è attiva nell'immagine generic: comandi e log letti dalla tastiera virtuale e dagli screenshot.
- VM, supervisore (PID proprio) e dischi rimossi; evidenze e artefatti in `backup/rep20261119-chiavetta/`, escluso da Git.

**Aggiornamento 0.9.34 → 0.9.76.1 dal Supervisor.**
- VM dall'immagine `ova`, primo avvio automatico in circa 8 minuti (installata 0.9.76.1).
- Disinstallata l'app, il clone locale del catalogo nella VM è stato riportato al commit `ff77efe` (0.9.34) con `git fetch --deepen=2` e `git checkout`, più riavvio del Supervisor: installata la 0.9.34, health `0.9.34`, database `tunet.db` creato con il punto di ripristino `aca-before-v2`. Il catalogo pubblico non è stato toccato.
- Ripristinato il ramo `main` del clone e riavviato il Supervisor (il solo `ha store reload` non rilegge un checkout spostato a mano): `update_available: true`, `ha apps update` riuscito, app 0.9.76.1 avviata, health `0.9.76`, secondo punto di ripristino creato, nessun errore nei log.
- Limite: database senza account né dispositivi; la prova copre il percorso di aggiornamento e l'avvio sul database della 0.9.34, non la migrazione di dati reali.

**Non ancora verificato.**
- Avvio su un mini PC fisico: driver Intel/AMD, Secure Boot, menu di avvio, eMMC.
- Aggiornamenti OTA di HAOS su un sistema compilato qui con deduplicazione e `simpledrm`: il pacchetto RAUC ufficiale sostituirebbe kernel e sistema con quelli upstream, senza `simpledrm`.

### Installatore `.exe` per PC, 2026-11-19

Richiesta dell'utente: «facciamolo perché questo lo potrei provare su un altro pc in casa». Risposte: disco «Scaricato da GitHub», «Sì, anche il client».

**Release del disco.** Pubblicata su `acamemo/acasystem-releases` la release `centrale-vm-18.4-1` come pre-release, non «latest»: `aca-centrale-vm-18.4-1.vdi.zip` (591.325.182 byte, SHA-256 `631dd1ec…fda2`, il disco `ova` provato sopra), `SHA256SUMS`, `PUBBLICAZIONE.md`. Client e politica di aggiornamento leggono solo i tag `v*` e la release «latest» (ancora `v0.9.34`), quindi la nuova release non li tocca.

**Installatore.** `progetto/haos-image/installer-exe/`:
- `aca-system.nsi` (NSIS 3.0.4.1, già presente nella cache di electron-builder): installa per l'utente corrente senza diritti di amministratore in `%LOCALAPPDATA%\ACA-System`. Controlla Windows a 64 bit, la presenza di VirtualBox (se manca apre la pagina di download) e un'installazione precedente.
- Avvia `Installa-Centrale.ps1` con l'indirizzo e l'impronta del disco, poi copia l'app Acasystem per PC 0.1.1. Crea il collegamento sul desktop, tre voci nel menu Start (Acasystem, Mostra la schermata della centrale, Disinstalla ACA SYSTEM) e la voce in Impostazioni > App.
- Il disinstallatore chiede conferma, rimuove la centrale con `Disinstalla-Centrale.ps1 -Conferma`, poi app, collegamenti e voce di registro.
- `crea-installer.ps1` raccoglie script, supervisore e app per PC in una cartella temporanea e compila l'eseguibile. `LEGGIMI.txt` contiene le istruzioni per l'utente.

**Modifiche agli script del pacchetto di prova.**
- `Installa-Centrale.ps1`: nuovi parametri `-UrlDisco`, `-ImprontaDisco` e `-Conferma`. Se il pacchetto non contiene il disco, lo scarica con `curl.exe`, ne controlla l'impronta ed estrae il `.vdi` con `tar.exe` (entrambi inclusi in Windows 10 1803 e successivi). In caso di errore rimuove la cartella. Con `-Conferma` salta la domanda SI, scrive il registro in `%TEMP%\aca-installazione.log` e attende Invio prima di chiudersi su un errore.
- `Disinstalla-Centrale.ps1`: `-Conferma` salta la domanda ELIMINA.
- `Mostra-Schermata.ps1`: i messaggi compaiono anche in una finestra, perché dal menu Start la console è nascosta.
- Tutti e tre cercano VirtualBox anche in `ProgramW6432`.

**Problemi trovati nelle prove e correzioni.**
- Smart App Control attivo su questo PC bloccava l'eseguibile non firmato, senza la possibilità di avviarlo comunque. Non è stato aggirato: lo ha disattivato l'utente. Il `LEGGIMI.txt` lo spiega. Senza firma resta anche l'avviso SmartScreen.
- NSIS è a 32 bit: PowerShell avviato da `$SYSDIR` era a 32 bit e non trovava VirtualBox in Program Files. Corretto con `$WINDIR\Sysnative` e con la ricerca in `ProgramW6432`.
- Con `ErrorActionPreference=Stop`, l'avanzamento che curl e tar scrivono su stderr diventava un errore in Windows PowerShell 5.1: impostato `Continue` attorno ai due comandi.
- Primo download vero da GitHub: circa 90 KB/s, connessione caduta al 51% dopo 55 minuti (curl 18), installazione annullata e cartella rimossa. Ora il download fa fino a 20 tentativi e ognuno riprende dai byte già scaricati (`-C -`). Verificato che GitHub accetta la ripresa: una copia del disco troncata a 591.000.000 byte è stata completata scaricando solo la parte mancante, con l'impronta corretta.
- Dopo la disinstallazione restava la cartella vuota: VBoxSVC, avviato per la prima volta durante l'installazione, ne aveva ereditato la cartella di lavoro. Ora PowerShell parte con la cartella di lavoro in `%TEMP%`, sia in installazione sia in disinstallazione.

**Prova completa (Windows 11, VirtualBox 7.2.22, Wi-Fi).** Per non attendere il download lento è stato compilato un eseguibile di prova identico, con il disco servito da `127.0.0.1` (stesso file, stessa impronta).
- Installazione silenziosa (`/S /D=…`): uscita 0 in 32 s. Presenti VM, attività pianificata in esecuzione, `installazione.json`, collegamento sul desktop, tre voci nel menu Start e voce in Impostazioni > App.
- Primo avvio: schermata «Acasystem è pronto» con IP `192.168.1.20` e QR. Health `{"status":"ok","version":"0.9.76"}` dopo circa 67 minuti, perché la connessione era lenta (la VM aveva ricevuto 814 MB a circa 160 KB/s).
- La voce «Mostra la schermata della centrale» del menu Start cattura la schermata e la apre nel visualizzatore.
- Disinstallazione silenziosa: VM, attività, collegamenti, voce di registro e file rimossi in 15 s; restava la cartella vuota. Dopo la correzione, nuova installazione e disinstallazione in un'altra cartella: tutto rimosso in 9 s. VBoxSVC era già attivo, quindi la seconda prova non ricrea la condizione originale.
- Eseguibile finale con l'indirizzo GitHub: `backup/rep20261119-exe/ACA-System-Setup-18.4-1.exe`, 115.510.265 byte, SHA-256 `36bedbee…0b57`, escluso da Git. Il download completo da GitHub con questo eseguibile non è stato ripetuto: la ripresa è verificata a parte.
- Non verificati: firma del codice, un PC senza VirtualBox, Windows 10, PC con Smart App Control attivo.

### Aggiornamenti automatici di Acasystem, 2026-11-20

Domanda dell'utente: «installato poi quando farò aggiornamenti e faremo commit, si aggiornerà l'app sul pc?». Risposta: no. Un push su `main` produce una pre-release di prova, il catalogo si aggiorna a parte e la centrale non installava nulla da sola. Il worker di aggiornamento ACA (`haos-update.mjs`) non è attivo. Proposta: attivare l'aggiornamento automatico del Supervisor per l'app Acasystem al primo avvio. Risposta dell'utente: «Yes, turn it on». Poi, per pubblicare il nuovo disco e ricompilare l'`.exe`: «Yes, publish it».

- **Comportamento del Supervisor**, dal sorgente `home-assistant/supervisor` (`supervisor/misc/tasks.py`, ramo `main`, letto il 2026-11-20):
  - controllo ogni 16 ore, rilettura del catalogo ogni 3 ore;
  - una nuova versione viene installata solo quando ha almeno un giorno;
  - nessun aggiornamento che attraversi una versione dichiarata `breaking_versions`;
  - aggiornamento tramite Home Assistant Core con un backup prima.
- **Limite:** ogni versione pubblicata nel catalogo arriva a tutte le centrali con l'opzione attiva, entro 1-2 giorni. Questo percorso non ha il controllo di compatibilità né il ritorno automatico alla versione precedente previsti dal worker ACA; resta il backup del Supervisor.
- `aca-firstboot`: dopo l'avvio di Acasystem imposta `auto_update` con l'API del Supervisor (`POST /addons/<slug>/options`) e lo verifica con `ha apps info`; il passo si ripete finché riesce. Commit `609c12d`.
- Le centrali già installate (banco, PC di prova precedenti) non cambiano: il primo avvio non si ripete. L'opzione si attiva a mano con la stessa API.
- **Prova:** immagine `ova` ricompilata, disco servito in locale a un `.exe` di prova (`18.4-2-test`). Schermata con IP `192.168.1.63` e health `0.9.76` entro 10 minuti. Dalla console seriale (porta aggiunta alla sola VM di prova): `{"version":"0.9.76.1","update_available":false,"auto_update":true,"state":"started"}`, registro «aggiornamenti automatici: fatto». La VM ignorava il pulsante ACPI: spenta con `poweroff` dopo aver fermato la sua attività. VM disinstallata.
- **Non verificato:** un vero aggiornamento automatico, perché richiede una nuova versione nel catalogo e almeno un giorno di attesa.
- **Release `centrale-vm-18.4-2`** (pre-release, non «latest»): `aca-centrale-vm-18.4-2.vdi.zip` (591.441.407 byte, SHA-256 `30e03ec0…3d18`). `crea-installer.ps1` usa ora questo disco con la versione `18.4-2`. Verifica anonima: «latest» resta `v0.9.34`, `SHA256SUMS` scaricabile, intervallo finale dello zip HTTP 206. Eseguibile `backup/rep20261119-exe/ACA-System-Setup-18.4-2.exe`, 115.545.730 byte, SHA-256 `155905b4…e146`, escluso da Git; sostituisce il 18.4-1.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Release GitHub esistenti | Richiesta anonima a `api.github.com/.../releases/latest` | 404 | Nessuna release pubblicata |
| Visibilità del repository | Richiesta anonima a `api.github.com/repos/acamemo/acasystem` | 200 | Repository leggibile senza credenziali |
| Build HAOS 18.4 ufficiale | `scripts/enter.sh make ova` in WSL2 Ubuntu 26.04, Docker 29.8.2 | Superato | Circa 80 min, uscita 0; log in `~/aca-build/build-ova.log` (WSL) |
| Avvio dell'immagine compilata | VM nuova `ACA-build-test-20261118` in VirtualBox 7.2.22 NEM, con supervisore | Superato | Console «System is ready» in circa 90 s; `backup/rep20261118-build/boot1.png` |
| Risposta HTTP | `Invoke-WebRequest` verso `192.168.1.80` sulle porte 8123, 80 e 4357 | Superato | 200, 200, 200; prova breve, senza Core né Acasystem installati |
| Schermata all'accensione | Avvio a freddo di `ACA-build-test-20261118` con l'app 0.1.3 installata | Superato | `backup/rep20261118-build/coldboot-schermata.png`; rete in 19 s, schermata entro 94 s |
| Lettura del QR | `zbarimg` (Alpine 3.22) sullo screenshot | Superato | `QR-Code:http://192.168.1.80:3002/` |
| Riavvio dall'interno della VM | `ha host reboot` con il supervisore attivo | Fallito | Più di 15 min su «Booting Slot A»; `reboot1.png`, `reboot2.png`; recuperato con spegnimento e avvio a freddo |
| Test unitari del supervisore | `powershell.exe -File central-supervisor.test.ps1` (Windows PowerShell 5.1) | Superato | `PASS 17 controlli`, poi `PASS 18` con la richiesta di risveglio fissata; PowerShell 7 non installato su questo PC, non eseguito |
| Richieste di risveglio senza rumore | Prove idle 300/1800 s, VM di prova | Fallito | Solo `clocks` regge con il supervisore; `cpumguest` supera le prove isolate ma fallisce dopo il riavvio gestito; `backup/rep20261118-build/rumore/` |
| Supervisore con `clocks` dopo il riavvio gestito | `ha host reboot`, poi idle 300 s, poi `ha host shutdown` | Superato | VirtualSync 300,100 / 300,099 s, 0 avvisi; HA in 41 s; VM rimasta spenta. Una sola finestra |
| Riavvio del guest con il supervisore aggiornato | Due `ha host reboot` sulla VM di prova | Superato | Reset riconosciuto in circa 20 s, VM riaccesa in 4 s, HA raggiungibile in circa 1 min; `reboot-supervisore.png`, log in `supervisore-reset/`. Non provato con un vero aggiornamento di HAOS né sul PC del capo |
| Spegnimento voluto | `ha host shutdown` con il supervisore aggiornato | Superato | VM rimasta spenta |
| Grafica della schermata 0.2.0 nel kiosk | `ha apps update local_aca_schermata` sulla VM di prova, screenshot e `zbarimg` | Superato | `grafica-vm-1024.png`; QR corretto; solo 1024×768 in VM, 1920×1080 e senza rete solo nel browser; grafica approvata dall'utente |
| Immagine Acasystem 0.9.76.1 pubblica | `docker push`, poi manifest anonimo da `ghcr.io` | Superato | 200, digest `64b0c1a4…f870` uguale a REP005 |
| Catalogo 0.9.76.1 | `git push` su `acamemo/acasystem-releases` | Superato al secondo tentativo | Primo push 403; dopo il permesso Write `c97c67f` su main, `config.yaml` pubblico 0.9.76.1 |
| Release v0.9.76.1 con sorgenti | API GitHub, poi download anonimo e `sha256sum -c` | Superato | 6 allegati, pre-release |
| Pacchetto con 0.9.76.1 da zero | `Disinstalla`, `Installa`, `Mostra-Schermata` | Superato | health `0.9.76`, schermata in 303 s; nessuna prova di account o dispositivi |
| Pacchetto di prova: installazione e primo avvio | ZIP estratto, `Installa-Centrale.ps1`, VM nuova | Superato | Schermata entro 5 min, QR `http://192.168.1.12:3002/`, health ok 0.9.34; cartella fuori da `AppData` per il limite dell'agente |
| Repository pubblico delle release | Richiesta anonima a `api.github.com/repos/acamemo/acasystem-releases` | Superato | Pubblico; release `v0.9.34`, `v0.9.33`, `v0.9.30` |
| Build `generic_x86_64` | `build.sh … generic_x86_64` in WSL2 | Superato alla quarta build | Prima e seconda: sistema oltre 256 MiB (anche senza file ACA); terza con deduplicazione EROFS; quarta con `simpledrm` |
| Chiavetta: disco vuoto, immagine fittizia | VM EFI con disco da 32 GB | Superato | Partenza dopo 15 s, verifica, riavvio alla rimozione |
| Chiavetta: disco vuoto, immagine vera | VM EFI con disco da 64 GB | Superato | Scritta e verificata in meno di 3 min; HAOS 18.4 dal disco interno; Acasystem health ok |
| Chiavetta: disco con centrale, conferma SI | Stessa VM, chiavetta nuova | Superato | Richiesta SI, scrittura e verifica; `schermata-generic.png` |
| Schermata sull'immagine generic | Screenshot e `zbarimg` | Superato dopo la correzione | Prima «Found 0 GPUs»; con `simpledrm` QR `http://192.168.1.16:3002/`. Solo VirtualBox, non hardware reale |
| Aggiornamento 0.9.34 → 0.9.76.1 | Clone del catalogo nella VM riportato a `ff77efe`, poi `ha apps update` | Superato | Health `0.9.34` → `0.9.76`, nessun errore nei log; database senza dati reali |
| Immagine `ova` con la schermata nella partizione dati | VM nuova con supervisore, screenshot e `GET /api/health` | Superato | Schermata con IP `192.168.1.18`, health `0.9.76`; `schermata-ova.png` |
| Release `centrale-vm-18.4-1` | API GitHub, pre-release non «latest» | Superato | 3 allegati; «latest» resta `v0.9.34` |
| `.exe` con Smart App Control attivo | Doppio clic sull'eseguibile non firmato | Bloccato | Nessuna possibilità di avviarlo; Smart App Control disattivato dall'utente, non aggirato |
| Download da GitHub con l'`.exe` | Installazione silenziosa, Wi-Fi a circa 90 KB/s | Fallito | Connessione caduta al 51% dopo 55 min (curl 18); corretto con 20 tentativi che riprendono il download |
| Ripresa del download da GitHub | `curl -C -` su una copia troncata a 591.000.000 byte | Superato | Impronta `631dd1ec…` corretta |
| `.exe`: installazione e primo avvio | Eseguibile di prova con il disco da `127.0.0.1`, `/S` | Superato | Uscita 0 in 32 s; schermata con IP `192.168.1.20`, health `0.9.76` dopo circa 67 min (connessione lenta) |
| `.exe`: Mostra la schermata | Voce del menu Start | Superato | Immagine aperta nel visualizzatore |
| Aggiornamenti automatici attivati al primo avvio | `.exe` di prova con il nuovo disco, `ha apps info` dalla console seriale | Superato | `auto_update: true`, Acasystem 0.9.76.1 avviato; un aggiornamento automatico reale non è stato osservato |
| `.exe`: disinstallazione | `Disinstalla.exe /S` | Superato dopo la correzione | Prima restava la cartella vuota (occupata da VBoxSVC); dopo la correzione tutto rimosso in 9 s, ma con VBoxSVC già attivo |

## Chiusura e punto di ripresa

Aggiornamento del 2026-11-20: le nuove centrali attivano gli aggiornamenti automatici di Acasystem; disco `centrale-vm-18.4-2` pubblicato e `.exe` 18.4-2 da dare all'utente. Da osservare: il primo aggiornamento automatico reale, dopo la prossima pubblicazione nel catalogo.

Aggiornamento del 2026-11-19, pomeriggio: installatore `.exe` provato su questo PC dall'installazione alla disinstallazione, con il disco servito in locale; ripresa del download da GitHub verificata. Prossimo passo: prova dell'utente su un altro PC di casa con `backup/rep20261119-exe/ACA-System-Setup-18.4-1.exe` e `LEGGIMI.txt`. Restano: firma del codice (SmartScreen e Smart App Control), mini PC fisico, aggiornamenti OTA di HAOS.

Aggiornamento del 2026-11-19, notte: immagine `.img` per il mini PC e chiavetta d'installazione provate in VM dall'inizio alla fine, schermata compresa; aggiornamento 0.9.34 → 0.9.76.1 superato. Restano: prova su un mini PC fisico, `.exe` per PC (il pacchetto di prova resta la soluzione provvisoria), permessi e dimensione della schermata, effetto degli aggiornamenti OTA di HAOS sulle modifiche al kernel.

Aggiornamento del 2026-11-18, primo pomeriggio: la prova tecnica della schermata è superata in VM; la grafica è da approvare. I passi 1–3 qui sotto restano validi; il passo 1 è stato provato come prototipo. Va aggiunta la soluzione per il riavvio dall'interno della VM in modalità NEM.

Aggiornamento del 2026-11-18, pomeriggio: il supervisore trasforma il reset del guest in spegnimento e avvio a freddo; due riavvii e uno spegnimento voluto superati sulla VM di prova (ISSUE-167 mitigata, non chiusa). Restano il rumore in `VBox.log`, i permessi, la dimensione e la grafica della schermata, poi i passi 2–3.

Aggiornamento del 2026-11-18, tardo pomeriggio: il rumore in `VBox.log` resta, perché nessuna richiesta senza rumore regge con il supervisore. VirtualBox lo silenzia da solo dopo circa 30 minuti (circa 5 MB per sessione), silenziando però anche i veri avvisi TM. Il supervisore resta su `clocks`, riprovato dopo il riavvio gestito. Restano permessi, dimensione e grafica della schermata, poi i passi 2–3.

La build HAOS funziona su questo PC. Prossimi passi proposti:

1. Schermata di avvio come app grafica a schermo intero, con la pagina `connection-screen` in stile reference.
2. Immagine ACA: sorgenti ufficiali più immagini Acasystem e schermata caricate nella partizione dati, più il servizio di primo avvio. Formati `.img` per la chiavetta e `.vdi` per la VM.
3. Prova in VM, poi `.exe` e chiavetta.

Decisioni ancora aperte:
- R1: pubblicare su `acamemo/acasystem-releases` la versione da includere;
- R2: visibilità di `acamemo/acasystem`.

La VM di prova è spenta; i suoi file sono in `backup/rep20261118-build/`, escluso da Git.
