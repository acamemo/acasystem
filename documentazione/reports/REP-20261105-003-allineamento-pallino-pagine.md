# REP-20261105-003 — Allineamento del pallino delle pagine

| Campo | Valore |
|---|---|
| Stato | Completato, build e anteprima verificate |
| Data | 2026-11-05, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base Git | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`,563voci preesistenti nel working tree |
| Richiesta | «il pallino non è preciso», immagine dell'indicatore su Sicurezza con la sfera fuori centro rispetto alla tacca |

## Perimetro e criterio

Allineare centro della sfera, tacca e controllo della pagina selezionata, preservando movimento, accessibilità, etichette e scelta delle pagine. Misurare il difetto prima e dopo nel browser, a riposo dopo il movimento, su desktop e telefono simulato. Non riprogettare densità/overflow delle molte pagine (ISSUE-146), non modificare il banco .46 o il lavoro precedente. Copia iniziale ed evidenze in `backup/rep047/`.

## Avanzamento e verifiche

Baseline nel browser: il layout generico Material applicava gap8px e justify-content:center al posto di gap0/flex-start dell'indicatore. La sfera e il range avanzavano di44px sul desktop, mentre le tacche erano distanziate di52px. Con16pagine il difetto raggiungeva60px; con20 sul telefono76px. Non era un errore dell'indice della pagina o un offset fisso da compensare.

Correzione nel solo `design/layout/pageIndicator.css`: il selettore specifico del contenuto dell'indicatore possiede il layout flex, vincendo il generico delle primitive. Il selettore precedente resta nello stesso gruppo per compatibilità. Nessuna nuova misura JS, observer, modifica a tempi/curve, dimensioni, etichette o input. Un solo file applicativo cambiato rispetto alla consegna002; tutti i1793sorgenti confrontati con il checkpoint (`source-scope-audit.json`).

| Verifica | Esito | Evidenze in backup/rep047 |
|---|---|---|
| Test indicatore/cornice/copertina |29/29PASS | `indicator-tests.json`: range/etichette, callback, pagina singola e regole esistenti |
| Strict e build frontend |PASS | `frontend-build.log`, solo avviso HLS preesistente |
| UI e asset condivisi |9/9PASS | `shared-checks.log` |
| Geometria browser |12/12PASS |1366/1920 con16pagine,390/320 con20; primo/index3/ultimo. Errore X/Y sfera–tacca e punto previsto del range0px in tutti i casi. `indicator-baseline.json`, `indicator-final.json` |
| Input e pochi punti |PASS nel perimetro | Sicurezza realmente aperta e visionata, clic desktop→pagina9, tap390→pagina11; quattro sonde CSS/DOM con due punti a0px, distinte da un'integrazione React completa. `indicator-extra-qa.json` |

Riepilogo e handoff indipendenti: `indicator-alignment-qa-summary.json`, `indicator-alignment-qa-handoff.md`; immagini prima/dopo sui quattro formati, la1920 finale vista anche dal coordinatore. Nessun errore JS, comando, scrittura mutativa di rete o origine esterna osservati. Browser QA posseduti chiusi; anteprima esistente conservata.

Il limite di densità con molte pagine nel viewport mobile resta ISSUE-146: questa correzione allinea i centri ma non ridisegna la barra. Nessun collaudo hardware/Safari/iPhone/Android o GPU, nessuna pubblicazione, commit o aggiornamento del banco .46. Fonte finale SHA `7f57516214ff3035ac88179994d789565e93327d668b540314968d60391baf12`.

## Chiusura

Incarico concluso. Ricaricare [l'anteprima](http://127.0.0.1:4185/?screen=app#/mockup) per vedere il pallino centrato sulle tacche. Banco .46 distinto. Nessun lavoro necessario residuo; ISSUE-146 non autorizza una riprogettazione automatica.

Controlli finali: `python backup/rep019/check-docs.py`,516nuovi link e zero interrotti, materiali nativi conservati. Diff documentale e whitespace sullo stesso formato testuale senza errori; SHA CSS finale `6de34506cc284a8e0128454715b42af015094bc8bfec20cd42d84b43698ef870`, coincidente con la QA. Anteprima HTTP200, health banco .46; evidenze private escluse da Git. Nessuna modifica applicativa dopo le misure.
