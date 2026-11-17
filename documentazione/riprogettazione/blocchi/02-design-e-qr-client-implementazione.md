# Design condiviso e client Android con QR

Aggiornato: 2026-10-30. Seguito esecutivo di [U26-U30](../diario/2026-10-30.md#u26-secondo-lavoro-design-condiviso), entro [ADR-0029](../../decisions/ADR-0029-desktop-centrale-qr-design-condiviso.md) e [REP-20261030-009](../../reports/REP-20261030-009-windows-vm-automatica-design-condiviso.md). Questa scheda documenta la porzione design/client Android; avanzamento della VM, installazione dell’app ACA sulla centrale e risultato Windows complessivo restano nel report.

**Stato:** sorgenti implementati, build locali e prove su host riuscite. APK debug generato. Nessun APK installato su telefono o tablet, nessuna prova della fotocamera o della WebView su un dispositivo Android reale. Android è qui un client della centrale: non è stata realizzata l’esecuzione di HA sul tablet.

## Fonte comune del design

La fonte è `progetto/acasystem/frontend/src/design/`. L’ingresso `base.css` importa font, token e regole HTML di base; i temi dell’app e le schermate locali dei due contenitori usano questa base.

| Sorgente | Responsabilità |
|---|---|
| `design/tokens.css` | Importa le fonti esistenti `themes/acasystem/tokens.css` e `themes/kit2/tokens.css`. Non introduce una seconda palette. Le modifiche preesistenti ai token sono state preservate. |
| `design/fonts.css`, `design/fonts/` | Inter dalla dipendenza già fissata `@fontsource/inter` 5.3.0: pesi 300/400/500, sette sottoinsiemi, 21 WOFF2 per 288.084 byte. Licenza OFL conservata in `fonts/LICENSE`. |
| `design/html.css` | Reset minimo nel layer `base`: box sizing, font dell’HTML e dei controlli, margine del body. Gli stili dei componenti restano nei propri livelli. |
| `frontend/src/themes/acasystem/index.css`, `themes/kit2/index.css` | Collegamento della base al frontend, senza riscrivere pagine o primitive React. |
| `progetto/client/windows/shell/shell.css` | Presentazione delle schermate locali: tipografia, spaziature e superfici derivate dai token ACA/Kit 2. Usato anche dalla shell Android. |

`progetto/client/scripts/copy-design.mjs` prepara le copie necessarie alla distribuzione: copia font e CSS e risolve gli import dei due file di token. Windows lo richiama con `windows/scripts/prepare-design.mjs`; Android con `android/scripts/build-web.mjs`. Le destinazioni generate sono `windows/shell/design-aca/` e `android/www/design-aca/`, escluse da Git. Si modificano i sorgenti, non queste copie né `dist`.

I font delle schermate locali sono inclusi negli artefatti: per caricarli non occorre contattare GitHub o Google Fonts. Questo non rende disponibili offline le API della casa. Materiali, componenti e layout applicativi specifici rimangono separati dalla base condivisa; le reference originali non sono state modificate.

## Percorso Android e distinzione U30

Il primo avvio senza casa associata mostra **Scansiona il codice QR**, senza il precedente wizard desktop per IP/proprietario. La fotocamera viene richiesta dopo l’azione dell’utente. Dopo un QR ACA valido compaiono **Collega account** e **Importa layout**.

| Scelta | Comportamento implementato |
|---|---|
| Collega account (`account`) | Salva l’endpoint della centrale letto dal QR e consegna al frontend l’identità attesa dell’account. Il QR non trasferisce password o token HA: l’accesso personale resta necessario. La sincronizzazione riguarda la stessa casa e l’utente autenticato corrispondente; l’identità dell’emittente non autentica da sola il nuovo client. |
| Importa layout (`configuration`) | Acquisisce una copia dell’interfaccia, anche da un’altra casa. Non salva l’endpoint sorgente come propria casa e non sostituisce la sessione del destinatario. La copia non resta sincronizzata con l’amico. I widget devono essere collegati ai dispositivi propri; il payload portabile non trasferisce i binding HA del mittente. |

Se il destinatario importa un layout al primo avvio e non ha ancora una propria casa, la copia rimane in attesa e il client chiede poi il QR Account della propria casa. Il pacchetto account viene consegnato prima del layout, così la copia può essere applicata alla destinazione corretta. Le foto locali in IndexedDB non sono incluse nel trasferimento.

L’endpoint sorgente serve a raggiungere l’API che accetta l’invito. Il primo percorso implementato accetta solo HTTP su IPv4 privata della LAN, escludendo loopback, credenziali nell’URL, percorsi arbitrari e parametri duplicati. Non implementa discovery, migrazione del motore, elezione master o accesso remoto: inviare la foto del QR fuori casa non rende raggiungibile la centrale.

## Sorgenti e confini tecnici

| Percorso nel repository | Contenuto |
|---|---|
| `progetto/client/core/src/pairing.ts` | Parser isolato dell’URI `acasystem://pair` versione 1, con `endpoint`, `house` e `invite`. Non modifica configurazione o sessione. |
| `progetto/client/android/web/index.html`, `web/main.ts` | Avvio, scansione, due scelte, errori e prosecuzione verso la propria casa. |
| `progetto/client/android/web/pairingFlow.ts` | POST a `/api/pairing/accept`, controllo della risposta e salvataggio del pacchetto. Solo `account` chiama `saveConfig`; `configuration` conserva la destinazione esistente. Non inoltra Bearer HA alla sorgente dell’invito. |
| `progetto/client/android/web/capacitorPorts.ts` | Contratti `scanPairingCode`, `savePairing`, `pairingState` e porte HTTP/cache del client. |
| `progetto/client/android/android/app/src/main/java/it/acasystem/client/AcaShellPlugin.java` | Richiesta del permesso CAMERA e lettura QR nativa, con annullamento, fotocamera assente e permesso negato distinti. Il ponte resta nella pagina locale del contenitore, non nella UI scaricata. |
| Stessa cartella Java: `PairingStore.java`, `LocalServer.java` | Coda persistente di handoff fino all’ACK. GET `/__acasystem/pairing` e POST `/__acasystem/pairing/ack`; l’ACK deve corrispondere al primo pacchetto. Il proxy inoltra anche gli eventi SSE. |
| `progetto/client/core/src/startup.ts` | Android usa `preferServerBundle: true`: manifest e archivio dalla centrale associata, compatibilità/versioni/cache e verifica SHA-256. Non richiede di pubblicare il nuovo frontend su GitHub per questa consegna locale. |
| `progetto/acasystem/backend/src/pairingPortable.ts`, `frontend/src/api/qrPairing.ts`, `frontend/src/hooks/qrAccountSync.ts` | Sanitizzazione del layout, consumo idempotente dell’handoff e sincronizzazione dell’account: porzioni integrate con il lavoro backend/frontend del medesimo report. Le prove host del contenitore non dimostrano da sole l’intero collegamento Android reale. |

Il lettore è **ZXing Android Embedded 4.3.0**, con ZXing Core **3.4.1** risolto da Gradle. La decodifica è locale; nessun servizio esterno di lettura QR è stato introdotto. Dipendenza esatta in `android/app/build.gradle`, permesso e activity in `AndroidManifest.xml`, licenza e attribuzioni nelle risorse `res/raw/zxing_license.txt` e `zxing_notice.txt`.

Fonti primarie consultate il 2026-10-30: [sorgenti e istruzioni v4.3.0](https://github.com/journeyapps/zxing-android-embedded/tree/v4.3.0), [ScanOptions](https://github.com/journeyapps/zxing-android-embedded/blob/v4.3.0/zxing-android-embedded/src/com/journeyapps/barcodescanner/ScanOptions.java), [licenza Apache 2.0 della release](https://github.com/journeyapps/zxing-android-embedded/blob/v4.3.0/COPYING), [ZXing Core 3.4.1](https://github.com/zxing/zxing/tree/zxing-3.4.1). La copia OFL di Inter è inclusa nei sorgenti locali già citati.

## Verifiche locali effettivamente eseguite

Gli esiti seguenti provengono dalle esecuzioni locali della sessione del 2026-10-30. Non attestano CI, distribuzione pubblica o collaudo hardware.

| Directory di lavoro e comando/controllo | Esito ed evidenza |
|---|---|
| `progetto/acasystem`: `npm.cmd run build -w frontend` | Typecheck strict e build Vite riusciti dopo il collegamento della base condivisa; avviso sui chunk grandi già presente. |
| Frontend: suite `MetalMaterial.test.jsx`, `KitTypography.test.tsx`, `KitStates.test.tsx`, `KitOverlays.test.tsx` | 48/48 test riusciti durante la fase design. Controllo tipografia: zero violazioni sui 621 file allora esaminati. |
| Staging design Windows e Android | Controllo locale di import CSS, URL dei font e corrispondenza dei byte dei token/font con le fonti: sette CSS e 21 WOFF2 per contenitore. |
| `progetto/client`: `npm.cmd run test -w core` | Ultima esecuzione 04:04:38: otto suite, **86/86 test** riusciti, inclusi parser e avvio/cache del nucleo aggiornato. Typecheck core eseguito con successo durante l’intervento. |
| `progetto/client`: `npm.cmd run test -w android`, `npm.cmd run typecheck -w android` | **17/17 test** in tre suite e typecheck riusciti, ripetuti dopo l’allineamento delle due etichette. QR estranei, annullamento/permesso negato, primo avvio, account e conservazione della casa in import sono provati con porte native simulate. |
| `progetto/client/android`: `node scripts/gradle.mjs :app:assembleDebug :app:testDebugUnitTest --no-daemon` | Build e **16/16 test Java** riusciti. XML in `android/app/build/test-results/testDebugUnitTest/`: BrowserReset 1, BundleStore 5, LocalServer 7, PairingHandoff 2, QrDecoder 1. Il decoder legge una matrice QR sintetica; il test SSE usa una sorgente HTTP finta e controlla la consegna del primo evento prima della fine della risposta. |
| `progetto/client`: `npm.cmd run sync -w android`; poi `progetto/client/android`: `node scripts/gradle.mjs :app:assembleDebug --no-daemon` | Ultima rigenerazione dopo le etichette Collega account/Importa layout: entrambe riuscite; Gradle 18 s. Nessun cambiamento Java successivo ai test nativi. |
| `progetto/client/windows`: `node e2e/shell-layout.check.mjs` | Solo HTML/CSS con Electron offscreen e JavaScript della pagina disabilitato, senza main ACA o VM: screenshot ispezionati a 1281×802 e 390×846, font Inter caricato e nessun overflow orizzontale. |
| Preview Android con Electron offscreen | HTML/CSS/JS compilati reali e plugin Capacitor simulato: viste scansione e scelta ispezionate a circa 390 px, anche dopo l’ultimo cambio testi; font locale caricato, nessun errore JS o overflow. Non è una prova WebView Android. |

I test Android sono in `web/__tests__/capacitorPorts.test.ts`, `pairingFlow.test.ts`, `pairingUi.test.ts`; quelli Java sono nella corrispondente cartella `android/app/src/test/java/it/acasystem/client/`. Le immagini locali escluse da Git sono in `progetto/client/windows/.tmp/e2e/shell-layout/wizard-1280.png`, `wizard-390.png` e `.tmp/design-aca/android-qr-scan-390.png`, `android-qr-choice-390.png`. Il primo tentativo con Edge headless non è partito; le evidenze visive riuscite usano Electron già disponibile, senza installare un browser.

## APK di questa consegna

| Campo | Valore |
|---|---|
| Artefatto locale | `progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk` |
| Tipo | APK debug, versione shell 0.1.0; non pubblicato e non installato su dispositivo |
| Ultima generazione | 2026-10-30 04:04:05, Europe/Rome |
| Dimensione | 7.684.685 byte |
| SHA-256 | `E09F208D5F0C7772719647E5FC6C12ECF7BD6A0CDF146704EB354F91E727F57D` |

L’archivio finale è stato aperto per controllare la presenza delle etichette definitive, dei 21 font locali e delle risorse di licenza/attribuzione ZXing. Il `startup.js` incorporato coincide con il compilato corrente e include la correzione `expectedHash`. Questo hash sostituisce quelli degli APK precedenti della stessa sessione e non è un identificatore stabile delle build future.

### Aggiornamento APK del 2026-10-30, ore 13:21:58

Lo stesso percorso contiene ora il successivo APK debug della shell 0.1.0, generato alle **13:21:58 Europe/Rome**, dimensione **7.684.685 byte**, SHA-256 **`8870AD539EA75B0B0D4FD59D27923BDF39B1A1D0A750034F47716F52781112E7`**. Dimensione, orario del file e hash sono stati ricontrollati in sola lettura. Per identificare questo artefatto usare il nuovo hash; la tabella precedente conserva i dati della consegna delle 04:04:05. Questo aggiornamento non attesta installazione o prove su Android fisico e non rettifica lo storico del report REP-20261030-009.

## Limiti e punto di ripresa

Restano da provare sul dispositivo Android destinato al test: apertura/ritorno della fotocamera, permessi concessi/negati dal sistema, lettura di un QR mostrato sul PC, ciclo di vita della WebView, login personale, import e sincronizzazione attraverso la rete reale. Nessun tablet o telefono è stato usato per questi controlli. Le prove simulate e la produzione dell’APK non attestano questi risultati.

Non sono stati implementati HA su Android, Cloud/relay, associazione fuori LAN, discovery automatica o subentro del motore. La prima verifica concreta successiva è il percorso PC predisposto → QR → APK sul dispositivo di prova, conservando la distinzione fra collegamento dell’account e copia del layout e registrando separatamente i risultati reali nel report.
