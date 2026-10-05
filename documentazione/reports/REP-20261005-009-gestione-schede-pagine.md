# REP-20261005-009 — Interfacce di gestione schede e pagine

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261005-009 |
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | f4c31ae |
| Richiesta di riferimento | «continuiamo con le altre pagine» dopo la HOME Neumorphism. |
| Autorizzazione | Estendere migrazione progressiva e presentazione alle interfacce esistenti, conservando azioni e integrazioni. |

## Obiettivo e perimetro

Primo gruppo della prosecuzione: aggiunta scheda, aggiunta/modifica pagina e selettore icone associato. Italiano, TypeScript strict, mx-icons per icone di interfaccia e primitive condivise per campi, selezioni e switch. I nomi/identificativi delle icone già salvate e il catalogo dispositivo legacy restano compatibili. Nessun nuovo tipo di scheda, comando HA, profilo reale o modifica dei permessi. Impostazioni, profili e pagine dispositivo restano distinti dai risultati di questo gruppo.

Stato Git pulito dopo il commit della HOME. Nessuna modifica preesistente da sovrascrivere. Stile e confini in [design.md](../design/design.md), [ADR-0004](../decisions/ADR-0004-principi-frontend.md) e [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md).

## Criteri di completamento

- Finestre e controlli coerenti con HOME nei temi chiaro/scuro, adattati a desktop/mobile.
- Azioni di selezione, ricerca, filtri, creazione e impostazioni pagina conservate; nessun dato di impianto creato durante il collaudo manuale.
- Primitive tipizzate, etichette collegate, focus e stato accessibile; movimento ridotto e feedback stabile.
- Italiano per i testi del gruppo, icone di interfaccia mx-icons senza riscrivere gli identificativi persistiti.
- Tipi, lint, regressioni e build verificati; browser e container locale con stesso volume dati.
- Report, stato e commit locale; copertura restante esplicita.

## Avanzamento e modifiche

Analisi: AddCardContent contiene 1280 righe e ConfigModal 2429; evitare una riscrittura simultanea delle logiche. Il gruppo parte dal percorso direttamente collegato alla HOME. Primitive e materiale vengono estesi senza nuove dipendenze. Skill surgical-coding e impeccable già applicate; il Neumorphism umano prevale sulle preferenze estetiche generiche.

Implementati AddCardContent, AddPageModal, EditPageModal e IconPicker in TSX. Contratti strict in types/management.ts, estensione di tsconfig.home.json senza cambiare i controlli precedenti. Primitive Input/Choice/Switch/Modal aggiunte ai tre gruppi esistenti; Modal conserva AccessibleModalShell per focus, Escape e scroll lock. Corpo scorrevole e footer separato rendono raggiungibili le azioni su mobile. Nessuna modifica a hook HA, API, backend, autenticazione o persistenza.

Il selettore conserva il catalogo legacy e restituisce gli stessi nomi salvati; le icone dei comandi usano mx-icons/currentColor. Colonne calcolate dalla larghezza disponibile mantengono la virtualizzazione coerente a 320/390 px. Completati i testi italiani di questo gruppo, incluse etichette dinamiche per entità e messaggi senza risultati. Gli altri pannelli conservano il fallback inglese.

Durante le verifiche corretti: sovrapposizione tra lente e testo del campo ricerca; azioni finali inizialmente incluse nel corpo scorrevole; autofocus React che precedeva il focus manager del dialogo nuova pagina. Il campo nome continua a ricevere il focus, ora dal gestore condiviso, e il test di ritorno al pulsante di apertura passa.

Il primo gate bundle ha rilevato index 900,9 KB sopra il limite 900. Vite ora separa mx-icons in vendor-icons-mx come le altre librerie di icone: index 885,3 KB e vendor 34,0 KB, soglie 900/500 invariate. Nessuna dipendenza aggiornata o nuova.

Banco: aca-tunet:1.22.1-aca-management-neu1, volume aca-tunet_tunet-data in /app/data; HA non ricreato. Immagine finale sha256:fc8b9f884c511c4197197e15263d34b4b323375f9c22e766cbacc0782c76914e. Preferenza scura ripristinata e viewport ripristinato. Nessun profilo, pagina o dispositivo creato e nessun comando fisico inviato.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| MGMT-01 | Builder Node 26, rete disabilitata e nessun volume reale: typecheck, lint, npm test | Superato | Strict interfacce e nuovo test; lint senza errori/warning; 93 file / 728 test. Tredici nuovi casi rispetto alla HOME. |
| MGMT-02 | Browser IAB e misure DOM | Superato, perimetro limitato | Aggiunta scheda scuro/chiaro desktop e chiaro 390×844; nuova pagina scuro e selettore icone a 390/320 px; modifica pagina chiaro desktop/mobile; switch 84×48, focus visibile. Nessun overflow orizzontale nel corpo osservato, footer visibile. Creazione/eliminazione/salvataggi verificati con callback simulate, non sul banco reale. |
| MGMT-03 | Integrità, diff e collegamenti | Superato | 407 file baseline e ZIP integri, 23 fonti protette immutate, 39 documenti e 320 link locali validi; 32 percorsi nel perimetro, nessun any o soppressione TS introdotto. |
| MGMT-04 | Build Compose, budget bundle e HTTP | Superato | Chunk entro soglie esistenti; servizio healthy; root e 23 asset iniziali HTTP 200, health 1.22.1. Asset differiti/offline e dispositivo fisico non collaudati. |
| MGMT-05 | Movimento ridotto | Implementato, controllo sorgente | Media query estesa ai dialoghi. Stato e posizione dello switch restano leggibili; preferenza OS non modificata o emulata. Non certificazione WCAG. |

Prima suite: cinque fallimenti nei nuovi test, quattro per la ricerca ambigua tra pulsante tipo standard e azione finale, uno sul focus causato dall’autofocus anticipato. Risolti selettori e causa del focus; suite successiva 728/728. Il controllo strict del nuovo test ha inoltre rilevato opzioni exact non appartenenti a ByRoleOptions, rimosse. La successiva separazione del bundle è stata ricompilata e verificata con gate e browser. Dopo gli ultimi due attributi aria-pressed sui periodi costo e la correzione di una traduzione condivisa, ripetuti tipi/build e i 16 test pertinenti; non ripetuta la suite completa per questi ritocchi semantici.

Log e screenshot selezionati in backup/management-neumorphism-20261005, esclusi da Git: typecheck.log, lint.log, tests-final.log, tests-last-targeted.log, build-check.log, compose-build.log, bundle.log (primo fallimento), bundle-final.log, http-assets.json, schede-scuro-desktop.png, schede-chiaro-desktop.png, schede-chiaro-mobile.png, pagina-scuro-desktop.png, modifica-chiaro-mobile.png. Nessun account nei file selezionati. Controlli su viewport, non su tablet fisico; non provati offline, ruoli, backup, comandi reali o prestazioni. Nessuna CI attivata.

## Controllo del diff e decisioni

Nuove geometrie e composizione sono scelte esecutive dell'incarico grafico. Nessuna approvazione di nuove funzionalità o architettura infrastrutturale.

## Chiusura e punto di ripresa

Primo gruppo della prosecuzione completato, documentazione aggiornata e modifiche raccolte nello storico Git locale. Prossimi gruppi da ordinare con l’utente: impostazioni/aspetto/disposizione/intestazione, profili e pagine dispositivo. La richiesta generica sulle altre pagine non è presentata come conversione completa dell’app. Questi risultati non autorizzano nuovi comportamenti o infrastrutture.
