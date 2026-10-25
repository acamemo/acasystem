# Test end-to-end (Playwright)

## Stato

Le suite Playwright di Tunet 1.22.1 (`*.e2e.js`, `fixtures.js`) provavano l'interfaccia legacy: sono state cancellate con il resto del legacy il 2026-10-07 (ISSUE-029, REP-20261006-001). Per la nuova app i controlli espliciti della release 0.9.19 sono descritti sotto e usano script `*.mjs`; `playwright.config.js` cerca già i file `*.e2e.ts`, e finché non ce ne sono `npm run test:e2e` non trova test.

## Cosa servirà

Nuove suite in TypeScript (`*.e2e.ts`).

**Ambiente:**

- server Vite su una porta dedicata ai test, oppure `PLAYWRIGHT_BASE_URL` verso un'istanza già avviata;
- WebSocket di Home Assistant simulato (`auth`, `get_states`, `subscribe_events`, `get_config`, `call_service`), senza un HA reale;
- dati iniziali da `localStorage` (`ha_url`, `ha_auth_method`, `tunet_launcher_layout`, `tunet_card_settings`).

**Flussi da coprire:**

- collegamento: primo avvio senza credenziali, URL non valido, token, ritorno da OAuth (`auth_callback`), sessione scaduta dalla notifica di connessione;
- launcher: swipe tra le pagine, indicatore a pallina (tocco e tastiera), copertina nascosta o mostrata dall'editor delle pagine e da Sistema, avvio sempre su «Principale» (la pagina ricordata `tunet_active_page` non è più usata, REP-20261007-001), celle «+» con aggiunta nella cella toccata;
- modifica della disposizione:
  - pressione lunga, trascinamento e ridimensionamento con mouse e tocco;
  - alternativa da tastiera (Invio, frecce, Maiusc + frecce, Canc, Esc);
  - spazio insufficiente e passaggio a un'altra pagina;
- editor delle pagine («Pagine» o pressione lunga sul vuoto): nuova pagina, rinomina in linea, ordine con pressione lunga e con le frecce, nascondi, principale, colonne per pagina;
- fogli:
  - aggiunta di un widget, compresa l'apertura delle impostazioni dopo attività e auto;
  - impostazioni del widget (doppio tocco);
  - dettagli con chiusura da Esc e ritorno del focus;
- comandi verso HA: argomenti di `call_service` per luce, tapparella, clima e lettore; stato richiesto finché HA non conferma; errore del comando;
- Sistema: profili (salva, carica, esporta, importa), barra di stato, uscita dalla sessione;
- dimensioni: 390, 768 e 1280 px, con movimento ridotto emulato.

## Banco isolato della release 0.9.21 (REP-20261019-002; banco costruito da REP-20261015-003 per la 0.9.10)

Da `progetto/acasystem/frontend`, dopo la build di produzione con `ACASYSTEM_VERSION=0.9.21`:

```powershell
node e2e/isolated-server.check.mjs
node e2e/isolated-server.mjs
```

Il primo comando verifica isolamento e identità dell'HTML senza un browser, poi termina. Il secondo mantiene il server su **127.0.0.1:3003**. Aprire `http://localhost:3003/fixture` per inizializzare i venti tipi; questa rotta ripristina solo fixture e preferenze del banco isolato. `/fixture?size=1`, `2`, `3` o `4` inizializza rispettivamente Compatta 2×1, Standard 2×2, Grande 3×3 o Pagina 4×4. I successivi riavvii dalla radice `/` conservano le impostazioni. Nessun token reale, indirizzo HA o client HTTP di inoltro è presente nel server. Il dist è letto senza modifiche e una CSP limita le connessioni all'origine corrente. Endpoint HA non simulati e target estranei alle fixture vengono respinti.

A suite Vitest concluse, eseguire separatamente:

```powershell
node e2e/isolated-browser.check.mjs
```

Un solo Chromium, GPU disabilitata, 390/1280/1920 px: venti tipi nelle quattro taglie (240 viste), dettagli da tastiera, preferenze e riavvio, gesto con throttle/conferma, movimento ridotto. Screenshot ed esiti sotto `backup/rep003/browser`, esclusi da Git. `ACA_EVIDENCE_DIR` consente di distinguere gli orientamenti del tablet.

Per il M11 già autorizzato via ADB: reverse **3003** verso 3003 e forward **9225** verso `chrome_devtools_remote`, poi `node e2e/isolated-browser.check.mjs --tablet`. Lo script apre una sola nuova scheda isolata, usa touch CDP e alla fine riporta in primo piano la scheda 3002, se presente. Verificare orientamento reale, schermo acceso e ripristinare le impostazioni Android modificate. Non avviare un secondo browser PC durante questa prova.

`node e2e/m11-overview.check.mjs` misura invece soltanto i controlli di modifica/vista pagine sul banco 3002: tre aperture e tre chiusure, rAF e tracce GPU, senza servizi HA né CSS iniettato. La pagina deve essere in primo piano, in orizzontale e senza movimento ridotto. Gli esiti delle sei animazioni restano distinti: massimo un frame >50 ms e nessun blocco GPU >40 ms per ogni animazione. Un esito fallito o una traccia GPU assente non chiude ISSUE-062.

TalkBack, ingrandimento effettivo 125/150% e PWA standalone richiedono evidenza sul dispositivo. Emulazione viewport, sola attivazione di una preferenza, manifest e screenshot non dimostrano da soli queste tre prove. I passaggi umani vanno registrati separatamente nel report, senza attribuirli agli script.

Dopo il rilascio Compose e a suite unitarie concluse, `node e2e/release.check.mjs` confronta tutti i file del dist serviti dal banco reale 3002 con il manifest dell’immagine e legge la versione API. La sola interazione browser apre Sistema sul banco isolato 3003 e verifica la versione resa nell’interfaccia; nessuna sessione reale è copiata nelle fixture. Risultati in `backup/rep003/release`.
