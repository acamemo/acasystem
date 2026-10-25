# REP-20261007-025 — Meteo: diagnosi, posizione su mappa, messaggio della card

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «cerca di capire come mai il meteo a volte non funziona, vedrei di fare una scansione della mappa per consentire la posizione»; dopo la proposta di quattro strade, «fai la B con la mappa e migliora il messaggio della card». La strada B prevedeva una nuova dipendenza (libreria di mappe) e le tessere di un servizio esterno. |

## Diagnosi

Log di Home Assistant: `metno` `TimeoutError` alle 15:42, durante il blocco di Docker, e `ClientConnectorDNSError` alle 19:11, dopo il passaggio del PC all'hotspot e il riavvio di Docker. Dopo un errore la fonte `weather.forecast_casa` resta `unavailable` fino al successivo aggiornamento riuscito. Al controllo il container raggiungeva di nuovo `api.met.no`. La causa è la connessione Internet di Home Assistant, non l'app.

## Modifiche

- Dipendenze: `leaflet` 1.9.4 e `@types/leaflet` (sviluppo). Leaflet sta in un blocco separato di circa 145 KB, caricato solo con la sezione; `check-bundle-size` verde.
- `pages/system/sections/LocationMap.tsx` (caricato a richiesta):
  - mappa Leaflet con le tessere OpenStreetMap e l'attribuzione;
  - il segnaposto è un punto CSS d'accento, senza immagini;
  - un tocco sulla mappa o il trascinamento del punto sceglie la posizione.
- `pages/system/sections/LocationSection.tsx`, nuova sezione «Posizione» di Sistema:
  - parte dalla posizione di casa di Home Assistant (`get_config`); se manca, dal centro Italia;
  - campi Latitudine e Longitudine con etichetta visibile, che accettano anche i valori scritti a metà e la virgola;
  - «Salva la posizione» invia `config/core/update` (latitudine, longitudine) e «Annulla» ripristina;
  - segnala le coordinate non valide e gli errori di Home Assistant;
  - senza utente amministratore o proprietario è in sola lettura.
- `SystemPage.tsx`: sezione tra Copertina e Aspetto.
- `pages/cover/CoverWeather.tsx`: con la fonte `unavailable` la card mostra «Meteo non raggiungibile» e «Nuovo tentativo a breve», con icona e testo smorzati e senza temperatura.
- `pages/ui-kit`: la sezione Posizione d'esempio, con salvataggio simulato.
- Test: `LocationSection.test.tsx` (3 nuovi), `CoverWeather.test.tsx` (+1).

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1345/1345 e build verdi. Anteprima locale: mappa con 15 tessere caricate, segnaposto presente; il tocco sposta il punto, aggiorna le coordinate e abilita Salva e Annulla. Banco `sha256:a3ff1db9fcd53afadbaa399b51dc18e809cc264933620198f92d50f7ab25aabd`. Non verificato: il salvataggio su Home Assistant reale e l'aggiornamento della previsione dopo il cambio di posizione.

## Limiti

- Le tessere richiedono Internet. L'uso di `tile.openstreetmap.org` è soggetto alla loro politica d'uso: va bene per un uso leggero, non per un prodotto distribuito su molti dispositivi senza un fornitore di tessere.
- La geolocalizzazione del dispositivo (strada A) non è stata implementata: richiede HTTPS.
