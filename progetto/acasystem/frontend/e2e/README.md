# Test end-to-end (Playwright)

## Stato

Le suite Playwright di Tunet 1.22.1 (`*.e2e.js`, `fixtures.js`) provavano l'interfaccia legacy: sono state cancellate con il resto del legacy il 2026-10-07 (ISSUE-029, REP-20261006-001). La cartella non contiene ancora suite per la nuova app: `playwright.config.js` cerca già i file `*.e2e.ts`, e finché non ce ne sono `npm run test:e2e` non trova test.

## Cosa servirà

Nuove suite in TypeScript (`*.e2e.ts`).

**Ambiente:**

- server Vite su una porta dedicata ai test, oppure `PLAYWRIGHT_BASE_URL` verso un'istanza già avviata;
- WebSocket di Home Assistant simulato (`auth`, `get_states`, `subscribe_events`, `get_config`, `call_service`), senza un HA reale;
- dati iniziali da `localStorage` (`ha_url`, `ha_auth_method`, `tunet_launcher_layout`, `tunet_card_settings`).

**Flussi da coprire:**

- collegamento: primo avvio senza credenziali, URL non valido, token, ritorno da OAuth (`auth_callback`), sessione scaduta dalla notifica di connessione;
- launcher: swipe tra le pagine, indicatore a pallina (tocco e tastiera), copertina attivabile dalla barra di modifica, avvio sempre su «Principale» (la pagina ricordata `tunet_active_page` non è più usata, REP-20261007-001), celle «+» con aggiunta nella cella toccata;
- modifica della disposizione:
  - pressione lunga, trascinamento e ridimensionamento con mouse e tocco;
  - alternativa da tastiera (Invio, frecce, Maiusc + frecce, Canc, Esc);
  - spazio insufficiente e passaggio a un'altra pagina;
- fogli:
  - aggiunta di un widget, compresa l'apertura delle impostazioni dopo attività e auto;
  - impostazioni del widget e della pagina;
  - dettagli con chiusura da Esc e ritorno del focus;
- comandi verso HA: argomenti di `call_service` per luce, tapparella, clima e lettore; stato richiesto finché HA non conferma; errore del comando;
- Sistema: profili (salva, carica, esporta, importa), barra di stato, uscita dalla sessione;
- dimensioni: 390, 768 e 1280 px, con movimento ridotto emulato.
