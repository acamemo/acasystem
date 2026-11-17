# ADR-0030 QR web e apertura senza applicazione installata

| Campo | Valore |
|---|---|
| ID | ADR-0030 |
| Stato | Accettata per il comportamento richiesto; scelte esecutive e collaudo nel report |
| Data / autore | 2026-10-30; Codex |
| Decisore e autorizzazione | Utente, [U31a/U32](../riprogettazione/diario/2026-10-30.md#u32-browser-quando-lapp-non-è-presente): telefono iPhone e richiesta di aprire la web app nel browser quando l'applicazione non è installata. |
| Collegamenti | [REQ-21/AC-21](../funzionalita/product.md), [ADR-0029](ADR-0029-desktop-centrale-qr-design-condiviso.md), [REP-20261030-010](../reports/REP-20261030-010-rallentamenti-vm-windows.md), [guida alla prova](../riprogettazione/blocchi/01-pc-vm-prova-app.md) |
| Sostituisce / integra | Integra [ADR-0029](ADR-0029-desktop-centrale-qr-design-condiviso.md); non cambia la decisione sulle due modalità account/layout e non assegna un porting nativo iOS. |

## Contesto e decisione umana

Il primo QR `acasystem://pair` richiedeva un interprete nativo Android. L'utente specifica ora che iPhone e dispositivi senza app devono aprire un browser che esegue ACA. Il desktop continua a ospitare la centrale e il telefono usa lo stesso frontend web esistente.

Fonte umana, U32: «scusami, ma per iOS, O in generale quando su un dispositivo non è presente l'applicazione, facciamo aprire un browser dove viene eseguita la web app.» L'apertura web è la decisione dell'utente; formato del link, conferma e file portabile sono scelte esecutive per realizzarla mantenendo le due modalità già richieste.

Il QR diventa un URL web della centrale, apribile dalla fotocamera del dispositivo. Il primo lotto usa IPv4 privata LAN e porta 3002. La pagina ACA presenta **Collega account** e **Importa layout**, senza consumare l'invito all'apertura.

## Scelte esecutive nel perimetro

- URL HTTP dell'origine privata sulla porta 3002, rotta hash `/#/collega` e soli parametri `v=1`, `house` UUID e `invite` di 43 caratteri base64url. Nessun endpoint alternativo nella hash, password o token HA. Il frammento non viene inviato nella richiesta HTTP della pagina e viene rimosso dopo la cattura nell'interfaccia.
- Account: dopo la scelta si accetta l'invito e si registra l'identità attesa prima di montare connessione HA e sincronizzazione. Poi si apre ACA con il normale accesso, se il browser non ha una sessione valida. Un utente diverso da quello atteso non avvia la condivisione dell'invito; l'interfaccia chiede di accedere con l'account del PC.
- Copia: il browser della casa sorgente prepara il file portabile; un secondo pulsante **Scarica il file layout** avvia il download. Il destinatario lo importa nella propria ACA autenticata, da Sistema → QR Code → **Importa file layout**. Il server ricontrolla formato, dimensione e dati con `sanitizeSharedConfiguration` e `portableConfiguration`, ricostruisce gli ID e rimuove binding della casa sorgente. L'importazione conserva casa/account propri e imposta la modalità copia, senza sincronizzazione con il mittente. Non si scrive nello storage di un'altra origine e non si collega l'account dell'amico.
- Il contenitore Android legge il nuovo QR e mantiene il formato legacy; nessuna intercettazione generica di URL HTTP installata nel sistema.

Sono scelte interne per rendere concreto il comportamento umano richiesto, non nuove autorizzazioni su dati, dispositivi o privilegi. Non viene introdotto un account universale.

Il file si chiama `acasystem-layout.aca.json`, ha formato `{format: "acasystem-layout", schema: 1, configuration: ...}` e dimensione massima 512 KiB. Non contiene invito, indirizzo della centrale o identità dell'account sorgente. La convalida avviene con `POST /api/pairing/configuration/import` autenticato presso la centrale del destinatario; la risposta viene applicata a layout/aspetto senza sostituire le credenziali della sessione. Nessun CORS generico introdotto.

## Alternative e limiti

Un'app iOS nativa resta rinviata. La web app riusa login, API e sincronizzazione esistenti; non richiede un nuovo stack mobile. La copia tra case usa un file esplicito perché il browser non possiede la mailbox nativa del contenitore e non deve aggirare l'isolamento delle origini.

Il QR locale non abilita accesso fuori casa. HTTP LAN è il trasporto attuale e non offre cifratura di rete; questa decisione non adotta TLS, relay o Cloud. La centrale deve essere raggiungibile dal dispositivo e il PC deve restare acceso e connesso.

## Verifiche e revisione

Controlli eseguiti per l'estensione: gruppo frontend di sette file **100/100**, inclusi contratto condiviso con 42 URL rifiutati, assenza di consumo all'apertura, doppia scelta concorrente, associazione prima del montaggio della sincronizzazione e file/copia; backend pairing **8/8**, inclusi autenticazione dell'import, limite/schema, sanitizzazione e monouso. Typecheck frontend e lint pertinenti superati. Il typecheck backend resta bloccato dai due `subscription` duplicati preesistenti nella fixture `fakeHomeAssistant.ts`, senza nuovi errori del router segnalati dal controllo.

**Aggiornamento delle verifiche reali, 2026-10-30:** completati 14 passaggi sull'EXE confezionato e su un browser Electron isolato senza preload o ponte nativo. I PNG QR account, copia e dopo importazione sono stati decodificati e confrontati con gli URL attesi. Prima della scelta non si osservano accept o richieste HA e il frammento è rimosso. Superati login personale e sincronizzazione bidirezionale di tema/accento. La copia scarica esplicitamente un file di 10.730 byte; l'import autenticato conserva utente, fingerprint della sessione OAuth e houseId del destinatario. Screenshot gate/copia a 390×844 ispezionati. Questa prova usa la stessa centrale come banco controllato; non dimostra uno scambio fra due case fisiche, Safari o scansione con fotocamera su iPhone.

Il risultato riguarda il flusso applicativo quando la centrale è funzionante. La diagnosi parallela della VM resta aperta: None, HPET, due CPU e affinità P-core non hanno superato tutti gli avvii. Le modifiche provvisorie None/starter sono state rimosse e il profilo precedente ripristinato; non viene adottata una correzione della VM tramite questa decisione. Comandi, evidenze, ripristino senza account QA e identificazione del nuovo ZIP sono nel [report010](../reports/REP-20261030-010-rallentamenti-vm-windows.md). Riesaminare dopo il collaudo del dispositivo e prima di ampliare trasporto o piattaforme.
