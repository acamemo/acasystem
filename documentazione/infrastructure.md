# Infrastruttura e operazioni

Aggiornato: 2026-10-23 (banco **0.9.27** su 192.168.1.7:3002, vedi la voce «banco 0.9.27» sotto; precedente: banco **0.9.26** su 192.168.1.27:3002, vedi la voce «banco 0.9.26» sotto; precedenti: Pressione lunga e trascinamento: banco **0.9.24** su 192.168.1.27:3002, vedi la voce «REP-20261021-003 — banco 0.9.24» sotto; Ripristino D-2/D-8 e widget: banco **0.9.23** su 192.168.1.27:3002, vedi la voce «REP-20261021-003 — Ripristino, banco 0.9.23» sotto; Interazioni G3-G5 e C1-C3: banco **0.9.22** su 192.168.1.7:3002, vedi la voce «REP-20261021-003 — G3-G5 e C1-C3, banco 0.9.22» sotto; Casa 3D R1: banco **0.9.21** su 192.168.1.7:3002, vedi la voce «REP-20261021-002 — Casa 3D, R1, banco 0.9.21» sotto; Interazioni G1-G2: banco **0.9.20** su 192.168.1.7:3002, vedi la voce «REP-20261021-003 — G1-G2, banco 0.9.20» sotto; Casa 3D T6: banco **0.9.19** su 192.168.1.7:3002, vedi la voce «REP-20261020-002 — Casa 3D, T6, banco 0.9.19» sotto; la voce «T6, persistenza» descrive le novità di infrastruttura; banco **0.9.18** su 172.20.10.6:3002, vedi la voce «REP-20261020-002 — Casa 3D, T5, banco 0.9.18» sotto; la 0.9.17 su 192.168.1.27:3002 è nella voce «REP-20261020-002 — Casa 3D, T3, banco 0.9.17»; la 0.9.16 è nella voce «REP-20261020-001 — banco 0.9.16»; la 0.9.15 è nella voce successiva; il resto è storico: banco 0.9.14 su 192.168.1.27:3002, vedi la voce «REP-20261019-003 — banco 0.9.14» sotto; la 0.9.13 è nella voce successiva e anche gli indirizzi 192.168.1.7 delle voci 0.9.11-0.9.13 sono storici; la 0.9.12 è nella voce successiva; il resto di questa riga è storico, 2026-10-15). Banco locale **Acasystem 0.9.10**, healthy su `http://192.168.1.19:3002`, con backup/ripristino verificati e venti tipi collaudati in isolamento. Fonte corrente: [REP-20261015-003](reports/REP-20261015-003-widget-operativi.md). M11/ISSUE-062 e prove manuali restano aperti; HA non aggiornato. Le voci successive conservano lo storico datato.

## Banco 0.9.30 spostato su 192.168.1.19, 2026-10-26 (pomeriggio)

Richiesta dell'utente: «Chiudi l'inoltro, rimetti l'app del tablet sul banco e sistema il banco sul nuovo IP del PC (192.168.1.19) in compose.tunet.yaml.»
- **Causa:** il Wi-Fi del PC è passato a `192.168.1.19` («MeMo Repeater 5 Ghz»), quindi il binding su 192.168.1.7 non era più raggiungibile dalla rete.
- **Copia prima:** `backup/banco/compose.tunet-pre-ip19-20261026.yaml`.
- **Modifica:** in `progetto/compose.tunet.yaml` da `192.168.1.7:3002:3002` a `192.168.1.19:3002:3002`, con il commento datato.
- **Comando:** `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d`, senza build. Stessa immagine `aca-system:0.9.30` (`.env` invariato), volume invariato; non ho fatto una copia a freddo, perché versione e dati non sono cambiati.
- **Esiti:** container ricreato e healthy; `/api/health` 0.9.30 su `127.0.0.1:3002` e su `192.168.1.19:3002`; dal Tab M11 (192.168.1.20) `nc -z 192.168.1.19 3002` aperta; app client sul tablet ricollegata a `192.168.1.19` (porta predefinita).
- **D1 (3003):** non toccato.
- **Ritorno indietro:** rimettere la copia e rieseguire lo stesso comando.

## Acasystem come app di HA OS sulla VM, 2026-10-26 (S3)

Dettagli in [REP-20261026-005](reports/REP-20261026-005-configurazione-automatica-mini-pc.md).
- **VM `acasystem-ha`:**
  - snapshot «prima-app-acasystem»;
  - repository `https://github.com/acamemo/acasystem-releases` aggiunto;
  - app `9960cdb4_acasystem` 0.9.30 installata e avviata (porta 3002, dati in `/data/app`, HA su `http://homeassistant:80`).
- **Incidente:** durante l'installazione la VM si è riavviata da sola, con poca RAM libera sul PC.
- **Raggiungibilità:**
  - dal PC `http://192.168.56.10:3002`;
  - l'IP a ponte `192.168.1.183` non risponde né dal PC né dal Tab M11 (dal tablet anche il Dell non risponde);
  - la prova dal tablet è stata fatta via `adb reverse` più un inoltro temporaneo sul PC, ora chiusi.
- **Per togliere l'app:** dalla console `ha apps uninstall 9960cdb4_acasystem` e `ha store delete 9960cdb4`, oppure snapshot «prima-app-acasystem».

## Messaggi dei commit riscritti senza menzioni di Claude, 2026-10-26

Richiesta dell'utente: «Riscrivi i messaggi dei 4 commit su GitHub senza Co-Authored-By, unisci i miei 3 commit dal sito e fai il push forzato su main con un backup prima.» Regola dal 2026-10-26: nei messaggi dei commit nessuna riga «Co-Authored-By» e nessuna menzione di Claude.

- **Backup prima della riscrittura** (solo locale, non su GitHub):
  - rami `backup/origin-main-prima-riscrittura-20261026` (`0d3fe27`) e `backup/master-prima-riscrittura-20261026` (`67b1282`);
  - `backup/git/acasystem-prima-riscrittura-20261026.bundle` (escluso da Git, verificato con `git bundle verify`).
- **Procedura** in una copia separata del repository, senza toccare la copia di lavoro con le modifiche degli altri flussi:
  1. i due commit locali messi dopo i 3 commit fatti dall'utente sul sito (il loro effetto netto è nullo: stesso albero di `4e198c5`);
  2. `git filter-branch --msg-filter` da `13e5537` in poi, che toglie solo la riga «Co-Authored-By: Claude …».
- **Controlli:** per ogni commit stesso albero (stessi file), stesso autore e stessa data; nei messaggi cambia solo quella riga; il primo commit riscritto ha lo stesso padre `e192121`.
- **Invio:** `git push --force-with-lease=main:0d3fe27… origin <riscritta>:main`, esito `0d3fe27...c87139d (forced update)`. Su `origin/main` nessun messaggio contiene «Claude» o «Anthropic». Il `master` locale è stato spostato su `c87139d` con `git reset --soft`, ad albero identico; le modifiche non salvate degli altri flussi sono intatte.
- **Corrispondenza dei codici.** I documenti scritti prima di oggi citano i codici vecchi, che restano leggibili solo nei rami e nel bundle di backup:

| Vecchio | Nuovo | Commit |
|---|---|---|
| `13e5537` | `4465e96` | feat: rebuild the Tunet frontend as the Acasystem Metallo OS |
| `64010e9` | `953b059` | fix: finalize the Home Assistant proxy behind Acasystem |
| `7298d4d` | `cad8092` | feat: composable Metallo kit, derived colours and Kit 2 soft UI |
| `4e198c5` | `bba3639` | feat: launcher interactions, motion choreography and device plans (0.9.22-0.9.28) |
| `5f9e7dc` | `77cd74a` | Add files via upload (dal sito) |
| `37fb8bb` | `620b855` | Delete acasystem directory (dal sito) |
| `0d3fe27` | `5953f36` | Delete repository.yaml (dal sito) |
| `d543f16` (poi `864eaf8`) | `9090412` | feat: Acasystem client app for Windows and Android, HA OS app package |
| `67b1282` | `c87139d` | feat: automatic mini PC setup from the client app, HA OS app 0.9.30.1 |

- **Effetto per altre copie del repository:** chi aveva scaricato la storia vecchia deve riallinearsi (per esempio `git fetch` e poi `git reset --hard origin/main` su una copia senza lavori propri), non fare `git pull`.

## Segreto del servizio di D1 e copie a freddo, 2026-10-23 (solo procedura)

Nessun cambio al banco, al compose o ai volumi. Riguarda il codice del server di D1 ancora nella copia di lavoro (`backup/d1/patch/`, [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md), «Annotazione del 2026-10-23: correzioni dopo la revisione del codice del server di D1»), [ADR-0022](decisions/ADR-0022-identita-di-servizio-dispositivi.md) punto 3 e C-16 di [compliance.md](compliance.md). **Non realizzato e non provato su un volume vero.**

- **Che cosa è il segreto.** Il token a lunga durata (10 anni) dell'utente di HA «Acasystem (servizio)», che è amministratore di HA. Sta in un solo file `0600`, il cui percorso è `TUNET_SERVICE_SECRET_FILE`.
- **Dove deve stare.** In un volume separato da `tunet-data` (per esempio montato su `/run/acasystem-secrets`), mai nelle copie a freddo e mai in Git. Il montaggio e la variabile sono una modifica del compose da autorizzare: non è stata fatta.
- **Che cosa fa il codice.** Il predefinito resta `<DATA_DIR>/secrets/service-identity.json`, ma `activate` **rifiuta di salvare** il file dentro la cartella dei dati salvo `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1`, che è una scelta esplicita per il solo banco; `status` avvisa se il file è nel volume dei dati.
- **Copie a freddo.** Quelle fatte prima di `activate` non contengono il token. Dopo `activate`, con il file nel volume dei dati (solo banco, con la variabile sopra), una copia a freddo di `tunet-data` contiene il token: o si esclude la cartella `secrets/` dall'archivio (per esempio con l'opzione `--exclude` di `tar`) oppure si tratta la copia come un segreto, fuori da `backup/` condivisi e da Git. Con il volume separato non serve nulla di più.
- **Ripristino.** Ripristinare `tunet-data` non ripristina il token. Se il file si perde: `forget` e poi `activate`, oppure `activate --rotate` (il nuovo token è salvato prima di cancellare i vecchi). Per spegnere il servizio basta sospendere l'utente in HA (Persone > Utenti).
- **Da decidere** (chi ha l'autorità sul compose): il volume separato prima di D1s, oppure il banco con `TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1` e senza copie a freddo di `tunet-data` dopo l'attivazione.

## Aggiornamento — banco 0.9.27, 2026-10-23

Banco `aca-system:0.9.27` su **192.168.1.7:3002** (tappa Z di [REP-20261022-002](reports/REP-20261022-002-piano-blocchi-thread.md), richiesta dell'utente «procedi con la 0.9.27…» con l'informativa sull'AI di [REP-20261023-005](reports/REP-20261023-005-informativa-sviluppo-ai.md)). **Rete:** l'IPv4 Wi-Fi del PC era 192.168.1.7 e non più 192.168.1.27: aggiornati binding e commento di `progetto/compose.tunet.yaml`; `/api/health` e `/ha/auth/providers` rispondono su `127.0.0.1` e `192.168.1.7`. Contiene le tappe R1-R3, R5a, R7, R8, R10 di ISSUE-109 (R2b spenta), le correzioni dell'interazione di modifica, la memoria dei widget per dispositivo (ADR-0019) e l'informativa sull'AI in Sistema.

- Misura finale prima del banco: build 0.9.26 estratta dal container contro `dist-finale`, 5 giri alternati sul Tab M11 (fixture); risultati in REP-20261022-002, annotazione «Tappa Z». **Esito misto:** blocchi molto ridotti quasi ovunque ma O1 (100 ms) e O4 non raggiunti, e lo scorrimento durante il gesto (O5) è **peggiore** della base (fps del primo lancio 35 contro 60, blocchi di 55-80 ms contro 0, pallino accanto 108 ms contro 0). Decisione all'utente.
- Copia a freddo PRIMA (container `tunet` fermato, uscito con 137): `backup/banco/tunet-data-issue109-pre-0.9.27-freddo.tgz`, **465134 byte**, SHA-256 `f78a7c98af434654fb513170f907915f109e7924e9f5a5e41887758eaddb26b0`, `tar -tzf` leggibile (`tunet.db`, `-wal`, `-shm`). Copie di `.env`, compose ed e2e in `backup/issue-109/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.27` in `progetto/.env` (file locale, ignorato da Git), `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`: immagine `sha256:7d5703f8611b3e0fbc5a5326a67e8a8c69bcbf6e8724847cf5b6bf6d7616f69b`, container `healthy`, `/api/health` `{"status":"ok","version":"0.9.27"}`; bundle `index-CnNjysVo.js` e `index-CEvWC0TJ.css` (uguali a `backup/issue-109/dist-finale`). `homeassistant` non toccato; `release.check.mjs` non eseguito.
- Tablet Tab M11: `adb reverse tcp:3002 tcp:3002` (resta) e `adb forward tcp:9225` (tolto a fine prova); service worker e cache tolti e pagina ricaricata (una sola scheda di `http://localhost:3002`); chiavi del launcher di prima in `backup/issue-109/Z/ls-3002-prima-0.9.27.json`, dopo la migrazione in `ls-3002-dopo-migrazione-0.9.27.json` (la migrazione ha solo creato `tunet_widget_memory`, la lista dei nascosti era già vuota). Controllo funzionale con gesti sintetici (vista pagine, widget, «Collega», «+», salto diretto in modifica, Sistema e informativa sull'AI con pulsante in alto a destra, aggiunta in pagina piena): tutto passato; schermate in `backup/issue-109/Z/`. Le prove sono state annullate ripristinando solo le tre chiavi cambiate (`tunet_launcher_layout`, `tunet_pages_config`, `tunet_card_settings`) ai valori dopo la migrazione. **Non osservabile:** il «widget nascosto» di Multimedia: la pagina è identica a prima (una pila senza contenuto visibile occupa due caselle senza il «+»).
- **Limiti:** gesti sintetici, non il dito; la sincronizzazione automatica delle impostazioni può avere inviato lo stato di prova al server (non verificato); suite, lint e dimensione dei pacchetti non rieseguiti da questa tappa.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.26` in `progetto/.env`, poi `up -d --build`; **sul tablet vanno rimesse anche le chiavi di `ls-3002-prima-0.9.27.json`** (la 0.9.26 non legge `tunet_widget_memory`); dati dalla copia PRIMA solo se necessario (contenitore fermo).

## Aggiornamento REP-20261023-003 — VM `acasystem-ha` preparata e non avviata, 2026-10-23

Richiesta: risposte dell'utente del 2026-10-23 (D-I1 «Sì, entrambi», D-I2 «4 GB (proposta)», D-I3 «Scheda interna fissa», D-I5 «Resta 2026.9.4», D-I8 «Sì, solo Acasystem»), registrate in [REP-20261023-003](reports/REP-20261023-003-piano-aggiungi-dispositivi.md). Eseguito da Claude Code (Sonnet 5.5). **Il banco Docker non è stato toccato**: container `homeassistant` (HA 2026.9.4) e `aca-tunet-tunet-1` (0.9.26) invariati; `TUNET_INTERNAL_HA_URL` invariato; nessuna modifica a Docker, rete di Windows o tablet. La VM **non è stata avviata** e non ha avvio automatico.

- **File.** `backup/dispositivi/haos/haos_ova-18.3.vdi.zip` (559 213 211 byte, SHA-256 `c626ffe0db7dd717270b41240ee3cbb5ada78a364239795f04435d6116c236d3`, uguale al digest pubblicato da GitHub per la release 18.3 di `home-assistant/operating-system`) e `haos_ova-18.3.vdi` estratto (989 987 328 byte, SHA-256 `62580d1c0d6384c9077d3b39df61b0adec29cb7a69df44430471a34634d7bb2b`). La cartella `backup/` è esclusa da Git. File di configurazione della VM: `C:\Users\matti\VirtualBox VMs\acasystem-ha\acasystem-ha.vbox` (fuori dal repository), UUID `319ed592-e35e-451d-a551-c8adbe03ec40`.
- **Comandi** (VirtualBox 7.2.4r170995, `C:\Program Files\Oracle\VirtualBox\VBoxManage.exe`):
  1. `VBoxManage createvm --name acasystem-ha --ostype Oracle_64 --register`
  2. `VBoxManage modifyvm acasystem-ha --firmware=efi64 --cpus=2 --memory=4096 --autostart-enabled=off --nic1=bridged --bridge-adapter1="Realtek RTL8852BE WiFi 6 802.11ax PCIe Adapter" --cable-connected1=off --nic2=hostonly --host-only-adapter2="VirtualBox Host-Only Ethernet Adapter" --cable-connected2=on`
  3. `VBoxManage storagectl acasystem-ha --name SATA --add sata --controller IntelAhci --portcount 1 --bootable on`
  4. `VBoxManage storageattach acasystem-ha --storagectl SATA --port 0 --device 0 --type hdd --medium "<radice>\backup\dispositivi\haos\haos_ova-18.3.vdi"`
  5. `VBoxManage modifyvm acasystem-ha --boot1=disk --boot2=none --boot3=none --boot4=none`
- **Configurazione risultante** (`showvminfo --machinereadable`): Oracle Linux 64 bit, EFI64, 2 vCPU, 4096 MB, disco `.vdi` sul controller SATA, scheda 1 a ponte sul Wi-Fi del PC (Realtek RTL8852BE, oggi `192.168.1.7/24`) **con cavo scollegato**, scheda 2 Host-Only (adattatore esistente «VirtualBox Host-Only Ethernet Adapter», `192.168.56.1/24`), schede di tipo 82540EM (predefinito), avvio automatico disattivato, `list runningvms` vuoto.
- **Indirizzo Host-Only della VM: da fissare in seguito** (D-I3). Annotato: sull'adattatore esiste un server DHCP di VirtualBox abilitato (`192.168.56.100`, intervallo `192.168.56.101`-`192.168.56.254`); l'indirizzo fisso dovrà stare **fuori da quell'intervallo** (per esempio `192.168.56.10`, solo proposta), impostato da HA OS nella tappa di migrazione.
- **Per la tappa di migrazione, differenza dal piano.** Il piano (6.1, I2) prevedeva NAT più Host-Only, così da avere Internet per il ripristino prima di esporre la pagina di benvenuto alla LAN. La preparazione richiesta ha invece ponte (cavo scollegato) più Host-Only: senza ponte né NAT la VM non ha Internet, e il ripristino del backup scarica il core. Al momento della migrazione si dovrà quindi scegliere tra collegare il ponte (con la pagina di benvenuto raggiungibile dalla LAN finché il backup non è caricato) e aggiungere una scheda NAT temporanea. Decisione non presa qui.
- **Non fatto, per il passo di migrazione dopo il banco 0.9.27:** avvio della VM; ripristino del backup di HA (con l'utente, con la sua chiave); collegamento del cavo virtuale del ponte; limitazione della 8123 al solo Acasystem (D-I8, per esempio `http: server_host` sull'indirizzo Host-Only); cambio di `TUNET_INTERNAL_HA_URL`; arresto del container `homeassistant` di Docker.
- **Ritorno indietro.** `VBoxManage unregistervm acasystem-ha --delete` toglie la VM dal registro e **cancella i suoi file, compreso il disco `.vdi` collegato** (`haos_ova-18.3.vdi`); resta lo zip scaricato, da cui si può estrarre di nuovo. Per tenere il `.vdi` e togliere solo la VM: prima `VBoxManage storageattach acasystem-ha --storagectl SATA --port 0 --device 0 --medium none`, poi `unregistervm` senza `--delete`. Nessun altro componente è stato modificato da questa preparazione, quindi non c'è altro da ripristinare.
- **Prova di rete P0** (11:13, 2026-10-23): dal container `homeassistant` un datagramma Wake on LAN con MAC fittizio verso `192.168.1.255:9` e `255.255.255.255:9`; ascoltatore sul PC perché la shell adb del tablet non può aprire la porta 9. Esito e limiti in `verification.md`: arrivo confermato solo al PC (uno dei due invii, sorgente riscritta a `192.168.1.7`), arrivo su altro apparecchio della LAN **non determinato**. Il dubbio sul bridge di Docker Desktop (sezione 5.2 del piano) resta aperto.

## Aggiornamento — banco 0.9.26, 2026-10-22

Banco `aca-system:0.9.26` su **192.168.1.27:3002** (IPv4 Wi-Fi del PC verificato prima del rilascio: coincide con il binding di `progetto/compose.tunet.yaml`, nessuna modifica). Contiene la correzione di ISSUE-108 in `useLongPress.ts` (guardia del click attiva finché il dito è giù, scade 600 ms dopo il rilascio); nessun'altra modifica del comportamento.

- Prima del rilascio: suite completa 183 file e 2626 test, tipi, lint, tipografia, colori, i18n, build e dimensioni dei pacchetti verdi (risultati in `verification.md`).
- Copia a freddo PRIMA (container `tunet` fermato): `backup/banco/tunet-data-rilascio-pre-0.9.26-freddo.tgz`, **464901 byte**, SHA-256 `d73a5ce5b5a62d5165d2f107029e36e7114886a0a19ca76fa654269aacd9d89c`, `tar -tzf` leggibile (`tunet.db`, `-wal`, `-shm`). Copie di `.env`, compose ed e2e in `backup/rilascio-0.9.26/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.26` in `progetto/.env` (file locale, ignorato da Git), `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --build`: container `healthy`, `/api/health` `{"status":"ok","version":"0.9.26"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tablet Tab M11: `adb reverse tcp:3002 tcp:3002` e `adb forward tcp:9225 localabstract:chrome_devtools_remote` attivi (il forward resta attivo per la misura successiva); service worker e cache tolti e pagina ricaricata (una sola scheda di `http://localhost:3002`); chiavi del launcher salvate in `backup/rilascio-0.9.26/prova/ls-backup.json` (senza token) e disposizione verificata identica a fine prova (firma `tunet_launcher_layout:bfa4242d`).
- Prove (gesti sintetici `Input.dispatchTouchEvent`, attese reali, schermo acceso, `document.visibilityState` sempre `visible`, nessun tocco estraneo): pressione sul vuoto a 45 px dal bordo sinistro, al centro e a 45 px dal bordo destro, tenuta 0,7, 1,5, 2,5 e 4 s, rilascio nello stesso punto, 3 ripetizioni = **36/36**: la vista pagine resta aperta, la pagina corrente (Principale) non cambia, «Fine» (tocco normale 1,5 s dopo il rilascio) chiude. Widget (light, Luci e comandi): pressione lunga di 0,9 s e trascinamento di 4 celle nello stesso tocco (6,2-6,8 s), 3/3 spostato, «Annulla» lo riporta in posizione, firma della disposizione invariata. Script e risultati in `backup/rilascio-0.9.26/prova/` (`tablet-hold.cjs`, `tablet-holds.json`, `tablet-widget.json`). Nota: un primo giro del widget con il selettore sbagliato di «Annulla» ha lasciato la disposizione spostata; ripristinata dalle chiavi salvate e ripetuto con esito 3/3.
- **Limite:** gesti sintetici, non il dito vero; da confermare col dito sul Tab M11. Pagina riportata a Principale.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.25` in `progetto/.env`, poi `up -d --build`; dati dalla copia PRIMA solo se necessario (contenitore fermo).

## Aggiornamento — banco 0.9.25, 2026-10-22

Richiesta umana: correzione del rilascio dopo la pressione lunga sullo spazio vuoto vicino al bordo («correggilo»), poi prove sulle animazioni. Rettifica la voce successiva: il banco ora è la 0.9.25.

- Il Wi-Fi del PC era `192.168.1.27`, già nel binding di `progetto/compose.tunet.yaml`: nessuna modifica al binding.
- Copia a freddo PRIMA (container `tunet` fermato) `backup/banco/tunet-data-rilascio-pre-0.9.25-freddo.tgz` (431905 byte, SHA-256 `e8a64c38406538bea721dae3fc8ebb2f76276037cc05511f7082a7a2c2aea1e9`, `tar -tzf` 4 voci). Copie di `.env`, compose ed e2e in `backup/animazioni-0.9.25/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.25` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose ... up -d --build`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.25` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tab M11 (adb, `adb reverse tcp:3002`, forward 9225 lasciato attivo per il collaudo successivo): una scheda, service worker e cache rimossi, ricarica; schermo visibile. Pressione lunga di 700 ms sullo spazio vuoto a circa 60 px dal bordo destro e dal sinistro (e al centro), rilascio nello stesso punto: la vista pagine resta aperta, la pagina corrente non cambia e nessuna pagina si apre in modifica; «Fine» la chiude. Pressione lunga sul widget con trascinamento nello stesso tocco ancora funzionante; «Annulla» ripristina la disposizione. Chiavi di `localStorage` (senza token) identiche a prima. Script in `backup/animazioni-0.9.25/tablet/`.
- Ripristino: `ACASYSTEM_VERSION=0.9.24` in `progetto/.env` più la copia PRIMA.

## Aggiornamento REP-20261021-003 — banco 0.9.24, 2026-10-21

Richiesta umana: «Evidenzia e trascina» (pressione lunga e trascinamento nello stesso tocco), vedi l'annotazione in [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md). Rettifica la voce successiva: il banco ora è la 0.9.24.

- Il Wi-Fi del PC era `192.168.1.27`, già nel binding di `progetto/compose.tunet.yaml`: nessuna modifica al binding.
- Copia a freddo PRIMA (container `tunet` fermato) `backup/banco/tunet-data-trascina-pre-0.9.24-freddo.tgz` (430096 byte, SHA-256 `2daa7d0042034cfb39245fd64337af3c60e454671d281328813d9d45267887fa`, `tar -tzf` 4 voci). Copie di `.env`, compose ed e2e in `backup/trascina-0.9.24/pre/banco/`.
- `ACASYSTEM_VERSION=0.9.24` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`; `docker compose ... up -d --build`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.24` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Tab M11 (adb, `adb reverse tcp:3002`, forward 9225 poi rimosso): una scheda, service worker e cache rimossi, ricarica; prove in [REP-20261021-003](reports/REP-20261021-003-interazioni-schermo-intero.md). Ripristino: `ACASYSTEM_VERSION=0.9.23` in `progetto/.env` più la copia PRIMA. Il binding non è cambiato.

## Aggiornamento REP-20261021-003 — Ripristino, banco 0.9.23, 2026-10-21

Richiesta umana: «sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine, c'è stata una regressione importante», più la seconda richiesta sui widget (ADR-0016, rettifiche del 2026-10-21 sera). Rettifica la voce successiva: il banco ora è la 0.9.23.

- Banco `aca-system:0.9.23` costruito e avviato. Il Wi-Fi del PC era `192.168.1.27` contro il binding `192.168.1.7`: aggiornati porta e commenti in `progetto/compose.tunet.yaml` (copia PRIMA in `backup/ripristino-0.9.23/pre/`). Il binding va riconfermato se l'IP cambia ancora.
- Copia a freddo PRIMA `backup/banco/tunet-data-ripristino-pre-0.9.23-freddo.tgz` (428132 byte, SHA-256 `c612ee17e50cf9062da5c806c870dd3f6d5d1ad19d9dfd58afbc04c5de1c768a`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.23` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `0.9.23` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.27`.
- Ripristino alla 0.9.22: `ACASYSTEM_VERSION=0.9.22`, binding e script `e2e` dalle copie in `backup/ripristino-0.9.23/pre/`, `docker compose ... up -d --build`, dati dalla copia a freddo. Nessuna novità di porte o credenziali; token non letti né usati. Sul Tab M11 `adb reverse` 3002 resta attivo; il forward CDP 9225 è stato rimosso; `localStorage` non sensibile identico a prima.

## Aggiornamento REP-20261021-003 — G3-G5 e C1-C3, banco 0.9.22, 2026-10-21

Richiesta umana: «vai, procedi con G3-G5 e C1-C3». Rettifica la voce successiva: il banco ora è la 0.9.22.

- Banco `aca-system:0.9.22` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA (tunet fermo) `backup/banco/tunet-data-g3c3-pre-0.9.22-freddo.tgz` (414866 byte, SHA-256 `4a238c93cf1007b28884068a2c156c47287cbe746be1627fce00d576ce69a2d4`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.22` in `progetto/.env`, `e2e/isolated-server.mjs` e `e2e/release.check.mjs`.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.22"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- Ripristino: `ACASYSTEM_VERSION=0.9.21` più la copia a freddo PRIMA. Nessuna novità di rete, porte o credenziali. Sul Tab M11 `adb reverse` 3002 resta attivo; il forward CDP 9225 usato per la prova è stato rimosso. Le chiavi di `localStorage` del launcher sono state salvate prima e ripristinate dopo (`backup/g3-c3/tablet/`).

## Aggiornamento REP-20261021-002 — Casa 3D, R1, banco 0.9.21, 2026-10-21

Richiesta umana: «parti» (R1 della Casa 3D). Rettifica la voce successiva: il banco ora è la 0.9.21.

- Banco `aca-system:0.9.21` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA (tunet fermo) `backup/banco/tunet-data-casa3d-R1-pre-0.9.21-freddo.tgz` (413806 byte, SHA-256 `ae0a1cb6c0c4ff7ff5a9e65f18ffb6e7c6854b683935a9da6d259793651c83e5`, `tar -tzf` 4 voci).
- Versione `ACASYSTEM_VERSION=0.9.21` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs` e README degli e2e.
- Container `healthy`; `/api/health` `{"status":"ok","version":"0.9.21"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- Ripristino: `ACASYSTEM_VERSION=0.9.20` più la copia a freddo PRIMA. Nessuna novità di rete, porte o credenziali; la casa d'esempio sul banco è stata cancellata con «Ricomincia» durante la prova sul Tab M11.

## Aggiornamento REP-20261021-003 — G1-G2, banco 0.9.20, 2026-10-21

Richiesta umana: «ok alle proposte, approvo e procedi con G1-G2». Rettifica la voce successiva: il banco ora è la 0.9.20.

- Banco `aca-system:0.9.20` (`docker compose up -d --build` riuscito) su `192.168.1.7:3002`: IPv4 Wi-Fi del PC uguale al binding di `progetto/compose.tunet.yaml`, nessuna modifica.
- Copia a freddo PRIMA `backup/banco/tunet-data-g1g2-pre-0.9.20-freddo.tgz` (413346 byte, SHA-256 `1a3453c57d1793b0f7b80cf2e24b1e8eb18852ea0ef39de60186a831991823a2`, `tar -tzf` 4 voci: `.`, `tunet.db`, `-wal`, `-shm`).
- Versione `ACASYSTEM_VERSION=0.9.20` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs` e README degli e2e.
- Container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.20"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`.
- **Ripristino:** `ACASYSTEM_VERSION=0.9.19` in `progetto/.env`, poi la copia a freddo.
- Tablet: `adb reverse tcp:3002` e forward CDP 9225; nessun comando di sblocco. Nessun comando a impianti reali, nessuna credenziale, nessun commit.

## Aggiornamento REP-20261020-002 — Casa 3D, T6, banco 0.9.19, 2026-10-21

Richiesta umana: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». Rettifica la voce successiva («nessun cambio al banco»): il banco ora è la 0.9.19.

- **Copia a freddo PRIMA** con `tunet` fermo: `backup/banco/tunet-data-casa3d-T6-pre-0.9.19-freddo.tgz` (422 142 byte, SHA-256 `aa2a0a92b3b16f115d0ff55e20e8d21b007b19596ba43b50cd05338dcb776768`; `tunet.db`, `-wal`, `-shm`).
- **Versione:** `ACASYSTEM_VERSION=0.9.19` in `progetto/.env`; allineati `isolated-server.mjs`, `release.check.mjs` e il README dei test e2e. Immagine `aca-system:0.9.19` (`sha256:29941e2c3a16d23913cc01a71ade35c4ad5dba5c64e9aa6776ba18828b75b684`).
- **Rete:** IPv4 Wi-Fi del PC `192.168.1.7` (`Get-NetIPAddress`; prima `172.20.10.6`). Binding LAN in `progetto/compose.tunet.yaml` aggiornato a `192.168.1.7:3002` (commenti compresi). Per il tablet `http://192.168.1.7:3002`.
- **Controlli:** container `aca-tunet-tunet-1` `healthy`; `/api/health` `{"status":"ok","version":"0.9.19"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; `/casa3d/manifest.json` servito; log di avvio senza errori; tabelle `casa3d_building`, `casa3d_image` e `casa3d_history` presenti (`CREATE TABLE IF NOT EXISTS`); `casa3d-prova` assente dai file serviti.
- **Copia a freddo DOPO:** `backup/banco/tunet-data-casa3d-T6-post-0.9.19-freddo.tgz` (414 354 byte, SHA-256 `c368fb3c05932c486bd941096bcd74e43763c022762220a1d146e6c690cff459`), estratta e aperta con `node:sqlite` nell’immagine `aca-system:0.9.19` con `--network none`: piano alla revisione 6, 1 piano e 6 stanze, impronta `9b909c96125f09b6`, 0 immagini, 1 punto di ripristino, `integrity_check` ok. Dopo la copia il container è stato riavviato (`healthy`).
- **Ripristino:** `ACASYSTEM_VERSION=0.9.18`, ricostruzione e copia PRIMA. Le tabelle nuove non disturbano la versione precedente (non provato).
- **Stato lasciato:** il piano d’esempio alla revisione 6 resta nel database (nessuna rotta lo cancella; prima non c’era nessun piano). Il `reverse` ADB `tcp:3002` resta attivo sul Tab M11; il `forward` di prova è rimosso.
- **Non provato sul banco:** il 403 (nessun utente non amministratore) e un secondo dispositivo con altro token. Evidenze in `backup/casa3d/T6/banco/`.

## Aggiornamento REP-20261020-002 — Casa 3D, T6, persistenza, 2026-10-21 (nessun cambio al banco)

Richiesta umana: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». Il banco resta `aca-system:0.9.18` (in salute, T6 non è nell'immagine) e `progetto/.env` non cambia. **Cambia il codice dell'immagine che verrà costruita:** il backend crea tre tabelle nuove in `tunet.db` all'avvio (`casa3d_building`, `casa3d_image`, `casa3d_history`, con `CREATE TABLE IF NOT EXISTS`: un volume esistente si aggiorna da solo) ed espone le rotte `/api/casa3d/*` (piano, immagini, cronologia, esportazione), dietro il token di Home Assistant come le altre rotte `/api`. **Conseguenze per le operazioni:**
- le tabelle sono nello stesso file `tunet.db`: **entrano nelle copie a freddo** del volume (`tunet.db`, `-wal`, `-shm`) senza altri passi; per tornare indietro, ripristinare la copia a freddo (le tabelle nuove non sono toccate dalla versione precedente; non provato);
- le immagini del piano sono BLOB nello stesso file (al più 200 immagini e 128 MiB, 6 MB l'una): il file cresce di conseguenza; il piano segue `TUNET_ENCRYPTION_MODE`, le immagini non sono cifrate;
- nuova variabile facoltativa: `CASA3D_RATE_LIMIT_WINDOW_MS` e `CASA3D_RATE_LIMIT_MAX` (predefinito 120 richieste al minuto per indirizzo) sulle rotte `/api/casa3d`; non serve aggiungerla a `progetto/.env` né a `compose.tunet.yaml`;
- il corpo JSON resta limitato a 2 MB; le immagini hanno un limite proprio di 6 MB sulla sola rotta `PUT /api/casa3d/images/:id`;
- scrive il piano solo chi Home Assistant dichiara amministratore o proprietario (scelta provvisoria, ISSUE-102); dietro l'ingress del Supervisor nessuno scrive.
Prova sul PC (non sul banco): un backend locale con un file SQLite e un Home Assistant finto, tre contesti di un browser, poi copia della cartella dei dati a backend fermo (`backup/casa3d/T6/due-client/`). La fase «banco» di T6 (immagine, copia a freddo del volume e prova dal tablet e dal PC) non è eseguita; dettagli in [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), «T6 — Persistenza», e controlli in `verification.md`.

## Aggiornamento REP-20261020-002 — Casa 3D, T5, banco 0.9.18, 2026-10-21

Richiesta umana: «Organizza e continua il lavoro in autonomia mentre sono fuori casa», dopo l'accettazione di ADR-0014. Fase «banco» di T5 eseguita il 2026-10-21 (stesso incarico). **Rete:** l'IPv4 Wi-Fi del PC è ora 172.20.10.6 (era 192.168.1.27); il binding di `progetto/compose.tunet.yaml` è aggiornato nello stile esistente (copia `backup/casa3d/T5-banco/compose.tunet.yaml.prima`); gli indirizzi 192.168.1.27 delle voci precedenti sono storici. Copia a freddo a contenitore fermo: `backup/banco/tunet-data-casa3d-T5-pre-0.9.18-freddo.tgz`, 429336 byte, SHA-256 `ed240e956b1ed59040df55feed9e2aa42dbb36bd1f476929c2cde23e99f2a342`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.18` in `progetto/.env` e nei file di `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`; copie in `backup/casa3d/T5-banco/pre-e2e/`). Immagine costruita da Compose: `aca-system:0.9.18`, ID `sha256:7b79f34e4820c0e16afa9034aad012e7b414dcd804ec8737b8123ee8403ea2bd`, creata 2026-10-20T22:02Z, `aca-tunet-tunet-1` in salute. `/api/health` con versione 0.9.18 e `/ha/auth/providers` 200 su 127.0.0.1 e 172.20.10.6 (Home Assistant non riavviato); `/casa3d/manifest.json` 0.9.18 (bundle 3D 798719 byte), `/casa3d/` senza indice 404 per scelta; log senza errori. L'immagine è costruita dall'albero di lavoro non committato e porta anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.17` in `progetto/.env`, il binding vecchio dalla copia, più la copia a freddo (o `backup/banco/tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`). Il contenitore è rimasto in esecuzione.

Prova sul tablet: Tab M11 (TB330FU) via USB (`adb reverse tcp:3002` e CDP sulla 9225, entrambi rimossi a fine prova; Chrome 155, 1280×665 a DPR 1,5), service worker e cache tolti, ricarica senza cache. Light 30 gesti su 32; Medium e High selezionabili (blocco massimo 476 ms) ma a circa 24 fps; tre perdite del contesto con ripristino; PSS di Chrome 193, 160-175 e 169 MB; ISSUE-062 senza picchi peggiori. Nessuna richiesta a terzi, nessun comando (adattatore in sola lettura). Non eseguiti: dito reale, telefoni, verticale, PC con GPU, TalkBack. Dettagli e limiti: [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), sezione «T5 — esito del banco»; controlli in `verification.md`.

## Aggiornamento REP-20261020-002 — Casa 3D, T3, banco 0.9.17, 2026-10-20

Richiesta umana: «Organizza e continua il lavoro in autonomia mentre sono fuori casa», dopo l'accettazione di ADR-0014. Fase «banco» eseguita il 2026-10-20 dopo T3 (stesso incarico). Copia a freddo del volume dati a container fermo: `backup/banco/tunet-data-casa3d-T3-pre-0.9.17-freddo.tgz`, 429344 byte, SHA-256 `a9332c3a221765c430c07caa5b83d623dd1397037585b6497bd5e62a30eb4652`, `tar -tzf` con `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. `ACASYSTEM_VERSION=0.9.17` in `progetto/.env` e nei file di `frontend/e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`); `compose.tunet.yaml` invariato (IPv4 Wi-Fi del PC ancora 192.168.1.27). Immagine costruita con `docker compose up -d --build`: `aca-system:0.9.17`, ID `sha256:3f9669fa76547a4dc58a768f1837fdd569f1ccdbb3e6393bcac1cba33f42b962`, creata 2026-10-20T17:09:37Z, in salute dopo circa 24 s. `/api/health` con versione 0.9.17; `/ha/auth/providers` 200 su 127.0.0.1 e su 192.168.1.27 (Home Assistant non riavviato); `/casa3d/` 404 per scelta (nessun indice), `/casa3d/manifest.json` 200 (versione 0.9.17), bundle `3d-727720bdd276.js` 200 (797236 byte); log del contenitore senza errori. L'immagine è costruita dall'albero di lavoro non committato e porta quindi sul banco anche le modifiche non committate di altri incarichi. **Ripristino:** `ACASYSTEM_VERSION=0.9.16` in `progetto/.env` più la copia a freddo (o `backup/banco/tunet-data-20261020-pre-0.9.16-freddo.tgz`). Prova sul tablet: Tab M11 (TB330FU) via USB (`adb reverse tcp:3002`, CDP sulla 9225; Chrome 1280×665 a DPR 1,5), service worker e cache svuotati, ricarica senza cache. Impostazioni > Sistema mostra 0.9.17. `#/casa3d-prova`: vista 3D con sei stanze, qualità Light (`low`), canvas 1224×518; sessione **amministratore** (`is_admin` vero). Registri letti da Home Assistant vero: 3 aree (Soggiorno, Cucina, Camera da letto), 0 piani, 4 dispositivi, 15 entità, 18 stati, lingua `it`; **3 stanze su 6 legate ad aree**, **0 dispositivi (pin) nelle stanze**. Gli stati coincidono con l'app (`weather.forecast_casa` poco nuvoloso 20,2, che l'app mostra come 20 °C; `person.mattia`, `sun.sun`, `zone.home`). `callService` dalla vista rifiutato con `Casa3dReadOnlyError` (`light.toggle`); 0 trame `call_service` sul websocket; 0 richieste a terzi; 0 errori, avvisi o eccezioni di console. Tornati a `#/` sulla home; le chiavi di `localStorage` del launcher (33 righe, token esclusi e non letti) hanno la stessa impronta prima e dopo. Evidenze: `backup/casa3d/T3-banco/` (`prova.cjs`, `prova-risultato.json`, `tablet-casa3d-prova.png`, `ls-prima.json`, `ls-dopo.json`). Limiti e ISSUE aperte: vedi [REP-20261020-002](reports/REP-20261020-002-casa-3d-piano.md), sezione «T3 — esito del banco». Nessun comando a impianti reali (adattatore in sola lettura). La voce «Casa 3D, T2b» qui sotto («nessun cambio al banco», immagine non ancora costruita per il banco) è storica.

## Aggiornamento REP-20261015-003 — 2026-10-15

Il piano umano autorizza release 0.9.10 e collaudo isolato dei venti tipi. Immagine completa finale costruita tramite Compose: `aca-system:0.9.10`, ID `sha256:8bc011a9abf0d1cee52ba6ec4314de0fa9f4e6cfa117e3b57f89e6788fa64fb1`; 90 file del dist locale identici all'immagine. JS `index-DErCxP8Y.js` (SHA-256 `d1084fbe7a7e2eb8023effe25a5026a6442fe55b9575fa8373df047abc06da49`), CSS `index-BxkHuO5G.css` (`5d24032b58b45aa820b0dfbb51d7dbca4131aae7f49425d2d41a219fa03e86b4`), index `3e5f79921dc97d68220dcc99c78a8fd9c00a5a349d1b62f77c2c513a9136a976`. Distribuita tramite Compose alle 23:48, senza copie manuali: health/versione 0.9.10, proxy HA 200, tutti i 90 file serviti conformi all’immagine, interfaccia isolata 0.9.10. Database integro e tutte le tabelle identiche prima/dopo. Provato anche il recupero del container precedente.

Alle 22:21, a container fermo, salvati `backup/banco/rep003-20261015-pre-0.9.10-volume-freddo.tgz` (406112 byte, SHA-256 `51f696f25f25adb171e839aa4ad76552e3ca72b8c4285500975faece42edb013`) e `backup/banco/rep003-20261015-container-ripristino.tar` (223015936 byte, SHA-256 `92ad2b7d3a0ed357eb63e47e9d468185fd5f89c7f9736a7d67279555dbb1fd02`). La snapshot `aca-system:rep003-20261015-ripristino`, ID `sha256:d038885f8e422fbcd1436d7a41b073d6097991e0025478e17927c0a264ea3cd4`, conserva il filesystem con il dist modificato, distinto dal solo tag 0.9.9. Recupero del container verificato mediante override Compose e hash degli asset precedenti; backup volume estratto in tmpfs senza rete, SQLite integro e impronte delle tre tabelle coincidenti. Il volume reale non è stato ripristinato. Procedura e override nel [report 003](reports/REP-20261015-003-widget-operativi.md#procedura-di-ripristino).

Il riavvio ha rilevato che `192.168.1.7` non è più assegnato. Osservato Wi-Fi **192.168.1.19** e aggiornato il binding specifico in Compose, mantenendo localhost. Banco raggiungibile su `http://192.168.1.19:3002`; il cambio di origine richiede di verificare l'accesso del tablet al nuovo URL. Volume e dati correnti conservati; HA 2026.9.4 non aggiornato né riavviato. Nessuna copia manuale nel nuovo container.

Banco isolato **127.0.0.1:3003**, server locale senza proxy/client in uscita e credenziali reali, stesso dist di produzione, CSP same-origin. Script e istruzioni in `frontend/e2e`; fixture solo simulate. Il M11 è stato scollegato dall'utente: caricamento/sessione al nuovo URL, orientamenti, ISSUE-062, TalkBack, testo effettivo 125/150% e standalone ancora non collaudati. Dispositivi fisici esclusi per scelta, nessun comando di prova agli impianti.

## Aggiornamento REP-20261020-002 — Casa 3D, T2b, 2026-10-20 (nessun cambio al banco)

Il banco resta `aca-system:0.9.16` (in salute): nessun aggiornamento, nessuna modifica a `progetto/.env`. Cambia il codice dell'immagine, non ancora costruita per il banco: il `Dockerfile` ha tre workspace (`frontend`, `backend`, `casa3d`); lo stadio di build esegue `npm ci --ignore-scripts` e `npm run build -w casa3d`, lo stadio finale copia `casa3d/dist` in `/app/casa3d/dist`; `.dockerignore` esclude `casa3d/upstream/`. Il backend serve `/casa3d/` (solo in produzione, stessa origine, CSP invariata): file con impronta `immutable`, `manifest.json` `no-store`, 404 esplicito per il resto. Costruita due volte con tag di prova (`0.9.16-t2b-prova`, `0.9.16-t2b-prova2`, rimossi), circa 857 MB. Al prossimo aggiornamento del banco: copia a freddo prima e versione alzata in `progetto/.env`. Percorso `/casa3d/` da confermare (ISSUE-089).

## Aggiornamento REP-20261020-001 — banco 0.9.16, 2026-10-20

Richiesta umana: stato spento in grigio nelle tessere non collegate. Immagine costruita con Compose (`docker compose up -d --build`, `compose.tunet.yaml`): `aca-system:0.9.16`, ID `sha256:d4f8e3e6401a114f5e250597165cb262f9844e2b10f035630e9296561e91e7ef`, creata 2026-10-20T12:22:12Z; bundle `index-vfVqDHyF.js` e `index-B76kd9E1.css`. **Copia a freddo prima** (container fermato): `backup/banco/tunet-data-20261020-pre-0.9.16-freddo.tgz`, 428587 byte, SHA-256 `55fbb0e1e89bc24440b3ca21c689a7a173a8912200f941943058fe2d5b0d5a3c`, `tar -tzf` 4 voci. Versione `ACASYSTEM_VERSION=0.9.16` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs`, `e2e/README.md` (copie in `backup/rep20261020-001b/v0916/`). Container `aca-tunet-tunet-1` healthy; `/api/health` con versione 0.9.16; `/ha/auth/providers` 200 su 127.0.0.1 e su 192.168.1.27 (Home Assistant non riavviato, non in onboarding). IPv4 Wi-Fi del PC 192.168.1.27 = binding LAN: nessun aggiornamento. Tablet: `adb reverse tcp:3002` e `adb forward tcp:9225` (CDP, rimosso a fine prove); orientamento orizzontale con `cmd window user-rotation lock 1`, poi `user-rotation free`. **Ripristino:** `ACASYSTEM_VERSION=0.9.15` in `progetto/.env` più la copia a freddo. Misure e controlli: [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md) e [verification.md](verification.md). Nessun comando a impianti reali.

## Aggiornamento REP-20261020-001 — banco 0.9.15, 2026-10-20

Richiesta umana: widget completi in stato spento con l'etichetta «Da collegare» (sostituisce l'opzione B) e fluidità. Immagine costruita con Compose: `aca-system:0.9.15`, ID `sha256:fd4f931f7ccf7c4f4bff14317cc7e87ea66154df17db6bd33f4882f7f6099fcd`, creata 2026-10-20T04:04:48Z; `NODE_ENV=production`, `PORT=3002`, `DATA_DIR=/app/data`; bundle `index-BGkr_FM2.js` e `index-j0d10Pwj.css`. **Copia a freddo prima** (container fermato): `backup/banco/tunet-data-20261020-pre-0.9.15-freddo.tgz`, 428366 byte, SHA-256 `207f505f7033fe82b79a6561efc8cc2bbe35e938c1421e67a9621f970715b102`, `tar -tzf` 4 voci (`./`, `tunet.db`, `tunet.db-wal`, `tunet.db-shm`). Rete: IPv4 Wi-Fi del PC 192.168.1.27 uguale al binding `192.168.1.27:3002` di `progetto/compose.tunet.yaml`, nessun aggiornamento. Health: container healthy, `/api/health` versione 0.9.15, `/ha/auth/providers` 200 su 127.0.0.1 e 192.168.1.27 (Home Assistant non riavviato). `ACASYSTEM_VERSION=0.9.15` in `progetto/.env`, `e2e/isolated-server.mjs`, `e2e/release.check.mjs`, `e2e/README.md`. Tablet: `adb reverse tcp:3002`, `adb forward tcp:9225`. Ripristino: `ACASYSTEM_VERSION=0.9.14` più la copia a freddo. Nessun commit, nessun comando a impianti. Misure in [REP-20261020-001](reports/REP-20261020-001-widget-spenti-stanza.md).

## Aggiornamento REP-20261019-003 — banco 0.9.14, 2026-10-19

Richiesta umana: giro mirato sui cinque punti osservati sul Tab M11 con la 0.9.13 («sì, avvia il giro»). Immagine costruita con Compose: `aca-system:0.9.14`, ID `sha256:b6b2af01c477e2b2742a5511d27846e22a718ff1ae5ee95c93a28da6ad514995`, creata 2026-10-19T20:31:50Z; bundle `index-D_SGyR0e.js` e `index-CcQdfQUb.css`, identici nel contenitore, nell'HTML servito e sul tablet. **Copia a freddo prima** (container `tunet` fermato): `backup/banco/tunet-data-20261019-pre-0.9.14-freddo.tgz`, 428218 byte, SHA-256 `5fbe0050d630a7f8d7c01439762566837eab9649d4e0cc6d54b91dc432393814`, `tar -tzf` mostra `./`, `tunet.db`, `tunet.db-wal`, `tunet.db-shm`. **Rete:** l'IPv4 Wi-Fi del PC è cambiato da 192.168.1.7 a **192.168.1.27**; aggiornati commento e binding in `progetto/compose.tunet.yaml` (`192.168.1.27:3002`, localhost mantenuto); la porta risponde sul nuovo indirizzo. Il cambio di origine richiede di verificare l'accesso del tablet (il tablet è stato provato via `adb reverse tcp:3002` e `adb forward tcp:9225`, quindi con `localhost`). Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.14"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.27:3002; `homeassistant` attivo, nessun `onboarding_required`, nessun riavvio. `ACASYSTEM_VERSION=0.9.14` in `progetto/.env` e negli script `e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`); copie dei file prima della modifica in `backup/rep20261019-003c/` (il `cp` sulla cartella ha sovrascritto lì `compose.tunet.yaml`, `README.md`, `isolated-server.mjs` e `release.check.mjs` già presenti, con il contenuto 0.9.13 corrente: perdita presumibilmente nulla, non accertata). Ripristino: `ACASYSTEM_VERSION=0.9.13` in `progetto/.env`, ricostruire e, se serve, ripristinare la copia a freddo (non provato). Provato sul Tab M11 (`localStorage` del launcher identico prima e dopo, 34 chiavi); prima prova invalidata perché il service worker serviva ancora il vecchio bundle, rifatta con cache svuotata. `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md), sezione «Rifinitura e banco 0.9.14».

## Aggiornamento REP-20261019-003 — banco 0.9.13, 2026-10-19

Richiesta umana: correggere l'anteprima attenuata di ISSUE-076 e misurarla sul tablet. Immagine costruita con Compose: `aca-system:0.9.13`, ID `sha256:bb5962d58447ca22cd09b728d9271d7dbc81339923adf9b3038774c4978c4b35`, creata 2026-10-19T15:32:38Z; bundle `index-CMIhvSTe.js`. **Copia a freddo prima**: `backup/banco/tunet-data-20261019-pre-0.9.13-freddo.tgz`, 428046 byte, SHA-256 `141df0df274c9ee8c1e94b8d187b2a58eb03296ca2bd8c719cf432f4b2433f39`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.13"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; `homeassistant` attivo da 4 giorni, nessun `onboarding_required`, nessun riavvio. `ACASYSTEM_VERSION=0.9.13` in `progetto/.env` e negli script `e2e` (copie in `backup/rep20261019-003b/pre-bump/`). Ripristino: `ACASYSTEM_VERSION=0.9.12` più la copia a freddo (non provato). Provato sul Tab M11 (`adb reverse tcp:3002`, `adb forward tcp:9225`; `localStorage` del launcher identico prima e dopo, 34 chiavi). `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## Aggiornamento REP-20261019-003 — banco 0.9.12, 2026-10-19

Richiesta umana: opzione B di ISSUE-076, «va misurata sul tablet». Immagine costruita con Compose: `aca-system:0.9.12`, ID `sha256:eeff9370959c6c799bd346748b778df6a5720a7b383fd264e3fa736b2904d4e6`, creata 2026-10-19T13:58:51Z; bundle `index-DtspZQd5.js`. **Copia a freddo prima**, a container `tunet` fermato: `backup/banco/tunet-data-20261019-pre-0.9.12-freddo.tgz`, 429401 byte, SHA-256 `40fd0b5aa5c991248aa2e78b5eab9eafe1a5485c2d589ca2db92aff759a97c3a`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy; `/api/health` = `{"status":"ok","version":"0.9.12"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; nessun `onboarding_required`. `ACASYSTEM_VERSION=0.9.12` in `progetto/.env` e negli script `e2e` (`isolated-server.mjs`, `release.check.mjs`, `README.md`). Ripristino: `ACASYSTEM_VERSION=0.9.11` più la copia a freddo (ripristino non provato; l'immagine 0.9.11 non è stata ricontrollata). Provato sul Tab M11 (`adb reverse tcp:3002`, `http://localhost:3002`, `localStorage` del launcher identico prima e dopo; il forward CDP 9225 è stato rimosso, il reverse 3002 è ancora attivo). `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10. Nessun commit, nessun comando a impianti, Home Assistant non toccato. Dettagli: [REP-20261019-003](reports/REP-20261019-003-issue076-widget-da-collegare.md).

## Aggiornamento REP-20261019-002 — banco 0.9.11, 2026-10-19

Richiesta umana: «metti la 0.9.11». Immagine costruita con Compose: `aca-system:0.9.11`, ID `sha256:90869e9c25f112beb543e4450292de9c39a5e1fb66ebf981d7779508e5d3ecd4`, creata 2026-10-19T10:46:07Z; bundle `index-7zKPGD3t.js`. **Copia a freddo prima**, a container `tunet` fermato: `backup/banco/tunet-data-20261019-pre-0.9.11-freddo.tgz`, 428858 byte, SHA-256 `0289762502baca219215041a2f1cf51ce326b3f4183050802b4bed7d8c556508`, `tar -tzf` 4 voci. Rete: IPv4 Wi-Fi del PC 192.168.1.7 = binding `192.168.1.7:3002` di `progetto/compose.tunet.yaml`, nessuna modifica. Controlli: `aca-tunet-tunet-1` healthy, `homeassistant` attivo da 4 giorni e non toccato; `/api/health` = `{"status":"ok","version":"0.9.11"}` e `/ha/auth/providers` = 200 su 127.0.0.1:3002 e 192.168.1.7:3002; nessun `onboarding_required`, nessun riavvio di HA. Ripristino: `ACASYSTEM_VERSION=0.9.10` più la copia a freddo (procedura nel [report 003](reports/REP-20261015-003-widget-operativi.md#procedura-di-ripristino); l'immagine 0.9.10 non è stata ricontrollata). Provato sul Tab M11 (`adb reverse tcp:3002`, `http://localhost:3002`, localStorage invariato); `release.check.mjs` usa ancora le evidenze e il manifest della 0.9.10 (vedi la nota più sotto). Nessun commit, nessun comando a impianti. Dettagli: [REP-20261019-002](reports/REP-20261019-002-correzioni-issue062-075-077.md).


## Banco corrente verificato il 2026-10-14

**Annotazione del 2026-10-15, audit in sola lettura [REP-20261015-002](reports/REP-20261015-002-audit-resoconto.md):** alle 15:00 circa Europe/Rome il container è healthy, health ok/versione 0.9.9 e immagine ancora `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, ma `docker diff` rileva modifiche a `/app/frontend/dist`. Sono serviti `index-Df7kljmP.js` (SHA-256 `4eb1bbdc67715750c919874ba961ff707280865d7755f87e490f57f39dfe6e70`) e `index-HD4WDER4.css` (`fb067d1ff6380551ad53249d79bedc271fad187eb24123a9304b955b298298e8`), uguali al dist locale preesistente. Le voci del 14 ottobre restano storico dell'immagine, non descrizione completa del filesystem corrente. Copia `backup/banco/tunet-data-20261015-pre-0.9.10-freddo.tgz` presente, 406797 byte, SHA-256 `abb3c440c6157078c817a2fd4e26d28dc856d2cb94cc66754fa49b2f9ace567e`, tar leggibile con db/wal/shm; modalità a freddo e ripristino non provati dall'audit. Nessuna modifica/ricreazione del banco. La build di verifica è isolata sotto backup/audit-20261015/dist e non è stata distribuita; il suo JS YZmyFge5 differisce da quello servito.

- **Dal 2026-10-14, 17:51 (REP-20261014-010, correzione del nome segnaposto dei widget di categoria non associati):**
  - **Immagine:** `aca-system:0.9.9`, `sha256:5a9ed917768d0ff98d660216ad61f60356a58fcfb5655e2c5a3f89c5041aa891`, creata il 2026-10-14T15:51:16Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.9` in `progetto/.env` (escluso da Git). Contiene la correzione di `CategoryWidgetContent.tsx` (etichetta di catalogo solo per Multimedia e Sonos) che la 0.9.8 non aveva. Nessun commit.
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.9-freddo.tgz`, 406.802 byte, SHA-256 `e2289e9e8bb4ca422cc94a12dd126dd49877d534b4e90baebb57e68489720e8c`, a container fermo (`docker compose stop tunet`, poi Alpine con il volume in sola lettura); contiene `tunet.db`, `tunet.db-wal` e `tunet.db-shm`. Lo stop del container è terminato con codice 137.
  - **Controlli:** container `healthy`; `/api/health` `{"status":"ok","version":"0.9.9"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-BjUHSvp_.js` su entrambi, con la condizione `media`/`sonos` della correzione. HA non è andato in `onboarding_required`, nessun riavvio.
  - **Rete:** IPv4 Wi-Fi del PC `192.168.1.7`, uguale al binding di `progetto/compose.tunet.yaml`: nessuna modifica.
  - **Tablet:** Tab M11 via `adb reverse` e CDP, pagina ricaricata (da `index-BgxLazso.js` a `index-BjUHSvp_.js`), `/api/health` 0.9.9 letto dalla pagina, sessione HA non toccata, disposizione salvata invariata, app lasciata su Principale. Nomi letti nel [report 010](reports/REP-20261014-010-sistemazione-issue.md).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.8` in `progetto/.env` più la copia del volume dal `.tgz` (l'immagine `aca-system:0.9.8` è ancora nel Docker locale). Ripristino dati non eseguito.

- **Dal 2026-10-14, 17:36 (REP-20261014-010, correzioni di Calendario/Attività, Multimedia/Sonos e vista pagine):**
  - **Immagine:** `aca-system:0.9.8`, `sha256:e928744d146141181db3198aa3b0ffaa68ac8423f5c8ece0f39ba97d52a07c61`, creata il 2026-10-14T15:36:57Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.8` in `progetto/.env` (escluso da Git).
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.8-freddo.tgz`, 403.798 byte, SHA-256 `5fb728d391982cdf47649299575b5d2d776a4c714062cd6770f66ab83e469b1e`, a container fermo; contiene `tunet.db` con `-wal` e `-shm`.
  - **Controlli:** container `healthy`; `/api/health` `{"status":"ok","version":"0.9.8"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-BgxLazso.js`. HA non è andato in `onboarding_required`, nessun riavvio.
  - **Rete:** IPv4 Wi-Fi del PC `192.168.1.7`, uguale al binding di `progetto/compose.tunet.yaml`: nessuna modifica.
  - **Tablet:** Tab M11 via `adb reverse`, pagina ricaricata via CDP, sessione HA non toccata, disposizione salvata invariata (nove pagine).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.7` in `progetto/.env` più la copia del volume dal `.tgz`. Ripristino dati non eseguito.

- **Dal 2026-10-14, 16:21 (REP-20261014-009, categorie/kit e correzioni emerse sul tablet):**
  - **Immagine:** `aca-system:0.9.7`, `sha256:7754c47acc67c4800083ba0c3e62c6e6eef7afdaeaaacbc17d0d13ac56c84668`, creata il 2026-10-14T14:20:58Z; `ACASYSTEM_VERSION=0.9.7` in `progetto/.env` (escluso da Git). Sorgenti del working tree, nessun commit.
  - **Copia a freddo:** `backup/banco/tunet-data-20261014-pre-0.9.7-freddo.tgz`, 218.283 byte, SHA-256 `7710515876df5e50796fa6226b35d327a14319adbb27fd56ed49c02ed0bc02e9`. Prima del lavoro: `tunet-data-20261014-pre-0.9.4-freddo.tgz`, 203.637 byte, SHA-256 `0931a902552c53aca8f86e9bd29412f6bbbddece8d266f4c01a8e633a5da3b4d`. Copie intermedie pre-0.9.5 e pre-0.9.6 conservate in backup/banco; hash nel report.
  - **Avvio:** `docker compose -f progetto/compose.tunet.yaml build tunet`, copia del volume a container fermo con Alpine, poi `up -d --no-build tunet`. Stesso volume `aca-tunet_tunet-data`; HA non ricreato.
  - **Controlli:** healthy; health/versione, index, bundle `index-C1c5Y-MI.js` (421.189 byte) e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`. Build e budget superati.
  - **Tablet:** Tab M11 TB330FU via USB (`adb reverse`/CDP), sessione HA conservata; nove pagine e 28 widget (25 categorie + tre Copertina), reload e rotazione provati. Evidenze in `backup/tablet-009/` e nel [report 009](reports/REP-20261014-009-banco-tablet.md).
  - **Ripristino applicativo disponibile:** tag 0.9.6 conservato; impostare `ACASYSTEM_VERSION=0.9.6` e `up -d --no-build tunet`. Il banco precedente all'incarico era 0.9.3, anch'esso conservato. Ripristino dati non eseguito; copie manuali non equivalgono a backup automatico collaudato.

- **Dal 2026-10-14, 10:07 (REP-20261013-002, barra unica in basso, ADR-0013):**
  - **Immagine:** `aca-system:0.9.3`, `sha256:1cba363b6f6e4fc54390ebfb13383b7a0f2c75966efc1684d82175106cbbc80a`, creata il 2026-10-14T08:07:02Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.3` in `progetto/.env`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261014-pre-0.9.3-freddo.tgz` (188 393 byte, SHA-256 `63dcd26beaf7a0e4f8a9e4e907cdfcd2e78d6cddc68b7b203de2c397fd58949f`), a container fermo con `alpine`; contiene `tunet.db` con `-wal` e `-shm`.
  - **Rete:** il PC è di nuovo in ufficio, rete «MeMo Repeater 5 Ghz I», con `192.168.1.7`. Il binding del compose è passato da `192.168.1.17` a `192.168.1.7` (`up -d --no-build` sulla 0.9.2, poi la build della 0.9.3).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.3"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.7`; bundle `index-C8F-qxyS.js`.
  - **Tablet:** il Tab M11 (TB330FU) apre la 0.9.3 su `http://localhost:3002` via `adb reverse tcp:3002 tcp:3002`, con l'accesso fatto dall'utente; misure in [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#tab-m11-2026-10-14). Gli script delle misure sono in `backup/strumenti-tablet/`, con un `LEGGIMI.md`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.2` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-13, 17:45 (REP-20261013-001, «Fine» al posto di «Conferma»):**
  - **Immagine:** `aca-system:0.9.2`, `sha256:0e708b41bc4da5349cb750bf08da9b2e42b0e96b1c3444b1ffd6c8851cd85ec0`, creata il 2026-10-13T15:44:47Z dai sorgenti del working tree; `ACASYSTEM_VERSION=0.9.2` in `progetto/.env`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261013-pre-0.9.2-freddo.tgz` (134 274 byte, SHA-256 `cd63174a0bcb6f892364192a09328aa046435be50454e11f2547b3d00478ec5c`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.2"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.17`; bundle `index-qaiumG36.js`, che contiene `data-widget-action="done"`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.9.1` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-13, 00:17 (REP-20261012-003, blocco L2):**
  - **Immagine:** `aca-system:0.9.1`, `sha256:81217e57757a16d9afaedbdd758c0ea40dc2387af101a87faa0d12df2683b3e1`, creata il 2026-10-12T22:16:51Z dai sorgenti del working tree; versione da `progetto/.env` (`ACASYSTEM_VERSION=0.9.1`).
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261013-pre-0.9.1-freddo.tgz` (134 283 byte, SHA-256 `9a98cbf40c5a33c82eccb4d3f56edccee736bd10358e78b364d25ba7d3309c20`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9.1"}` e `/ha/auth/providers` 200 su `127.0.0.1` e `192.168.1.17` (rete di casa «PosteMobile-40713171»); bundle `index-rqrtF8mx.js`.
  - **Tablet:** sul Galaxy Tab S8, via `adb reverse`, Samsung Internet carica la 0.9.1 (`/api/health` 0.9.1). La misura è rimandata: alle 00:20 il tablet era bloccato e lo sblocco spetta all'utente. Via Wi-Fi da casa serve la regola del firewall (vedi sotto).
  - **Ripristino:** `ACASYSTEM_VERSION=0.9` in `progetto/.env` più la copia del volume.

- **Dal 2026-10-12 (REP-20261012-001, -002, -003 tappa 1, -004):**
  - **Immagine:** `aca-system:0.9`, `sha256:9a66d934c039a4b90bf23faee65cf515525aba04254ad36f2ad91761bb3fc533`, creata il 2026-10-12T15:23:02Z dai sorgenti del working tree.
  - **Versione da `progetto/.env`:** `ACASYSTEM_VERSION=0.9`. Il file è escluso da Git; `progetto/.env.example` è versionato. Il compose usa la variabile per il tag dell'immagine, per l'argomento di build e per l'ambiente del container: senza la variabile `docker compose` si ferma con un messaggio. Il backend la restituisce in `/api/health` e il frontend la usa come ripiego della riga «Versione» di Sistema (REP-20261012-004).
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261012-pre-0.9-freddo.tgz` (126 028 byte, SHA-256 `c7fd1a8e746f82d0d9c8aac970e70de06563eb46222802ab6cc6fb2b4d01a362`).
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.9"}` e `/ha/auth/providers` 200, su `127.0.0.1` e su `192.168.1.7`; bundle `index-DG_i_to_.js`.
  - **Indirizzo Wi-Fi:** invariato, `192.168.1.7` sulla rete «MeMo Repeater 5 Ghz»; per il tablet `http://192.168.1.7:3002`.
  - **Ripristino:** `ACASYSTEM_VERSION=0.8` in `progetto/.env` (l'immagine `aca-system:0.8` resta in locale) più la copia del volume. Nessuna prova di ripristino dei dati.
  - **Misure sul tablet:** il tablet delle demo (TB336ZU, Chrome 154) è stato misurato su 0.8 e su 0.9 via USB e CDP; esiti in [REP-20261012-003](reports/REP-20261012-003-lag-tablet-prestazioni.md#misure-sul-tablet-delle-demo-tb336zu-08--09).
  - **2026-10-12 sera, rete di casa:**
    - **Rete e indirizzo:** il PC è sulla rete «PosteMobile-40713171» con `192.168.1.17`. Il binding è passato a `192.168.1.17`, poi `up -d --no-build`. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.17`.
    - **Il tablet non raggiungeva il banco via Wi-Fi.** `nc -z 192.168.1.17 3002` dal tablet andava in timeout.
      - Causa: il profilo della rete di casa è **Privato**, mentre le regole in ingresso di Windows per `com.docker.backend.exe` valgono solo per il profilo **Pubblico**. In ufficio la rete era pubblica.
      - Abilitare Docker anche sul profilo Privato è un'impostazione di sicurezza del PC, quindi la cambia l'utente: Sicurezza di Windows → Firewall → Consenti app → `com.docker.backend` → Privato.
    - **Soluzione usata senza toccare il firewall:** `adb reverse tcp:3002 tcp:3002` sul tablet collegato via USB. Il tablet apre `http://localhost:3002`, un'altra origine, quindi l'utente ha fatto un nuovo accesso.
    - **Galaxy Tab S8 (SM-X700, REP-20261012-003):** Chrome 154 non espone `chrome_devtools_remote` nemmeno dopo il riavvio. Samsung Internet 30 (Chromium 143) espone `Terrace_devtools_remote` e si misura con CDP grezzo sulla pagina, perché `connectOverCDP` di Playwright non si aggancia.

- **Dal 2026-10-10, 10:38 (REP-20261009-003, -004, -005, -006):**
  - **Immagine:** `aca-system:0.8`, `sha256:a552c711ecb74108f64ed4aef728d841030ae2372799d80b67edda7b1c6fdd72`, creata il 2026-10-10T08:35:35Z dai sorgenti del working tree.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261010-pre-0.8-freddo.tgz` (104 306 byte, SHA-256 `0a32ad2bad0672f72a9d31e6b3e228788550614300202564a18cdbbe45e379e2`). Fatta a container fermo con `alpine` (scaricata da Docker Hub per l'occasione); contiene `tunet.db` con `-wal` e `-shm`. Il container si è fermato con codice 137 allo scadere dei 10 s.
  - **Controlli:** container `healthy`; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.11`; bundle `index-BLpMNnba.js`. Il CSS servito contiene `--aca-shell-foot`, `aca-page-overview__tools` e `--aca-hold-scale`.
  - **Indirizzo Wi-Fi:** il PC è sulla rete «PosteMobile-40713171» con `192.168.1.11`; il binding `192.168.1.42` della 0.7 non esisteva più. Il tablet apre `http://192.168.1.11:3002`, che per il browser è un'altra origine: servono un nuovo accesso e una disposizione salvata per quell'origine.
  - **Prima dell'aggiornamento:** Docker Desktop era chiuso dopo lo spegnimento del PC. È stato riavviato tramite `explorer.exe`, e HA rispondeva di nuovo `onboarding_required`; `docker restart homeassistant` lo ha riportato sulla configurazione vera (`/auth/providers` 200).
  - **Spegnimenti del PC durante le prove:** 4 riavvii senza arresto regolare tra il 2026-10-09 00:15 e il 2026-10-10 02:19 (Kernel-Power 41). I codici di arresto sono 0x10E e 0x116, del driver grafico (NVIDIA GeForce RTX 5050 Laptop, driver 32.0.16.1088); i minidump sono in `C:\Windows\Minidump`. Sono avvenuti con browser di prova e suite in parallelo. Da allora le prove usano Chromium senza GPU, un browser alla volta, e Vitest con quattro processi. L'aggiornamento del driver spetta all'utente.
  - **Ripristino:** `image: aca-system:0.7` più la copia del volume. Nessuna prova di ripristino dei dati.
  - **2026-10-12, 10:40:** il PC è di nuovo sulla rete «MeMo Repeater 5 Ghz I» con `192.168.1.42`. Il binding è passato da `192.168.1.11` a `192.168.1.42`, seguito da `up -d --no-build` con la stessa immagine. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`; bundle `index-BLpMNnba.js`.
  - **2026-10-12, circa 12:00:** il PC è passato a «MeMo Repeater 5 Ghz» con `192.168.1.7` e il tablet non raggiungeva più il banco. Il binding è passato a `192.168.1.7`, seguito da `up -d --no-build`. `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.7`. Il tablet delle demo (TB336ZU) ha richiesto un nuovo accesso, fatto dall'utente.
  - **Debug del tablet via USB (REP-20261012-003):** `adb` è in `C:\Users\matti\AppData\Local\Android\Sdk\platform-tools`. Debug USB attivato dall'utente; Chrome raggiungibile con `adb forward tcp:9222 localabstract:chrome_devtools_remote` e CDP.
- **Dal 2026-10-09, 12:12 (REP-20261009-002):**
  - **Immagine:** `aca-system:0.7`, `sha256:e1a688d18f0738b2d3fa99a12e527d5720b8247d4eb316b9c60bc1c75a7920e5`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261009-pre-0.7-freddo.tgz` (80 591 byte).
  - **Controlli:** container `healthy`; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`; bundle `index-BU0wYGPs.js`.
  - **Ripristino:** `image: aca-system:0.6`.
- **Dal 2026-10-08 (REP-20261008-001):**
  - **Immagine:** `aca-system:0.6`, `sha256:cf27d8a30c44af0212a5da68491d8c85c59e0418c541a2058eee30a540e9780c`, creata il 2026-10-08T21:31:29Z dai sorgenti del working tree.
  - **Controlli:** container `healthy`; `/api/health` risponde `{"status":"ok","version":"0.1.0"}`; `/ha/auth/providers` risponde 200 `application/json`; il bundle è `index-CD3c4iGC.js`.
  - **Copia a freddo del volume:** `backup/banco/tunet-data-20261008-pre-0.6-freddo.tgz` (60 398 byte). Contiene `tunet.db` con `-wal` e `-shm` ed è stata fatta a container fermo.
  - **Indirizzo Wi-Fi:** il PC è passato all'hotspot «HUAWEI Y6 2018», quindi la porta per i tablet ascolta su `10.165.121.134:3002` invece di `172.20.10.6:3002`, che non esisteva più. Il browser del tablet tratta il nuovo indirizzo come un'altra origine: servono un nuovo accesso e una disposizione salvata per quell'origine.
  - **Ripristino:** `image: aca-system:0.5` in `progetto/compose.tunet.yaml` (`sha256:143fee7…786ec8`) più la copia del volume. Nessuna prova di ripristino dei dati.
  - **Incidente del 2026-10-08, 23:58:**
    - **Cosa è successo:** Docker Desktop, che si era chiuso, è stato riavviato. Il container `homeassistant`, con `restart: unless-stopped`, è ripartito prima che Docker collegasse il disco C:. Il bind `/mnt/c/homeassistant/config → /config` ha preso una cartella vuota e HA rispondeva `onboarding_required`, come un'installazione nuova.
    - **Dati:** la configurazione vera in `C:\homeassistant\config` non è stata toccata (`.storage/auth` delle 23:32, `onboarding` del 2026-10-05).
    - **Rimedio:** `docker restart homeassistant` a Docker pronto. Poi `/auth/providers` e `/ha/auth/providers` rispondono 200 in locale e su `10.165.121.134`.
    - **Procedura dopo ogni riavvio di Docker Desktop:** controllare che `curl http://127.0.0.1:8123/auth/providers` non risponda `onboarding_required`; se lo fa, riavviare il container. Non completare l'onboarding nella cartella vuota.
  - **Ripetizione il 2026-10-09 alle 00:20.**
    - **Causa:** Docker Desktop era stato avviato dall'agente dentro la sessione, e la chiusura della sessione l'ha chiuso. Va lanciato tramite `explorer.exe`, staccato dalla sessione.
    - **HA:** di nuovo `onboarding_required`, risolto con `docker restart homeassistant`.
    - **Container del banco:** è ripartito senza porte pubblicate (`docker port` vuoto), perché il PC era su un'altra rete Wi-Fi, «PosteMobile-40713171» con `192.168.1.11`. L'indirizzo `10.165.121.134` non esisteva più.
    - **Rimedio:** binding del compose portato a `192.168.1.11:3002`, poi `up -d --no-build`. Ora `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e su `192.168.1.11`.
    - **2026-10-09, 09:25:** il PC è passato alla rete «MeMo Repeater 5 Ghz 2» con `192.168.1.42`. Binding aggiornato; `/api/health` e `/ha/auth/providers` rispondono 200 su `127.0.0.1` e `192.168.1.42`.
    - **Avvertenza:** ogni cambio di rete del PC richiede di aggiornare il binding. Un indirizzo stabile, cioè un IP fisso o un ascolto su tutte le interfacce con regola del firewall, è una decisione dell'utente.
- [Compose](../progetto/compose.tunet.yaml), stato precedente: progetto `aca-tunet`, container `aca-tunet-tunet-1`, immagine `aca-system:0.5` dal 2026-10-07 (REP-20261007-004, pagina `/ui-kit`; prima `aca-system:0.4` `sha256:0d2fbc7…ebd933`, REP-20261007-003; `aca-system:0.3` `sha256:857bcb5…76beb`, REP-20261007-002, proxy di HA; `aca-system:0.2` `sha256:de33f56…8ae7` e `aca-system:0.1` `sha256:be0f93a…7b09c8`), porta `127.0.0.1:3002` e, dal 2026-10-07, l'indirizzo Wi-Fi del PC per i tablet (REP-20261007-011; `172.20.10.6` dal 2026-10-07, prima `192.168.1.42`). Immagine in esecuzione `sha256:143fee7752269157f2ffd909f214abe6ef0c038fa07cfa5a2555c154d4786ec8` (REP-20261007-034…038; prima `sha256:91dd2aa…255cd`, REP-20261007-031/032/033; prima `sha256:f960e49…c65c`, REP-20261007-030; prima `sha256:0d55349…dfd7`, REP-20261007-029; prima `sha256:f11b9e0…66552`, REP-20261007-028; prima `sha256:4dd4436…6e3eda`, REP-20261007-027, e `sha256:a3ff1db…5aabd`), stato `healthy`; `/api/health` risponde `{"status":"ok","version":"0.1.0"}`.
- Sorgenti in `progetto/acasystem/`: workspace frontend React/Vite e backend Express, applicativo TypeScript con controlli strict. Dockerfile Node 26 Alpine; frontend compilato e backend TypeScript eseguito da Node. Il codice dell'interfaccia Tunet sostituita è stato cancellato il 2026-10-07 (ISSUE-029); le istantanee `usa-come-git/v009`–`v011` lo conservano.
- Volume persistente invariato: `aca-tunet_tunet-data` → `/app/data`. Cifratura applicativa `off`. Copia a freddo del volume presente in `backup/banco/tunet-data-20261007-pre-acasystem-freddo.tgz` (8516 byte), eseguita prima dell'aggiornamento autorizzato. Nessuna prova di ripristino dei dati, nessun backup automatico o nuovo backup HA.
- Backend → HA: `TUNET_INTERNAL_HA_URL=http://host.docker.internal:8123`. L'identità viene verificata soltanto presso gli URL configurati sul server; un URL HA inviato dal client non viene usato. Senza configurazione valida, le API protette rispondono 503 `HA_URL_NOT_CONFIGURED` (SEC-1).
- **Dal 2026-10-07 (ADR-0009, REP-20261007-002), Browser → Acasystem → HA:** il browser parla solo con `http://localhost:3002/`. Il server inoltra a HA sotto `/ha` (lista consentita, WebSocket incluso) e l'accesso avviene con la pagina Acasystem. Requisiti di HA e limiti nel [README del progetto](../progetto/acasystem/README.md). Esposizione di HA in rete (porta 8123) invariata: la chiusura è una decisione da prendere con l'installazione del pilota.
- Storico, prima di ADR-0009: Browser → HA con sessione OAuth2 preesistente conservata dopo il ricaricamento su `http://localhost:3002/`. Il pannello Sistema mostra «Collegato» a `http://localhost:8123`; copertina, pagina Principale e ritorno da Sistema verificati nel browser laterale. Nessun comando a dispositivi fisici eseguito.
- Inter è servito localmente. Mappe OpenStreetMap, loghi esterni e risorse fornite dalle integrazioni HA possono richiedere internet (ISSUE-016); questa verifica non certifica funzionamento completo offline, LAN/remoto o dispositivi.

Per avviare l'immagine già costruita: `docker compose -f progetto/compose.tunet.yaml up -d --no-build`. Per ricostruire dai sorgenti: stesso comando con `--build`; questo crea un nuovo artefatto e richiede le verifiche del relativo incarico. Dal 2026-10-12 il compose legge la versione da `progetto/.env` (`ACASYSTEM_VERSION`): va alzata prima di ricostruire. Il ripristino della versione precedente è documentato in REP-20261006-002; non è una prova di ripristino dei dati. Le sezioni datate 2026-10-05 sotto conservano lo stato storico.

## Inventario verificato e previsto

| Risorsa | Evidenza attuale | Destinazione prevista |
|---|---|---|
| Repository locale | Git inizializzato; documentazione e copia originale versionate | Storico di codice, configurazioni e documenti quando autorizzati. |
| Area backup locale | Acquisizione Tunet in backup/tunet-acquisizione-20261005/; copie manuali del volume in backup/banco/, escluse da Git | Backup HA, automazione, frequenza, accessi e ripristino da progettare e provare. |
| Sorgenti e banco prova Acasystem | 0.1.0, derivato da Tunet 1.22.1 revisione 5dec995; [progetto/](../progetto/README.md), frontend «OS» Metallo e backend TypeScript | Demo in ufficio; ulteriore sviluppo solo su incarico. |
| Ambiente test/staging | Banco prova su Windows 11 Home, Docker Desktop/WSL 2; HA e Tunet locali | Non è un ambiente di produzione o staging con dispositivi fisici collaudati. |
| Cloud Hetzner storico | Nessuna configurazione acquisita; REQ-01 ritirato dall'utente | Escluso dalla direzione corrente; nessun fornitore sostitutivo scelto. |
| DNS e TLS | Domini del PRD sono esempi; nessuna proprietà o configurazione verificata | Endpoint e certificati da definire. |
| Host locale e client del pilota | Macchina corrente Windows/Docker, container Linux; frontend nel browser locale. HA 2026.9.4 installato dall'utente | Linux 64 bit ARM64/x86-64; mini PC/Raspberry, tablet e dispositivi fisici da scegliere. |
| Rete cablata e Wi-Fi | Descrizione umana preliminare; topologia e funzione della componente Wi-Fi da chiarire | Collegamenti locali, reti dei dispositivi e condizioni offline da documentare. |
| Hardware condiviso da più utenti | Valutazione richiesta; capacità e isolamento non provati | Distinguere stesso impianto da abitazioni separate, senza scegliere una topologia. |
| Repository remoto / CI | Nessun remote o workflow configurato | Scelta successiva, con controlli e accessi da definire. |

Non registrare segreti o identificativi personali non necessari. Per ogni futura risorsa annotare ambiente, responsabile, configurazione versionata, costo/budget se pertinente, data dell'ultima verifica e riferimento al report.

## Componenti candidati

Home Assistant e il riferimento frontend React Tunet sono approvati come direzione. Nel banco prova sono installati HA Container 2026.9.4 e Acasystem 0.1, derivato da Tunet 1.22.1; il metodo/versioni dell'hardware finale restano aperti. Le dipendenze correnti sono nel lockfile dei workspace; HAKit non è stato aggiunto.

Docker Compose, reverse proxy, tunnel, database e motore AI erano candidati originali; non sono tutti prerequisiti della fase grafica. Se necessari, motivarne uso e collocazione locale nel relativo incarico. Hetzner e i tier CPX originali restano soltanto nello storico della proposta ritirata.

Le porte, i record DNS e i percorsi proposti nel PRD non costituiscono la configurazione operativa del prodotto. Il banco prova usa soltanto gli endpoint e percorsi seguenti.

## Banco prova verificato il 2026-10-05

- HA preesistente: container homeassistant, porta host 8123 su tutte le interfacce come installato dall'utente, dati `C:\homeassistant\config` → `/config`. Questa configurazione esterna al repository non è stata modificata né importata in Git.
- Tunet: [compose.tunet.yaml](../progetto/compose.tunet.yaml), progetto Compose aca-tunet, immagine locale aca-tunet:1.22.1-aca-panels-neu1 dopo REP-20261005-010 (precedenti immagini gestione, HOME Neumorphism, HOME TS e baseline aca-tunet:1.22.1-5dec995 conservate), container aca-tunet-tunet-1; ascolto host `127.0.0.1:3002`.
- Browser → HA: `http://localhost:8123`, OAuth2 completato dall'utente; Tunet mostra CONNECTED e Authenticated via OAuth2. Non esiste un nuovo account remoto ACA/Tunet.
- Backend → HA: `http://host.docker.internal:8123`; challenge WebSocket auth_required ricevuta e schermata profili senza errore. Le credenziali non sono state lette o registrate dall'agente.
- Tunet → dati: volume Docker aca-tunet_tunet-data → `/app/data`; SQLite/profili, cifratura upstream off. Layout e sessione browser sono separati dal volume.
- Build: Dockerfile upstream node:26-alpine e npm ci; baseline upstream registrata e HOME TS/italiano/mx-icons e primo materiale Neumorphism applicati. La ripresa del design non aggiunge dipendenze. Lockfile corrente conserva le versioni preesistenti e aggiunge le dipendenze del report di migrazione. Il tag base è mobile; digest/versioni osservati nel report. Nessuna CI è attiva.

Procedura di avvio eseguita e comandi di gestione pianificati in [progetto/README.md](../progetto/README.md). Il comando Compose riguarda Tunet e non ricrea HA. Persone/client della LAN, remoto, TLS, backup e riavvio offline non sono stati collaudati; la porta Tunet è riservata alla macchina corrente.

## Procedure operative da definire e provare

Le righe seguenti sono requisiti documentali delle procedure future, non comandi eseguiti o runbook pronti per produzione.

| Procedura | Informazioni necessarie | Evidenza di accettazione |
|---|---|---|
| Installazione/provisioning | Ambiente di destinazione, versioni, prerequisiti, rete, storage, segreti esterni e configurazioni versionate | Avvio in ambiente autorizzato, servizi attesi raggiungibili, accessi non previsti rifiutati. |
| Deploy/aggiornamento | Artefatto/versione, compatibilità gateway-client-backend, controlli iniziali, eventuali migrazioni e sequenza | Verifiche funzionali pertinenti e versione osservata dopo il rilascio. |
| Ripristino di versione | Condizioni di attivazione, versione precedente, compatibilità dati e responsabile | Ritorno verificato alla versione scelta in test isolato. |
| Backup | Dati/configurazioni inclusi, destinazione, cifratura, accessi, conservazione e responsabilità | Copia disponibile e integra; la sola esecuzione del backup non prova il recupero. |
| Ripristino dati/gateway | Prerequisiti, credenziali esterne, ordine di recupero e trattamento delle configurazioni | Recupero provato con dati di test e controllo delle funzionalità recuperate. |
| Monitoraggio | Salute servizi, gateway offline, disco, certificati, errori e destinatari autorizzati | Simulazione del guasto e segnale osservato. Nessuna notifica è attivata da questo documento. |
| Incidenti | Diagnostica anonimizzata, contenimento, ripresa e report dell'incidente | Cronologia, causa/evidenze e verifica di regressione se pertinente. |

RPO, RTO, disponibilità attesa, retention e frequenze dei controlli non sono definiti: richiedono requisiti e budget del primo rilascio. Definirli senza trasformare stime in garanzie.

## Dati, accessi e trasporto

Separare gli ambienti e descrivere chi può leggere, amministrare o aggiornare ogni servizio quando viene progettato. Segreti forniti tramite meccanismo esterno allo storico; gli esempi di configurazione devono esserne privi. Il registro [compliance.md](compliance.md) raccoglie condizioni dei fornitori e questioni sui dati.

Per LAN/remoto documentare percorso reale, punti di terminazione TLS, autenticazione e isolamento degli impianti. Il meccanismo remoto e la proprietà end-to-end restano da progettare (ISSUE-013). Perdita di internet, riavvio del frontend/gateway e guasto della rete locale richiedono scenari distinti (V-02/V-03/V-15).

Progettare il primo setup con sessione admin aperta soltanto inizialmente e consegna con account cliente. Aggiornamenti, manutenzione e recupero riguardano l'hardware fornito negli immobili; accesso remoto permanente dei sistemisti e distribuzione su una macchina condivisa sono decisioni ancora aperte.

## Regola per i futuri interventi

Ogni operazione necessita di un incarico umano che identifichi ambiente e risultato. Prima del cambiamento acquisire lo stato necessario; dopo registrarne configurazione osservata, verifiche e limiti in un report. Una procedura passa da progettata a provata solo con evidenza; i controlli automatici e i runbook eseguibili saranno introdotti nei relativi incarichi.

Aggiornamento locale REP-20261005-010: runtime osservato sha256:a6b097e6f92effd06948b45beedfaa6e2f6aafce4c54e2a6d37829cf50483b47, healthy. Dopo un tentativo di rebuild offline del Dockerfile upstream fallito sul passaggio apk non presente in cache, il builder e il runtime sono stati derivati dalle immagini locali dell'intervento precedente, copiando i sorgenti/build attuali, senza reinstallare pacchetti. Dockerfile temporanei ed evidenze restano in backup/panels-skeleton-20261005, esclusi da Git. Dockerfile upstream, lockfile, HA e volume dati invariati; resta valido il limite del tag base mobile per ricostruzioni future.


Ultima copia immediatamente precedente al rilascio, 2026-10-15 23:48: `backup/banco/rep003-20261015-pre-release-volume-freddo.tgz`, **406105 byte**, SHA-256 `a613ed9f2259b3cf13f8335c27575eec07bf94f178f771e884db63ad22645026`. Estrazione in tmpfs senza rete verificata, SQLite integro e dati identici al rilascio. Per il recupero dati preferire questa copia più recente; snapshot filesystem e override restano quelli descritti nel report.

Annotazione 2026-10-19 (REP-20261019-002; **la frase sul banco non aggiornato è superata dalla voce «banco 0.9.11» in cima**): `progetto/.env` ora dice `ACASYSTEM_VERSION=0.9.11` (file locale, ignorato da Git), come richiesto dall'utente. **Il banco non è stato aggiornato**: resta `aca-system:0.9.10` finché non si ricostruisce l'immagine con Compose; fino ad allora `/api/health` e Sistema mostrano 0.9.10 e `e2e/release.check.mjs` (aggiornato alla 0.9.11) fallisce di proposito. Al rilascio autorizzato vanno rigenerati manifest degli asset ed evidenze di `release.check.mjs` per la nuova build: lo script usa ancora `backup/rep003/release` e `backup/assets-image-final.json` della 0.9.10 e li sovrascriverebbe. Nessun backup, build, container o dato del banco toccato.

Annotazione 2026-10-19 (REP-20261019-001): il binding LAN del banco è tornato a **192.168.1.7**, sulla rete «MeMo Repeater 5 Ghz» (sostituisce 192.168.1.19 della nota del 2026-10-15). Il container è stato ricreato senza build (stessa immagine `aca-system:0.9.10`); health e provider rispondono 200 su 127.0.0.1 e su 192.168.1.7. Il tablet usa `adb reverse tcp:3002` (`http://localhost:3002`) e le DevTools su 127.0.0.1:9225 (la 9222 è occupata da un processo del PC). Dati registrati come riferiti dall'incarico; nessuna modifica al banco durante le prove.

## VM acasystem-ha avviata (2026-10-23)

HAOS 18.3 con Core 2026.10.2 nella VM VirtualBox `acasystem-ha` (Host-Only 192.168.56.101, NAT temporanea, RAM 3072 MB temporanea, grafica vmsvga, paravirtualizzazione hyperv perché VirtualBox gira sopra l'hypervisor di Windows). Proprietario creato dall'utente. Snapshot: «prima-del-primo-avvio», «dopo-onboarding». VM spenta a fine giornata. Dettagli in REP-20261023-003, sezione V1.

## VM acasystem-ha avviata (2026-10-23)

HAOS 18.3 con Core 2026.10.2 nella VM VirtualBox `acasystem-ha` (Host-Only 192.168.56.101, NAT temporanea, RAM 3072 MB temporanea, grafica vmsvga, paravirtualizzazione hyperv perché VirtualBox gira sopra l'hypervisor di Windows). Proprietario creato dall'utente. Snapshot: «prima-del-primo-avvio», «dopo-onboarding». VM spenta a fine giornata. Dettagli in REP-20261023-003, sezione V1.
