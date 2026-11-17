# ACA Windows con VM automatica e design condiviso

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-009 |
| Stato | Concluso il lotto di prova Windows e build client; limiti di collaudo sotto |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richieste | U25 avvio lavori concreti prima della scelta completa; U26 secondo lavoro CSS/base/primitive condivise anche per launcher; U27 lavoro notturno con obiettivo applicativo eseguibile su PC che avvia automaticamente VM in background. Testi integrali da conservare nel diario. |
| Autorizzazione | U27 assegna ora realizzazione delle due fasi e risultato Windows/VM, superando il precedente limite di sola analisi per questo incarico. Installazioni/configurazioni necessarie e prove da limitare al risultato; non autorizza cloud/remoto, Android HA, aggiornamenti estranei o deploy. |
| Estensione umana | U28-U30: Sistema → QR Code sul desktop; Android inizialmente scanner con due scelte. Collega account collega alla stessa casa/account con aggiornamenti condivisi; Importa layout copia interfaccia fra utenti/case diverse senza collegare account o dispositivi del mittente. U29a conferma configurazione come copia, senza sincronizzazione successiva. |

## Obiettivo e perimetro

Priorità: produrre e verificare un eseguibile Windows ACA che gestisce l'avvio headless del proprio motore HA OS e porta al frontend ACA senza mostrare la UI HA o il Manager VirtualBox. Seconda fase: fonte comune di design base/elementi HTML/primitive e riallineamento delle shell al design ACA, conservando i componenti React e CSS specifici necessari.

Gli indirizzi del profilo e l'identità della casa restano una distinzione progettuale; non si disabilita il reset delle sessioni verso server non verificati. Non si implementano ora relay, migrazione automatica del master, account globali o porting Android HA. Non gestire VM altrui per sola omonimia; verificare proprietà e preservare dati/materiali preesistenti.

Stato iniziale con numerose modifiche preesistenti in frontend/tests/TV e documentazione. Nessun reset, pulizia o commit di quel lavoro. Codice/client e materiali iniziali da censire prima delle modifiche; conservare diff e verifiche pertinenti.

## Criteri di completamento

- Eseguibile Windows prodotto con strumenti disponibili e percorso ripetibile di avvio del motore, senza console HA/VirtualBox visibile.
- Riapertura idempotente: non ricreare disco/dati, non avviare duplicati o modificare VM non appartenenti ad ACA.
- UI ACA riconoscibile per attesa/errore/inizializzazione; nessun account universale o token nei log/file documentali.
- Collegamento frontend/backend verificato con evidenze effettive; limiti espliciti per prerequisiti, tempi di avvio, rete LAN e hardware non collaudati.
- CSS condiviso a sorgente e distribuito nelle build, avvio locale leggibile anche prima del download del frontend; conservare semantica/accessibilità e stile confermato.
- Test pertinenti e prova eseguibile/VM realmente effettuati dove disponibili; nessuna attestazione per controlli non eseguiti.
- Diario, stato, indice/report e documenti pertinenti aggiornati, nessun deploy/push/commit non richiesto.
- QR Code desktop e avvio Android specifico, inviti monouso e accesso personale; account sincronizzato distinto dalla copia di un layout portabile fra case con binding da riconnettere. Non trasferire password/token amministrativi o dispositivi della casa sorgente.

## Avanzamento e responsabilità

- Coordinatore: inventario VM/materiali, integrazione Electron, build e prova complessiva, documentazione.
- Agente motore: nuovi moduli Windows engine e test, proprietà/CLI/headless; nessuna mutazione VM reale indipendente.
- Agente design: fonte CSS/asset comuni e shell, senza logica di avvio o stato.
- Agente ricognizione: onboarding/add-on/frontend e materiali disponibili, sola lettura.
- Estensione U28-U30: agente API/QR e sincronizzazione per utente; agente Android/scanner dopo completamento della base grafica. Coordinatore: endpoint LAN e integrazione Windows. La prima prova è locale; nessun relay/Cloud attivato per rendere raggiungibile una foto QR inviata fuori casa.

### Avanzamento iniziale verificato

- VirtualBox già presente 7.2.4r170995; VM storiche acasystem-ha e acasystem-ha-s45 censite, nessuna accesa. Banco storico non adottato o avviato.
- Scaricato archivio HA OS 18.4 ufficiale, SHA256 verificato contro e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be; VDI pulito estratto in LocalAppData/Acasystem/build-materials/haos-18.4. Dati di partenza del nuovo motore, nessun utente preconfigurato.
- Modulo engine nuovo: proprietà/journal/disco, avvio headless e inoltri controllati, test unitari 30/30 e typecheck secondo evidenze agente; integrazione/prova live ancora da svolgere dal coordinatore.
- Base grafica condivisa scritta e build frontend/Android verificate dall'agente; sorgenti token originali invariati, font Inter locali. Cablaggio build/CSP Windows aggiunto dal coordinatore; prova pacchetto ancora da svolgere.
- Ripresa notturna della stessa chat configurata ogni 30 minuti con automazione ACA Windows VM e design, id aca-windows-vm-e-design; quieta senza novità, da disattivare al completamento. Nessuna nuova chat creata.

### Implementazione e prova reale del 2026-10-30

La fase iniziale sopra descrive il punto di partenza. Gli avanzamenti seguenti distinguono i controlli eseguiti dagli agenti dalle prove reali comunicate dal coordinatore nella stessa chat.

- Motore Windows: VM di proprietà ACA identificata da UUID, percorso e marker, con journal e disco separato; avvio headless, inoltri loopback e ingresso ACA su IPv4 privata esplicita. Il bridge `acasystemShell.pairingEndpoint()` legge soltanto l'endpoint LAN; la UI applicativa non riceve i comandi di gestione della VM.
- App locale: archivio dei sorgenti trasferito nella VM e verificato con SHA-256; destinazione `/mnt/data/supervisor/apps/local/acasystem`. Il flusso usa `local_acasystem`, ricarica il catalogo locale e completa installazione/avvio tramite Supervisor senza pubblicare un'immagine o una nuova release GitHub.
- Interfaccia corrente: il backend espone in sola lettura `/api/client-bundle/manifest` e `/api/client-bundle/archive`, con schema, dimensione e SHA-256 verificati. Windows locale e Android associato preferiscono questo bundle alla release pubblica precedente. Corretto e provato il ripiego della cache: se il manifesto corrente dichiara un hash diverso, un download fallito non autorizza a usare una build differente con lo stesso numero di versione.
- QR: invito casuale monouso con durata cinque minuti, creato da un utente HA autenticato. `account` richiede poi il login personale con l'identità attesa; il QR non contiene password o token HA. `configuration` restituisce una copia portabile con nuovi ID pagina/widget e senza binding della casa sorgente, identità dell'account, coordinate della casa o preferenze del dispositivo. Le foto locali non sono trasferite.
- Account: impostazioni conservate per utente HA nel backend, revisioni con controllo dei conflitti e notifiche SSE autenticate. La copia Importa layout resta indipendente. Corretto con una regressione riproducibile il caso di una nuova revisione notificata durante una lettura precedente ancora in volo: la revisione non viene più persa. L'intervallo di 500 ms osserva le modifiche locali e recupera revisioni già notificate; non interroga continuamente il server in cerca di modifiche remote.
- La base del design, il percorso Android, le licenze, l'APK e le prove host del contenitore sono descritti nella [scheda design e QR Android](../riprogettazione/blocchi/02-design-e-qr-client-implementazione.md). Android resta un client della centrale Windows; HA sul tablet non è stato implementato.

**Prova reale comunicata dal coordinatore, con l'eseguibile in `progetto/client/windows/release/vm-current/win-unpacked/Acasystem.exe`:**

1. Avvio automatico headless della VM ACA con UUID che inizia per `17595a8d`, HA OS 18.4 e Core 2026.10.4; nessuna adozione delle VM storiche.
2. Creazione di un proprietario temporaneo dalla UI ACA e conferma dei dati della casa, installazione e avvio dell'app locale ACA 0.9.31, login ACA completato e interfaccia 0.9.31 aperta. La prova è del percorso ACA, senza richiedere all'utilizzatore la UI HA o il Manager VirtualBox.
3. QR visibile in Sistema; invito `account` accettato attraverso l'endpoint LAN con `loginRequired: true`; invito distinto `configuration` accettato con il payload di configurazione e senza `accountUserId`. Riutilizzo dell'invito: HTTP 410.
4. Due `BrowserWindow` Electron con partizioni isolate e lo stesso utente QA: tema dal PC alla seconda finestra, colore d'accento dalla seconda al PC, sfondo dal PC alla seconda. Il throttling delle finestre è stato disabilitato soltanto nella prova per simulare due finestre attive. Due rilevazioni finali di propagazione sono state 1.197 ms e 1.069 ms: esempi di quella prova, non uno SLA né una misura su Android.

Il proprietario e le sessioni erano temporanei. **Aggiornamento successivo comunicato dal coordinatore:** app chiusa, storage/cache della sessione predefinita e della partizione QA cancellati, VM arrestata con lo spegnimento dell'host HA OS, UUID/marker/percorso e stato `poweroff` verificati. Il VDI operativo è stato ripristinato dalla copia pre-owner: SHA-256 della copia e del disco ripristinato coincidenti, `6dc209ae99079602c5cc61ebde158551b8811cb14c815af8a696402b5f44a174`. Questo hash documenta il ripristino prima del nuovo avvio, non l'hash immutabile di un disco in uso.

Il primo ZIP nella cartella `pc-vm-0.9.31` è stato prodotto ma il suo EXE modificato dal confezionamento è stato rifiutato da Device Guard (exit 4551). `Get-AuthenticodeSignature` riporta NotSigned sia per quel file sia per il runtime disponibile; l'iniziale ipotesi di un runtime firmato è stata rettificata nella chat. Nessuna policy o impostazione di sicurezza Windows è stata modificata.

Il ZIP è stato rigenerato con il runtime Electron originale byte per byte, file dell'app sotto `resources/app` (`asar=false`) e risorse EXE non riscritte (`win.signAndEditExecutable=false`). Lo script `dist:zip` conserva questa scelta per il pacchetto di prova. L'EXE finale ha SHA-256 `2529b494f4123f152bce346051f7bd855ef95006424a561953cf17c49a3d1ba8`, uguale a `node_modules/electron/dist/electron.exe`. **L'eseguibile finale si è aperto sul PC e ha mostrato la schermata ACA per creare il proprietario**, con campi vuoti; screenshot `.tmp/e2e/live-local-engine/final-owner-first-run.png`. Non è una firma della distribuzione né una garanzia per altri PC con controlli applicativi.

Il ripristino aveva conservato l'impostazione di avvio dell'app installata dalla prima prova, distinta dal `boot: manual` del nuovo sorgente. Il backend già avviato portava alla pagina di accesso invece dell'onboarding: fermata soltanto `local_acasystem`, la prova finale ha mostrato correttamente la creazione del proprietario. Le opzioni installate sono state riallineate a `boot: manual, watchdog: false` tramite l'API Supervisor, con risposta `result: ok`, senza esporre il token nei log. Poi `apps rebuild local_acasystem` ha ricostruito l'immagine dal sorgente aggiornato, con «Command completed successfully». Il backend resta fermo fino alla creazione del proprietario. L'onboarding applicativo abiliterà nuovamente avvio automatico/watchdog come già provato nella QA. La [guida alla prova dell'app Windows](../riprogettazione/blocchi/01-pc-vm-prova-app.md) descrive l'uso del pacchetto e i prerequisiti.

Ultimo completamento dei materiali: notice e licenza MIT di `qrcode-generator` 2.0.4 in `frontend/public/licenses/qrcode-generator.txt`, confrontate con la revisione npm `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8`. La build Vite le include in `dist/licenses`; hash della copia uguale al sorgente. Ricostruiti frontend/Casa 3D, archivio client, sorgenti locali e ZIP. Il journal del bootstrap conferma `e7148653…` come archivio effettivamente trasferito alla VM; questo sostituisce il precedente `2b00518e…`. Codice applicativo invariato in quest'ultimo passaggio, aggiunta soltanto l'attribuzione.

## Verifiche ed evidenze

I comandi delle verifiche QR/backend/frontend sotto sono stati eseguiti dall'agente assegnato. Gli esiti complessivi Windows/core/Android/Java/design e delle build sono quelli comunicati dal coordinatore o descritti nella scheda Android collegata; non sono esecuzioni aggiuntive effettuate durante questo aggiornamento del report. Nessun esito attesta CI o compatibilità generale del prodotto.

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; lettura regole e studi U19-U24 | Superato | Lavoro preesistente da preservare. |
| Backend QR, account e bundle | Da `progetto/acasystem`: `npm run test --workspace backend -- src/__tests__/pairing.test.ts src/__tests__/clientBundle.test.ts` | 9/9 test | SQLite e HTTP locali: autenticazione, scadenza/monouso, copia portabile, isolamento utenti/SSE, dimensione/hash e percorsi del bundle. Non è una prova Android. |
| Frontend QR e sync, ultimo controllo | `npm run test --workspace frontend -- src/__tests__/qrAccountSync.test.tsx src/__tests__/qrPairing.test.ts src/__tests__/qrCodeSection.test.tsx` | 11/11 test | Handoff e stream simulati; comprende la regressione sulle revisioni concorrenti, fallita prima della correzione e superata dopo. |
| Regressioni Sistema/Aspetto/testi QR | `npm run test --workspace frontend -- src/__tests__/qrCodeSection.test.tsx src/__tests__/Appearance.test.tsx src/__tests__/SystemPage.test.tsx` | 33/33 test | Un gruppo distinto, con alcuni test già compresi nella riga precedente; non sommare come copertura unica. |
| Regressioni profili e preferenze per dispositivo | `useProfiles.test.ts` e `useSettingsSyncDevice.test.ts`, eseguiti nei gruppi mirati della sessione | Superate | Conservati i salvataggi per dispositivo, inclusa la qualità Casa 3D; non sono impostazioni da trasferire fra case. |
| Typecheck e lint frontend pertinenti | `npm run typecheck --workspace frontend`; ESLint sui sorgenti QR/sync/Sistema/Aspetto modificati | Superati | Lint frontend esclude le cartelle test per configurazione; i test sono compresi nel typecheck strict. |
| Lint backend pertinente | ESLint su `pairing.ts`, `pairingPortable.ts`, `pairingRoutes.ts`, `clientBundleRoutes.ts` e relativi test | Superato | Controllo mirato, non attestazione dell'intero backend. |
| Typecheck backend | `npm run typecheck --workspace backend` nell'esecuzione dell'agente | Non superato | Due dichiarazioni preesistenti di `subscription` in `src/__tests__/fakeHomeAssistant.ts`, righe 1282 e 1302. Non modificate da questo incarico; nessun successivo esito positivo documentato qui. |
| Avvio/setup core, controllo dell'agente | Da `progetto/client`: test `startup.test.ts`, `setup.test.ts`, `serverBundle.test.ts`, `localSetup.test.ts`; typecheck core | 40/40 e typecheck superato | Porte simulate: preferenza centrale/GitHub, hash/cache, catalogo locale, ripresa e assenza di aggiunta di repository remoto. |
| Suite complessive client | `npm run test -w windows`, `npm run test -w core`, `npm run test -w android`; controlli strict pertinenti | Windows 100/100; core 86/86; Android 17/17 | Esiti della sessione comunicati dal coordinatore; prove host, non collaudo di tutti i dispositivi. |
| Android nativo e design | Gradle `:app:testDebugUnitTest`, build APK; suite design/font/primitive | Java 16/16; design 48/48; APK prodotto | Dettagli, comandi e hash nella scheda Android. Nessuna installazione o prova della fotocamera su telefono/tablet. |
| Build applicative | Typecheck strict e build frontend; build Casa 3D; confezionamento Windows | Superati | Ultimo ZIP verificato con 7-Zip; apertura del relativo EXE e avvio a freddo effettivamente provati. |
| Eseguibile, motore e onboarding reali | Prova del coordinatore con `release/vm-current`: avvio VM, creazione owner nella UI ACA, casa, app locale, login e interfaccia 0.9.31 | Superato nel banco dedicato | VirtualBox era già installato; prova finale del distinto pacchetto `pc-vm-0.9.31` ancora in corso. |
| Ripristino dopo QA | Chiusura app, cancellazione sessioni/cache, shutdown, verifica proprietà e ripristino del VDI dalla copia pre-owner | Superato, hash coincidenti | Dopo la ricostruzione locale, nuovo avvio da VM spenta: form proprietario vuoto e onboarding user=false confermati. |
| Ultimo pacchetto e riapertura da VM spenta | EXE finale `pc-vm-0.9.31`, dopo `host shutdown` e verifica poweroff, senza ulteriori input di configurazione | Superato, 04:47–04:48 | VM running, stesso UUID e disco; schermata ACA proprietario vuota, backend fermo fino al proprietario. Chiusa l'app: VM lasciata running. Prova sul PC attuale, non su hardware diverso. |
| QR e condivisione reali | Generazione visiva, accettazioni API via LAN, replay; due finestre Electron isolate sullo stesso utente | Superati nei casi elencati sopra | Non provati lettura QR con camera Android, WebView o rete di un telefono fisico; tempi osservati non sono una garanzia. |

### Artefatti locali identificati

| Artefatto | Evidenza |
|---|---|
| ZIP Windows | `progetto/client/windows/release/pc-vm-0.9.31/Acasystem-PC-VM-0.9.31.zip` |
| Dimensione ZIP | 711.756.828 byte, ultima rigenerazione con runtime originale e notice MIT QR. Sostituisce i candidati precedenti. |
| SHA-256 ZIP | `4bd8511d7123a825ba8921cae743d2498dae27b93bb0a093c4acafa2501f21d6`, misurato sull'ultima versione. I precedenti `26763afb…` e `2bc13acf…` non identificano la consegna finale. |
| Eseguibile finale | `progetto/client/windows/release/pc-vm-0.9.31/win-unpacked/Acasystem.exe`; apertura e schermata proprietario provate. Estrarre l'intero ZIP: codice in `resources/app` e materiali in `resources/engine`; non basta copiare il solo EXE. |
| Materiali engine inclusi | `resources/engine/manifest.json`: HA OS 18.4, Core atteso 2026.10.4, app 0.9.31, `haos.vdi` e `acasystem-source.tgz`. |
| Integrità sorgenti locali | Il manifesto engine e il journal completato registrano `sourceSha256: e71486538f5bcd14f9951ab179fd2da0f2a55e28f0c4b39c3d8c07cb97128acc` per `acasystem-source.tgz`, 6.518.154 byte. È l'hash dell'archivio sorgente, non del file `manifest.json`. Archivio frontend client: 3.086.865 byte. |
| Controllo ZIP finale | `electron-winstaller/vendor/7z.exe t -bd -bb0`: exit 0, Everything is Ok; 134 file, 14 cartelle, dimensione estratta 1.365.610.179 byte. |
| APK Android | Artefatto debug, dimensione, ultimo hash e limiti nella [scheda dedicata](../riprogettazione/blocchi/02-design-e-qr-client-implementazione.md#apk-di-questa-consegna). Nessuna pubblicazione o installazione su dispositivo. |

### Limiti verificati e non verificati

- Sul PC di prova VirtualBox 7.2.4 era già installato. Non è stato realizzato né collaudato un installer automatico del prerequisito VirtualBox; la consegna non prova l'avvio su un PC che ne è privo.
- Il banco ha richiesto quattro CPU virtuali e 4 GB di RAM. Con due CPU è emerso un blocco di avvio DXE/AP nell'ambiente con hypervisor; il passaggio a quattro è un rimedio per questo banco, non una compatibilità generale verificata.
- Prima configurazione e build locale dipendono dalla disponibilità dei materiali e della rete. L'immagine base Docker `node:26-alpine` è un tag mobile: non presentare questa preparazione come build offline o riproducibile per digest.
- QR e API client del prototipo usano HTTP su IPv4 privata LAN. Non sono implementati accesso remoto, relay, Cloud, discovery o subentro automatico del motore. Una foto QR ricevuta fuori LAN non rende raggiungibile la centrale.
- La prova reale di sincronizzazione riguarda tema, accento e sfondo predefinito fra finestre Electron attive. Non certifica ogni modifica dei widget, il comportamento delle finestre sospese, il recupero da qualunque interruzione, l'esecuzione H24 o il comportamento su tutti i PC.
- Camera, ciclo di vita WebView, login, importazione e sincronizzazione su un Android fisico restano non eseguiti. Non confondere test nativi su host o APK prodotto con collaudo sul Tab M11.

## Controllo del diff e decisioni

La priorità Windows/VM deriva da U27; la distinzione account/copia da U28-U30, registrata in [ADR-0029](../decisions/ADR-0029-desktop-centrale-qr-design-condiviso.md). Cloud e relay restano confronti non adottati. La sola nuova dipendenza del frontend per questo flusso è `qrcode-generator` 2.0.4, fissata con il relativo lock; le dipendenze scanner Android sono registrate nella scheda dedicata. Non sono autorizzati refactor di schermate estranee, aggiornamenti generici o modifiche delle VM storiche.

I nuovi moduli Windows/core/QR e i minimi collegamenti a Sistema, autenticazione e impostazioni convivono con numerose modifiche preesistenti. Controllati diff, materiali e pulizia come sotto. Non risultano da questo lavoro commit, push, deploy o nuova release pubblica.

Controllo del coordinatore sul censimento iniziale di 1.643 file applicativi: 32 file esistenti cambiati, tutti nei collegamenti backend/QR/design e client di questo incarico; nessun file del censimento mancante. I file TV e le altre modifiche preesistenti risultano conservati rispetto a quell'istantanea. Nuovi moduli/test/asset esaminati nel perimetro. `git diff --check` mirato con `cr-at-eol` supera il controllo; quello globale senza tale impostazione segnala numerose righe CRLF preesistenti in fixture estranee, non normalizzate. Nessun commit o push.

### Materiali e fonti primarie

- [HA OS 18.4, VDI ufficiale](https://github.com/home-assistant/operating-system/releases/download/18.4/haos_ova-18.4.vdi.zip), acquisito il 2026-10-30: archivio 560.370.635 byte, SHA-256 `e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be`. VDI pulito 973.210.112 byte, SHA-256 `8f42700dd2ffd5429dabde8cf70655301886ff9f3ea2010be21a989e11cda66c`. Materiale locale verificato in `backup/dispositivi/haos/haos_ova-18.4.vdi`; disco operativo distinto nel profilo Windows.
- [Percorso Supervisor nell'host HA OS 18.4](https://github.com/home-assistant/operating-system/blob/18.4/buildroot-external/rootfs-overlay/usr/sbin/haos-supervisor); Supervisor 2026.10.3 usa `apps/local`. [CLI 5.6.0, ricostruzione app](https://github.com/home-assistant/cli/blob/5.6.0/cmd/apps_rebuild.go), [Supervisor, ripristino dello stato dopo rebuild](https://github.com/home-assistant/supervisor/blob/2026.10.3/supervisor/apps/app.py), consultati il 2026-10-30.
- [Licenza QR alla revisione npm fissata](https://github.com/kazuhikoarase/qrcode-generator/blob/83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8/LICENSE). Inter/OFL e ZXing/Apache 2.0 nella scheda design/Android. Non è una verifica generale di conformità.
- Confezionamento letto nel codice locale `app-builder-lib` 26.17.0: `out/platformPackager.js`, `out/electron/ElectronFramework.js`, `out/winPackager.js`. Le scelte della variante ZIP preservano il runtime esistente e non modificano policy Windows; la firma commerciale rimane da risolvere.

## Chiusura e punto di ripresa

**Concluso il lotto di prova, 2026-10-30 04:48 circa.** Eseguibile Windows e ZIP pronti, design condiviso e APK Android prodotti. La prova effettiva dalla VM spenta ha riutilizzato UUID `17595a8d-355d-4c72-b4e5-38a60762f900` e disco `91e68529-7854-46c1-8fed-18e56429d5de`, presentando la creazione del proprietario ACA. Nessun altro URL aperto nelle webContents; campi vuoti. `/api/onboarding` conferma tutti i passi non completati e la porta ACA non risponde prima della creazione del proprietario. Finestra chiusa e VM lasciata running; le VM storiche restano estranee. Evidenza visiva finale: `.tmp/e2e/live-local-engine/final-cold-start-owner.png`.

Per l'utente: aprire l'EXE della [guida](../riprogettazione/blocchi/01-pc-vm-prova-app.md), creare il proprio account, confermare la casa e accedere. La prova QA ha già completato quel percorso con un proprietario temporaneo poi rimosso tramite ripristino; non lascia credenziali di prova da usare. La centrale corrente contiene l'immagine locale ricostruita dagli ultimi materiali verificati. Nessuna pubblicazione o commit.

Restano il collaudo fisico Android/QR/permessi/WebView, la stabilità H24 e le lentezze NEM/console osservate sul banco, la firma Windows e l'installazione VirtualBox su PC nuovi. Questi limiti non sono risolti dai test unitari o dal pacchetto generato. Il typecheck backend resta bloccato dal difetto preesistente documentato. Non sono assegnati automaticamente interventi su questi filoni: proseguire dalle prove e dalle prossime istruzioni dell'utente. La ripresa notturna `aca-windows-vm-e-design` viene fermata alla consegna.

**Annotazione conclusiva 2026-10-30:** ripresa notturna confermata `PAUSED` dal tool e dal relativo file di configurazione. Limite della VM registrato come [ISSUE-129](../project-status.md#issue-129--rallentamenti-del-guest-ha-os-sul-banco-windowsnem), proposta di approfondimento non assegnata. Controllo dei collegamenti locali su nove documenti: i nuovi collegamenti della consegna esistono; in LEGGIMI rimane un riferimento storico già presente in HEAD a `components/system/edit/WidgetTray.tsx`, non più esistente e non corretto fuori incarico. Il controllo mirato del diff supera la verifica considerando CRLF; HEAD e modifiche preesistenti conservati.

## Annotazione successiva del 2026-10-30

Il successivo [REP-20261030-010](REP-20261030-010-rallentamenti-vm-windows.md) aggiunge il QR web su richiesta U32 e sostituisce gli artefatti locali nei medesimi percorsi; hash correnti nel suo riepilogo conclusivo. Conservati sopra gli esiti e gli identificativi della consegna precedente. Le ulteriori prove VM non hanno risolto ISSUE-129: varianti ritirate, baseline ripristinata e centrale spenta senza owner QA. Aggiornamento del software host soltanto proposto, non eseguito.

### Annotazione U33 successiva, 2026-10-30

Su autorizzazione esplicita successiva, VirtualBox è stato aggiornato a 7.2.22 e le prove ripetute. Installazione riuscita, ma anomalie dei timer ancora presenti; centrale arrestata normalmente, prossimo confronto dopo riavvio Windows controllato dall’utente. Fa fede la sezione U33 del [report010](REP-20261030-010-rallentamenti-vm-windows.md#ripresa-autorizzata-u33-2026-10-30); questa annotazione conserva lo storico precedente.
