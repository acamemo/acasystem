# REP-20261110-004 — Ventilatori per dispositivo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261110-004 |
| Stato | Completato localmente |
| Data | 2026-11-10, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta e autorizzazione | «vai», dopo la proposta Ventilatori: Home con accensione/stato/velocità osservata; dettagli con velocità, preset, oscillazione e direzione secondo capacità HA; una tessera per dispositivo, canali indipendenti e percorso Trova → anteprima → Conferma. Build locale, banco escluso. |

## Obiettivo e perimetro

Quinta famiglia di [ADR-0049](../decisions/ADR-0049-widget-prodotti-per-dispositivo.md), dopo [Cover REP003](REP-20261110-003-tapparelle-tende-per-dispositivo.md). Tipo esistente `fan`, `bindingEntityId` e contratto prodotto versione 1. Solo entità dello stesso device_id, canali ordinari visibili/abilitati, secondarie e ruoli tecnici dal registro. Legacy, memoria, account e profili conservati; niente conversione automatica, nuova scansione, stack, dipendenza, API o nuovo tema. Banco, HA e pubblicazione esclusi.

Git iniziale 696 voci preesistenti. Checkpoint verificato dei 1862 file .61 in `backup/rep074/source-checkpoint.zip`, fonte SHA `6f0ac7f65cfa5bb9b16cd4b9eb2ae2c854f93f5daa0ecf42a2959a9773798dce`; manifest e Git iniziali nello stesso percorso. Preservare tutte le modifiche preesistenti. [Requisiti](../funzionalita/product.md), [matrice](../riprogettazione/matrice-widget-ha.md) e [design](../design/design.md) restano le fonti comuni. ISSUE-134/152/153/154 distinti dal lotto.

## Criteri di completamento

- Risolutore Fan esatto, guardia dei canali e classificazione conservativa; nessuna aggregazione di hub, stanza o integrazione né attivazione di entità nascoste/disabilitate.
- Trova e selezione manuale sullo stesso risolutore: destinazione esistente o anteprima inerte/Conferma con ID stabile e ACK; duplicati storici, pile, pagine nascoste, Annulla, pagina piena e scope del profilo conservati.
- Home singola essenziale con stato e velocità osservati; multicanale solo riepilogo. Dettagli con canali indipendenti, velocità/passo, preset reali, oscillazione e direzione solo secondo dati, feature e servizi effettivi. Non inventare velocità, passi o stati spenti.
- Valori richiesti distinti dagli osservati; off/riattivazione senza perdere errori o attese delle richieste unidirezionali. OFF supportato rimane utilizzabile con regolazione pendente; nessuna promessa di priorità end-to-end del gateway preesistente. Nessun comando all'apertura, in anteprima o riprodotto automaticamente offline.
- Console centrata e primitive/materiali/transizioni esistenti; controlli integri a320/390, nomi lunghi e valori interni a capo, tastiera/movimento ridotto, nessun nuovo blur o zoom.
- Test pertinenti e regressioni di tutte le famiglie precedenti, strict/build/contratti comuni e confronto del debito storico. Build locale .62, ZIP e HTTP con provenienza verificata, QA isolata; prove simulate separate da apparecchi fisici.

## Avanzamento e modifiche

Checkpoint e perimetro registrati prima delle modifiche sostanziali. Implementati:

- `ProductDeviceBinding` versione 1 con famiglia fan, risolutore per esatto device_id e classificazione conservativa. Canali ordinari separati da configurazione/diagnostica; visibili/abilitati soltanto. Contratti e resolver precedenti conservati.
- Trova, anteprima inerte, destinazioni esistenti, Details/Console e associazione manuale sul percorso comune. La guardia di pulizia usa la chiave effettiva: Fan conserva `bindingEntityId` insieme a nome/metadati nel writer atomico. Nessuna scrittura anticipata o nuova API.
- Home prodotto singola con stato/% osservati e capacità di accensione indipendenti; multicanale sintetica senza comando collettivo. Console centrata con canali, velocità/passo, preset, oscillazione e direzione effettivi; misure e tecnica separate. Definizione prodotto minima 2×2, cache separata e renderer attivato solo per metadati coerenti. Corpi legacy Fan invariati salvo dispatch/import.
- Regolazione inviata dopo 200 ms di quiete; annullamento locale a chiusura/offline e feedback separati delle azioni già inviate. Review indipendente ha individuato ritorno50→75→50 prima del timer: il candidato manteneva75. Correzione circoscritta attuata: annullamento solo del timer locale non inviato, richieste già inviate conservate; FanProduct40/40 e strict PASS. Nessun cambiamento a gateway o priorità end-to-end.
- Fixture private distinguono ventilatore solo on/off, due ventole dello stesso dispositivo con passi25/1 e secondarie pertinenti, prebound e indisponibile. Il simulatore non inventa una percentuale accendendo un fan senza SET_SPEED. Nessun dato demo diventa associazione reale.

Fonti primarie verificate il2026-11-10, pin HA2026.10.4: [flag e attributi fan](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/fan/const.py), [servizi e payload](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/fan/services.py), [entità e livelli di velocità](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/fan/__init__.py). On/off16/32 sono capacità distinte; percentuale del servizio intera0–100, passo dell'entità anche frazionario. Preset secondo elenco reale e servizio con SET_SPEED oppure PRESET_MODE. Questa verifica del contratto non dichiara provato ogni apparecchio o la versione del banco in questa sessione.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | Hash e ZIP dei 1862 file | Superato | Fonte byte-identica alla .61. |
| Frontend | regression-final.json:52file/899casi; binding/classificazione105, manuale9, FanProduct40 e raccordi sovrapposti | PASS:935scenari unici con ultimi esiti verdi | Non suite generale completa; primi negativi conservati. |
| Backend | npx vitest run src/__tests__/collaboration.test.ts src/__tests__/profileService.test.ts --maxWorkers=2 | PASS:17/17 | Test finti, nessuna centrale reale. |
| Strict e build | typecheck backend/UI e build frontend con ACASYSTEM_VERSION=0.9.62, prebuild strict | PASS | Avviso HLS574.55kB oltre500kB preesistente. |
| Contratti e colori | npm run test:ui; npm run test:design; lint:theme-colors | PASS:3UI/6asset,0colori | Nessuna nuova dipendenza o tema. |
| Lint/tipografia | Wrapper frontend e confronto JSON; lint:typography |7fingerprint lint identici alla.61;1tipografia connect.css:103 byte-identica | ISSUE-134 aperta, nessuna dichiarazione di lint generale verde. |
| Browser sigillo | qa-final/qa-final-summary.json | PASS:6flussi/6cold/5visuali+2smoke;0errori JS/rete bloccata | Solo DEMO4192, browser chiusi. |
| Fonte e artefatti | source-audit, final-source-review e artifact-manifest | PASS:1871file,22modificati/9nuovi/0rimossi,0EOL/whitespace/estranei;110file ZIP/dist e HTTP esatti | Checkpoint .61 conservato; banco escluso. |

QA finale1916×882,390×844 e320×760: anteprima/Conferma e un widget creato, Annulla/lookup senza scritture o duplicati, pagina piena senza creare pagine. Canali e tecnica del dispositivo esatto; primo passo25 (50→75) e1 (30→31) conservati e inviati al canale giusto. Preset, oscillazione, direzione e OFF ordinario sono comandi DEMO espliciti, nessuno al mount. Unknown, errori, annullamento del debounce e OFF durante promessa pendente hanno verifiche di componente distinte: non sono conferme fisiche né garanzie del gateway.

Otto screenshot finali letti nella review e tre dal root, con320 Home e dettagli390 multicanale: target40px dentro la tessera, valori interni a capo, Console640px centrata; tastiera e movimento ridotto. Il320 usa il prebound singolocanale, il semplice on/off libero è provato a1916/390. Il prebound DEMO storico non dichiara percentage_step: la velocità osservata resta leggibile, senza inventare uno slider. Cold verifica lo stesso seed preassociato, non la persistenza dei prodotti sintetici aggiunti. Apertura/ritorno e campioni CSS verificati; nessun benchmark FPS/GPU o fotogramma fisico.

[Anteprima locale .62](http://127.0.0.1:4192/?screen=app#/mockup). ZIP `backup/rep074/acasystem-web-0.9.62-local.zip`,2722788byte/SHA `f2cbf4e5e21960a075f0e5b1a477d252efce78bff796c31c78c11620e325e52e`. Fonte1871/SHA `317bebd1cfa6fe7368b62a3c54601c8f176ef01b3e7129b9df7033d36eb2cc11`; entry `./assets/index-Di_iO5iO.js`/SHA `24816692d79aa79adfc2a007e7cc199c140b7d4d161a0da6ea42cecdeb1f4e61`. Preview attivo4192, dati simulati separati dagli account del banco. Evidenze e riepiloghi in `backup/rep074/tests-summary.json`, `qa-final/qa-final-summary.json` e `final-source-review.json`.

## Controllo del diff e decisioni

Scelte esecutive entro la richiesta; nessuna migrazione globale o nuova famiglia implicita. UI guidata da impeccable in modo Operate e surgical-coding, applicati al brief esistente senza adottare nuovi temi, dipendenze o animazioni. Review indipendenti di binding/adattatori e UI conservate nei manifest rep074.

Limiti separati: ISSUE-134 mantiene il debito dei controlli generali; ISSUE-152 riguarda il gesto sulle celle+ dopo nuova pagina, non assegnato a questo lotto. ISSUE-153 è la semantica legacy Cover e non viene toccata. ISSUE-154 riguarda l'ordine prepare→execute del gateway: Spegni disponibile nella UI non garantisce annullamento, priorità fisica o causalità. Nessuna modifica a commandApi/backend. Nessun collaudo con ventilatori fisici, tablet, iPhone reale, login HA o misurazione FPS/GPU. Nessun aggiornamento banco/pubblicazione/installazione.

Negativi e correzioni del collaudo conservati: primo comando backend con percorsi inesistenti (0 test, poi percorsi corretti17PASS); primo FanIntegration usava prefisso ID inesistente fan_card invece di fan. (solo harness); primo FanProduct selettore ambiguo Non disponibile e due opzioni exact non previste dal tipo del helper (solo test). DiscoveryLauncher/Termostato ha mancato Conferma nel primo gruppo parallelo e passa8/8 isolato senza modificare fonte/timeout; distinguere questa sensibilità del collaudo da una regressione del nuovo Fan. Il gruppo finale52file/899casi passa integralmente senza aumentare timeout o rimuovere asserzioni.

## Chiusura e punto di ripresa

Ventilatori completati e verificati localmente nella .62. Per provare: aprire il link sopra, catalogo → Trova dispositivi → Pronti → Ventilazione studio oppure Ventilatore cucina; Conferma dopo anteprima. La selezione manuale resta sul tipo Ventilatore non associato. Vecchie configurazioni non migrano automaticamente. Nessun incarico software residuo di questo lotto. Banco, collaudo fisico, pubblicazione o famiglia successiva richiedono il relativo incarico umano; nessun commit o installazione effettuati.
