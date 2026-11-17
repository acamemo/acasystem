# Sistema e identità personale

**Consegna 2026-11-05:** implementata e installata sul banco ACA 0.9.46/r99. Inventario delle 11 sezioni, risultati e prove nel [report017](../../reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md). Il titolo non ancora applicato resta temporaneo in RAM, distinto per profilo e account/casa: aprire la vista account lo conserva, lasciare Sistema lo perde. Le immagini preparate nella registrazione si perdono ricaricando. Nessun nuovo archivio offline implicito.

Modalità della superficie: **Operate**. Fonte umana: [REP017](../../reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md), verifica di Sistema e unificazione della personalizzazione tra registrazione e account. Stesso materiale Vetro Bianco, font e primitive ACA; niente tema alternativo o personalizzazione globale.

## Sistema

Percorso principale: scegliere una sezione, leggere lo stato corrente, eseguire un'azione pertinente. Indice verticale sul desktop, scorrevole e limitato in altezza; navigazione compatta orizzontale sul telefono. Una sezione visibile per volta riduce la pagina interminabile; i pannelli nascosti conservano lo stato locale delle bozze. Semantica, focus e tastiera devono corrispondere alla selezione.

Titolo Sistema essenziale; accesso al proprio account e informativa AI esistente restano riconoscibili. La descrizione deve chiarire il comportamento reale, senza ripetere dettagli implementativi. Le11sezioni approvate restano verificabili, non cancellate perché il loro codice è storico. Fotografia della casa nell'account e copertina Home (ora/calendario) sono concetti distinti.

## Personalizzazione comune

Un editor di identità personale, con presentazione compatta nella registrazione e piena nella vista account. Colore libero, iniziale leggibile, foto che sostituisce il cerchio colorato; sfondo visibile soltanto nella vista account. Stessi strumenti di ritaglio, rotazione, posizione e zoom già disponibili, senza duplicare codice o introdurre API alternative.

Prima del login le immagini sono una preparazione locale effimera. Salvataggio solo dopo identità e client verificati, tramite le API account protette già esistenti; non inserire immagini o credenziali nei tentativi di registrazione o nei log. Scelte per un account non devono applicarsi a un altro dopo cambio sessione, retry o risposta tardiva. Nessun cambio dei privilegi HA del proprietario o dei membri.

## Verifiche di usabilità

320/390px, viewport corto568px, desktop e testi lunghi. Controlli almeno44px, navigazione raggiungibile, pannelli senza overflow interno/tagli, menu visibili e focus stabile. Provare tastiera, movimento/trasparenza ridotti, riprova/offline/errori, file non valido, crop e annullamento, cambio account/profilo, chiusura durante richieste e risposta obsoleta. Non scambiare una hitbox presente per un menu visibile.
