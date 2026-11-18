# Installer .exe per PC, chiavetta per mini PC e schermata di avvio

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261118-001 |
| Stato | In attesa di input: pubblicazione della release su GitHub |
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
| Repository pubblico delle release | Richiesta anonima a `api.github.com/repos/acamemo/acasystem-releases` | Superato | Pubblico; release `v0.9.34`, `v0.9.33`, `v0.9.30` |

## Chiusura e punto di ripresa

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
