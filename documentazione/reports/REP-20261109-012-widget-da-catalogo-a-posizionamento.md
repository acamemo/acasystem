# Dal catalogo all’anteprima di posizionamento

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-012 |
| Stato | Completato e installato sul banco .57/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «poi cliccando su un widget mi va sulla pagina più vicina e me lo inizia a posizionare e lo devo solo confermare, così deve funzionare» |
| Autorizzazione | Realizzare selezione dal catalogo, destinazione più vicina e posizionamento provvisorio con conferma. Consegna sul banco PC già in lavorazione, con backup e dati conservati; nessuna pubblicazione. |

## Obiettivo e perimetro

Dal catalogo il tap di un tipo chiude la tendina, mostra la Home idonea più vicina e avvia l’anteprima di posizionamento; conferma esplicita per creare e salvare. Annullare non crea widget né altera le configurazioni. Non aprire in anticipo la scelta delle entità: riusare i widget non associati già esistenti, configurabili dopo l’inserimento. Sono comprese le utilità del catalogo; i flussi di scoperta/aggiunta di dispositivi avviati altrove mantengono il comportamento esistente.

Pagina più vicina: priorità alla pagina corrente se idonea e capiente; altrimenti alla pagina idonea con posto disponibile più vicina nell’ordine Home, con criterio deterministico in caso di parità. Pagine speciali non idonee escluse. Nessuna pagina o continuazione viene salvata prima della conferma; il caso senza capacità verrà risolto esplicitamente nel percorso di posizionamento senza perdere la scelta.

Baseline [REP011](REP-20261109-011-fluidita-catalogo.md), banco .56/r99, fonte1816/SHA cfb5422dde4edd22ad718856b69e7e83ba37ba773c1f8a4266f010f06d3c2eb7;625voci Git preesistenti conservate. Checkpoint in `backup/rep069/`. Riferimenti: [REQ-32/AC-32](../funzionalita/product.md), [brief catalogo](../design/componenti/catalogo-widget.md), [design](../design/design.md), [architettura](../architecture.md). Stack, dipendenze, server e sincronizzazione esistenti da preservare.

## Criteri di completamento

- Tap sul tipo porta dalla tendina alla Home con anteprima riconoscibile e comandi «Conferma»/«Annulla», utilizzabile su mouse/touch e tastiera.
- Destinazione deterministica coerente con pagina attuale, capacità, pagine nascoste/speciali e ordine; nessuna modifica dei widget esistenti per il solo avvio.
- Anteprima e riposizionamento senza salvataggi/adozioni o comandi HA anticipati; conferma crea una sola istanza con ID unico e impostazioni corrette, annullamento/uscita non lasciano residui.
- Riutilizzare factory e primitive esistenti; nessun dato dimostrativo salvato come associazione reale. Configurazione delle entità disponibile dopo la conferma.
- Blocchi, sessione, revisioni e aggiornamenti concorrenti rispettati; layout/posizione rivalidati al momento della conferma.
- Test/strict e prove UI mirati, build/audit e aggiornamento locale con account/profili e HA/D1 conservati. Hardware fisico e nuova autenticazione umana distinti.

## Avanzamento e modifiche

Diagnosi: AddWidgetSheet.chooseType apre i dettagli; useAddCard/cardActions salva impostazioni e configurazione prima di chiamare onAdded/controller. Quel percorso non costituisce una bozza annullabile. Il dominio categoryPages possiede già seed puri di widget non associati e il componente operativo isola i comandi finché manca l’associazione: preferire il riuso a un secondo creatore o alla duplicazione del legacy.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Baseline e checkpoint | Git, copie byte e fonte .56 | Superato | 15delta: 12modificati/3nuovi, Y/X e tema byte-identici |
| Planner e bozza | Destinazione, capacità, segmento logico, conferma/annulla, ACK e retry | Superato | Ghost isolato; esiti incerti espliciti e nessuna creazione prima della conferma |
| Percorso UI e consegna | 161test/11file e 9Cover/2file distinti,3UI, strict/build, browser, pacchetto e conservazione banco | Superato | Hardware e nuova autenticazione umana distinti |

## Controllo del diff e decisioni

Scelte esecutive limitate al nuovo percorso catalogo→posizionamento. Le impostazioni e i flussi di aggiunta già esistenti fuori da questo ingresso restano conservati. Nessuna migrazione o riscrittura del protocollo profili autorizzata dal solo incarico UI.

## Chiusura e punto di ripresa

Completato e installato: ACA0.9.57/r99, fonte1819/SHAdfa61594e74ad4b7e28499319d6bf8735c4c365d0d211bfbbf6432b5c20268cc, 15delta attesi (12modificati/3nuovi), nessun file rimosso o estraneo. Factory pura unica,28tipi inclusa l’utilità Trova dispositivi; ID dei preset storici conservati. La selezione genera una sola identità provvisoria e non avvia form HA, drag, editor, salvataggi o nuove pagine. Il fantasma isolato si mostra dopo l’uscita completa del catalogo; Conferma/Annulla e recupero rimangono accessibili.

Destinazione corrente se capiente, altrimenti pagina visibile/idonea più vicina, parità in avanti; pagine nascoste e speciali non idonee escluse, Copertina abilitata ammessa e materializzata soltanto alla conferma; nessuna continuazione persistente creata automaticamente. L’ordine comune conserva pagina logica e segmenti visuali. La conferma ricalcola il piano sul documento corrente, applica tutti i campi nel commit del proprietario dei dati e attende l’ACK autorevole; doppio invio/risposta persa conservano lo stesso ID. Un esito incerto non è dichiarato annullato né salvato; l’annullamento riguarda soltanto l’editor posseduto da questo intento. Associazioni e scoperta esterne al catalogo, blocchi, uso esclusivo e revisioni conservati.

Verifiche:161/161test in11file, più9/9Cover in2file distinti,3UI, strict frontend/UI, build, audit e QA finale del pacchetto PASS. Nuovo percorso browser e relativi controlli nei casi registrati; la prova sintetica su demo non sostituisce un nuovo login umano o una transazione autenticata sulla casa reale. Y/X, tema e scena sono byte-identici alla .56; nessuna misura o promessa di prestazioni GPU in questo incarico.

Consegna: ZIP3378261byte/SHAf03fb73edb0f2a2d0ba6d7c2c446ff94d3c3fdbca46ec3c27226b33e3af5f4d9, wrapper sha256:ecec625ab377b9ced7811b647e43062748b605f2603f3d3b945b14e99158417e. Runtime congelato/backend invariati, catena Compose21file; rollback .56 rimuovendo soltanto rep069/compose-placement-local.yaml. Backup206308byte/SHA2020e86b2bbb98088a367a809d509ffe4689b10e3c8f0e9d9d70aa4039d6665c, estratto e SQLite integro; audit operativo 6/6, confronto cold→live con 27 tabelle esatte e 0 seen_at monotoni, nessuna differenza imprevista. Account/profili, identità e mount conservati; HA/D1 stessi container e avvii, solo ACA ricreato. PC3002 e LAN192.168.1.37 .57/healthy, casa ready; pacchetto e vista anonima esatti.

Evidenze: backup/rep069/source-delta.json, combined-final-tests.json, qa-functional-summary.json, packaged57-smoke.json, artifact-audit-status.json e conservazione dati. Browser/server QA privati chiusi, anteprima4185 conservata. Nessuna pubblicazione, migrazione o correzione del debito generale implicita. Ripresa dal riscontro dell’utente sul nuovo inserimento; hardware e autenticazione reale distinti.


## Annotazione successiva, 2026-11-09

Il primo controllo finale ha rilevato `ECONNREFUSED` su `127.0.0.1:4185`. Non è stata acquisita una baseline di disponibilità di quell’anteprima in questo incarico; la QA attesta di non averla gestita e tutti i processi privati chiusi erano su porte differenti. Il termine «conservata» nel resoconto sopra indica assenza di interventi, non disponibilità verificata. Il banco richiesto sulla porta3002 resta .57/healthy e casa ready; l’anteprima separata non è stata riavviata. Osservazione in `backup/rep069/preview4185-final-observation.json`.
