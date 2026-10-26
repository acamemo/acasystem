# REP-20261026-002 — App client di Acasystem per PC Windows e Android (documento di partenza)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-002: **documento di partenza** per l'app client di Acasystem per Windows e Android, da pianificare e realizzare in una chat dedicata. |
| Stato | **In corso (2026-10-26):** C6 (Android) realizzata con 6 test web e 12 JUnit, APK firmato, nessuna prova su dispositivo; zip Windows pronto per il pilota. Testo precedente: C1 applicata. C5 realizzata (guscio Electron, 69 test e prova end-to-end 8/8), ma l'installatore NSIS è bloccato da Smart App Control: serve una decisione sulla distribuzione. Testo precedente: ADR-0023 accettata, C1 (verifica) e C4 (nucleo, 47/47 test) fatte; servono le decisioni su C1. Testo precedente: **Piano scritto, in attesa di conferma (2026-10-26, chat dedicata).** Q-A1…Q-A10 hanno risposta (sezione «Risposte alle domande Q-A»). L'architettura A diventa «A-ibrida»: interfaccia scaricata da GitHub nel client, server sul mini PC. Il piano è nella sezione «Piano C0-C8». Prima di C1 servono le conferme P-1…P-4. Nessun codice. |
| Data | 2026-10-26 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`). |
| Commit di partenza | `4e198c5` (`master`, che segue `origin/main`). L'albero di lavoro contiene modifiche non committate dei flussi 0.9.28-0.9.30 e D1 (vedi `project-status.md`): da preservare. |
| Richiesta di riferimento | Vedi «Richiesta dell'utente» sotto. |
| Autorizzazione | La richiesta dell'utente autorizza a progettare e realizzare l'app client. Scelte dell'utente del 2026-10-26: architettura **«A. Finestra su Acasystem»** e **«documento qui e chat nuova»**. In questa chat è autorizzato solo questo documento con la sua riga nell'indice. Restano esclusi codice, GitHub, firme, Play Store e acquisti. |

## Richiesta dell'utente

Testo del 2026-10-26, riportato fedelmente:

> Ho installato Home Assistant OS su un PC Dell (indirizzo IP: `http://192.168.1.184:8123/onboarding.html`). Ora vorremmo creare un'applicazione client per PC e Android dedicata ad acasystem.
>
> 1. Applicazione nativa (Desktop e Mobile): sviluppare un'app per Windows (utilizzando ad esempio Electron per generare un installer) e una versione per Android. L'app deve consentire all'utente di inserire l'indirizzo IP di Home Assistant al primo avvio. Una volta inserito l'IP, l'app deve caricare direttamente l'interfaccia di accesso di Home Assistant personalizzata con la grafica/branding di acasystem.
> 2. Sistema di aggiornamento automatico: l'applicazione deve effettuare il fetch dell'ultima versione direttamente da un repository GitHub. Il controllo e l'aggiornamento devono avvenire automaticamente ogni 24 ore.
> 3. Flusso di installazione (Wizard): l'installer di acasystem guida l'utente chiedendo inizialmente l'IP di Home Assistant. Salvato l'IP, l'applicazione si avvia puntando correttamente all'istanza di HA con l'interfaccia di acasystem.
>
> (Se necessario, sposteremo la generazione del piano e la scrittura del codice in una chat dedicata per procedere passo dopo passo alla creazione dell'app e dell'installer).

**Risposte dell'utente del 2026-10-26 alle due domande dell'agente:**
- architettura: «A. Finestra su Acasystem (Consigliata)»;
- dove lavorare: «Sì, documento qui e chat nuova (Consigliata)».

## Precisazioni che l'utente ha visto prima di scegliere [D]

1. **L'app non si collega alla pagina di accesso di Home Assistant.**
   - La pagina di accesso di HA non si personalizza con la grafica di Acasystem.
   - Acasystem ha già la propria pagina di accesso, che entra in HA: `frontend/src/pages/connect/` (`ConnectPage.tsx`, `LoginForm.tsx`, `TokenForm.tsx`, `useHaLogin.ts`).
   - Acasystem ha anche una parte server: proxy `/ha`, WebSocket, database `tunet.db` e la facciata dei dispositivi di D1 con l'identità di servizio di ADR-0022, che non deve finire sui telefoni.
2. **Con l'architettura A, l'app è una finestra su Acasystem.**
   - Al primo avvio chiede l'indirizzo del **mini PC**, che ospita sia HA sia Acasystem.
   - Poi apre Acasystem servito da lì: in futuro come app di HA OS (REP-20261026-001), oggi dal banco del PC (`http://192.168.1.7:3002`).
   - L'interfaccia si aggiorna in un solo posto. L'app client cambia raramente.
3. **Aggiornamenti automatici ogni 24 ore:**
   - **Windows:** fattibile. Con un repository privato, però, la chiave finirebbe dentro l'app, come in REP-20261026-001, quindi serve un repository pubblico dei soli installatori.
   - **Android fuori dal Play Store:** l'app può scaricare la nuova versione, ma Android chiede sempre conferma all'utente prima di installarla. Gli aggiornamenti sono del tutto automatici solo con il Play Store o con la gestione aziendale dei dispositivi (MDM).
4. **Firme:**
   - senza un certificato di firma del codice, Windows mostra «editore sconosciuto»;
   - Android richiede una chiave di firma da custodire: se si perde, le installazioni esistenti non si aggiornano più.

## Obiettivo e perimetro (proposta da confermare nella chat dedicata)

**Obiettivo.** Due app «finestra», una per Windows e una per Android, che:
1. al primo avvio mostrano una procedura guidata che chiede l'indirizzo del mini PC. Indirizzo IP o nome; la porta di Acasystem ha un valore predefinito ed è modificabile solo nelle impostazioni avanzate;
2. verificano che a quell'indirizzo risponda Acasystem, con `GET /api/health` che deve rispondere `{"status":"ok","version":…}`;
3. salvano l'indirizzo e da lì in poi aprono Acasystem a schermo intero, con un modo per cambiare l'indirizzo e una pagina chiara se il mini PC non risponde;
4. controllano ogni 24 ore se c'è una versione nuova dell'app e la installano: su Windows senza intervento, su Android con la conferma richiesta dal sistema.

**Collegamenti:**
- REQ-15 (tablet: configurazione rapida e modalità kiosk; `product.md:158` cita «Capacitor APK o Fully Kiosk»);
- D-G12 di REP-20261026-001 (la PWA a schermo intero richiede HTTPS: l'app risolve il problema sul tablet);
- REQ-18, ADR-0021 e ADR-0022 (la chiave di servizio resta sul server);
- REP-20261026-001 per Acasystem come app di HA OS (decisioni D-G1…D-G13 ancora in sospeso).

**Esclusioni:**
- nessuna modifica all'app web Acasystem, salvo quanto la chat dedicata ritenga indispensabile e autorizzato;
- nessun pacchetto di Acasystem per HA OS (è REP-20261026-001);
- nessuna pubblicazione sul Play Store;
- nessun acquisto di certificati;
- nessun flusso GitHub Actions né repository nuovo senza un'autorizzazione esplicita;
- nessuna credenziale di HA dentro l'app client.

## Proposta tecnica di partenza [P, da verificare nella chat dedicata]

- **Windows: Electron**, come suggerito dall'utente.
  - Una finestra che carica solo l'origine configurata (`http://<indirizzo>:<porta>`), con `contextIsolation` attivo, `nodeIntegration` spento e la navigazione limitata a quell'origine.
  - Procedura guidata locale al primo avvio e opzione schermo intero o kiosk.
  - Installatore con electron-builder (NSIS).
  - Aggiornamenti con electron-updater da GitHub Releases, controllati all'avvio e ogni 24 ore.
- **Android: Capacitor oppure WebView nativa.**
  - Traffico HTTP in chiaro consentito solo per la rete locale (network security config). TWA non va bene: richiede HTTPS e la verifica del dominio.
  - Schermo sempre acceso e modalità immersiva. Bloccare il dispositivo sull'app (lock task) richiede un proprietario del dispositivo o un MDM.
  - Aggiornamento: download dell'APK da GitHub Releases e installazione con PackageInstaller, con la conferma dell'utente.
- **Dove stanno gli installatori:** un repository pubblico dei soli installatori e APK, senza sorgenti né segreti, oppure un altro server. Va deciso con D-G1 e D-G2 di REP-20261026-001.
- **Sicurezza:**
  - l'app non conserva password né token di HA, perché accesso e sessione restano quelli di Acasystem web;
  - niente pagine esterne dentro la finestra;
  - le pagine di altre origini si aprono nel browser di sistema o si bloccano.

## Domande aperte per la chat dedicata (con l'opzione consigliata)

- **Q-A1 Android:** (a) **Capacitor, consigliata** (già citata in `product.md`); (b) WebView nativa in Kotlin.
- **Q-A2 Windows:** (a) **Electron, consigliata** (richiesta dell'utente); (b) Tauri, più leggero.
- **Q-A3 dove pubblicare installatori e APK:** (a) **repository pubblico dei soli installatori, consigliata**; (b) repository privato con una chiave nell'app, sconsigliata. Va legata a D-G1 e D-G2.
- **Q-A4 aggiornamenti Android:** (a) **download nell'app con un tocco di conferma, consigliata per il pilota**; (b) Play Store con test chiuso; (c) MDM.
- **Q-A5 firma Windows:** (a) **nessuna nel pilota**, con l'avviso «editore sconosciuto»; (b) certificato a pagamento.
- **Q-A6 chiave di firma Android:** chi la custodisce e dove sta la copia di sicurezza, fuori da Git.
- **Q-A7 procedura guidata:** (a) **solo indirizzo, con porta predefinita, consigliata**; (b) indirizzo e porta; (c) ricerca automatica in rete, in futuro.
- **Q-A8 più impianti in una stessa app** (per esempio il PC dell'installatore): (a) **un impianto per app nel pilota**; (b) un elenco di impianti.
- **Q-A9 kiosk Android (REQ-15):** (a) **schermo acceso e modalità immersiva subito, lock task in seguito**; (b) tutto subito.
- **Q-A10 rete:** (a) **solo rete locale, HTTP in chiaro consentito**; (b) HTTPS sul mini PC, legato all'accesso da fuori (D-C15).

## Risposte alle domande Q-A (chat dedicata, 2026-10-26)

Risposte dell'utente, raccolte una per volta. Le parole riportate tra virgolette sono testuali.

| Domanda | Risposta |
|---|---|
| Q-A1 Android | **Capacitor.** |
| Q-A2 Windows | **Electron.** |
| Q-A3 fonte e modello | «repo pubblico dove prendere la webapp e scaricare in automatico aggiornamenti, le versioni windows e android facciamo un installer senza l'app scaricata, l'app si scarica o si aggiorna in automatico all'avvio e controlla la versione di acasystem in automatico per rilevare eventuali aggiornamenti dalla repo». Chiarimento: «scarica l'ultima versione di acasystem da github, invece l'app all'avvio richiede l'indirizzo ip che fornisce HA OS, in maniera tale che inserito l'ip parte l'interfaccia e accesso aca». Sul server: **«Sul mini PC HA OS»**. Sulla sede: «rendiamo pubblico acamemo/acasystem, apk e installer windows li passo io da una pennetta o lo carico su un drive per il momento poi quando sarà il progetto più avanzato si pubblicano sugli store o si fa un sito web dove scaricare gli installer». |
| Q-A4 aggiornamento del guscio | **A mano, con un avviso.** Reinstallazione da chiavetta o drive; se l'interfaccia richiede un guscio più recente, l'app mostra «Aggiorna l'app». |
| Q-A5 firma Windows | **Nessuna nel pilota** (avviso SmartScreen «editore sconosciuto»). |
| Q-A6 chiave Android | **Generata dall'agente fuori da Git e custodita dall'utente** nel proprio gestore di password, con una copia offline. Non compare in chat né nel repository. |
| Q-A7 procedura guidata | **Solo l'IP di HA OS.** Porta di Acasystem predefinita, modificabile nelle impostazioni avanzate; controllo `/api/health` prima di salvare. |
| Q-A8 impianti | **Uno per app.** |
| Q-A9 kiosk | **Niente kiosk:** app normale a schermo intero, senza schermo sempre acceso né modalità immersiva forzata. REQ-15 resta da fare in seguito. |
| Q-A10 rete | **Solo rete locale, HTTP.** HTTPS solo verso GitHub; l'accesso da fuori resta D-C15. |

**Conseguenza: architettura «A-ibrida»** [valutazione dell'agente; da registrare in un ADR in C0]:
- **Guscio:** l'installatore contiene solo il guscio, con procedura guidata, scaricatore, cache e pagine di errore.
- **Interfaccia:** il guscio scarica il pacchetto statico di Acasystem web dalle GitHub Releases di `acamemo/acasystem` e lo serve in locale.
- **Server:** l'interfaccia parla con il server Acasystem sul mini PC HA OS (proxy `/ha`, WebSocket, `/api`, database, facciata D1). La chiave di servizio di ADR-0022 resta sul server.
- **Differenza rispetto alla A originaria:** l'interfaccia non arriva più dal mini PC, quindi Acasystem web e server vanno modificati (C2).
- **Precisazioni del 2026-10-26 superate:** il punto 2 e l'obiettivo n. 4 sono superati per la parte sull'aggiornamento del guscio da GitHub ogni 24 ore. Restano validi il resto e le esclusioni, salvo C1 e C3, che l'utente ha chiesto.

**Osservazioni sul codice** (`4e198c5` più l'albero di lavoro):
- il server non ha CORS (`backend/src/server.ts`);
- `/casa3d/` è servito dal server;
- il login di HA usa un `client_id` derivato dall'origine della pagina (`frontend/src/api/haLogin.ts:84-94`);
- il repository tracciato contiene `documentazione/` (150 file) e `progetto/` (1320 file): renderlo pubblico rende pubblica anche la documentazione interna.

## Punti da confermare prima di C1 [P, proposte dell'agente]

- **P-1 Versione dell'interfaccia da scaricare.**
  - (a) **Consigliata: quella uguale alla versione del server**, letta da `/api/health`. Se su GitHub c'è una versione più recente, l'app mostra «È disponibile Acasystem X: aggiorna il mini PC». L'aggiornamento del server è compito di REP-20261026-001.
  - (b) Sempre l'ultima di GitHub: rischio di un'interfaccia nuova con un server vecchio, con API diverse.
- **P-2 Integrità del pacchetto.**
  - (a) **Consigliata:** manifesto con SHA-256 e firma Ed25519. La chiave pubblica sta nel guscio, quella privata la custodisce l'utente come il keystore. Un account GitHub compromesso non basterebbe a mandare codice ai clienti.
  - (b) Solo SHA-256 dal manifesto: protegge da download corrotti, non da un rilascio malevolo.
- **P-3 Cosa diventa pubblico.** Prima di rendere pubblico `acamemo/acasystem` serve una scansione dei segreti e dei dati personali su tutto lo storico.
  - (a) **Consigliata:** pubblicare tutto dopo la scansione e la tua revisione dell'elenco.
  - (b) Togliere `documentazione/` dal repository pubblico: richiede una riscrittura della storia o un repository nuovo, ed è un'altra decisione.
  - La pubblicazione la fai tu, oppure io su tuo ordine esplicito.
- **P-4 Primo avvio senza internet.**
  - (a) **Consigliata:** il primo avvio richiede internet; poi l'app usa il pacchetto in cache se GitHub non risponde.
  - (b) L'installatore include anche un pacchetto di riserva: contraddice «installer senza l'app».

**Risposte dell'utente del 2026-10-26:**
- **P-1:** «Sempre l'ultima».
- **P-2:** «Solo SHA-256».
- **P-3:** «Senza documentazione/». Il modo (repository nuovo oppure riscrittura della storia) è ancora da scegliere.
- **P-4:** «Sì, poi cache».

**Conseguenze:**
- **P-1:** serve una protezione dalla combinazione di un'interfaccia nuova con un server vecchio (vedi P-1 bis).
- **P-2:** un rilascio malevolo su GitHub arriverebbe ai client. Il rischio è accettato dall'utente; la difesa è la sicurezza dell'account, con 2FA.

**Risposte successive dell'utente:**
- **P-3 bis:** «Repo pubblico nuovo». Un repository pubblico nuovo, con nome da fissare in C1 (proposta: `acamemo/acasystem-app`), che contiene solo `progetto/acasystem` con uno storico pulito e le Releases. `acamemo/acasystem` resta privato e invariato; non si riscrive nessuna storia condivisa.
- **P-1 bis:** «Resta sull'ultima compatibile». Il manifesto dichiara `minServer`. Se il server è più vecchio, l'app usa l'ultima versione compatibile, dalla cache o da GitHub, e avvisa «Aggiorna il mini PC».

Nel piano, «Releases di `acamemo/acasystem`» va letto come «Releases del repository pubblico nuovo».

## Piano C0-C8 [P, da confermare]

Ogni tappa si chiude con test, verifiche registrate in `verification.md` e conferma dell'utente prima della successiva. Le parti indipendenti (C4 e C2) possono procedere in parallelo.

| Tappa | Contenuto | Tocca | Dipende da |
|---|---|---|---|
| C0 | ADR-0023 «App client A-ibrida» (guscio, pacchetto da GitHub, server sul mini PC, P-1…P-4), da accettare dall'utente. Aggiornare REQ-15 e `product.md` solo per quanto deciso. | Documentazione | P-1…P-4 |
| C1 | Preparazione della pubblicazione del repository: scansione dei segreti su tutto lo storico (strumento da scegliere, senza installazioni globali), ricerca di IP, nomi e dati personali, elenco per l'utente. Pubblicazione solo su tuo ordine. | Nessun file; GitHub solo alla fine | C0, P-3 |
| C2 | Modifiche minime ad Acasystem web e server: indirizzo del server configurabile nel frontend (`/api`, `/ha`, WebSocket, `/casa3d`); CORS sul server limitato alle origini dei gusci; `client_id` di HA con l'origine del server; CSP; campo `minShell` e versione nel manifesto; test di regressione. | `progetto/acasystem` (frontend e backend) | C0. Coordinare con i flussi 0.9.29/0.9.30 e D1 sugli stessi file. |
| C3 | Script di rilascio: build del frontend e di Casa 3D, archivio `acasystem-web-<versione>.zip` e `manifest.json` (versione, SHA-256, firma, `minShell`). Primo rilascio caricato a mano con `gh release` su tuo ordine; nessuna GitHub Action. | `progetto/acasystem/scripts`, GitHub | C1, C2 |
| C4 | Nucleo comune del guscio in TypeScript: validazione dell'IP privato, porta predefinita, `/api/health`, scelta della versione (P-1), download, verifica (P-2), cache e ripiego, pagine «mini PC non risponde», «Cambia indirizzo» e «Aggiorna l'app». Test Vitest. | Nuova cartella `progetto/client/core` | C0 |
| C5 | Guscio Windows Electron: protocollo `app://` che serve il pacchetto in cache; `contextIsolation` attivo, `nodeIntegration` spento, navigazione limitata e link esterni aperti nel browser; installatore NSIS non firmato con electron-builder; test. | `progetto/client/windows` | C4 |
| C6 | Guscio Android Capacitor: pacchetto scaricato servito con `setServerBasePath`; HTTP in chiaro solo dove serve; keystore generato in `backup/` e consegnato all'utente; APK di rilascio. | `progetto/client/android` | C4 |
| C7 | Prove: Windows (PC dell'ufficio o un PC pulito che indichi tu) e Tab M11 via adb, a carico limitato e in coordinamento con gli altri flussi su banco e tablet. Banco 3002 o Dell `192.168.1.184` solo quando ci sarà Acasystem. | Ambienti | C3, C5, C6 |
| C8 | Chiusura: `verification.md`, `project-status.md`, questo report, commit su tuo ordine. | Documentazione | C7 |

**Limiti noti:**
- il Dell non ha ancora Acasystem: le prove reali usano il banco del PC finché REP-20261026-001 non è fatto;
- Android non permette di autorizzare HTTP in chiaro su intervalli di IP: il compromesso va scelto in C6;
- le nuove dipendenze (Electron, electron-builder, Capacitor) rientrano nella richiesta; le versioni esatte si fissano in C4-C6.

## Confronto delle opzioni di firma per Windows (2026-10-26)

Richiesta dell'utente: «Prima di proseguire preparami un confronto delle opzioni di firma del codice per Windows (costi, requisiti per MeMo Srl, compatibilità con Smart App Control), senza acquistare nulla.» Ricerca del 2026-10-26: nessun acquisto, nessun account creato, nessuna modifica a codice o ambienti.

**Fonti primarie** (Microsoft Learn, consultate il 2026-10-26):
- [Sign your app for Smart App Control compliance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control) (ms.date 2026-09-25);
- [Code signing options for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options) (2026-08-29);
- [Artifact Signing quickstart](https://learn.microsoft.com/azure/artifact-signing/quickstart) (aggiornato il 2026-10-08);
- [Artifact Signing FAQ](https://learn.microsoft.com/azure/artifact-signing/faq) (aggiornata il 2026-10-20);
- [blog Windows Developer del 2026-05-07](https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/) sul Microsoft Store gratuito per le aziende;
- [condizioni di SignPath Foundation](https://signpath.org/terms);
- [documentazione di electron-builder sulla firma Windows](https://www.electron.build/docs/features/code-signing/code-signing-win).

**Fatti principali** [osservazioni]:
- **Smart App Control.** Fa girare le app firmate con certificati di fornitori fidati («Smart App Control allows applications signed with trusted digital certificates to run on protected devices»). Considera solo i certificati di fornitori fidati e accetta RSA ed ECC. Microsoft indica Artifact Signing come metodo preferito.
- **Senza firma:** Microsoft lo sconsiglia per la distribuzione pubblica («Strong SmartScreen block»).
- **SmartScreen** è un controllo diverso, sui file scaricati da internet. Con OV e Artifact Signing i file nuovi possono mostrare un avviso finché la reputazione non cresce; dal 2024 EV non lo evita più.
- **Microsoft Store (MSIX):** Microsoft firma di nuovo il pacchetto, gratis e senza avvisi. Dal 2026-05-07 anche gli account aziendali sono gratuiti.

| Opzione | Costo (indicativo, fonte) | Requisiti per MeMo Srl | Smart App Control | Note per Acasystem |
|---|---|---|---|---|
| **A. Azure Artifact Signing** (ex Trusted Signing), certificato Public Trust | Circa 9,99 USD al mese, piano Basic con 5000 firme (Microsoft Learn; la pagina dei prezzi non mostrava cifre il 2026-10-26). Addebito pieno del mese, non proporzionale. Serve un abbonamento Azure a pagamento: le prove gratuite non valgono. | Organizzazione nell'UE: ammessa. Servono: ragione sociale; sito web dell'azienda; due indirizzi email monitorati sullo stesso dominio aziendale; codice identificativo dell'impresa (per esempio la P. IVA); indirizzo della sede; documento d'identità del rappresentante, verificato con Microsoft Authenticator e AU10TIX. Eventuali documenti aggiuntivi devono essere emessi negli ultimi 12 mesi (per esempio una visura camerale recente, la registrazione del dominio). Tempi: da 1 a 20 giorni lavorativi, con 3 tentativi. Il nome sul certificato è quello legale («MeMo Srl»). Requisito di **3 anni di attività**: citato solo in risposte della community su Microsoft Q&A, non nelle pagine ufficiali lette; da verificare. | Compatibile: è il metodo preferito da Microsoft. | Supportata da electron-builder (`win.azureSignOptions`, in beta). La chiave resta nel servizio, nessun token fisico. Le credenziali dell'app registrata in Entra stanno fuori da Git. |
| **B. Certificato OV di una CA** (DigiCert, Sectigo, GlobalSign, SSL.com…) | 150-300 USD all'anno secondo Microsoft; prezzi dei rivenditori tra 129 e 400 USD all'anno, più token fisico o HSM nel cloud (per esempio un token SSL.com a 379 USD); da verificare presso la CA. | Validazione dell'organizzazione da parte della CA (documenti dell'impresa, dominio, telefono verificato); qualche giorno lavorativo. Chiave obbligatoriamente su HSM o token dal 2023. | Compatibile (CA fidata). | Più costoso. Il token fisico complica i build; la firma nel cloud della CA è l'alternativa. |
| **C. Certificato EV** | Oltre 400 USD all'anno | Validazione più severa | Compatibile | Nessun vantaggio su SmartScreen dal 2024: sconsigliato. |
| **D. Microsoft Store, pacchetto MSIX** | Gratis (account aziendale gratuito dal 2026-05-07) | Account aziendale: verifica dell'impresa con D-U-N-S (più rapida) o documenti; email sul dominio aziendale. Certificazione dell'app da parte di Microsoft. | Compatibile: firma di Microsoft. | Risolverebbe anche gli aggiornamenti del guscio (Q-A4). Però si installa dallo Store e non da chiavetta; serve la revisione; l'app carica un'interfaccia scaricata da GitHub, quindi le regole dello Store sul codice scaricato vanno verificate [inferenza]. electron-builder genera MSIX (`appx`). |
| **E. SignPath Foundation** (gratis per i progetti open source) | Gratis | Licenza OSI senza doppia licenza commerciale; repository pubblico con build automatici e verificabili (CI); approvazione manuale di ogni rilascio; MFA; pagina «Code signing policy». | Compatibile | Sul certificato compare **SignPath Foundation, non MeMo Srl**. Richiede pubblici anche i sorgenti del guscio e un CI (GitHub Actions, oggi escluso senza autorizzazione). Valutazione caso per caso. |
| **F. Nessuna firma** (scelta attuale, Q-A5) | Gratis | — | **Bloccata** se Smart App Control è attivo, come osservato su questo PC con lo stub NSIS (vedi «Avanzamento»). | Va bene solo per prove interne o PC senza Smart App Control. |
| **G. Certificato autofirmato** | Gratis | — | Non è un fornitore fidato | Solo per PC gestiti che installano il certificato come radice fidata. |

**Conseguenze per il build** [inferenza da verificare]:
- Per creare il disinstallatore, electron-builder **esegue uno stub NSIS prima della firma**. Anche con A o B, quindi, il build NSIS su questo PC, dove Smart App Control è attivo, potrebbe restare bloccato.
- Strade possibili:
  - generare su un PC o una VM senza Smart App Control, oppure con un CI (da autorizzare);
  - usare un formato che non esegue nulla in fase di build: `zip`/`dir` firmati, oppure MSIX firmato con A o B per il sideload.
- Smart App Control **non si disattiva** su questo PC: è un'impostazione di sicurezza dell'utente e, una volta spenta, non si riaccende senza reinstallare Windows.

**Valutazione dell'agente** [proposta, nessuna decisione]:
- **Pilota con pochi PC:** zip non firmato su chiavetta. Funziona solo dove Smart App Control lascia partire `Acasystem.exe`, come su questo PC; va provato su ogni PC del pilota.
- **Clienti:** A (Artifact Signing). Costa meno, è indicata da Microsoft, ammette le aziende dell'UE, è supportata da electron-builder e non richiede un token. Prima di attivarla va chiarito con Microsoft o con il supporto Azure il requisito dei 3 anni di attività, e vanno preparati dominio, email aziendali e visura.
- **Alternativa da valutare insieme agli aggiornamenti del guscio:** D (Microsoft Store), se la distribuzione dallo Store è accettabile per i clienti.
- **Limiti:** costi in USD da verificare al momento dell'acquisto; nessuna prova reale di firma o di comportamento di Smart App Control su un file firmato.

## Stato degli ambienti (2026-10-26)

- **Banco Acasystem:** `aca-system:0.9.28` su `http://192.168.1.7:3002`. Sono in corso la 0.9.29 e la 0.9.30 (`project-status.md`).
- **Dell dell'ufficio:**
  - HA OS installato dall'utente, `http://192.168.1.184:8123`, al primo avvio (onboarding);
  - il proprietario lo crea l'utente;
  - diventerà l'HA di D1, mentre la VM `acasystem-ha` resta di riserva;
  - Acasystem non è installato sul Dell: oggi gira solo nel container del PC.
- **Conseguenza per l'architettura A:**
  - finché Acasystem non è un'app di HA OS, l'app client punta al banco del PC;
  - sul mini PC dei clienti punterà all'app Acasystem di HA OS.

## Criteri di completamento (proposta)

- Su un PC Windows pulito l'installatore crea l'app e chiede l'indirizzo. Con un indirizzo sbagliato mostra un errore comprensibile; con quello del banco apre Acasystem a schermo intero e ricorda l'indirizzo dopo il riavvio.
- Sul Lenovo Tab M11 l'APK fa lo stesso e resta a schermo intero.
- Pubblicando una versione nuova, l'app Windows la installa entro 24 ore senza intervento; l'app Android la propone e la installa con un tocco.
- Nessun segreto nell'app né nel repository degli installatori.
- I test automatici di procedura guidata, controllo dell'indirizzo e aggiornamento sono verdi.
- Le prove sul tablet seguono le regole di carico e sicurezza di `AGENTS.md` e della memoria del progetto.

## Avanzamento e modifiche

Solo questo documento e la sua riga in `reports/README.md`. Nessun codice, nessun repository e nessuna prova.

**2026-10-26, chat dedicata:**
- raccolte le risposte Q-A1…Q-A10;
- letti `backend/src/server.ts` e `frontend/src/api/haLogin.ts` e contati i file tracciati per cartella;
- scritti i punti P-1…P-4 e il piano C0-C8.

Nessun codice, nessuna modifica a GitHub, banco o tablet.

**2026-10-26, accettazione e prime tappe:**
- **Accettazione:** l'utente ha scritto «Accetto ADR-0023 così com'è. Procedi con C1 e C4.»; [ADR-0023](../decisions/ADR-0023-app-client-a-ibrida.md) è «Accettata».
- **C1, verifica in sola lettura** (subagente Sonnet 5.5; nessuna modifica, nessuna rete). Insieme da pubblicare: `progetto/acasystem`, 1316 file tracciati più 4 non tracciati. Questi ultimi sono lavoro in corso di altri flussi; l'insieme va ricontrollato prima dell'istantanea.
  - **Nessun rilievo bloccante.** Nessun segreto (`ghp_`, `github_pat_`, JWT, chiavi private), credenziali dei test fittizie, nessun percorso `C:\Users`, nessun cliente. `backend/data/tunet.db` è ignorato e non tracciato.
  - **Da decidere:**
    - (a) i link relativi a `../../documentazione` in `README.md:48` e `frontend/src/components/primitives/README.md:3`, che nel repository nuovo sarebbero rotti;
    - (b) circa 1033 rimandi a ADR, REP, ISSUE e REQ nei commenti e nei test: innocui, ma puntano a documenti assenti;
    - (c) i percorsi `../../../backup/rep003/…` in tre controlli e2e;
    - (d) il nome «Mattia» e l'utente `mattia` nelle fixture dei test;
    - (e) cinque immagini in `frontend/public` più `ai-development.svg` da guardare a occhio (contenuto e titolarità).
  - **Informazioni:**
    - la licenza GPL-3.0 e le attribuzioni di Tunet, three, neonplan3d e lit sono presenti;
    - i workflow `.github` annidati in `upstream-tunet/` non verrebbero eseguiti;
    - solo `1.Main.jpg` supera 1 MB.
  - **Consiglio operativo:** copiare l'insieme con `git ls-files`, non la cartella intera.
  - **Limiti:** ricerca per schemi (rg/grep), non uno scanner dedicato; immagini non aperte.
  - **Nome del repository:** resta la proposta `acamemo/acasystem-app`, da confermare.
- **C4, nucleo del guscio:** `progetto/client/` (workspace npm) con `core/`, in TypeScript eseguito con Node come il backend (ADR-0008).
  - **Moduli:**
    - `config` (IP locale incollabile anche dalla barra di HA, porta predefinita 3002);
    - `version`;
    - `manifest` (schema 1, nome dell'archivio sicuro, SHA-256, limite di 200 MB);
    - `integrity` (WebCrypto);
    - `health`;
    - `releases` (`releases/latest/download` senza API; elenco dell'API solo per cercare versioni più vecchie, massimo 10);
    - `startup` (ultima versione, ripiego sull'ultima compatibile con avvisi `server-update`/`shell-update`, cache senza rete, `download-failed`);
    - `wizard` (salva solo se risponde Acasystem);
    - `messages` (testi in italiano).
  - **Porte da implementare in C5 e C6:** `HttpClient`, `ConfigStore`, `BundleCache`.
  - **Dipendenze di sviluppo:** typescript 7.0.2, vitest 5.0.0 e @types/node 26.6.4, le stesse versioni di Acasystem.
  - Aggiunte in `.gitignore` le righe per `progetto/client/node_modules`.

**2026-10-26, decisioni dell'utente su C1 e avvio di C5.** Testo dell'utente: «Per C1: togli i 2 link a documentazione, lascia i rimandi ADR/REP nei commenti, rendi configurabili i percorsi backup negli e2e, sostituisci «Mattia» nelle fixture con un nome generico; le immagini le guardo io. Repo: acamemo/acasystem-app. Poi procedi con C5.»

- **C1 applicata** in `progetto/acasystem`:
  - **Link:** tolti i link a `documentazione/` in `README.md` e `frontend/src/components/primitives/README.md`; i nomi ADR restano come testo.
  - **e2e:** in `isolated-browser`, `m11-overview` e `release.check.mjs` le evidenze vanno in `ACA_EVIDENCE_DIR` o, in sua assenza, nella cartella ignorata `.tmp/e2e/…`. **Effetto sugli altri flussi:** prima il valore predefinito era `../../../backup/rep003/…`; chi esegue quei controlli sul banco deve ora impostare `ACA_EVIDENCE_DIR`. `release.check.mjs` legge `../assets-image-final.json` accanto alla cartella delle evidenze.
  - **Fixture:** «Mattia»/`mattia` sostituiti con «Mario»/`mario` in 7 file di test e nei dati di anteprima di `pages/system/preview/PreviewSystem.tsx`. Resta invariato il testo dei crediti in `AiDevelopmentNotice.tsx` («…curato da Mattia Pentagallo»), che non è una fixture.
  - **Immagini e repository:** le immagini le controlla l'utente; il repository è confermato come `acamemo/acasystem-app` (`RELEASE_REPOSITORY`).
- **C5, guscio Windows** in `progetto/client/windows`: Electron 44.7.0 ed electron-builder 26.17.0, versioni anteriori al 2026-10-12.
  - **Scelta esecutiva, da confermare: server locale invece di CORS.** Il guscio serve l'interfaccia da `http://127.0.0.1:47320` e inoltra `/api` e `/ha`, WebSocket compreso, al mini PC.
    - Vantaggi: la pagina ha una sola origine come sul banco, senza CORS, senza contenuto misto e con un `client_id` di HA su loopback.
    - Effetto su C2: su Windows nessuna modifica ad Acasystem web o al server. ADR-0023, punto 4, prevedeva invece CORS e una base URL; per Android la questione resta aperta in C6.
    - La porta è fissa perché la sessione salvata dipende dall'origine; se è occupata, compare una pagina chiara.
  - **Protezioni:**
    - controllo dell'host contro il DNS rebinding;
    - nessuna uscita dalla cartella dell'interfaccia;
    - ripiego SPA come il server, ma 404 sotto `/casa3d/`;
    - CSP copiata da `backend/src/config/security.ts`, da tenere allineata.
  - **Finestra:**
    - `contextIsolation` attivo, `sandbox` attivo, `nodeIntegration` spento;
    - navigazione solo verso guscio e interfaccia; link esterni nel browser; permessi limitati a schermo intero e copia;
    - ponte IPC solo per le pagine `file:` del guscio;
    - un'istanza alla volta;
    - finestra ingrandita, F11 per lo schermo intero, menu (Alt) con «Cambia indirizzo…», «Ricarica», «Esci».
  - **Avvisi:** gli avvisi P-1 bis e Q-A4 arrivano come notifiche di Windows.
  - **Altri file:**
    - archivio su disco in `%APPDATA%\Acasystem`, con al massimo 3 versioni, installazione atomica e lettore zip senza dipendenze (metodi 0 e 8, CRC, percorsi sicuri, 500 MB massimi);
    - `HttpClient` con il `fetch` del processo principale.
  - **Nucleo:**
    - reason `unpublished` quando GitHub risponde 404;
    - indirizzi di GitHub sostituibili solo dai sorgenti, per le prove, con `ACASYSTEM_CLIENT_TEST_RELEASES` (ignorato nell'app installata).
  - **Icona provvisoria:** è quella della PWA attuale (`icons/icon-512.png`), che è il logo di Tunet. Serve un'icona Acasystem.
  - **Installatore NSIS non generato.** Su questo PC Smart App Control è attivo (`VerifiedAndReputablePolicyState = 1`). electron-builder deve eseguire lo stub NSIS non firmato per creare il disinstallatore, e Code Integrity lo blocca (eventi 3033 e 3077 del 2026-10-26 12:16-12:17, «did not meet the Enterprise signing level»).
    - Per contro, `release\win-unpacked\Acasystem.exe` (non firmato, generato con `--win dir`) si avvia: l'agente l'ha provato una volta, chiudendo solo il proprio PID e cancellando la cartella `%APPDATA%\Acasystem` creata dalla prova. Anche `electron.exe` non è firmato, ma è ammesso.
    - **Inferenza:** su un PC del cliente con Smart App Control attivo, un installatore NSIS non firmato verrebbe bloccato senza la possibilità di «Esegui comunque». Q-A5, che prevedeva solo un avviso SmartScreen, va rivista. Opzioni in «Punto di ripresa».
    - Le impostazioni di sicurezza non sono state toccate.

**2026-10-26, decisioni dopo il confronto della firma e avvio di C6.** Testo dell'utente: «Pilota con zip su chiavetta (prova su ogni PC del pilota); per i clienti valuteremo Artifact Signing dopo aver chiarito il requisito dei 3 anni. Confermo il server locale su Windows. Procedi con C6 (Android).»

- **ADR-0023 annotato:** server locale su Windows; zip per il pilota; Artifact Signing da valutare per i clienti.
- **Zip del pilota:** nuovo script `npm run dist:zip` (`electron-builder --win zip`, nessuna esecuzione durante il build). Ha prodotto `windows/release/Acasystem-0.1.0-win-x64.zip` (153 MB, fuori da Git, non firmato). Si estrae e si avvia `Acasystem.exe`.
  - Va provato su ogni PC del pilota.
  - Finché non c'è il primo rilascio (C3), l'app mostra «Su GitHub non è ancora pubblicata nessuna versione di Acasystem».
- **C6, guscio Android** in `progetto/client/android`: Capacitor 8.5.3, `minSdk` 26, `targetSdk` 36, Gradle 8.14.3 del modello, JDK 21.
  - **Stesso schema di Windows.**
    - **Pagina locale (`web/`):** procedura guidata ed errori, con la grafica e l'icona copiate da `windows/shell` al build.
    - **Nucleo in TypeScript con porte Capacitor:**
      - `CapacitorHttp` per GitHub e `/api/health` (richieste native);
      - plugin `AcaShell` per configurazione, archivio, avvio e intent.
    - **Plugin nativo in Java:**
      - `LocalServer`, server su `127.0.0.1:47320` con inoltro di `/api` e `/ha` (WebSocket compreso), controllo dell'host, percorsi sicuri, ripiego SPA, 404 sotto `/casa3d/`, CSP copiata e `Connection: close`;
      - `BundleStore`, al massimo 3 versioni, installazione atomica, `ZipInputStream` con controllo del CRC, percorsi sicuri, 500 MB massimi.
    - **`UiActivity`:**
      - è una WebView **senza il ponte di Capacitor**, quindi il codice scaricato non può chiamare il plugin;
      - navigazione limitata a 127.0.0.1, link esterni nel browser, contenuto misto vietato, nessun accesso ai file;
      - «Indietro» alla radice chiude l'app;
      - se il motore della pagina si chiude, l'attività si ricrea;
      - dopo la chiusura del processo si riparte dal guscio;
      - gli avvisi P-1 bis e Q-A4 compaiono come Toast.
  - **Scorciatoia «Cambia indirizzo»:** pressione lunga sull'icona (`acasystem://change-address`).
  - **HTTP in chiaro consentito in tutta l'app** (`network_security_config`): il controllo `/api/health` va verso l'IP locale e Android non ammette eccezioni per intervalli di IP (Q-A10). GitHub resta in HTTPS; l'interfaccia vede solo 127.0.0.1. Lint lo segnala come avviso.
  - `allowBackup="false"`, così la sessione non finisce nei backup.
  - **Icona e schermata di avvio:** generate con ImageMagick dall'icona provvisoria (Tunet), come su Windows.
  - **Chiave di firma (Q-A6):** generata dall'agente il 2026-10-26 in `backup/android-signing/`, esclusa da Git (verificato con `git check-ignore`).
    - Contenuto: `acasystem-release.jks` (PKCS12, RSA 4096, validità 30 anni, DN `CN=MeMo Srl, O=MeMo Srl, C=IT`) e `keystore.properties`, con una password casuale mai mostrata in chat.
    - Impronta SHA-256 del certificato: `97e158a90e5a9227e80f42a670d83439c867238fd4a344f69c9a8134f2c7ac49`.
    - **Azione per l'utente:** copiare i due file nel gestore di password e su una chiavetta offline. Il `build.gradle` legge le proprietà da lì oppure da `ACASYSTEM_KEYSTORE_PROPERTIES`.
  - **APK:** `npm run apk:release` produce `android/app/build/outputs/apk/release/app-release.apk` (3,2 MB, fuori da Git), firmato e verificato con `apksigner`.
  - **Non provato su un dispositivo:** il Tab M11 è condiviso con altri flussi, quindi va coordinato con l'utente.

**2026-10-26, prova sul Tab M11.** Testo dell'utente: «Sì: installa l'APK sul Tab M11 via adb e prova procedura guidata, errori e scorciatoia «Cambia indirizzo». Il tablet è libero.»

- **Ambiente:** TB330FU, Android 15, Wi-Fi 192.168.1.46, collegato via USB con adb 1.0.41; banco su 192.168.1.7:3002 (risponde `0.9.30`); Dell HA OS su 192.168.1.184:8123, senza Acasystem.
- **Difetto 1, trovato e corretto.** Con l'APK di rilascio la pagina restava su «Avvio in corso…».
  - Causa: con la build di debug, il logcat riportava «`capacitor.registerPlugin is not a function`». `registerPlugin` sta nel pacchetto JS `@capacitor/core`, non nell'oggetto globale iniettato da Android.
  - Correzione: `scripts/build-web.mjs` copia `@capacitor/core` in `www/vendor/capacitor-core.js`, `web/index.html` lo mappa con una import map e `web/main.ts` importa `registerPlugin` e `CapacitorHttp` da `@capacitor/core`.
  - I test sul PC non coprivano questo caso, perché simulano il plugin.
- **Prove guidate via CDP sulla WebView di debug** (schermate in `backup/client-c6-m11/`, fuori da Git):

| Caso | Esito |
|---|---|
| `8.8.8.8` | «L'indirizzo deve essere della rete di casa…», nessun salvataggio |
| `192.168.1.184` con la porta 3002 (Dell senza Acasystem) | «Il mini PC non risponde…» |
| `192.168.1.184` con la porta 8123 (HA) | «A questo indirizzo risponde un altro servizio, non Acasystem…» |
| `http://192.168.1.7:8123/onboarding.html` incollato | host ricavato `192.168.1.7`, porta predefinita: il banco risponde, l'indirizzo è salvato; poi la pagina «Su GitHub non è ancora pubblicata nessuna versione di Acasystem» con «Riprova» e «Cambia indirizzo», come previsto finché non c'è C3 |
| «Cambia indirizzo» (pulsante) | procedura guidata con `192.168.1.7` già scritto |
| Riavvio a freddo (`am force-stop`) | va direttamente alla pagina d'errore: l'indirizzo è ricordato |
| Scorciatoia | registrata nel launcher (`dumpsys shortcut`: `id=change_address`) |

- **Difetto 2, trovato e corretto: scorciatoia ad app aperta.**
  - Con l'app in primo piano, l'intent veniva consegnato ma la pagina non cambiava; ad app chiusa funzionava già.
  - Correzione: `AcaShellPlugin.handleOnNewIntent` avvisa la pagina con l'evento `changeAddress`, `web/main.ts` lo ascolta e `MainActivity.onNewIntent` esegue `setIntent` prima di `super`.
  - Dopo la correzione, la scorciatoia ad app aperta apre la procedura guidata con l'IP salvato.
  - La scorciatoia è stata aperta con il suo stesso intent (`am start -a VIEW -d acasystem://change-address`), non con una pressione lunga sull'icona.
- **Tocchi reali** (`adb input`): il tocco sul campo apre la tastiera numerica con il punto e il campo resta visibile; «Collega» porta alla pagina d'errore attesa.
- **APK di rilascio rigenerato e reinstallato** (la build di debug è stata disinstallata): con soli tocchi e testo reali, IP del banco e Invio → pagina «non ancora pubblicata»; scorciatoia → procedura guidata con l'IP. Test nativi di nuovo 12/12, test web 6/6.
- **Stato del tablet:** resta installata la versione di rilascio 0.1.0 (`it.acasystem.client`), con l'indirizzo `192.168.1.7` salvato. Si toglie con `adb uninstall it.acasystem.client`.
- **Non provato:**
  - interfaccia scaricata e `UiActivity`, cioè server locale, WebSocket e login, perché manca un rilascio su GitHub (C3);
  - pressione lunga sull'icona del launcher;
  - rotazione;
  - telefoni.

**2026-10-26, C3: prima release preparata (non pubblicata).**

- **Repository.** L'utente ha creato [`acamemo/acasystem-releases`](https://github.com/acamemo/acasystem-releases): pubblico, vuoto, nessuna release (API pubblica, 2026-10-26, creato alle 10:53Z).
- **Risposte dell'utente:**
  - repository: «Sì, acasystem-releases»;
  - contenuto: «Immagine banco 0.9.30»;
  - su chi pubblica: «un modo per non far comparire claude fra le persone che hanno pubblicato?».
- **Risposta dell'agente sull'autore.** Claude compare su GitHub solo come coautore dei commit (riga `Co-Authored-By`) o se pubblica con un proprio accesso. Quindi il README iniziale, necessario perché un tag deve puntare a un commit, e la release li crea l'utente dal sito con il proprio account. L'agente non fa commit né pubblica in quel repository.
- **`RELEASE_REPOSITORY`** passa a `acamemo/acasystem-releases` (nucleo, test, prova end-to-end Windows). Zip Windows e APK sono rigenerati; l'APK è reinstallata sul Tab M11 (`install -r`, indirizzo salvato conservato).
- **Script `progetto/client/scripts/make-release.ts`** (`npm run release:make -- --image aca-system:<v> --version <v>`):
  - legge `frontend/dist` e `casa3d/dist` dall'immagine Docker (contenitore creato, copiato e rimosso; non avviato);
  - crea lo zip con lo scrittore condiviso `scripts/zipWriter.ts`, spostato dai test di Windows;
  - lo rilegge con il lettore del guscio;
  - scrive `manifest.json` validato dal nucleo in `release-out/v<v>/` (fuori da Git).
- **Release v0.9.30** dall'immagine `aca-system:0.9.30`, che è quella del banco:
  - 117 file, `acasystem-web-0.9.30.zip` da 3.400.116 byte;
  - SHA-256 `9af1ce4912a9bb532396efaa810e3f53b12c03cb65e70640067177c8d66bfdf9`;
  - `minServer` 0.9.30, `minShell` 0.1.0.
- **Prova con il banco vero**: guscio Windows dai sorgenti, finto GitHub locale con questi due file, banco `192.168.1.7:3002`.
  - La procedura guidata scarica, verifica e installa la release e apre `http://127.0.0.1:47397/`.
  - Si vede la pagina «Accedi ad Acasystem».
  - `/api/health` dal server locale risponde `{"status":"ok","version":"0.9.30"}`.
  - Il WebSocket `/ha/api/websocket` riceve `{"type":"auth_required","ha_version":"2026.9.4"}`.
  - Nessuna credenziale inserita: accesso e uso dopo il login non sono provati.
- **Da notare:**
  - **Service worker.** L'interfaccia ha un service worker (`sw.js`, cache della shell `./` e `index.html`). Al cambio di versione nella stessa origine `127.0.0.1:47320` potrebbe servire una shell vecchia finché il service worker non si aggiorna. È un comportamento esistente di Acasystem; da verificare alla seconda release [osservazione, nessuna modifica].
  - **Licenza.** Il repository pubblico conterrà binari dell'interfaccia GPL-3.0 senza sorgenti: con P-3 bis i sorgenti di `progetto/acasystem` dovevano stare nel repository pubblico nuovo. La disponibilità dei sorgenti resta da sistemare (D-C6).

**Pubblicazione (da fare all'utente dal sito):**
1. In <https://github.com/acamemo/acasystem-releases> scegliere «Add a README» e fare il commit su `main`.
2. Aprire «Releases», poi «Draft a new release». Tag `v0.9.30` («Create new tag on publish», target `main`), titolo «Acasystem 0.9.30».
3. Allegare i due file di `progetto/client/release-out/v0.9.30/`: `manifest.json` e `acasystem-web-0.9.30.zip`.
4. Lasciare spento «Set as a pre-release» e acceso «Set as the latest release», poi «Publish release».
5. Dopo la pubblicazione l'agente verifica dall'API pubblica (download e SHA-256) e sul Tab M11.

**2026-10-26, prima verifica della pubblicazione.** L'utente ha scritto «Ho pubblicato la release v0.9.30 su acamemo/acasystem-releases». La verifica dall'API pubblica, senza login, ha dato questo esito:
- repository ancora vuoto (`size` 0, `pushed_at` 10:53:03Z, `commits` 409 «Git Repository is empty»);
- `releases` vuoto e `releases/latest` 404;
- i collegamenti `releases/latest/download/manifest.json` e `releases/download/v0.9.30/manifest.json` danno 404;
- nessun altro repository `acamemo` con «aca» nel nome.

Ipotesi da controllare con l'utente: release rimasta in bozza (le bozze non sono pubbliche), README non creato (senza commit il tag non si crea), oppure pubblicazione in un altro account o repository. La prova sul tablet non è stata eseguita, perché mostrerebbe solo «non ancora pubblicata».

**2026-10-26, pubblicazione verificata.** L'utente ha completato la pubblicazione con la guida passo passo (tag `v0.9.30` creato alla pubblicazione, due file allegati).

- **API pubblica:**
  - release `v0.9.30` «Acasystem 0.9.30», `draft` false, `prerelease` false, pubblicata il 2026-10-26T12:09:00Z, autore `acamemo`;
  - un solo commit, `2e0f7eb` «Create README» di `acamemo`; contributori: solo `acamemo`;
  - asset `acasystem-web-0.9.30.zip` (3.400.116 byte, digest GitHub `sha256:9af1ce49…bfdf9`) e `manifest.json` (251 byte), caricati da `acamemo`.
- **Download dai collegamenti usati dalle app** (`releases/latest/download/manifest.json`, `releases/download/v0.9.30/acasystem-web-0.9.30.zip`): HTTP 200. SHA-256 dello zip scaricato uguale al manifesto; i due file sono identici byte per byte a `release-out/v0.9.30/`.
- **Tab M11, APK di rilascio, indirizzo `192.168.1.7` già salvato, banco 0.9.30:**
  - all'avvio l'app scarica e verifica la release e apre `UiActivity`, con la pagina «Accedi ad Acasystem» servita dal server locale del tablet;
  - la scorciatoia «Cambia indirizzo» sopra l'interfaccia riporta alla procedura guidata con l'IP salvato;
  - Invio riapre l'interfaccia;
  - «Indietro» alla radice chiude l'app (in primo piano torna l'app precedente, la PWA di Chrome, non toccata);
  - secondo avvio dalla copia scaricata: `UiActivity` in circa 0,9 s.
  - Schermate `20-release-github.png` e `21-scorciatoia-sopra-ui.png` in `backup/client-c6-m11/`.
- **Non provato:**
  - login e uso dopo l'accesso: le credenziali le inserisce l'utente;
  - avvio senza internet;
  - rotazione;
  - pressione lunga sull'icona;
  - seconda release (service worker).

**2026-10-26, login e «Cambia indirizzo» dentro Acasystem.**

- **Login.** L'utente ha scritto di aver fatto il login nell'app sul Tab M11, ma in primo piano c'era la **PWA di Acasystem in Chrome** (task webapk, Sistema → «Non raggiungibile»). L'app, riportata in primo piano senza riavvio, era ancora sulla pagina di accesso. Sul tablet ci sono due icone «Acasystem» uguali (icona provvisoria): è un motivo in più per l'icona propria. Login e uso completo nell'app non sono ancora provati. La PWA non è stata toccata.
- **Domanda dell'utente** su «Esci», che riporta all'accesso e non all'IP: è corretto. Sessione e indirizzo sono livelli diversi; per cambiare mini PC c'erano solo la scorciatoia dell'icona e il menu Alt su Windows. Il Dell non ha Acasystem, quindi oggi la procedura guidata risponde «Il mini PC non risponde» o «un altro servizio».
- **Richiesta dell'utente:** «sarebbe il caso aggiungerla all'interno di acasystem dove puoi uscire dall'account». Realizzata:
  - **Acasystem frontend:**
    - `src/utils/clientShell.ts` (nuovo): `isClientShell()` riconosce `AcasystemShell/<versione>` nello user agent; `openChangeAddress()` apre `acasystem://change-address`.
    - `ConnectionSection.tsx`: prop facoltativa `onChangeAddress` e pulsante «Cambia indirizzo» (icona `server`) accanto a «Esci», senza conferma.
    - `SystemPage.tsx`: lo passa solo dentro l'app. Nel browser e nella PWA il pulsante non c'è.
    - Test `ClientShellChangeAddress.test.tsx`.
    - Nessun file di altri flussi toccato: `ConnectionSection` e `SystemPage` non avevano modifiche locali.
  - **Guscio Windows (`main.ts`):** user agent con ` AcasystemShell/<versione> (Windows)`; `will-navigate` verso `acasystem://change-address` riapre la procedura guidata.
  - **Guscio Android (`UiActivity`):** user agent con ` AcasystemShell/<versione> (Android)`; `shouldOverrideUrlLoading` apre `MainActivity` con `acasystem://change-address` (stesso percorso della scorciatoia).
- **Verifiche:**
  - frontend: 38/38 test (nuovo, `SystemPage`, `FixSystemConnection`), typecheck strict, eslint, prettier, tipografia (538 file) e colori (355 file);
  - prova end-to-end Windows 9/9, con il nuovo passo: user agent `AcasystemShell/… (Windows)` e «Cambia indirizzo» dall'interfaccia → procedura guidata con l'IP salvato;
  - JUnit 12/12;
  - Tab M11 con la build di debug via CDP: user agent `… AcasystemShell/0.1.0 (Android)`, `window.Capacitor` assente nell'interfaccia, `acasystem://change-address` → `MainActivity` con procedura guidata e `192.168.1.7`;
  - poi reinstallata la versione di rilascio con l'IP del banco (tocchi reali).
  - Zip Windows e APK rigenerati.
- **Limite.** La release v0.9.30 pubblicata non contiene il pulsante, che è una modifica del frontend non ancora in un'immagine. Comparirà con la prossima versione di Acasystem pubblicata come release (`npm run release:make -- --image aca-system:<v> --version <v>`); i gusci sono già pronti.
- **Seguito: configurazione automatica del mini PC dall'app** (proposta dell'utente; D-G1 «pubblica», D-C6 «va bene», D-G2 «restare»). Piano unico in [REP-20261026-005](REP-20261026-005-configurazione-automatica-mini-pc.md).
- **Domanda dell'utente sul flusso**: il sistemista inserisce l'IP, poi accesso ad Acasystem al posto dell'interfaccia di HA, poi uso. È confermato: è il flusso realizzato. La porta non viene chiesta: sta in «Impostazioni avanzate», chiusa, con il valore predefinito 3002. Proposta: toglierla quando la porta dell'app HA OS sarà fissa. Prerequisito: Acasystem installato sul mini PC (REP-20261026-001).

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| App client | — | Non eseguito | Da pianificare nella chat dedicata. |
| C4: test del nucleo | `npm test` in `progetto/client` (Vitest 5.0.0, Node 24.14.0, Windows 11) | Superato, 2026-10-26 | 47/47 test in 3 file. Rete, disco e GitHub simulati. |
| C4: tipi | `npm run typecheck` (tsc 7.0.2 strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`) | Superato, 2026-10-26 | Nessun errore. |
| C1: file da pubblicare | Ricerca in sola lettura per schemi su `git ls-files` e sui file non tracciati di `progetto/acasystem` | Superato con punti da decidere, 2026-10-26 | Nessun rilievo bloccante; punti (a)-(e) in «Avanzamento». Nessuno scanner dedicato; immagini non aperte. |
| Guscio con GitHub reale, Electron, Android, banco | — | Non eseguito | Tappe C3, C5, C6, C7. |
| C1: test toccati | `npx vitest run` sui 7 file con «Mario» (frontend, `--maxWorkers=2`); `tsc -p tsconfig.strict.json`; `eslint` su `PreviewSystem.tsx`; `node --check` sui 3 e2e | Superato, 2026-10-26 | 120/120 test; tipi, lint e sintassi senza errori. Gli e2e non sono stati eseguiti (servono banco o tablet). |
| C5: test unitari | `npm test` in `progetto/client` | Superato, 2026-10-26 | Nucleo 49/49, Windows 20/20: zip, archivio su disco, server locale con finto mini PC (HTTP con corpo, WebSocket nei due sensi, 502, host estraneo 421, percorsi, porta occupata). |
| C5: tipi | `npm run typecheck` (strict, nucleo e Windows) | Superato, 2026-10-26 | Nessun errore. |
| C5: prova end-to-end | `npm run check:smoke` (Electron 44.7.0 con playwright-core 1.63.0; finto GitHub e finto mini PC su 127.0.0.1) | Superato, 2026-10-26 | 8/8 passi: procedura guidata; IP pubblico rifiutato; mini PC che non risponde (indirizzo non salvato); interfaccia scaricata, verificata e collegata con `/api`; ponte invisibile all'interfaccia; secondo avvio senza GitHub dalla cache; mini PC spento; «Cambia indirizzo». Schermate in `windows/.tmp/e2e/smoke` (fuori da Git). Limiti: niente GitHub reale né Acasystem vera; WebSocket solo nei test unitari. |
| C5: zip per il pilota | `npm run dist:zip` | Superato, 2026-10-26 | `Acasystem-0.1.0-win-x64.zip`, 153 MB, non firmato. Avvio non provato su altri PC. |
| C6: test web | `npm test` in `progetto/client` (nucleo 49, Windows 20, Android 6) e `npm run typecheck` | Superato, 2026-10-26 | Porte Capacitor: base64 oltre 32 KB, JSON e testo, errori di stato, formato, rete e timeout, configurazione alterata, manifesti non validi. |
| C6: test nativi | `node scripts/gradle.mjs testDebugUnitTest` (JUnit 4.13.2, JDK 21) | Superato, 2026-10-26 | `BundleStoreTest` 5/5, `LocalServerTest` 7/7: HTTP con corpo e `Connection: close`, WebSocket nei due sensi, 502, 421, percorsi, porta occupata. |
| C6: APK e lint | `assembleRelease lintRelease`; `apksigner verify --print-certs` | Superato con avvisi, 2026-10-26 | APK firmato `CN=MeMo Srl`. Lint senza errori; 4 avvisi (ordine del manifest e versioni del modello, HTTP in chiaro voluto). |
| C3: release v0.9.30 | `node scripts/make-release.ts --image aca-system:0.9.30 --version 0.9.30`; guscio Windows con finto GitHub e banco vero | Superato, 2026-10-26 | Zip riletto, manifesto valido. Pagina di accesso caricata, `/api/health` 0.9.30, WebSocket HA `auth_required`. Non pubblicata; login non provato. |
| C3: pubblicazione e Tab M11 | API pubblica e download da GitHub; APK di rilascio sul Tab M11 con il banco 0.9.30 | Superato, 2026-10-26 | Release `v0.9.30` di `acamemo`, SHA-256 coincidente, file identici. Sul tablet: interfaccia scaricata e pagina di accesso, scorciatoia sopra l'interfaccia, «Indietro», secondo avvio dalla cache. Login non provato. |
| C6: dispositivo | Tab M11 (Android 15) via adb: CDP sulla build di debug più tocchi reali sulla build di rilascio | Superato dopo 2 correzioni, 2026-10-26 | Procedura guidata, 4 errori, salvataggio, riavvio, «Cambia indirizzo» (pulsante e intent della scorciatoia, ad app aperta e chiusa). Schermate in `backup/client-c6-m11/`. Non provati: interfaccia scaricata (manca C3), pressione lunga sull'icona, rotazione, telefoni. |
| C5: installatore NSIS | `npm run dist` | Fallito, 2026-10-26 | Smart App Control blocca lo stub non firmato (vedi «Avanzamento»). `--win dir` riuscito; `Acasystem.exe` si avvia. |

## Chiusura e punto di ripresa

Aprire una chat nuova in questo progetto e iniziare con, per esempio:

> Leggi `AGENTS.md`, `documentazione/project-status.md` e `documentazione/reports/REP-20261026-002-app-client-pc-android.md`. Prepariamo insieme il piano dell'app client di Acasystem per Windows e Android (architettura A, finestra su Acasystem): fammi le domande Q-A1…Q-A10 una per volta, poi pianifica e procediamo passo per passo.

**Ripresa al 2026-10-26 (chat dedicata):**
- P-1…P-4 hanno risposta, P-1 bis e P-3 bis compresi;
- C0 è scritta: [ADR-0023](../decisions/ADR-0023-app-client-a-ibrida.md) è in stato «Proposta», con la riga nell'indice delle decisioni;
- prossimo passo: l'accettazione dell'utente, poi C1 (scansione dei file da pubblicare e nome del repository pubblico) e C4 (nucleo del guscio), che sono indipendenti.
- **Aggiornamento dello stesso giorno:** ADR-0023 è accettata, C1 (verifica) e C4 (nucleo) sono fatte. Prossimi passi:
  - le decisioni dell'utente su C1 (a)-(e) e sul nome del repository;
  - poi C2, che tocca frontend e backend di Acasystem e va coordinata con i flussi 0.9.29/0.9.30 e D1;
  - in parallelo è possibile C5 (guscio Electron) sopra il nucleo.
- **Aggiornamento successivo:** C1 è applicata e C5 è realizzata e provata dai sorgenti, ma senza installatore NSIS. Decisioni aperte per l'utente:
  - **(1) Distribuzione Windows con Smart App Control:**
    - (a) per il pilota, una cartella o uno zip dell'app su chiavetta (`--win dir`/`zip`), che non esegue nulla in fase di build; senza firma e senza collegamenti automatici;
    - (b) un certificato di firma del codice, che è un acquisto (per esempio Azure Artifact Signing o un certificato OV), necessario prima di andare dai clienti;
    - (c) un installatore NSIS generato su un PC senza Smart App Control: resta bloccato sui PC dei clienti che lo hanno attivo.
  - **(2) Server locale:** conferma della scelta esecutiva (server locale invece di CORS su Windows) e conseguente annotazione su ADR-0023.
  - **(3) Icona:** un'icona Acasystem al posto di quella di Tunet.
  - Il confronto delle opzioni di firma richiesto dall'utente è nella sezione «Confronto delle opzioni di firma per Windows (2026-10-26)».
- Poi C6 (Android) oppure C2/C3 (pacchetto e primo rilascio).
- **Aggiornamento dopo C6:**
  - le decisioni (1) e (2) sono prese (zip e server locale);
  - C6 è realizzata, ma senza prova su un dispositivo;
  - restano per l'utente:
    - la custodia della chiave Android;
    - la prova sul Tab M11 (installazione dell'APK via adb, solo procedura guidata ed errori finché non c'è un rilascio);
    - l'icona;
  - poi C3: script di rilascio e primo rilascio su `acamemo/acasystem-app`, che è il repository nuovo e richiede un ordine esplicito. C2 non serve più su Windows e Android grazie al server locale. Le risposte Q-A sono quelle della sezione dedicata e non vanno richieste di nuovo.

La chat dedicata deve tenere conto degli altri flussi in corso (0.9.29/0.9.30, D1), preservare le modifiche non committate e non toccare banco o tablet senza coordinamento.
